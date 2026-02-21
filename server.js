/**
 * Simple Node.js Forum Server
 * Uses only the built-in 'http' module - no Express or other frameworks.
 * Run with: node server.js
 * Then open: http://localhost:3000
 */

const http = require("http");

// In-memory array to store all forum posts.
// Each post is an object: { title: string, content: string, author: string }
const posts = [];

// Cookie name we use to remember the username (no password, just a display name)
const USERNAME_COOKIE = "forum_username";

// Use the port the host gives us (e.g. Render, Railway), or 3000 when running locally
const PORT = process.env.PORT || 3000;

/**
 * Reads the username from the Cookie header so we remember who is "signed in".
 * No password — we only store a display name in a cookie.
 */
function getUsernameFromCookie(req) {
  const raw = req.headers.cookie || "";
  const match = raw.match(new RegExp(`${USERNAME_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

/**
 * Parses URL-encoded form data from the request body.
 * When a form is submitted with method="POST", the data comes in the request body
 * in a format like: title=My+Title&content=My+content+here
 */
function parseFormBody(body) {
  const params = new URLSearchParams(body);
  return {
    title: params.get("title") || "",
    content: params.get("content") || "",
    username: params.get("username") || "",
  };
}

/**
 * Builds the full HTML page: profile (username), post form, and list of all posts.
 * username can be null if they haven't set one yet.
 */
function getHtmlPage(username) {
  const authorLabel = (p) => escapeHtml(p.author || "Anonymous");
  const postsHtml = posts
    .map(
      (p) => `
    <article class="post">
      <h3>${escapeHtml(p.title) || "(no title)"}</h3>
      <p class="post-author">by ${authorLabel(p)}</p>
      <pre>${escapeHtml(p.content)}</pre>
    </article>`
    )
    .join("");

  const profileSection = username
    ? `<p class="profile">Signed in as <strong>${escapeHtml(username)}</strong>. <a href="/">Change username</a></p>
  <form method="POST" action="/set-username" class="inline-form">
    <input type="text" name="username" placeholder="New username" required>
    <button type="submit">Change</button>
  </form>`
    : `<form method="POST" action="/set-username" class="profile-form">
    <label for="username">Set your username (no password)</label>
    <input type="text" id="username" name="username" placeholder="Your name" required>
    <button type="submit">Save username</button>
  </form>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Simple Forum</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 1rem; }
    h1 { margin-top: 0; }
    .profile, .profile-form { margin-bottom: 1.5rem; padding: 0.75rem; background: #f0f0f0; border-radius: 6px; }
    .inline-form { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
    .inline-form input { flex: 1; }
    label { display: block; margin-top: 0.75rem; font-weight: 600; }
    input, textarea { width: 100%; padding: 0.5rem; margin-top: 0.25rem; }
    textarea { min-height: 100px; resize: vertical; }
    button { margin-top: 1rem; padding: 0.5rem 1rem; cursor: pointer; }
    .posts { margin-top: 2rem; }
    .post { border: 1px solid #ccc; padding: 1rem; margin-bottom: 1rem; border-radius: 6px; }
    .post h3 { margin-top: 0; }
    .post-author { margin: 0 0 0.5rem; font-size: 0.9rem; color: #555; }
    .post pre { white-space: pre-wrap; margin: 0; }
  </style>
</head>
<body>
  <h1>Simple Forum</h1>
  <section class="profile">${profileSection}</section>
  <form method="POST" action="/">
    <label for="title">Post title</label>
    <input type="text" id="title" name="title" placeholder="Enter a title" required>
    <label for="content">Post content</label>
    <textarea id="content" name="content" placeholder="Write your post..." required></textarea>
    <button type="submit">Submit</button>
  </form>
  <section class="posts">
    <h2>Posts</h2>
    ${posts.length === 0 ? "<p>No posts yet. Be the first to post!</p>" : postsHtml}
  </section>
</body>
</html>`;
}

/**
 * Escapes HTML special characters so user input cannot inject script tags or break the page.
 */
function escapeHtml(text) {
  if (!text) return "";
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(text).replace(/[&<>"']/g, (c) => map[c]);
}

/**
 * This function runs every time the server receives a request.
 * req = request (URL, method, headers, body)
 * res = response (we use it to send back HTML or redirects)
 */
const server = http.createServer((req, res) => {
  // We only care about the path "/" for this simple app
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  if (url.pathname === "/" && req.method === "GET") {
    const username = getUsernameFromCookie(req);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(getHtmlPage(username));
    return;
  }

  if (url.pathname === "/set-username" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk.toString(); });
    req.on("end", () => {
      const { username } = parseFormBody(body);
      const name = username.trim().slice(0, 100);
      const cookie = name
        ? `${USERNAME_COOKIE}=${encodeURIComponent(name)}; Path=/; Max-Age=31536000`
        : `${USERNAME_COOKIE}=; Path=/; Max-Age=0`;
      res.writeHead(302, { Location: "/", "Set-Cookie": cookie });
      res.end();
    });
    return;
  }

  if (url.pathname === "/" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      const username = getUsernameFromCookie(req);
      const { title, content } = parseFormBody(body);
      const author = (username && username.trim()) || "Anonymous";
      if (title.trim() || content.trim()) {
        posts.push({ title: title.trim(), content: content.trim(), author });
      }
      res.writeHead(302, { Location: "/" });
      res.end();
    });
    return;
  }

  // Any other URL (e.g. /favicon.ico) gets a 404
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Forum server running at http://localhost:${PORT}`);
  console.log("Press Ctrl+C to stop.");
});
