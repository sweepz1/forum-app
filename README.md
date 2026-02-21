# Simple Node.js Forum

A minimal forum app using only Node.js and the built-in `http` module.

## Run locally

```bash
node server.js
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Let others see it

To put the forum online so anyone can visit it, see **[DEPLOY.md](DEPLOY.md)**. You'll push the code to GitHub and deploy to a free host like Render; they'll give you a link to share.

## What it does

- **GET /** – Serves the main page with a form (title + content) and a list of all posts.
- **POST /** – Accepts a new post from the form, adds it to an in-memory array, then redirects back to the main page so you see the updated list.

Posts are stored only in memory; they are lost when you stop the server (or when the host restarts the app on free tiers).
