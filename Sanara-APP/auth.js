/* SANARA — customer login with personal access codes (see access-codes.js and admin.html) */

/* In-app confirmation box. Used instead of the browser's confirm(), which some browsers
   (in-app browsers, mobile apps, blocked pop-ups) silently skip — that made Log out do nothing. */
function sanaraConfirm(message, onYes, yesLabel = "Yes") {
  document.querySelectorAll(".modal-back").forEach((m) => m.remove());
  const back = document.createElement("div");
  back.className = "modal-back";
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
      <img src="sanara-logo.webp" alt="">
      <p></p>
      <div class="row" style="justify-content:center">
        <button class="btn secondary" data-m="no">Cancel</button>
        <button class="btn" data-m="yes"></button>
      </div>
    </div>`;
  back.querySelector("p").textContent = message;
  back.querySelector('[data-m="yes"]').textContent = yesLabel;
  const close = () => { back.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  back.addEventListener("click", (e) => {
    const m = e.target.closest("[data-m]");
    if (e.target === back || (m && m.dataset.m === "no")) close();
    else if (m && m.dataset.m === "yes") { close(); onYes(); }
  });
  document.addEventListener("keydown", onKey);
  document.body.appendChild(back);
  back.querySelector('[data-m="yes"]').focus();
}

const AUTH = (() => {
  const SESSION = "sanara.session.v1";
  const LOCK = "sanara.lock.v1";
  let user = null;

  const normalize = (code) => String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^SANARA/, "");
  // The stored hashes are made from "sanara:SANARA-XXXX-XXXX-XXXX".
  const canonical = (code) => { const s = normalize(code); return s.length === 12 ? `SANARA-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}` : String(code || "").trim().toUpperCase(); };

  async function sha256(text) {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    return sha256js(text);
  }
  // Fallback for browsers without crypto.subtle
  function sha256js(text) {
    const K = [], H = [];
    const isPrime = (n) => { for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
    const frac = (x) => ((x - Math.floor(x)) * 4294967296) | 0;
    for (let n = 2, c = 0; c < 64; n++) if (isPrime(n)) { if (c < 8) H[c] = frac(Math.pow(n, 1 / 2)); K[c++] = frac(Math.pow(n, 1 / 3)); }
    const bytes = [...new TextEncoder().encode(text)], bitLen = bytes.length * 8;
    bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (bitLen >>> (i * 8)) & 0xff);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let off = 0; off < bytes.length; off += 64) {
      const w = new Array(64);
      for (let i = 0; i < 16; i++) w[i] = (bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16) | (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3];
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      [a, b, c, d, e, f, g, h].forEach((v, i) => (H[i] = (H[i] + v) | 0));
    }
    return H.map((v) => (v >>> 0).toString(16).padStart(8, "0")).join("");
  }

  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };

  // Backup owner login: works even if the customer list is empty, broken or offline, so the owner is never locked out.
  const OWNER_BACKUP = { customer: "Owner (you)", hash: "135b1dc9ae8a5979b8602f3cd0081c08208dde031d3c0eb87fe93fabed6b754b", role: "owner", active: true, expires: "" };
  const OWNER_CODE_KEY = "sanara.ownerCode";   // owner code kept for this browser session only (needed to save to Google Sheets)
  const listOk = () => typeof ACCESS_CODES !== "undefined" && Array.isArray(ACCESS_CODES) && ACCESS_CODES.length > 0;
  const isExpired = (e) => !!(e && e.expires && new Date(e.expires + "T23:59:59") < new Date());
  const cloudOn = () => typeof CLOUD !== "undefined" && CLOUD.on();

  // Local list (access-codes.js)
  function validEntry(hash) {
    const list = listOk() ? ACCESS_CODES : [];
    if (hash === OWNER_BACKUP.hash && !list.some((x) => x.hash === hash)) return OWNER_BACKUP;
    const entry = list.find((x) => x.hash === hash);
    if (!entry || entry.active === false) return null;
    if (isExpired(entry)) return { expired: true };
    return entry;
  }
  // Cloud list (Google Sheets) with local fallback when offline. Returns entry | {expired} | {offline} | null
  async function lookup(hash) {
    if (hash === OWNER_BACKUP.hash) return OWNER_BACKUP;
    if (!cloudOn()) return validEntry(hash);
    try {
      const e = await CLOUD.verify(hash);
      if (!e || e.active === false) return null;
      if (isExpired(e)) return { expired: true };
      return e;
    } catch (err) {
      const local = validEntry(hash);
      return local || { offline: true };
    }
  }
  const slim = (e) => ({ customer: e.customer, role: e.role === "owner" ? "owner" : "customer", expires: e.expires || "" });

  function renderLogin(message = "") {
    document.body.classList.add("locked");
    const lock = read(LOCK);
    const wait = lock && lock.until > Date.now() ? Math.ceil((lock.until - Date.now()) / 1000) : 0;
    document.getElementById("app").innerHTML = `
      <div class="login">
        <img src="sanara-logo.webp" alt="SANARA AI Tool logo">
        <h1>Welcome to <span class="wordmark-inline"><span>S</span><span>A</span><span>N</span><span>A</span><span>R</span><span>A</span></span></h1>
        <p class="muted">Enter the personal access code you received after your purchase.</p>
        ${listOk() || cloudOn() ? "" : `<div class="warn" style="text-align:left">⚠️ The customer list (<b>access-codes.js</b>) is empty or damaged, so customers can't log in right now. Owner: log in with your owner code → 👑 Owner to fix it.</div>`}
        <form id="login-form" class="login-form" autocomplete="off">
          <label for="code">Your access code</label>
          <input id="code" name="code" placeholder="SANARA-XXXX-XXXX-XXXX" spellcheck="false" ${wait ? "disabled" : ""}>
          <button class="btn" type="submit" ${wait ? "disabled" : ""}>🔓 Unlock SANARA</button>
          ${message ? `<div class="warn">${message}</div>` : ""}
          ${wait ? `<div class="warn">Too many tries. Please wait ${wait} seconds.</div>` : ""}
        </form>
        <p class="muted" style="font-size:.85rem">Lost your code? Contact the seller who sent it to you.</p>
      </div>`;
    const input = document.getElementById("code");
    if (input && !wait) input.focus();
    if (wait) setTimeout(() => renderLogin(), wait * 1000);
    document.getElementById("login-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = input.value;
      if (!code.trim()) return;
      const btn = e.target.querySelector("button"); btn.disabled = true; btn.textContent = "Checking…";
      const hash = await sha256("sanara:" + canonical(code));
      const entry = await lookup(hash);
      if (entry && !entry.expired && !entry.offline) {
        write(LOCK, null);
        write(SESSION, { hash, at: Date.now(), entry: slim(entry) });
        if (entry.role === "owner") { try { sessionStorage.setItem(OWNER_CODE_KEY, canonical(code)); } catch (err) { /* blocked */ } }
        start(onReady);
        return;
      }
      if (entry && entry.offline) return renderLogin("We can't reach the customer list right now. Please check your internet connection and try again.");
      const l = read(LOCK) || { fails: 0, until: 0 };
      l.fails += 1;
      if (l.fails >= 5) { l.until = Date.now() + 60000; l.fails = 0; }
      write(LOCK, l);
      renderLogin(entry && entry.expired ? "This access code has expired. Please contact the seller to renew it." : "That code didn't work. Please check it and try again.");
    });
  }

  function renderUserBar() {
    const bar = document.getElementById("userbar");
    if (!bar) return;
    bar.innerHTML = user ? `<span class="hello">Hi, ${String(user.customer).replace(/[<>&"]/g, "")}! 👋</span><button class="btn small ghost" id="logout">Log out</button>` : "";
    const btn = document.getElementById("logout");
    if (btn) btn.onclick = () => sanaraConfirm("Log out of SANARA? Your projects stay saved for the next time you log in.", logout, "Log out");
  }

  let onReady = () => {};
  const setUser = (entry, hash) => { user = { customer: entry.customer, hash, role: entry.role === "owner" ? "owner" : "customer" }; };
  function signedOut(message = "") { user = null; write(SESSION, null); try { sessionStorage.removeItem(OWNER_CODE_KEY); } catch (e) { /* blocked */ } renderUserBar(); renderLogin(message); }

  function start(cb) {
    onReady = cb;
    const s = read(SESSION);
    if (!s || !s.hash) { user = null; renderUserBar(); return renderLogin(); }

    if (!cloudOn()) {                                  // access-codes.js mode (checked instantly)
      const entry = validEntry(s.hash);
      if (!entry || entry.expired) return signedOut(entry && entry.expired ? "Your access code has expired. Please contact the seller to renew it." : "");
      setUser(entry, s.hash);
      document.body.classList.remove("locked"); renderUserBar(); cb();
      return;
    }

    // Google Sheets mode: open right away from the saved session, then re-check online in the background
    const cached = s.entry || (s.hash === OWNER_BACKUP.hash ? OWNER_BACKUP : null);
    if (cached) { setUser(cached, s.hash); document.body.classList.remove("locked"); renderUserBar(); cb(); }
    else document.getElementById("app").innerHTML = `<div class="login"><img src="sanara-logo.webp" alt=""><p class="muted">Checking your access…</p></div>`;
    lookup(s.hash).then((entry) => {
      if (entry && entry.offline) { if (!cached) renderLogin("We can't reach the customer list right now. Please check your internet connection and try again."); return; }
      if (!entry || entry.expired) return signedOut(entry && entry.expired ? "Your access code has expired. Please contact the seller to renew it." : "Your access has ended. Please contact the seller if you think this is a mistake.");
      const changed = !cached || cached.customer !== entry.customer || (cached.role || "customer") !== (entry.role === "owner" ? "owner" : "customer");
      write(SESSION, { ...s, entry: slim(entry), checked: Date.now() });
      if (changed) { setUser(entry, s.hash); document.body.classList.remove("locked"); renderUserBar(); cb(); }
    });
  }
  function logout() { write(SESSION, null); try { sessionStorage.removeItem(OWNER_CODE_KEY); } catch (e) { /* blocked */ } user = null; location.reload(); }

  return {
    start, logout, sha256, canonical,
    get user() { return user; },
    get ownerCode() { try { return sessionStorage.getItem(OWNER_CODE_KEY) || ""; } catch (e) { return ""; } },
    setOwnerCode(code) { try { sessionStorage.setItem(OWNER_CODE_KEY, canonical(code)); } catch (e) { /* blocked */ } },
    async isOwnerCode(code) { return (await sha256("sanara:" + canonical(code))) === OWNER_BACKUP.hash; },
    // Each customer's projects are saved separately on shared devices.
    get storeKey() { return user ? "sanara.projects.v1." + user.hash.slice(0, 16) : "sanara.projects.v1"; },
  };
})();
