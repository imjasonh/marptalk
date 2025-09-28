#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs-extra');
const path = require('path');
const { extractNotes } = require('./extract-notes');
const { generateAudio } = require('./generate-audio');
const { generateHtml } = require('./generate-html');
const { generateSubtitles } = require('./generate-subtitles');
const { generateVideo } = require('./generate-video');

const program = new Command();

program
  .name('marptalk')
  .description('Generate automated narrated Marp presentations')
  .version('1.0.0')
  .argument('<input>', 'Input Marp markdown file')
  .option('-o, --output <dir>', 'Output directory', 'dist')
  .option('--voice <voice>', 'GCP TTS voice name', 'en-US-Journey-D')
  .option('--language <code>', 'Language code (e.g., en-US, es-ES)', 'en-US')
  .option('--key-file <path>', 'Path to Google Cloud service account key file')
  .option('--max-slides <num>', 'Maximum number of slides to generate audio for (for testing)', parseInt)
  .option('--dev-mode', 'Development mode: skip TTS generation, only update HTML/JS')
  .option('--generate-srt', 'Generate SRT subtitle file')
  .option('--generate-chapters', 'Generate YouTube chapter markers file')
  .option('--srt-filename <name>', 'Custom filename for SRT file', 'subtitles.srt')
  .option('--chapters-filename <name>', 'Custom filename for chapters file', 'chapters.txt')
  .option('--generate-video', 'Generate video recording of the presentation')
  .option('--video-filename <name>', 'Custom filename for video file', 'presentation.mp4')
  .option('--video-width <width>', 'Video width in pixels', parseInt, 1920)
  .option('--video-height <height>', 'Video height in pixels', parseInt, 1080)
  .option('--video-fps <fps>', 'Video frames per second', parseInt, 30)
  .action(async (input, options) => {
    try {
      const inputFile = path.resolve(input);
      const outputDir = path.resolve(options.output);

      if (!await fs.pathExists(inputFile)) {
        console.error('❌ Input file not found:', inputFile);
        process.exit(1);
      }

      if (options.devMode) {
        console.log('🚀 Starting Marptalk in DEVELOPMENT MODE...');
        console.log('📁 Input:', inputFile);
        console.log('📁 Output:', outputDir);
        console.log('⚠️  Skipping TTS generation - using existing audio files');
        console.log();
      } else {
        console.log('🚀 Starting Marp presentation generation...');
        console.log('📁 Input:', inputFile);
        console.log('📁 Output:', outputDir);
        console.log();
      }

      await fs.ensureDir(outputDir);
      await fs.ensureDir(path.join(outputDir, 'audio'));

      if (!options.devMode) {
        await fs.ensureDir('.temp');

        console.log('📝 Stage A: Extracting speaker notes...');
        const slideCount = await extractNotes(inputFile);
        console.log(`✅ Extracted notes for ${slideCount} slides`);
        console.log();

        console.log('🎵 Stage B: Generating audio files...');
        const maxSlides = options.maxSlides || slideCount;
        const actualSlideCount = Math.min(slideCount, maxSlides);

        if (maxSlides < slideCount) {
          console.log(`⚠️  Limiting to first ${maxSlides} slides for testing`);
        }

        await generateAudio({
          slideCount: actualSlideCount,
          outputDir: path.join(outputDir, 'audio'),
          voice: options.voice,
          languageCode: options.language,
          keyFile: options.keyFile
        });
        console.log('✅ Audio generation complete');
        console.log();
      } else {
        console.log('🔧 Development mode: Skipping stages A & B (notes extraction and TTS)');
        console.log();
      }

      // Stage D: Generate subtitles and chapters (if requested)
      if (options.generateSrt || options.generateChapters) {
        console.log('📝 Stage D: Generating subtitles and chapters...');
        
        // Ensure we have extracted notes (either from Stage A or development mode)
        let slideCount;
        if (options.devMode) {
          // In dev mode, we need to extract notes for subtitle generation
          await fs.ensureDir('.temp');
          slideCount = await extractNotes(inputFile);
        } else {
          // Notes already extracted in Stage A
          const tempFiles = await fs.readdir('.temp');
          slideCount = tempFiles.filter(f => f.startsWith('slide-') && f.endsWith('.txt')).length;
        }

        if (options.generateSrt || options.generateChapters) {
          const customOptions = {};
          if (options.srtFilename && options.srtFilename !== 'subtitles.srt') {
            customOptions.srtFilename = options.srtFilename;
          }
          if (options.chaptersFilename && options.chaptersFilename !== 'chapters.txt') {
            customOptions.chaptersFilename = options.chaptersFilename;
          }

          const results = await generateSubtitles({
            inputFile,
            slideCount,
            outputDir,
            customOptions
          });

          if (options.generateSrt) {
            console.log(`📝 SRT subtitles generated: ${results.srt}`);
          }
          if (options.generateChapters) {
            console.log(`📝 YouTube chapters generated: ${results.chapters}`);
          }
        }
        console.log('✅ Subtitles and chapters generation complete');
        console.log();
      }

      console.log('🌐 Stage C: Generating HTML presentation...');
      await generateHtml(inputFile, outputDir);
      console.log('✅ HTML generation complete');
      console.log();

      // Stage D: Video recording (if requested)
      if (options.generateVideo) {
        console.log('🎬 Stage D: Generating video recording...');
        const presentationPath = path.join(outputDir, 'index.html');
        
        try {
          const videoResult = await generateVideo({
            presentationPath,
            outputDir,
            filename: options.videoFilename,
            width: options.videoWidth,
            height: options.videoHeight,
            fps: options.videoFps
          });
          
          console.log(`🎬 Video recording generated: ${videoResult}`);
        } catch (error) {
          console.error('❌ Video generation failed:', error.message);
          console.log('💡 Make sure Chrome or Chromium is installed on your system');
        }
        
        console.log('✅ Video generation complete');
        console.log();
      }

      console.log('🎉 Presentation ready!');
      console.log(`📂 Open: ${path.join(outputDir, 'index.html')}`);
      
      if (options.generateVideo) {
        console.log('🎬 Video recording info available in output directory');
      }

    } catch (error) {
      console.error('❌ Error:', error.message);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program.parse();