const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

async function extractNotes(inputFile) {
  const inputDir = path.dirname(inputFile);
  const inputName = path.basename(inputFile, '.md');
  const notesFile = path.join(inputDir, `${inputName}.txt`);

  try {
    execSync(`npx @marp-team/marp-cli "${inputFile}" --notes`, {
      stdio: 'pipe'
    });
  } catch (error) {
    throw new Error(`Failed to extract notes: ${error.message}`);
  }

  if (!await fs.pathExists(notesFile)) {
    throw new Error('Notes file was not created. Make sure your presentation has speaker notes.');
  }

  const notesContent = await fs.readFile(notesFile, 'utf-8');

  if (!notesContent.trim()) {
    throw new Error('No speaker notes found in the presentation.');
  }

  const slideNotes = parseSlideNotes(notesContent);

  await Promise.all(
    slideNotes.map(async (note, index) => {
      const slideFile = `.temp/slide-${index + 1}.txt`;
      await fs.writeFile(slideFile, note.trim());
    })
  );

  return slideNotes.length;
}

function parseSlideNotes(content) {
  const segments = content.split(/\n---\n/).filter(segment => segment.trim());
  return segments.map(segment => segment.trim());
}

module.exports = { extractNotes };