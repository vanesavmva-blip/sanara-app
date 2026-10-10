/* SANARA — 👑 Owner menu: create and manage customer logins (owner code only).
 *
 * How saving works: the customer list lives in access-codes.js. Changes made here are kept as a draft on
 * this device until you press “Save”. In Chrome/Edge, Save writes straight into your access-codes.js file;
 * in other browsers it downloads a new access-codes.js for you to put in the SANARA App folder.
 * Real codes are never written to the file — only their hash. Codes you create are remembered on THIS device
 * only (so you can copy them again later). */

const OWNER_DRAFT = "sanara.owner.draft.v1";
let ownerState = { search: "", last: null, saved: false };

const stripLocal = (x) => { const { _code, ...rest } = x; return rest; };
const sameList = (a, b) => JSON.stringify(a.map(stripLocal)) === JSON.stringify(b.map(stripLocal));
function ownerDraft() {
  const fileList = (typeof ACCESS_CODES !== "undefined" ? ACCESS_CODES : []).map((x) => ({ ...x }));
  let d = null;
  try { d = JSON.parse(localStorage.getItem(OWNER_DRAFT)); } catch (e) { d = null; }
  if (!d || !Array.isArray(d.list)) d = { list: fileList, dirty: false };
  if (d.dirty && sameList(d.list, fileList)) d.dirty = false;            // the file now matches → saved
  if (!d.dirty && fileList.length) {                                       // follow the file, keep remembered codes
    const codes = Object.fromEntries(d.list.filter((x) => x._code).map((x) => [x.hash, x._code]));
    d.list = fileList.map((x) => (codes[x.hash] ? { ...x, _code: codes[x.hash] } : x));
  }
  if (!fileList.length) d.dirty = true;                                    // file empty/broken → needs saving
  // Safety: the owner must ALWAYS be in the list, so saving can never lock you out
  if (!d.list.some((x) => x.role === "owner") && AUTH.user && AUTH.user.role === "owner") {
    d.list.unshift({ customer: "Owner (you)", email: "", hash: AUTH.user.hash, expires: "", active: true, role: "owner", added: today() });
  }
  return d;
}
function saveDraft(d) { try { localStorage.setItem(OWNER_DRAFT, JSON.stringify(d)); } catch (e) { /* storage blocked */ } }
function newAccessCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";   // no 0/O or 1/I/L
  const b = crypto.getRandomValues(new Uint8Array(12));
  const s = [...b].map((x) => chars[x % chars.length]).join("");
  return `SANARA-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}
const today = () => new Date().toISOString().slice(0, 10);
const statusOf = (x) => (x.active === false ? "off" : x.expires && new Date(x.expires + "T23:59:59") < new Date() ? "expired" : "active");
function welcomeMessage(name, code) {
  const url = typeof SANARA_APP_URL !== "undefined" && SANARA_APP_URL ? SANARA_APP_URL : "";
  return `Hi ${name}! 🎉 Thank you for your purchase.\n\nYour personal SANARA AI Tool access code is:\n${code}\n\n${url ? `Open the app here: ${url}\nthen` : "Open the SANARA app and"} enter this code to start creating amazing kids products.\nPlease keep your code private — it's just for you. 💚\n\nHappy creating!`;
}
function accessFileText(list) {
  const lines = list.map((x) => {
    const e = stripLocal(x);
    return `  { customer: ${JSON.stringify(e.customer || "")}, email: ${JSON.stringify(e.email || "")}, hash: "${e.hash}", expires: ${JSON.stringify(e.expires || "")}, active: ${e.active !== false}${e.role === "owner" ? ', role: "owner"' : ""}, added: ${JSON.stringify(e.added || "")} },`;
  });
  return `/* SANARA — customer access list
 *
 * Manage customers inside the app: log in with your OWNER code → 👑 Owner menu.
 * Only a scrambled fingerprint (hash) of each code is stored here, so nobody can read the real codes from this file.
 * role: "owner" unlocks the Owner menu. Every other entry is a customer.
 * Last saved from the Owner menu: ${new Date().toLocaleString()}
 */
const ACCESS_CODES = [
${lines.join("\n")}
];
`;
}

function renderOwnerFile() {
  const d = ownerDraft(); saveDraft(d);
  const list = d.list;
  const customers = list.filter((x) => x.role !== "owner");
  const q = ownerState.search.trim().toLowerCase();
  const shown = list.filter((x) => !q || `${x.customer} ${x.email}`.toLowerCase().includes(q));
  const count = (s) => customers.filter((x) => statusOf(x) === s).length;
  const last = ownerState.last;
  const row = (x) => {
    const i = list.indexOf(x), st = statusOf(x), own = x.role === "owner";
    return `<div class="cust ${st}">
      <div class="cust-main">
        <b>${esc(x.customer)}</b> ${own ? '<span class="pill yellow">👑 Owner</span>' : ""}
        <span class="pill ${st === "active" ? "" : st === "expired" ? "pink" : "purple"}">${st === "active" ? "✅ Active" : st === "expired" ? "⌛ Expired" : "⛔ Turned off"}</span>
        <div class="muted" style="font-size:.85rem">${x.email ? esc(x.email) + " · " : ""}Added ${esc(x.added || "—")}${x._code ? ` · Code: <span class="code-mini">${esc(x._code)}</span>` : ""}</div>
      </div>
      <div class="cust-actions">
        <label class="muted" style="font-size:.8rem">Expires <input type="date" data-oinput="expires" data-i="${i}" value="${esc(x.expires || "")}"></label>
        ${x._code ? `<button class="copy" data-copy="${esc(welcomeMessage(x.customer, x._code))}">Copy message</button>` : ""}
        ${own ? "" : `<button class="btn small secondary" data-oact="toggle" data-i="${i}">${x.active === false ? "Turn on" : "Turn off"}</button>`}
        <button class="btn small ghost" data-oact="newcode" data-i="${i}">New code</button>
        ${own ? "" : `<button class="btn small ghost" data-oact="delete" data-i="${i}">Delete</button>`}
      </div>
    </div>`;
  };
  return `<h1>👑 Owner — Customer Logins</h1>
  <p class="muted">Only you can see this page (owner code). Create a code for each customer who buys access, then send them the welcome message.</p>
  ${cloudSetupCard()}

  ${d.dirty ? `<div class="card unsaved"><div class="row"><div><b>⚠️ You have unsaved changes.</b><br><span class="muted">New codes won't work until you save them into <code>access-codes.js</code>.</span></div><span class="spacer"></span>
      <button class="btn pink" data-oact="save">💾 Save customer list</button><button class="btn small ghost" data-oact="discard">Discard changes</button></div></div>` : ""}
  ${ownerState.saved ? `<div class="card saved-box"><b>✅ Saved!</b> ${ownerState.saved === "file" ? "Your <code>access-codes.js</code> was updated." : "A new <code>access-codes.js</code> was downloaded — put it in your SANARA App folder (replace the old one)."}
      <ol class="steps" style="margin-top:6px">${ownerState.saved === "file" ? "" : "<li>Move the downloaded <b>access-codes.js</b> into your SANARA App folder and replace the old file.</li>"}<li>If your app is online, upload the new <b>access-codes.js</b> to your website too.</li><li>Tap <b>Reload app</b> so the new codes start working.</li></ol>
      <button class="btn small" data-oact="reload">🔄 Reload app</button></div>` : ""}

  <div class="grid cols-3" style="margin-bottom:14px">
    <div class="card stat"><span class="num-big">${customers.length}</span>customers</div>
    <div class="card stat"><span class="num-big" style="color:var(--green)">${count("active")}</span>active</div>
    <div class="card stat"><span class="num-big" style="color:var(--pink)">${count("expired") + count("off")}</span>expired or turned off</div>
  </div>

  <form class="card" data-oform="add">
    <h2>➕ Create a customer login</h2>
    <div class="grid cols-3">
      <div class="field"><label for="o-name">Customer name *</label><input id="o-name" name="name" placeholder="e.g. Maria Santos" required></div>
      <div class="field"><label for="o-email">Email (optional)</label><input id="o-email" name="email" type="email" placeholder="maria@example.com"></div>
      <div class="field"><label for="o-exp">Access ends on (optional)</label><input id="o-exp" name="expires" type="date"></div>
    </div>
    <div class="row" style="margin-top:12px"><button class="btn" type="submit">✨ Create login code</button><span class="muted" style="font-size:.88rem">Leave the end date empty for lifetime access.</span></div>
  </form>

  ${last ? `<div class="card new-code">
    <h2>🎉 Login created for ${esc(last.name)}</h2>
    <div class="code-out">${esc(last.code)}</div>
    <div class="row" style="justify-content:center">${`<button class="copy" data-copy="${esc(last.code)}">Copy code</button>`}${`<button class="copy" data-copy="${esc(welcomeMessage(last.name, last.code))}">Copy welcome message</button>`}</div>
    <details style="margin-top:10px"><summary class="muted" style="cursor:pointer">See the welcome message</summary><div class="prompt-box">${esc(welcomeMessage(last.name, last.code))}</div></details>
    <p class="muted" style="margin-top:8px">Next: tap <b>💾 Save customer list</b> above, then send the message (Gumroad/Etsy delivery note, email or chat).</p>
  </div>` : ""}

  <div class="card">
    <div class="row"><h2 style="margin:0">👥 Customers</h2><span class="spacer"></span><input class="search" data-oinput="search" value="${esc(ownerState.search)}" placeholder="🔎 Search name or email"></div>
    <div style="margin-top:12px">${shown.length ? shown.map(row).join("") : `<p class="muted">No customers found.</p>`}</div>
  </div>

  <div class="card">
    <h3>ℹ️ Good to know</h3>
    <ul>
      <li><b>Turn off</b> stops a customer's access (for refunds or sharing). <b>Turn on</b> gives it back. <b>New code</b> replaces a lost or shared code — the old one stops working.</li>
      <li>Codes are remembered only on this device so you can copy them again. The <code>access-codes.js</code> file keeps only scrambled fingerprints.</li>
      <li>After every change: <b>Save</b> → (if online) upload <code>access-codes.js</code> to your website → <b>Reload</b>.</li>
      <li>Keep your owner code private — whoever has it can open this page.</li>
    </ul>
  </div>`;
}

async function ownerSave() {
  const d = ownerDraft();
  const text = accessFileText(d.list);
  if (!d.list.some((x) => x.role === "owner") || !/const ACCESS_CODES = \[/.test(text)) { toast("Something's wrong with the list — nothing was saved"); return; }
  try {
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({ suggestedName: "access-codes.js", types: [{ description: "SANARA access list", accept: { "text/javascript": [".js"] } }] });
      const w = await handle.createWritable(); await w.write(text); await w.close();
      ownerState.saved = "file";
    } else {
      download("access-codes.js", text, "text/javascript"); ownerState.saved = "download";
    }
    toast("Customer list saved 💾");
  } catch (e) {
    if (e && e.name === "AbortError") return;                // the owner closed the save window
    download("access-codes.js", text, "text/javascript"); ownerState.saved = "download";
  }
  render();
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-oact]");
  if (!b || !AUTH.user || AUTH.user.role !== "owner" || CLOUD.on()) return;
  const d = ownerDraft(), i = +b.dataset.i, x = d.list[i];
  switch (b.dataset.oact) {
    case "toggle": x.active = x.active === false; d.dirty = true; saveDraft(d); render(); toast(x.active ? `${x.customer} turned on` : `${x.customer} turned off`); break;
    case "delete":
      sanaraConfirm(`Delete ${x.customer}? Their code will stop working after you save.`, () => { d.list.splice(i, 1); d.dirty = true; saveDraft(d); render(); }, "Delete");
      break;
    case "newcode":
      sanaraConfirm(`Make a new code for ${x.customer}? The old code will stop working after you save.`, async () => {
        const code = newAccessCode();
        x.hash = await AUTH.sha256("sanara:" + code); x._code = code; d.dirty = true; saveDraft(d);
        ownerState.last = { name: x.customer, code }; render(); window.scrollTo(0, 0);
      }, "New code");
      break;
    case "save": ownerSave(); break;
    case "discard": sanaraConfirm("Discard all unsaved changes?", () => { localStorage.removeItem(OWNER_DRAFT); ownerState.last = null; render(); }, "Discard"); break;
    case "reload": location.reload(); break;
  }
});
document.addEventListener("submit", async (e) => {
  const f = e.target.closest("[data-oform]");
  if (!f || !AUTH.user || AUTH.user.role !== "owner" || CLOUD.on()) return;
  e.preventDefault();
  const val = (n) => (f.elements.namedItem(n) ? f.elements.namedItem(n).value.trim() : "");
  const name = val("name");
  if (!name) { toast("Please type the customer's name"); return; }
  const code = newAccessCode();
  const d = ownerDraft();
  d.list.push({ customer: name, email: val("email"), hash: await AUTH.sha256("sanara:" + code), expires: val("expires"), active: true, added: today(), _code: code });
  d.dirty = true; saveDraft(d);
  ownerState.last = { name, code }; ownerState.saved = false;
  render(); toast(`Login created for ${name} ✨`);
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.dataset.oinput !== "expires" || !AUTH.user || AUTH.user.role !== "owner" || CLOUD.on()) return;
  const d = ownerDraft(); d.list[+t.dataset.i].expires = t.value; d.dirty = true; saveDraft(d); render();
});
document.addEventListener("input", (e) => {
  if (e.target.dataset.oinput !== "search") return;
  ownerState.search = e.target.value; render();
  const s = document.querySelector('[data-oinput="search"]'); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
});


/* =====================================================================
 * ☁️ Google Sheets mode — every change saves automatically & instantly
 * ===================================================================== */
const OWNER_CODES = "sanara.owner.codes.v1";   // codes you created, remembered on this device only
let cloudState = { list: null, loading: false, error: "", sheetUrl: "", busy: false, test: null, version: 0 };

const knownCodes = () => {
  let m = {};
  try { m = JSON.parse(localStorage.getItem(OWNER_CODES)) || {}; } catch (e) { m = {}; }
  try { (JSON.parse(localStorage.getItem(OWNER_DRAFT)) || { list: [] }).list.forEach((x) => { if (x._code && x.hash && !m[x.hash]) m[x.hash] = x._code; }); } catch (e) { /* no draft */ }
  return m;
};
const rememberCode = (hash, code) => { const m = knownCodes(); m[hash] = code; try { localStorage.setItem(OWNER_CODES, JSON.stringify(m)); } catch (e) { /* blocked */ } };

function renderOwner() { return CLOUD.on() ? renderOwnerCloud() : renderOwnerFile(); }

function cloudSetupCard() {
  const t = cloudState.test;
  return `<details class="card cloud-setup" ${t ? "open" : ""}>
    <summary><b>☁️ Turn on automatic saving (Google Sheets)</b> — no more saving or replacing files <span class="pill yellow">Recommended · free · 10 minutes once</span></summary>
    <p style="margin-top:10px">Your customer list will live in a private Google Sheet in <b>your</b> Google account. New logins work instantly for every customer, anywhere.</p>
    <ol class="steps">
      <li>Open <a href="https://sheets.new" target="_blank" rel="noopener">sheets.new</a> (a new Google Sheet). Name it <b>SANARA Customers</b>.</li>
      <li>In the sheet menu: <b>Extensions → Apps Script</b>.</li>
      <li>Delete everything in the editor, then paste the SANARA script: ${copyBtn(SHEETS_SCRIPT, "Copy the SANARA script")}</li>
      <li>Click the 💾 <b>Save</b> icon. (You can name the project <b>SANARA Logins</b>.)</li>
      <li>Click <b>Deploy → New deployment</b> → the ⚙️ gear → <b>Web app</b>. Set <b>Execute as: Me</b> and <b>Who has access: Anyone</b> → <b>Deploy</b>.</li>
      <li>Google asks for permission: <b>Authorize access</b> → pick your account → <b>Advanced</b> → <b>Go to SANARA Logins</b> → <b>Allow</b>. (Google shows this warning for every personal script — it's your own.)</li>
      <li>Copy the <b>Web app URL</b> (it ends with <code>/exec</code>) and paste it here:</li>
    </ol>
    <form class="text-answer" data-cform="test"><input name="url" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(t ? t.url : "")}" autocomplete="off"><button class="btn" type="submit">Test connection</button></form>
    ${t && t.ok ? `<div class="saved-box card" style="margin-top:12px"><b>✅ Connected!</b> Last step (one time only): open <b>settings.js</b> in your SANARA App folder and replace the line <code>const SANARA_CLOUD_URL = "";</code> with:
        <div class="prompt-box" style="margin-top:8px">${copyBtn(`const SANARA_CLOUD_URL = "${t.url}";`, "Copy line")}${esc(`const SANARA_CLOUD_URL = "${t.url}";`)}</div>
        Save the file and reload the app. (Or just send this link to Claude and it will add it for you.) If your app is online, upload <b>settings.js</b> once.</div>` : ""}
    ${t && t.ok === false ? `<div class="warn">❌ ${esc(t.msg)}</div>` : ""}
  </details>`;
}

async function cloudLoad(action = "list", payload = {}, okMsg = "") {
  const code = AUTH.ownerCode;
  if (!code) return;
  cloudState.loading = true; cloudState.error = "";
  try {
    const j = await CLOUD.call(action, code, payload);
    cloudState.list = j.list || []; cloudState.version = j.version || 1; cloudState.sheetUrl = j.sheetUrl || cloudState.sheetUrl;
    if (okMsg) toast(okMsg);
  } catch (e) {
    cloudState.error = /not owner/.test(e.message) ? "Your owner code wasn't accepted by the Google Sheet." : "Couldn't reach your Google Sheet. Check your internet connection and tap Refresh.";
    if (/not owner/.test(e.message)) AUTH.setOwnerCode("");
  }
  cloudState.loading = false; cloudState.busy = false;
  if (view === "owner") render();
}

function renderOwnerCloud() {
  if (!AUTH.ownerCode) {
    return `<h1>👑 Owner — Customer Logins</h1>
      <form class="card" data-cform="ownercode" style="max-width:520px"><h3>🔐 Confirm it's you</h3>
        <p class="muted">Type your owner code once to manage customers in your Google Sheet. It's kept only until you close this browser.</p>
        <div class="text-answer"><input name="code" placeholder="SANARA-XXXX-XXXX-XXXX" autocomplete="off"><button class="btn" type="submit">Continue</button></div></form>`;
  }
  if (!cloudState.list && !cloudState.loading && !cloudState.error) { cloudState.loading = true; setTimeout(() => cloudLoad(), 0); }
  const list = cloudState.list || [];
  const codes = knownCodes();
  const q = ownerState.search.trim().toLowerCase();
  const shown = list.filter((x) => !q || `${x.customer} ${x.email}`.toLowerCase().includes(q));
  const count = (s) => list.filter((x) => statusOf(x) === s).length;
  const local = (typeof ACCESS_CODES !== "undefined" ? ACCESS_CODES : []).concat(ownerDraft().list).filter((x) => x.role !== "owner" && x.hash && !list.some((y) => y.hash === x.hash));
  const toImport = [...new Map(local.map((x) => [x.hash, x])).values()];
  const last = ownerState.last;
  const row = (x) => {
    const st = statusOf(x), code = x.code || codes[x.hash];
    return `<div class="cust ${st}">
      <div class="cust-main"><b>${esc(x.customer)}</b>
        <span class="pill ${st === "active" ? "" : st === "expired" ? "pink" : "purple"}">${st === "active" ? "✅ Active" : st === "expired" ? "⌛ Expired" : "⛔ Turned off"}</span>
        <div class="muted" style="font-size:.85rem">${x.email ? esc(x.email) + " · " : ""}Added ${esc(x.added || "—")}${code ? ` · Code: <span class="code-mini">${esc(code)}</span>` : ""}</div></div>
      <div class="cust-actions">
        <label class="muted" style="font-size:.8rem">Expires <input type="date" data-cinput="expires" data-h="${esc(x.hash)}" value="${esc(x.expires || "")}"></label>
        ${code ? `<button class="copy" data-copy="${esc(welcomeMessage(x.customer, code))}">Copy message</button>` : ""}
        <button class="btn small secondary" data-cact="toggle" data-h="${esc(x.hash)}">${x.active === false ? "Turn on" : "Turn off"}</button>
        <button class="btn small ghost" data-cact="newcode" data-h="${esc(x.hash)}">New code</button>
        <button class="btn small ghost" data-cact="delete" data-h="${esc(x.hash)}">Delete</button>
      </div></div>`;
  };
  return `<h1>👑 Owner — Customer Logins</h1>
  <div class="card saved-box"><div class="row"><div><b>☁️ Automatic saving is ON.</b> Every change saves to your Google Sheet instantly and works for customers right away — nothing else to do.</div><span class="spacer"></span>
    ${cloudState.sheetUrl ? `<a class="btn small secondary" href="${esc(cloudState.sheetUrl)}" target="_blank" rel="noopener">📊 Open my Google Sheet</a>` : ""}<button class="btn small ghost" data-cact="refresh">↻ Refresh</button></div></div>
  ${cloudState.error ? `<div class="warn">⚠️ ${esc(cloudState.error)}</div>` : ""}
  ${cloudState.loading && !cloudState.list ? `<div class="card"><p class="muted">Loading your customers from Google Sheets…</p></div>` : ""}
  ${cloudState.list && cloudState.version < 2 ? `<div class="card unsaved"><b>🆕 Update your Google Sheet script to see each customer's code in the sheet.</b>
    <ol class="steps" style="margin-top:6px">
      <li>Open your Google Sheet → <b>Extensions → Apps Script</b>.</li>
      <li>Select everything in the editor and delete it, then paste the new script: ${copyBtn(SHEETS_SCRIPT, "Copy the new SANARA script")} → click 💾 <b>Save</b>.</li>
      <li><b>Deploy → Manage deployments</b> → click the ✏️ <b>pencil</b> → <b>Version: New version</b> → <b>Deploy</b>. (Use Manage deployments, not New deployment, so your link stays the same.)</li>
      <li>Come back here and tap <b>↻ Refresh</b>.</li>
    </ol></div>` : ""}
  ${(() => { const miss = cloudState.version >= 2 ? (cloudState.list || []).filter((x) => !x.code && codes[x.hash]) : []; return miss.length ? `<div class="card unsaved"><div class="row"><div><b>🔑 ${miss.length} customer${miss.length > 1 ? "s" : ""} in your sheet ${miss.length > 1 ? "don't" : "doesn't"} show a code yet.</b><br><span class="muted">${esc(miss.map((x) => x.customer).join(", "))} — this device remembers ${miss.length > 1 ? "their codes" : "the code"}.</span></div><span class="spacer"></span><button class="btn" data-cact="fillcodes">Add ${miss.length > 1 ? "codes" : "code"} to the sheet</button></div></div>` : ""; })()}
  ${toImport.length && cloudState.list ? `<div class="card unsaved"><div class="row"><div><b>📦 ${toImport.length} customer${toImport.length > 1 ? "s" : ""} from your old file ${toImport.length > 1 ? "aren't" : "isn't"} in Google Sheets yet.</b><br><span class="muted">${esc(toImport.map((x) => x.customer).join(", "))}</span></div><span class="spacer"></span><button class="btn" data-cact="import">⬆ Move them to Google Sheets</button></div></div>` : ""}

  <div class="grid cols-3" style="margin-bottom:14px">
    <div class="card stat"><span class="num-big">${list.length}</span>customers</div>
    <div class="card stat"><span class="num-big" style="color:var(--green)">${count("active")}</span>active</div>
    <div class="card stat"><span class="num-big" style="color:var(--pink)">${count("expired") + count("off")}</span>expired or turned off</div>
  </div>

  <form class="card" data-cform="add">
    <h2>➕ Create a customer login</h2>
    <div class="grid cols-3">
      <div class="field"><label for="c-name">Customer name *</label><input id="c-name" name="name" placeholder="e.g. Maria Santos" required></div>
      <div class="field"><label for="c-email">Email (optional)</label><input id="c-email" name="email" type="email" placeholder="maria@example.com"></div>
      <div class="field"><label for="c-exp">Access ends on (optional)</label><input id="c-exp" name="expires" type="date"></div>
    </div>
    <div class="row" style="margin-top:12px"><button class="btn" type="submit" ${cloudState.busy ? "disabled" : ""}>${cloudState.busy ? "Saving…" : "✨ Create login code"}</button><span class="muted" style="font-size:.88rem">Saved automatically. Works for the customer right away.</span></div>
  </form>

  ${last ? `<div class="card new-code"><h2>🎉 Login created for ${esc(last.name)}</h2><div class="code-out">${esc(last.code)}</div>
    <div class="row" style="justify-content:center"><button class="copy" data-copy="${esc(last.code)}">Copy code</button><button class="copy" data-copy="${esc(welcomeMessage(last.name, last.code))}">Copy welcome message</button></div>
    <details style="margin-top:10px"><summary class="muted" style="cursor:pointer">See the welcome message</summary><div class="prompt-box">${esc(welcomeMessage(last.name, last.code))}</div></details>
    <p class="muted" style="margin-top:8px">✅ Already saved. Just send the message to your customer.</p></div>` : ""}

  <div class="card">
    <div class="row"><h2 style="margin:0">👥 Customers</h2><span class="spacer"></span><input class="search" data-oinput="search" value="${esc(ownerState.search)}" placeholder="🔎 Search name or email"></div>
    <div style="margin-top:12px">${shown.length ? shown.map(row).join("") : `<p class="muted">${cloudState.list ? "No customers yet — create your first login above." : ""}</p>`}</div>
  </div>
  <div class="card"><h3>ℹ️ Good to know</h3><ul>
    <li>You can also edit the Google Sheet directly: change a name or end date, or type <b>FALSE</b> in the <b>active</b> column to turn someone off.</li>
    <li>A customer who is turned off is signed out the next time they open the app.</li>
    <li>Codes are remembered only on this device so you can copy them again. The sheet keeps only scrambled fingerprints.</li>
  </ul></div>`;
}

document.addEventListener("submit", async (e) => {
  const f = e.target.closest("[data-cform]");
  if (!f || !AUTH.user || AUTH.user.role !== "owner") return;
  e.preventDefault();
  const val = (n) => (f.elements.namedItem(n) ? f.elements.namedItem(n).value.trim() : "");
  const kind = f.dataset.cform;
  if (kind === "test") {
    const url = val("url");
    if (!/^https:\/\/script\.google(usercontent)?\.com\/.+\/exec$/.test(url)) { cloudState.test = { url, ok: false, msg: "That doesn't look like a Web app link. It should start with https://script.google.com/macros/s/ and end with /exec." }; render(); return; }
    toast("Testing…");
    try { const ok = await CLOUD.ping(url); cloudState.test = ok ? { url, ok: true } : { url, ok: false, msg: "The link answered, but it isn't the SANARA script. Check that you pasted the full script and deployed it." }; }
    catch (err) { cloudState.test = { url, ok: false, msg: "Couldn't connect. Make sure “Who has access” is set to Anyone, then try again." }; }
    render(); return;
  }
  if (kind === "ownercode") {
    const code = val("code");
    if (!(await AUTH.isOwnerCode(code))) { toast("That isn't the owner code"); return; }
    AUTH.setOwnerCode(code); cloudState.list = null; cloudState.error = ""; render(); return;
  }
  if (kind === "add") {
    const name = val("name");
    if (!name) { toast("Please type the customer's name"); return; }
    const code = newAccessCode(), hash = await AUTH.sha256("sanara:" + code);
    rememberCode(hash, code);
    ownerState.last = { name, code };
    cloudState.busy = true; render();
    await cloudLoad("add", { entry: { customer: name, email: val("email"), hash, code, expires: val("expires") } }, `Login created for ${name} ✨`);
  }
});

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-cact]");
  if (!b || !AUTH.user || AUTH.user.role !== "owner" || !CLOUD.on()) return;
  const x = (cloudState.list || []).find((y) => y.hash === b.dataset.h);
  switch (b.dataset.cact) {
    case "refresh": cloudLoad("list", {}, "Up to date ✓"); break;
    case "fillcodes": {
      const m = knownCodes();
      const list2 = (cloudState.list || []).filter((y) => !y.code && m[y.hash]);
      cloudLoad("codes", { codes: list2.map((y) => ({ hash: y.hash, code: m[y.hash] })) }, "Codes added to your Google Sheet 🔑");
      break;
    }
    case "toggle": if (x) cloudLoad("update", { hash: x.hash, changes: { active: x.active === false } }, x.active === false ? `${x.customer} turned on` : `${x.customer} turned off`); break;
    case "delete": if (x) sanaraConfirm(`Delete ${x.customer}? Their code stops working right away.`, () => cloudLoad("delete", { hash: x.hash }, "Deleted"), "Delete"); break;
    case "newcode":
      if (x) sanaraConfirm(`Make a new code for ${x.customer}? The old code stops working right away.`, async () => {
        const code = newAccessCode(), hash = await AUTH.sha256("sanara:" + code);
        rememberCode(hash, code); ownerState.last = { name: x.customer, code };
        await cloudLoad("update", { hash: x.hash, changes: { newHash: hash, newCode: code } }, "New code saved"); window.scrollTo(0, 0);
      }, "New code");
      break;
    case "import": {
      const list = cloudState.list || [];
      const local = (typeof ACCESS_CODES !== "undefined" ? ACCESS_CODES : []).concat(ownerDraft().list).filter((y) => y.role !== "owner" && y.hash && !list.some((z) => z.hash === y.hash));
      const entries = [...new Map(local.map((y) => [y.hash, y])).values()];
      entries.forEach((y) => { if (y._code) rememberCode(y.hash, y._code); });
      cloudLoad("import", { entries: entries.map((y) => ({ ...stripLocal(y), code: y._code || knownCodes()[y.hash] || "" })) }, `Moved ${entries.length} customer${entries.length > 1 ? "s" : ""} to Google Sheets ☁️`);
      break;
    }
  }
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.dataset.cinput !== "expires" || !CLOUD.on() || !AUTH.user || AUTH.user.role !== "owner") return;
  cloudLoad("update", { hash: t.dataset.h, changes: { expires: t.value } }, "End date saved");
});
