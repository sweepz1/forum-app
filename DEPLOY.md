# Let others see your forum online

Your forum is a **Node.js server**. To let other people use it, you need to put it on a host that runs Node.js (not GitHub Pages — that only serves static files).

Here's a simple way using **Render** (free tier, no credit card):

---

## 1. Put your code on GitHub

1. Create a new repo on [github.com](https://github.com/new) (e.g. `my-forum`).
2. In a terminal, from your forum folder:

   ```bash
   cd C:\Users\febcc\forum-app
   git init
   git add .
   git commit -m "Initial forum app"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/my-forum.git
   git push -u origin main
   ```

   Replace `YOUR_USERNAME` and `my-forum` with your GitHub username and repo name.

**Or upload without Git:** Create the repo on GitHub, then click "uploading an existing file" and drag in `server.js`, `README.md`, and `DEPLOY.md` from this folder.

---

## 2. Deploy on Render

1. Go to [render.com](https://render.com) and sign up (free; you can use your GitHub account).
2. Click **New** → **Web Service**.
3. Connect your GitHub account if asked, then select the repo you just pushed (e.g. `my-forum`).
4. Render will detect Node.js. Set:
   - **Build Command:** leave blank (no package.json).
   - **Start Command:** `node server.js`
   - **Instance Type:** Free.
5. Click **Create Web Service**.

After a few minutes, Render will give you a URL like:

**https://my-forum-xxxx.onrender.com**

Share that link — anyone can open it and use the forum. Posts are stored in memory on Render's server (they'll reset if the app sleeps or restarts on the free tier).

---

## Other options

- **Railway** (railway.app) — Same idea: connect GitHub repo, set start command `node server.js`.
- **Cyclic** (cyclic.sh) — Free Node.js hosting; connect repo and deploy.

All of them need your code in a Git repo (e.g. GitHub) and the start command: **`node server.js`**.
