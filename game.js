/* ─────────────────────────────────────────────────────────
   game.js  —  Multi-Game System: Asteroids | Snake | Pong | Breakout
───────────────────────────────────────────────────────── */
(function () {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score-display');
    const livesEl = document.getElementById('lives-display');
    const hintEl = document.getElementById('game-hint-text');
    const pickerEl = document.getElementById('game-picker');

    let W, H, animId, currentGame = null;
    const keys = {};

    // ── Resize ───────────────────────────────────────────────
    function resize() {
        W = canvas.width = canvas.offsetWidth;
        H = canvas.height = canvas.offsetHeight;
        if (currentGame && currentGame.onResize) currentGame.onResize();
    }
    window.addEventListener('resize', resize);
    resize();

    // ── Input ────────────────────────────────────────────────
    document.addEventListener('keydown', e => {
        keys[e.code] = true;
        if (e.code === 'Space') e.preventDefault();
    });
    document.addEventListener('keyup', e => { keys[e.code] = false; });
    // Track mouse across the whole document so hero content doesn't block it
    document.addEventListener('mousemove', e => {
        const r = canvas.getBoundingClientRect();
        canvas._mx = e.clientX - r.left;
        canvas._my = e.clientY - r.top;
    });

    // Polyfill for ctx.roundRect (not available in all browsers)
    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
            r = Math.min(r, w / 2, h / 2);
            this.moveTo(x + r, y);
            this.lineTo(x + w - r, y);
            this.quadraticCurveTo(x + w, y, x + w, y + r);
            this.lineTo(x + w, y + h - r);
            this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            this.lineTo(x + r, y + h);
            this.quadraticCurveTo(x, y + h, x, y + h - r);
            this.lineTo(x, y + r);
            this.quadraticCurveTo(x, y, x + r, y);
            this.closePath();
        };
    }

    // ── Global Picker Controls ────────────────────────────────
    window.openGamePicker = function () {
        stopCurrentGame();
        pickerEl.classList.remove('hidden');
    };

    window.selectGame = function (name) {
        pickerEl.classList.add('hidden');
        stopCurrentGame();
        switch (name) {
            case 'asteroids': currentGame = buildAsteroids(); break;
            case 'snake': currentGame = buildSnake(); break;
            case 'pong': currentGame = buildPong(); break;
            case 'breakout': currentGame = buildBreakout(); break;
        }
        if (currentGame) currentGame.start();
    };

    function stopCurrentGame() {
        if (animId) cancelAnimationFrame(animId);
        animId = null;
        if (currentGame && currentGame.stop) currentGame.stop(); // e.g. clears Snake's setInterval
        currentGame = null;
        clearCanvas();
    }

    function clearCanvas() {
        ctx.clearRect(0, 0, W, H);
    }

    function setHint(txt) {
        if (hintEl) hintEl.textContent = txt;
    }
    function setScore(s) { if (scoreEl) scoreEl.textContent = s; }
    function setLives(l) { if (livesEl) livesEl.textContent = l; }

    // ════════════════════════════════════════════════════════
    //  GAME 1: ASTEROIDS
    // ════════════════════════════════════════════════════════
    function buildAsteroids() {
        let ship, bullets, asteroids, particles, stars, score, lives;
        let over = false, spawnTimer = 0;

        function shuffle() {
            stars = [];
            for (let i = 0; i < 130; i++) {
                stars.push({
                    x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4,
                    a: Math.random() * 0.7 + 0.2, tw: Math.random() * Math.PI * 2
                });
            }
        }
        function makeShip() {
            return { x: W / 2, y: H / 2, vx: 0, vy: 0, angle: -Math.PI / 2, r: 14, inv: 120, cool: 0, thrust: false };
        }
        function spawnAst(n) {
            for (let i = 0; i < n; i++) {
                const side = Math.floor(Math.random() * 4);
                const pos = side === 0 ? { x: Math.random() * W, y: 0 } : side === 1 ? { x: W, y: Math.random() * H }
                    : side === 2 ? { x: Math.random() * W, y: H } : { x: 0, y: Math.random() * H };
                asteroids.push(makeAst(pos.x, pos.y, 3));
            }
        }
        function makeAst(x, y, tier) {
            const a = Math.random() * Math.PI * 2, spd = (4 - tier) * 0.6 + Math.random() * 1.2;
            const radius = tier === 3 ? 45 : tier === 2 ? 26 : 14;
            const pts = []; for (let i = 0; i < 9; i++) { const aa = (i / 9) * Math.PI * 2; pts.push({ a: aa, r: radius * (0.7 + Math.random() * 0.55) }); }
            return { x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, radius, tier, pts, rot: 0, rs: (Math.random() - .5) * 0.03 };
        }
        function explode(x, y, color, n) {
            for (let i = 0; i < n; i++) {
                const a = Math.random() * Math.PI * 2, s = Math.random() * 3 + 1;
                particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 40 + Math.random() * 30, ml: 70, size: Math.random() * 2.5 + .5, color });
            }
        }
        function wrap(o) { if (o.x < -60) o.x = W + 60; if (o.x > W + 60) o.x = -60; if (o.y < -60) o.y = H + 60; if (o.y > H + 60) o.y = -60; }
        function dst(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

        function resetGame() {
            over = false; score = 0; lives = 3; spawnTimer = 0;
            ship = makeShip(); bullets = []; asteroids = []; particles = []; shuffle(); spawnAst(5);
            setScore(score); setLives(lives);
        }

        function loop() {
            animId = requestAnimationFrame(loop);
            update(); draw();
        }

        function update() {
            if (over) { if (keys['Space'] || keys['Enter']) resetGame(); return; }
            const R = 0.055, T = 0.18, D = 0.988;
            if (keys['ArrowLeft'] || keys['KeyA']) ship.angle -= R;
            if (keys['ArrowRight'] || keys['KeyD']) ship.angle += R;
            ship.thrust = keys['ArrowUp'] || keys['KeyW'];
            if (ship.thrust) { ship.vx += Math.cos(ship.angle) * T; ship.vy += Math.sin(ship.angle) * T; }
            const spd = Math.hypot(ship.vx, ship.vy);
            if (spd > 7) { ship.vx = ship.vx / spd * 7; ship.vy = ship.vy / spd * 7; }
            ship.vx *= D; ship.vy *= D; ship.x += ship.vx; ship.y += ship.vy; wrap(ship);
            if (ship.inv > 0) ship.inv--;
            if (ship.cool > 0) ship.cool--;
            if (keys['Space'] && ship.cool === 0) {
                ship.cool = 14;
                bullets.push({
                    x: ship.x + Math.cos(ship.angle) * ship.r, y: ship.y + Math.sin(ship.angle) * ship.r,
                    vx: Math.cos(ship.angle) * 9 + ship.vx, vy: Math.sin(ship.angle) * 9 + ship.vy, life: 65
                });
            }
            bullets.forEach(b => { b.x += b.vx; b.y += b.vy; b.life--; wrap(b); });
            bullets = bullets.filter(b => b.life > 0);
            asteroids.forEach(a => { a.x += a.vx; a.y += a.vy; a.rot += a.rs; wrap(a); });
            spawnTimer++; if (spawnTimer > 280) { spawnTimer = 0; spawnAst(1 + Math.floor(score / 800)); }
            particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vx *= .96; p.vy *= .96; p.life--; });
            particles = particles.filter(p => p.life > 0);
            for (let bi = bullets.length - 1; bi >= 0; bi--) {
                for (let ai = asteroids.length - 1; ai >= 0; ai--) {
                    if (dst(bullets[bi], asteroids[ai]) < asteroids[ai].radius * .85) {
                        const a = asteroids[ai]; explode(a.x, a.y, '#a78bfa', a.tier * 6);
                        score += a.tier === 3 ? 20 : a.tier === 2 ? 50 : 100; setScore(score);
                        bullets.splice(bi, 1);
                        if (a.tier > 1) { asteroids.push(makeAst(a.x + 10, a.y, a.tier - 1)); asteroids.push(makeAst(a.x - 10, a.y, a.tier - 1)); }
                        asteroids.splice(ai, 1);
                        if (asteroids.length === 0) spawnAst(5 + Math.floor(score / 500));
                        break;
                    }
                }
            }
            if (ship.inv === 0) {
                for (let ai = asteroids.length - 1; ai >= 0; ai--) {
                    if (dst(ship, asteroids[ai]) < ship.r + asteroids[ai].radius * .75) {
                        explode(ship.x, ship.y, '#ef4444', 20); lives--; setLives(lives);
                        if (lives <= 0) { over = true; setHint('💀 Game Over! Space / Enter to restart'); return; }
                        ship = makeShip(); break;
                    }
                }
            }
        }

        function draw() {
            ctx.fillStyle = 'rgba(13,17,23,0.28)'; ctx.fillRect(0, 0, W, H);
            const now = Date.now() * .001;
            stars.forEach(s => {
                const a = s.a * (0.6 + 0.4 * Math.sin(now * .8 + s.tw));
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
            });
            asteroids.forEach(a => {
                ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot); ctx.beginPath();
                a.pts.forEach((p, i) => { const x = Math.cos(p.a) * p.r, y = Math.sin(p.a) * p.r; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
                ctx.closePath();
                ctx.strokeStyle = a.tier === 3 ? 'rgba(139,92,246,0.7)' : a.tier === 2 ? 'rgba(99,180,255,0.7)' : 'rgba(6,182,212,0.8)';
                ctx.lineWidth = 1.8; ctx.fillStyle = a.tier === 3 ? 'rgba(139,92,246,0.06)' : a.tier === 2 ? 'rgba(99,180,255,0.06)' : 'rgba(6,182,212,0.07)';
                ctx.fill(); ctx.stroke(); ctx.restore();
            });
            bullets.forEach(b => {
                ctx.beginPath(); ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = '#fbbf24'; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
            });
            particles.forEach(p => {
                ctx.globalAlpha = p.life / p.ml; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color; ctx.fill(); ctx.globalAlpha = 1;
            });
            if (!over && ship) {
                const vis = ship.inv === 0 || Math.floor(ship.inv / 6) % 2 === 0;
                if (vis) {
                    ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.angle);
                    if (ship.thrust) { ctx.beginPath(); ctx.moveTo(-12, -5); ctx.lineTo(-20 - Math.random() * 10, 0); ctx.lineTo(-12, 5); ctx.closePath(); ctx.fillStyle = `rgba(251,146,60,${.5 + Math.random() * .5})`; ctx.shadowColor = '#fb923c'; ctx.shadowBlur = 15; ctx.fill(); ctx.shadowBlur = 0; }
                    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -10); ctx.lineTo(-6, 0); ctx.lineTo(-10, 10); ctx.closePath();
                    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.8; ctx.fillStyle = 'rgba(139,92,246,0.18)'; ctx.shadowColor = '#818cf8'; ctx.shadowBlur = 12; ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
                    ctx.restore();
                }
            }
            if (over) {
                ctx.fillStyle = 'rgba(13,17,23,0.55)'; ctx.fillRect(0, 0, W, H);
                ctx.font = 'bold 3rem "Playfair Display",serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('GAME OVER', W / 2, H / 2);
                ctx.font = '1rem Outfit,sans-serif'; ctx.fillStyle = '#6b7280'; ctx.fillText('Score: ' + score, W / 2, H / 2 + 44); ctx.textAlign = 'start';
            }
        }

        return {
            start() { resetGame(); setHint('🚀 WASD · Space to shoot · 🎮 Switch Game above'); loop(); },
            onResize: shuffle
        };
    }

    // ════════════════════════════════════════════════════════
    //  GAME 2: SNAKE
    // ════════════════════════════════════════════════════════
    function buildSnake() {
        const SZ = 22; // Cell size
        let cols, rows, snake, dir, nextDir, food, score, over, ticker, interval;

        function init() {
            cols = Math.floor(W / SZ); rows = Math.floor(H / SZ);
            const mx = Math.floor(cols / 2), my = Math.floor(rows / 2);
            snake = [{ x: mx, y: my }, { x: mx - 1, y: my }, { x: mx - 2, y: my }];
            dir = { x: 1, y: 0 }; nextDir = { x: 1, y: 0 };
            score = 0; over = false; setScore(0); setLives('∞');
            placeFood();
        }
        function placeFood() {
            let f;
            do { f = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) }; }
            while (snake.some(s => s.x === f.x && s.y === f.y));
            food = f;
        }

        document.addEventListener('keydown', function snakeKeys(e) {
            if (e.code === 'ArrowUp' && dir.y === 0) nextDir = { x: 0, y: -1 };
            if (e.code === 'ArrowDown' && dir.y === 0) nextDir = { x: 0, y: 1 };
            if (e.code === 'ArrowLeft' && dir.x === 0) nextDir = { x: -1, y: 0 };
            if (e.code === 'ArrowRight' && dir.x === 0) nextDir = { x: 1, y: 0 };
            if (over && (e.code === 'Space' || e.code === 'Enter')) init();
        });

        function step() {
            if (over) return;
            dir = nextDir;
            const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
            // Wrap edges
            head.x = (head.x + cols) % cols; head.y = (head.y + rows) % rows;
            // Self collision
            if (snake.some(s => s.x === head.x && s.y === head.y)) { over = true; setHint('💀 Snake! Space / Enter to restart'); return; }
            snake.unshift(head);
            if (head.x === food.x && head.y === food.y) { score += 10; setScore(score); placeFood(); }
            else snake.pop();
        }

        function loop() {
            animId = requestAnimationFrame(loop);
            draw();
        }
        function draw() {
            ctx.fillStyle = 'rgba(13,17,23,0.4)'; ctx.fillRect(0, 0, W, H);
            // Grid dots
            for (let gx = 0; gx < cols; gx++) for (let gy = 0; gy < rows; gy++) {
                ctx.beginPath(); ctx.arc(gx * SZ + SZ / 2, gy * SZ + SZ / 2, 1, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill();
            }
            // Food
            const pulse = 0.7 + 0.3 * Math.sin(Date.now() * .005);
            ctx.shadowColor = '#34d399'; ctx.shadowBlur = 18 * pulse;
            ctx.fillStyle = '#34d399';
            const fx = food.x * SZ + SZ / 2, fy = food.y * SZ + SZ / 2;
            ctx.beginPath(); ctx.arc(fx, fy, SZ * 0.36 * pulse, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Snake
            snake.forEach((s, i) => {
                const frac = 1 - (i / snake.length) * 0.5;
                ctx.fillStyle = `rgba(52,211,153,${frac})`;
                ctx.shadowColor = '#34d399'; ctx.shadowBlur = i === 0 ? 12 : 0;
                ctx.beginPath(); ctx.roundRect(s.x * SZ + 2, s.y * SZ + 2, SZ - 4, SZ - 4, 4);
                ctx.fill(); ctx.shadowBlur = 0;
            });
            if (over) {
                ctx.fillStyle = 'rgba(13,17,23,0.6)'; ctx.fillRect(0, 0, W, H);
                ctx.font = 'bold 3rem "Playfair Display",serif'; ctx.fillStyle = '#34d399'; ctx.textAlign = 'center'; ctx.fillText('SNAKE!', W / 2, H / 2);
                ctx.font = '1rem Outfit'; ctx.fillStyle = '#6b7280'; ctx.fillText('Score: ' + score, W / 2, H / 2 + 44); ctx.textAlign = 'start';
            }
        }

        return {
            start() {
                init();
                interval = setInterval(step, 130);
                setHint('🐍 Arrows to steer · 🎮 Switch Game above');
                loop();
            },
            stop() { clearInterval(interval); }
        };
    }

    // ════════════════════════════════════════════════════════
    //  GAME 3: PONG  (fixed)
    // ════════════════════════════════════════════════════════
    function buildPong() {
        const PX = 28;          // player paddle x
        const PW = 14, PH = 90; // paddle size
        const BALL = 9;
        const SPD = 5.5;
        let py, ay, bx, by, bvx, bvy, playerScore, aiScore, over;
        let pongMy = null; // mouse y relative to canvas

        // Track mouse continuously (document-level, already attached above)
        // We read canvas._my which is set by the document mousemove listener

        function reset(dir) {
            bx = W / 2; by = H / 2;
            const angle = (Math.random() * 0.5 - 0.25);
            bvx = SPD * dir;
            bvy = SPD * Math.sin(angle);
        }

        function init() {
            py = H / 2 - PH / 2;
            ay = H / 2 - PH / 2;
            playerScore = 0; aiScore = 0; over = false;
            setScore('You 0 – 0 AI'); setLives('VS AI');
            reset(Math.random() > 0.5 ? 1 : -1);
        }

        function loop() {
            animId = requestAnimationFrame(loop);
            if (!over) update();
            draw();
        }

        function update() {
            if (over) {
                if (keys['Space'] || keys['Enter']) init();
                return;
            }

            // ── Player paddle (keyboard first, mouse overrides) ──
            if (keys['KeyW'] || keys['ArrowUp']) py = Math.max(0, py - 8);
            if (keys['KeyS'] || keys['ArrowDown']) py = Math.min(H - PH, py + 8);
            const my = canvas._my;
            if (my != null && typeof my === 'number') {
                py = Math.max(0, Math.min(H - PH, my - PH / 2));
            }

            // ── AI paddle ──
            const mid = ay + PH / 2;
            const speed = 5;
            if (mid < by - 6) ay = Math.min(H - PH, ay + speed);
            else if (mid > by + 6) ay = Math.max(0, ay - speed);

            // ── Ball ──
            bx += bvx; by += bvy;

            // Top / bottom walls
            if (by - BALL <= 0) { by = BALL; bvy = Math.abs(bvy); }
            if (by + BALL >= H) { by = H - BALL; bvy = -Math.abs(bvy); }

            // Player paddle (left)  — paddle right edge = PX + PW
            const leftEdge = PX + PW;
            if (bvx < 0 && bx - BALL <= leftEdge && bx - BALL >= PX && by >= py && by <= py + PH) {
                bx = leftEdge + BALL;
                bvx = Math.abs(bvx) * 1.05;
                bvy += ((by - (py + PH / 2)) / (PH / 2)) * 2.5;
                bvx = Math.min(bvx, 15);
            }

            // AI paddle (right) — paddle left edge = W - PX - PW
            const rightEdge = W - PX - PW;
            if (bvx > 0 && bx + BALL >= rightEdge && bx + BALL <= W - PX && by >= ay && by <= ay + PH) {
                bx = rightEdge - BALL;
                bvx = -Math.abs(bvx) * 1.03;
                bvy += ((by - (ay + PH / 2)) / (PH / 2)) * 2;
                bvx = Math.max(bvx, -15);
            }

            // Scoring
            if (bx + BALL < 0) {
                aiScore++;
                setScore('You ' + playerScore + ' – ' + aiScore + ' AI');
                if (aiScore >= 5) { over = true; setHint('AI wins 😅 · Space to restart'); return; }
                reset(1);
            }
            if (bx - BALL > W) {
                playerScore++;
                setScore('You ' + playerScore + ' – ' + aiScore + ' AI');
                if (playerScore >= 5) { over = true; setHint('🏆 You win! · Space to restart'); return; }
                reset(-1);
            }
        }

        function drawPad(x, y, c1, c2) {
            const g = ctx.createLinearGradient(x, y, x, y + PH);
            g.addColorStop(0, c1); g.addColorStop(1, c2);
            ctx.fillStyle = g;
            ctx.shadowColor = c1; ctx.shadowBlur = 20;
            ctx.beginPath(); ctx.roundRect(x, y, PW, PH, 6); ctx.fill();
            ctx.shadowBlur = 0;
        }

        function draw() {
            ctx.fillStyle = 'rgba(13,17,23,0.38)'; ctx.fillRect(0, 0, W, H);

            // Scores
            ctx.font = 'bold 3rem "Playfair Display",serif';
            ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.textAlign = 'center';
            ctx.fillText(playerScore, W / 2 - 80, 120);
            ctx.fillText(aiScore, W / 2 + 80, 120);
            ctx.textAlign = 'start';

            // Dashed center line
            ctx.setLineDash([12, 18]);
            ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
            ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 2; ctx.stroke();
            ctx.setLineDash([]);

            // Paddles
            drawPad(PX, py, '#818cf8', '#4f46e5');
            drawPad(W - PX - PW, ay, '#f87171', '#dc2626');

            // Ball + trail glow
            ctx.beginPath(); ctx.arc(bx, by, BALL, 0, Math.PI * 2);
            ctx.fillStyle = '#fff'; ctx.shadowColor = '#a5b4fc'; ctx.shadowBlur = 22; ctx.fill(); ctx.shadowBlur = 0;

            if (over) {
                ctx.fillStyle = 'rgba(13,17,23,0.6)'; ctx.fillRect(0, 0, W, H);
                ctx.font = 'bold 3rem "Playfair Display",serif';
                ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
                ctx.fillText(playerScore >= 5 ? '🏆 You Win!' : '😅 AI Wins', W / 2, H / 2);
                ctx.font = '1rem Outfit,sans-serif'; ctx.fillStyle = '#6b7280';
                ctx.fillText('Space / Enter to restart', W / 2, H / 2 + 44);
                ctx.textAlign = 'start';
            }
        }

        return {
            start() { init(); setHint('🏓 W/S or Mouse to move · First to 5 wins · 🎮 Switch above'); loop(); }
        };
    }

    // ════════════════════════════════════════════════════════
    //  GAME 4: BREAKOUT  (fixed)
    // ════════════════════════════════════════════════════════
    function buildBreakout() {
        const ROWS = 5, COLS = 10, BH = 22, GAP = 6, BALL_R = 9, PAD_H = 16;
        const COLORS = [
            ['#c4b5fd', '#7c3aed'], ['#93c5fd', '#1d4ed8'],
            ['#6ee7b7', '#059669'], ['#fcd34d', '#b45309'], ['#fca5a5', '#b91c1c']
        ];
        let bricks, bx, by, bvx, bvy, px, pw, score, lives, over, launched;

        function init() {
            score = 0; lives = 3; over = false; launched = false;
            setScore(0); setLives(3);
            pw = Math.max(110, W * 0.13);
            px = W / 2 - pw / 2;
            bx = W / 2; by = H - 120; bvx = 4.5; bvy = -5;
            const totalW = W - 60;
            const brickW = (totalW - (COLS - 1) * GAP) / COLS;
            bricks = [];
            for (let r = 0; r < ROWS; r++)
                for (let c = 0; c < COLS; c++)
                    bricks.push({ x: 30 + c * (brickW + GAP), y: 80 + r * (BH + GAP), w: brickW, h: BH, alive: true, row: r });
        }

        function loop() { animId = requestAnimationFrame(loop); if (!over) update(); draw(); }

        function update() {
            // Paddle control
            const mx = canvas._mx;
            if (mx != null && typeof mx === 'number') px = Math.max(0, Math.min(W - pw, mx - pw / 2));
            if (keys['KeyA'] || keys['ArrowLeft']) px = Math.max(0, px - 9);
            if (keys['KeyD'] || keys['ArrowRight']) px = Math.min(W - pw, px + 9);

            if (!launched) {
                bx = px + pw / 2; by = H - 120;
                if (keys['Space'] || keys['Enter']) launched = true;
                return;
            }

            // Restart after game over
            if (over) { if (keys['Space'] || keys['Enter']) init(); return; }

            bx += bvx; by += bvy;

            // Walls
            if (bx - BALL_R <= 0) { bx = BALL_R; bvx = Math.abs(bvx); }
            if (bx + BALL_R >= W) { bx = W - BALL_R; bvx = -Math.abs(bvx); }
            if (by - BALL_R <= 0) { by = BALL_R; bvy = Math.abs(bvy); }

            // Paddle collision
            const padTop = H - 120;
            if (bvy > 0 && by + BALL_R >= padTop && by - BALL_R <= padTop + PAD_H && bx >= px - BALL_R && bx <= px + pw + BALL_R) {
                by = padTop - BALL_R;
                bvy = -Math.abs(bvy);
                bvx += ((bx - (px + pw / 2)) / (pw / 2)) * 3;
                bvx = Math.max(-13, Math.min(13, bvx));
            }

            // Floor = life lost
            if (by - BALL_R > H) {
                lives--; setLives(lives);
                if (lives <= 0) { over = true; setHint('💀 Game Over · Space to restart'); return; }
                launched = false;
            }

            // Brick collision
            for (const b of bricks) {
                if (!b.alive) continue;
                const nearX = Math.max(b.x, Math.min(bx, b.x + b.w));
                const nearY = Math.max(b.y, Math.min(by, b.y + b.h));
                const dx = bx - nearX, dy = by - nearY;
                if (dx * dx + dy * dy < BALL_R * BALL_R) {
                    b.alive = false;
                    score += 10 * (ROWS - b.row); setScore(score);
                    // Determine which face was hit
                    const overlapX = (b.w / 2) - Math.abs(bx - (b.x + b.w / 2));
                    const overlapY = (b.h / 2) - Math.abs(by - (b.y + b.h / 2));
                    if (overlapX < overlapY) bvx = -bvx; else bvy = -bvy;
                    break;
                }
            }

            if (bricks.every(b => !b.alive)) { over = true; setHint('🏆 You WIN all bricks! · Space to restart'); }
        }

        function draw() {
            ctx.fillStyle = 'rgba(13,17,23,0.42)'; ctx.fillRect(0, 0, W, H);

            // Bricks
            bricks.forEach(b => {
                if (!b.alive) return;
                const [c1, c2] = COLORS[b.row];
                const g = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
                g.addColorStop(0, c1); g.addColorStop(1, c2);
                ctx.fillStyle = g; ctx.shadowColor = c1; ctx.shadowBlur = 7;
                ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 4); ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; ctx.stroke();
                ctx.shadowBlur = 0;
            });

            // Paddle
            const pg = ctx.createLinearGradient(px, H - 120, px, H - 120 + PAD_H);
            pg.addColorStop(0, '#a5b4fc'); pg.addColorStop(1, '#4f46e5');
            ctx.fillStyle = pg; ctx.shadowColor = '#818cf8'; ctx.shadowBlur = 18;
            ctx.beginPath(); ctx.roundRect(px, H - 120, pw, PAD_H, 8); ctx.fill(); ctx.shadowBlur = 0;

            // Ball
            ctx.beginPath(); ctx.arc(bx, by, BALL_R, 0, Math.PI * 2);
            ctx.fillStyle = '#fff'; ctx.shadowColor = '#c4b5fd'; ctx.shadowBlur = 22; ctx.fill(); ctx.shadowBlur = 0;

            // Launch hint
            if (!launched && !over) {
                ctx.font = '0.9rem Outfit,sans-serif'; ctx.fillStyle = 'rgba(165,180,252,0.6)';
                ctx.textAlign = 'center'; ctx.fillText('Space or Enter to launch', W / 2, H - 148); ctx.textAlign = 'start';
            }

            if (over) {
                ctx.fillStyle = 'rgba(13,17,23,0.62)'; ctx.fillRect(0, 0, W, H);
                ctx.font = 'bold 3rem "Playfair Display",serif'; ctx.textAlign = 'center';
                ctx.fillStyle = lives <= 0 ? '#f87171' : '#fcd34d';
                ctx.fillText(lives <= 0 ? 'GAME OVER' : 'YOU WIN! 🏆', W / 2, H / 2);
                ctx.font = '1rem Outfit,sans-serif'; ctx.fillStyle = '#6b7280';
                ctx.fillText('Score: ' + score + '  ·  Space to restart', W / 2, H / 2 + 44);
                ctx.textAlign = 'start';
            }
        }

        return {
            start() { init(); setHint('🧱 Mouse/A·D to move · Space to launch · 🎮 Switch above'); loop(); },
            onResize() { if (pw) { pw = Math.max(110, W * 0.13); px = W / 2 - pw / 2; } }
        };
    }

    // ── Tab awareness ─────────────────────────────────────────
    const origSwitch = window.switchTab;
    window.switchTab = function (tabId) {
        if (tabId !== 'home') {
            stopCurrentGame();
            pickerEl.classList.remove('hidden');
        }
        if (origSwitch) origSwitch(tabId);
    };

    // ── Start with idle stars — picker opens only on button click ──

})();
