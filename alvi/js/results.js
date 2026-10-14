// Results Page Interactions Script

document.addEventListener('DOMContentLoaded', () => {
  const whySeeingBtn = document.querySelector('[data-page="ai-insights"]');
  if (whySeeingBtn) {
    whySeeingBtn.addEventListener('click', () => {
      window.location.href = 'insights.html';
    });
  }

  const viewJourneyBtn = document.querySelector('[data-page="cognitive-journey"]');
  if (viewJourneyBtn) {
    viewJourneyBtn.addEventListener('click', () => {
      window.location.href = 'journey.html';
    });
  }
});
