// MindPlay Cognitive Challenges Script

document.addEventListener('DOMContentLoaded', () => {
  const mindplayCh1 = document.getElementById('mindplay-ch1');
  const mindplayCh2 = document.getElementById('mindplay-ch2');
  const mindplayCh3 = document.getElementById('mindplay-ch3');
  const mindplaySummary = document.getElementById('mindplay-summary');

  const ch1NextBtn = document.getElementById('ch1-next-btn');
  const ch2BackBtn = document.getElementById('ch2-back-btn');
  const ch2NextBtn = document.getElementById('ch2-next-btn');
  const ch3BackBtn = document.getElementById('ch3-back-btn');
  const completeMindplayBtn = document.getElementById('complete-mindplay-btn');
  const analyzeCheckinBtn = document.getElementById('analyze-checkin-btn');

  // Challenge 1: Multi-select
  const selectCards = document.querySelectorAll('.mindplay-select-card');
  let selectedCh1Items = new Set();

  selectCards.forEach(card => {
    card.addEventListener('click', () => {
      const itemKey = card.getAttribute('data-item');
      if (selectedCh1Items.has(itemKey)) {
        selectedCh1Items.delete(itemKey);
        card.classList.remove('selected');
      } else {
        selectedCh1Items.add(itemKey);
        card.classList.add('selected');
      }
    });
  });

  if (ch1NextBtn) {
    ch1NextBtn.addEventListener('click', () => {
      if (mindplayCh1) mindplayCh1.classList.add('hidden');
      if (mindplayCh2) mindplayCh2.classList.remove('hidden');
      renderSequenceItems();
    });
  }

  // Challenge 2: Interactive Sequence Reordering
  let sequenceEvents = [
    { id: 1, text: 'Aarav left home', correctOrder: 1 },
    { id: 2, text: 'Aarav went to the market', correctOrder: 2 },
    { id: 3, text: 'Aarav bought apples', correctOrder: 3 },
    { id: 4, text: 'Aarav met Meera', correctOrder: 4 },
    { id: 5, text: 'Aarav returned home', correctOrder: 5 }
  ];

  let currentSequence = [
    sequenceEvents[0],
    sequenceEvents[2],
    sequenceEvents[1],
    sequenceEvents[4],
    sequenceEvents[3]
  ];

  function renderSequenceItems() {
    const container = document.getElementById('sequence-items-container');
    if (!container) return;
    container.innerHTML = '';

    currentSequence.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = 'seq-item p-4 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-between shadow-sm';
      el.innerHTML = `
        <div class="flex items-center space-x-3">
          <span class="w-7 h-7 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs">
            ${index + 1}
          </span>
          <span class="text-sm font-semibold text-slate-800">${item.text}</span>
        </div>
        <div class="flex items-center space-x-1">
          <button class="btn-move-up p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 ${index === 0 ? 'opacity-40 cursor-not-allowed' : ''}" ${index === 0 ? 'disabled' : ''}>
            ▲
          </button>
          <button class="btn-move-down p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 ${index === currentSequence.length - 1 ? 'opacity-40 cursor-not-allowed' : ''}" ${index === currentSequence.length - 1 ? 'disabled' : ''}>
            ▼
          </button>
        </div>
      `;

      const upBtn = el.querySelector('.btn-move-up');
      if (upBtn && index > 0) {
        upBtn.addEventListener('click', () => {
          const temp = currentSequence[index];
          currentSequence[index] = currentSequence[index - 1];
          currentSequence[index - 1] = temp;
          renderSequenceItems();
        });
      }

      const downBtn = el.querySelector('.btn-move-down');
      if (downBtn && index < currentSequence.length - 1) {
        downBtn.addEventListener('click', () => {
          const temp = currentSequence[index];
          currentSequence[index] = currentSequence[index + 1];
          currentSequence[index + 1] = temp;
          renderSequenceItems();
        });
      }

      container.appendChild(el);
    });
  }

  if (ch2BackBtn) {
    ch2BackBtn.addEventListener('click', () => {
      if (mindplayCh2) mindplayCh2.classList.add('hidden');
      if (mindplayCh1) mindplayCh1.classList.remove('hidden');
    });
  }

  if (ch2NextBtn) {
    ch2NextBtn.addEventListener('click', () => {
      if (mindplayCh2) mindplayCh2.classList.add('hidden');
      if (mindplayCh3) mindplayCh3.classList.remove('hidden');
      startFindTimer();
    });
  }

  // Challenge 3: Quick Find Timer
  let findTimerInterval = null;
  let findMilliseconds = 1200;

  function startFindTimer() {
    findMilliseconds = 1200;
    const findTimerDisplay = document.getElementById('find-timer');
    clearInterval(findTimerInterval);

    findTimerInterval = setInterval(() => {
      findMilliseconds += 100;
      const secs = (findMilliseconds / 1000).toFixed(1);
      if (findTimerDisplay) findTimerDisplay.textContent = `00:0${secs}s`;
    }, 100);
  }

  const findCards = document.querySelectorAll('.find-card');
  findCards.forEach(card => {
    card.addEventListener('click', () => {
      clearInterval(findTimerInterval);
      const item = card.getAttribute('data-find-item');

      findCards.forEach(c => c.classList.remove('selected-correct', 'selected-incorrect'));

      if (item === 'umbrella') {
        card.classList.add('selected-correct');
      } else {
        card.classList.add('selected-incorrect');
      }
    });
  });

  if (ch3BackBtn) {
    ch3BackBtn.addEventListener('click', () => {
      if (mindplayCh3) mindplayCh3.classList.add('hidden');
      if (mindplayCh2) mindplayCh2.classList.remove('hidden');
    });
  }

  if (completeMindplayBtn) {
    completeMindplayBtn.addEventListener('click', () => {
      if (mindplayCh3) mindplayCh3.classList.add('hidden');
      if (mindplaySummary) mindplaySummary.classList.remove('hidden');
    });
  }

  if (analyzeCheckinBtn) {
    analyzeCheckinBtn.addEventListener('click', () => {
      window.location.href = 'analysis.html';
    });
  }
});
