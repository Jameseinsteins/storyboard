/* ================================================================
   ads.js — Aggressively Annoying Self-Promotional Ad System
   Full screen-blocking overlay, fake X, long skip delay,
   flashing border, unskippable first 7 seconds.
   ================================================================ */
(function () {
    'use strict';

    const AD_INTERVAL_MS = 20000;  // every 20 seconds
    const SKIP_DELAY_MS = 7000;   // 7 seconds before real skip appears
    const AUTO_CLOSE_MS = 15000;  // auto-close after 15 seconds
    const FIRST_AD_DELAY = 15000;  // first ad fires 15 seconds in

    /* ── Ad creatives ────────────────────────────────────────────── */
    const ADS = [
        {
            badge: '💻 WEB DEVELOPER FOR HIRE',
            headline: 'You Need James.\nJames Needs a Client.',
            body: 'Seriously. James Albertescuro builds clean, fast, and beautiful websites — page by page, dream by dream. He is literally available RIGHT NOW. Click. The. Button.',
            cta: '📬 Hire James NOW →',
            ctaTab: 'contact',
            accent: '#60a5fa',
            glow: 'rgba(96,165,250,0.5)',
            emoji: '🧑‍💻',
        },
        {
            badge: '🎵 MUSICIAN · CODER · LEGEND',
            headline: 'He Plays Guitar AND Writes Code.\nWhat\'s Your Excuse?',
            body: 'James doesn\'t just build websites — he writes music, plays basketball, cooks, solves math, and still finds time to be a great son. He\'s superhuman and he\'s available.',
            cta: '🤯 Learn About James →',
            ctaTab: 'about',
            accent: '#a78bfa',
            glow: 'rgba(167,139,250,0.5)',
            emoji: '🎸',
        },
        {
            badge: '❤️ MAMA\'S BOY (PROUDLY)',
            headline: 'His Mom Raised Him Alone.\nHe\'s Repaying It With Code.',
            body: 'She worked double shifts, skipped meals, and never complained. Every freelance job James gets goes directly back to her. By hiring James, you\'re also helping a legend of a mother.',
            cta: '❤️ Read His Story →',
            ctaTab: 'lifestory',
            accent: '#f472b6',
            glow: 'rgba(244,114,182,0.5)',
            emoji: '❤️',
        },
        {
            badge: '🏀 YES, HE ALSO PLAYS BALL',
            headline: 'Built Different.\nCodes Harder.',
            body: 'Basketball. Cooking. Instruments. Math. Code. James literally cannot stop acquiring skills. The only thing he doesn\'t have yet is a web development client. Be the one.',
            cta: '🏀 See What He\'s Made Of →',
            ctaTab: 'about',
            accent: '#fb923c',
            glow: 'rgba(251,146,60,0.5)',
            emoji: '🏀',
        },
        {
            badge: '🚀 AMBITIONS LOADING... 100%',
            headline: 'He Has Goals.\nBig, Scary, Beautiful Ones.',
            body: 'Freelancing. Studio recording. A house for his mom. These aren\'t wishes — they\'re plans. And every time you look at this site, James gets closer to making them real.',
            cta: '🌟 See His Vision →',
            ctaTab: 'goals',
            accent: '#34d399',
            glow: 'rgba(52,211,153,0.5)',
            emoji: '🌟',
        },
        {
            badge: '📬 HE READS EVERY SINGLE MESSAGE',
            headline: 'Say Something.\nHe WILL Reply.',
            body: 'Spam? He reads it. Feedback? Saved. Job offer? He\'ll reply before you finish your coffee. James Albertescuro replies to everything. Try him.',
            cta: '✉️ Message James →',
            ctaTab: 'contact',
            accent: '#fbbf24',
            glow: 'rgba(251,191,36,0.5)',
            emoji: '📬',
        },
    ];

    let adIndex = 0;
    let adOverlay = null;
    let closeTimer, skipTick, countTick, flashInterval;

    /* ── Tab switcher ────────────────────────────────────────────── */
    function goToTab(tabName) {
        if (typeof window.switchTab === 'function') {
            window.switchTab(tabName);
        } else {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
            const tc = document.getElementById(`tab-content-${tabName}`);
            const tb = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
            if (tc) tc.classList.add('active');
            if (tb) tb.classList.add('active');
        }
    }

    /* ── Close ───────────────────────────────────────────────────── */
    function closeAd() {
        if (!adOverlay) return;
        clearTimeout(closeTimer);
        clearInterval(flashInterval);
        Object.assign(adOverlay.style, { opacity: '0', transition: 'opacity 0.3s' });
        setTimeout(() => { adOverlay && adOverlay.remove(); adOverlay = null; }, 320);
    }

    /* ── Show ad ─────────────────────────────────────────────────── */
    function showAd() {
        if (adOverlay) return;
        const ad = ADS[adIndex % ADS.length];
        adIndex++;

        /* ── Full-screen blocking overlay ── */
        adOverlay = document.createElement('div');
        Object.assign(adOverlay.style, {
            position: 'fixed', inset: '0', zIndex: '99999',
            background: 'rgba(0,0,10,0.88)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'adFadeIn 0.25s ease forwards',
            boxSizing: 'border-box',
        });
        // Block ALL clicks on content underneath
        adOverlay.addEventListener('click', e => e.stopPropagation());

        /* ── Card ── */
        const card = document.createElement('div');
        Object.assign(card.style, {
            background: 'linear-gradient(145deg,#0b1120,#0f1829)',
            border: `2px solid ${ad.accent}`,
            borderRadius: '20px',
            boxShadow: `0 0 80px ${ad.glow}, 0 0 30px ${ad.glow}, inset 0 0 60px rgba(0,0,0,0.5)`,
            padding: '36px 36px 28px',
            maxWidth: '500px', width: '90vw',
            position: 'relative',
            fontFamily: "'Outfit', sans-serif",
            animation: 'adPopIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
            boxSizing: 'border-box',
        });

        // Flashing border
        let flashOn = true;
        flashInterval = setInterval(() => {
            flashOn = !flashOn;
            card.style.boxShadow = flashOn
                ? `0 0 80px ${ad.glow}, 0 0 30px ${ad.glow}, inset 0 0 60px rgba(0,0,0,0.5)`
                : `0 0 20px ${ad.glow}, inset 0 0 60px rgba(0,0,0,0.5)`;
        }, 600);

        /* shimmer bar */
        const shimmer = document.createElement('div');
        Object.assign(shimmer.style, {
            position: 'absolute', top: '0', left: '0', right: '0', height: '3px',
            background: `linear-gradient(90deg, transparent, ${ad.accent}, ${ad.accent}, transparent)`,
            borderRadius: '20px 20px 0 0',
            animation: 'adShimmer 1.4s ease-in-out infinite',
        });
        card.appendChild(shimmer);

        /* FAKE ✕ (top-right — does nothing at first, laughs at you) */
        const fakeX = document.createElement('button');
        Object.assign(fakeX.style, {
            position: 'absolute', top: '14px', right: '16px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            color: '#475569', fontSize: '1rem', width: '28px', height: '28px',
            borderRadius: '50%', cursor: 'pointer', lineHeight: '1',
            fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
        });
        fakeX.textContent = '✕';
        fakeX.title = 'Nice try 😈';
        // Fake X wiggles and does nothing for the first SKIP_DELAY_MS
        let fakeXEnabled = false;
        fakeX.addEventListener('click', e => {
            e.stopPropagation();
            if (fakeXEnabled) { closeAd(); return; }
            // Wiggle punishment
            fakeX.style.transform = 'rotate(20deg) scale(1.3)';
            fakeX.style.color = '#ef4444';
            setTimeout(() => {
                fakeX.style.transform = '';
                fakeX.style.color = '#475569';
            }, 400);
        });
        card.appendChild(fakeX);

        /* AD label + countdown row */
        const topRow = document.createElement('div');
        Object.assign(topRow.style, {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '18px',
        });
        const adLabel = document.createElement('span');
        Object.assign(adLabel.style, {
            fontSize: '0.58rem', letterSpacing: '3px', textTransform: 'uppercase',
            color: '#475569', background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '3px 8px', borderRadius: '4px',
        });
        adLabel.textContent = 'ADVERTISEMENT';

        const countdown = document.createElement('span');
        Object.assign(countdown.style, {
            fontSize: '0.65rem', color: '#64748b', fontWeight: '600',
            letterSpacing: '1px', minWidth: '32px', textAlign: 'right',
        });
        let remaining = Math.ceil(AUTO_CLOSE_MS / 1000);
        countdown.textContent = `${remaining}s`;
        countTick = setInterval(() => {
            remaining--;
            countdown.textContent = remaining > 0 ? `${remaining}s` : '';
            if (remaining <= 0) clearInterval(countTick);
        }, 1000);

        topRow.append(adLabel, countdown);
        card.appendChild(topRow);

        /* Big emoji */
        const emojiEl = document.createElement('div');
        Object.assign(emojiEl.style, {
            fontSize: '3.5rem', marginBottom: '12px', lineHeight: '1',
            filter: `drop-shadow(0 0 20px ${ad.accent})`,
            animation: 'adBounce 1.2s ease-in-out infinite',
        });
        emojiEl.textContent = ad.emoji;
        card.appendChild(emojiEl);

        /* Badge */
        const badge = document.createElement('div');
        Object.assign(badge.style, {
            fontSize: '0.6rem', letterSpacing: '3px', textTransform: 'uppercase',
            color: ad.accent, marginBottom: '10px', fontWeight: '700',
        });
        badge.textContent = ad.badge;
        card.appendChild(badge);

        /* Headline (supports \n) */
        const headline = document.createElement('h3');
        Object.assign(headline.style, {
            margin: '0 0 14px', fontSize: '1.45rem', fontWeight: '800',
            color: '#f1f5f9', lineHeight: '1.25', letterSpacing: '-0.4px',
            whiteSpace: 'pre-line',
        });
        headline.textContent = ad.headline;
        card.appendChild(headline);

        /* Body */
        const body = document.createElement('p');
        Object.assign(body.style, {
            margin: '0 0 22px', fontSize: '0.83rem', color: '#94a3b8',
            lineHeight: '1.7', letterSpacing: '0.15px',
        });
        body.textContent = ad.body;
        card.appendChild(body);

        /* CTA */
        const cta = document.createElement('button');
        Object.assign(cta.style, {
            background: `linear-gradient(135deg, ${ad.accent}, ${ad.accent}99)`,
            border: 'none', color: '#000', fontSize: '0.85rem', fontWeight: '800',
            padding: '12px 28px', borderRadius: '30px', cursor: 'pointer',
            letterSpacing: '0.5px', fontFamily: "'Outfit', sans-serif",
            boxShadow: `0 4px 24px ${ad.glow}`,
            transition: 'all 0.2s', display: 'block', width: '100%', marginBottom: '14px',
        });
        cta.textContent = ad.cta;
        cta.addEventListener('mouseenter', () => {
            cta.style.transform = 'translateY(-2px) scale(1.02)';
            cta.style.boxShadow = `0 8px 32px ${ad.glow}`;
        });
        cta.addEventListener('mouseleave', () => {
            cta.style.transform = '';
            cta.style.boxShadow = `0 4px 24px ${ad.glow}`;
        });
        cta.addEventListener('click', () => { closeAd(); goToTab(ad.ctaTab); });
        card.appendChild(cta);

        /* Skip area — counts down, then enables real skip */
        const skipRow = document.createElement('div');
        Object.assign(skipRow.style, {
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        });

        const skipBtn = document.createElement('button');
        Object.assign(skipBtn.style, {
            background: 'none', border: 'none', fontFamily: "'Outfit', sans-serif",
            color: '#374151', fontSize: '0.68rem', cursor: 'not-allowed',
            letterSpacing: '0.5px', padding: '4px 0',
            transition: 'color 0.3s',
        });
        let skipSec = Math.ceil(SKIP_DELAY_MS / 1000);
        skipBtn.textContent = `You can skip in ${skipSec}s…`;
        skipTick = setInterval(() => {
            skipSec--;
            if (skipSec > 0) {
                skipBtn.textContent = `You can skip in ${skipSec}s…`;
            } else {
                clearInterval(skipTick);
                skipBtn.textContent = 'Skip Ad ✕';
                skipBtn.style.color = '#64748b';
                skipBtn.style.cursor = 'pointer';
                fakeXEnabled = true;
                fakeX.style.color = '#64748b';
                fakeX.title = 'Close';
                skipBtn.addEventListener('click', closeAd, { once: true });
            }
        }, 1000);

        skipRow.appendChild(skipBtn);
        card.appendChild(skipRow);

        adOverlay.appendChild(card);
        document.body.appendChild(adOverlay);

        /* auto-close */
        closeTimer = setTimeout(closeAd, AUTO_CLOSE_MS);
    }

    /* ── Inject keyframes ────────────────────────────────────────── */
    function injectStyles() {
        if (document.getElementById('ad-styles')) return;
        const s = document.createElement('style');
        s.id = 'ad-styles';
        s.textContent = `
            @keyframes adFadeIn {
                from { opacity: 0; } to { opacity: 1; }
            }
            @keyframes adPopIn {
                from { opacity: 0; transform: scale(0.8) translateY(20px); }
                to   { opacity: 1; transform: scale(1)   translateY(0);    }
            }
            @keyframes adShimmer {
                0%,100% { opacity:0.4; transform:scaleX(0.5); }
                50%      { opacity:1;   transform:scaleX(1);   }
            }
            @keyframes adBounce {
                0%,100% { transform: translateY(0);    }
                50%     { transform: translateY(-6px); }
            }
        `;
        document.head.appendChild(s);
    }

    /* ── Boot ────────────────────────────────────────────────────── */
    function init() {
        injectStyles();
        setTimeout(() => {
            showAd();
            setInterval(showAd, AD_INTERVAL_MS);
        }, FIRST_AD_DELAY);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
