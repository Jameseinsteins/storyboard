/* ─────────────────────────────────────────────────────────
   animation.js  –  Tab switching | Cursor BG | Scroll reveal
───────────────────────────────────────────────────────── */

// ── 1. TAB SWITCHING ────────────────────────────────────────
function switchTab(tabId) {
  // Hide all content sections
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  // Deactivate all nav buttons
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

  // Show target section & activate button
  const content = document.getElementById('tab-content-' + tabId);
  const btn = document.getElementById('tab-' + tabId);

  if (content) content.classList.add('active');
  if (btn) btn.classList.add('active');

  // Trigger scroll-reveal whenever Life Story tab is opened
  const storyAudio = document.getElementById('story-audio');
  if (tabId === 'lifestory') {
    setTimeout(revealPanels, 80);
    if (storyAudio) storyAudio.play().catch(e => console.log('Autoplay prevented:', e));
  } else {
    if (storyAudio) {
      storyAudio.pause();
      storyAudio.currentTime = 0;
    }
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Wire up nav buttons
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});


// ── 2. CURSOR-REACTIVE BACKGROUND ───────────────────────────
const cursorBg = document.getElementById('cursor-bg');

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let currentX = mouseX;
let currentY = mouseY;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

function animateCursor() {
  // Smooth lerp toward real cursor position
  currentX += (mouseX - currentX) * 0.07;
  currentY += (mouseY - currentY) * 0.07;

  if (cursorBg) {
    cursorBg.style.background = `
      radial-gradient(
        700px circle at ${currentX}px ${currentY}px,
        rgba(59, 130, 246, 0.16) 0%,
        rgba(139, 92, 246, 0.10) 35%,
        rgba(6, 182, 212, 0.05) 60%,
        transparent 70%
      )
    `;
  }
  requestAnimationFrame(animateCursor);
}
animateCursor();


// ── 3. SCROLL-REVEAL FOR MAGAZINE ARTICLES ──────────────────
function revealPanels() {
  const articles = document.querySelectorAll('.mag-article');
  articles.forEach((article, i) => {
    setTimeout(() => {
      article.classList.add('visible');
    }, i * 150);
  });
}

// Trigger on scroll via IntersectionObserver
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.mag-article').forEach(el => observer.observe(el));

// ── 4. FULLSCREEN PANEL MODAL ────────────────────────────────
const modal = document.getElementById('panel-modal');
const modalImage = document.getElementById('modal-image');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const modalKeywords = document.getElementById('modal-keywords');
const btnClose = document.getElementById('modal-close');
const btnPrev = document.getElementById('modal-prev');
const btnNext = document.getElementById('modal-next');

const allPanels = Array.from(document.querySelectorAll('.interactive-panel'));
let currentPanelIndex = 0;

function openModal(index) {
  if (index < 0 || index >= allPanels.length) return;
  currentPanelIndex = index;

  const panel = allPanels[index];

  // Grab data flexibly — each panel has unique element names
  const img = panel.querySelector('img');
  const titleEl = panel.querySelector('[class*="title"], h2, h3');
  const descEl = panel.querySelector('p');
  const kwEl = panel.querySelector('[class*="kw"], .mag-kw');
  const tagEl = panel.querySelector('.mag-tag');

  // Accent colors per panel
  const accents = ['#fbbf24', '#2dd4bf', '#f87171', '#a78bfa', '#fcd34d'];
  const chapterLabels = ['01', '02', '03', '04', '05'];
  const chapterNames = ['Chapter One', 'Chapter Two', 'Chapter Three', 'Chapter Four', 'Chapter Five'];

  modalImage.src = img ? img.src : '';

  // Build enhanced modal text area
  const accent = accents[index] || '#a78bfa';
  const chapterNum = chapterLabels[index] || '01';
  const chapterName = chapterNames[index] || '';

  // Clear modal text and rebuild it with richer structure
  const modalTextEl = document.querySelector('.modal-text');
  modalTextEl.setAttribute('data-chapter', chapterNum);

  // Inject chapter tag above title
  let chapterTagEl = modalTextEl.querySelector('.modal-chapter-tag');
  if (!chapterTagEl) {
    chapterTagEl = document.createElement('div');
    chapterTagEl.className = 'modal-chapter-tag';
    modalTextEl.insertBefore(chapterTagEl, modalTitle);
  }
  chapterTagEl.textContent = chapterName;
  chapterTagEl.style.color = accent;

  // Inject accent line below chapter tag
  let accentLine = modalTextEl.querySelector('.modal-accent-line');
  if (!accentLine) {
    accentLine = document.createElement('div');
    accentLine.className = 'modal-accent-line';
    modalTextEl.insertBefore(accentLine, modalTitle);
  }
  accentLine.style.background = `linear-gradient(90deg, ${accent}, transparent)`;

  // Title
  const rawTitle = titleEl ? titleEl.innerText.replace(/\n/g, ' ') : '';
  modalTitle.innerHTML = rawTitle;
  modalTitle.style.background = `linear-gradient(145deg, #fff 30%, ${accent} 100%)`;
  modalTitle.style.webkitBackgroundClip = 'text';
  modalTitle.style.webkitTextFillColor = 'transparent';
  modalTitle.style.backgroundClip = 'text';

  // Desc & keywords
  modalDesc.innerText = descEl ? descEl.innerText : '';
  modalKeywords.innerText = kwEl ? kwEl.innerText : '';
  modalKeywords.style.color = accent;
  modalKeywords.style.borderColor = accent;

  // Highlight selected panel
  allPanels.forEach(p => p.classList.remove('panel-selected'));
  panel.classList.add('panel-selected');

  modal.classList.add('active');
  document.body.classList.add('modal-open');

  // Force re-animation of text elements by toggling them
  [chapterTagEl, accentLine, modalTitle, modalDesc, modalKeywords].forEach(el => {
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = '';
  });
}

function closeModal() {
  modal.classList.remove('active');
  document.body.classList.remove('modal-open');
  allPanels.forEach(p => p.classList.remove('panel-selected'));
}

allPanels.forEach((panel, index) => {
  panel.addEventListener('click', () => {
    openModal(index);
  });
});

if (btnClose) btnClose.addEventListener('click', closeModal);

if (btnPrev) {
  btnPrev.addEventListener('click', () => {
    if (currentPanelIndex > 0) {
      openModal(currentPanelIndex - 1);
    } else {
      openModal(allPanels.length - 1); // Loop to end
    }
  });
}

if (btnNext) {
  btnNext.addEventListener('click', () => {
    if (currentPanelIndex < allPanels.length - 1) {
      openModal(currentPanelIndex + 1);
    } else {
      openModal(0); // Loop to start
    }
  });
}

// Close on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
    closeModal();
  }
  if (e.key === 'ArrowRight' && modal && modal.classList.contains('active')) {
    if (currentPanelIndex < allPanels.length - 1) openModal(currentPanelIndex + 1);
    else openModal(0);
  }
  if (e.key === 'ArrowLeft' && modal && modal.classList.contains('active')) {
    if (currentPanelIndex > 0) openModal(currentPanelIndex - 1);
    else openModal(allPanels.length - 1);
  }
});


// ── 4. INITIALISE on load ────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Default to Home tab active
  switchTab('home');
});
