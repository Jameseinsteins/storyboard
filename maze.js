/* ================================================================
   maze.js — Tab Gate Maze System
   Collect clues, dodge the zombie, hide in shadow spots,
   avoid spike traps, and reach the glowing door to unlock tabs.
   ================================================================ */
(function () {
    'use strict';

    /* ── Constants ─────────────────────────────────────────────────── */
    const COLS = 25;          // must stay odd
    const ROWS = 19;          // must stay odd
    const TS = 28;          // tile size in px

    const TILE = { WALL: 0, FLOOR: 1, EXIT: 2, TRAP: 3, CLUE: 4, GATE: 5, HIDE: 6 };

    /* Real-game difficulty */
    const ZOMBIE_MS = 380;   // ms between zombie steps
    const TRAP_MS = 1100;
    const MSG_MS = 3200;
    const HIDE_SPOTS = 4;     // number of shadow-hide alcoves per real maze

    /* Practice-mode difficulty (noticeably easier) */
    const PRAC_ZOMBIE_MS = 700;   // slower zombie in practice
    const PRAC_HIDE_SPOTS = 6;    // more hiding spots in practice
    const PRAC_MAPS = 5;     // number of rotating practice maps

    /* ── James-specific clues per tab ─────────────────────────────── */
    const CLUE_DATA = {
        about: [
            { msg: '🏀 James loves basketball — the shortcut lies EAST of the court!', dir: 'e' },
            { msg: '🎵 Music fills his soul — follow the melody NORTH for a secret passage.', dir: 'n' },
        ],
        lifestory: [
            { msg: "❤️ His mother never gave up — neither should you. The gap is WEST.", dir: 'w' },
            { msg: "😨 James fears mistakes but acts anyway. Go SOUTH — be brave.", dir: 's' },
        ],
        goals: [
            { msg: "💻 James freelances this year — go NORTH through the shortcut!", dir: 'n' },
            { msg: "❤️ He codes for family — the shortcut rewards loyalty. Check EAST.", dir: 'e' },
        ],
        contact: [
            { msg: "📬 James always replies — the hidden door is SOUTH.", dir: 's' },
            { msg: "🤝 Built for family — the gate WEST opens to those who explore.", dir: 'w' },
        ],
    };

    /* ── Cached mazes ─────────────────────────────────────────────── */
    const mazeCache = {};
    let activeGame = null;
    const unlockedTabs = new Set(['home']);

    /* ── Seeded LCG random ─────────────────────────────────────────── */
    function makeLCG(seed) {
        let s = seed >>> 0;
        return function () {
            s = (Math.imul(1664525, s) + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }

    /* ── Maze generator — recursive backtracking ───────────────────── */
    function generateMaze(seed) {
        const rng = makeLCG(seed);
        const grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(TILE.WALL));
        const cellC = (COLS - 1) / 2;
        const cellR = (ROWS - 1) / 2;
        const vis = Array.from({ length: cellR }, () => new Array(cellC).fill(false));

        function carve(cx, cy) {
            vis[cy][cx] = true;
            const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]].sort(() => rng() - 0.5);
            for (const [dx, dy] of dirs) {
                const nx = cx + dx, ny = cy + dy;
                if (nx < 0 || nx >= cellC || ny < 0 || ny >= cellR || vis[ny][nx]) continue;
                grid[cy * 2 + 1][cx * 2 + 1] = TILE.FLOOR;
                grid[cy * 2 + 1 + dy][cx * 2 + 1 + dx] = TILE.FLOOR;
                grid[ny * 2 + 1][nx * 2 + 1] = TILE.FLOOR;
                carve(nx, ny);
            }
        }
        grid[1][1] = TILE.FLOOR;
        carve(0, 0);
        return grid;
    }

    /* ── Flood-fill connectivity ───────────────────────────────────── */
    function canReach(grid, sx, sy, ex, ey) {
        const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
        const q = [{ x: sx, y: sy }];
        visited[sy][sx] = true;
        while (q.length) {
            const { x, y } = q.shift();
            if (x === ex && y === ey) return true;
            for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
                if (visited[ny][nx] || grid[ny][nx] === TILE.WALL) continue;
                visited[ny][nx] = true;
                q.push({ x: nx, y: ny });
            }
        }
        return false;
    }

    /* ── BFS: first step from (sx,sy) toward (tx,ty) ──────────────── */
    function bfsStep(grid, sx, sy, tx, ty, passable) {
        const pass = passable || (t => t !== TILE.WALL);
        const dist = Array.from({ length: ROWS }, () => new Array(COLS).fill(Infinity));
        const prev = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
        dist[sy][sx] = 0;
        const q = [{ x: sx, y: sy }];
        while (q.length) {
            const { x, y } = q.shift();
            if (x === tx && y === ty) break;
            for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
                if (dist[ny][nx] !== Infinity) continue;
                if (!pass(grid[ny][nx])) continue;
                dist[ny][nx] = dist[y][x] + 1;
                prev[ny][nx] = { x, y };
                q.push({ x: nx, y: ny });
            }
        }
        if (dist[ty][tx] === Infinity) return null;
        let cur = { x: tx, y: ty };
        const path = [];
        while (prev[cur.y][cur.x]) { path.push({ ...cur }); cur = prev[cur.y][cur.x]; }
        return path.length ? path[path.length - 1] : null;
    }

    /* ══════════════════════════════════════════════════════════════
       buildMazeData — shared between real and practice mazes
    ══════════════════════════════════════════════════════════════ */
    function buildMazeData(seed, opts = {}) {
        /*  opts:
            isPractice  – easier mode flags
            hideCount   – override HIDE_SPOTS
            noTraps     – skip trap placement
            extraEscapes – extra carved corridors (default 2)
        */
        const hideCount = opts.hideCount ?? HIDE_SPOTS;
        const noTraps = opts.noTraps ?? false;
        const extraEscapes = opts.extraEscapes ?? 2;

        const grid = generateMaze(seed);
        const rng = makeLCG(seed + 7);
        const shuffle = arr => arr.sort(() => rng() - 0.5);

        // Collect all floor
        const floors = [];
        for (let r = 0; r < ROWS; r++)
            for (let c = 0; c < COLS; c++)
                if (grid[r][c] === TILE.FLOOR) floors.push({ x: c, y: r });

        const playerStart = { x: 1, y: 1 };

        // Exit = far tile
        const sorted = [...floors].sort((a, b) => (b.x + b.y) - (a.x + a.y));
        const exitPos = sorted[0];
        grid[exitPos.y][exitPos.x] = TILE.EXIT;

        // Zombie start = midpoint
        const midIdx = Math.floor(floors.length / 2);
        let zombieStart = floors[midIdx];
        while (
            (zombieStart.x === 1 && zombieStart.y === 1) ||
            (zombieStart.x === exitPos.x && zombieStart.y === exitPos.y)
        ) {
            zombieStart = floors[(midIdx + Math.floor(rng() * 10)) % floors.length];
        }

        // Traps
        const trapCandidates = shuffle(floors.filter(f =>
            !(f.x === 1 && f.y === 1) &&
            !(f.x === exitPos.x && f.y === exitPos.y) &&
            !(f.x === zombieStart.x && f.y === zombieStart.y)
        ));
        const traps = [];
        if (!noTraps) {
            for (let i = 0; i < 6 && trapCandidates.length; i++) {
                const t = trapCandidates.pop();
                grid[t.y][t.x] = TILE.TRAP;
                traps.push({ x: t.x, y: t.y, on: (i % 2 === 0) });
            }
        }

        // Clues + gates
        const clueData = CLUE_DATA['about'];   // generic clues for practice; real game overrides
        const clueItems = [];
        const gateItems = [];

        const remaining = shuffle(trapCandidates.filter(f =>
            grid[f.y][f.x] === TILE.FLOOR &&
            !(f.x === zombieStart.x && f.y === zombieStart.y)
        ));

        for (let ci = 0; ci < Math.min(clueData.length, 2) && remaining.length > 6; ci++) {
            const cluePos = remaining.pop();
            grid[cluePos.y][cluePos.x] = TILE.CLUE;
            clueItems.push({ x: cluePos.x, y: cluePos.y, collected: false, data: clueData[ci], gateIdx: ci });

            const wallCandidates = [];
            for (let r = 1; r < ROWS - 1; r++) {
                for (let c = 1; c < COLS - 1; c++) {
                    if (grid[r][c] !== TILE.WALL) continue;
                    const neighbors = [[0, -1], [1, 0], [0, 1], [-1, 0]]
                        .map(([dx, dy]) => ({ x: c + dx, y: r + dy }))
                        .filter(({ x, y }) => x >= 0 && x < COLS && y >= 0 && y < ROWS && grid[y][x] === TILE.FLOOR);
                    if (neighbors.length >= 2) wallCandidates.push({ x: c, y: r });
                }
            }
            shuffle(wallCandidates);
            let placed = false;
            for (const wc of wallCandidates.slice(0, 30)) {
                grid[wc.y][wc.x] = TILE.GATE;
                if (canReach(grid, playerStart.x, playerStart.y, exitPos.x, exitPos.y)) {
                    gateItems.push({ x: wc.x, y: wc.y, open: false });
                    placed = true;
                    break;
                }
                grid[wc.y][wc.x] = TILE.WALL;
            }
            if (!placed) {
                const fb = remaining.pop();
                if (fb) { grid[fb.y][fb.x] = TILE.GATE; gateItems.push({ x: fb.x, y: fb.y, open: false }); }
            }
        }

        /* ── Hide spots — shadow alcoves where zombie is blinded ─── */
        const hidePool = shuffle(
            floors.filter(f =>
                grid[f.y][f.x] === TILE.FLOOR &&
                !(f.x === 1 && f.y === 1) &&
                !(f.x === exitPos.x && f.y === exitPos.y) &&
                !(f.x === zombieStart.x && f.y === zombieStart.y)
            )
        );
        const hideItems = [];
        for (let h = 0; h < hideCount && hidePool.length; h++) {
            const hf = hidePool.pop();
            grid[hf.y][hf.x] = TILE.HIDE;
            hideItems.push({ x: hf.x, y: hf.y });
        }

        /* ── Escape corridors ──────────────────────────────────── */
        const escapeCandidates = shuffle(floors.filter(f =>
            f.x > 3 && f.x < COLS - 4 && f.y > 3 && f.y < ROWS - 4 &&
            grid[f.y][f.x] === TILE.FLOOR
        ));
        for (let ec = 0; ec < extraEscapes && escapeCandidates.length > 0; ec++) {
            const ef = escapeCandidates.pop();
            for (let dx = -2; dx <= 2; dx++) {
                const tx = ef.x + dx;
                if (tx >= 1 && tx < COLS - 1 && grid[ef.y][tx] === TILE.WALL) grid[ef.y][tx] = TILE.FLOOR;
            }
            for (let dy = -2; dy <= 2; dy++) {
                const ty = ef.y + dy;
                if (ty >= 1 && ty < ROWS - 1 && grid[ty][ef.x] === TILE.WALL) grid[ty][ef.x] = TILE.FLOOR;
            }
        }

        return { grid, playerStart, exitPos, zombieStart, traps, clueItems, gateItems, hideItems };
    }

    /* ══════════════════════════════════════════════════════════════
       buildRealMazeData — uses tab-specific seed + clues
    ══════════════════════════════════════════════════════════════ */
    function buildRealMazeData(tabName) {
        const seed = tabName.split('').reduce((a, c) => a + c.charCodeAt(0), 42);
        const data = buildMazeData(seed, { hideCount: HIDE_SPOTS, noTraps: false, extraEscapes: 2 });
        // Patch in real clue data
        const realClues = CLUE_DATA[tabName] || CLUE_DATA.about;
        data.clueItems.forEach((ci, i) => { if (realClues[i]) ci.data = realClues[i]; });
        return data;
    }

    /* ══════════════════════════════════════════════════════════════
       MazeGame class
    ══════════════════════════════════════════════════════════════ */
    class MazeGame {
        /**
         * @param {string}  targetTab   – tab name (or 'practice')
         * @param {Function} onWin      – called on success
         * @param {object}  opts        – { isPractice, zombieMs, mazeData, mapIndex }
         */
        constructor(targetTab, onWin, opts = {}) {
            this.targetTab = targetTab;
            this.onWin = onWin;
            this.isPractice = opts.isPractice || false;
            this.zombieMs = opts.zombieMs || ZOMBIE_MS;
            this.mapIndex = opts.mapIndex || 0;

            this.deaths = 0;
            this.won = false;
            this.caught = false;
            this.hidden = false;         // ← hide mechanic flag
            this.msgTimer = 0;
            this.lastZombie = 0;
            this.lastTrap = 0;
            this.trapPhase = false;

            const md = opts.mazeData;
            this.data = md;
            this.grid = md.grid.map(r => [...r]);
            this.player = { ...md.playerStart };
            this.zombie = { ...md.zombieStart };
            this.traps = md.traps.map(t => ({ ...t }));
            this.clues = md.clueItems.map(c => ({ ...c }));
            this.gates = md.gateItems.map(g => ({ ...g }));
            this.hideSpots = md.hideItems.map(h => ({ ...h }));
            this.exitPos = md.exitPos;
            this.cluesGot = 0;

            this._buildDOM();
            this._attachKeys();
            this._startMazeMusic();
            this.animFrame = requestAnimationFrame(ts => this._loop(ts));
        }

        /* ── Maze music (rage-bait kups tracks) ─────────────────────── */
        _startMazeMusic() {
            // Stop any AI voice narration while maze is active
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
            const tracks = ['kups1.mp3', 'kups2.mp3', 'kups3.mp3', 'kups4.mp3'];
            // Shuffle on start
            const shuffled = tracks.sort(() => Math.random() - 0.5);
            let idx = 0;
            this._mazeAudio = new Audio(shuffled[idx]);
            this._mazeAudio.volume = 0.72;
            this._mazeAudio.play().catch(() => { });
            this._mazeAudio.addEventListener('ended', () => {
                if (!this._mazeAudio) return;
                idx = (idx + 1) % shuffled.length;
                this._mazeAudio.src = shuffled[idx];
                this._mazeAudio.play().catch(() => { });
            });
        }

        _stopMazeMusic() {
            if (!this._mazeAudio) return;
            // Fade out quickly then stop
            const a = this._mazeAudio;
            const fade = setInterval(() => {
                if (a.volume > 0.06) { a.volume = Math.max(0, a.volume - 0.06); }
                else { clearInterval(fade); a.pause(); a.src = ''; }
            }, 40);
            this._mazeAudio = null;
        }

        /* ── DOM ───────────────────────────────────────────────────── */
        _buildDOM() {
            this.overlay = document.createElement('div');
            this.overlay.id = 'maze-overlay';
            Object.assign(this.overlay.style, {
                position: 'fixed', inset: '0', zIndex: '5000',
                background: 'rgba(2,4,14,0.97)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Outfit', monospace",
            });

            /* title bar */
            const titleBar = document.createElement('div');
            Object.assign(titleBar.style, {
                color: this.isPractice ? '#34d399' : '#a78bfa',
                fontSize: '0.72rem', letterSpacing: '4px',
                textTransform: 'uppercase', marginBottom: '8px', opacity: '0.85',
            });
            if (this.isPractice) {
                titleBar.textContent = `🟢 PRACTICE MODE — Map ${this.mapIndex + 1}/${PRAC_MAPS} (Easier · No spikes · Slower zombie)`;
            } else {
                const tabLabel = this.targetTab === 'lifestory' ? 'LIFE STORY' : this.targetTab.toUpperCase();
                titleBar.textContent = `🔒 Solve the maze to unlock: ${tabLabel}`;
            }
            // Secret skip trigger — title text is clickable, zero visual cue
            titleBar.style.userSelect = 'none';
            titleBar.addEventListener('click', () => this._skipToDoor());

            /* canvas */
            this.canvas = document.createElement('canvas');
            this.canvas.width = COLS * TS;
            this.canvas.height = ROWS * TS;
            Object.assign(this.canvas.style, {
                border: `2px solid ${this.isPractice ? 'rgba(52,211,153,0.4)' : 'rgba(167,139,250,0.35)'}`,
                borderRadius: '8px',
                boxShadow: `0 0 50px ${this.isPractice ? 'rgba(52,211,153,0.2)' : 'rgba(139,92,246,0.25)'}`,
                maxWidth: '100vw', maxHeight: '65vh', objectFit: 'contain',
            });
            this.ctx = this.canvas.getContext('2d');

            /* hint bar */
            this.hintBar = document.createElement('div');
            Object.assign(this.hintBar.style, {
                color: '#475569', fontSize: '0.68rem', marginTop: '8px',
                textAlign: 'center', letterSpacing: '0.4px',
            });
            this.hintBar.innerHTML =
                '← → ↑ ↓ or WASD &nbsp;·&nbsp; Reach ✨ door &nbsp;·&nbsp; ' +
                '📜 scrolls = shortcuts &nbsp;·&nbsp; 🫥 step on shadow = hide from zombie';

            /* floating message */
            this.msgEl = document.createElement('div');
            Object.assign(this.msgEl.style, {
                position: 'absolute', bottom: '70px', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(8,12,28,0.96)',
                border: '1px solid rgba(167,139,250,0.4)',
                color: '#e2e8f0', fontSize: '0.82rem', padding: '10px 18px',
                borderRadius: '10px', letterSpacing: '0.3px',
                maxWidth: '460px', textAlign: 'center',
                opacity: '0', transition: 'opacity 0.3s',
                pointerEvents: 'none', zIndex: '10',
            });

            /* button row */
            const btnRow = document.createElement('div');
            Object.assign(btnRow.style, {
                display: 'flex', gap: '10px', marginTop: '10px', alignItems: 'center',
            });

            /* Skip button — hidden completely; skip is triggered via the secret title-click above */
            this.skipBtn = document.createElement('button');
            Object.assign(this.skipBtn.style, {
                display: 'none',   // invisible — skip is on the title label
            });
            btnRow.appendChild(this.skipBtn);

            /* Next Map button (practice only) */
            if (this.isPractice) {
                const nextBtn = document.createElement('button');
                Object.assign(nextBtn.style, {
                    background: 'rgba(52,211,153,0.12)',
                    border: '1px solid rgba(52,211,153,0.35)',
                    color: '#34d399', fontSize: '0.72rem', padding: '7px 20px',
                    borderRadius: '20px', cursor: 'pointer', letterSpacing: '1px',
                    transition: 'background 0.2s',
                });
                nextBtn.textContent = '🗺️ Next Map';
                nextBtn.addEventListener('mouseenter', () => nextBtn.style.background = 'rgba(52,211,153,0.25)');
                nextBtn.addEventListener('mouseleave', () => nextBtn.style.background = 'rgba(52,211,153,0.12)');
                nextBtn.addEventListener('click', () => {
                    this.close(false);
                    openPracticeMap((this.mapIndex + 1) % PRAC_MAPS);
                });
                btnRow.appendChild(nextBtn);
            }

            /* Close / Exit Practice button (practice only) */
            if (this.isPractice) {
                const closeBtn = document.createElement('button');
                Object.assign(closeBtn.style, {
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#f87171', fontSize: '0.72rem', padding: '7px 20px',
                    borderRadius: '20px', cursor: 'pointer', letterSpacing: '1px',
                    transition: 'background 0.2s',
                });
                closeBtn.textContent = '✕ Exit Practice';
                closeBtn.addEventListener('mouseenter', () => closeBtn.style.background = 'rgba(239,68,68,0.2)');
                closeBtn.addEventListener('mouseleave', () => closeBtn.style.background = 'rgba(239,68,68,0.08)');
                closeBtn.addEventListener('click', () => this.close(false));
                btnRow.appendChild(closeBtn);
            }

            /* mobile D-pad */
            this.dpad = this._buildDpad();

            this.overlay.append(titleBar, this.canvas, this.hintBar, btnRow, this.dpad, this.msgEl);
            document.body.appendChild(this.overlay);
        }

        _buildDpad() {
            const wrap = document.createElement('div');
            Object.assign(wrap.style, {
                display: 'grid', gridTemplate: '"a b c" "d e f" "g h i"',
                gap: '4px', marginTop: '12px',
            });
            const BTNS = [
                [null, null], [null, '↑'], [null, null],
                [null, '←'], [null, '·'], [null, '→'],
                [null, null], [null, '↓'], [null, null],
            ];
            const DIRS = { '↑': 'ArrowUp', '↓': 'ArrowDown', '←': 'ArrowLeft', '→': 'ArrowRight' };
            BTNS.forEach(([, label]) => {
                const btn = document.createElement('button');
                Object.assign(btn.style, {
                    width: '42px', height: '42px', borderRadius: '8px',
                    background: label && label !== '·' ? 'rgba(255,255,255,0.08)' : 'transparent',
                    border: label && label !== '·' ? '1px solid rgba(255,255,255,0.15)' : 'none',
                    color: '#e2e8f0', fontSize: '1rem',
                    cursor: label && label !== '·' ? 'pointer' : 'default',
                });
                btn.textContent = label || '';
                if (DIRS[label]) {
                    const key = DIRS[label];
                    btn.addEventListener('touchstart', e => { e.preventDefault(); this._move(key); }, { passive: false });
                    btn.addEventListener('mousedown', () => this._move(key));
                }
                wrap.appendChild(btn);
            });
            return wrap;
        }

        /* ── Keys ───────────────────────────────────────────────────── */
        _attachKeys() {
            this._kd = e => {
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
                this._move(e.key);
            };
            window.addEventListener('keydown', this._kd);
        }

        /* ── Movement ──────────────────────────────────────────────── */
        _move(key) {
            if (this.caught || this.won) return;
            const MAP = {
                ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
                w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
                W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0],
            };
            const dir = MAP[key]; if (!dir) return;
            const nx = this.player.x + dir[0], ny = this.player.y + dir[1];
            if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return;
            const tile = this.grid[ny][nx];
            if (tile === TILE.WALL) return;
            if (tile === TILE.GATE) { this._showMsg('🔒 Gate locked — find the 📜 scroll clue first!'); return; }

            // Leave any previous hide spot
            if (this.hidden) {
                this.hidden = false;
            }

            this.player.x = nx; this.player.y = ny;

            if (tile === TILE.EXIT) { this._win(); return; }
            if (tile === TILE.TRAP && this.trapPhase) { this._getCaught(); return; }

            // Step into hide spot
            if (tile === TILE.HIDE) {
                this.hidden = true;
                this._showMsg('🫥 You ducked into the shadows! The zombie lost sight of you...');
            }

            // Clue pickup
            const ci = this.clues.findIndex(c => !c.collected && c.x === nx && c.y === ny);
            if (ci >= 0) {
                const clue = this.clues[ci];
                clue.collected = true;
                this.grid[ny][nx] = TILE.HIDE; // tile becomes hide after clue is taken
                this.cluesGot++;
                this._showMsg(clue.data.msg);
                const gate = this.gates[clue.gateIdx];
                if (gate) { gate.open = true; this.grid[gate.y][gate.x] = TILE.FLOOR; }
            }

            // Zombie collision after move
            if (this.zombie.x === nx && this.zombie.y === ny) this._getCaught();
        }

        /* ── Game loop ─────────────────────────────────────────────── */
        _loop(ts) {
            if (!this.overlay.isConnected) return;

            if (ts - this.lastZombie > this.zombieMs && !this.caught && !this.won) {
                this._moveZombie(ts);
                this.lastZombie = ts;
            }

            if (ts - this.lastTrap > TRAP_MS) {
                this.trapPhase = !this.trapPhase;
                this.lastTrap = ts;
            }

            if (this.msgTimer > 0) {
                this.msgTimer -= 16;
                if (this.msgTimer <= 0) this.msgEl.style.opacity = '0';
            }

            this._render(ts);
            this.animFrame = requestAnimationFrame(ts2 => this._loop(ts2));
        }

        /* ── Zombie AI ─────────────────────────────────────────────── */
        _moveZombie(ts) {
            if (this.hidden) {
                // Player is hiding — zombie wanders randomly
                const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
                // shuffle using ts as entropy
                dirs.sort(() => Math.sin(ts * 0.0031 + Math.random()) - 0.5);
                for (const [dx, dy] of dirs) {
                    const nx = this.zombie.x + dx, ny = this.zombie.y + dy;
                    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
                    const t = this.grid[ny][nx];
                    if (t === TILE.WALL || t === TILE.GATE) continue;
                    this.zombie.x = nx; this.zombie.y = ny;
                    break;
                }
                // Zombie cannot find player while hidden (they're in shadow)
                return;
            }

            // Normal chase
            const next = bfsStep(
                this.grid, this.zombie.x, this.zombie.y,
                this.player.x, this.player.y,
                t => t !== TILE.WALL && t !== TILE.GATE
            );
            if (next) {
                this.zombie.x = next.x; this.zombie.y = next.y;
                if (this.zombie.x === this.player.x && this.zombie.y === this.player.y)
                    this._getCaught();
            }
        }

        /* ── State changes ─────────────────────────────────────────── */
        _skipToDoor() {
            if (this.won) return;
            this.caught = false;
            const { x: ex, y: ey } = this.exitPos;
            const adj = [[0, -1], [1, 0], [0, 1], [-1, 0]]
                .map(([dx, dy]) => ({ x: ex + dx, y: ey + dy }))
                .find(({ x, y }) =>
                    x >= 0 && x < COLS && y >= 0 && y < ROWS &&
                    this.grid[y][x] !== TILE.WALL && this.grid[y][x] !== TILE.GATE
                );
            if (adj) {
                this.player = { x: adj.x, y: adj.y };
                this.hidden = false;
                this._showMsg('✨ Warped near the door — walk in to enter!');
            } else {
                this._win();
            }
        }

        _getCaught() {
            if (this.caught) return;
            this.caught = true;
            this.hidden = false;
            this.deaths++;
            this._showMsg('💀 The zombie got you! Respawning in 1.5s...');
            setTimeout(() => {
                this.player = { ...this.data.playerStart };
                this.zombie = { ...this.data.zombieStart };
                this.caught = false;
            }, 1500);
        }

        _win() {
            if (this.won) return;
            this.won = true;

            if (this.isPractice) {
                this._showMsg('🎉 Great run! Hit "Next Map" to try another — or close practice to play for real!');
                return;
            }

            // ── Victory celebration card ──────────────────────────────
            const card = document.createElement('div');
            Object.assign(card.style, {
                position: 'absolute', inset: '0',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(3,7,18,0.93)',
                borderRadius: '8px', zIndex: '20',
                animation: 'winFadeIn 0.5s ease forwards',
                fontFamily: "'Outfit', sans-serif",
                textAlign: 'center', padding: '32px',
                boxSizing: 'border-box',
            });

            // Inject keyframe once
            if (!document.getElementById('win-styles')) {
                const st = document.createElement('style');
                st.id = 'win-styles';
                st.textContent = `
                    @keyframes winFadeIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
                    @keyframes winPulse  { 0%,100%{text-shadow:0 0 20px #fbbf24} 50%{text-shadow:0 0 50px #fbbf24, 0 0 80px #f59e0b} }
                    @keyframes winFloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
                `;
                document.head.appendChild(st);
            }

            const trophy = document.createElement('div');
            trophy.textContent = '🏆';
            Object.assign(trophy.style, {
                fontSize: '4rem', marginBottom: '4px',
                animation: 'winFloat 1.8s ease-in-out infinite',
                filter: 'drop-shadow(0 0 18px #fbbf24)',
            });

            const congrats = document.createElement('div');
            congrats.textContent = 'YOU ESCAPED!';
            Object.assign(congrats.style, {
                fontSize: '1.6rem', fontWeight: '800', letterSpacing: '4px',
                color: '#fbbf24', marginBottom: '10px',
                animation: 'winPulse 2s ease-in-out infinite',
            });

            const sub = document.createElement('div');
            sub.textContent = 'You deserve this.';
            Object.assign(sub.style, {
                fontSize: '0.9rem', color: '#94a3b8',
                marginBottom: '22px', letterSpacing: '1px',
            });

            const musicNote = document.createElement('div');
            musicNote.innerHTML = '🎵 &nbsp; <span style="color:#e2e8f0;font-size:0.95rem;font-weight:600">Listen to these beautiful songs —<br>a reward for making it through.</span>';
            Object.assign(musicNote.style, {
                background: 'linear-gradient(135deg,rgba(251,191,36,0.12),rgba(245,158,11,0.06))',
                border: '1px solid rgba(251,191,36,0.3)',
                borderRadius: '14px', padding: '16px 24px',
                color: '#fbbf24', fontSize: '0.88rem',
                lineHeight: '1.6', maxWidth: '340px',
                marginBottom: '24px',
            });

            const entering = document.createElement('div');
            entering.textContent = 'Entering now…';
            Object.assign(entering.style, {
                fontSize: '0.68rem', color: '#374151',
                letterSpacing: '2px', textTransform: 'uppercase',
            });

            card.append(trophy, congrats, sub, musicNote, entering);
            this.canvas.style.position = 'relative';
            this.overlay.appendChild(card);

            // Close after 3.5s
            setTimeout(() => this.close(true), 3500);
        }

        _showMsg(txt) {
            this.msgEl.textContent = txt;
            this.msgEl.style.opacity = '1';
            this.msgTimer = MSG_MS;
        }

        close(success = false) {
            this._stopMazeMusic();
            // AI voice was cancelled on maze open — nothing to resume
            // (tab navigation triggers fresh narration automatically)
            cancelAnimationFrame(this.animFrame);
            window.removeEventListener('keydown', this._kd);
            this.overlay.remove();
            activeGame = null;
            if (success) this.onWin();
        }

        /* ── Renderer ──────────────────────────────────────────────── */
        _render(ts) {
            const ctx = this.ctx;
            const W = COLS * TS, H = ROWS * TS;
            ctx.clearRect(0, 0, W, H);

            // Background
            ctx.fillStyle = '#060b14';
            ctx.fillRect(0, 0, W, H);

            // Tiles
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const tile = this.grid[r][c];
                    const x = c * TS, y = r * TS;

                    if (tile === TILE.WALL) {
                        // Bright wall with neon-blue bevel
                        ctx.fillStyle = '#1b2d55';
                        ctx.fillRect(x, y, TS, TS);
                        ctx.fillStyle = '#243a6a';
                        ctx.fillRect(x + 1, y + 1, TS - 2, TS - 2);
                        ctx.strokeStyle = 'rgba(100,140,255,0.55)';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(x + 0.5, y + 0.5, TS - 1, TS - 1);
                        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                        ctx.strokeRect(x + 2, y + 2, TS - 3, TS - 3);

                    } else if (tile === TILE.FLOOR) {
                        ctx.fillStyle = '#060a13';
                        ctx.fillRect(x, y, TS, TS);
                        ctx.fillStyle = '#09101f';
                        ctx.fillRect(x + 1, y + 1, TS - 2, TS - 2);

                    } else if (tile === TILE.EXIT) {
                        this._drawExit(ctx, x, y, ts);

                    } else if (tile === TILE.TRAP) {
                        this._drawTrap(ctx, x, y);

                    } else if (tile === TILE.CLUE) {
                        this._drawClue(ctx, x, y, ts);

                    } else if (tile === TILE.GATE) {
                        this._drawGate(ctx, x, y, ts);

                    } else if (tile === TILE.HIDE) {
                        this._drawHide(ctx, x, y, ts);
                    }
                }
            }

            this._drawPlayer(ctx, ts);
            this._drawZombie(ctx, ts);
            this._drawHUD(ctx);
        }

        _drawExit(ctx, x, y, ts) {
            const pulse = Math.sin(ts * 0.003) * 0.5 + 0.5;
            ctx.fillStyle = '#080e1c';
            ctx.fillRect(x, y, TS, TS);
            ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 16 + pulse * 12;
            ctx.fillStyle = `rgba(251,191,36,${0.55 + pulse * 0.35})`;
            ctx.fillRect(x + 5, y + 3, TS - 10, TS - 3);
            ctx.fillStyle = '#fff7c0';
            ctx.beginPath(); ctx.arc(x + TS - 10, y + TS / 2, 2, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.font = '10px serif'; ctx.textAlign = 'center';
            ctx.fillText('✨', x + TS / 2, y + 4);
        }

        _drawTrap(ctx, x, y) {
            ctx.fillStyle = '#0a0f1a';
            ctx.fillRect(x, y, TS, TS);
            if (this.trapPhase) {
                ctx.fillStyle = '#ef4444';
                ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 6;
                for (let i = 0; i < 4; i++) {
                    const bx = x + 4 + i * 6;
                    ctx.beginPath(); ctx.moveTo(bx, y + TS - 4);
                    ctx.lineTo(bx + 3, y + 5); ctx.lineTo(bx + 6, y + TS - 4);
                    ctx.closePath(); ctx.fill();
                }
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = 'rgba(239,68,68,0.18)';
                ctx.fillRect(x + 2, y + TS - 7, TS - 4, 5);
                ctx.fillStyle = 'rgba(239,68,68,0.35)';
                ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('!', x + TS / 2, y + TS / 2);
            }
        }

        _drawClue(ctx, x, y, ts) {
            ctx.fillStyle = '#080e1c'; ctx.fillRect(x, y, TS, TS);
            const bob = Math.sin(ts * 0.004) * 2.5;
            ctx.shadowColor = '#fcd34d'; ctx.shadowBlur = 10;
            ctx.font = `${TS - 6}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('📜', x + TS / 2, y + TS / 2 + bob);
            ctx.shadowBlur = 0;
        }

        _drawGate(ctx, x, y, ts) {
            const flash = Math.sin(ts * 0.006) * 0.5 + 0.5;
            ctx.fillStyle = '#0a0f1a'; ctx.fillRect(x, y, TS, TS);
            ctx.fillStyle = `rgba(251,146,60,${0.4 + flash * 0.4})`;
            for (let b = 0; b < 3; b++) ctx.fillRect(x + 3 + b * 8, y + 2, 4, TS - 4);
            ctx.strokeStyle = `rgba(251,146,60,${0.6 + flash * 0.3})`;
            ctx.lineWidth = 1.5; ctx.strokeRect(x + 2, y + 2, TS - 4, TS - 4); ctx.lineWidth = 1;
            ctx.font = '9px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fed7aa'; ctx.fillText('🔒', x + TS / 2, y + TS / 2);
        }

        /* ── Hide spot — dark alcove with soft blue shimmer ─────────── */
        _drawHide(ctx, x, y, ts) {
            // Very dark floor base
            ctx.fillStyle = '#030609';
            ctx.fillRect(x, y, TS, TS);
            // Animated soft shimmer
            const shimmer = Math.sin(ts * 0.0025 + x * 0.3 + y * 0.2) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(30,60,130,${0.08 + shimmer * 0.12})`;
            ctx.fillRect(x + 2, y + 2, TS - 4, TS - 4);
            // Corner shadow marks
            ctx.fillStyle = `rgba(80,120,220,${0.18 + shimmer * 0.12})`;
            ctx.fillRect(x + 1, y + 1, 4, 4);
            ctx.fillRect(x + TS - 5, y + 1, 4, 4);
            ctx.fillRect(x + 1, y + TS - 5, 4, 4);
            ctx.fillRect(x + TS - 5, y + TS - 5, 4, 4);
            // Icon
            ctx.font = '9px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.globalAlpha = 0.45 + shimmer * 0.2;
            ctx.fillText('🫥', x + TS / 2, y + TS / 2);
            ctx.globalAlpha = 1;
        }

        _drawPlayer(ctx, ts) {
            const { x, y } = this.player;
            const px = x * TS, py = y * TS;
            const flash = this.caught ? (Math.floor(ts / 90) % 2 === 0) : true;
            if (!flash) return;

            if (this.hidden) {
                // Faint semi-transparent player while hiding
                ctx.globalAlpha = 0.35 + Math.sin(ts * 0.005) * 0.15;
                ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 4;
                ctx.font = `${TS - 2}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('🧍', px + TS / 2, py + TS / 2);
                ctx.shadowBlur = 0; ctx.globalAlpha = 1;
                // "hiding" label
                ctx.fillStyle = 'rgba(96,165,250,0.7)';
                ctx.font = '7px Outfit, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                ctx.fillText('HIDING', px + TS / 2, py + 1);
            } else {
                ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = this.caught ? 0 : 10;
                ctx.font = `${TS - 2}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('🧍', px + TS / 2, py + TS / 2);
                ctx.shadowBlur = 0;
                if (!this.caught) {
                    ctx.fillStyle = 'rgba(96,165,250,0.5)';
                    ctx.fillRect(px + TS / 2 - 2, py + 2, 4, 3);
                }
            }
        }

        _drawZombie(ctx, ts) {
            const { x, y } = this.zombie;
            const zx = x * TS, zy = y * TS;
            const sway = Math.sin(ts * 0.005) * 1.5;

            if (this.hidden) {
                // Confused zombie — spinning/erratic
                ctx.globalAlpha = 0.75;
                ctx.shadowColor = '#94a3b8'; ctx.shadowBlur = 6;
            } else {
                ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 12;
            }
            ctx.font = `${TS - 2}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('🧟', zx + TS / 2 + sway, zy + TS / 2);
            ctx.shadowBlur = 0; ctx.globalAlpha = 1;

            // "?" above zombie head when player is hiding
            if (this.hidden) {
                ctx.fillStyle = 'rgba(148,163,184,0.85)';
                ctx.font = 'bold 9px Outfit, sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                ctx.fillText('?', zx + TS / 2, zy + 1);
            }
        }

        _drawHUD(ctx) {
            // Top-right: clues + deaths
            ctx.fillStyle = 'rgba(8,14,28,0.75)';
            ctx.fillRect(COLS * TS - 130, 4, 126, 22);
            ctx.fillStyle = '#94a3b8'; ctx.font = '11px Outfit, sans-serif';
            ctx.textAlign = 'right'; ctx.textBaseline = 'top';
            ctx.fillText(`📜 ${this.cluesGot}/${this.clues.length}  ·  💀 ${this.deaths}`, COLS * TS - 6, 8);

            // Bottom-left: trap indicator or HIDDEN status
            ctx.fillStyle = 'rgba(8,14,28,0.75)';
            ctx.fillRect(4, ROWS * TS - 22, 100, 18);
            ctx.textAlign = 'left';
            if (this.hidden) {
                ctx.fillStyle = '#60a5fa';
                ctx.fillText('🫥 HIDDEN', 8, ROWS * TS - 18);
            } else {
                ctx.fillStyle = this.trapPhase ? '#ef4444' : '#374151';
                ctx.fillText(this.trapPhase ? '⚡ SPIKES ON' : '  spikes off', 8, ROWS * TS - 18);
            }

            // Practice mode badge top-left
            if (this.isPractice) {
                ctx.fillStyle = 'rgba(8,14,28,0.75)';
                ctx.fillRect(4, 4, 90, 18);
                ctx.fillStyle = '#34d399';
                ctx.textAlign = 'left'; ctx.textBaseline = 'top';
                ctx.fillText('🟢 PRACTICE', 8, 8);
            }
        }
    }

    /* ── Practice mode entry ───────────────────────────────────────── */
    function openPracticeMap(mapIndex = 0) {
        if (activeGame) return;
        // Practice seeds are clearly different from any real tab seed
        const seed = 900000 + mapIndex * 13337;
        const md = buildMazeData(seed, {
            hideCount: PRAC_HIDE_SPOTS,
            noTraps: true,
            extraEscapes: 4,          // extra corridors → more open, easier
        });
        // Override clue data with friendly practice clues
        const practiceClues = [
            { msg: '🟢 Great! You found a clue! It unlocks a shortcut gate. Try to reach the ✨ door!', dir: 'e' },
            { msg: '🟢 Nice find! Gates open shortcuts. Real mazes have these too — but with real consequences!', dir: 'n' },
        ];
        md.clueItems.forEach((ci, i) => { if (practiceClues[i]) ci.data = practiceClues[i]; });

        activeGame = new MazeGame('practice', () => { }, {
            isPractice: true,
            zombieMs: PRAC_ZOMBIE_MS,
            mazeData: md,
            mapIndex,
        });
    }

    /* ── Tab switching helper ─────────────────────────────────────── */
    function performSwitch(tabName) {
        if (typeof window.switchTab === 'function') { window.switchTab(tabName); return; }
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
        const tc = document.getElementById(`tab-content-${tabName}`);
        const tb = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        if (tc) tc.classList.add('active');
        if (tb) tb.classList.add('active');
    }

    /* ── Inject "Practice First" button into nav ──────────────────── */
    function injectPracticeButton() {
        const nav = document.querySelector('.nav-links') || document.querySelector('nav');
        if (!nav) return;

        const btn = document.createElement('button');
        btn.id = 'maze-practice-btn';
        Object.assign(btn.style, {
            background: 'linear-gradient(135deg,rgba(52,211,153,0.15),rgba(16,185,129,0.08))',
            border: '1px solid rgba(52,211,153,0.45)',
            color: '#34d399',
            fontSize: '0.72rem', fontFamily: "'Outfit', sans-serif",
            padding: '6px 16px', borderRadius: '20px',
            cursor: 'pointer', letterSpacing: '1.5px',
            textTransform: 'uppercase', fontWeight: '600',
            transition: 'all 0.2s', marginLeft: '12px',
            boxShadow: '0 0 12px rgba(52,211,153,0.15)',
        });
        btn.textContent = '🟢 Practice First';
        btn.title = 'Open practice maze: no traps, slower zombie, 5 different maps';
        btn.addEventListener('mouseenter', () => {
            btn.style.background = 'linear-gradient(135deg,rgba(52,211,153,0.3),rgba(16,185,129,0.2))';
            btn.style.boxShadow = '0 0 20px rgba(52,211,153,0.35)';
            btn.style.transform = 'translateY(-1px)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.background = 'linear-gradient(135deg,rgba(52,211,153,0.15),rgba(16,185,129,0.08))';
            btn.style.boxShadow = '0 0 12px rgba(52,211,153,0.15)';
            btn.style.transform = '';
        });
        btn.addEventListener('click', e => {
            e.stopPropagation();
            if (activeGame) return;
            openPracticeMap(0);
        });
        nav.appendChild(btn);
    }

    /* ── Intercept tab buttons — maze required EVERY time ────────── */
    function init() {
        document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
            const tab = btn.dataset.tab;
            if (!tab || tab === 'home') return;

            btn.addEventListener('click', e => {
                e.stopImmediatePropagation();
                e.preventDefault();
                if (activeGame) return;

                // Always build a fresh maze — no unlock cache check
                delete mazeCache[tab];
                mazeCache[tab] = buildRealMazeData(tab);

                activeGame = new MazeGame(tab, () => {
                    delete mazeCache[tab];
                    performSwitch(tab);
                    // Re-lock immediately — next click needs maze again
                }, {
                    isPractice: false,
                    zombieMs: ZOMBIE_MS,
                    mazeData: mazeCache[tab],
                });
            }, true);
        });

        const homeBtn = document.querySelector('.tab-btn[data-tab="home"]');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                if (activeGame) activeGame.close(false);
            }, true);
        }

        injectPracticeButton();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
