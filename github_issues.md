# GitHub Issues for Marptalk Implementation

This document contains the details for creating GitHub issues for each phase outlined in `plan.md`. Each issue below should be created separately in the GitHub repository.

## Issue 1: Project Setup and Dependencies

**Title:** Set up Node.js project with required dependencies

**Labels:** enhancement, setup

**Description:**
Initialize the Node.js project and install the necessary packages for the marptalk automation pipeline.

**Acceptance Criteria:**
- [ ] Initialize Node.js project with `npm init -y`
- [ ] Install required dependencies:
  - `commander` - for command-line argument handling
  - `@marp-team/marp-cli` - for Markdown to HTML conversion and note extraction
  - `openai` - for Text-to-Speech API integration
  - `fs-extra` - for enhanced file system operations
- [ ] Create basic project structure with appropriate directories
- [ ] Verify all dependencies are correctly installed and importable

**Tasks:**
```bash
npm init -y
npm install @marp-team/marp-cli openai fs-extra commander
```

---

## Issue 2: Extract Speaker Notes and Structure Files (Stage A)

**Title:** Implement Stage A - Extract and segment speaker notes from Marp presentations

**Labels:** feature, stage-a

**Description:**
Implement the first stage of the automation pipeline that extracts speaker notes from Marp presentations and segments them into individual text files for processing.

**Acceptance Criteria:**
- [ ] Create main Node.js script (e.g., `generate.js`)
- [ ] Implement path setup for input, output, and temporary directories
- [ ] Extract notes using Marp CLI: `npx @marp-team/marp-cli ${inputFile} --notes .temp/all_notes.txt`
- [ ] Implement note segmentation logic:
  - Read the entire notes file content
  - Split content based on Marp's slide separator
  - Save each segment as individual files: `.temp/slide-1.txt`, `.temp/slide-2.txt`, etc.
- [ ] Handle edge cases and error conditions
- [ ] Test with sample Marp presentations

**Implementation Details:**
- Use `execSync` from `child_process` for CLI commands
- Investigate Marp CLI output format to determine the correct separator pattern
- Ensure proper error handling for file operations

---

## Issue 3: Generate Audio Files using OpenAI TTS (Stage B)

**Title:** Implement Stage B - Convert segmented text to speech using OpenAI TTS API

**Labels:** feature, stage-b, openai

**Description:**
Implement the second stage that converts the segmented text files from Stage A into MP3 audio files using OpenAI's Text-to-Speech API.

**Acceptance Criteria:**
- [ ] Set up OpenAI client initialization
- [ ] Implement loop to process all segmented text files
- [ ] For each `.temp/slide-N.txt` file:
  - Read the script text content
  - Call OpenAI TTS API with appropriate parameters
  - Save binary audio data to `dist/audio/slide-N.mp3`
- [ ] Configure TTS settings:
  - Model: `tts-1` (or `tts-1-hd` for higher quality)
  - Voice: `alloy` (configurable)
- [ ] Implement proper error handling for API calls
- [ ] Add progress logging for audio generation

**Implementation Details:**
```javascript
const OpenAI = require('openai');
// Initialize OpenAI client

for (let i = 1; i <= totalSlides; i++) {
    const text = fs.readFileSync(`.temp/slide-${i}.txt`, 'utf-8');
    const response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: text,
    });
    
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(`${outputDir}/audio/slide-${i}.mp3`, buffer);
}
```

**Prerequisites:**
- Requires OpenAI API key configuration
- Stage A must be completed

---

## Issue 4: Marp Conversion and Script Injection (Stage C)

**Title:** Implement Stage C - Convert to HTML and inject automation script

**Labels:** feature, stage-c, marp

**Description:**
Implement the final stage that converts the Markdown presentation to HTML and injects the custom JavaScript logic for automated audio playback and slide advancement.

**Acceptance Criteria:**
- [ ] Create `slide-automation.js` file with front-end logic
- [ ] Implement Marp CLI conversion with script injection:
  ```bash
  npx @marp-team/marp-cli ${inputFile} -o ${outputDir}/index.html --script slide-automation.js
  ```
- [ ] Ensure the automation script is properly embedded in the final HTML
- [ ] Test the complete pipeline from Markdown input to HTML output
- [ ] Verify that all generated audio files are accessible from the HTML

**Implementation Details:**
- Use Marp CLI's `--script` option to embed automation logic
- Ensure proper file path resolution for audio files
- Coordinate with Stage B output structure

**Prerequisites:**
- Stage A and Stage B must be completed
- Automation script (Issue 5) must be implemented

---

## Issue 5: Implement Slide Automation JavaScript

**Title:** Create slide-automation.js for audio playback coordination

**Labels:** feature, frontend, javascript

**Description:**
Develop the front-end JavaScript that gets injected into the final HTML to coordinate audio playback with slide advancement in Marp presentations.

**Acceptance Criteria:**
- [ ] Create `slide-automation.js` file
- [ ] Implement slide index detection from URL hash
- [ ] Implement automatic slide advancement logic
- [ ] Implement audio playback for current slide:
  - Load audio file for current slide (`./audio/slide-${slideIndex}.mp3`)
  - Handle audio playback completion
  - Auto-advance to next slide when audio ends
- [ ] Handle browser autoplay policies gracefully
- [ ] Add fallback logic if audio fails to play
- [ ] Implement proper cleanup of previous audio instances
- [ ] Add event listeners for slide changes

**Key Functions to Implement:**
- `getCurrentSlideIndex()` - Get current slide from URL hash
- `goToNextSlide()` - Advance to next slide by updating hash
- `playCurrentSlideAudio(slideIndex)` - Play audio and set up auto-advance
- `handleSlideChange()` - Main coordination logic

**Implementation Details:**
```javascript
document.addEventListener('DOMContentLoaded', () => {
    const getCurrentSlideIndex = () => {
        const hash = window.location.hash.slice(1);
        return parseInt(hash) || 1;
    };

    const playCurrentSlideAudio = (slideIndex) => {
        const audioPath = `./audio/slide-${slideIndex}.mp3`;
        const audio = new Audio(audioPath);
        
        audio.onended = () => {
            goToNextSlide();
        };
        
        audio.play().catch(error => {
            console.warn(`Could not play audio for slide ${slideIndex}.`, error);
            setTimeout(goToNextSlide, 2000);
        });
    };

    // Event listeners and initialization
});
```

**Testing Requirements:**
- Test with various browsers and autoplay policies
- Test slide navigation behavior
- Test audio loading and playback
- Test error handling scenarios

---

## Implementation Order

The issues should be implemented in the following order due to dependencies:

1. **Issue 1** - Project Setup (foundation)
2. **Issue 2** - Stage A (text extraction)
3. **Issue 3** - Stage B (audio generation) 
4. **Issue 5** - Automation Script (frontend logic)
5. **Issue 4** - Stage C (final assembly)

## Additional Considerations

- Ensure proper error handling throughout all stages
- Add configuration options for customizable voices, models, and file paths
- Consider adding progress indicators and logging
- Plan for testing with various Marp presentation formats
- Document API key requirements and setup instructions