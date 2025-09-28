const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs-extra');
const path = require('path');

async function generateAudio({ slideCount, outputDir, voice, languageCode, keyFile }) {
  // Initialize the Text-to-Speech client
  const clientConfig = {};

  if (keyFile && await fs.pathExists(keyFile)) {
    clientConfig.keyFilename = keyFile;
  }
  // If no keyFile provided, will use GOOGLE_APPLICATION_CREDENTIALS env var or gcloud auth

  const client = new textToSpeech.TextToSpeechClient(clientConfig);

  await fs.ensureDir(outputDir);

  for (let i = 1; i <= slideCount; i++) {
    const textFile = `.temp/slide-${i}.txt`;

    if (!await fs.pathExists(textFile)) {
      console.warn(`⚠️  Warning: No notes found for slide ${i}, skipping audio generation`);
      continue;
    }

    const text = await fs.readFile(textFile, 'utf-8');

    if (!text.trim()) {
      console.warn(`⚠️  Warning: Empty notes for slide ${i}, skipping audio generation`);
      continue;
    }

    console.log(`🎤 Generating audio for slide ${i}/${slideCount}...`);

    try {
      // Construct the request
      const request = {
        input: { text: text.trim() },
        voice: {
          languageCode: languageCode || 'en-US',
          name: voice || 'en-US-Journey-D',
          ssmlGender: 'NEUTRAL'
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,
          pitch: 0.0,
          volumeGainDb: 0.0
        }
      };

      // Perform the text-to-speech request
      const [response] = await client.synthesizeSpeech(request);

      // Write the binary audio content to a file
      const audioFile = path.join(outputDir, `slide-${i}.mp3`);
      await fs.writeFile(audioFile, response.audioContent, 'binary');

      console.log(`✅ Generated: slide-${i}.mp3`);

    } catch (error) {
      console.error(`❌ Failed to generate audio for slide ${i}:`, error.message);

      if (error.code === 7) { // PERMISSION_DENIED
        throw new Error('Google Cloud authentication failed. Check your credentials.');
      } else if (error.code === 8) { // RESOURCE_EXHAUSTED
        throw new Error('Google Cloud quota exceeded. Please check your billing and quotas.');
      } else if (error.code === 3) { // INVALID_ARGUMENT
        console.warn(`⚠️  Invalid text for slide ${i}, skipping...`);
        continue;
      } else {
        throw error;
      }
    }

    // Delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`🎵 Generated ${slideCount} audio files`);
}

module.exports = { generateAudio };
