That's an excellent plan for creating a fully automated, narrated Marp presentation. Implementing this as a Node.js pipeline is the most robust way to manage the file system operations, the Marp conversion, and the OpenAI API calls.
Here is a step-by-step plan for implementing this Node.js automation pipeline:
1. Project Setup and Dependencies
You'll need a Node.js project initialized with the necessary packages:
| Package | Purpose |
|---|---|
| commander (or similar) | To handle command-line arguments (input file, output directory). |
| @marp-team/marp-cli | The engine for converting the Markdown to HTML and extracting notes. |
| openai | To interact with the Text-to-Speech API. |
| fs-extra | For easier file system operations (creating directories, reading/writing files). |
npm init -y
npm install @marp-team/marp-cli openai fs-extra commander

2. The Automation Pipeline (Main Script)
Create a main Node.js script (e.g., generate.js) that orchestrates the three main stages.
Stage A: Extract Speaker Notes and Structure Files
This stage uses the Marp CLI to extract all notes into a single file, then splits that file into individual text files.
 * Define Paths: Set up input (slides.md) and output (dist/) directories, and a temporary directory for notes (.temp/).
 * Extract Notes: Call the Marp CLI from your Node script. The execSync function is simple for this.
   // Node.js (generate.js)
const { execSync } = require('child_process');
execSync(`npx @marp-team/marp-cli ${inputFile} --notes .temp/all_notes.txt`);

 * Segment Notes: Read .temp/all_notes.txt. Marp separates notes with a distinct delimiter (often based on its internal structure). Write custom logic to:
   * Read the entire file content.
   * Split the content based on the slide separator (you may need to examine the output of a test run to find the exact separator Marp CLI uses).
   * Save each segment into an individual file: .temp/slide-1.txt, .temp/slide-2.txt, etc.
Stage B: Generate Audio Files (OpenAI TTS)
This stage uses the segmented text files to generate the corresponding MP3 files.
 * Iterate and Call API: Loop through all .temp/slide-N.txt files. For each file:
   * Read the script text.
   * Call the OpenAI TTS API. It is crucial to use the appropriate file naming for the next stage.
 * Save Audio: Save the binary audio data directly to the final output directory (e.g., dist/audio/slide-1.mp3).
   // Node.js (TTS generation function)
const OpenAI = require('openai');
// Initialize OpenAI client...

for (let i = 1; i <= totalSlides; i++) {
    const text = fs.readFileSync(`.temp/slide-${i}.txt`, 'utf-8');
    const response = await openai.audio.speech.create({
        model: 'tts-1', // or tts-1-hd for higher quality
        voice: 'alloy', // or other voice of your choice
        input: text,
    });

    // Save the audio buffer to the output file
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(`${outputDir}/audio/slide-${i}.mp3`, buffer);
}

Stage C: Marp Conversion and Script Injection
The final stage converts the Markdown to HTML and injects the custom JavaScript logic.
 * Write Custom JS: Create a file named slide-automation.js that contains the runtime logic (see the script details below).
 * Final Conversion: Use Marp CLI again, this time with the --script option to embed your automation logic into the final HTML output.
   // Node.js (generate.js)
execSync(`npx @marp-team/marp-cli ${inputFile} -o ${outputDir}/index.html --script slide-automation.js`);

3. The Automation Script (slide-automation.js)
This is the front-end JavaScript that gets injected into the final HTML to coordinate audio playback and slide advancement.
/**
 * slide-automation.js - Injected into the final HTML
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Get the slide index from the URL hash
    const getCurrentSlideIndex = () => {
        // Marp/Bespoke.js presentations use URL hash for navigation (e.g., #1, #2)
        const hash = window.location.hash.slice(1);
        const index = parseInt(hash) || 1; // Default to slide 1
        return index;
    };

    // 2. Function to advance to the next slide
    const goToNextSlide = () => {
        const current = getCurrentSlideIndex();
        // Simply increment the hash. Marp's built-in logic handles the visibility change.
        window.location.hash = `#${current + 1}`;
    };

    // 3. Play audio for the current slide
    const playCurrentSlideAudio = (slideIndex) => {
        const audioPath = `./audio/slide-${slideIndex}.mp3`;
        const audio = new Audio(audioPath);

        // Stop any currently playing audio (optional, but recommended)
        document.querySelectorAll('audio.narration').forEach(a => a.pause());

        // Set up the auto-advance logic
        audio.onended = () => {
            goToNextSlide();
        };

        // Start playing
        audio.play().catch(error => {
            console.warn(`Could not play audio for slide ${slideIndex}.`, error);
            // Fallback: If autoplay fails (e.g., browser policy), still advance after a short pause
            setTimeout(goToNextSlide, 2000);
        });
    };

    // 4. Main Event Listener
    const handleSlideChange = () => {
        const index = getCurrentSlideIndex();
        playCurrentSlideAudio(index);
    };

    // Listen for hash changes (slide advancement)
    window.addEventListener('hashchange', handleSlideChange);

    // Initial check to start the presentation on load
    handleSlideChange();
});

