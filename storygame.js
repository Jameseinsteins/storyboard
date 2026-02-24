/* ═══════════════════════════════════════════════════════════════
   storygame.js — Sequential Story Reader with AI Voice Narration
   • Chapters unlock only after the previous one is fully read
   • Web Speech API reads chapter content aloud
   • Visual reading progress bar tracks scroll/time
═══════════════════════════════════════════════════════════════ */

(function () {

  // ── Chapter Data ────────────────────────────────────────────────
  const CHAPTERS = [
    {
      index: 0,
      id: 'ch-early-life',
      accent: '#fbbf24',
      title: 'Early Life',
      subtitle: 'Chapter One — Roots & Beginnings',
      image: 'gooding.jpeg',
      tag: 'Chapter One',
      keywords: 'roots · family · simplicity',
      readTime: 18,
      voiceText: `Chapter One. Early Life. I am James Albertescuro, and I grew up living a simple life. We didn't have much, but we had enough — and most of that was because of my mother. My father left us for another woman. That absence shaped me in ways I'm still discovering. But my mother never let us feel abandoned. She worked with everything she had, tired and strong at the same time, giving us what we needed without ever complaining. I grew up watching her do the impossible. I grew up knowing that love, real love, shows up every single day — not just when it's easy. Those early years were simple. And in that simplicity, I found something a lot of people search their whole lives for: a reason to keep going.`,
    },
    {
      index: 1,
      id: 'ch-growing-up',
      accent: '#2dd4bf',
      title: 'Growing Up',
      subtitle: 'Chapter Two — Passion & Discovery',
      image: 'earlychild.jpeg',
      tag: 'Chapter Two',
      keywords: 'music · basketball · curiosity',
      readTime: 20,
      voiceText: `Chapter Two. Growing Up. As I got older, I started finding the things that made me feel alive. Music was one of them. I picked up instruments and found that playing felt like speaking a language I didn't know I already knew. Singing gave me an outlet when words alone weren't enough. Basketball gave me community — the court, the team, the rhythm of the game. Then there was math, which I genuinely loved. Numbers made sense in a world that often didn't. Cooking became another way I explored — creating something from nothing, experimenting, tasting. And underneath all of it was a constant pull toward the unknown, toward things I hadn't tried yet. The only thing that ever slowed me down was fear — the fear of making mistakes. I was curious, but careful. Hungry, but hesitant. Growing up was about learning to hold both of those things at once.`,
    },
    {
      index: 2,
      id: 'ch-turning-point',
      accent: '#f87171',
      title: 'The Turning Point',
      subtitle: 'Chapter Three — Decision & Direction',
      image: 'schooldays.jpeg',
      tag: 'Chapter Three',
      keywords: 'purpose · coding · choice',
      readTime: 22,
      voiceText: `Chapter Three. The Turning Point. There came a moment when I had to ask myself — what am I actually going to do? Not someday. Now. I discovered coding. And something clicked. Building webpages felt like all my interests colliding at once: math, creativity, problem-solving, making something real from nothing. I realized I could turn this into more than a hobby. I could turn it into a way to take care of my family. My mother had been carrying us for years. It was time I started carrying my share. That decision — to take coding seriously, to learn it properly, to use it as a tool for something bigger than myself — that was my turning point. Not a dramatic moment. Just a quiet one. A moment where I decided to stop letting fear make my choices for me.`,
    },
    {
      index: 3,
      id: 'ch-present-day',
      accent: '#a78bfa',
      title: 'Present Day',
      subtitle: 'Chapter Four — Hustle & Heart',
      image: 'nowme.jpeg',
      tag: 'Chapter Four',
      keywords: 'freelance · family · building',
      readTime: 20,
      voiceText: `Chapter Four. Present Day. Right now, I am building. This year, my goal is to start freelancing — making webpages for clients, earning real income, contributing to my family. Every day I'm learning, practicing, pushing past the fear of imperfection that used to hold me back. Some days I still feel afraid to make mistakes. But I'm starting to understand that mistakes aren't the end of something — they're the middle. My mother is still my why. Basketball still clears my head. Music still feeds my soul. And coding — coding is starting to look like my path forward. I'm not where I want to be yet. But I'm no longer standing still. That is everything.`,
    },
    {
      index: 4,
      id: 'ch-looking-ahead',
      accent: '#fcd34d',
      title: 'Looking Ahead',
      subtitle: 'Chapter Five — Legacy & Love',
      image: 'lala.jpeg',
      tag: 'Chapter Five',
      keywords: 'legacy · hope · mother',
      readTime: 20,
      voiceText: `Chapter Five. Looking Ahead. The future I see for myself is simple, the way all truly meaningful things are simple. I want to provide for my family. I want my mother to rest — really rest — knowing that her sacrifice was not wasted. I want to build things with my hands and my mind that make people's lives a little easier or a little more beautiful. I want to look back someday and say that I was afraid, and I went anyway. I want to stop letting the fear of mistakes be bigger than my love for the unknown. The story isn't over. In fact, I think it's barely started. And I'm holding the pen.`,
    },
  ];

  let unlockedUpTo = 0;       // 0 = only chapter 0 accessible
  let currentChapter = null;  // currently open chapter index
  let readProgress = {};      // { index: 0..100 }
  let readComplete = {};      // { index: bool }
  let readTimers = {};        // active interval refs
  let speechSynth = window.speechSynthesis;
  let currentUtterance = null;
  let voiceEnabled = true;

  CHAPTERS.forEach(c => {
    readProgress[c.index] = 0;
    readComplete[c.index] = false;
  });

  // ── Build the Story Game UI ─────────────────────────────────────
  function buildStoryGame() {
    const lifeStorySection = document.getElementById('tab-content-lifestory');
    if (!lifeStorySection) return;

    lifeStorySection.innerHTML = `
      <div class="sg-wrapper">

        <!-- Header Bar -->
        <div class="sg-header">
          <div class="sg-header-left">
            <span class="sg-label">📖 My Autobiography</span>
            <span class="sg-vol">Vol. I — Life Edition</span>
          </div>
          <div class="sg-header-right">
            <button class="sg-voice-toggle" id="sg-voice-toggle" title="Toggle voice narration">
              🔊 <span id="sg-voice-label">Voice On</span>
            </button>
            <div class="sg-progress-overall">
              <div class="sg-progress-overall-fill" id="sg-overall-fill" style="width:0%"></div>
            </div>
            <span class="sg-overall-text" id="sg-overall-text">0 / 5 Read</span>
          </div>
        </div>

        <!-- Chapter Timeline (left sidebar) -->
        <div class="sg-layout">
          <aside class="sg-timeline">
            ${CHAPTERS.map((ch, i) => `
              <div class="sg-timeline-item ${i === 0 ? 'unlocked' : 'locked'}" 
                   id="sg-tl-${i}" 
                   data-chapter="${i}"
                   onclick="sgOpenChapter(${i})">
                <div class="sg-tl-dot" style="--accent:${ch.accent}">
                  <span class="sg-tl-num">${String(i+1).padStart(2,'0')}</span>
                  <div class="sg-tl-ring"></div>
                </div>
                <div class="sg-tl-info">
                  <div class="sg-tl-title">${ch.title}</div>
                  <div class="sg-tl-status" id="sg-tl-status-${i}">
                    ${i === 0 ? '▶ Click to begin' : '🔒 Locked'}
                  </div>
                  <div class="sg-tl-bar">
                    <div class="sg-tl-bar-fill" id="sg-tl-bar-${i}" style="width:0%;background:${ch.accent}"></div>
                  </div>
                </div>
              </div>
            `).join('')}
          </aside>

          <!-- Chapter Reader Panel -->
          <main class="sg-reader" id="sg-reader">
            <div class="sg-reader-empty" id="sg-reader-empty">
              <div class="sg-empty-icon">📚</div>
              <h2>Your Story Awaits</h2>
              <p>Select Chapter One from the left to begin your journey.<br>Each chapter unlocks after you've fully read the one before it.</p>
              <button class="sg-start-btn" onclick="sgOpenChapter(0)">Begin Chapter One ↗</button>
            </div>

            <div class="sg-chapter-view" id="sg-chapter-view" style="display:none">
              <!-- Chapter content injected here -->
            </div>
          </main>
        </div>

        <!-- Completion Celebration -->
        <div class="sg-celebration" id="sg-celebration" style="display:none">
          <div class="sg-celebration-inner">
            <div class="sg-celeb-stars">⭐⭐⭐⭐⭐</div>
            <h2>Story Complete!</h2>
            <p>You've journeyed through every chapter of this life story.<br>Thank you for reading — every word, every moment.</p>
            <button class="sg-restart-btn" onclick="sgRestartStory()">↺ Read Again</button>
          </div>
        </div>
      </div>
    `;

    // Wire voice toggle
    document.getElementById('sg-voice-toggle').addEventListener('click', toggleVoice);
  }

  // ── Open a Chapter ─────────────────────────────────────────────
  window.sgOpenChapter = function (index) {
    if (index > unlockedUpTo) {
      showLockedMessage(index);
      return;
    }
    currentChapter = index;
    const ch = CHAPTERS[index];

    // Highlight timeline item
    document.querySelectorAll('.sg-timeline-item').forEach(el => el.classList.remove('active'));
    const tlItem = document.getElementById(`sg-tl-${index}`);
    if (tlItem) tlItem.classList.add('active');

    // Build chapter view
    const view = document.getElementById('sg-chapter-view');
    const empty = document.getElementById('sg-reader-empty');
    empty.style.display = 'none';
    view.style.display = 'flex';

    const alreadyRead = readComplete[index];
    const progress = readProgress[index];

    view.innerHTML = `
      <div class="sg-ch-hero" style="--accent:${ch.accent}">
        <div class="sg-ch-img-wrap">
          <img src="${ch.image}" alt="${ch.title}" class="sg-ch-img">
          <div class="sg-ch-img-overlay" style="background:linear-gradient(180deg,transparent 40%,rgba(5,7,20,0.95) 100%)"></div>
        </div>
        <div class="sg-ch-hero-text">
          <span class="sg-ch-tag" style="color:${ch.accent};border-color:${ch.accent}">${ch.tag}</span>
          <h1 class="sg-ch-title" style="--accent:${ch.accent}">${ch.title}</h1>
          <p class="sg-ch-subtitle">${ch.subtitle}</p>
        </div>
      </div>

      <div class="sg-ch-body">
        <!-- Voice controls -->
        <div class="sg-voice-bar" id="sg-voice-bar">
          <button class="sg-voice-btn" id="sg-play-btn" onclick="sgToggleVoice()" style="--accent:${ch.accent}">
            <span id="sg-play-icon">▶</span> <span id="sg-play-text">Listen to Chapter</span>
          </button>
          <div class="sg-voice-wave" id="sg-voice-wave">
            ${Array(12).fill(0).map((_,i)=>`<div class="sg-wave-bar" style="animation-delay:${i*0.08}s"></div>`).join('')}
          </div>
        </div>

        <!-- Reading progress bar -->
        <div class="sg-read-progress-wrap">
          <div class="sg-read-progress-bar">
            <div class="sg-read-progress-fill" id="sg-read-fill" 
                 style="width:${progress}%;background:${ch.accent};transition:width 0.5s ease"></div>
          </div>
          <span class="sg-read-pct" id="sg-read-pct">${progress}%</span>
        </div>
        <p class="sg-read-hint" id="sg-read-hint">
          ${alreadyRead ? '✅ Chapter fully read!' : '📖 Read the content below (or listen) to unlock the next chapter'}
        </p>

        <!-- Chapter Content -->
        <div class="sg-content-scroll" id="sg-content-scroll" onscroll="sgHandleScroll()">
          <div class="sg-content-text" id="sg-content-text">
            ${buildChapterContent(ch)}
          </div>
        </div>

        <!-- Nav buttons -->
        <div class="sg-ch-nav">
          ${index > 0 ? `<button class="sg-nav-btn sg-nav-prev" onclick="sgOpenChapter(${index-1})">❮ Previous</button>` : '<div></div>'}
          <div class="sg-nav-info">
            <span class="sg-kw" style="color:${ch.accent}">${ch.keywords}</span>
          </div>
          <button class="sg-nav-btn sg-nav-next ${alreadyRead ? '' : 'locked'}" 
                  id="sg-next-btn"
                  onclick="${alreadyRead ? `sgOpenChapter(${index+1})` : 'sgShowReadMore()'}">
            ${alreadyRead && index < CHAPTERS.length - 1 ? 'Next Chapter ❯' : alreadyRead && index === CHAPTERS.length - 1 ? '🎉 Finish' : '🔒 Read to Unlock'}
          </button>
        </div>
      </div>
    `;

    // Auto-scroll content reveal
    if (alreadyRead) {
      document.getElementById('sg-read-fill').style.width = '100%';
      document.getElementById('sg-read-pct').textContent = '100%';
    } else {
      startReadingTimer(index);
    }

    // Auto-play voice if enabled
    if (voiceEnabled && !alreadyRead) {
      setTimeout(() => sgPlayVoice(index), 600);
    }

    // Scroll reader to top
    const reader = document.getElementById('sg-reader');
    if (reader) reader.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Build rich chapter content ─────────────────────────────────
  function buildChapterContent(ch) {
    const paragraphs = ch.voiceText
      .replace(`Chapter ${toWords(ch.index+1)}. ${ch.title}. `, '')
      .split('. ')
      .filter(s => s.trim().length > 10);

    // Group into 2-3 sentence paragraphs
    const paras = [];
    for (let i = 0; i < paragraphs.length; i += 2) {
      const combined = paragraphs.slice(i, i+2).join('. ').trim();
      if (combined) paras.push(combined + (combined.endsWith('.') ? '' : '.'));
    }

    return `
      <div class="sg-content-intro">
        <div class="sg-content-ornament" style="color:${ch.accent}">◆</div>
      </div>
      ${paras.map((p, i) => `
        <p class="sg-para sg-para-${i % 3}" style="animation-delay:${i * 0.1}s">${p}</p>
      `).join('')}
      <div class="sg-content-end">
        <div class="sg-content-ornament" style="color:${ch.accent}">◆ ◆ ◆</div>
      </div>
    `;
  }

  function toWords(n) {
    return ['One','Two','Three','Four','Five'][n-1] || n;
  }

  // ── Reading Timer (counts up based on time on page) ───────────
  function startReadingTimer(index) {
    if (readComplete[index]) return;
    clearInterval(readTimers[index]);

    const ch = CHAPTERS[index];
    const totalMs = ch.readTime * 1000;
    const startPct = readProgress[index];
    const startTime = Date.now() - (startPct / 100 * totalMs);

    readTimers[index] = setInterval(() => {
      if (currentChapter !== index) {
        clearInterval(readTimers[index]);
        return;
      }
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / totalMs) * 100));
      readProgress[index] = pct;

      // Update UI
      const fill = document.getElementById('sg-read-fill');
      const pctEl = document.getElementById('sg-read-pct');
      const tlFill = document.getElementById(`sg-tl-bar-${index}`);
      if (fill) fill.style.width = pct + '%';
      if (pctEl) pctEl.textContent = pct + '%';
      if (tlFill) tlFill.style.width = pct + '%';

      if (pct >= 100) {
        clearInterval(readTimers[index]);
        markChapterComplete(index);
      }
    }, 300);
  }

  // ── Mark Chapter Complete ──────────────────────────────────────
  function markChapterComplete(index) {
    if (readComplete[index]) return;
    readComplete[index] = true;
    readProgress[index] = 100;

    const ch = CHAPTERS[index];

    // Update hint & next button
    const hint = document.getElementById('sg-read-hint');
    if (hint) {
      hint.innerHTML = '✅ Chapter fully read! You may proceed to the next chapter.';
      hint.style.color = ch.accent;
      hint.style.animation = 'sg-pop 0.4s ease';
    }

    const nextBtn = document.getElementById('sg-next-btn');
    if (nextBtn) {
      nextBtn.classList.remove('locked');
      const isLast = index === CHAPTERS.length - 1;
      nextBtn.textContent = isLast ? '🎉 Finish Story' : 'Next Chapter ❯';
      nextBtn.onclick = isLast ? sgFinishStory : () => sgOpenChapter(index + 1);
      nextBtn.style.animation = 'sg-pop 0.5s ease';
    }

    // Unlock next chapter
    if (index + 1 < CHAPTERS.length && index + 1 > unlockedUpTo) {
      unlockedUpTo = index + 1;
      unlockTimelineItem(index + 1);
    }

    // Update overall progress
    updateOverallProgress();

    // Timeline status
    const status = document.getElementById(`sg-tl-status-${index}`);
    if (status) status.textContent = '✅ Complete';

    const tlItem = document.getElementById(`sg-tl-${index}`);
    if (tlItem) tlItem.classList.add('completed');

    // Celebration confetti effect
    if (ch.index < CHAPTERS.length - 1) {
      spawnConfetti(ch.accent);
    }
  }

  // ── Unlock Timeline Item ───────────────────────────────────────
  function unlockTimelineItem(index) {
    const tlItem = document.getElementById(`sg-tl-${index}`);
    const status = document.getElementById(`sg-tl-status-${index}`);
    if (tlItem) {
      tlItem.classList.remove('locked');
      tlItem.classList.add('unlocked');
    }
    if (status) status.textContent = '▶ Click to read';
  }

  // ── Voice Narration ────────────────────────────────────────────
  function sgPlayVoice(index) {
    if (!voiceEnabled || !speechSynth) return;
    stopVoice();

    const ch = CHAPTERS[index];
    currentUtterance = new SpeechSynthesisUtterance(ch.voiceText);
    currentUtterance.rate = 0.88;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;

    // Pick a nice voice if available
    const voices = speechSynth.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Daniel') || v.name.includes('Samantha') ||
      v.name.includes('Google') || v.lang === 'en-US'
    );
    if (preferred) currentUtterance.voice = preferred;

    currentUtterance.onstart = () => {
      const icon = document.getElementById('sg-play-icon');
      const text = document.getElementById('sg-play-text');
      const wave = document.getElementById('sg-voice-wave');
      if (icon) icon.textContent = '⏸';
      if (text) text.textContent = 'Narrating...';
      if (wave) wave.classList.add('active');
    };
    currentUtterance.onend = () => {
      const icon = document.getElementById('sg-play-icon');
      const text = document.getElementById('sg-play-text');
      const wave = document.getElementById('sg-voice-wave');
      if (icon) icon.textContent = '▶';
      if (text) text.textContent = 'Listen Again';
      if (wave) wave.classList.remove('active');
      currentUtterance = null;
    };

    speechSynth.speak(currentUtterance);
  }

  function stopVoice() {
    if (speechSynth.speaking) speechSynth.cancel();
    currentUtterance = null;
    const icon = document.getElementById('sg-play-icon');
    const text = document.getElementById('sg-play-text');
    const wave = document.getElementById('sg-voice-wave');
    if (icon) icon.textContent = '▶';
    if (text) text.textContent = 'Listen to Chapter';
    if (wave) wave.classList.remove('active');
  }

  window.sgToggleVoice = function () {
    if (speechSynth.speaking) {
      stopVoice();
    } else if (currentChapter !== null) {
      sgPlayVoice(currentChapter);
    }
  };

  function toggleVoice() {
    voiceEnabled = !voiceEnabled;
    const label = document.getElementById('sg-voice-label');
    const btn = document.getElementById('sg-voice-toggle');
    if (!voiceEnabled) {
      stopVoice();
      if (label) label.textContent = 'Voice Off';
      if (btn) btn.style.opacity = '0.5';
    } else {
      if (label) label.textContent = 'Voice On';
      if (btn) btn.style.opacity = '1';
      if (currentChapter !== null) sgPlayVoice(currentChapter);
    }
  }

  // ── Scroll handler to accelerate reading progress on scroll ───
  window.sgHandleScroll = function () {
    const scroll = document.getElementById('sg-content-scroll');
    if (!scroll || currentChapter === null) return;
    const idx = currentChapter;
    if (readComplete[idx]) return;

    const ratio = scroll.scrollTop / Math.max(1, scroll.scrollHeight - scroll.clientHeight);
    const scrollPct = Math.round(ratio * 40); // scroll gives up to 40%
    if (scrollPct > readProgress[idx]) {
      readProgress[idx] = Math.min(readProgress[idx] + scrollPct * 0.5, readProgress[idx] + 5);
    }
  };

  // ── Overall Progress ───────────────────────────────────────────
  function updateOverallProgress() {
    const completed = Object.values(readComplete).filter(Boolean).length;
    const fill = document.getElementById('sg-overall-fill');
    const text = document.getElementById('sg-overall-text');
    if (fill) fill.style.width = (completed / CHAPTERS.length * 100) + '%';
    if (text) text.textContent = `${completed} / ${CHAPTERS.length} Read`;
  }

  // ── Locked message ─────────────────────────────────────────────
  function showLockedMessage(index) {
    const prevTitle = CHAPTERS[index - 1]?.title || 'the previous chapter';
    // Shake the locked item
    const tlItem = document.getElementById(`sg-tl-${index}`);
    if (tlItem) {
      tlItem.style.animation = 'sg-shake 0.4s ease';
      setTimeout(() => tlItem.style.animation = '', 400);
    }
    // Show toast
    showToast(`🔒 Finish reading "${prevTitle}" first!`);
  }

  function showToast(msg) {
    let toast = document.getElementById('sg-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'sg-toast';
      toast.className = 'sg-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  // ── Show read-more prompt ──────────────────────────────────────
  window.sgShowReadMore = function () {
    showToast('📖 Keep reading to unlock the next chapter!');
    // Bounce progress bar
    const fill = document.getElementById('sg-read-fill');
    if (fill) {
      fill.style.animation = 'sg-bounce-bar 0.4s ease';
      setTimeout(() => fill.style.animation = '', 400);
    }
  };

  // ── Finish Story ───────────────────────────────────────────────
  window.sgFinishStory = function () {
    stopVoice();
    const celebration = document.getElementById('sg-celebration');
    if (celebration) {
      celebration.style.display = 'flex';
      spawnConfetti('#fcd34d', 80);
    }
  };

  window.sgRestartStory = function () {
    const celebration = document.getElementById('sg-celebration');
    if (celebration) celebration.style.display = 'none';
    // Reset all
    unlockedUpTo = 0;
    CHAPTERS.forEach(c => {
      readProgress[c.index] = 0;
      readComplete[c.index] = false;
    });
    Object.values(readTimers).forEach(t => clearInterval(t));
    buildStoryGame();
    sgOpenChapter(0);
  };

  // ── Confetti ───────────────────────────────────────────────────
  function spawnConfetti(color, count = 25) {
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'sg-confetti';
      el.style.cssText = `
        left:${Math.random()*100}%;
        background:${i % 3 === 0 ? color : i % 3 === 1 ? '#fff' : '#a78bfa'};
        animation-duration:${0.8 + Math.random() * 1.2}s;
        animation-delay:${Math.random() * 0.4}s;
        width:${6 + Math.random() * 8}px;
        height:${6 + Math.random() * 8}px;
        border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
      `;
      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    }
  }

  // ── Inject CSS ─────────────────────────────────────────────────
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* ── Layout ── */
      .sg-wrapper { min-height: 100vh; display: flex; flex-direction: column; background: #050714; color: #e2e8f0; font-family: 'Outfit', sans-serif; }

      .sg-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 18px 32px; border-bottom: 1px solid rgba(255,255,255,0.07);
        background: rgba(5,7,20,0.9); backdrop-filter: blur(12px);
        position: sticky; top: 0; z-index: 50;
        gap: 16px; flex-wrap: wrap;
      }
      .sg-header-left { display: flex; flex-direction: column; gap: 2px; }
      .sg-label { font-size: 0.65rem; letter-spacing: 0.18em; text-transform: uppercase; color: #a78bfa; }
      .sg-vol { font-size: 0.8rem; color: #64748b; }
      .sg-header-right { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }

      .sg-voice-toggle {
        background: rgba(167,139,250,0.12); border: 1px solid rgba(167,139,250,0.3);
        color: #c4b5fd; padding: 6px 14px; border-radius: 20px; cursor: pointer;
        font-size: 0.78rem; font-family: inherit; transition: all 0.2s;
      }
      .sg-voice-toggle:hover { background: rgba(167,139,250,0.22); }

      .sg-progress-overall {
        width: 120px; height: 6px; background: rgba(255,255,255,0.1);
        border-radius: 3px; overflow: hidden;
      }
      .sg-progress-overall-fill { height: 100%; background: linear-gradient(90deg,#a78bfa,#2dd4bf); border-radius: 3px; transition: width 0.5s ease; }
      .sg-overall-text { font-size: 0.75rem; color: #94a3b8; white-space: nowrap; }

      /* ── Two-col layout ── */
      .sg-layout { display: grid; grid-template-columns: 280px 1fr; flex: 1; min-height: calc(100vh - 60px); }

      /* ── Timeline Sidebar ── */
      .sg-timeline {
        padding: 24px 0; border-right: 1px solid rgba(255,255,255,0.07);
        background: rgba(5,7,20,0.6); display: flex; flex-direction: column; gap: 4px;
        overflow-y: auto;
      }
      .sg-timeline-item {
        display: flex; align-items: flex-start; gap: 14px;
        padding: 16px 20px; cursor: pointer; transition: background 0.2s;
        border-left: 3px solid transparent; user-select: none;
      }
      .sg-timeline-item.locked { opacity: 0.4; cursor: not-allowed; }
      .sg-timeline-item.unlocked:hover { background: rgba(255,255,255,0.04); }
      .sg-timeline-item.active { background: rgba(255,255,255,0.06); border-left-color: var(--accent, #a78bfa); }
      .sg-timeline-item.completed .sg-tl-num { color: #2dd4bf; }

      .sg-tl-dot {
        position: relative; width: 38px; height: 38px; border-radius: 50%;
        background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1);
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        transition: border-color 0.3s;
      }
      .sg-timeline-item.active .sg-tl-dot { border-color: var(--accent); box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 40%, transparent); }
      .sg-timeline-item.completed .sg-tl-dot { border-color: #2dd4bf; background: rgba(45,212,191,0.1); }
      .sg-tl-num { font-size: 0.7rem; font-weight: 700; color: #64748b; letter-spacing: 0.05em; }
      .sg-timeline-item.active .sg-tl-num { color: var(--accent); }

      .sg-tl-info { flex: 1; min-width: 0; }
      .sg-tl-title { font-size: 0.88rem; font-weight: 600; color: #e2e8f0; margin-bottom: 3px; }
      .sg-tl-status { font-size: 0.72rem; color: #64748b; margin-bottom: 6px; }
      .sg-timeline-item.completed .sg-tl-status { color: #2dd4bf; }

      .sg-tl-bar { height: 3px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; }
      .sg-tl-bar-fill { height: 100%; border-radius: 2px; transition: width 0.4s ease; }

      /* ── Reader Panel ── */
      .sg-reader { overflow-y: auto; background: #060a1a; display: flex; flex-direction: column; }

      .sg-reader-empty {
        flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 60px 40px; text-align: center; gap: 16px;
      }
      .sg-empty-icon { font-size: 4rem; }
      .sg-reader-empty h2 { font-family: 'Playfair Display', serif; font-size: 2rem; color: #f1f5f9; }
      .sg-reader-empty p { color: #64748b; line-height: 1.8; max-width: 400px; }
      .sg-start-btn {
        margin-top: 12px; padding: 12px 28px; background: linear-gradient(135deg,#a78bfa,#2dd4bf);
        border: none; border-radius: 30px; color: #050714; font-family: inherit; font-weight: 700;
        font-size: 0.95rem; cursor: pointer; transition: opacity 0.2s;
      }
      .sg-start-btn:hover { opacity: 0.85; }

      /* ── Chapter View ── */
      .sg-chapter-view { display: flex; flex-direction: column; }

      .sg-ch-hero { position: relative; height: 340px; overflow: hidden; }
      .sg-ch-img-wrap { position: absolute; inset: 0; }
      .sg-ch-img { width: 100%; height: 100%; object-fit: cover; object-position: center top; }
      .sg-ch-img-overlay { position: absolute; inset: 0; }
      .sg-ch-hero-text {
        position: absolute; bottom: 28px; left: 36px; right: 36px;
        display: flex; flex-direction: column; gap: 8px;
      }
      .sg-ch-tag {
        display: inline-block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.18em;
        text-transform: uppercase; border: 1px solid; border-radius: 4px;
        padding: 3px 10px; width: fit-content;
      }
      .sg-ch-title {
        font-family: 'Playfair Display', serif; font-size: 3rem; line-height: 1.05;
        color: #fff; text-shadow: 0 2px 20px rgba(0,0,0,0.8);
        background: linear-gradient(135deg, #fff 40%, var(--accent) 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      }
      .sg-ch-subtitle { font-size: 0.82rem; color: rgba(255,255,255,0.6); letter-spacing: 0.08em; }

      /* ── Chapter Body ── */
      .sg-ch-body { padding: 28px 36px 40px; display: flex; flex-direction: column; gap: 18px; flex: 1; }

      /* ── Voice Bar ── */
      .sg-voice-bar { display: flex; align-items: center; gap: 16px; }
      .sg-voice-btn {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 22px; border-radius: 30px; border: 1.5px solid var(--accent);
        background: color-mix(in srgb, var(--accent) 12%, transparent);
        color: var(--accent); font-family: inherit; font-size: 0.88rem;
        font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap;
      }
      .sg-voice-btn:hover { background: color-mix(in srgb, var(--accent) 22%, transparent); }

      .sg-voice-wave { display: flex; align-items: center; gap: 3px; height: 28px; }
      .sg-wave-bar {
        width: 3px; height: 8px; border-radius: 2px; background: #a78bfa;
        transition: height 0.1s;
      }
      .sg-voice-wave.active .sg-wave-bar {
        animation: sg-wave 0.8s ease-in-out infinite alternate;
      }
      @keyframes sg-wave {
        0% { height: 4px; opacity: 0.4; }
        100% { height: 22px; opacity: 1; }
      }

      /* ── Read Progress ── */
      .sg-read-progress-wrap { display: flex; align-items: center; gap: 12px; }
      .sg-read-progress-bar {
        flex: 1; height: 8px; background: rgba(255,255,255,0.08);
        border-radius: 4px; overflow: hidden;
      }
      .sg-read-progress-fill { height: 100%; border-radius: 4px; }
      .sg-read-pct { font-size: 0.78rem; color: #94a3b8; min-width: 40px; text-align: right; }
      .sg-read-hint { font-size: 0.8rem; color: #64748b; margin-top: -6px; }

      /* ── Content Scroll ── */
      .sg-content-scroll {
        flex: 1; overflow-y: auto; max-height: 320px;
        border: 1px solid rgba(255,255,255,0.07); border-radius: 12px;
        padding: 0 2px; background: rgba(255,255,255,0.02);
      }
      .sg-content-text { padding: 28px 32px; }
      .sg-content-ornament { text-align: center; font-size: 1rem; opacity: 0.5; margin: 8px 0; }
      .sg-para {
        font-size: 1.02rem; line-height: 1.85; color: #cbd5e1;
        margin-bottom: 20px; animation: sg-fadein 0.6s ease both;
      }
      .sg-para:first-of-type::first-letter {
        font-family: 'Playfair Display', serif; font-size: 3rem; float: left;
        line-height: 0.85; margin: 4px 8px 0 0; color: #a78bfa;
      }
      @keyframes sg-fadein { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform:none; } }

      /* ── Chapter Nav ── */
      .sg-ch-nav { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding-top: 8px; }
      .sg-nav-btn {
        padding: 10px 22px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);
        background: rgba(255,255,255,0.05); color: #e2e8f0;
        font-family: inherit; font-size: 0.88rem; font-weight: 600;
        cursor: pointer; transition: all 0.2s;
      }
      .sg-nav-btn:hover { background: rgba(255,255,255,0.1); }
      .sg-nav-next { background: rgba(167,139,250,0.15); border-color: rgba(167,139,250,0.4); color: #c4b5fd; }
      .sg-nav-next.locked { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.1); color: #475569; }
      .sg-kw { font-size: 0.75rem; letter-spacing: 0.1em; }

      /* ── Toast ── */
      .sg-toast {
        position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%) translateY(20px);
        background: rgba(15,20,40,0.95); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.15);
        padding: 12px 24px; border-radius: 30px; font-size: 0.88rem; font-family: 'Outfit', sans-serif;
        opacity: 0; transition: all 0.3s; z-index: 9999; backdrop-filter: blur(12px);
        box-shadow: 0 8px 32px rgba(0,0,0,0.4); white-space: nowrap; pointer-events: none;
      }
      .sg-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

      /* ── Celebration ── */
      .sg-celebration {
        position: fixed; inset: 0; z-index: 900; background: rgba(5,7,20,0.92);
        display: flex; align-items: center; justify-content: center;
        backdrop-filter: blur(16px);
      }
      .sg-celebration-inner {
        background: linear-gradient(135deg,rgba(15,20,50,0.98),rgba(25,15,50,0.98));
        border: 1px solid rgba(167,139,250,0.3); border-radius: 20px;
        padding: 56px 64px; text-align: center; max-width: 500px;
        box-shadow: 0 0 80px rgba(167,139,250,0.15);
        display: flex; flex-direction: column; gap: 16px;
      }
      .sg-celeb-stars { font-size: 2rem; letter-spacing: 8px; }
      .sg-celebration-inner h2 { font-family: 'Playfair Display',serif; font-size: 2.4rem; color: #fcd34d; }
      .sg-celebration-inner p { color: #94a3b8; line-height: 1.8; }
      .sg-restart-btn {
        padding: 12px 30px; background: linear-gradient(135deg,#a78bfa,#2dd4bf);
        border: none; border-radius: 30px; color: #050714; font-family: inherit;
        font-weight: 700; font-size: 0.95rem; cursor: pointer; margin-top: 8px;
      }

      /* ── Confetti ── */
      .sg-confetti {
        position: fixed; top: -20px; z-index: 9998; pointer-events: none;
        animation: sg-confetti-fall linear forwards;
      }
      @keyframes sg-confetti-fall {
        to { transform: translateY(110vh) rotate(540deg); opacity: 0; }
      }

      /* ── Keyframes ── */
      @keyframes sg-pop { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
      @keyframes sg-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
      @keyframes sg-bounce-bar { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.5)} }

      /* ── Responsive ── */
      @media (max-width: 768px) {
        .sg-layout { grid-template-columns: 1fr; }
        .sg-timeline { flex-direction: row; overflow-x: auto; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.07); padding: 12px 0; }
        .sg-timeline-item { flex-direction: column; align-items: center; min-width: 100px; gap: 6px; text-align: center; }
        .sg-tl-info { text-align: center; }
        .sg-ch-title { font-size: 2rem; }
        .sg-ch-body { padding: 20px 20px 32px; }
        .sg-content-scroll { max-height: 240px; }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Init ───────────────────────────────────────────────────────
  injectStyles();

  // Wait for DOM and override the lifestory tab behavior
  function init() {
    buildStoryGame();
    // Override the switchTab to stop audio when leaving life story
    const origSwitch = window.switchTab;
    if (origSwitch) {
      window.switchTab = function (tabId) {
        if (tabId !== 'lifestory') stopVoice();
        origSwitch(tabId);
        if (tabId === 'lifestory') {
          // Re-render the story game
          buildStoryGame();
        }
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
