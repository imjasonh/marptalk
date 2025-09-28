const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

async function generateHtml(inputFile, outputDir) {
  const automationScriptPath = path.join(__dirname, 'slide-automation.js');
  const outputHtml = path.join(outputDir, 'index.html');

  if (!await fs.pathExists(automationScriptPath)) {
    throw new Error('slide-automation.js not found. This should be created first.');
  }

  try {
    execSync(`npx @marp-team/marp-cli "${inputFile}" -o "${outputHtml}"`, {
      stdio: 'pipe'
    });
  } catch (error) {
    throw new Error(`Failed to generate HTML: ${error.message}`);
  }

  if (!await fs.pathExists(outputHtml)) {
    throw new Error('HTML file was not generated successfully.');
  }

  let htmlContent = await fs.readFile(outputHtml, 'utf-8');

  const customStyles = `
    <style>
      body.presentation-mode {
        cursor: none;
      }

      .presentation-controls {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: sans-serif;
        font-size: 14px;
      }

      .presentation-controls button {
        background: #333;
        color: white;
        border: none;
        padding: 5px 10px;
        margin: 0 5px;
        border-radius: 3px;
        cursor: pointer;
      }

      .presentation-controls button:hover {
        background: #555;
      }

      .slide-progress {
        position: fixed;
        bottom: 0;
        left: 0;
        height: 3px;
        background: #007acc;
        transition: width 0.3s ease;
        z-index: 9998;
      }

      .audio-indicator {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 5px 10px;
        border-radius: 15px;
        font-family: sans-serif;
        font-size: 12px;
        display: none;
      }

      .audio-indicator.playing {
        display: block;
        animation: pulse 1.5s infinite;
      }

      @keyframes pulse {
        0% { opacity: 0.7; }
        50% { opacity: 1; }
        100% { opacity: 0.7; }
      }
    </style>
  `;

  const customHtml = `
    <div class="presentation-controls">
      <button id="startPresentation">▶ Start</button>
      <button id="pausePresentation">⏸ Pause</button>
      <button id="stopPresentation">⏹ Stop</button>
      <button id="toggleMute">🔊 Sound</button>
      <span id="slideCounter">Slide: 1</span>
    </div>
    <div class="slide-progress" id="slideProgress"></div>
    <div class="audio-indicator" id="audioIndicator">🎤 Playing audio...</div>
  `;

  const automationScript = await fs.readFile(automationScriptPath, 'utf-8');

  htmlContent = htmlContent.replace('</body>', customHtml + '\n</body>');
  htmlContent = htmlContent.replace('</head>', customStyles + '\n</head>');
  htmlContent = htmlContent.replace('</body>', `<script>${automationScript}</script>\n</body>`);

  await fs.writeFile(outputHtml, htmlContent);

  console.log(`📄 HTML generated: ${outputHtml}`);
}

module.exports = { generateHtml };