/* ================================================================
   music.js — Per-Tab Ambient Music Player
   Each tab (including home) has its own background track.
   Crossfades smoothly when switching tabs.
   Maze music (kups1-4) is handled separately in maze.js.
   ================================================================ */
(function () {
    'use strict';

    /* ── Tab → Track mapping ─────────────────────────────────────── */
    const TAB_TRACKS = {
        home: 'backburner.mp3',
        about: 'happines.mp3',
        lifestory: 'whoknows.mp3',
        goals: 'multo.mp3',
        contact: 'kalapastangan.mp3',
    };

    const FADE_STEP_MS = 40;   // ms per fade tick
    const FADE_AMOUNT = 0.04; // volume step per tick
    const TAB_VOLUME = 0.55; // max tab music volume

    let currentAudio = null;
    let currentTab = null;
    let isTransitioning = false;

    /* ── Fade out an audio element, then call cb ─────────────────── */
    function fadeOut(audio, cb) {
        if (!audio) { cb && cb(); return; }
        const tick = setInterval(() => {
            if (audio.volume > FADE_AMOUNT + 0.001) {
                audio.volume = Math.max(0, audio.volume - FADE_AMOUNT);
            } else {
                clearInterval(tick);
                audio.pause();
                audio.src = '';
                cb && cb();
            }
        }, FADE_STEP_MS);
    }

    /* ── Fade in an audio element to TAB_VOLUME ──────────────────── */
    function fadeIn(audio) {
        audio.volume = 0;
        audio.play().catch(() => { });
        const tick = setInterval(() => {
            if (audio.volume < TAB_VOLUME - FADE_AMOUNT) {
                audio.volume = Math.min(TAB_VOLUME, audio.volume + FADE_AMOUNT);
            } else {
                audio.volume = TAB_VOLUME;
                clearInterval(tick);
            }
        }, FADE_STEP_MS);
    }

    /* ── Switch to the track for a given tab ─────────────────────── */
    function switchTrack(tabName) {
        const src = TAB_TRACKS[tabName];
        if (!src) return;
        if (tabName === currentTab) return;   // already playing this tab's track
        if (isTransitioning) return;

        isTransitioning = true;
        currentTab = tabName;

        const prev = currentAudio;
        fadeOut(prev, () => {
            // Don't start if tab already changed again while fading
            if (currentTab !== tabName) { isTransitioning = false; return; }

            const audio = new Audio(src);
            audio.loop = true;
            audio.volume = 0;
            currentAudio = audio;
            fadeIn(audio);
            isTransitioning = false;
        });
    }

    /* ── Pause/resume when maze overlay appears/disappears ───────── */
    function watchMazeOverlay() {
        const observer = new MutationObserver(() => {
            const mazeActive = !!document.getElementById('maze-overlay');
            if (!currentAudio) return;
            if (mazeActive) {
                // Maze is open — duck the tab music to silence
                currentAudio.volume = 0;
            } else {
                // Maze closed — restore tab music volume
                fadeIn(currentAudio);
            }
        });
        observer.observe(document.body, { childList: true });
    }

    /* ── Detect which tab is currently active ────────────────────── */
    function getActiveTab() {
        const active = document.querySelector('.tab-content.active');
        if (!active) return null;
        const id = active.id; // e.g. "tab-content-about"
        return id ? id.replace('tab-content-', '') : null;
    }

    /* ── Watch for tab content changes via MutationObserver ─────── */
    function watchTabs() {
        // Initial track on page load
        const initial = getActiveTab();
        if (initial) switchTrack(initial);

        // Watch for 'active' class changes on .tab-content elements
        const observer = new MutationObserver(mutations => {
            for (const m of mutations) {
                if (m.type === 'attributes' && m.attributeName === 'class') {
                    const el = m.target;
                    if (el.classList.contains('active') && el.classList.contains('tab-content')) {
                        const tabName = el.id.replace('tab-content-', '');
                        switchTrack(tabName);
                    }
                }
            }
        });

        document.querySelectorAll('.tab-content').forEach(el => {
            observer.observe(el, { attributes: true, attributeFilter: ['class'] });
        });

        watchMazeOverlay();
    }

    /* ── Boot ────────────────────────────────────────────────────── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', watchTabs);
    } else {
        watchTabs();
    }

})();
