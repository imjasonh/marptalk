(() => {
  'use strict';

  let currentAudio = null;
  let isPlaying = false;
  let isPaused = false;
  let isMuted = false;
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

  function playSlideAudio(slideIndex) {
    if (isPaused || isMuted) return;

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
      if (isPlaying && !isPaused) {
        currentAudio.play().catch(error => {
          log(`Autoplay failed for slide ${slideIndex}:`, error);
          hideAudioIndicator();

          setTimeout(() => {
            goToNextSlide();
          }, 2000);
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

  function handleSlideChange() {
    const current = getCurrentSlideIndex();
    log(`Slide changed to: ${current}`);

    updateSlideCounter(current);
    updateProgressBar(current);

    if (isPlaying && !isPaused && !isMuted) {
      setTimeout(() => {
        playSlideAudio(current);
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
        if (!isPlaying) {
          event.preventDefault();
          goToNextSlide();
        }
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        if (!isPlaying) {
          event.preventDefault();
          goToPrevSlide();
        }
        break;
      case 'm':
      case 'M':
        event.preventDefault();
        toggleMute();
        break;
    }
  }

  function setupEventListeners() {
    const startBtn = document.getElementById('startPresentation');
    const pauseBtn = document.getElementById('pausePresentation');
    const stopBtn = document.getElementById('stopPresentation');
    const muteBtn = document.getElementById('toggleMute');

    if (startBtn) startBtn.addEventListener('click', startPresentation);
    if (pauseBtn) pauseBtn.addEventListener('click', pausePresentation);
    if (stopBtn) stopBtn.addEventListener('click', stopPresentation);
    if (muteBtn) muteBtn.addEventListener('click', toggleMute);

    window.addEventListener('hashchange', handleSlideChange);
    document.addEventListener('keydown', handleKeyPress);

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

    log('Marptalk automation ready');
    log('Controls: Space=Start/Pause, Escape=Stop, M=Mute, Arrows=Navigate (when stopped)');
  }

  initialize();
})();