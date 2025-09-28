#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs-extra');
const path = require('path');
const { extractNotes } = require('./extract-notes');
const { generateAudio } = require('./generate-audio');
const { generateHtml } = require('./generate-html');

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
  .action(async (input, options) => {
    try {
      const inputFile = path.resolve(input);
      const outputDir = path.resolve(options.output);

      if (!await fs.pathExists(inputFile)) {
        console.error('❌ Input file not found:', inputFile);
        process.exit(1);
      }

      console.log('🚀 Starting Marp presentation generation...');
      console.log('📁 Input:', inputFile);
      console.log('📁 Output:', outputDir);
      console.log();

      await fs.ensureDir(outputDir);
      await fs.ensureDir(path.join(outputDir, 'audio'));
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

      console.log('🌐 Stage C: Generating HTML presentation...');
      await generateHtml(inputFile, outputDir);
      console.log('✅ HTML generation complete');
      console.log();

      console.log('🎉 Presentation ready!');
      console.log(`📂 Open: ${path.join(outputDir, 'index.html')}`);

    } catch (error) {
      console.error('❌ Error:', error.message);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program.parse();