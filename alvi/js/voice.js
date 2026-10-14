// Voice Description & Check-in Flow Script
// Real microphone recording via MediaRecorder + Web Audio API AnalyserNode
// Live time-domain waveform visualization + post-recording audio playback

document.addEventListener('DOMContentLoaded', () => {

  // ── Section navigation ──────────────────────────────────────────────────────
  const beginCheckinFlowBtn     = document.getElementById('begin-checkin-flow-btn');
  const todayOverviewSection    = document.getElementById('page-today-checkin');
  const voiceDescriptionSection = document.getElementById('page-voice-description');

  if (beginCheckinFlowBtn && todayOverviewSection && voiceDescriptionSection) {
    beginCheckinFlowBtn.addEventListener('click', () => {
      todayOverviewSection.classList.add('hidden');
      voiceDescriptionSection.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // ▶ Canvas is NOW in the rendered DOM — size it and draw the idle state.
      //   This MUST happen here, not at DOMContentLoaded, because the section
      //   is hidden on load (offsetWidth/Height = 0 while hidden).
      resizeCanvas();
      drawIdleBars();
    });
  }

  // ── DOM refs ────────────────────────────────────────────────────────────────
  const toggleRecordBtn   = document.getElementById('toggle-record-btn');
  const recordIcon        = document.getElementById('record-icon');
  const recordBtnText     = document.getElementById('record-btn-text');
  const recordStatusText  = document.getElementById('record-status-text');
  const voiceTimerDisplay = document.getElementById('voice-timer-display');
  const toStoryRecallBtn  = document.getElementById('to-story-recall-btn');
  const resetRecordBtn    = document.getElementById('reset-record-btn');
  const canvas            = document.getElementById('voice-waveform-canvas');
  const ctx               = canvas ? canvas.getContext('2d') : null;

  // ── State ───────────────────────────────────────────────────────────────────
  let isRecording    = false;
  let timerInterval  = null;
  let elapsedSeconds = 0;
  let animFrameId    = null;   // rAF handle — used with cancelAnimationFrame

  // Web Audio objects
  let mediaStream    = null;
  let mediaRecorder  = null;
  let audioContext   = null;
  let analyser       = null;
  let tdArray        = null;   // Uint8Array — time-domain samples (length = fftSize)

  // Playback
  let audioChunks    = [];     // in-memory chunks only — never written to disk/LS
  let playbackURL    = null;   // temporary Blob object URL (revoked on reset)

  const MAX_SECONDS  = 30;

  // ── Canvas sizing ───────────────────────────────────────────────────────────
  // Uses offsetWidth/Height (includes padding, excludes border).
  // Called when the section becomes visible, and on window resize.
  function resizeCanvas() {
    if (!canvas || !canvas.parentElement) return;
    const w = canvas.parentElement.offsetWidth;
    const h = canvas.parentElement.offsetHeight;
    if (w > 0 && h > 0) {
      canvas.width  = w;
      canvas.height = h;
    }
  }

  window.addEventListener('resize', () => {
    resizeCanvas();
    if (!isRecording) drawIdleBars();
  });

  // ── Idle bars (static — drawn once, no rAF loop) ────────────────────────────
  // Shows a row of flat low bars when recording is not active.
  function drawIdleBars() {
    if (!ctx || !canvas || canvas.width === 0 || canvas.height === 0) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerY  = canvas.height / 2;
    const numBars  = 60;
    const barWidth = (canvas.width / numBars) - 2;

    for (let i = 0; i < numBars; i++) {
      const h = 4;
      const x = i * (barWidth + 2);
      const y = centerY - h / 2;

      const grad = ctx.createLinearGradient(0, y, 0, y + h);
      grad.addColorStop(0, '#475569');
      grad.addColorStop(1, '#334155');
      ctx.fillStyle = grad;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, barWidth, h, 3);
      else               ctx.rect(x, y, barWidth, h);
      ctx.fill();
    }
  }

  // ── Live waveform rAF loop ───────────────────────────────────────────────────
  // Reads getByteTimeDomainData() — values 0–255, silent centre = 128.
  // For each of the 60 bars, finds the PEAK deviation in that segment of the
  // time-domain buffer, then applies sqrt-scaling so quiet speech is still
  // visibly amplified while loud speech doesn't clip.
  //
  // The loop is self-terminating: when isRecording becomes false the next tick
  // draws idle bars and returns without scheduling another frame.
  //
  // It is only called AFTER the AnalyserNode is successfully initialised.
  function drawLiveWaveform() {
    // Exit condition — do NOT schedule another frame
    if (!isRecording) {
      drawIdleBars();
      return;
    }

    animFrameId = requestAnimationFrame(drawLiveWaveform);

    if (!ctx || !canvas || !analyser || !tdArray) return;
    if (canvas.width === 0 || canvas.height === 0) return;

    // Pull fresh time-domain data from the analyser
    analyser.getByteTimeDomainData(tdArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerY  = canvas.height / 2;
    const numBars  = 60;
    const barWidth = (canvas.width / numBars) - 2;
    const segLen   = Math.floor(tdArray.length / numBars);

    for (let i = 0; i < numBars; i++) {
      // Find the maximum deviation from silence (128) within this segment
      const segStart = i * segLen;
      const segEnd   = segStart + segLen;
      let maxDev = 0;
      for (let j = segStart; j < segEnd; j++) {
        const dev = Math.abs((tdArray[j] ?? 128) - 128) / 128; // 0–1
        if (dev > maxDev) maxDev = dev;
      }

      // sqrt-scale: pushes quiet sounds up into visibility while keeping
      // loud sounds within the canvas height.
      // Minimum bar height of 3 px ensures a subtle baseline on silence.
      const h = Math.max(3, Math.sqrt(maxDev) * canvas.height * 0.85);
      const x = i * (barWidth + 2);
      const y = centerY - h / 2;

      const grad = ctx.createLinearGradient(0, y, 0, y + h);
      grad.addColorStop(0, '#8B5CF6');   // purple — ALVI brand colour
      grad.addColorStop(1, '#4F46E5');   // indigo
      ctx.fillStyle = grad;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, barWidth, h, 3);
      else               ctx.rect(x, y, barWidth, h);
      ctx.fill();
    }
  }

  // ── Timer ────────────────────────────────────────────────────────────────────
  function startTimer() {
    elapsedSeconds = 0;
    if (voiceTimerDisplay) voiceTimerDisplay.textContent = '0:00 / 0:30';
    timerInterval = setInterval(() => {
      elapsedSeconds++;
      const m = Math.floor(elapsedSeconds / 60);
      const s = (elapsedSeconds % 60).toString().padStart(2, '0');
      if (voiceTimerDisplay) voiceTimerDisplay.textContent = `${m}:${s} / 0:30`;
      if (elapsedSeconds >= MAX_SECONDS) stopRecording();
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // ── Playback area ────────────────────────────────────────────────────────────
  function getOrCreatePlaybackArea() {
    let area = document.getElementById('voice-playback-area');
    if (!area) {
      area = document.createElement('div');
      area.id = 'voice-playback-area';
      if (recordStatusText && recordStatusText.parentNode) {
        recordStatusText.parentNode.insertBefore(area, recordStatusText.nextSibling);
      }
    }
    return area;
  }

  function showPlayback(url) {
    const area = getOrCreatePlaybackArea();
    area.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding-top:10px;">
        <p style="font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;">
          ▶ Listen to your recording
        </p>
        <audio
          id="voice-playback-audio"
          src="${url}"
          controls
          style="width:100%;max-width:340px;height:36px;border-radius:8px;outline:none;accent-color:#6366f1;"
        ></audio>
      </div>`;
  }

  function clearPlayback() {
    const area = document.getElementById('voice-playback-area');
    if (area) area.innerHTML = '';
    if (playbackURL) {
      URL.revokeObjectURL(playbackURL);
      playbackURL = null;
    }
    audioChunks = [];
  }

  // ── Button / status helpers ──────────────────────────────────────────────────
  function setButtonRecording() {
    if (recordIcon)    recordIcon.textContent    = '⏹';
    if (recordBtnText) recordBtnText.textContent = 'Stop Recording';
    if (toggleRecordBtn) {
      toggleRecordBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-500', 'bg-emerald-600', 'hover:bg-emerald-500');
      toggleRecordBtn.classList.add('bg-red-600', 'hover:bg-red-500');
    }
  }

  function setButtonIdle() {
    if (recordIcon)    recordIcon.textContent    = '🎙️';
    if (recordBtnText) recordBtnText.textContent = 'Start Recording';
    if (toggleRecordBtn) {
      toggleRecordBtn.classList.remove('bg-red-600', 'hover:bg-red-500', 'bg-emerald-600', 'hover:bg-emerald-500');
      toggleRecordBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-500');
    }
  }

  function setButtonDone() {
    if (recordIcon)    recordIcon.textContent    = '✓';
    if (recordBtnText) recordBtnText.textContent = 'Recording Complete';
    if (toggleRecordBtn) {
      toggleRecordBtn.classList.remove('bg-red-600', 'hover:bg-red-500', 'bg-indigo-600', 'hover:bg-indigo-500');
      toggleRecordBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-500');
    }
  }

  function setStatus(text, colorClass) {
    if (!recordStatusText) return;
    recordStatusText.textContent = text;
    recordStatusText.className   = `text-xs ${colorClass}`;
  }

  // ── Release all audio resources ──────────────────────────────────────────────
  function releaseMedia() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
    if (audioContext) {
      audioContext.close().catch(() => {});
      audioContext = null;
    }
    analyser = null;
    tdArray  = null;
  }

  // ── Start recording ───────────────────────────────────────────────────────────
  async function startRecording() {
    if (toggleRecordBtn) toggleRecordBtn.disabled = true;
    clearPlayback();
    setStatus('Requesting microphone access…', 'text-slate-400 animate-pulse');

    try {
      // 1. Get mic stream
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      // 2. Build AudioContext → AnalyserNode → connected to mic stream
      audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Browsers suspend AudioContext until a user gesture — resume explicitly.
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const micSource = audioContext.createMediaStreamSource(mediaStream);
      analyser        = audioContext.createAnalyser();

      // fftSize determines time-domain buffer length (must be power of 2).
      // 1024 gives ~23 ms at 44100 Hz — enough resolution for speech.
      analyser.fftSize               = 1024;
      analyser.smoothingTimeConstant = 0.6;   // slight smoothing, stays reactive

      micSource.connect(analyser);
      // Do NOT connect analyser to audioContext.destination — avoids feedback

      // tdArray length MUST equal fftSize for getByteTimeDomainData
      tdArray = new Uint8Array(analyser.fftSize);

      // 3. Set up MediaRecorder — collect chunks for in-memory playback Blob
      audioChunks = [];
      const preferredMime =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
        MediaRecorder.isTypeSupported('audio/webm')             ? 'audio/webm'             :
        '';

      mediaRecorder = new MediaRecorder(
        mediaStream,
        preferredMime ? { mimeType: preferredMime } : {}
      );

      // Accumulate data chunks in memory only — never stored to localStorage
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunks.push(e.data);
      };

      // When recorder stops: build Blob → create object URL → show playback
      mediaRecorder.onstop = () => {
        const finalMime = mediaRecorder.mimeType || 'audio/webm';
        const blob      = new Blob(audioChunks, { type: finalMime });
        playbackURL     = URL.createObjectURL(blob);
        showPlayback(playbackURL);

        // Persist SESSION METADATA only — raw audio is never stored
        const sessionMeta = {
          duration:  elapsedSeconds,
          timestamp: new Date().toISOString(),
          mimeType:  finalMime,
          completed: true
        };
        try {
          localStorage.setItem('alvi_voice_session', JSON.stringify(sessionMeta));
        } catch (_) { /* quota / private mode — fail silently */ }

        setButtonDone();
        setStatus(
          'Recording Captured ✓ Real microphone session recorded.',
          'text-emerald-400 font-bold'
        );
      };

      // timeslice of 250 ms ensures all audio is flushed before onstop fires
      mediaRecorder.start(250);

      // 4. Update state & UI
      isRecording = true;
      if (toggleRecordBtn) toggleRecordBtn.disabled = false;
      if (resetRecordBtn)  resetRecordBtn.classList.remove('hidden');
      setButtonRecording();
      setStatus(
        'Recording in progress… Describe what you see in the scene.',
        'text-indigo-400 font-semibold animate-pulse'
      );
      startTimer();

      // 5. Size canvas (may have changed if window was resized while hidden),
      //    then start the live waveform loop AFTER the AnalyserNode is ready.
      resizeCanvas();
      drawLiveWaveform();

    } catch (err) {
      isRecording = false;
      if (toggleRecordBtn) toggleRecordBtn.disabled = false;
      releaseMedia();

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatus(
          '⚠ Microphone access was denied. Please allow microphone permission in your browser and try again.',
          'text-amber-400 font-semibold'
        );
      } else if (err.name === 'NotFoundError') {
        setStatus(
          '⚠ No microphone found. Please connect a microphone and try again.',
          'text-amber-400 font-semibold'
        );
      } else {
        setStatus(
          `⚠ Could not start recording: ${err.message}`,
          'text-red-400 font-semibold'
        );
      }
    }
  }

  // ── Stop recording ────────────────────────────────────────────────────────────
  function stopRecording() {
    if (!isRecording) return;

    // Flip the flag first — the rAF loop checks this and exits on its next tick
    isRecording = false;
    stopTimer();

    // Explicitly cancel any pending animation frame
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    // Stop mic hardware tracks
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }

    // Stop MediaRecorder — triggers onstop asynchronously to build the Blob
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }

    // Close AudioContext — no longer needed after recording
    if (audioContext) {
      audioContext.close().catch(() => {});
      audioContext = null;
    }
    analyser = null;
    tdArray  = null;

    // Draw the static idle bars immediately (onstop will update button/status)
    drawIdleBars();

    if (resetRecordBtn) resetRecordBtn.classList.remove('hidden');
  }

  // ── Reset / Retry ─────────────────────────────────────────────────────────────
  function resetRecording() {
    if (isRecording) {
      isRecording = false;
      stopTimer();
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      releaseMedia();
    }

    clearPlayback();

    try { localStorage.removeItem('alvi_voice_session'); } catch (_) {}

    elapsedSeconds = 0;
    if (voiceTimerDisplay) voiceTimerDisplay.textContent = '0:00 / 0:30';
    setButtonIdle();
    setStatus('Click to start recording your response aloud.', 'text-slate-400');
    if (resetRecordBtn)  resetRecordBtn.classList.add('hidden');
    if (toggleRecordBtn) toggleRecordBtn.disabled = false;

    drawIdleBars();
  }

  // ── Event listeners ───────────────────────────────────────────────────────────
  if (toggleRecordBtn) {
    toggleRecordBtn.addEventListener('click', () => {
      if (!isRecording) startRecording();
      else              stopRecording();
    });
  }

  if (resetRecordBtn) {
    resetRecordBtn.addEventListener('click', resetRecording);
  }

  if (toStoryRecallBtn) {
    toStoryRecallBtn.addEventListener('click', () => {
      // Release mic if user navigates mid-recording
      if (isRecording) {
        isRecording = false;
        stopTimer();
        if (animFrameId !== null) { cancelAnimationFrame(animFrameId); animFrameId = null; }
        if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
        releaseMedia();
      }
      window.location.href = 'story.html';
    });
  }

});
