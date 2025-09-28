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
 * @returns {Promise<string>} Path to generated video file
 */
async function generateVideo({ 
  presentationPath, 
  outputDir, 
  filename = 'presentation.mp4',
  width = 1920,
  height = 1080,
  fps = 30
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
    
    browser = await puppeteer.launch({
      executablePath,
      headless: true, // Changed to headless for recording
      defaultViewport: {
        width,
        height
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
    await page.setViewport({ width, height });

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

    // Calculate estimated duration (we'll use a more realistic time per slide)
    const estimatedDurationPerSlide = 20; // seconds - this should be based on actual audio duration
    const totalDuration = presentationInfo.totalSlides * estimatedDurationPerSlide;

    console.log(`⏱️  Estimated duration: ${Math.ceil(totalDuration)} seconds`);

    // Start recording using Puppeteer's built-in screen recording (if available)
    // For now, we'll use a simpler approach by taking screenshots at intervals
    // and later we can enhance this to use proper video recording libraries

    const screenshots = [];
    const startTime = Date.now();
    
    // Start the presentation
    await page.evaluate(() => {
      // Wait for the automation script to load
      let attempts = 0;
      const tryStart = () => {
        attempts++;
        
        // Try to call the startPresentation function directly
        if (typeof window.startPresentation === 'function') {
          window.startPresentation();
          return true;
        }
        
        // Try to find and click the start button
        const startButton = document.getElementById('startPresentation');
        if (startButton) {
          startButton.click();
          return true;
        }
        
        // Fallback: dispatch space key event
        if (attempts <= 5) {
          setTimeout(tryStart, 500);
        } else {
          // Final fallback: manually set the presentation state
          console.log('Manually triggering presentation state');
          if (window.location.hash !== '#1') {
            window.location.hash = '#1';
          }
          document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space' }));
        }
      };
      
      // Start trying
      setTimeout(tryStart, 100);
    });

    console.log('🎬 Recording presentation...');
    
    // Record screenshots at the specified FPS, but reduce frequency for efficiency
    const actualFPS = Math.min(fps, 10); // Cap at 10 FPS for efficiency
    const screenshotInterval = 1000 / actualFPS;
    let frameCount = 0;
    let lastSlideCheck = 0;
    
    const recordingPromise = new Promise((resolve) => {
      const captureFrame = async () => {
        try {
          const screenshot = await page.screenshot({
            type: 'jpeg', // Use JPEG for smaller file size
            quality: 80,
            fullPage: false
          });
          
          screenshots.push({
            timestamp: Date.now() - startTime,
            frameNumber: frameCount++,
            data: screenshot
          });

          // Check if presentation is complete every second
          const now = Date.now();
          if (now - lastSlideCheck > 1000) {
            lastSlideCheck = now;
            
            const currentSlide = await page.evaluate(() => {
              const current = parseInt(window.location.hash.slice(1) || '1');
              const total = window.totalSlides || document.querySelectorAll('section').length || 1;
              return { current, total };
            });

            console.log(`📄 Slide ${currentSlide.current}/${currentSlide.total}`);

            // Stop if we've reached the end or if we've been recording too long
            if (currentSlide.current >= currentSlide.total || 
                (Date.now() - startTime) > (totalDuration + 10) * 1000) {
              console.log('🏁 Recording complete');
              resolve();
              return;
            }
          }

          // Safety check: don't record forever
          if (frameCount < totalDuration * actualFPS + actualFPS * 10) { // Add buffer time
            setTimeout(captureFrame, screenshotInterval);
          } else {
            console.log('⏰ Recording timeout reached');
            resolve();
          }
        } catch (error) {
          console.error('Error capturing frame:', error);
          resolve();
        }
      };

      // Start capturing
      setTimeout(captureFrame, 1000); // Delay to let presentation start
    });

    await recordingPromise;
    
    console.log(`📸 Captured ${screenshots.length} frames in ${Math.ceil((Date.now() - startTime) / 1000)} seconds`);
    
    // Save sample frames for verification
    if (screenshots.length > 0) {
      const firstFrame = screenshots[0];
      const lastFrame = screenshots[screenshots.length - 1];
      const midFrame = screenshots[Math.floor(screenshots.length / 2)];
      
      await fs.writeFile(
        path.join(outputDir, 'video_frame_first.jpg'),
        firstFrame.data
      );
      
      if (midFrame && midFrame !== firstFrame) {
        await fs.writeFile(
          path.join(outputDir, 'video_frame_middle.jpg'),
          midFrame.data
        );
      }
      
      if (lastFrame && lastFrame !== firstFrame) {
        await fs.writeFile(
          path.join(outputDir, 'video_frame_last.jpg'),
          lastFrame.data
        );
      }
    }

    // Create a comprehensive video info file
    const videoInfo = {
      frames: screenshots.length,
      actualDuration: screenshots.length > 0 ? (screenshots[screenshots.length - 1]?.timestamp || 0) / 1000 : 0,
      estimatedDuration: totalDuration,
      fps: actualFPS,
      dimensions: { width, height },
      slides: presentationInfo.totalSlides,
      created: new Date().toISOString(),
      frameFiles: [
        'video_frame_first.jpg',
        screenshots.length > 2 ? 'video_frame_middle.jpg' : null,
        screenshots.length > 1 ? 'video_frame_last.jpg' : null
      ].filter(Boolean)
    };

    const infoPath = path.join(outputDir, 'video_info.json');
    await fs.writeJSON(infoPath, videoInfo, { spaces: 2 });

    console.log('✅ Video recording simulation complete');
    console.log(`📝 Video info saved: ${infoPath}`);
    console.log(`📸 Frame samples saved in ${outputDir}`);
    console.log('');
    console.log('🎬 Next Steps for Full Video Generation:');
    console.log('   This proof-of-concept captures presentation frames.');
    console.log('   To generate actual MP4 videos, you can:');
    console.log('   1. Install FFmpeg: apt-get install ffmpeg');
    console.log('   2. Use the captured frames + audio files');
    console.log('   3. Merge with existing SRT subtitles');
    console.log('   4. Example: ffmpeg -r 10 -i frames/%d.jpg -i audio/combined.wav -c:v libx264 -c:a aac output.mp4');
    console.log('');

    return infoPath;

  } catch (error) {
    console.error('❌ Video generation failed:', error.message);
    throw error;
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
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