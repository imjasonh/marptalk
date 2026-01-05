(() => {
  "use strict";

  let currentAudio = null;
  let isPlaying = false;
  let isPaused = false;
  let isMuted = false;
  let audioOnNavigation = true; // Play audio on manual navigation
  let totalSlides = 0;
  let currentSpeechUtterance = null;
  let speechSynthesis = window.speechSynthesis;
  let speakerNotes = {}; // Will be populated with slide notes for TTS fallback

  function log(...args) {
    console.log("[MarptalkAutomation]", ...args);
  }

  function getCurrentSlideIndex() {
    const hash = window.location.hash.slice(1);
    const index = parseInt(hash) || 1;
    return index;
  }

  function getTotalSlides() {
    const slides = document.querySelectorAll("section[data-marpit-fragment]");
    return slides.length || document.querySelectorAll("section").length || 1;
  }

  function goToSlide(slideIndex) {
    if (slideIndex < 1) slideIndex = 1;
    if (slideIndex > totalSlides) slideIndex = totalSlides;
    window.location.hash = `#${slideIndex}`;
    updateSlideCounter(slideIndex);
    updateProgressBar(slideIndex);
  }

  function goToNextSlide() {
    const current = getCurrentSlideIndex();
    goToSlide(current + 1);
  }

  function goToPrevSlide() {
    const current = getCurrentSlideIndex();
    goToSlide(current - 1);
  }

  function updateSlideCounter(slideIndex) {
    const counter = document.getElementById("slideCounter");
    if (counter) {
      counter.textContent = `Slide: ${slideIndex}/${totalSlides}`;
    }
  }

  function updateProgressBar(slideIndex) {
    const progressBar = document.getElementById("slideProgress");
    if (progressBar) {
      const percentage = (slideIndex / totalSlides) * 100;
      progressBar.style.width = `${percentage}%`;
    }
  }

  function showAudioIndicator() {
    const indicator = document.getElementById("audioIndicator");
    if (indicator) {
      indicator.classList.add("playing");
    }
  }

  function hideAudioIndicator() {
    const indicator = document.getElementById("audioIndicator");
    if (indicator) {
      indicator.classList.remove("playing");
    }
  }

  function stopCurrentAudio() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
      hideAudioIndicator();
    }
    if (currentSpeechUtterance) {
      // Clear event handlers before cancelling to prevent unwanted navigation
      currentSpeechUtterance.onend = null;
      currentSpeechUtterance.onerror = null;
      currentSpeechUtterance.onstart = null;
      currentSpeechUtterance.onboundary = null;
      currentSpeechUtterance.onpause = null;
      currentSpeechUtterance.onresume = null;

      speechSynthesis.cancel();
      currentSpeechUtterance = null;
      hideAudioIndicator();
    }
  }

  function speakText(text, slideIndex) {
    if (!text || !speechSynthesis) {
      log(`No text or speech synthesis not available for slide ${slideIndex}`);
      return false;
    }

    stopCurrentAudio();

    log(`Using browser TTS for slide ${slideIndex}`);

    currentSpeechUtterance = new SpeechSynthesisUtterance(text);

    // Set voice properties
    currentSpeechUtterance.rate = 1.25;
    currentSpeechUtterance.pitch = 1.0;
    currentSpeechUtterance.volume = 1.0;

    currentSpeechUtterance.onstart = () => {
      log(`Speech started for slide ${slideIndex}`);
      showAudioIndicator();
    };

    currentSpeechUtterance.onend = (event) => {
      log(`Speech ended for slide ${slideIndex}, event:`, event);
      hideAudioIndicator();
      currentSpeechUtterance = null;

      if (isPlaying && !isPaused && getCurrentSlideIndex() < totalSlides) {
        setTimeout(() => {
          goToNextSlide();
        }, 500);
      } else if (getCurrentSlideIndex() >= totalSlides) {
        stopPresentation();
      }
    };

    currentSpeechUtterance.onerror = (error) => {
      log(
        `Speech synthesis error for slide ${slideIndex}:`,
        error,
        `error type: ${error.error}`,
      );
      hideAudioIndicator();
      currentSpeechUtterance = null;

      if (isPlaying && !isPaused) {
        setTimeout(() => {
          goToNextSlide();
        }, 2000);
      }
    };

    try {
      speechSynthesis.speak(currentSpeechUtterance);
      log(`Speech queued for slide ${slideIndex}, waiting for start...`);
      return true;
    } catch (error) {
      log(`Failed to start speech synthesis:`, error);
      hideAudioIndicator();
      currentSpeechUtterance = null;
      return false;
    }
  }

  function playSlideAudio(slideIndex, forcePlay = false) {
    if (isMuted) return;
    if (!forcePlay && isPaused) return;

    stopCurrentAudio();

    const audioPath = `./audio/slide-${slideIndex}.mp3`;
    log(`Attempting to play audio: ${audioPath}`);

    currentAudio = new Audio(audioPath);

    currentAudio.onerror = (error) => {
      hideAudioIndicator();

      // Prevent further events from the failed audio object
      const failedAudio = currentAudio;
      failedAudio.oncanplay = null;
      failedAudio.onended = null;
      failedAudio.onerror = null;
      failedAudio.onloadstart = null;

      // Clear the failed audio object
      currentAudio = null;

      // Try browser TTS fallback
      const speakerNote = speakerNotes[slideIndex];
      if (speakerNote && speakerNote.trim()) {
        const ttsSuccess = speakText(speakerNote, slideIndex);
        if (ttsSuccess) {
          return; // Successfully started TTS, don't proceed to auto-advance
        }
      }

      // If TTS also failed, advance to next slide
      if (isPlaying && !isPaused) {
        setTimeout(() => {
          goToNextSlide();
        }, 2000);
      }
    };

    currentAudio.onloadstart = () => {
      log(`Loading audio for slide ${slideIndex}`);
      showAudioIndicator();
    };

    currentAudio.onended = () => {
      log(`Audio ended for slide ${slideIndex}`);
      hideAudioIndicator();

      if (isPlaying && !isPaused && getCurrentSlideIndex() < totalSlides) {
        setTimeout(() => {
          goToNextSlide();
        }, 500);
      } else if (getCurrentSlideIndex() >= totalSlides) {
        stopPresentation();
      }
    };

    currentAudio.oncanplay = () => {
      log(`Audio ready for slide ${slideIndex}`);
      if ((isPlaying && !isPaused) || (forcePlay && audioOnNavigation)) {
        currentAudio.play().catch((error) => {
          log(`Autoplay failed for slide ${slideIndex}:`, error);
          hideAudioIndicator();

          if (isPlaying && !isPaused) {
            setTimeout(() => {
              goToNextSlide();
            }, 2000);
          }
        });
      }
    };

    currentAudio.load();
  }

  function startPresentation() {
    log("Starting presentation");
    isPlaying = true;
    isPaused = false;
    goToSlide(1);
    document.body.classList.add("presentation-mode");

    const startBtn = document.getElementById("startPresentation");
    if (startBtn) startBtn.textContent = "▶ Started";

    // Force slide change detection to trigger audio
    setTimeout(() => {
      handleSlideChange(true); // Force the slide change handler
    }, 300);
  }

  function pausePresentation() {
    log("Pausing presentation");
    isPaused = !isPaused;

    const pauseBtn = document.getElementById("pausePresentation");
    if (pauseBtn) {
      pauseBtn.textContent = isPaused ? "▶ Resume" : "⏸ Pause";
    }

    if (isPaused) {
      stopCurrentAudio();
    } else {
      const current = getCurrentSlideIndex();
      playSlideAudio(current);
    }
  }

  function stopPresentation() {
    log("Stopping presentation");
    isPlaying = false;
    isPaused = false;
    stopCurrentAudio();
    document.body.classList.remove("presentation-mode");

    const startBtn = document.getElementById("startPresentation");
    const pauseBtn = document.getElementById("pausePresentation");

    if (startBtn) startBtn.textContent = "▶ Start";
    if (pauseBtn) pauseBtn.textContent = "⏸ Pause";
  }

  function toggleMute() {
    isMuted = !isMuted;

    const muteBtn = document.getElementById("toggleMute");
    if (muteBtn) {
      muteBtn.textContent = isMuted ? "🔇 Muted" : "🔊 Sound";
    }

    if (isMuted) {
      stopCurrentAudio();
    } else if (isPlaying && !isPaused) {
      const current = getCurrentSlideIndex();
      playSlideAudio(current);
    }
  }

  function toggleAudioOnNavigation() {
    audioOnNavigation = !audioOnNavigation;

    const navAudioBtn = document.getElementById("toggleNavAudio");
    if (navAudioBtn) {
      navAudioBtn.textContent = audioOnNavigation
        ? "🎵 Nav Audio"
        : "🔇 Nav Silent";
      navAudioBtn.title = audioOnNavigation
        ? "Audio plays on navigation"
        : "Audio only in auto-play mode";
    }

    log(`Audio on navigation: ${audioOnNavigation ? "enabled" : "disabled"}`);
  }

  let lastSlideIndex = 1; // Track the last slide to detect changes

  function handleSlideChange(force = false) {
    const current = getCurrentSlideIndex();

    // Only proceed if slide actually changed (unless forced)
    if (!force && current === lastSlideIndex) return;

    lastSlideIndex = current;
    log(`Slide changed to: ${current}${force ? " (forced)" : ""}`);

    updateSlideCounter(current);
    updateProgressBar(current);

    // Stop any currently playing audio/speech before starting new slide
    stopCurrentAudio();

    // Play audio during auto-play mode OR manual navigation (if enabled)
    if (!isMuted && ((isPlaying && !isPaused) || audioOnNavigation)) {
      setTimeout(() => {
        const forcePlay = !isPlaying; // Force play for manual navigation
        playSlideAudio(current, forcePlay);
      }, 300);
    }
  }

  function handleKeyPress(event) {
    switch (event.key) {
      case " ":
        event.preventDefault();
        if (isPlaying) {
          pausePresentation();
        } else {
          startPresentation();
        }
        break;
      case "Escape":
        event.preventDefault();
        stopPresentation();
        break;
      case "ArrowRight":
      case "ArrowDown":
      case "PageDown":
        // Don't prevent default - let Marp handle navigation
        // Manually trigger slide change check after a short delay
        setTimeout(handleSlideChange, 150);
        break;
      case "ArrowLeft":
      case "ArrowUp":
      case "PageUp":
        // Don't prevent default - let Marp handle navigation
        // Manually trigger slide change check after a short delay
        setTimeout(handleSlideChange, 150);
        break;
      case "m":
      case "M":
        event.preventDefault();
        toggleMute();
        break;
      case "n":
      case "N":
        event.preventDefault();
        toggleAudioOnNavigation();
        break;
    }
  }

  function setupEventListeners() {
    const startBtn = document.getElementById("startPresentation");
    const pauseBtn = document.getElementById("pausePresentation");
    const stopBtn = document.getElementById("stopPresentation");
    const muteBtn = document.getElementById("toggleMute");
    const navAudioBtn = document.getElementById("toggleNavAudio");

    if (startBtn) startBtn.addEventListener("click", startPresentation);
    if (pauseBtn) pauseBtn.addEventListener("click", pausePresentation);
    if (stopBtn) stopBtn.addEventListener("click", stopPresentation);
    if (muteBtn) muteBtn.addEventListener("click", toggleMute);
    if (navAudioBtn)
      navAudioBtn.addEventListener("click", toggleAudioOnNavigation);

    // Listen for various slide change events
    window.addEventListener("hashchange", () => {
      setTimeout(handleSlideChange, 100); // Small delay to let Marp finish rendering
    });
    document.addEventListener("keydown", handleKeyPress);

    // Also listen for click events on the document to catch navigation
    document.addEventListener("click", () => {
      setTimeout(handleSlideChange, 100); // Small delay to let navigation complete
    });

    window.addEventListener("beforeunload", () => {
      stopCurrentAudio();
    });
  }

  function initialize() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initialize);
      return;
    }

    log("Initializing Marptalk automation");

    // Load speaker notes from embedded data for TTS fallback
    if (window.MARPTALK_SPEAKER_NOTES) {
      speakerNotes = window.MARPTALK_SPEAKER_NOTES;
      log(
        `Loaded ${Object.keys(speakerNotes).length} speaker notes for browser TTS fallback`,
      );
    } else {
      log("No speaker notes found, browser TTS fallback will not be available");
    }

    totalSlides = getTotalSlides();
    log(`Total slides detected: ${totalSlides}`);

    setupEventListeners();

    const current = getCurrentSlideIndex();
    updateSlideCounter(current);
    updateProgressBar(current);

    // Initialize navigation audio button display
    const navAudioBtn = document.getElementById("toggleNavAudio");
    if (navAudioBtn) {
      navAudioBtn.textContent = audioOnNavigation
        ? "🎵 Nav Audio"
        : "🔇 Nav Silent";
      navAudioBtn.title = audioOnNavigation
        ? "Audio plays on navigation"
        : "Audio only in auto-play mode";
    }

    log("Marptalk automation ready");
    log(
      "Controls: Space=Start/Pause, Escape=Stop, M=Mute, N=Nav Audio, Arrows=Navigate",
    );
  }

  initialize();
})();
