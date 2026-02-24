# 🌟 James Albertescuro — My Story

A personal portfolio / autobiography storyboard website by **James Albertescuro**.

🔗 **Live site:** `https://<your-username>.github.io/<your-repo-name>/`

---

## 📂 Project Structure

| File | Purpose |
|---|---|
| `kupal.html` | Main site (all tab content) |
| `index.html` | GitHub Pages entry point → redirects to kupal.html |
| `style.css` | All styles |
| `animation.js` | Tab switching & UI animations |
| `game.js` | Background mini-games (Asteroids, Snake, Pong, Breakout) |
| `storygame.js` | Life Story interactive panels + AI voice narration |
| `maze.js` | Maze gate system — solve to unlock each tab |
| `ads.js` | Self-promotional ad system (every 20s) |
| `music.js` | Per-tab ambient music player |
| `pixelwater.js` | Pixel water background effect |
| `*.mp3` | Background music tracks |
| `*.jpeg` | Photo assets |

---

## 🚀 How to Deploy to GitHub Pages

### Step 1 — Create a GitHub Repository
1. Go to [github.com](https://github.com) and sign in
2. Click **"New repository"** (top right `+` button)
3. Name it anything (e.g. `my-story` or `james-portfolio`)
4. Set it to **Public**
5. **Do NOT** check "Add README" (we already have one)
6. Click **"Create repository"**

### Step 2 — Install Git (if not already installed)
Download from: https://git-scm.com/download/win  
Run the installer with default settings, then restart your terminal.

### Step 3 — Push the project
Open **PowerShell** or **Git Bash** inside the `storyboard` folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
git push -u origin main
```

> Replace `<YOUR_USERNAME>` and `<YOUR_REPO_NAME>` with your actual GitHub username and repo name.

### Step 4 — Enable GitHub Pages
1. Go to your repo on GitHub
2. Click **Settings** (top tab bar)
3. Scroll down to **"Pages"** in the left sidebar
4. Under **"Branch"**, select `main` and folder `/` (root)
5. Click **Save**
6. Wait ~1 minute, then visit: `https://<your-username>.github.io/<your-repo-name>/`

---

## 🎮 Site Features

- **Maze Gate System** — Every tab requires solving a maze to enter (every time!)
- **Hide mechanic** — Step on 🫥 shadow spots to blind the zombie
- **Practice Mode** — 5 easy maps to learn before the real deal
- **Self-promo Ads** — Appear every 20 seconds (full-screen, rage-bait style)
- **Rage-bait maze music** — kups1–4 shuffle on every maze run
- **Per-tab ambient music** — Each tab has its own looping song
- **AI voice narration** — Life story panels read aloud (pauses during maze)

---

## 📝 Notes

- All `.mp3` and `.jpeg` files must stay in the **same folder** as `kupal.html`
- GitHub has a **100MB file size limit** per file. If any mp3 is larger, use [Git LFS](https://git-lfs.com/)
- The site uses no server-side code — it's fully static and works on GitHub Pages
