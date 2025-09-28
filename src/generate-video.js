const fs = require('fs-extra');
const path = require('path');
const puppeteer = require('puppeteer-core');

/**
 * Generate video recording of the presentation
 * @param {Object} options - Configuration options
 * @param {string} options.presentationPath - Path to the HTML presentation file
 * @param {string} options.outputDir - Output directory
 * @param {string} options.filename - Output video filename (default: 'presentation.mp4')
 * @param {number} options.width - Video width in pixels (default: 1920)
 * @param {number} options.height - Video height in pixels (default: 1080)
 * @param {number} options.fps - Frames per second (default: 30)
 * @param {string} options.subtitleMode - Subtitle mode: "off", "soft", or "hard"
 * @returns {Promise<string>} Path to generated video file
 */
async function generateVideo({
  presentationPath,
  outputDir,
  filename = 'presentation.mp4',
  width = 1920,
  height = 1080,
  fps = 30,
  subtitleMode = 'soft'
}) {
  console.log('🎬 Starting video recording...');
  console.log('📄 Presentation:', presentationPath);
  
  if (!await fs.pathExists(presentationPath)) {
    throw new Error(`Presentation file not found: ${presentationPath}`);
  }

  await fs.ensureDir(outputDir);
  const outputPath = path.join(outputDir, filename);

  let browser = null;
  let page = null;

  try {
    // Try to find a Chrome/Chromium executable
    const executablePath = await findChromeExecutable();
    
    // Ensure dimensions are integers and within reasonable bounds
    const actualWidth = Math.max(800, Math.min(3840, Math.floor(width)));
    const actualHeight = Math.max(600, Math.min(2160, Math.floor(height)));
    
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      defaultViewport: {
        width: actualWidth,
        height: actualHeight
      },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--autoplay-policy=no-user-gesture-required', // Allow audio autoplay
        '--allow-running-insecure-content',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    page = await browser.newPage();
    await page.setViewport({ width: actualWidth, height: actualHeight });

    // Allow autoplay and media access
    await page.evaluateOnNewDocument(() => {
      navigator.mediaDevices.getUserMedia = navigator.mediaDevices.getUserMedia || (() => Promise.resolve());
      HTMLMediaElement.prototype.play = function() {
        return Promise.resolve();
      };
    });

    console.log('🌐 Loading presentation...');
    const presentationUrl = `file://${path.resolve(presentationPath)}`;
    await page.goto(presentationUrl, { waitUntil: 'networkidle2' });

    // Wait for the presentation to be ready
    await page.waitForSelector('.presentation-controls', { timeout: 10000 });
    
    // Get total duration and slide count
    const presentationInfo = await page.evaluate(() => {
      const totalSlides = window.totalSlides || document.querySelectorAll('section').length || 1;
      return { totalSlides };
    });

    console.log(`📊 Found ${presentationInfo.totalSlides} slides`);

    // Take a screenshot of each slide individually
    console.log('📸 Taking screenshots of each slide...');
    const screenshots = [];

    for (let slideIndex = 1; slideIndex <= presentationInfo.totalSlides; slideIndex++) {
      console.log(`📄 Capturing slide ${slideIndex}/${presentationInfo.totalSlides}`);

      // Navigate to the specific slide
      await page.goto(`${presentationUrl}#${slideIndex}`, { waitUntil: 'networkidle2' });

      // Wait a bit for the slide to render completely
      await new Promise(resolve => setTimeout(resolve, 500));

      // Take screenshot of this slide
      const screenshot = await page.screenshot({
        type: 'jpeg',
        quality: 90, // Higher quality for static images
        fullPage: false
      });

      screenshots.push({
        slideIndex,
        data: screenshot
      });
    }

    console.log(`✅ Captured ${screenshots.length} slide screenshots`);

    // Get audio durations for timing
    console.log('🎵 Analyzing audio durations...');
    const slideDurations = await getAudioDurations(path.join(outputDir, 'audio'), presentationInfo.totalSlides);
    
    // Calculate total duration from audio files
    const totalDuration = slideDurations.reduce((sum, duration) => sum + duration, 0);
    console.log(`⏱️  Total audio duration: ${Math.ceil(totalDuration)} seconds`);

    // Create frames directory and save slide screenshots
    if (screenshots.length > 0) {
      const framesDir = path.join(outputDir, 'video_frames');
      await fs.ensureDir(framesDir);

      console.log(`💾 Saving ${screenshots.length} slide screenshots...`);

      // Save slide screenshots with names that indicate slide numbers
      for (let i = 0; i < screenshots.length; i++) {
        const screenshot = screenshots[i];
        const slideFilename = `slide_${String(screenshot.slideIndex).padStart(2, '0')}.jpg`;
        await fs.writeFile(
          path.join(framesDir, slideFilename),
          screenshot.data
        );
      }

      // Also save sample frames for verification
      const firstSlide = screenshots[0];
      const lastSlide = screenshots[screenshots.length - 1];
      const midSlide = screenshots[Math.floor(screenshots.length / 2)];

      await fs.writeFile(
        path.join(outputDir, 'video_frame_first.jpg'),
        firstSlide.data
      );

      if (midSlide && midSlide !== firstSlide) {
        await fs.writeFile(
          path.join(outputDir, 'video_frame_middle.jpg'),
          midSlide.data
        );
      }

      if (lastSlide && lastSlide !== firstSlide) {
        await fs.writeFile(
          path.join(outputDir, 'video_frame_last.jpg'),
          lastSlide.data
        );
      }

      console.log(`✅ Slides saved to ${framesDir}`);
    }

    // Create a comprehensive video info file
    const videoInfo = {
      slides: screenshots.length,
      actualDuration: totalDuration,
      slideDurations,
      dimensions: { width: actualWidth, height: actualHeight },
      totalSlides: presentationInfo.totalSlides,
      created: new Date().toISOString(),
      method: 'static-slides',
      frameFiles: [
        'video_frame_first.jpg',
        screenshots.length > 2 ? 'video_frame_middle.jpg' : null,
        screenshots.length > 1 ? 'video_frame_last.jpg' : null
      ].filter(Boolean)
    };

    const infoPath = path.join(outputDir, 'video_info.json');
    await fs.writeJSON(infoPath, videoInfo, { spaces: 2 });

    // Create actual MP4 video using FFmpeg
    if (screenshots.length > 0) {
      console.log('🎬 Creating MP4 video with FFmpeg...');

      try {
        const videoPath = await createVideoWithFFmpeg({
          framesDir: path.join(outputDir, 'video_frames'),
          audioDir: path.join(outputDir, 'audio'),
          outputPath: path.join(outputDir, filename),
          slides: presentationInfo.totalSlides,
          slideDurations,
          subtitlesPath: path.join(outputDir, 'subtitles.srt'),
          subtitleMode: subtitleMode || 'soft'
        });

        console.log('✅ Video generation complete');
        console.log(`📝 Video info saved: ${infoPath}`);
        console.log(`🎬 Video created: ${videoPath}`);

        return videoPath;

      } catch (error) {
        console.error('❌ FFmpeg video creation failed:', error.message);
        console.log(`📝 Video info saved: ${infoPath}`);
        console.log(`📸 Frame samples saved in ${outputDir}`);
        console.log('');
        console.log('🎬 Manual Video Creation:');
        console.log('   Static slide screenshots have been captured but video creation failed.');
        console.log('   You can manually create the video with:');
        console.log(`   ffmpeg -f concat -safe 0 -i ${path.join(outputDir, 'slides.txt')} -i ${path.join(outputDir, 'combined_audio.wav')} -c:v libx264 -c:a aac -pix_fmt yuv420p ${path.join(outputDir, filename)}`);
        console.log('');

        return infoPath;
      }
    } else {
      console.log('⚠️ No frames captured - cannot create video');
      return infoPath;
    }

  } catch (error) {
    console.error('❌ Video generation failed:', error.message);
    throw error;
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}

/**
 * Get audio duration for each slide
 * @param {string} audioDir - Directory containing slide audio files
 * @param {number} slideCount - Total number of slides
 * @returns {Promise<number[]>} Array of durations in seconds for each slide
 */
async function getAudioDurations(audioDir, slideCount) {
  const { spawn } = require('child_process');
  const durations = [];

  for (let i = 1; i <= slideCount; i++) {
    const audioFile = path.join(audioDir, `slide-${i}.mp3`);

    if (!await fs.pathExists(audioFile)) {
      console.warn(`⚠️  Audio file not found: ${audioFile}, using 5 second default`);
      durations.push(5.0); // Default duration
      continue;
    }

    try {
      const duration = await new Promise((resolve, reject) => {
        const ffprobe = spawn('ffprobe', [
          '-v', 'quiet',
          '-show_entries', 'format=duration',
          '-of', 'csv=p=0',
          audioFile
        ]);

        let output = '';
        ffprobe.stdout.on('data', (data) => {
          output += data.toString();
        });

        ffprobe.on('close', (code) => {
          if (code === 0) {
            const duration = parseFloat(output.trim());
            resolve(isNaN(duration) ? 5.0 : duration);
          } else {
            resolve(5.0); // Default fallback
          }
        });

        ffprobe.on('error', () => resolve(5.0)); // Default fallback
      });

      durations.push(duration);
      console.log(`🎵 Slide ${i}: ${duration.toFixed(2)}s`);
    } catch (error) {
      console.warn(`⚠️  Could not get duration for slide ${i}, using 5 second default`);
      durations.push(5.0);
    }
  }

  return durations;
}

/**
 * Create MP4 video using FFmpeg with timed static slides
 * @param {Object} options - Configuration options
 * @param {string} options.framesDir - Directory containing slide images
 * @param {string} options.audioDir - Directory containing slide audio files
 * @param {string} options.outputPath - Output video file path
 * @param {number} options.slides - Total number of slides
 * @param {number[]} options.slideDurations - Duration in seconds for each slide
 * @param {string} options.subtitlesPath - Path to SRT subtitles file
 * @param {string} options.subtitleMode - Subtitle mode: "off", "soft", or "hard"
 * @returns {Promise<string>} Path to created video file
 */
async function createVideoWithFFmpeg({ framesDir, audioDir, outputPath, slides, slideDurations, subtitlesPath, subtitleMode = 'soft' }) {
  const { spawn } = require('child_process');

  // First, create a combined audio file from all slide audio
  const combinedAudioPath = path.join(path.dirname(outputPath), 'combined_audio.wav');

  console.log('🎵 Combining audio files...');
  await combineAudioFiles(audioDir, combinedAudioPath, slides);

  console.log('🎬 Creating video with timed static slides...');

  // Use concat demuxer approach - create a text file listing slides and their durations
  const concatFilePath = path.join(path.dirname(outputPath), 'slides.txt');
  let concatContent = '';

  for (let i = 1; i <= slides; i++) {
    const slideFile = path.join(framesDir, `slide_${String(i).padStart(2, '0')}.jpg`);
    const duration = slideDurations[i - 1];
    concatContent += `file '${slideFile}'\n`;
    concatContent += `duration ${duration}\n`;
  }

  // Add the last file again (FFmpeg concat requirement)
  const lastSlideFile = path.join(framesDir, `slide_${String(slides).padStart(2, '0')}.jpg`);
  concatContent += `file '${lastSlideFile}'\n`;

  await fs.writeFile(concatFilePath, concatContent);

  console.log('📝 Created slide timing file:', concatFilePath);

  // Build FFmpeg command using concat demuxer
  const ffmpegArgs = [
    '-y', // Overwrite output file
    '-f', 'concat',
    '-safe', '0',
    '-i', concatFilePath, // Slide timing file
    '-i', combinedAudioPath // Combined audio
  ];

  // Handle subtitles based on the chosen mode
  if (await fs.pathExists(subtitlesPath) && subtitleMode !== 'off') {
    if (subtitleMode === 'soft') {
      console.log('📝 Adding soft subtitles to video (toggleable by viewer)...');
      ffmpegArgs.push('-i', subtitlesPath); // Add subtitle input
    } else if (subtitleMode === 'hard') {
      console.log('📝 Adding hard subtitles to video (always visible)...');
      // For hard subtitles, we'll add the filter later
    }
  } else if (subtitleMode === 'off') {
    console.log('📝 Skipping subtitles (disabled)...');
  }

  // Add encoding options
  ffmpegArgs.push('-c:v', 'libx264');
  ffmpegArgs.push('-c:a', 'aac');
  ffmpegArgs.push('-pix_fmt', 'yuv420p');

  // Handle hard subtitles with video filter
  if (await fs.pathExists(subtitlesPath) && subtitleMode === 'hard') {
    ffmpegArgs.push('-vf', `subtitles=${subtitlesPath.replace(/\\/g, '/')}`);
  }

  // Handle soft subtitles
  if (await fs.pathExists(subtitlesPath) && subtitleMode === 'soft') {
    ffmpegArgs.push('-c:s', 'mov_text'); // Use mov_text codec for MP4 subtitle stream
    ffmpegArgs.push('-metadata:s:s:0', 'language=eng');
    ffmpegArgs.push('-metadata:s:s:0', 'title=English');
  }

  ffmpegArgs.push('-shortest'); // End when shortest input ends
  ffmpegArgs.push(outputPath);

  console.log('🔧 FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);

    let stderr = '';

    ffmpeg.stdout.on('data', (data) => {
      // FFmpeg writes progress to stderr, not stdout
    });

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
      // Show progress for long operations
      if (stderr.includes('time=')) {
        const match = stderr.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
        if (match) {
          process.stdout.write(`\r⏱️  Progress: ${match[1]}`);
        }
      }
    });

    ffmpeg.on('close', (code) => {
      process.stdout.write('\n'); // New line after progress
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg failed with exit code ${code}\nOutput: ${stderr}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`Failed to start FFmpeg: ${error.message}`));
    });
  });
}

/**
 * Combine multiple audio files into a single file
 * @param {string} audioDir - Directory containing slide audio files
 * @param {string} outputPath - Output combined audio file path
 * @param {number} slideCount - Number of slides
 */
async function combineAudioFiles(audioDir, outputPath, slideCount) {
  const { spawn } = require('child_process');

  // Build list of audio files
  const audioFiles = [];
  for (let i = 1; i <= slideCount; i++) {
    const audioFile = path.join(audioDir, `slide-${i}.mp3`);
    if (await fs.pathExists(audioFile)) {
      audioFiles.push(audioFile);
    }
  }

  if (audioFiles.length === 0) {
    throw new Error('No audio files found to combine');
  }

  // Create FFmpeg command to concatenate audio files
  const ffmpegArgs = ['-y']; // Overwrite output file

  // Add each input file
  for (const audioFile of audioFiles) {
    ffmpegArgs.push('-i', audioFile);
  }

  // Add filter to concatenate
  ffmpegArgs.push(
    '-filter_complex',
    `concat=n=${audioFiles.length}:v=0:a=1`,
    '-c:a', 'pcm_s16le', // Use uncompressed audio for better quality
    outputPath
  );

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`Audio combining failed with exit code ${code}\nOutput: ${stderr}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`Failed to start FFmpeg for audio combining: ${error.message}`));
    });
  });
}

/**
 * Find available Chrome/Chromium executable
 */
async function findChromeExecutable() {
  const possiblePaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];

  for (const chromePath of possiblePaths) {
    if (await fs.pathExists(chromePath)) {
      return chromePath;
    }
  }

  throw new Error(`Chrome/Chromium not found. Please install Chrome or Chromium browser.
Tried paths: ${possiblePaths.join(', ')}`);
}

module.exports = { generateVideo };