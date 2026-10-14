// Story Recall Script

document.addEventListener('DOMContentLoaded', () => {
  const playStoryAudioBtn = document.getElementById('play-story-audio-btn');
  const audioPlayIcon = document.getElementById('audio-play-icon');
  const audioPlayText = document.getElementById('audio-play-text');
  const recordStoryBtn = document.getElementById('record-story-btn');
  const storyRecordStatus = document.getElementById('story-record-status');
  const storyTimer = document.getElementById('story-timer');
  const toMindplayBtn = document.getElementById('to-mindplay-btn');

  let isPlayingAudio = false;
  let isRecordingStory = false;
  let storyTimerInterval = null;
  let storyElapsed = 0;

  const storyCanvas = document.getElementById('story-waveform-canvas');
  let storyCtx = storyCanvas ? storyCanvas.getContext('2d') : null;

  function drawStoryWave(time) {
    if (!storyCtx || !storyCanvas) return;
    storyCanvas.width = storyCanvas.parentElement.clientWidth;
    storyCanvas.height = storyCanvas.parentElement.clientHeight;

    storyCtx.clearRect(0, 0, storyCanvas.width, storyCanvas.height);
    const centerY = storyCanvas.height / 2;
    const bars = 45;
    const barW = (storyCanvas.width / bars) - 2;

    for (let i = 0; i < bars; i++) {
      let h = 3;
      if (isPlayingAudio || isRecordingStory) {
        h = Math.abs(Math.sin((i * 0.3) + (time * 0.007)) * (storyCanvas.height * 0.7)) + 4;
      }
      const x = i * (barW + 2);
      const y = centerY - (h / 2);

      storyCtx.fillStyle = isPlayingAudio ? '#A855F7' : (isRecordingStory ? '#EC4899' : '#334155');
      storyCtx.beginPath();
      if (storyCtx.roundRect) {
        storyCtx.roundRect(x, y, barW, h, 2);
      } else {
        storyCtx.rect(x, y, barW, h);
      }
      storyCtx.fill();
    }

    requestAnimationFrame(drawStoryWave);
  }

  if (storyCanvas) {
    requestAnimationFrame(drawStoryWave);
  }

  if (playStoryAudioBtn) {
    playStoryAudioBtn.addEventListener('click', () => {
      if (!isPlayingAudio) {
        isPlayingAudio = true;
        if (audioPlayIcon) audioPlayIcon.textContent = '⏸';
        if (audioPlayText) audioPlayText.textContent = 'Playing Story...';

        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance("One rainy morning, Aarav left his home carrying a blue umbrella. He walked to the local market and bought three red apples. On his way back, he met his friend Meera and gave her one apple before returning home.");
          utterance.rate = 0.9;
          utterance.onend = () => {
            isPlayingAudio = false;
            if (audioPlayIcon) audioPlayIcon.textContent = '▶';
            if (audioPlayText) audioPlayText.textContent = 'Listen to Story';
          };
          window.speechSynthesis.speak(utterance);
        } else {
          setTimeout(() => {
            isPlayingAudio = false;
            if (audioPlayIcon) audioPlayIcon.textContent = '▶';
            if (audioPlayText) audioPlayText.textContent = 'Listen to Story';
          }, 8000);
        }
      } else {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        isPlayingAudio = false;
        if (audioPlayIcon) audioPlayIcon.textContent = '▶';
        if (audioPlayText) audioPlayText.textContent = 'Listen to Story';
      }
    });
  }

  if (recordStoryBtn) {
    recordStoryBtn.addEventListener('click', () => {
      if (!isRecordingStory) {
        isRecordingStory = true;
        storyElapsed = 0;
        recordStoryBtn.textContent = '⏹ Stop Retell';
        if (storyRecordStatus) {
          storyRecordStatus.textContent = 'Recording retell... Speaking key story elements.';
          storyRecordStatus.className = 'text-xs text-purple-400 font-semibold animate-pulse';
        }

        storyTimerInterval = setInterval(() => {
          storyElapsed++;
          const mins = Math.floor(storyElapsed / 60);
          const secs = (storyElapsed % 60).toString().padStart(2, '0');
          if (storyTimer) storyTimer.textContent = `${mins}:${secs} / 0:45`;

          if (storyElapsed >= 45) {
            stopStoryRecord();
          }
        }, 1000);
      } else {
        stopStoryRecord();
      }
    });
  }

  function stopStoryRecord() {
    isRecordingStory = false;
    clearInterval(storyTimerInterval);
    if (recordStoryBtn) recordStoryBtn.textContent = '✓ Retell Captured';
    if (storyRecordStatus) {
      storyRecordStatus.textContent = 'Retell recorded ✓ Semantic score: 85% match';
      storyRecordStatus.className = 'text-xs text-emerald-400 font-bold';
    }
  }

  if (toMindplayBtn) {
    toMindplayBtn.addEventListener('click', () => {
      window.location.href = 'mindplay.html';
    });
  }
});
