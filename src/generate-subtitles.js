const fs = require('fs-extra');
const path = require('path');

/**
 * Extract slide titles from markdown content
 * @param {string} markdownContent - The raw markdown content
 * @returns {Array<string>} Array of slide titles
 */
function extractSlideTitles(markdownContent) {
  const slides = markdownContent.split(/\n---\n/);
  const titles = [];
  
  slides.forEach((slide, index) => {
    const lines = slide.split('\n');
    const titleLine = lines.find(line => line.startsWith('# '));
    
    if (titleLine) {
      // Remove the markdown heading syntax
      titles.push(titleLine.replace(/^# /, '').trim());
    } else {
      // Fallback for slides without titles
      titles.push(`Slide ${index + 1}`);
    }
  });
  
  return titles;
}

/**
 * Calculate estimated duration for a text based on word count
 * Assumes average speaking rate of 150 words per minute
 * @param {string} text - The text to calculate duration for
 * @returns {number} Duration in seconds
 */
function estimateDuration(text) {
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  const wordsPerMinute = 150; // Average speaking rate
  const durationMinutes = wordCount / wordsPerMinute;
  return Math.max(durationMinutes * 60, 3); // Minimum 3 seconds per slide
}

/**
 * Format seconds to SRT timestamp format (HH:MM:SS,mmm)
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted timestamp
 */
function formatSrtTimestamp(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/**
 * Format seconds to YouTube chapter format (MM:SS or H:MM:SS)
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted timestamp
 */
function formatYouTubeTimestamp(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * Generate SRT subtitle file
 * @param {Object} options - Configuration options
 * @param {Array<string>} options.slideNotes - Array of speaker notes for each slide
 * @param {Array<string>} options.slideTitles - Array of slide titles
 * @param {string} options.outputDir - Output directory
 * @param {string} options.filename - Output filename (default: 'subtitles.srt')
 * @returns {Promise<string>} Path to generated SRT file
 */
async function generateSrt({ slideNotes, slideTitles, outputDir, filename = 'subtitles.srt' }) {
  let srtContent = '';
  let currentTime = 0;
  
  slideNotes.forEach((note, index) => {
    if (!note.trim()) return; // Skip empty notes
    
    const duration = estimateDuration(note);
    const startTime = currentTime;
    const endTime = currentTime + duration;
    
    // SRT format:
    // 1
    // 00:00:01,000 --> 00:00:03,000
    // Caption text here.
    //
    srtContent += `${index + 1}\n`;
    srtContent += `${formatSrtTimestamp(startTime)} --> ${formatSrtTimestamp(endTime)}\n`;
    srtContent += `${note.trim()}\n\n`;
    
    currentTime = endTime;
  });
  
  const srtFile = path.join(outputDir, filename);
  await fs.writeFile(srtFile, srtContent, 'utf-8');
  
  return srtFile;
}

/**
 * Generate YouTube chapter markers
 * @param {Object} options - Configuration options
 * @param {Array<string>} options.slideTitles - Array of slide titles
 * @param {Array<string>} options.slideNotes - Array of speaker notes for each slide (for timing)
 * @param {string} options.outputDir - Output directory
 * @param {string} options.filename - Output filename (default: 'chapters.txt')
 * @returns {Promise<string>} Path to generated chapters file
 */
async function generateYouTubeChapters({ slideTitles, slideNotes, outputDir, filename = 'chapters.txt' }) {
  let chaptersContent = '';
  let currentTime = 0;
  
  slideTitles.forEach((title, index) => {
    // YouTube chapter format:
    // 0:00 - Introduction
    // 1:30 - Main Topic
    chaptersContent += `${formatYouTubeTimestamp(currentTime)} - ${title}\n`;
    
    // Calculate time for next chapter based on speaker notes duration
    if (index < slideNotes.length && slideNotes[index]) {
      const duration = estimateDuration(slideNotes[index]);
      currentTime += duration;
    } else {
      // Default duration if no notes
      currentTime += 30; // 30 seconds default
    }
  });
  
  const chaptersFile = path.join(outputDir, filename);
  await fs.writeFile(chaptersFile, chaptersContent.trim(), 'utf-8');
  
  return chaptersFile;
}

/**
 * Generate both SRT subtitles and YouTube chapters
 * @param {Object} options - Configuration options
 * @param {string} options.inputFile - Input markdown file
 * @param {number} options.slideCount - Number of slides
 * @param {string} options.outputDir - Output directory
 * @param {Object} options.customOptions - Custom options for filenames
 * @returns {Promise<Object>} Paths to generated files
 */
async function generateSubtitles({ inputFile, slideCount, outputDir, customOptions = {} }) {
  // Read markdown content for titles
  const markdownContent = await fs.readFile(inputFile, 'utf-8');
  const slideTitles = extractSlideTitles(markdownContent);
  
  // Read extracted speaker notes
  const slideNotes = [];
  for (let i = 1; i <= slideCount; i++) {
    const noteFile = `.temp/slide-${i}.txt`;
    if (await fs.pathExists(noteFile)) {
      const note = await fs.readFile(noteFile, 'utf-8');
      slideNotes.push(note.trim());
    } else {
      slideNotes.push(''); // Empty note for slides without speaker notes
    }
  }
  
  await fs.ensureDir(outputDir);
  
  const results = {};
  
  // Generate SRT subtitles
  const srtFile = await generateSrt({
    slideNotes,
    slideTitles,
    outputDir,
    filename: customOptions.srtFilename || 'subtitles.srt'
  });
  results.srt = srtFile;
  
  // Generate YouTube chapters
  const chaptersFile = await generateYouTubeChapters({
    slideTitles,
    slideNotes,
    outputDir,
    filename: customOptions.chaptersFilename || 'chapters.txt'
  });
  results.chapters = chaptersFile;
  
  return results;
}

module.exports = {
  generateSubtitles,
  extractSlideTitles,
  estimateDuration,
  formatSrtTimestamp,
  formatYouTubeTimestamp,
  generateSrt,
  generateYouTubeChapters
};