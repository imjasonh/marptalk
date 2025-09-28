(() => {
  'use strict';

  let currentAudio = null;
  let isPlaying = false;
  let isPaused = false;
  let isMuted = false;
  let audioOnNavigation = true; // Play audio on manual navigation
  let totalSlides = 0;

  function log(...args) {
    console.log('[MarptalkAutomation]', ...args);
  }

  function getCurrentSlideIndex() {
    const hash = window.location.hash.slice(1);
    const index = parseInt(hash) || 1;
    return index;
  }

  function getTotalSlides() {
    const slides = document.querySelectorAll('section[data-marpit-fragment]');
    return slides.length || document.querySelectorAll('section').length || 1;
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
    const counter = document.getElementById('slideCounter');
    if (counter) {
      counter.textContent = `Slide: ${slideIndex}/${totalSlides}`;
    }
  }

  function updateProgressBar(slideIndex) {
    const progressBar = document.getElementById('slideProgress');
    if (progressBar) {
      const percentage = (slideIndex / totalSlides) * 100;
      progressBar.style.width = `${percentage}%`;
    }
  }

  function showAudioIndicator() {
    const indicator = document.getElementById('audioIndicator');
    if (indicator) {
      indicator.classList.add('playing');
    }
  }

  function hideAudioIndicator() {
    const indicator = document.getElementById('audioIndicator');
    if (indicator) {
      indicator.classList.remove('playing');
    }
  }

  function stopCurrentAudio() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
      hideAudioIndicator();
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
      log(`Audio error for slide ${slideIndex}:`, error);
      hideAudioIndicator();

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
        currentAudio.play().catch(error => {
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
    log('Starting presentation');
    isPlaying = true;
    isPaused = false;
    goToSlide(1);
    document.body.classList.add('presentation-mode');

    const startBtn = document.getElementById('startPresentation');
    if (startBtn) startBtn.textContent = '▶ Started';

    // Force slide change detection to trigger audio
    setTimeout(() => {
      handleSlideChange(true); // Force the slide change handler
    }, 300);
  }

  function pausePresentation() {
    log('Pausing presentation');
    isPaused = !isPaused;

    const pauseBtn = document.getElementById('pausePresentation');
    if (pauseBtn) {
      pauseBtn.textContent = isPaused ? '▶ Resume' : '⏸ Pause';
    }

    if (isPaused) {
      stopCurrentAudio();
    } else {
      const current = getCurrentSlideIndex();
      playSlideAudio(current);
    }
  }

  function stopPresentation() {
    log('Stopping presentation');
    isPlaying = false;
    isPaused = false;
    stopCurrentAudio();
    document.body.classList.remove('presentation-mode');

    const startBtn = document.getElementById('startPresentation');
    const pauseBtn = document.getElementById('pausePresentation');

    if (startBtn) startBtn.textContent = '▶ Start';
    if (pauseBtn) pauseBtn.textContent = '⏸ Pause';
  }

  function toggleMute() {
    isMuted = !isMuted;

    const muteBtn = document.getElementById('toggleMute');
    if (muteBtn) {
      muteBtn.textContent = isMuted ? '🔇 Muted' : '🔊 Sound';
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

    const navAudioBtn = document.getElementById('toggleNavAudio');
    if (navAudioBtn) {
      navAudioBtn.textContent = audioOnNavigation ? '🎵 Nav Audio' : '🔇 Nav Silent';
      navAudioBtn.title = audioOnNavigation ? 'Audio plays on navigation' : 'Audio only in auto-play mode';
    }

    log(`Audio on navigation: ${audioOnNavigation ? 'enabled' : 'disabled'}`);
  }

  let lastSlideIndex = 1; // Track the last slide to detect changes

  function handleSlideChange(force = false) {
    const current = getCurrentSlideIndex();

    // Only proceed if slide actually changed (unless forced)
    if (!force && current === lastSlideIndex) return;

    lastSlideIndex = current;
    log(`Slide changed to: ${current}${force ? ' (forced)' : ''}`);

    updateSlideCounter(current);
    updateProgressBar(current);

    // Play audio during auto-play mode OR manual navigation (if enabled)
    if (!isMuted && ((isPlaying && !isPaused) || audioOnNavigation)) {
      setTimeout(() => {
        const forcePlay = !isPlaying; // Force play for manual navigation
        playSlideAudio(current, forcePlay);
      }, 300);
    }
  }

  function handleKeyPress(event) {
    switch(event.key) {
      case ' ':
        event.preventDefault();
        if (isPlaying) {
          pausePresentation();
        } else {
          startPresentation();
        }
        break;
      case 'Escape':
        event.preventDefault();
        stopPresentation();
        break;
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
        // Don't prevent default - let Marp handle navigation
        // We'll catch the hashchange event instead
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        // Don't prevent default - let Marp handle navigation
        // We'll catch the hashchange event instead
        break;
      case 'm':
      case 'M':
        event.preventDefault();
        toggleMute();
        break;
      case 'n':
      case 'N':
        event.preventDefault();
        toggleAudioOnNavigation();
        break;
    }
  }

  function setupEventListeners() {
    const startBtn = document.getElementById('startPresentation');
    const pauseBtn = document.getElementById('pausePresentation');
    const stopBtn = document.getElementById('stopPresentation');
    const muteBtn = document.getElementById('toggleMute');
    const navAudioBtn = document.getElementById('toggleNavAudio');

    if (startBtn) startBtn.addEventListener('click', startPresentation);
    if (pauseBtn) pauseBtn.addEventListener('click', pausePresentation);
    if (stopBtn) stopBtn.addEventListener('click', stopPresentation);
    if (muteBtn) muteBtn.addEventListener('click', toggleMute);
    if (navAudioBtn) navAudioBtn.addEventListener('click', toggleAudioOnNavigation);

    // Listen for various slide change events
    window.addEventListener('hashchange', handleSlideChange);
    document.addEventListener('keydown', handleKeyPress);

    // Also listen for click events on the document to catch navigation
    document.addEventListener('click', () => {
      setTimeout(handleSlideChange, 100); // Small delay to let navigation complete
    });

    // Periodically check for slide changes (fallback)
    setInterval(() => {
      handleSlideChange();
    }, 500);

    window.addEventListener('beforeunload', () => {
      stopCurrentAudio();
    });
  }

  function initialize() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize);
      return;
    }

    log('Initializing Marptalk automation');

    totalSlides = getTotalSlides();
    log(`Total slides detected: ${totalSlides}`);

    setupEventListeners();

    const current = getCurrentSlideIndex();
    updateSlideCounter(current);
    updateProgressBar(current);

    // Initialize navigation audio button
    toggleAudioOnNavigation(); // Set initial state

    log('Marptalk automation ready');
    log('Controls: Space=Start/Pause, Escape=Stop, M=Mute, N=Nav Audio, Arrows=Navigate');
  }

  initialize();
})();