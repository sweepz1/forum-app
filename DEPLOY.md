/**
 * Simple Node.js Forum Server
 * Uses only the built-in 'http' module - no Express or other frameworks.
 * Run with: node server.js
 * Then open: http://localhost:3000
 */

const http = require("http");

// In-memory array to store all forum posts.
// Each post: { id, title, content, author, createdAt }
const posts = [];
let nextPostId = 1;

// Cookie names
const USERNAME_COOKIE = "forum_username";
const ADMIN_COOKIE = "forum_admin"; // Set only when admin logs in with correct password

// Admin password (only used when username is "admin")
const ADMIN_PASSWORD = "1Abcdeghfjsalskdj213474987@#@#%^@*&()(*&^%$#A";

// Blocked words/phrases for usernames and posts (case-insensitive, no slurs/NSFW)
const BLOCKED_WORDS = [
  "nigger", "nigga", "faggot", "fag", "retard", "retarded", "tranny",
  "n1gg", "n1gger", "n1gga", "fck", "fuk", "shit", "bitch", "asshole",
  "porn", "xxx", "nsfw", "dick", "cock", "pussy", "whore", "slut",
  "rape", "pedo", "pedophile", "nazi", "hitler",
];

// Use the port the host gives us (e.g. Render, Railway), or 3000 when running locally
const PORT = process.env.PORT || 3000;

/**
 * Returns true if text contains any blocked word (ignores case, checks normalized text).
 */
function containsBlockedContent(text) {
  if (!text || typeof text !== "string") return false;
  const normalized = text.toLowerCase().replace(/[0-9@]/g, "a").replace(/\s/g, "");
  const normalizedSpaced = " " + text.toLowerCase().replace(/[^a-z0-9\s]/g, " ") + " ";
  for (const word of BLOCKED_WORDS) {
    const normalizedWord = word.toLowerCase().replace(/[0-9@]/g, "a");
    if (normalized.includes(normalizedWord)) return true;
    if (normalizedSpaced.includes(" " + normalizedWord + " ")) return true;
  }
  return false;
}

/**
 * Reads a cookie value by name from the request.
 */
function getCookie(req, name) {
  const raw = req.headers.cookie || "";
  const match = raw.match(new RegExp(`${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

function getUsernameFromCookie(req) {
  return getCookie(req, USERNAME_COOKIE);
}

/**
 * True only if the user is signed in as "admin" and has passed the admin password check.
 */
function isAdmin(req) {
  return getCookie(req, USERNAME_COOKIE) === "admin" && getCookie(req, ADMIN_COOKIE) === "1";
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
    password: params.get("password") || "",
    postId: params.get("postId") || "",
  };
}

/**
 * Format a timestamp (ISO string or number) for display.
 */
function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return isNaN(d.getTime()) ? "" : d.toLocaleString();
}

/**
 * Builds the full HTML page: profile (username), post form, and list of all posts.
 * username can be null; errorMsg shows a moderation/error notice; isAdmin shows delete buttons.
 */
function getHtmlPage(username, errorMsg, isAdminUser) {
  const authorLabel = (p) => escapeHtml(p.author || "Anonymous");
  const errorBanner = errorMsg
    ? `<p class="error-msg">${escapeHtml(errorMsg)}</p>`
    : "";
  const postsHtml = posts
    .map(
      (p) => {
        const timeStr = formatTime(p.createdAt);
        const deleteBtn = isAdminUser && typeof p.id === "number"
          ? `<form method="POST" action="/delete" class="delete-form"><input type="hidden" name="postId" value="${escapeHtml(String(p.id))}"><button type="submit" class="btn-delete">Delete</button></form>`
          : "";
        return `
    <article class="post" data-post-id="${escapeHtml(String(p.id))}">
      <h3>${escapeHtml(p.title) || "(no title)"}</h3>
      <p class="post-meta">by ${authorLabel(p)}${timeStr ? " · " + escapeHtml(timeStr) : ""}</p>
      ${deleteBtn}
      <pre>${escapeHtml(p.content)}</pre>
    </article>`;
      }
    )
    .join("");

  const profileSection = username
    ? `<p class="profile">Signed in as <strong>${escapeHtml(username)}</strong>${isAdminUser ? ' <span class="badge-admin">(Admin)</span>' : ""}. <a href="/">Change username</a></p>
  <form method="POST" action="/set-username" class="inline-form">
    <input type="text" name="username" placeholder="New username" required>
    <label for="pw" class="inline-label">Password (only for admin):</label>
    <input type="password" id="pw" name="password" placeholder="Leave blank unless username is admin">
    <button type="submit">Change</button>
  </form>`
    : `<form method="POST" action="/set-username" class="profile-form">
    <label for="username">Set your username (no password)</label>
    <input type="text" id="username" name="username" placeholder="Your name" required>
    <label for="pw">Password (only if your username is &quot;admin&quot;)</label>
    <input type="password" id="pw" name="password" placeholder="Admin password">
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
    .post-meta { margin: 0 0 0.5rem; font-size: 0.9rem; color: #555; }
    .post pre { white-space: pre-wrap; margin: 0; }
    .delete-form { display: inline; margin-left: 0.5rem; }
    .btn-delete { margin: 0; padding: 0.2rem 0.5rem; font-size: 0.85rem; background: #c00; color: #fff; border: none; cursor: pointer; border-radius: 4px; }
    .badge-admin { background: #06c; color: #fff; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.85rem; }
    .inline-label { margin-top: 0; font-weight: normal; }
    .error-msg { background: #fee; color: #c00; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <h1>Simple Forum</h1>
  ${errorBanner}
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
    const err = url.searchParams.get("error");
    const errorMsg = err === "blocked"
      ? "That username or content isn't allowed. Please keep it appropriate."
      : err === "wrongpassword"
        ? "Wrong admin password."
        : null;
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(getHtmlPage(username, errorMsg, isAdmin(req)));
    return;
  }

  if (url.pathname === "/set-username" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk.toString(); });
    req.on("end", () => {
      const { username, password } = parseFormBody(body);
      const name = username.trim().slice(0, 100);
      if (containsBlockedContent(name)) {
        res.writeHead(302, { Location: "/?error=blocked" });
        res.end();
        return;
      }
      if (name.toLowerCase() === "admin") {
        if (password.trim() !== ADMIN_PASSWORD) {
          res.writeHead(302, { Location: "/?error=wrongpassword" });
          res.end();
          return;
        }
        res.writeHead(302, {
          Location: "/",
          "Set-Cookie": [
            `${USERNAME_COOKIE}=${encodeURIComponent(name)}; Path=/; Max-Age=31536000`,
            `${ADMIN_COOKIE}=1; Path=/; Max-Age=31536000`,
          ],
        });
        res.end();
        return;
      }
      const cookie = name
        ? `${USERNAME_COOKIE}=${encodeURIComponent(name)}; Path=/; Max-Age=31536000`
        : `${USERNAME_COOKIE}=; Path=/; Max-Age=0`;
      const clearAdmin = `${ADMIN_COOKIE}=; Path=/; Max-Age=0`;
      res.writeHead(302, { Location: "/", "Set-Cookie": [cookie, clearAdmin] });
      res.end();
    });
    return;
  }

  if (url.pathname === "/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk.toString(); });
    req.on("end", () => {
      if (!isAdmin(req)) {
        res.writeHead(302, { Location: "/" });
        res.end();
        return;
      }
      const { postId } = parseFormBody(body);
      const id = parseInt(postId, 10);
      if (!isNaN(id)) {
        const idx = posts.findIndex((p) => p.id === id);
        if (idx !== -1) posts.splice(idx, 1);
      }
      res.writeHead(302, { Location: "/" });
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
      const titleTrim = title.trim();
      const contentTrim = content.trim();
      if (containsBlockedContent(titleTrim) || containsBlockedContent(contentTrim)) {
        res.writeHead(302, { Location: "/?error=blocked" });
        res.end();
        return;
      }
      if (titleTrim || contentTrim) {
        const id = nextPostId++;
        posts.push({
          id,
          title: titleTrim,
          content: contentTrim,
          author,
          createdAt: Date.now(),
        });
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
