/* SANARA — automatic customer list in Google Sheets (via a Google Apps Script web app).
 * When SANARA_CLOUD_URL (settings.js) is set, logins are checked against your Google Sheet and the
 * 👑 Owner menu saves changes there instantly. When it's empty, the app uses access-codes.js as before. */

const CLOUD = {
  url() { return (typeof SANARA_CLOUD_URL !== "undefined" && String(SANARA_CLOUD_URL || "").trim()) || ""; },
  on() { return /^https:\/\/script\.google(usercontent)?\.com\//.test(CLOUD.url()); },
  async verify(hash, url = CLOUD.url()) {
    const res = await fetch(`${url}?action=verify&hash=${encodeURIComponent(hash)}`, { cache: "no-store" });
    const j = await res.json();
    if (!j || j.ok !== true) throw new Error((j && j.error) || "bad response");
    return j.entry;
  },
  async ping(url) {
    const res = await fetch(`${url}?action=ping`, { cache: "no-store" });
    const j = await res.json();
    return !!(j && j.ok && j.app === "SANARA");
  },
  // Owner actions. Sent as text/plain so Google accepts it without a CORS preflight.
  async call(action, ownerCode, payload = {}) {
    const res = await fetch(CLOUD.url(), { method: "POST", body: JSON.stringify({ action, ownerCode, ...payload }) });
    const j = await res.json();
    if (!j || j.ok !== true) throw new Error((j && j.error) || "bad response");
    return j;
  },
};

/* The script you paste into Google Sheets → Extensions → Apps Script (Code.gs). */
const SHEETS_SCRIPT = String.raw`// SANARA AI Tool — customer logins saved in this Google Sheet.
// Paste this into Extensions → Apps Script, then Deploy → New deployment → Web app
// (Execute as: Me · Who has access: Anyone). Keep this sheet private — only you need access.

const SCRIPT_VERSION = 3;
const OWNER_HASH = "135b1dc9ae8a5979b8602f3cd0081c08208dde031d3c0eb87fe93fabed6b754b";
const SHEET_NAME = "Customers";
const HEAD = ["customer", "email", "hash", "expires", "active", "role", "added", "updated", "code", "emailed"];
const CODE_COL = 9;     // column I — the customer's access code, so you can check it quickly. Never sent to the public.
const EMAILED_COL = 10; // column J — when the welcome email was last sent

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) { sh.appendRow(HEAD); sh.setFrozenRows(1); }
  else {   // older sheets get the new columns
    if (String(sh.getRange(1, CODE_COL).getValue()) !== "code") sh.getRange(1, CODE_COL).setValue("code");
    if (String(sh.getRange(1, EMAILED_COL).getValue()) !== "emailed") sh.getRange(1, EMAILED_COL).setValue("emailed");
  }
  return sh;
}

/* ---------- Welcome email (sent from your own Gmail) ---------- */
function esc_(s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function sendWelcome_(name, email, code, appUrl, isNewCode) {
  email = String(email || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { sent: false, error: "no valid email address" };
  if (!code) return { sent: false, error: "no code saved for this customer" };
  if (MailApp.getRemainingDailyQuota() < 1) return { sent: false, error: "Gmail's daily email limit is reached — try again tomorrow" };
  const url = /^https:\/\//.test(String(appUrl || "")) ? String(appUrl) : "";
  const first = String(name || "there").trim().split(/\s+/)[0];
  const subject = isNewCode ? "Your new SANARA AI Tool access code" : "Welcome to SANARA AI Tool! Here's your access code 🎉";
  const intro = isNewCode ? "Here is your NEW personal access code. Your old code no longer works." : "Thank you for your purchase! Here is your personal access code:";
  const text = "Hi " + first + "!\n\n" + intro + "\n\n" + code + "\n\n" +
    (url ? "Open the app: " + url + "\nthen enter your code to start creating amazing kids products.\n\n" : "Open the SANARA app and enter your code to start creating amazing kids products.\n\n") +
    "Please keep your code private — it's just for you.\n\nHappy creating! 💚\nSANARA AI Tool";
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;background:#fff9ec;padding:24px">' +
    '<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:18px;padding:28px;border:1px solid #e3e9dc;text-align:center">' +
    (url ? '<img src="' + esc_(url) + '/sanara-logo-email.jpg" alt="SANARA AI Tool" width="140" style="width:140px;max-width:60%">' : "") +
    '<h2 style="color:#2d6a2e;margin:16px 0 8px">Hi ' + esc_(first) + '! 🎉</h2>' +
    '<p style="color:#23401f;font-size:16px;line-height:1.5">' + esc_(intro) + '</p>' +
    '<div style="font-family:Courier New,monospace;font-size:24px;font-weight:bold;letter-spacing:2px;background:#fff3c9;border-radius:12px;padding:14px;margin:16px 0;color:#23401f">' + esc_(code) + '</div>' +
    (url ? '<a href="' + esc_(url) + '" style="display:inline-block;background:#2d6a2e;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 26px;border-radius:999px">Open SANARA AI Tool</a>' +
           '<p style="color:#6b7d66;font-size:14px;margin-top:14px">Then enter your code to start creating amazing kids products.</p>' : "") +
    '<p style="color:#6b7d66;font-size:13px;margin-top:18px">Please keep your code private — it\'s just for you. 💚</p>' +
    '<p style="color:#2d6a2e;font-weight:bold;margin-top:18px">SANARA AI Tool<br><span style="font-weight:normal;color:#6b7d66">Simple Prompts. Amazing Kids Products.</span></p></div></div>';
  MailApp.sendEmail({ to: email, subject: subject, body: text, htmlBody: html, name: "SANARA AI Tool" });
  return { sent: true, to: email };
}
function canon_(code) {
  const c = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^SANARA/, "");
  return c.length === 12 ? "SANARA-" + c.slice(0, 4) + "-" + c.slice(4, 8) + "-" + c.slice(8) : "";
}
// Only keep a code if it really matches the customer's hash (so the sheet can't hold a wrong code)
function codeFor_(code, hash) { const c = canon_(code); return c && sha_("sanara:" + c) === hash ? c : ""; }
function day_(d) {
  if (!d) return "";
  if (Object.prototype.toString.call(d) === "[object Date]") return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
  return String(d).trim();
}
function isActive_(v) { const s = String(v).trim().toLowerCase(); return !(v === false || s === "false" || s === "no" || s === "off"); }
function rows_() {
  const v = sheet_().getDataRange().getValues(), out = [];
  for (let i = 1; i < v.length; i++) {
    const r = v[i];
    if (!r[2]) continue;
    out.push({ row: i + 1, customer: String(r[0]), email: String(r[1]).trim(), hash: String(r[2]).trim(), expires: day_(r[3]), active: isActive_(r[4]), added: day_(r[6]), code: String(r[CODE_COL - 1] || "").trim(), emailed: day_(r[EMAILED_COL - 1]) });
  }
  return out;
}
function sha_(text) {
  const b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return b.map(function (x) { const h = (x < 0 ? x + 256 : x).toString(16); return h.length === 1 ? "0" + h : h; }).join("");
}
function isOwner_(code) {
  const c = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^SANARA/, "");
  if (c.length !== 12) return false;
  return sha_("sanara:SANARA-" + c.slice(0, 4) + "-" + c.slice(4, 8) + "-" + c.slice(8)) === OWNER_HASH;
}
function out_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function today_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"); }

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === "verify") {
    const h = String(p.hash || "").trim();
    if (h === OWNER_HASH) return out_({ ok: true, entry: { customer: "Owner (you)", role: "owner", active: true, expires: "" } });
    const r = rows_().filter(function (x) { return x.hash === h; })[0];
    return out_({ ok: true, entry: r ? { customer: r.customer, role: "customer", active: r.active, expires: r.expires } : null });
  }
  return out_({ ok: true, app: "SANARA", version: SCRIPT_VERSION });
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: "bad request" }); }
  if (!isOwner_(body.ownerCode)) return out_({ ok: false, error: "not owner" });
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_(), now = today_();
    const find = function (h) { return rows_().filter(function (x) { return x.hash === h; })[0]; };
    const okHash = function (h) { return /^[0-9a-f]{64}$/.test(String(h || "")); };
    let mail = null;   // result of an email we tried to send (shown in the Owner menu)
    const mailTo = function (r, code, isNew) {
      try { mail = sendWelcome_(r.customer, r.email, code, body.appUrl, isNew); }
      catch (err) { mail = { sent: false, error: "Gmail couldn't send it (" + String(err.message || err).slice(0, 120) + ")" }; }
      if (mail.sent) sh.getRange(r.row, EMAILED_COL).setValue(now);
    };
    if (body.action === "add") {
      const x = body.entry || {};
      if (!okHash(x.hash)) return out_({ ok: false, error: "bad hash" });
      if (!find(x.hash)) sh.appendRow([x.customer || "", x.email || "", x.hash, x.expires || "", true, "customer", now, now, codeFor_(x.code, x.hash), ""]);
      if (body.sendEmail) { const r = find(x.hash); if (r) mailTo(r, r.code, false); }
    } else if (body.action === "email") {
      // Send (or re-send) the welcome email with the customer's current code
      const r = find(String(body.hash || ""));
      if (!r) return out_({ ok: false, error: "not found" });
      const code = r.code || codeFor_(body.code, r.hash);
      if (code && !r.code) sh.getRange(r.row, CODE_COL).setValue(code);
      mailTo(r, code, false);
    } else if (body.action === "import") {
      (body.entries || []).forEach(function (x) {
        if (okHash(x.hash) && x.hash !== OWNER_HASH && !find(x.hash)) sh.appendRow([x.customer || "", x.email || "", x.hash, x.expires || "", x.active !== false, "customer", x.added || now, now, codeFor_(x.code, x.hash)]);
      });
    } else if (body.action === "codes") {
      // Fill in codes for customers already in the sheet (only when the code matches their hash)
      const all = rows_();
      (body.codes || []).forEach(function (c) {
        const r = all.filter(function (x) { return x.hash === c.hash; })[0];
        const good = r && codeFor_(c.code, r.hash);
        if (good && !r.code) sh.getRange(r.row, CODE_COL).setValue(good);
      });
    } else if (body.action === "update") {
      const r = find(String(body.hash || ""));
      if (!r) return out_({ ok: false, error: "not found" });
      const ch = body.changes || {};
      if ("active" in ch) sh.getRange(r.row, 5).setValue(!!ch.active);
      if ("expires" in ch) sh.getRange(r.row, 4).setValue(ch.expires || "");
      if ("customer" in ch) sh.getRange(r.row, 1).setValue(ch.customer || "");
      if ("email" in ch) sh.getRange(r.row, 2).setValue(String(ch.email || "").trim());
      if (ch.newHash) {
        if (!okHash(ch.newHash)) return out_({ ok: false, error: "bad hash" });
        sh.getRange(r.row, 3).setValue(ch.newHash);
        sh.getRange(r.row, CODE_COL).setValue(codeFor_(ch.newCode, ch.newHash));   // the old code is replaced too
      }
      sh.getRange(r.row, 8).setValue(now);
      if (ch.newHash && body.sendEmail) { const r2 = find(ch.newHash); if (r2) mailTo(r2, r2.code, true); }
    } else if (body.action === "delete") {
      const r = find(String(body.hash || ""));
      if (r) sh.deleteRow(r.row);
    } else if (body.action !== "list") {
      return out_({ ok: false, error: "unknown action" });
    }
    // Owner-only answer (checked above), so it may include the codes
    const list = rows_().map(function (r) { return { customer: r.customer, email: r.email, hash: r.hash, expires: r.expires, active: r.active, added: r.added, code: r.code, emailed: r.emailed }; });
    return out_({ ok: true, version: SCRIPT_VERSION, list: list, email: mail, sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl() });
  } finally {
    lock.releaseLock();
  }
}
`;
