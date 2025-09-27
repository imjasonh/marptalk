#!/bin/bash

# Script to create GitHub issues for marptalk implementation phases
# Requires GitHub CLI (gh) to be installed and authenticated

REPO="imjasonh/marptalk"

echo "Creating GitHub issues for marptalk implementation phases..."

# Issue 1: Project Setup and Dependencies
echo "Creating Issue 1: Project Setup and Dependencies"
gh issue create \
  --repo "$REPO" \
  --title "Set up Node.js project with required dependencies" \
  --label "enhancement,setup" \
  --body "Initialize the Node.js project and install the necessary packages for the marptalk automation pipeline.

**Acceptance Criteria:**
- [ ] Initialize Node.js project with \`npm init -y\`
- [ ] Install required dependencies:
  - \`commander\` - for command-line argument handling
  - \`@marp-team/marp-cli\` - for Markdown to HTML conversion and note extraction
  - \`openai\` - for Text-to-Speech API integration
  - \`fs-extra\` - for enhanced file system operations
- [ ] Create basic project structure with appropriate directories
- [ ] Verify all dependencies are correctly installed and importable

**Tasks:**
\`\`\`bash
npm init -y
npm install @marp-team/marp-cli openai fs-extra commander
\`\`\`"

# Issue 2: Stage A - Extract Speaker Notes
echo "Creating Issue 2: Stage A - Extract Speaker Notes"
gh issue create \
  --repo "$REPO" \
  --title "Implement Stage A - Extract and segment speaker notes from Marp presentations" \
  --label "feature,stage-a" \
  --body "Implement the first stage of the automation pipeline that extracts speaker notes from Marp presentations and segments them into individual text files for processing.

**Acceptance Criteria:**
- [ ] Create main Node.js script (e.g., \`generate.js\`)
- [ ] Implement path setup for input, output, and temporary directories
- [ ] Extract notes using Marp CLI: \`npx @marp-team/marp-cli \${inputFile} --notes .temp/all_notes.txt\`
- [ ] Implement note segmentation logic:
  - Read the entire notes file content
  - Split content based on Marp's slide separator
  - Save each segment as individual files: \`.temp/slide-1.txt\`, \`.temp/slide-2.txt\`, etc.
- [ ] Handle edge cases and error conditions
- [ ] Test with sample Marp presentations

**Implementation Details:**
- Use \`execSync\` from \`child_process\` for CLI commands
- Investigate Marp CLI output format to determine the correct separator pattern
- Ensure proper error handling for file operations"

# Issue 3: Stage B - Generate Audio Files
echo "Creating Issue 3: Stage B - Generate Audio Files"
gh issue create \
  --repo "$REPO" \
  --title "Implement Stage B - Convert segmented text to speech using OpenAI TTS API" \
  --label "feature,stage-b,openai" \
  --body "Implement the second stage that converts the segmented text files from Stage A into MP3 audio files using OpenAI's Text-to-Speech API.

**Acceptance Criteria:**
- [ ] Set up OpenAI client initialization
- [ ] Implement loop to process all segmented text files
- [ ] For each \`.temp/slide-N.txt\` file:
  - Read the script text content
  - Call OpenAI TTS API with appropriate parameters
  - Save binary audio data to \`dist/audio/slide-N.mp3\`
- [ ] Configure TTS settings:
  - Model: \`tts-1\` (or \`tts-1-hd\` for higher quality)
  - Voice: \`alloy\` (configurable)
- [ ] Implement proper error handling for API calls
- [ ] Add progress logging for audio generation

**Prerequisites:**
- Requires OpenAI API key configuration
- Stage A must be completed"

# Issue 4: Stage C - Marp Conversion and Script Injection
echo "Creating Issue 4: Stage C - Marp Conversion and Script Injection"
gh issue create \
  --repo "$REPO" \
  --title "Implement Stage C - Convert to HTML and inject automation script" \
  --label "feature,stage-c,marp" \
  --body "Implement the final stage that converts the Markdown presentation to HTML and injects the custom JavaScript logic for automated audio playbook and slide advancement.

**Acceptance Criteria:**
- [ ] Create \`slide-automation.js\` file with front-end logic
- [ ] Implement Marp CLI conversion with script injection:
  \`\`\`bash
  npx @marp-team/marp-cli \${inputFile} -o \${outputDir}/index.html --script slide-automation.js
  \`\`\`
- [ ] Ensure the automation script is properly embedded in the final HTML
- [ ] Test the complete pipeline from Markdown input to HTML output
- [ ] Verify that all generated audio files are accessible from the HTML

**Prerequisites:**
- Stage A and Stage B must be completed
- Automation script (Issue 5) must be implemented"

# Issue 5: Slide Automation JavaScript
echo "Creating Issue 5: Slide Automation JavaScript"
gh issue create \
  --repo "$REPO" \
  --title "Create slide-automation.js for audio playback coordination" \
  --label "feature,frontend,javascript" \
  --body "Develop the front-end JavaScript that gets injected into the final HTML to coordinate audio playback with slide advancement in Marp presentations.

**Acceptance Criteria:**
- [ ] Create \`slide-automation.js\` file
- [ ] Implement slide index detection from URL hash
- [ ] Implement automatic slide advancement logic
- [ ] Implement audio playbook for current slide:
  - Load audio file for current slide (\`./audio/slide-\${slideIndex}.mp3\`)
  - Handle audio playback completion
  - Auto-advance to next slide when audio ends
- [ ] Handle browser autoplay policies gracefully
- [ ] Add fallback logic if audio fails to play
- [ ] Implement proper cleanup of previous audio instances
- [ ] Add event listeners for slide changes

**Testing Requirements:**
- Test with various browsers and autoplay policies
- Test slide navigation behavior
- Test audio loading and playback
- Test error handling scenarios"

echo "All GitHub issues have been created successfully!"
echo "Implementation should follow this order:"
echo "1. Project Setup and Dependencies"
echo "2. Stage A - Extract Speaker Notes"
echo "3. Stage B - Generate Audio Files"
echo "4. Slide Automation JavaScript"
echo "5. Stage C - Marp Conversion and Script Injection"