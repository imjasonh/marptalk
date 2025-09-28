---
marp: true
theme: default
class: invert
paginate: true
---

# Welcome to Marptalk

## Automated Narrated Presentations

*A demonstration of AI-powered slide narration*

<!--
Welcome to Marptalk, a revolutionary system for creating automated narrated presentations. This demo will show you how we can combine Marp's powerful markdown-to-slides conversion with Google Cloud's text-to-speech capabilities to create engaging, self-narrating presentations.
-->

---

# The Problem

- **Manual narration** is time-consuming
- **Recording quality** varies
- **Updates require re-recording** everything
- **Consistency** across presentations is hard

<!--
Traditional presentation narration faces several challenges. First, manual narration is extremely time-consuming, often taking hours to record a single presentation. Second, recording quality can vary greatly depending on your microphone, environment, and speaking skills. Third, whenever you need to update your slides, you have to re-record entire sections, which is inefficient. Finally, maintaining consistency across multiple presentations or speakers is nearly impossible.
-->

---

# The Marptalk Solution

## Multi-Stage Pipeline

1. **Extract** speaker notes from Marp slides
2. **Generate** AI audio using Google Cloud TTS
3. **Create** self-playing HTML presentation
4. **Generate** videos, subtitles, and chapters

<!--
Marptalk solves these problems with an elegant multi-stage pipeline. First, we extract speaker notes directly from your Marp markdown files using the built-in notes feature. Second, we send these notes to Google Cloud's text-to-speech API to generate high-quality audio narration. Third, we combine everything into a self-playing HTML presentation that automatically advances slides in sync with the audio. Finally, we can generate complete MP4 videos with embedded subtitles and YouTube chapter markers.
-->

---

# Key Features

- 🎤 **AI-powered narration** with natural voices
- 🔄 **Automatic slide advancement** with perfect sync
- 🎬 **Complete video generation** with synchronized audio
- 📝 **SRT subtitles** for accessibility and publishing
- 📺 **YouTube chapters** for easy navigation
- ⚡ **Fast regeneration** when content changes
- 🎛️ **Interactive controls** for live presentations

<!--
The key features that make Marptalk special include AI-powered narration using Google Cloud's incredibly natural-sounding voices, automatic slide advancement that keeps perfect sync with the audio, complete video generation that creates MP4 files with synchronized audio and embedded subtitles, SRT subtitle generation for accessibility and video publishing, YouTube chapter markers for easy navigation, fast regeneration when you update your content, and interactive controls so you can pause, resume, or navigate manually during live presentations.
-->

---

# Technical Implementation

## Built with modern tools:

- **Node.js** for the automation pipeline
- **Marp CLI** for slide generation
- **Google Cloud TTS** for natural AI voices
- **Puppeteer** for slide screenshot capture
- **FFmpeg** for video processing and assembly
- **Vanilla JavaScript** for presentation controls

<!--
From a technical perspective, Marptalk is built with modern, reliable tools. We use Node.js to create a robust automation pipeline that handles file operations and API calls. The Marp CLI handles the heavy lifting of converting markdown to beautiful HTML slides. Google Cloud's text-to-speech API provides incredibly natural voices with multiple language options. Puppeteer captures high-quality screenshots of each slide for video generation. FFmpeg handles the complex video processing, combining static slides with perfectly synchronized audio tracks. And we use vanilla JavaScript for the presentation controls to keep things lightweight and compatible.
-->

---

# Getting Started

```bash
# Install dependencies
npm install

# Authenticate with Google Cloud
gcloud auth application-default login

# Generate interactive presentation
node src/generate.js examples/demo.md

# Generate with video and subtitles
node src/generate.js examples/demo.md --generate-video --generate-srt --generate-chapters

# Open the results
open dist/index.html        # Interactive presentation
open dist/presentation.mp4  # Generated video
```

<!--
Getting started with Marptalk is simple. First, install the dependencies using npm install. Then authenticate with Google Cloud using gcloud auth application-default login. Run the generate script pointing to your markdown file, and finally open the resulting HTML file in your browser. For video generation, add the video and subtitle flags to create a complete MP4 file with embedded subtitles and YouTube chapter markers. The entire process typically takes less than a minute for a typical presentation.
-->

---

# Demo Complete!

## Next Steps

**Try it yourself:**
- Modify this presentation
- Add your own speaker notes
- Experiment with different voices
- Generate your own MP4 videos
- Create SRT subtitles for accessibility
- Build automated presentations for any topic

**Share your work:**
- Upload videos directly to YouTube with embedded subtitles
- Use chapter markers for better navigation
- Create learning content with perfect synchronization

<!--
That concludes our demonstration of Marptalk! We've shown you how to create automated narrated presentations that combine the power of Marp's markdown-to-slides conversion with Google Cloud's natural text-to-speech capabilities, complete with MP4 video generation, embedded subtitles, and YouTube chapter markers. I encourage you to try it yourself - modify this presentation, add your own speaker notes, experiment with different voices, generate your own videos, and start building automated presentations for any topic. The generated videos are ready for direct upload to YouTube, Vimeo, or any video platform. Thank you for your attention, and happy presenting!
-->
