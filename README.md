# Marptalk - Automated Narrated Marp Presentations

This repository contains the plan and implementation for creating fully automated, narrated Marp presentations using a Node.js pipeline.

## Implementation Plan

The project is broken down into 5 main phases as outlined in `plan.md`:

1. **Project Setup and Dependencies** - Initialize Node.js project with required packages
2. **Stage A: Extract Speaker Notes** - Extract and segment speaker notes from Marp presentations  
3. **Stage B: Generate Audio Files** - Convert text to speech using OpenAI TTS API
4. **Stage C: Marp Conversion and Script Injection** - Convert to HTML and inject automation logic
5. **Automation Script Development** - Create frontend JavaScript for audio playback coordination

## GitHub Issues

To track the implementation progress, GitHub issues should be created for each phase. Two files have been provided to facilitate this:

### Option 1: Manual Issue Creation
Use `github_issues.md` which contains detailed descriptions, acceptance criteria, and implementation details for each phase. Copy and paste the content to create issues manually in the GitHub web interface.

### Option 2: Automated Issue Creation (Requires GitHub CLI)
Use the `create_issues.sh` script to automatically create all issues:

```bash
# Ensure GitHub CLI is installed and authenticated
gh auth login

# Run the script to create all issues
./create_issues.sh
```

## Implementation Order

The phases should be implemented in the following order due to dependencies:

1. Project Setup and Dependencies (foundation)
2. Stage A - Extract Speaker Notes (text processing)
3. Stage B - Generate Audio Files (requires OpenAI API key)
4. Automation Script Development (frontend logic)
5. Stage C - Marp Conversion (final assembly)

## Prerequisites

- Node.js and npm installed
- OpenAI API key for text-to-speech functionality
- GitHub CLI (gh) for automated issue creation (optional)

## Architecture Overview

The solution creates a complete pipeline:
```
Markdown + Speaker Notes → Text Segments → Audio Files → Automated HTML Presentation
```

Key components:
- **generate.js** - Main orchestration script
- **slide-automation.js** - Frontend automation logic
- **Marp CLI** - Markdown to HTML conversion
- **OpenAI TTS API** - Text to speech conversion
- **File system operations** - Managing temporary files and output structure

For detailed implementation guidance, see `plan.md` and the individual GitHub issues.