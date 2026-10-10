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

const SCRIPT_VERSION = 2;
const OWNER_HASH = "135b1dc9ae8a5979b8602f3cd0081c08208dde031d3c0eb87fe93fabed6b754b";
const SHEET_NAME = "Customers";
const HEAD = ["customer", "email", "hash", "expires", "active", "role", "added", "updated", "code"];
const CODE_COL = 9;   // column I — the customer's access code, so you can check it quickly. Never sent to customers.

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) { sh.appendRow(HEAD); sh.setFrozenRows(1); }
  else if (String(sh.getRange(1, CODE_COL).getValue()) !== "code") sh.getRange(1, CODE_COL).setValue("code");   // older sheets get the new column
  return sh;
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
    out.push({ row: i + 1, customer: String(r[0]), email: String(r[1]), hash: String(r[2]).trim(), expires: day_(r[3]), active: isActive_(r[4]), added: day_(r[6]), code: String(r[CODE_COL - 1] || "").trim() });
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
    if (body.action === "add") {
      const x = body.entry || {};
      if (!okHash(x.hash)) return out_({ ok: false, error: "bad hash" });
      if (!find(x.hash)) sh.appendRow([x.customer || "", x.email || "", x.hash, x.expires || "", true, "customer", now, now, codeFor_(x.code, x.hash)]);
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
      if (ch.newHash) {
        if (!okHash(ch.newHash)) return out_({ ok: false, error: "bad hash" });
        sh.getRange(r.row, 3).setValue(ch.newHash);
        sh.getRange(r.row, CODE_COL).setValue(codeFor_(ch.newCode, ch.newHash));   // the old code is replaced too
      }
      sh.getRange(r.row, 8).setValue(now);
    } else if (body.action === "delete") {
      const r = find(String(body.hash || ""));
      if (r) sh.deleteRow(r.row);
    } else if (body.action !== "list") {
      return out_({ ok: false, error: "unknown action" });
    }
    // Owner-only answer (checked above), so it may include the codes
    const list = rows_().map(function (r) { return { customer: r.customer, email: r.email, hash: r.hash, expires: r.expires, active: r.active, added: r.added, code: r.code }; });
    return out_({ ok: true, version: SCRIPT_VERSION, list: list, sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl() });
  } finally {
    lock.releaseLock();
  }
}
`;
