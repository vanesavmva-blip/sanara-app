/* SANARA AI Tool — guided 6-stage kids digital product creator */

/* ============ Helpers ============ */
const $ = (s, el = document) => el.querySelector(s);
const app = $("#app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const cap = (s) => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);
const title = (s) => String(s || "").replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
const plural = (w) => {
  if (/(s|x|ch|sh)$/.test(w)) return w + "es";
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + "ies";
  return w;
};
const pl = (w) => (/(fish|sheep|deer)$/.test(w) ? w : plural(w) === w ? w + "s" : plural(w));
const article = (w) => (/^[aeiou]/i.test(w) ? "an " : "a ") + w;

function hash(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return h >>> 0;
}
function rngFrom(seed) {
  let a = typeof seed === "string" ? hash(seed) : seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rint = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const shuffle = (r, arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 1800);
}
function copyText(text, btn) {
  const done = () => { toast("Copied! Paste it into Canva ✨"); if (btn) { btn.classList.add("done"); btn.textContent = "Copied ✓"; } };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
  else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); done(); } catch (e) { alert("Could not copy automatically. Please select the text and copy it."); }
  ta.remove();
}
function download(name, text, type = "text/plain") {
  const blob = new Blob([text], { type }); const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const copyBtn = (text, label = "Copy") => `<button class="copy" data-copy="${esc(text)}">${label}</button>`;
const promptBox = (text) => `<div class="prompt-box">${copyBtn(text)}${esc(text)}</div>`;

/* ---------- "Open in ChatGPT": uses the customer's OWN ChatGPT account ---------- */
const GPT_MAX_URL = 6000; // longer briefs are pasted from the clipboard instead of the link
const gptButton = (text, label = "✨ Open in ChatGPT") =>
  `<div class="gpt-row"><button class="btn gpt" data-act="gpt" data-text="${esc(text)}">${label}</button>
   <span class="muted gpt-note">Opens ChatGPT with your own account and sends the brief for you. The brief is also copied — if the chat is empty, press <b>Ctrl+V</b> (or long-press → Paste) and send.</span></div>`;
function openInGPT(text) {
  const base = (typeof SANARA_GPT_URL !== "undefined" && SANARA_GPT_URL) || "https://chatgpt.com/";
  let url;
  try { url = new URL(base); } catch (e) { url = new URL("https://chatgpt.com/"); }
  const withQ = new URL(url); withQ.searchParams.set("q", text);
  const fits = withQ.toString().length <= GPT_MAX_URL;
  const done = () => toast(fits ? "Opening ChatGPT… ✨" : "Brief copied! Paste it into ChatGPT (Ctrl+V) ✨");
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, done);
  else fallbackCopy(text, done);
  window.open((fits ? withQ : url).toString(), "_blank", "noopener");
}

function checkIP(text) {
  const t = String(text || "").toLowerCase();
  const hit = PROTECTED.find(([k]) => t.includes(k));
  return hit ? { word: hit[0], alt: hit[1] } : null;
}

/* ============ Storage ============ */
const loadAll = () => { try { return JSON.parse(localStorage.getItem(AUTH.storeKey)) || []; } catch (e) { return []; } };
const saveAll = (list) => { try { localStorage.setItem(AUTH.storeKey, JSON.stringify(list)); } catch (e) { /* storage unavailable */ } };
function saveProject() {
  if (!P || !P.product) return;
  P.updated = Date.now();
  const list = loadAll().filter((x) => x.id !== P.id);
  list.unshift(P); saveAll(list.slice(0, 50));
}
function newProject(product = null, answers = {}, name = "") {
  return { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), created: Date.now(), updated: Date.now(), name, product, a: { ...answers }, char: null, stage: product ? 2 : 1, maxStage: product ? 2 : 1, q: 0, checks: {}, sell: null };
}

/* ============ State ============ */
let view = "home";
let P = null;
let ideaFilter = "all";
let builder = { type: "Character", subject: "", age: "4-6", style: "cute", extra: "" };
let repair = { issue: 1, prompt: "", detail: "" };

/* ============ Flows & questions ============ */
/* Answers can be one value or a list (mixed choices) */
const listOf = (v) => (Array.isArray(v) ? v : v == null || v === "" ? [] : [v]);
const labelOf = (v) => listOf(v).join(" + ");
const firstOf = (v) => listOf(v)[0];
const OPTIONAL = ["friends", "lessons", "twist", "mood", "ending"];

const FLOWS = {
  storybook: ["age", "storyType", "theme", "setting", "character", "friends", "lessons", "twist", "mood", "ending", "pages", "style"],
  workbook: ["age", "skill", "pages", "theme", "mascot", "character", "style"],
  activity: ["activityType", "age", "theme", "pages", "difficulty", "mascot", "character", "style"],
  game: ["gameType", "age", "theme", "players", "goal", "format", "mascot", "character", "style"],
  pack: ["age", "theme", "goal", "mascot", "character", "style"],
  bundle: ["bundleType", "age", "theme", "goal", "size", "mascot", "character", "style"],
};
const hasChar = () => P && (P.product === "storybook" || String(P.a.mascot || "").startsWith("Yes"));
function flow() { return FLOWS[P.product].filter((id) => id !== "character" || hasChar()); }

const SETTINGS = ["Cozy woodland", "Sunny farm", "Under the sea", "Outer space", "Magical kingdom", "Jungle", "Pirate island", "Fairy garden", "Arctic snowland", "Inventor's workshop", "Little town", "Forest campsite", "Sports field", "Cozy kitchen", "Music room", "Backyard garden", "Construction site", "Birthday party", "Home & backyard"];
const THEME_CHIPS = THEMES.map((t) => t.name);

function question(id) {
  const a = P.a;
  const age = a.age || "4-6";
  const recPages = age === "2-4" ? "10 pages" : "20 pages";
  switch (id) {
    case "age": return { title: P.product === "storybook" ? "Who is this story for?" : "Who is it for?", kind: "choice", options: AGES.map((x) => x.label), values: AGES.map((x) => x.id) };
    case "storyType": return { title: "What kind of story would you like?", sub: "Pick 1 to 3 types and SANARA mixes them together — e.g. Adventure + Funny + Animal. You can also add your own.", kind: "multi", max: 3, options: STORY_TYPES, allowOther: true };
    case "theme":
      if (P.product === "storybook") {
        const ideas = [...new Set(listOf(a.storyType).flatMap((t) => STORY_IDEAS[t] || []))];
        return { title: "What should the story be about?", sub: "Type your own idea, or tap one of these original ideas.", kind: "text", placeholder: "e.g. A little bear learns to be brave", chips: (ideas.length ? ideas : STORY_IDEAS.Adventure).slice(0, 12) };
      }
      return { title: P.product === "game" ? "What topic or theme should the game use?" : "What theme would you like?", sub: "Pick one or type your own.", kind: "text", placeholder: "e.g. Dinosaurs", chips: THEME_CHIPS };
    case "setting": return { title: "Where does the story happen?", sub: "Pick a place or type your own.", kind: "text", placeholder: "e.g. A cozy woodland", chips: SETTINGS };
    case "charType": return { title: "Who should be the main character?", kind: "choice", options: ["Child", "Animal", "Magical Creature", "Robot", "Create one for me"] };
    case "character": return { title: P.product === "storybook" ? "Choose or mix your main character" : "Choose or mix your mascot", sub: "Pick one from the library, then tap the chips to mix hair, clothes and more — or type anything you like. This becomes the Character Lock used in every image prompt.", kind: "character" };
    case "friends": return { title: "Add friends to the story?", sub: "Pick up to 2 supporting characters. They'll be described in every scene they appear in.", kind: "friends" };
    case "lessons": return { title: "What lesson should the story teach?", sub: "Pick 1 or 2 to mix — or add your own.", kind: "multi", max: 2, options: Object.keys(STORY_LESSONS), allowOther: true };
    case "twist": return { title: "Add a story twist!", sub: "What surprising thing happens? Tap one or type your own.", kind: "text", placeholder: "e.g. A friendly whale needs help", chips: STORY_TWISTS };
    case "mood": return { title: "What's the mood of the story?", kind: "choice", options: STORY_MOODS, allowOther: true };
    case "ending": return { title: "How should the story end?", kind: "choice", options: STORY_ENDINGS, allowOther: true };
    case "pages":
      if (P.product === "storybook") {
        const rec = { "2-4": "8 pages", "4-6": "12 pages", "6-8": "16 pages", "8-10": "20 pages", "10-12": "24 pages" }[age];
        const opts = ["8 pages", "12 pages", "16 pages", "20 pages", "24 pages"];
        return { title: "How many story pages?", kind: "choice", options: opts, subs: opts.map((x) => (x === rec ? "⭐ Recommended for this age" : "")) };
      }
      return { title: "How many pages?", sub: "Not sure? Go with the recommended size.", kind: "choice", options: ["10 pages", "20 pages", "30 pages", "40 pages"], subs: ["10 pages", "20 pages", "30 pages", "40 pages"].map((x) => (x === recPages ? "⭐ Recommended" : "")) };
    case "skill": return { title: "What would you like children to practice?", sub: "Pick one, or mix up to 4 skills in one workbook.", kind: "multi", max: 4, options: WORKBOOK_SKILLS };
    case "activityType": return { title: "What activities would you like?", sub: "Pick as many as you like — SANARA mixes them through the book.", kind: "multi", max: 10, options: ACTIVITY_TYPES };
    case "difficulty": return { title: "How challenging should it be?", kind: "choice", options: DIFFICULTY };
    case "mascot": return { title: "Add a recurring mascot character?", sub: "A mascot makes your product feel like a series — great for selling.", kind: "choice", options: ["Yes — add a mascot", "No mascot"] };
    case "gameType": return { title: "What type of game would you like to create?", kind: "choice", options: GAME_TYPES };
    case "players": return { title: "How many players?", kind: "choice", options: ["1 player", "2 players", "2-4 players", "Whole group / class"] };
    case "goal": return { title: "What should children learn?", sub: "Pick a learning goal or type your own.", kind: "text", placeholder: "e.g. Counting 1-10", chips: GOALS[age] };
    case "format": return { title: "Printable or digital?", kind: "choice", options: ["Printable", "Digital (clickable in Canva)"] };
    case "bundleType": return { title: "What kind of bundle would you like?", kind: "choice", options: BUNDLE_TYPES };
    case "size": return { title: "Choose your bundle size", kind: "choice", options: BUNDLE_SIZES.map((b) => b.label), subs: BUNDLE_SIZES.map((b) => b.sub) };
    case "style": return { title: "Choose your art style", sub: "We'll use the same style wording in every prompt so your product looks consistent.", kind: "choice", options: STYLES.map((s) => s.label) };
  }
}

/* ============ Context / knowledge engine ============ */
function getKit(text) {
  const t = String(text || "").toLowerCase();
  const map = { "cozy woodland": "wood", "sunny farm": "farm", "under the sea": "ocean", "outer space": "space", "magical kingdom": "magic", "jungle": "jungle", "construction site": "construct", "birthday party": "birthday", "pirate island": "pirate", "fairy garden": "fairy garden", "arctic snowland": "arctic", "inventor's workshop": "invent", "little town": "community", "forest campsite": "camp", "sports field": "sport", "cozy kitchen": "cook", "music room": "music", "backyard garden": "bug" };
  const key = map[t] || t;
  const kit = THEMES.find((k) => k.name.toLowerCase() === key) || THEMES.find((k) => key.includes(k.name.toLowerCase())) || THEMES.find((k) => k.key.some((w) => key.includes(w)));
  if (kit) return { ...kit, matched: true };
  const name = title(text || "Happy Kids");
  return {
    name, matched: false,
    colors: [["Sanara Green", BRAND[1]], ["Sunny Yellow", BRAND[2]], ["Candy Pink", BRAND[3]], ["Sky Teal", BRAND[4]], ["Grape Purple", BRAND[5]]],
    bg: "#fff9ec",
    setting: text ? `a cheerful, child-friendly ${String(text).toLowerCase()} world with soft rounded shapes and friendly details` : "a cheerful, child-friendly world with soft rounded shapes",
    deco: ["stars", "hearts", "clouds", "dots"], objects: GENERIC_OBJECTS.slice(), char: null,
  };
}
function styleOf(product, label) {
  let s = STYLES.find((x) => x.label === label) || STYLES[8];
  if (s.id === "auto") s = STYLES.find((x) => x.id === (product === "storybook" ? "modern" : product === "game" ? "3d" : "cute"));
  return s;
}
function ctx() {
  const a = P.a;
  const age = a.age || "4-6";
  const baseKit = P.product === "storybook" ? getKit(a.setting || a.theme) : getKit(a.theme);
  // "New version" button changes P.seed → a different mix of theme objects on every page
  const kit = { ...baseKit, objects: P.seed ? shuffle(rngFrom(P.id + P.seed), baseKit.objects) : baseKit.objects.slice() };
  const s = styleOf(P.product, a.style);
  const lv = { Easy: 0, Medium: 1, Challenging: 2, Mixed: 1 }[a.difficulty] ?? (age === "2-4" ? 0 : age === "4-6" ? 0 : 1);
  return {
    a, age, kit, style: s.prompt, styleLabel: s.label, ch: hasChar() ? P.char : null, lv,
    friends: P.product === "storybook" ? (P.friends || []) : [],
    themeName: P.product === "storybook" ? kit.name : (kit.matched ? kit.name : title(a.theme || "Kids")),
    ageVis: AGE_VISUAL[age],
  };
}
function pageCount() {
  const n = parseInt(P.a.pages, 10);
  if (P.product === "bundle") return (BUNDLE_SIZES.find((b) => b.label === P.a.size) || BUNDLE_SIZES[1]).pages;
  if (P.product === "pack") return 10;
  return n || 20;
}

/* ============ Character ============ */
function presetFor(kind, kit, step = 0) {
  const map = { "Child": "Kids", "Animal": "Animals", "Magical Creature": "Magical", "Robot": "Robots & Vehicles" };
  let pool = map[kind] ? CHAR_LIBRARY.filter((x) => x.cat === map[kind]) : CHAR_LIBRARY.slice();
  if (!map[kind] && kit && kit.char) pool = [{ personality: "cheerful, curious, kind", ...kit.char }].concat(pool);
  const { cat, emoji, ...ch } = pool[step % pool.length];
  return { personality: "cheerful, curious, kind", acc: "", sig: "", ...ch };
}
const libChar = (i) => { const { cat, emoji, ...ch } = CHAR_LIBRARY[i]; return { acc: "", sig: "", ...ch }; };
function randomMix(r = Math.random) {
  const base = CHAR_LIBRARY[Math.floor(r() * CHAR_LIBRARY.length)];
  const pickP = (k) => CHAR_PARTS[k][Math.floor(r() * CHAR_PARTS[k].length)];
  const names = ["Poppy", "Ziggy", "Nova", "Bean", "Juno", "Toby", "Lulu", "Rio", "Sunny", "Maple", "Kiki", "Otto", "Daisy", "Remy"];
  return { name: names[Math.floor(r() * names.length)], species: base.species, hair: base.hair, eyes: pickP("eyes"), clothing: pickP("clothing"), shoes: pickP("shoes"), acc: pickP("acc"), sig: pickP("sig"), personality: pickP("personality") };
}
function charDesc(ch) {
  if (!ch) return "";
  let d = `${ch.name}, ${article(ch.species)}`;
  const looks = [ch.hair, ch.eyes].filter(Boolean);
  if (looks.length) d += ` with ${looks.join(" and ")}`;
  const wear = [ch.clothing, ch.shoes].filter((x) => x && !/^no /i.test(x));
  if (wear.length) d += `, wearing ${wear.join(" and ")}`;
  if (ch.acc) d += `, with ${ch.acc}`;
  if (ch.sig) d += `, ${ch.sig}`;
  return d;
}
function charLock(ch) {
  return [ch.species, ch.hair, ch.eyes, ch.clothing, ch.shoes, ch.acc, ch.sig].filter((x) => x && !/^no /i.test(x)).map(cap);
}

/* ============ Prompt engine (Premium Canva AI Prompt Library + Knowledge File 6) ============ */
const TOOL = { dream: "Dream Lab / Create an Image", media: "Magic Media — Images", graphics: "Magic Media — Graphics", manual: "Build manually in Canva — no AI needed" };
const NO_TEXT = "no text, letters, numbers, watermark or logo";
const pr = (name, tool, text, placement, manual = [], reuse = [], check = []) => ({ name, tool, text, placement, manual, reuse, check });

const P_ = {
  master: (c, ch) => `Create a full-body children's ${P.product === "storybook" ? "storybook" : "educational"} character named ${charDesc(ch)}. Personality: ${ch.personality}. Short childlike proportions, front-facing, standing in a centered full-body pose with the full body completely visible from head to feet. ${cap(c.style)}, simple light background, suitable for children ages ${c.age}. Keep the design simple and distinctive enough to remain visually consistent across an entire product. No text, watermark or logo.`,
  sheet: (c, ch) => `Create a professional children's character reference sheet for ${charDesc(ch)}. Show the same character consistently in front view, side view and three-quarter view, plus four clear facial expressions: happy, worried, surprised and excited. Maintain identical facial features, clothing, colors and body proportions in every pose. ${cap(c.style)}, clean shapes, simple neutral background, evenly spaced character studies, no decorative scenery, no text, no watermark.`,
  portrait: (c, ch) => `Close-up children's portrait of ${charDesc(ch)}. Warm welcoming expression, ${c.style}, centered head-and-shoulders composition, soft pastel background, professional quality, suitable for children ages ${c.age}, no text or watermark.`,
  pose: (c, ch, pose, facing = "facing forward") => `${charDesc(ch)}, ${pose}, ${facing}, full body completely visible from head to feet with comfortable space around the character, no cropping. ${cap(c.style)}, isolated on a clean white background, bright gentle lighting, suitable for children ages ${c.age}, maintaining the exact same character design, colors, clothing, facial features and body proportions, ${NO_TEXT}.`,
  asset: (c, subject, extra = "") => `Single friendly ${subject}${extra ? ", " + extra : ""}, ${c.style}, bold clean outlines, simple recognizable shape, centered composition, fully visible, isolated on a clean white background, ${c.age === "2-4" ? "very simple with minimal details" : "clear and uncluttered"}, suitable for children ages ${c.age}, no text, letters, numbers, border or watermark.`,
  scene: (c, ch, action, emotion, space, light = "warm friendly lighting") => `Children's picture-book scene featuring ${ch ? charDesc(ch) : "the main character"}, who ${action}, in a story about ${String(P.a.theme || "a happy adventure").replace(/\.$/, "").toLowerCase()}. The expression is ${emotion}. Setting: ${c.kit.setting}. ${cap(c.style)}, ${c.ageVis}, ${light}, landscape composition with ${space}, child-safe atmosphere, suitable for children ages ${c.age}, no text generated inside the image, no watermark.`,
  // Library 05 — two-character scene: describe BOTH characters fully and place them clearly
  scene2: (c, ch, fr, action, emotion, space, light = "warm friendly lighting") => `Children's picture-book scene with two characters. On the left: ${charDesc(ch)}. On the right: ${charDesc(fr)}. ${ch.name} ${action}, together with ${fr.name}, in a story about ${String(P.a.theme || "a happy adventure").replace(/\.$/, "").toLowerCase()}. Both look ${emotion}, with warm expressive faces and childlike proportions. Setting: ${c.kit.setting}. ${cap(c.style)}, ${c.ageVis}, ${light}, balanced landscape composition with ${space}, keep each character's exact colors and clothing, no merged or duplicate characters, child-safe atmosphere, suitable for children ages ${c.age}, no text generated inside the image, no watermark.`,
  cover: (c, ch, kind) => `Vertical children's ${kind} cover artwork featuring ${ch ? charDesc(ch) : `friendly original ${c.kit.objects.slice(0, 3).map(pl).join(", ")}`} ${ch ? "standing proudly in the center, looking happy and adventurous" : "arranged around simple fun elements"}, in ${c.kit.setting}, with ${c.kit.deco.slice(0, 3).join(", ")}. Premium ${c.style}, strong centered focal composition, bright welcoming palette of ${c.kit.colors.slice(0, 3).map((x) => x[0].toLowerCase()).join(", ")}, generous clean area across the upper third for the title, professional publishing quality, suitable for ages ${c.age}. Artwork only, no words, letters, watermark or logo.`,
  back: (c) => `Simple coordinating children's back-cover artwork showing ${c.kit.setting}, quiet and peaceful, same visual style and color palette as the front cover, ${c.style}, uncluttered center area with generous negative space for the description, no text, letters, watermark or logo.`,
  background: (c) => `${cap(c.kit.setting)}, ${c.style}, welcoming child-friendly atmosphere, wide landscape composition, no characters, no animals, no text, no watermark.`,
  border: (c) => `Simple children's ${c.themeName.toLowerCase()}-themed worksheet border featuring small ${c.kit.deco.join(", ")} arranged only around the outer edges, clean educational illustration, soft ${c.kit.colors[0][0].toLowerCase()} and ${c.kit.colors[1][0].toLowerCase()} colors, large completely empty white center for worksheet content, minimal visual clutter, suitable for ages ${c.age}, no text or watermark.`,
  pattern: (c) => `Seamless children's ${c.themeName.toLowerCase()} pattern featuring tiny simplified ${c.kit.objects.slice(0, 3).map(pl).join(", ")} and ${c.kit.deco[0]}, consistent cute cartoon illustration, evenly spaced small elements, clean light cream background, playful but subtle enough for page decoration, no text, logo or watermark.`,
  printSafe: (c) => `Very light ${c.themeName.toLowerCase()}-themed educational background with subtle tiny ${c.kit.deco.slice(0, 2).join(" and ")} positioned around the outer edges only, mostly white central area, extremely low visual clutter, clean cheerful printable design, suitable for worksheet text and activities, no characters, no text, no watermark.`,
  coloring: (c, subject) => {
    const young = c.age === "2-4" || (c.age === "4-6" && c.lv === 0);
    return young
      ? `Black-and-white preschool coloring page of ${subject}, very thick clean black outlines, large simple shapes, big open coloring spaces, minimal details, friendly rounded features, centered composition, pure white background, no shading, no grayscale, no color, no cross-hatching, no text, suitable for children ages ${c.age}, printable coloring-book line art.`
      : `Black-and-white children's coloring page showing ${subject} in ${c.kit.setting.replace(/^a /, "a simple ")}, clean bold line art, ${c.lv >= 2 ? "detailed but clear" : "medium level of"} detail, clear enclosed coloring areas, expressive but non-scary character, balanced full-page composition, white background, no shading, no grayscale, no color, no text, suitable for children ages ${c.age}.`;
  },
  mazeBorder: (c) => `Friendly ${c.themeName.toLowerCase()}-themed decorative border for a children's maze worksheet, small ${c.kit.objects.slice(0, 3).map(pl).join(", ")} and ${c.kit.deco[0]} arranged around the outer edges, large completely empty white center for the maze, clean bold children's educational illustration, bright simple colors, minimal clutter, suitable for ages ${c.age}, no text or watermark.`,
  spot: (c) => `Cheerful children's ${c.themeName.toLowerCase()} scene with ${c.kit.objects.slice(0, 5).map((o, i) => (i === 2 ? "three " + pl(o) : article(o))).join(", ")}, in ${c.kit.setting}. Clean activity-book illustration, bold outlines, simple shapes, clear separation between objects, minimal background clutter, landscape composition, suitable for ages ${c.age}, no text or watermark.`,
  dot: (c, subject) => `Simple outline silhouette reference of ${article(subject)} viewed from the side, clean recognizable shape, minimal detail, centered on a white background, suitable as a reference for creating a children's dot-to-dot activity, no numbers, no dots, no text.`,
  certificate: (c) => `Cheerful children's achievement certificate border with small golden stars, colorful confetti, ${c.kit.deco.slice(0, 2).join(" and ")} around the outer edges, elegant but playful educational illustration, large completely clean white center for certificate text, balanced symmetrical composition, suitable for ages ${c.age}, no words, letters, numbers, logo or watermark.`,
  badge: (c) => `Round children's achievement badge featuring a cheerful golden star with a smiling face and tiny ${c.kit.deco[0]}, bright clean educational illustration, bold outline, simple flat colors, centered composition, isolated white background, suitable for a reward chart, no words, letters or watermark.`,
  reward: (c) => `Cheerful children's reward-chart background with friendly stars, rainbow, small clouds and ${c.kit.deco[0]} around the outer edges, clean modern illustration, large white central area for a reward grid to be added manually, bright but balanced colors, no text, numbers or watermark.`,
  bookmark: (c, ch) => `Vertical children's bookmark artwork featuring ${ch ? charDesc(ch) : "a friendly original " + c.kit.objects[0]} reading a small book beneath three tiny stars, ${c.style}, narrow vertical composition, simple uncluttered background, clear upper and lower margins, suitable for ages ${c.age}, no text or watermark.`,
  stickers: (c) => `Children's printable sticker sheet featuring twelve separate original cute ${c.themeName.toLowerCase()} illustrations including ${c.kit.objects.join(", ")}, ${c.kit.deco.slice(0, 2).join(" and ")}, consistent cute cartoon style, bold clean outlines, bright friendly colors, white sticker-style border around each object, evenly spaced, no overlapping objects, white background, no text or watermark.`,
  crown: () => `Printable children's paper crown decoration featuring cheerful stars, tiny rainbows and celebratory confetti, clean bold educational illustration, bright friendly colors, symmetrical decorative pattern, white background, no words or watermark.`,
  gameBg: (c) => `Friendly ${c.themeName.toLowerCase()} children's digital-game background, ${c.kit.setting}, bright clean educational illustration, uncluttered center area for interactive game elements and buttons, landscape format, suitable for children ages ${c.age}, no text, letters, buttons or watermark.`,
  button: (color = "yellow") => `Large rounded ${color} children's game button shape with subtle depth, clean modern educational interface style, friendly soft corners, centered isolated object, simple uncluttered design, no text, icon, logo or watermark.`,
  board: (c) => `Whimsical ${c.themeName.toLowerCase()} children's board-game background with a winding visual journey through ${c.kit.setting}, bright playful educational illustration, clean rounded shapes, clear central area where a game path can be added manually, suitable for ages ${c.age}, no numbers, no text, no board spaces, no watermark.`,
  token: (c, obj) => `Small friendly ${obj} game token, rounded shape with a cheerful face, clean bold outline, simple flat colors, centered full object, isolated white background, printable children's board-game asset, no text, no shadow, no watermark.`,
  mockup: (c) => `Bright professional product-display scene for a children's printable ${c.themeName.toLowerCase()} learning product, several colorful educational pages neatly arranged on a clean light wooden desk with colored pencils and a few simple child-friendly stationery items nearby, warm natural lighting, clean premium digital-product presentation, slightly elevated camera angle, uncluttered composition, generous negative space, cheerful educational atmosphere.`,
  bundleCover: (c, name) => `Premium vertical product-cover artwork for a ${name}, featuring friendly original ${c.kit.objects.slice(0, 4).map(pl).join(", ")} surrounded by simple alphabet blocks, numbers, stars and ${c.kit.deco[0]}. Bright polished ${c.style}, cohesive ${c.kit.colors.slice(0, 3).map((x) => x[0].toLowerCase()).join(", ")} palette, professional printable-product aesthetic, strong central visual hierarchy, large uncluttered upper section for the product title, suitable for ages ${c.age}, no text, words, logo or watermark.`,
};

/* ============ Puzzle generators ============ */
function makeMaze(w, h, seed) {
  const r = rngFrom(seed);
  const cells = Array.from({ length: h }, () => Array.from({ length: w }, () => ({ t: 1, r: 1, b: 1, l: 1, v: 0 })));
  const stack = [[0, 0]]; cells[0][0].v = 1;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const nb = [[0, -1, "t", "b"], [1, 0, "r", "l"], [0, 1, "b", "t"], [-1, 0, "l", "r"]]
      .map(([dx, dy, w1, w2]) => [x + dx, y + dy, w1, w2]).filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < w && ny < h && !cells[ny][nx].v);
    if (!nb.length) { stack.pop(); continue; }
    const [nx, ny, w1, w2] = pick(r, nb);
    cells[y][x][w1] = 0; cells[ny][nx][w2] = 0; cells[ny][nx].v = 1; stack.push([nx, ny]);
  }
  cells[0][0].t = 0; cells[h - 1][w - 1].b = 0;
  const s = 36, pad = 24, W = w * s + pad * 2, H = h * s + pad * 2;
  let lines = "";
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = cells[y][x], X = pad + x * s, Y = pad + y * s;
    if (c.t) lines += `M${X} ${Y}h${s}`;
    if (c.l) lines += `M${X} ${Y}v${s}`;
    if (y === h - 1 && c.b) lines += `M${X} ${Y + s}h${s}`;
    if (x === w - 1 && c.r) lines += `M${X + s} ${Y}v${s}`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#ffffff"/><path d="${lines}" stroke="#23401f" stroke-width="5" stroke-linecap="round" fill="none"/><circle cx="${pad + s / 2}" cy="${pad - 10}" r="6" fill="#5fae3e"/><circle cx="${pad + (w - 0.5) * s}" cy="${H - pad + 10}" r="6" fill="#ef6fa2"/></svg>`;
}
function makeWordSearch(words, size, diag, seed) {
  const r = rngFrom(seed);
  const grid = Array.from({ length: size }, () => Array(size).fill(""));
  const dirs = [[0, 1], [1, 0]].concat(diag ? [[1, 1]] : []);
  const placed = [];
  for (const word of words) {
    if (word.length > size) continue;
    for (let t = 0; t < 300; t++) {
      const [dr, dc] = pick(r, dirs);
      const r0 = rint(r, 0, size - 1 - dr * (word.length - 1)), c0 = rint(r, 0, size - 1 - dc * (word.length - 1));
      let ok = true;
      for (let i = 0; i < word.length; i++) { const g = grid[r0 + dr * i][c0 + dc * i]; if (g && g !== word[i]) { ok = false; break; } }
      if (!ok) continue;
      const cells = [];
      for (let i = 0; i < word.length; i++) { grid[r0 + dr * i][c0 + dc * i] = word[i]; cells.push((r0 + dr * i) * size + c0 + dc * i); }
      placed.push({ word, cells, at: `row ${r0 + 1}, column ${c0 + 1}, ${dr && dc ? "diagonal" : dr ? "down" : "across"}` });
      break;
    }
  }
  const A = "ABCDEFGHIJKLMNOPRSTUVWY";
  for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) if (!grid[i][j]) grid[i][j] = A[Math.floor(r() * A.length)];
  return { grid, placed };
}
function wsTable(ws, showAnswers) {
  const hits = new Set(showAnswers ? ws.placed.flatMap((p) => p.cells) : []);
  const n = ws.grid.length;
  return `<table class="ws">${ws.grid.map((row, i) => `<tr>${row.map((ch, j) => `<td class="${hits.has(i * n + j) ? "hit" : ""}">${ch}</td>`).join("")}</tr>`).join("")}</table>`;
}

/* ============ Content generators (Stage 3) ============ */
const COUNTABLES = ["apple", "star", "balloon", "flower", "cookie", "book", "shell", "crayon"];
const NAMES = ["Mia", "Theo", "Ava", "Leo", "Zara", "Sam", "Nina", "Omar"];
/* tag(kind, data) right before pageObj() tells the Exact Layout engine what kind of page it is */
let pendingTag = null;
const tag = (kind, data = {}) => { pendingTag = { kind, data }; };
const pageObj = (title, fields, layout, prompt, extra = "") => { const t = pendingTag || { kind: "generic", data: {} }; pendingTag = null; return { title, fields, layout, prompt, extra, kind: t.kind, data: t.data }; };

function mathPage(c, i, r) {
  const types = { "2-4": ["count", "count", "bigsmall"], "4-6": ["count", "add", "compare", "pattern", "add", "missing"], "6-8": ["add", "sub", "word", "pattern", "missing", "compare"], "8-10": ["add2", "sub2", "mult", "word", "div", "missing"], "10-12": ["multi", "div", "frac", "word", "mult", "order"] }[c.age];
  const t = types[i % types.length];
  const obj = c.kit.objects[i % c.kit.objects.length];
  const lim = [5, 10, 20][c.lv] + (c.age === "6-8" ? 10 : 0);
  const probs = [], ans = [];
  const reuse = [`${cap(obj)} asset`];
  switch (t) {
    case "count": {
      const n = rint(r, 1, c.age === "2-4" ? 5 : 10);
      const set = new Set([n]); while (set.size < 3) set.add(rint(r, 1, (c.age === "2-4" ? 5 : 10) + 2));
      const choices = shuffle(r, [...set]);
      tag("count", { n, obj, choices }); return pageObj(`Count the ${pl(obj)}`, [["Learning objective", "Count objects and match a quantity to a number"], ["Instructions for the child", `Count the ${pl(obj)}. Circle the right number.`], ["Activity", [`${n} ${n === 1 ? obj : pl(obj)} in a neat row`, `Number choices: ${choices.join("   ")}`]], ["Answer", String(n)]], `Top: title + instruction · Center: ${n} copies of the ${obj} asset in a row · Bottom: three big number circles`, pr(`Counting asset — ${obj}`, TOOL.graphics, P_.asset(c, obj), n === 1 ? `Use just ONE ${obj} on this page.` : `Duplicate the ${obj} until there are exactly ${n} in Canva.`, ["Title & instruction", `Numbers ${choices.join(", ")}`, "Circles around the numbers"], reuse, [`Exactly ${n} ${n === 1 ? obj : pl(obj)} on the page`, "Numbers are large and readable"]));
    }
    case "bigsmall":
      tag("bigsmall", { obj }); return pageObj(`Big or Small?`, [["Learning objective", "Compare sizes: big and small"], ["Instructions for the child", `Circle the BIG ${obj}.`], ["Activity", [`One big ${obj} and one small ${obj} side by side (same asset, resized)`]], ["Answer", `The big ${obj}`]], "Two copies of the same asset, one large, one small, with lots of white space", pr(`Size asset — ${obj}`, TOOL.graphics, P_.asset(c, obj), "Use the same asset twice — resize one to half size.", ["Title & instruction"], reuse, ["Size difference is obvious"]));
    case "add": case "sub": {
      for (let k = 0; k < 6; k++) {
        let a = rint(r, 0, lim), b = rint(r, 0, lim);
        if (t === "add") { if (a + b > lim) b = lim - a; probs.push(`${a} + ${b} = ___`); ans.push(a + b); }
        else { if (b > a) [a, b] = [b, a]; probs.push(`${a} − ${b} = ___`); ans.push(a - b); }
      }
      break;
    }
    case "add2": case "sub2": {
      const hi = c.lv >= 2 ? 999 : 99;
      for (let k = 0; k < 6; k++) {
        let a = rint(r, 10, hi), b = rint(r, 10, hi);
        if (t === "add2") { probs.push(`${a} + ${b} = ___`); ans.push(a + b); }
        else { if (b > a) [a, b] = [b, a]; probs.push(`${a} − ${b} = ___`); ans.push(a - b); }
      }
      break;
    }
    case "mult": { const mx = [5, 10, 12][c.lv]; for (let k = 0; k < 8; k++) { const a = rint(r, 2, mx), b = rint(r, 2, mx); probs.push(`${a} × ${b} = ___`); ans.push(a * b); } break; }
    case "div": { const mx = [5, 10, 12][c.lv]; for (let k = 0; k < 8; k++) { const b = rint(r, 2, mx), q = rint(r, 2, mx); probs.push(`${b * q} ÷ ${b} = ___`); ans.push(q); } break; }
    case "multi": { for (let k = 0; k < 6; k++) { const a = rint(r, 2, 9), b = rint(r, 2, 9), d = rint(r, 1, 20); if (k % 2) { probs.push(`(${a} + ${b}) × ${d % 9 + 2} = ___`); ans.push((a + b) * (d % 9 + 2)); } else { probs.push(`${a} × ${b} + ${d} = ___`); ans.push(a * b + d); } } break; }
    case "frac": { for (let k = 0; k < 6; k++) { const d = pick(r, [2, 3, 4, 5]), m = rint(r, 2, 8); probs.push(`1/${d} of ${d * m} = ___`); ans.push(m); } break; }
    case "order": { for (let k = 0; k < 4; k++) { const nums = Array.from({ length: 5 }, () => rint(r, 10, 999)); probs.push(`Smallest to largest: ${nums.join(", ")}`); ans.push(nums.slice().sort((x, y) => x - y).join(", ")); } break; }
    case "compare": {
      const hi = c.age === "4-6" ? 10 : 50;
      for (let k = 0; k < 6; k++) { const a = rint(r, 0, hi), b = rint(r, 0, hi); probs.push(`${a}  ___  ${b}`); ans.push(a > b ? ">" : a < b ? "<" : "="); }
      tag("problems", { probs, cols: 2 }); return pageObj("More, Less or Equal?", [["Learning objective", "Compare numbers"], ["Instructions for the child", c.age === "4-6" ? "Which is more? Write > , < or =." : "Write > , < or =."], ["Activity", probs], ["Answer", ans.map((x, k) => `${k + 1}) ${x}`).join("   ")]], "Two columns of problems with large answer boxes; a small mascot in a corner", pr("Decoration", TOOL.manual, "No new image needed — reuse your mascot or theme asset as a small corner decoration.", "Bottom corner, small.", ["All numbers and symbols"], ["Mascot or theme asset"], ["Every answer checked"]));
    }
    case "pattern": {
      const o = shuffle(r, c.kit.objects).slice(0, 3);
      const unit = c.lv === 0 ? [o[0], o[1]] : c.lv === 1 ? [o[0], o[1], o[1]] : [o[0], o[1], o[2]];
      const seq = Array.from({ length: 7 }, (_, k) => unit[k % unit.length]);
      const answer = seq[6];
      tag("pattern", { seq: seq.slice(0, 6), choices: unit.filter((v, k, s) => s.indexOf(v) === k) }); return pageObj("What Comes Next?", [["Learning objective", "Recognize and continue patterns"], ["Instructions for the child", "Look at the pattern. Draw or circle what comes next."], ["Activity", [`${seq.slice(0, 6).join(" → ")} → ___`, `Choices: ${shuffle(r, unit.filter((v, k, s) => s.indexOf(v) === k)).join(" / ")}`]], ["Answer", answer]], "One row of pattern pictures, an empty dashed box at the end, answer choices below", pr("Pattern assets", TOOL.manual, `Reuse your ${unit.filter((v, k, s) => s.indexOf(v) === k).join(", ")} assets — no new generation needed.`, "Line them up in one row, same size.", ["Empty answer box", "Arrows", "Choice circles"], unit.map((x) => cap(x) + " asset"), ["Pattern is correct", "Answer is one of the choices"]));
    }
    case "missing": {
      const step = c.age === "4-6" ? 1 : pick(r, c.age === "6-8" ? [1, 2, 5] : [2, 5, 10, 25]);
      for (let k = 0; k < 5; k++) { const s0 = rint(r, 0, 20) * step; const seq = [0, 1, 2, 3].map((x) => s0 + x * step); const miss = rint(r, 1, 2); ans.push(seq[miss]); seq[miss] = "___"; probs.push(seq.join(", ")); }
      tag("problems", { probs, cols: 1 }); return pageObj("Find the Missing Number", [["Learning objective", step === 1 ? "Number order" : `Skip counting by ${step}`], ["Instructions for the child", "Write the missing number."], ["Activity", probs], ["Answer", ans.join(", ")]], "Each number line in its own rounded box with a blank answer square", pr("Decoration", TOOL.manual, "No new image needed — reuse a theme asset as a small corner decoration.", "Top corner.", ["All numbers"], ["Theme asset"], ["Every answer checked"]));
    }
    case "word": {
      for (let k = 0; k < 3; k++) {
        const nm = pick(r, NAMES), it = pick(r, COUNTABLES), big = c.age === "6-8" ? 10 : 50;
        if (c.age === "10-12" || c.age === "8-10") { const a = rint(r, 3, 9), b = rint(r, 3, 12); probs.push(`${nm} has ${a} bags with ${b} ${pl(it)} in each bag. How many ${pl(it)} in all?`); ans.push(a * b); }
        else if (k % 2) { const a = rint(r, 5, big), b = rint(r, 1, a); probs.push(`${nm} had ${a} ${pl(it)}. ${nm} gave ${b} away. How many are left?`); ans.push(a - b); }
        else { const a = rint(r, 1, big), b = rint(r, 1, big); probs.push(`${nm} has ${a} ${pl(it)}. A friend gives ${nm} ${b} more. How many now?`); ans.push(a + b); }
      }
      tag("wordprob", { probs }); return pageObj("Story Problems", [["Learning objective", "Solve word problems"], ["Instructions for the child", "Read each problem. Show your work."], ["Activity", probs], ["Answer", ans.join(", ")]], "Three stacked boxes, each with the problem, a work area and an answer line", pr("Decoration", TOOL.manual, "No new image needed — reuse your mascot pointing at the problems.", "Left margin.", ["Problems", "Answer lines"], ["Mascot or theme asset"], ["Every answer checked"]));
    }
  }
  const nameT = { add: "Addition Practice", sub: "Subtraction Practice", add2: "Big Number Addition", sub2: "Big Number Subtraction", mult: "Multiplication Practice", div: "Division Practice", multi: "Multi-Step Math", frac: "Fractions of a Number", order: "Put Numbers in Order" }[t];
  tag("problems", { probs, cols: t === "order" ? 1 : 2 }); return pageObj(nameT, [["Learning objective", nameT], ["Instructions for the child", "Solve each problem."], ["Activity", probs], ["Answer", ans.map((x, k) => `${k + 1}) ${x}`).join("   ")]], "Problems in a 2-column grid with roomy answer spaces; small mascot cheering in a corner", pr("Decoration", TOOL.manual, "No new image needed — reuse your mascot or a theme asset.", "Small, bottom corner.", ["All problems and numbers"], ["Mascot or theme asset"], ["Every answer double-checked"]));
}

function workbookItem(c, skill, i, r) {
  const obj = c.kit.objects[i % c.kit.objects.length];
  switch (skill) {
    case "ABC / Alphabet": {
      const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i % 26], word = LETTER_WORDS[L];
      const others = shuffle(r, Object.keys(LETTER_WORDS).filter((k) => k !== L)).slice(0, c.age === "2-4" ? 1 : 2).map((k) => LETTER_WORDS[k]);
      const opts = shuffle(r, [word].concat(others));
      tag("letter", { L, word, opts }); return pageObj(`Letter ${L} — ${L} is for ${cap(word)}`, [["Learning objective", `Recognize uppercase ${L} and lowercase ${L.toLowerCase()}; hear the beginning sound of “${word}”`], ["Instructions for the child", `Trace the letter ${L}. Circle the picture that starts with ${L}.`], ["Activity", [`Big dotted ${L} and ${L.toLowerCase()} to trace`, `Two rows of ${L} ${L.toLowerCase()} tracing practice`, `Circle the ${L} picture: ${opts.join(" · ")}`]], ["Answer", word]], `Top: title · Left: big tracing ${L} ${L.toLowerCase()} · Right: ${word} illustration · Bottom: tracing rows + picture choices`, pr(`Letter ${L} object — ${word}`, TOOL.graphics, P_.asset(c, word, "realistic-enough recognizable shape, bright child-friendly colors"), `Right side, next to the big letter ${L}.`, [`Letters ${L} ${L.toLowerCase()} (dotted tracing font or light-gray outline)`, "Tracing rows", "Word label"], others.map((x) => `${cap(x)} asset (from its own letter page)`), [`Picture clearly shows ${article(word)}`, "Letters are added in Canva, not AI"]));
    }
    case "Numbers": {
      const n = (i % (c.age === "2-4" ? 10 : 20)) + 1;
      tag("number", { n, obj }); return pageObj(`Number ${n}`, [["Learning objective", `Recognize, trace and count ${n}`], ["Instructions for the child", `Trace ${n}. Count ${n} ${n === 1 ? obj : pl(obj)}. Color ${n} circles.`], ["Activity", [`Big dotted number ${n} to trace`, `${n} ${n === 1 ? obj : pl(obj)} to count`, `A row of ${Math.max(n, 5)} empty circles — color ${n}`]], ["Answer", String(n)]], `Top: big number ${n} · Middle: ${n} ${pl(obj)} · Bottom: tracing row + circles`, pr(`Counting asset — ${obj}`, TOOL.graphics, P_.asset(c, obj), n === 1 ? `Generate ONE ${obj} — only one is needed on this page.` : `Generate ONE ${obj}, then duplicate it ${n} times in Canva.`, [`Number ${n} (tracing)`, "Circles row", "Number word"], [`${cap(obj)} asset if already made`], [`Exactly ${n} ${n === 1 ? obj : pl(obj)} on the page`]));
    }
    case "Math": return mathPage(c, i, r);
    case "Reading": {
      const kinds = ["Short Reading Passage", "Vocabulary Words", "Comprehension Questions", "True or False", "Short Answer", "Draw What You Read"];
      const k = kinds[i % kinds.length];
      tag("reading", { k }); return pageObj(`${k} ${Math.floor(i / kinds.length) + 1}`, [["Learning objective", "Read with understanding"], ["Instructions for the child", { "Short Reading Passage": "Read the story.", "Vocabulary Words": "Read each word. Match it to its picture.", "Comprehension Questions": "Circle the best answer.", "True or False": "Write T for true or F for false.", "Short Answer": "Answer in a full sentence.", "Draw What You Read": "Draw your favorite part of the story." }[k]], ["Activity", `Use the AI Writing Brief below to write an original ${c.themeName.toLowerCase()} passage at the right reading level, then add it here.`], ["Answer", k === "Draw What You Read" ? "Answers will vary" : "Add from your passage — check carefully"]], "Title at top, text block in a soft rounded box, small illustration beside it", pr(`Reading illustration — ${obj}`, TOOL.media, P_.asset(c, obj), "Beside the passage, small.", ["Passage text", "Questions", "Answer lines"], [`${cap(obj)} asset`], ["Spelling and grammar checked", "Questions match the passage"]));
    }
    case "Writing": {
      const list = WRITING_PROMPTS[c.age], pmt = list[i % list.length];
      tag("writing", { pmt }); return pageObj(`Writing: ${pmt}`, [["Learning objective", "Express ideas in writing"], ["Instructions for the child", pmt + "."], ["Activity", [`Drawing box at the top`, `${c.age === "2-4" ? "No lines — drawing only" : c.age === "4-6" ? "3 wide handwriting lines" : "6-8 writing lines"}`]], ["Answer", "Answers will vary"]], "Drawing box on top half, writing lines on bottom half", pr("Decoration", TOOL.manual, "No new image needed — reuse your mascot holding a pencil (Character Pose prompt in Stage 4).", "Top corner.", ["Prompt text", "Writing lines", "Drawing box"], ["Mascot asset"], ["Lines spaced for the age group"]));
    }
    case "Tracing": {
      const step = TRACING_STEPS[i % TRACING_STEPS.length];
      const start = c.ch ? c.ch.name : cap(c.kit.objects[0]), goal = c.kit.objects[(i + 1) % c.kit.objects.length];
      tag("tracing", { step, start, goal }); return pageObj(`Tracing: ${step}`, [["Learning objective", "Fine motor control and pencil grip"], ["Instructions for the child", `Help ${start} reach the ${goal}. Trace the lines.`], ["Activity", [`4-5 ${step.toLowerCase()} dotted paths from left to right`, `${start} on the left, ${goal} on the right`]], ["Answer", "—"]], `${start} on the left, ${goal} on the right, wide dotted paths between them`, c.ch ? pr(`${c.ch.name} — facing right`, TOOL.media, P_.pose(c, c.ch, "standing happily and waving", "shown facing right"), "Left side of the page.", [`Dotted ${step.toLowerCase()} paths (Canva lines, dashed)`, "Title & instruction"], [`${cap(goal)} asset`], ["Paths are wide enough for little hands", "Character faces the goal"]) : pr(`${cap(goal)} asset`, TOOL.graphics, P_.asset(c, goal), "Right side of the page.", ["Dotted paths", "Title & instruction"], [`${cap(c.kit.objects[0])} asset`], ["Paths are wide enough for little hands"]));
    }
    case "Shapes": {
      const sh = SHAPES[i % (c.age === "2-4" ? 6 : SHAPES.length)];
      tag("shape", { sh }); return pageObj(`Shape: ${cap(sh)}`, [["Learning objective", `Recognize and trace a ${sh}`], ["Instructions for the child", `Trace the ${sh}. Color all the ${pl(sh)}.`], ["Activity", [`Big dotted ${sh} to trace`, `A mix of 6-8 shapes — color only the ${pl(sh)}`]], ["Answer", `Color every ${sh}`]], "Big shape top-left, mixed shapes field below", pr(`Shape asset — ${sh}`, TOOL.manual, `No AI needed — use Canva's Elements → Shapes for a perfect ${sh}. (Optional mascot holding a ${sh}.)`, "Top-left, large.", ["All shapes (Canva shapes)", "Dotted outline"], ["Mascot asset"], ["Count how many target shapes for the answer key"]));
    }
    case "Colors": {
      const [col, o] = COLOR_OBJECTS[i % COLOR_OBJECTS.length];
      tag("color", { col, o }); return pageObj(`Color: ${cap(col)}`, [["Learning objective", `Recognize the color ${col}`], ["Instructions for the child", `Color the ${o} ${col}. Circle the ${col} things.`], ["Activity", [`Line-art ${o} to color`, `4 small objects — 2 are ${col}`]], ["Answer", `The ${col} objects`]], `Big ${o} outline in center, small color-choice objects below`, pr(`Coloring object — ${o}`, TOOL.media, P_.coloring(c, article(o)), "Center, large.", [`Color word “${col.toUpperCase()}” in ${col}`, "Small objects"], [], ["Line art has no gray shading"]));
    }
    case "Vocabulary": {
      const w = c.kit.objects[i % c.kit.objects.length];
      tag("vocab", { w }); return pageObj(`Word: ${w.toUpperCase()}`, [["Learning objective", "Learn new theme words"], ["Instructions for the child", "Say the word. Trace it. Draw it."], ["Activity", [`Picture of the ${w}`, `Dotted word “${w}” to trace`, "Small drawing box"]], ["Answer", "—"]], "Picture top, word tracing middle, drawing box bottom", pr(`Vocabulary picture — ${w}`, TOOL.graphics, P_.asset(c, w), "Top center.", [`The word ${w.toUpperCase()}`, "Tracing letters", "Drawing box"], [], ["Word spelled correctly"]));
    }
    default: {
      const mix = ["ABC / Alphabet", "Numbers", "Shapes", "Colors", "Tracing"];
      return workbookItem(c, mix[i % mix.length], Math.floor(i / mix.length), r);
    }
  }
}

function activityItem(c, type, i, r) {
  const objs = c.kit.objects, obj = objs[i % objs.length];
  const subj = c.ch && i % 2 === 0 ? charDesc(c.ch) : `a friendly smiling ${obj}`;
  const lv = c.lv;
  switch (type) {
    case "Coloring Pages":
      tag("coloring", { who: c.ch && i % 2 === 0 ? c.ch.name : obj }); return pageObj(`Coloring Page: ${c.ch && i % 2 === 0 ? c.ch.name : cap(obj)}`, [["Child instructions", "Color the picture!"], ["Activity content", `Full-page line art of ${c.ch && i % 2 === 0 ? c.ch.name : article(obj)}`], ["Canva design", "Line art centered with 0.5 in margin; small title at top; page number at bottom"]], "Title top · line art fills the page", pr(`Coloring page — ${c.ch && i % 2 === 0 ? c.ch.name : obj}`, TOOL.media, P_.coloring(c, subj), "Center, as large as possible inside margins.", ["Page title", "Page number"], [], ["No gray shading", "Lines are thick and closed"]));
    case "Mazes": {
      const size = [[5, 6, 7], [6, 8, 10], [8, 10, 13], [10, 12, 15], [12, 14, 16]][AGES.findIndex((x) => x.id === c.age)][lv];
      const svg = makeMaze(size, size, P.id + (P.seed || "") + "maze" + i);
      const start = c.ch ? c.ch.name : cap(objs[0]), goal = objs[(i + 2) % objs.length];
      tag("maze", { start, goal, size }); return pageObj(`Maze: Help ${start} find the ${goal}`, [["Child instructions", `Help ${start} reach the ${goal}!`], ["Activity content", `${size}×${size} maze (green dot = start, pink dot = finish). Download it and place it in Canva.`], ["Canva design", `Put ${start} at the green start and the ${goal} at the pink finish`]], "Border around page · maze centered · start character top-left · goal bottom-right", pr("Maze border decoration", TOOL.dream, P_.mazeBorder(c), "Full page behind the maze.", ["The maze itself (downloaded SVG)", "Title & instruction"], [c.ch ? `${c.ch.name} pose asset` : `${cap(objs[0])} asset`, `${cap(goal)} asset`], ["Solve the maze yourself once", "Start and finish are clear"]), `<div class="svg-wrap">${svg}</div><div class="row" style="margin-top:8px"><button class="btn small secondary" data-act="dl-svg" data-name="maze-${i + 1}.svg" data-svg="${esc(svg)}">⬇ Download maze (SVG for Canva)</button></div>`);
    }
    case "Matching Games": {
      const n = c.age === "2-4" ? 3 : [4, 5, 6][lv];
      const items = shuffle(r, objs).slice(0, n), right = shuffle(r, items);
      tag("matching", { items, right }); return pageObj(`Match the Shadows`, [["Child instructions", "Draw a line from each picture to its shadow."], ["Activity content", [`Left column: ${items.join(", ")}`, `Right column (shadows): ${right.join(", ")}`]], ["Answer key", items.map((x) => `${x} → shadow #${right.indexOf(x) + 1}`).join("; ")], ["Canva design", "Make shadows by duplicating each asset and setting Adjust → Brightness to −100"]], "Two columns with dots for drawing lines", pr("Matching assets", TOOL.graphics, `Reuse your ${items.join(", ")} assets — no new generation needed.`, "Left column in order, shadows in shuffled order on the right.", ["Dots and lines", "Shadows (Canva brightness −100)", "Title"], items.map((x) => cap(x) + " asset"), ["Every picture has exactly one match"]));
    }
    case "Spot the Difference": {
      const diffs = shuffle(r, [`Change the color of the ${objs[0]}`, `Remove one ${objs[2]}`, `Add a small star to the sky`, `Flip the ${objs[1]} to face the other way`, `Make the ${objs[3]} smaller`, `Remove a cloud`, `Change the ${objs[4]}'s color`]).slice(0, [5, 6, 7][lv]);
      tag("spot", { diffs }); return pageObj("Spot the Difference", [["Child instructions", `Find ${diffs.length} differences. Circle them!`], ["Activity content", "Generate ONE master scene, duplicate it in Canva, then change these elements in the bottom copy:"], ["Differences to make", diffs], ["Answer key", diffs.join("; ")]], "Master scene on top · edited copy below · counter boxes", pr("Spot-the-difference master scene", TOOL.dream, P_.spot(c), "Top half; duplicate it into the bottom half.", ["The differences (edit in Canva / Magic Edit)", "Title", "Counter boxes"], [], [`Exactly ${diffs.length} differences`, "Answer key matches"]));
    }
    case "Word Search": {
      const words = [...new Set(objs.concat(c.kit.deco).map((w) => w.split(" ").pop().replace(/[^a-z]/gi, "").toUpperCase()).filter((w) => w.length >= 3))];
      const size = c.age === "2-4" ? 6 : [8, 10, 12][lv];
      const ws = makeWordSearch(shuffle(r, words).slice(0, [6, 8, 10][lv]), size, lv >= 2, P.id + (P.seed || "") + "ws" + i);
      tag("wordsearch", { words: ws.placed.map((p) => p.word), size }); return pageObj(`${c.themeName} Word Search`, [["Child instructions", "Find and circle the hidden words."], ["Words to find", ws.placed.map((p) => p.word).join(", ")], ["Answer key", ws.placed.map((p) => `${p.word}: ${p.at}`)], ["Canva design", "Build the grid with a Canva table (one letter per cell), word list below with small pictures"]], "Grid centered · word bank with pictures below", pr("Word bank pictures", TOOL.graphics, "Reuse your theme assets as small pictures next to each word — no new generation needed.", "Beside each word in the word bank.", ["Letter grid (Canva table)", "Word list"], ws.placed.slice(0, 4).map((p) => cap(p.word.toLowerCase()) + " asset"), ["Every word can be found"]), `<div class="row" style="align-items:flex-start">${wsTable(ws, false)}<div><b>Answer key</b>${wsTable(ws, true)}</div></div><div class="row" style="margin-top:8px">${copyBtn(ws.grid.map((row) => row.join(" ")).join("\n"), "Copy grid as text")}</div>`);
    }
    case "Simple Puzzles": {
      const odd = shuffle(r, objs).slice(0, 2), n = [3, 4, 5][lv];
      const row = shuffle(r, Array(n).fill(odd[0]).concat([odd[1]]));
      tag("oddone", { row, odd: odd[1] }); return pageObj("Which One Is Different?", [["Child instructions", "Circle the one that is different."], ["Activity content", row.join(" · ")], ["Answer key", `${odd[1]} (picture #${row.indexOf(odd[1]) + 1})`]], "One row of pictures in rounded boxes", pr("Puzzle assets", TOOL.manual, `Reuse your ${odd.join(" and ")} assets — duplicate ${odd[0]} ${n} times.`, "One row, equal spacing.", ["Boxes", "Title"], odd.map((x) => cap(x) + " asset"), ["Only one item is different"]));
    }
    case "Cut and Paste": {
      const n = [3, 4, 5][lv];
      tag("cutpaste", { n, obj }); return pageObj("Cut & Glue: Smallest to Biggest", [["Child instructions", "Cut out the pictures. Glue them from smallest to biggest."], ["Activity content", `${n} copies of the ${obj} in different sizes at the bottom (cut zone, dashed borders); ${n} empty boxes at the top`], ["Answer key", "Smallest → biggest, left to right"]], "Top: numbered empty boxes · Bottom: dashed cut-out boxes", pr(`${cap(obj)} asset`, TOOL.graphics, P_.asset(c, obj), `Duplicate ${n} times at different sizes.`, ["Dashed cut lines", "Numbered boxes", "Scissor icon"], [`${cap(obj)} asset`], ["Sizes are clearly different", "Cut boxes fit the glue boxes"]));
    }
    case "Tracing": return workbookItem(c, "Tracing", i, r);
    case "Dot-to-Dot": {
      const n = c.age === "2-4" ? 5 : [10, 20, 30][lv];
      tag("dot", { n, obj }); return pageObj(`Dot-to-Dot: ${cap(obj)}`, [["Child instructions", `Connect the dots from 1 to ${n}. Then color it!`], ["Activity content", `Place ${n} numbered dots around the outline of the ${obj} in Canva, then delete or fade the outline`], ["Answer key", `A ${obj}`]], "Dots in center · small hint picture in corner", pr(`Dot-to-dot reference — ${obj}`, TOOL.media, P_.dot(c, obj), "Center; lower transparency to 20% while you place dots.", [`${n} dots + numbers`, "Title"], [], ["Numbers go in the right order", "Shape is recognizable when finished"]));
    }
    default: {
      const mix = ACTIVITY_TYPES.slice(0, 9);
      return activityItem(c, mix[i % mix.length], i, r);
    }
  }
}

function coverPage(c, kind) {
  tag("cover", { kind }); return pageObj("Cover", [["Top", "Product title (add in Canva)"], ["Center", c.ch ? `${c.ch.name} illustration` : "Main cover illustration"], ["Bottom", `Subtitle + “Ages ${c.age}”`]], `Title in top third · artwork fills the page · age badge bottom`, pr("Cover artwork", TOOL.dream, P_.cover(c, c.ch, kind), "Full page; title over the clean top area.", ["Title", "Subtitle", `Age badge “Ages ${c.age}”`, "Your brand name/logo"], c.ch ? [`${c.ch.name} master character`] : [], ["Title is easy to read at thumbnail size", "No AI text in the artwork"]));
}
function certificatePage(c) {
  tag("certificate", {}); return pageObj("Certificate of Completion", [["Text to add", ["“Great Job!”", "“This certificate is awarded to ________”", `“for completing ${productName(c)}”`, "Date + star stickers"]]], "Decorative border with large clean center for text", pr("Certificate border", TOOL.dream, P_.certificate(c), "Full page behind the text.", ["All certificate wording", "Name line"], c.ch ? [`${c.ch.name} pose (cheering)`] : [], ["No AI text in the border"]));
}

/* ---------- Story Mixer: builds the page-by-page beats from every choice ---------- */
function storyLessons() {
  const picked = listOf(P.a.lessons);
  if (picked.length) return picked.map((x) => STORY_LESSONS[x] ? { name: x, ...STORY_LESSONS[x] } : { name: x, lesson: x, beats: [["Learning moment", `learns something important about ${x.toLowerCase()}`, "thoughtful"], ["Putting it into practice", `shows ${x.toLowerCase()} in action`, "proud"]] });
  const t = firstOf(P.a.storyType);
  return [{ name: t || "Story", lesson: STORY_LESSON[t] || "Kindness and courage help us grow", beats: [] }];
}
function storyBeats(c) {
  const N = parseInt(P.a.pages, 10) || 12;
  const r = rngFrom(P.id + (P.seed || "") + "beats");
  const fr = c.friends || [];
  const F1 = fr[0] ? fr[0].name : "a kind friend";
  const types = listOf(P.a.storyType).map((x) => x.toLowerCase());
  const twist = String(P.a.twist || pick(r, STORY_TWISTS)).replace(/\.$/, "");
  const mood = P.a.mood || "Heartwarming";
  const ending = String(P.a.ending || STORY_ENDINGS[0]);
  const funny = types.some((t) => /funny|silly|rhym/.test(t)) || /funny|silly/i.test(mood);
  const mystery = types.some((t) => /myster/.test(t));
  const lessons = storyLessons();
  const B = (beat, action, emotion, prio, withFriend = false, pair = "") => ({ beat, action, emotion, prio, withFriend, pair });
  const endBeat = /bedtime|sleepy/i.test(ending) ? B("Sweet dreams", "snuggles into bed, smiling about the day, as the stars twinkle outside", "sleepy and content", 1)
    : /surprise/i.test(ending) ? B("A happy surprise", "discovers a wonderful surprise waiting at the end", "delighted and amazed", 1, true)
    : /continued/i.test(ending) ? B("To be continued…", "spots a hint of the next adventure on the horizon", "excited and curious", 1, true)
    : /lesson/i.test(ending) ? B("Sharing the lesson", "shares what they learned with everyone", "warm and proud", 1, true)
    : B("Happy celebration", "celebrates with everyone in a joyful little party", "joyful", 1, true);
  const list = [
    B("Meet the hero", "smiles and waves hello, introducing themselves", "happy and welcoming", 1),
    B("Everyday world", "enjoys a normal day doing favorite things", "cheerful", 4),
    ...(fr.length ? [B("Meet the friends", `plays together with ${fr.map((x) => x.name).join(" and ")}`, "cheerful and playful", 2, true)] : []),
    B("The big wish", "dreams about what they want most", "hopeful and excited", 2),
    B("The twist!", `is surprised when ${twist.charAt(0).toLowerCase() + twist.slice(1)}`, "surprised and curious", 1),
    B("First try", "tries a first idea", "determined", 3),
    B("Oops!", funny ? "watches the first idea go wonderfully, hilariously wrong" : "watches the first idea not work out", funny ? "giggly and surprised" : "disappointed but not scared", 3),
    ...(mystery ? [B("A clue!", "finds an important clue and looks closer", "curious, eyes wide", 2, true)] : []),
    ...(lessons[0].beats[0] ? [B(lessons[0].beats[0][0], lessons[0].beats[0][1], lessons[0].beats[0][2], 2, false, "L0")] : [B("Big feelings", "takes a quiet moment with their feelings", "gently sad", 2)]),
    B("A helping hand", `gets kind encouragement from ${F1}`, "comforted and thoughtful", 2, fr.length > 0),
    ...(lessons[0].beats[1] ? [B(lessons[0].beats[1][0], lessons[0].beats[1][1], lessons[0].beats[1][2], 2, false, "L0")] : []),
    B("Second try", "tries a brand-new idea", "focused", 4),
    ...(funny ? [B("Silly moment", "has a silly, giggly moment that makes everyone laugh", "laughing", 4, fr.length > 0)] : []),
    ...(lessons[1] && lessons[1].beats[0] ? [B(lessons[1].beats[0][0], lessons[1].beats[0][1], lessons[1].beats[0][2], 3, false, "L1")] : []),
    ...(lessons[1] && lessons[1].beats[1] ? [B(lessons[1].beats[1][0], lessons[1].beats[1][1], lessons[1].beats[1][2], 3, false, "L1")] : []),
    B("Another obstacle", "meets one more (child-safe) obstacle", "a little frustrated but safe", 5),
    B("Working together", `works together with ${F1} on a clever plan`, "hopeful", 4, fr.length > 0),
    B("Getting closer", "makes real progress", "encouraged and smiling", 5),
    B("The big moment", "faces the biggest moment of the story, bravely", "brave and determined", 1),
    B("Hooray!", "succeeds at last", "overjoyed and proud", 1, fr.length > 0),
    B("What we learned", `thinks about the lesson: ${lessons.map((l) => l.lesson.toLowerCase()).join(" and ")}`, "warm and thoughtful", 2),
    endBeat,
  ];
  // Extra beats for long books
  const extra = [B("Exploring further", "explores a new corner of the world", "curious", 6), B("A new discovery", "discovers something unexpected and wonderful", "amazed", 6, true), B("Rest stop", "takes a cozy little rest and a snack", "calm", 7, fr.length > 0), B("Almost there", "can almost see the goal", "excited", 6)];
  let beats = list.slice();
  let x = 0;
  // Trim the least important beats first (lesson pairs leave together so no lesson is left half-told)…
  while (beats.length > N) {
    let worst = -1; beats.forEach((b, i) => { if (worst < 0 || b.prio >= beats[worst].prio) worst = i; });
    const pr0 = beats[worst].pair;
    beats = pr0 && beats.filter((b) => b.pair === pr0).length <= beats.length - N + 1 ? beats.filter((b) => b.pair !== pr0) : beats.filter((_, i) => i !== worst);
  }
  // …then fill long books with extra adventure beats
  while (beats.length < N && x < extra.length) beats.splice(beats.length - 4, 0, extra[x++]);
  while (beats.length < N) beats.splice(beats.length - 4, 0, B("Adventure continues", "keeps going on the adventure", "cheerful", 9));
  return beats.map((b) => ({ ...b, light: MOOD_LIGHT[mood] || "warm friendly lighting" }));
}

function backCoverPage(c) {
  const text = P.product === "storybook" ? ["Short book description", `Age range “Ages ${c.age}”`, "Your brand name/logo"] : ["“What's inside” list (3-5 highlights)", `Age range “Ages ${c.age}”`, "Page count", "Your brand name/logo"];
  { tag("back", {}); return pageObj("Back Cover", [["Text to add", text]], "Quiet artwork with a large blank center for the text", pr("Back cover artwork", TOOL.dream, P_.back(c), "Full page; text in the clean center.", text, ["Front cover style & palette"], ["Matches the front cover style", "No AI text in the artwork"])); }
}
function coverKind() {
  return { storybook: "picture-book", workbook: "workbook", activity: "activity book", pack: "printable learning pack", bundle: "learning bundle", game: String(P.a.format || "").startsWith("Digital") ? "digital game" : "game box" }[P.product];
}
const isCoverPage = (p) => /^(Cover|Bundle Cover|Back Cover)$/.test(p.title);

/* Every product always starts with a front cover and ends with a back cover. */
function genPages(c) {
  const pages = buildPages(c);
  if (!pages.length || !/Cover$/.test(pages[0].title)) pages.unshift(coverPage(c, coverKind()));
  if (!pages.some((p) => p.title === "Back Cover")) pages.push(backCoverPage(c));
  return pages;
}

function buildPages(c) {
  const r = rngFrom(P.id + (P.seed || "") + (P.a.difficulty || "") + c.age);
  const pages = [];
  const N = pageCount();
  if (P.product === "storybook") {
    const ZONES = ["upper left", "upper third", "right side", "bottom band"];
    pages.push(coverPage(c, "picture-book"));
    const written = writeStory(c), edits = P.storyEdits || {};
    storyBeats(c).forEach((b, k) => {
      const space = TEXT_SPACES[k % TEXT_SPACES.length], zone = ZONES[k % ZONES.length];
      const friend = b.withFriend && c.friends.length ? c.friends[k % c.friends.length] : null;
      const who = friend ? `${c.ch.name} and ${friend.name}` : c.ch.name;
      const text = friend ? P_.scene2(c, c.ch, friend, b.action, b.emotion, space, b.light) : P_.scene(c, c.ch, b.action, b.emotion, space, b.light);
      { tag("story", { zone, friend: friend ? friend.name : "", k }); pages.push(pageObj(`Page ${k + 1} — ${b.beat}`,
        [["Story text", edits[k] != null && edits[k] !== "" ? edits[k] : written[k]], ["Scene description", `${c.ch.name} ${b.action}${friend ? ` — with ${friend.name}` : ""}.`], ["Emotion", cap(b.emotion)], ["Characters on this page", who]],
        `Illustration fills the whole page · story text in the ${zone} on a soft rounded box`,
        pr(`Page ${k + 1} scene`, TOOL.dream, text, `Full page (set as background). Story text goes in the ${zone}.`, ["Story text", "Page number"], [`${c.ch.name} master character (upload as reference)`].concat(friend ? [`${friend.name} master character`] : [], ["Location Lock details"]), [`${who} look the same as the master character${friend ? "s" : ""}`, "Text area is clear"]))); }
    });
    { tag("end", {}); pages.push(pageObj("The End", [["Text to add", ["“The End”", "Optional: 2 discussion questions for grown-ups"]]], "Peaceful closing artwork with space for “The End”", pr("End page artwork", TOOL.dream, `Warm final children's storybook illustration of ${charDesc(c.ch)}, sitting peacefully in ${c.kit.setting} at sunset, smiling proudly after completing the adventure. Golden sky, soft clouds, gentle emotional atmosphere, ${c.style}, wide peaceful composition with generous empty space for a closing message, suitable for ages ${c.age}, no text or watermark.`, "Full page.", ["“The End”"], [`${c.ch.name} master character`], ["Character consistent"]))); }
    { tag("back", {}); pages.push(pageObj("Back Cover", [["Text to add", ["Short book description", "Age range", "Your brand name"]]], "Quiet artwork with large blank center", pr("Back cover artwork", TOOL.dream, P_.back(c), "Full page.", ["Description", "Brand"], [], ["Matches front cover style"]))); }
    return pages;
  }
  if (P.product === "workbook" || P.product === "activity") {
    const isWB = P.product === "workbook";
    pages.push(coverPage(c, isWB ? "workbook" : "activity book"));
    { tag("welcome", {}); pages.push(pageObj("Welcome Page", [["Text to add", [`“Hello! I'm ${c.ch ? c.ch.name : "your learning buddy"}. Let's learn and play!”`, "How to use this book (for grown-ups): 3 short tips", "“This book belongs to: ________”"]]], "Mascot waving on one side, speech bubble with welcome text", c.ch ? pr(`${c.ch.name} waving`, TOOL.media, P_.pose(c, c.ch, "waving hello with a big smile"), "Left side; speech bubble to the right.", ["Welcome text", "Name line"], [], ["Character consistent"]) : pr("Welcome decoration", TOOL.dream, P_.printSafe(c), "Page background.", ["Welcome text"], [], []))); }
    const mid = Math.max(1, N - (isWB ? 3 : 4));
    for (let i = 0; i < mid; i++) {
      // Mixed choices: rotate through every selected skill / activity type
      const kinds = listOf(isWB ? P.a.skill : P.a.activityType);
      const L = Math.max(1, kinds.length);
      const pg = isWB ? workbookItem(c, kinds[i % L], Math.floor(i / L), r) : activityItem(c, kinds[i % L], i, r);
      pg.title = `Page ${i + 2} — ${pg.title}`;
      pages.push(pg);
    }
    if (isWB) { tag("review", {}); pages.push(pageObj("Review Page", [["Activity", "Mix 4 favorite activities from this book on one page (re-use earlier assets)"], ["Instructions for the child", "Show what you learned!"]], "4 boxes, one mini-activity each", pr("Review", TOOL.manual, "No new image needed — reuse earlier assets.", "One asset per box.", ["All activities"], ["Earlier page assets"], ["Answers included in answer key"]))); }
    else {
      const keys = pages.filter((p) => p.fields.some(([k]) => k === "Answer key")).map((p) => `${p.title.split(" — ")[0]}: ${[].concat(p.fields.find(([k]) => k === "Answer key")[1]).join("; ")}`);
      { tag("answerkey", {}); pages.push(pageObj("Answer Key", [["Answers", keys.length ? keys : ["Add answers for each puzzle page"]]], "Small thumbnails of each puzzle with answers marked", pr("Answer key", TOOL.manual, "No AI needed — use small copies of each solved page.", "Grid of thumbnails.", ["All answers"], ["Every puzzle page"], ["Every answer verified"]))); }
    }
    pages.push(certificatePage(c));
    return pages;
  }
  if (P.product === "pack") {
    const o = c.kit.objects, T = c.themeName;
    const items = [
      [`${T} Alphabet Match`, "Match each picture to its beginning letter.", `${o.slice(0, 4).join(", ")} → first letters (shuffled)`, o.slice(0, 4).map((x) => `${x} → ${x[0].toUpperCase()}`).join("; ")],
      [`Count the ${cap(pl(o[1]))}`, `Count the ${pl(o[1])}. Write the number.`, `4 boxes with 2, 5, 3 and 7 ${pl(o[1])}`, "2, 5, 3, 7"],
      [`${T} Color Match`, "Color each picture to match the color word.", `${o.slice(2, 6).join(", ")} line art + color words`, "Follow the color words"],
      [`${T} Maze`, `Help the ${o[0]} reach the ${o[3]}!`, "Maze (download below)", "Path from start to finish"],
      [`Trace the ${T} Words`, "Trace each word.", o.slice(0, 4).map((x) => x.split(" ").pop().toUpperCase()).join(", "), "—"],
      [`${T} Shadow Matching`, "Match each picture to its shadow.", `${o.slice(4, 8).join(", ")} + shadows (shuffled)`, "Each picture → its own shadow"],
      [`${T} Pattern Activity`, "What comes next?", `${o[0]}, ${o[1]}, ${o[0]}, ${o[1]}, ${o[0]}, ___`, o[1]],
      [`${T} Coloring Page`, "Color the picture!", `Full-page line art of ${c.ch ? c.ch.name : article(o[0])}`, "—"],
    ];
    pages.push(coverPage(c, "printable learning pack"));
    items.forEach(([t, ins, act, ans], k) => {
      const isMaze = k === 3, isColor = k === 7;
      const svg = isMaze ? makeMaze(c.age === "2-4" ? 5 : 8, c.age === "2-4" ? 5 : 8, P.id + (P.seed || "") + "packmaze") : "";
      { tag(["lettermatch", "countboxes", "colormatch", "maze", "tracewords", "matching", "pattern", "coloring"][k], { pack: true }); pages.push(pageObj(`Activity ${k + 1} — ${t}`, [["Learning objective", P.a.goal || "Theme-based early learning"], ["Instructions for the child", ins], ["Activity", act], ["Answer", ans]], "Title top · activity center · small mascot corner", isColor ? pr("Coloring page", TOOL.media, P_.coloring(c, c.ch ? charDesc(c.ch) : `a friendly smiling ${o[0]}`), "Full page.", ["Title"], [], ["No gray shading"]) : isMaze ? pr("Maze border", TOOL.dream, P_.mazeBorder(c), "Behind the maze.", ["Maze (SVG)", "Title"], [`${cap(o[0])} asset`, `${cap(o[3])} asset`], ["Maze solvable"]) : pr("Activity assets", TOOL.manual, `Reuse your ${o.slice(0, 4).join(", ")} assets from the Asset Library.`, "Arrange in a clean grid.", ["Letters, numbers, words, lines"], o.slice(0, 4).map((x) => cap(x) + " asset"), ["Answer verified"]), isMaze ? `<div class="svg-wrap">${svg}</div><div class="row" style="margin-top:8px"><button class="btn small secondary" data-act="dl-svg" data-name="pack-maze.svg" data-svg="${esc(svg)}">⬇ Download maze (SVG)</button></div>` : "")); }
    });
    pages.push(certificatePage(c));
    return pages;
  }
  if (P.product === "game") return gamePages(c, r);
  if (P.product === "bundle") return bundlePlan(c).pages;
  return pages;
}

/* ---------- Game ---------- */
function gameType() {
  let t = P.a.gameType || "Matching Game";
  if (t === "Surprise me") t = GAME_TYPES[hash(P.id) % 9];
  return t;
}
function gameSpec(c) {
  const t = gameType(), o = c.kit.objects, young = c.age === "2-4";
  const digital = String(P.a.format || "").startsWith("Digital");
  const base = { materials: digital ? ["Computer or tablet", "Canva presentation link"] : ["Printer + card stock", "Scissors"] };
  const S = {
    "Matching Game": { how: ["Lay all picture cards face up.", "Find each picture's matching shadow (or word) card.", "Say the name out loud when you make a match."], rules: ["Take turns finding one match.", "If the match is wrong, put the cards back."], win: "Match all the cards — or the player with the most matches wins.", comps: [`${young ? 6 : 8} picture cards`, `${young ? 6 : 8} matching shadow/word cards`, "Instruction card"] },
    "Memory Cards": { how: ["Shuffle the cards and place them face down in a grid.", "Flip two cards.", "If they match, keep them! If not, flip them back."], rules: ["Take turns flipping two cards.", "Match = go again."], win: "When all pairs are found, the player with the most pairs wins.", comps: [`${young ? 6 : 12} pairs (${young ? 12 : 24} cards) — duplicate each card in Canva`, "Card back design", "Instruction card"] },
    "Flashcard Game": { how: ["Show a flashcard.", "The player says the word.", "Correct answers earn a star."], rules: ["Help with a hint if the player is stuck.", "Shuffle cards each round."], win: "Collect 10 stars to win!", comps: ["20 picture flashcards", "Star tokens", "Score chart"] },
    "Scavenger Hunt": { how: ["Print the checklist.", "Look for each item (with a grown-up nearby).", "Check off each item you find."], rules: ["Stay in safe areas chosen by a grown-up.", "Look, don't take things that belong to others."], win: "Find every item on the list!", comps: ["Picture checklist (12 items)", "Finder badge", "Grown-up tips card"] },
    "Quiz Game": { how: ["Read a question card.", "Answer out loud or point to the picture.", "Check the answer on the back."], rules: ["One question per turn.", "Correct answer = 1 point."], win: "The first to 10 points — or the most points at the end — wins.", comps: ["20 question cards with answers", "Score sheet", "Instruction card"] },
    "Board Game": { how: ["Each player picks a token and starts at START.", "Roll the die and move.", "Land on a star space? Draw a challenge card!"], rules: ["Complete the challenge to stay; if not, move back 1 space.", "Exact roll not needed to finish."], win: "The first player to reach FINISH wins.", comps: ["Game board (30 spaces)", "4 player tokens", "12 challenge cards", "Paper die template"] },
    "Sorting Game": { how: ["Place the sorting mats on the table.", "Pick a picture card.", "Put it on the right mat."], rules: ["Explain why it belongs there.", "Fix mistakes together."], win: "Sort every card correctly!", comps: ["2-3 sorting mats", "12 picture cards", "Answer key"] },
    "Guessing Game": { how: ["Read one clue at a time from a “Who am I?” card.", "Players guess after each clue.", "Fewer clues = more points."], rules: ["Guess after clue 1 = 3 points, clue 2 = 2, clue 3 = 1."], win: "The player with the most points wins.", comps: ["12 “Who am I?” clue cards", "Picture answer cards", "Score sheet"] },
    "Learning Challenge": { how: ["Pick a challenge card each day.", "Complete the challenge.", "Color a space on the progress tracker."], rules: ["One challenge per day.", "Ask a grown-up for help anytime."], win: "Fill the tracker and earn every badge!", comps: ["10 challenge cards", "Progress tracker", "6 reward badges", "Certificate"] },
  }[t];
  if (t === "Board Game") base.materials.push("Die", "Tokens");
  return { type: t, digital, materials: base.materials, ...S, objects: o };
}
function gameName(c) { return `${c.themeName} ${gameType().replace("Game", "").trim()} ${gameType().includes("Game") ? "Game" : ""}`.replace(/\s+/g, " ").trim(); }
function gamePages(c, r) {
  const g = gameSpec(c), o = c.kit.objects, pages = [];
  pages.push(coverPage(c, g.digital ? "digital game" : "game box"));
  { tag("rules", {}); pages.push(pageObj("How to Play", [["Steps", g.how], ["Rules", g.rules], ["Winning", g.win]], "Numbered steps with small icons; mascot giving a thumbs up", c.ch ? pr(`${c.ch.name} thumbs up`, TOOL.media, P_.pose(c, c.ch, "giving a cheerful thumbs up"), "Bottom right.", ["All rules text"], [], ["Rules are short and clear"]) : null)); }
  o.forEach((obj, k) => { tag("card", { obj }); pages.push(pageObj(`Card ${k + 1} — ${cap(obj)}`, [["Card text (add in Canva)", obj.toUpperCase()], ["Back side", "Shared card-back design"]], "Picture centered on card, word at bottom", pr(`Game asset — ${obj}`, TOOL.graphics, P_.asset(c, obj, "consistent flashcard-game asset style, same scale as the other cards"), "Center of the card.", ["Word label", "Card border"], [], ["Same size and style as other cards"]))); });
  if (g.type === "Quiz Game") {
    const qs = [];
    for (let k = 0; k < 6; k++) { const a = rint(r, 1, 5), b = rint(r, 1, 5), it = pick(r, o); qs.push(`If you have ${a} ${pl(it)} and find ${b} more, how many ${pl(it)}? (Answer: ${a + b})`); }
    { tag("questions", { qs }); pages.push(pageObj("Question Cards", [["Sample questions (verified)", qs], ["More questions", `Use the AI Writing Brief to add ${c.themeName.toLowerCase()} fact questions — check every fact.`]], "4 question cards per page; answers on the back", null)); }
  }
  if (g.type === "Board Game") { tag("board", {}); pages.push(pageObj("Game Board", [["Build in Canva", ["30 rounded squares along the path", "Every 5th space = star space", "START and FINISH labels"]]], "Background art with the path built from Canva shapes", pr("Board background", TOOL.dream, P_.board(c), "Full page (landscape).", ["Path spaces", "Numbers", "START/FINISH"], [], ["Path is continuous"]))); }
  if (g.type === "Board Game") { tag("tokens", { list: o.slice(0, 4) }); pages.push(pageObj("Player Tokens", [["Tokens", o.slice(0, 4).join(", ")]], "4 tokens with cut lines", pr("Game token", TOOL.graphics, P_.token(c, o[0]), "Generate each token separately.", ["Cut lines"], [], ["All tokens same size"]))); }
  if (g.digital) {
    { tag("screens", {}); pages.push(pageObj("Digital Screens", [["Build in Canva", ["Start screen with PLAY button (link to page 2)", "One screen per question/card", "Correct ✓ and Try again ✗ screens", "Finish screen with confetti"]]], "Background + large buttons", pr("Digital game background", TOOL.dream, P_.gameBg(c), "Every screen.", ["Buttons & links", "Text"], [], ["Every button link works"]))); }
    { tag("buttons", {}); pages.push(pageObj("Game Buttons", [["Buttons", ["PLAY", "NEXT", "TRY AGAIN", "HOME"]]], "Large rounded buttons", pr("Button shape", TOOL.graphics, P_.button("yellow"), "Duplicate and recolor.", ["Button labels", "Links"], [], ["Text readable"]))); }
  }
  pages.push(certificatePage(c));
  return pages;
}

/* ---------- Bundle ---------- */
function bundlePlan(c) {
  const N = pageCount(), T = c.themeName;
  const parts = {
    "Preschool Learning Bundle": [["Alphabet", "workbook", { skill: "ABC / Alphabet" }, 0.3], ["Numbers & Counting", "workbook", { skill: "Numbers" }, 0.25], ["Shapes & Colors", "workbook", { skill: "Shapes" }, 0.15], ["Tracing", "workbook", { skill: "Tracing" }, 0.15], ["Coloring Pages", "activity", { activityType: "Coloring Pages" }, 0.15]],
    "Story + Activity Bundle": [["Storybook", "storybook", {}, 0.5], ["Story Activities", "activity", { activityType: "Mixed Activity Book" }, 0.35], ["Story Coloring Pages", "activity", { activityType: "Coloring Pages" }, 0.15]],
    "Homeschool Learning Bundle": [["Reading", "workbook", { skill: "Reading" }, 0.25], ["Math", "workbook", { skill: "Math" }, 0.3], ["Writing", "workbook", { skill: "Writing" }, 0.2], [`${T} Explorer Pack`, "pack", {}, 0.25]],
    "Birthday Activity Bundle": [["Party Games", "game", { gameType: "Scavenger Hunt" }, 0.3], ["Coloring Pages", "activity", { activityType: "Coloring Pages" }, 0.3], ["Puzzles", "activity", { activityType: "Word Search" }, 0.2], ["Party Printables", "pack", {}, 0.2]],
    "Classroom Activity Bundle": [["Morning Work", "workbook", { skill: "Mixed workbook" }, 0.35], ["Task Cards Game", "game", { gameType: "Quiz Game" }, 0.25], ["Group Game", "game", { gameType: "Board Game" }, 0.2], ["Activity Pages", "activity", { activityType: "Mixed Activity Book" }, 0.2]],
    "Themed Kids Mega Bundle": [["Mini Storybook", "storybook", {}, 0.2], ["Workbook", "workbook", { skill: "Mixed workbook" }, 0.3], ["Activity Book", "activity", { activityType: "Mixed Activity Book" }, 0.25], ["Matching Game", "game", { gameType: "Memory Cards" }, 0.15], ["Learning Pack", "pack", {}, 0.1]],
  }[P.a.bundleType || BUNDLE_TYPES[0]];
  const sections = parts.map(([name, product, extra, share]) => ({ name, product, extra, pages: Math.max(3, Math.round(N * share)) }));
  const bonus = ["Certificate of completion", "Reward chart", "Bookmark", "Sticker sheet", "Completion crown"];
  const name = bundleName(c);
  const pages = [];
  { tag("cover", { kind: "bundle" }); pages.push(pageObj("Bundle Cover", [["Title", name], ["Subtitle", `${N}+ printable pages · Ages ${c.age}`]], "Artwork with title space top third", pr("Bundle cover artwork", TOOL.dream, P_.bundleCover(c, name), "Full page.", ["Title", "Subtitle", "Page count badge"], [], ["Readable at thumbnail size"]))); }
  { tag("contents", { list: sections.map((s) => `${s.name} — ${s.pages} pages`).concat(["Bonus items"]) }); pages.push(pageObj("Contents Page", [["List", sections.map((s) => `${s.name} — ${s.pages} pages`).concat(["Bonus items"])]], "Simple list with small theme icons", null)); }
  sections.forEach((s, k) => { tag("divider", { name: s.name }); pages.push(pageObj(`Section ${k + 1} — ${s.name}`, [["Pages", `${s.pages} pages`], ["Build it", `Use the Create tool to build this section: ${PRODUCTS.find((p) => p.id === s.product).label}. Keep the same theme, age, style and mascot.`]], "Section divider page: big section title + mascot + theme border", pr(`${s.name} divider`, TOOL.manual, "Reuse the cover artwork (cropped) or the theme border — no new generation needed.", "Full page divider.", ["Section title"], ["Cover artwork", "Theme border"], []), `<button class="btn small" data-act="section" data-k="${k}">✨ Build this section now</button>`)); });
  { tag("reward", {}); pages.push(pageObj("Bonus: Reward Chart", [["Build", "7×5 grid of sticker spaces in Canva"]], "Decorative frame, grid in center", pr("Reward chart background", TOOL.dream, P_.reward(c), "Full page.", ["Grid", "Titles"], [], []))); }
  { tag("bookmark", {}); pages.push(pageObj("Bonus: Bookmark", [["Size", "2 × 6 in, 4 per page"]], "4 bookmarks with cut lines", pr("Bookmark art", TOOL.dream, P_.bookmark(c, c.ch), "Each bookmark.", ["Text", "Cut lines"], c.ch ? [`${c.ch.name} master`] : [], []))); }
  { tag("stickers", {}); pages.push(pageObj("Bonus: Sticker Sheet", [["Count", "12 stickers"]], "Even grid", pr("Sticker sheet", TOOL.graphics, P_.stickers(c), "Full page.", [], [], ["Count the stickers"]))); }
  pages.push(certificatePage(c));
  return { name, sections, bonus, pages };
}

/* ============ Names ============ */
function bundleName(c) { return `${c.themeName} ${(P.a.bundleType || "Learning Bundle").replace("Themed Kids ", "")}`; }
function productName(c) {
  if (P.name) return P.name;
  const T = c.themeName;
  switch (P.product) {
    case "storybook": return storyTitles(c)[0];
    case "workbook": { const s = listOf(P.a.skill); return `${T} ${s.length === 1 ? ({ "ABC / Alphabet": "Alphabet", "Mixed workbook": "Learning" }[s[0]] || s[0]) : "Learning"} Workbook`; }
    case "activity": { const t = listOf(P.a.activityType); return `${T} ${t.length === 1 && !t[0].startsWith("Mixed") ? t[0].replace(/s$/, "") + " Book" : "Activity Book"}`; }
    case "game": return gameName(c);
    case "pack": return `${T} Learning Pack`;
    case "bundle": return bundleName(c);
  }
  return "My Kids Product";
}
function storyTitles(c) {
  const n = c.ch ? c.ch.name : "Little One";
  const m = { "Adventure": `${n}'s Big Adventure`, "Friendship": `${n} Finds a Friend`, "Bedtime Story": `Goodnight, ${n}`, "Educational Story": `${n} Wonders Why`, "Life Lesson": `${n} Tries Again`, "Funny Story": `${n}'s Silly Day`, "Fantasy": `${n} and the Magic Door`, "Animal Story": `${n} and Friends` };
  const types = listOf(P.a.storyType);
  const first = m[types[0]] || `${n}'s Story`;
  const ADJ = { "Funny Story": "Silly", "Fantasy": "Magical", "Bedtime Story": "Sleepy", "Mystery": "Mystery", "Friendship": "Friendship", "Animal Story": "Wild", "Holiday & Seasons": "Holiday", "Science Adventure": "Science", "Silly Rhyming Story": "Rhyming", "Sports & Games": "Big Game", "Superhero (original)": "Super", "Family": "Family", "School Day": "School", "Life Lesson": "Brave", "Educational Story": "Learning", "Adventure": "Big" };
  const adj = ADJ[types.find((t) => t !== "Adventure") || types[0]] || "Big";
  const mixed = types.length > 1 ? `${n}'s ${adj} ${types.some((t) => /Adventure/.test(t)) ? "Adventure" : "Day"}` : `${n} and the ${c.kit.name.split(" ")[0]} Surprise`;
  const friend = (c.friends || [])[0];
  return [first, mixed, friend ? `${n} and ${friend.name}` : `Brave Little ${n}`];
}
const typeNoun = () => ({ storybook: "Storybook", workbook: "Workbook", activity: "Activity Book", game: "Game", pack: "Learning Pack", bundle: "Bundle" }[P.product]);
const ageNoun = (age) => ({ "2-4": "toddlers and preschoolers", "4-6": "preschool and kindergarten kids", "6-8": "early learners (grades 1-2)", "8-10": "kids in grades 3-4", "10-12": "tweens (grades 5-6)" }[age]);
function learningGoal(c) {
  return P.a.goal || (P.product === "storybook" ? storyLessons().map((l) => l.lesson).join("; ") : P.product === "workbook" ? labelOf(P.a.skill) : P.product === "activity" ? "Problem solving, fine motor skills and focus" : "Learning through play");
}

/* ============ Rendering ============ */
function setView(v) { view = v; render(); window.scrollTo(0, 0); }
function render() {
  const isOwner = !!(AUTH.user && AUTH.user.role === "owner");
  const ownerBtn = $("#nav-owner"); if (ownerBtn) ownerBtn.hidden = !isOwner;
  if (view === "owner" && !isOwner) view = "home";   // the Owner menu is for the owner code only
  document.querySelectorAll("#nav button").forEach((b) => b.classList.toggle("active", b.dataset.nav === view));
  const fn = { home: renderHome, create: renderCreate, ideas: renderIdeas, prompts: renderBuilder, projects: renderProjects, help: renderHelp, owner: renderOwner }[view];
  app.innerHTML = fn();
  const inp = $("#text-input"); if (inp) inp.focus();
}

function renderHome() {
  const last = loadAll()[0];
  return `
  <section class="hero">
    <img src="sanara-logo.webp" alt="SANARA AI Tool logo">
    <div>
      <span class="pill pink">Kids Digital Product Creator</span>
      <h1 style="margin-top:10px">Create amazing kids products — <span>one simple step at a time.</span></h1>
      <p class="tagline">Just choose what you want. SANARA builds the plan, the content, ready-to-copy Canva AI prompts, a Canva design guide and your selling kit.</p>
      <div class="flow"><b>Choose</b><i>→</i><b>Answer</b><i>→</i><b>Copy</b><i>→</i><b>Create in Canva</b><i>→</i><b>Finish</b><i>→</i><b>Sell</b></div>
      <div class="row">
        <button class="btn" data-act="new">✨ Start a new product</button>
        ${last ? `<button class="btn secondary" data-act="open" data-id="${last.id}">Continue “${esc(last.name || PRODUCTS.find((p) => p.id === last.product)?.label)}”</button>` : ""}
      </div>
    </div>
  </section>
  <h2>What would you like to create today?</h2>
  <div class="grid cols-3 home-tiles">
    ${PRODUCTS.map((p, i) => `<button class="tile" data-act="start" data-product="${p.id}"><span class="emoji">${p.emoji}</span><h3 style="color:${BRAND[i % 6]}">${i + 1}. ${p.label}</h3><p class="muted" style="margin:0">${p.desc}</p></button>`).join("")}
  </div>
  <div class="grid cols-3" style="margin-top:18px">
    <div class="card"><h3>💡 Need an idea?</h3><p class="muted">Browse 40 age-based product ideas and start with one tap.</p><button class="btn small secondary" data-nav="ideas">See ideas</button></div>
    <div class="card"><h3>🎨 Quick Canva prompt</h3><p class="muted">Turn a simple idea like “cute bunny” into a professional prompt.</p><button class="btn small secondary" data-nav="prompts">Open Prompt Builder</button></div>
    <div class="card"><h3>💚 The SANARA rule</h3><p class="muted"><b>AI generates the art. Canva builds the activity.</b> Fewer, better AI generations.</p><button class="btn small secondary" data-nav="help">How it works</button></div>
  </div>`;
}

/* ---------- Create (wizard) ---------- */
const STAGES = ["Choose Your Product", "Product Setup", "Content Creation", "Canva AI Prompts", "Canva Build Guide", "Sell Your Product"];
function renderCreate() {
  if (!P) P = newProject();
  const rail = `<div class="rail">${STAGES.map((s, i) => {
    const n = i + 1, cls = n === P.stage ? "current" : n <= P.maxStage ? "done" : "";
    return `<button class="${cls}" data-act="stage" data-n="${n}" ${n > P.maxStage ? "disabled" : ""}><span class="n">${n <= P.maxStage && n !== P.stage ? "✓" : n}</span>${s}</button>`;
  }).join("")}</div>`;
  const cmds = P.product ? `<div class="commands no-print">
      <button data-act="cmd" data-c="start">START OVER</button>
      ${P.a.theme ? `<button data-act="cmd" data-c="theme">CHANGE THEME</button>` : ""}
      ${P.a.age ? `<button data-act="cmd" data-c="age">CHANGE AGE</button>` : ""}
      ${P.maxStage >= 3 && P.product !== "storybook" ? `<button data-act="cmd" data-c="easier">MAKE IT EASIER</button><button data-act="cmd" data-c="harder">MAKE IT HARDER</button>` : ""}
      ${P.maxStage >= 3 && hasChar() ? `<button data-act="cmd" data-c="char">CHARACTER PROMPT</button>` : ""}
      ${P.maxStage >= 3 ? `<button data-act="cmd" data-c="prompts">CANVA PROMPTS</button><button data-act="cmd" data-c="sell">SELL IT</button>` : ""}
    </div>` : "";
  let body = "";
  if (P.stage === 1) body = renderStage1();
  else if (P.stage === 2) body = renderStage2();
  else {
    const c = ctx();
    body = [null, null, null, renderStage3, renderStage4, renderStage5, renderStage6][P.stage](c);
  }
  return rail + cmds + body;
}

function bubble(t, sub) {
  return `<div class="bubble"><img src="sanara-logo.webp" alt=""><div class="say"><h2>${t}</h2>${sub ? `<div class="muted">${sub}</div>` : ""}</div></div>`;
}

function renderStage1() {
  return `<div class="question">
    ${bubble("Welcome to SANARA! 👋", "Let's create something amazing for kids. What would you like to create today? Tap a card (or press its number).")}
    <div class="choices">${PRODUCTS.map((p, i) => `<button class="choice big ${P.product === p.id ? "selected" : ""}" data-act="product" data-product="${p.id}"><span class="row"><span class="num" style="background:${BRAND[i % 6]}">${i + 1}</span><span class="emoji">${p.emoji}</span></span><span>${p.label}<small>${p.desc}</small></span></button>`).join("")}</div>
    <p class="hint">Tip: you can press keys <b>1-6</b> on your keyboard.</p>
  </div>`;
}

function renderStage2() {
  const f = flow();
  if (P.q >= f.length) return renderSummary();
  const id = f[P.q], Q = question(id);
  const head = bubble(`${esc(Q.title)}`, Q.sub ? esc(Q.sub) : `Step ${P.q + 1} of ${f.length}`);
  let inner = "";
  if (Q.kind === "choice") {
    const cur = P.a[id];
    inner = `<div class="choices">${Q.options.map((o, i) => {
      const val = Q.values ? Q.values[i] : o;
      return `<button class="choice ${cur === val ? "selected" : ""}" data-act="answer" data-id="${id}" data-val="${esc(val)}"><span class="num" style="background:${BRAND[i % 6]}">${i + 1}</span><span>${esc(o)}${Q.subs && Q.subs[i] ? `<small>${esc(Q.subs[i])}</small>` : ""}</span></button>`;
    }).join("")}</div><p class="hint">Tap a choice or press its number${Q.options.length >= 10 ? " (0 = 10)" : ""}.</p>`;
  } else if (Q.kind === "text") {
    const val = P.a[id] || "";
    const ip = checkIP(val);
    inner = `<form class="text-answer" data-act="text-form" data-id="${id}">
        <input id="text-input" name="v" value="${esc(val)}" placeholder="${esc(Q.placeholder)}" autocomplete="off">
        <button class="btn" type="submit">Next →</button>
      </form>
      ${ip ? `<div class="warn">💡 <b>Let's keep it original.</b> “${esc(ip.word)}” is a protected character/brand, so we can't use it in products you sell. How about <b>${esc(ip.alt)}</b>? <button class="btn small" data-act="use-alt" data-id="${id}" data-val="${esc(ip.alt)}">Use this idea</button></div>` : ""}
      <div class="chips">${(Q.chips || []).map((ch) => `<button class="chip" data-act="answer" data-id="${id}" data-val="${esc(ch)}">${esc(ch)}</button>`).join("")}</div>`;
  } else if (Q.kind === "multi") {
    const cur = listOf(P.a[id]);
    const custom = cur.filter((v) => !Q.options.includes(v));
    inner = `<div class="choices">${Q.options.map((o, i) => `<button class="choice ${cur.includes(o) ? "selected" : ""}" data-act="toggle" data-id="${id}" data-val="${esc(o)}" aria-pressed="${cur.includes(o)}"><span class="num" style="background:${BRAND[i % 6]}">${cur.includes(o) ? "✓" : i + 1}</span><span>${esc(o)}</span></button>`).join("")}</div>
      ${custom.length ? `<div class="chips">${custom.map((v) => `<button class="chip selected-chip" data-act="toggle" data-id="${id}" data-val="${esc(v)}">✓ ${esc(v)} ✕</button>`).join("")}</div>` : ""}
      ${Q.allowOther ? `<form class="text-answer" data-act="multi-other" data-id="${id}" style="margin-top:12px"><input name="v" placeholder="✏️ Add your own…" autocomplete="off"><button class="btn secondary" type="submit">+ Add</button></form>` : ""}
      <p class="hint">${cur.length ? `Selected: <b>${esc(labelOf(cur))}</b>` : "Tap to select"} · up to ${Q.max}</p>
      <div class="row" style="justify-content:center"><button class="btn" data-act="multi-done" data-id="${id}">Done → Next</button></div>`;
  } else if (Q.kind === "character") {
    inner = renderCharBuilder();
  } else if (Q.kind === "friends") {
    inner = renderFriendPicker();
  }
  if (Q.kind === "choice" && Q.allowOther) {
    const isOther = P.a[id] && !Q.options.includes(P.a[id]);
    inner += `<form class="text-answer" data-act="text-form" data-id="${id}" style="margin-top:12px"><input name="v" value="${isOther ? esc(P.a[id]) : ""}" placeholder="✏️ Or type your own…" autocomplete="off"><button class="btn secondary" type="submit">Use mine →</button></form>`;
  }
  const surprise = OPTIONAL.includes(id) && id !== "friends" ? `<button class="btn ghost" data-act="surprise" data-id="${id}">🎲 Surprise me</button>` : "";
  return `<div class="question">${head}${inner}
    <div class="q-nav"><button class="btn ghost" data-act="back">← Back</button>${surprise}${P.a[id] && Q.kind === "choice" ? `<button class="btn ghost" data-act="skip">Keep “${esc(String(P.a[id]))}” →</button>` : ""}</div>
  </div>`;
}

function ensureChar() {
  if (P.char) return;
  const kit = P.product === "storybook" ? getKit(P.a.setting || P.a.theme) : getKit(P.a.theme);
  P.char = presetFor(P.a.charType || "Create one for me", kit, 0);
  P.charStep = 0;
}
function libraryGrid(selectedNames, act, exclude = []) {
  const cat = P.libCat || "All";
  const items = CHAR_LIBRARY.map((x, i) => ({ ...x, i })).filter((x) => (cat === "All" || x.cat === cat) && !exclude.includes(x.name));
  return `<div class="filters" style="margin-bottom:10px">${CHAR_CATS.map((c) => `<button type="button" class="${c === cat ? "active" : ""}" data-act="libcat" data-v="${esc(c)}">${esc(c)}</button>`).join("")}</div>
    <div class="lib-grid">${items.map((x) => `<button type="button" class="libcard ${selectedNames.includes(x.name) ? "selected" : ""}" data-act="${act}" data-i="${x.i}"><span class="emoji">${x.emoji}</span><b>${esc(x.name)}</b><small>${esc(x.species.split(",")[0])}</small></button>`).join("")}</div>`;
}
function renderCharBuilder() {
  ensureChar();
  const ch = P.char;
  const parts = (k) => (CHAR_PARTS[k] ? `<div class="mini-chips">${CHAR_PARTS[k].map((v) => `<button type="button" class="chip" data-act="part" data-k="${k}" data-val="${esc(v)}">${esc(v || "none")}</button>`).join("")}</div>` : "");
  const f = (k, label, ph, area) => `<div class="field"><label for="ch-${k}">${label}</label>${area ? `<textarea id="ch-${k}" name="${k}" rows="2" placeholder="${esc(ph)}">${esc(ch[k] || "")}</textarea>` : `<input id="ch-${k}" name="${k}" value="${esc(ch[k] || "")}" placeholder="${esc(ph)}">`}${parts(k)}</div>`;
  const ip = checkIP(ch.name + " " + ch.species);
  return `<div class="card"><div class="row"><h3 style="margin:0">📚 Character library (${CHAR_LIBRARY.length} original characters)</h3><span class="spacer"></span><button type="button" class="btn small secondary" data-act="char-mix">🎲 Random mix</button></div>
      <p class="muted" style="margin:6px 0 10px">Tap a character to start from it. Then mix and change anything below.</p>
      ${libraryGrid([ch.name], "pick-char")}</div>
    <form class="card" data-act="char-form">
    <h3>🎨 Character Mixer — tap a chip to swap just that part, or type your own</h3>
    <div class="grid cols-2">
      ${f("name", "Character name", "e.g. Milo")}
      ${f("species", "What are they? (type + age look)", "e.g. cheerful young brown bear")}
      ${f("personality", "Personality (3-5 traits)", "curious, gentle, brave")}
      ${f("hair", "Hair / fur / skin / body", "soft caramel-brown fur and rounded ears", true)}
      ${f("eyes", "Eyes", "large expressive hazel eyes")}
      ${f("clothing", "Clothing", "blue denim overalls over a yellow T-shirt", true)}
      ${f("shoes", "Shoes", "small red sneakers")}
      ${f("acc", "Accessories", "a green backpack")}
      ${f("sig", "Signature feature", "a heart-shaped spot on the tail")}
    </div>
    ${ip ? `<div class="warn">💡 This looks like a protected character (“${esc(ip.word)}”). Please create an original one instead — e.g. <b>${esc(ip.alt)}</b>.</div>` : ""}
    <div class="row" style="margin-top:14px">
      <span class="spacer"></span>
      <button class="btn" type="submit">Looks great → Next</button>
    </div>
  </form>`;
}
function renderFriendPicker() {
  const fr = P.friends || [];
  return `<div class="card">
      ${fr.length ? `<p><b>Friends in your story:</b> ${fr.map((x, k) => `<span class="chip selected-chip">${esc(x.name)} — ${esc(x.species.split(",")[0])} <button type="button" class="linkish" data-act="friend-remove" data-k="${k}" aria-label="Remove ${esc(x.name)}">✕</button></span>`).join(" ")}</p>` : `<p class="muted">No friends yet — tap up to 2 characters below.</p>`}
      ${libraryGrid(fr.map((x) => x.name), "friend", P.char ? [P.char.name] : [])}
    </div>
    <div class="row" style="justify-content:center">
      <button class="btn secondary" data-act="friends-none">Just ${esc(P.char ? P.char.name : "the main character")}</button>
      <button class="btn" data-act="friends-done">Done → Next</button>
    </div>`;
}

function renderSummary() {
  const c = ctx(), a = P.a;
  const rows = [["Product", PRODUCTS.find((p) => p.id === P.product).label], ["Target age", `Ages ${c.age}`, "age"]];
  if (P.product === "storybook") rows.push(["Story type", labelOf(a.storyType), "storyType"], ["Story idea", a.theme, "theme"], ["Setting", a.setting, "setting"], ["Friends", (P.friends || []).length ? P.friends.map((x) => x.name).join(" + ") : "Just the main character", "friends"], ["Lessons", labelOf(a.lessons) || "—", "lessons"], ["Twist", a.twist || "—", "twist"], ["Mood", a.mood || "—", "mood"], ["Ending", a.ending || "—", "ending"]);
  else rows.push(["Theme", c.themeName, "theme"]);
  if (a.skill) rows.push(["Practice", labelOf(a.skill), "skill"]);
  if (a.activityType) rows.push(["Activities", labelOf(a.activityType), "activityType"]);
  if (a.gameType) rows.push(["Game type", gameType(), "gameType"], ["Players", a.players, "players"], ["Format", a.format, "format"]);
  if (a.bundleType) rows.push(["Bundle", a.bundleType, "bundleType"], ["Bundle size", a.size, "size"]);
  rows.push(["Learning objective", learningGoal(c), a.goal ? "goal" : null], ["Number of pages", P.product === "game" ? "Depends on components" : `${pageCount()}${P.product === "storybook" ? " story pages + cover, end & back" : ""}`, a.pages ? "pages" : null], ["Visual style", c.styleLabel, "style"]);
  if (a.difficulty) rows.push(["Difficulty", a.difficulty, "difficulty"]);
  if (hasChar()) rows.push([P.product === "storybook" ? "Main character" : "Mascot", `${P.char.name} — ${P.char.species}`, "character"]);
  rows.push(["Product format", P.product === "game" && String(a.format).startsWith("Digital") ? "Digital (Canva presentation)" : "Printable PDF (made in Canva)"]);
  return `<div class="question">
    ${bubble("Here's your product setup ✅", "Check everything below. Tap ✏️ to change a line, or confirm to build your content.")}
    <div class="card"><div class="kv">${rows.map(([k, v, id]) => `<div>${esc(k)}</div><div>${esc(v)} ${id ? `<button class="chip" style="padding:2px 10px" data-act="edit-q" data-id="${id}" aria-label="Change ${esc(k)}">✏️</button>` : ""}</div>`).join("")}</div></div>
    <div class="row"><button class="btn ghost" data-act="back">← Back</button><span class="spacer"></span>
      <label class="field" style="flex:1;min-width:220px"><span class="muted" style="font-size:.85rem">Product name (optional)</span><input id="pname" value="${esc(P.name || productName(c))}"></label>
      <button class="btn pink" data-act="confirm">Confirm & build my content →</button></div>
  </div>`;
}

function stageFooter(next, label) {
  return `<div class="stage-footer"><div><span class="muted">Next up</span><br><strong>${label}</strong></div><button class="btn" data-act="goto" data-n="${next}">Continue →</button></div>`;
}

function overviewCard(c) {
  const rows = [["Product name", productName(c)], ["Product type", PRODUCTS.find((p) => p.id === P.product).label], ["Target age", `Ages ${c.age}`], ["Theme", P.product === "storybook" ? P.a.theme : c.themeName], ["Learning goal", learningGoal(c)], ["Art style", c.styleLabel]];
  return `<div class="card"><div class="section-title"><span class="badge">📦</span><h2 style="margin:0">Your Product</h2></div><div class="kv">${rows.map(([k, v]) => `<div>${esc(k)}</div><div>${esc(v)}</div>`).join("")}</div></div>`;
}
function characterCard(c) {
  if (!c.ch) return "";
  const ch = c.ch;
  const profile = [["Name", ch.name], ["Type & age look", ch.species], ["Personality", ch.personality], ["Hair / fur / body", ch.hair], ["Eyes", ch.eyes], ["Clothing", ch.clothing], ["Shoes", ch.shoes], ["Accessories", ch.acc || "—"], ["Signature feature", ch.sig || "—"], ["Visual style", c.styleLabel]];
  return `<div class="card" id="character"><div class="section-title"><span class="badge">🧸</span><h2 style="margin:0">Character Master Profile</h2></div>
    <div class="grid cols-2"><div class="kv">${profile.map(([k, v]) => `<div>${esc(k)}</div><div>${esc(v)}</div>`).join("")}</div>
    <div><h3>🔒 Character Lock — never change</h3><ul>${charLock(ch).map((x) => `<li>${esc(x)}</li>`).join("")}<li>${esc(c.styleLabel)} style</li></ul>
    ${P.product === "storybook" ? `<h3>📍 Location Lock</h3><p>${esc(cap(c.kit.setting))}</p>` : ""}
    <p class="muted" style="font-size:.9rem">Every image prompt repeats these details — never “same character as before”.</p></div></div></div>
    ${(c.friends || []).map((f) => `<div class="card"><div class="section-title"><span class="badge">🤝</span><h2 style="margin:0">Friend: ${esc(f.name)}</h2></div>
      <div class="grid cols-2"><div class="kv">${[["Type & age look", f.species], ["Personality", f.personality], ["Hair / fur / body", f.hair], ["Eyes", f.eyes], ["Clothing", f.clothing], ["Shoes", f.shoes], ["Accessories", f.acc || "—"], ["Signature feature", f.sig || "—"]].map(([k, v]) => `<div>${esc(k)}</div><div>${esc(v)}</div>`).join("")}</div>
      <div><h3>🔒 Character Lock</h3><ul>${charLock(f).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div></div></div>`).join("")}`;
}
function fieldHtml(v) { return Array.isArray(v) ? `<ul>${v.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : esc(v); }
function pagesHtml(pages, withPrompts, editable = false) {
  return pages.map((p, i) => `<details class="page" ${i < 3 ? "open" : ""}><summary>${esc(p.title)}</summary>
    ${p.fields.map(([k, v]) => (editable && k === "Story text" && p.kind === "story"
      ? `<div class="story-edit"><span class="lbl">Story text</span> <span class="muted" style="font-size:.82rem">(written for you — tap to edit)</span>${(P.storyEdits || {})[p.data.k] ? ` <button class="linkish" data-act="story-reset" data-k="${p.data.k}">↺ undo my edit</button>` : ""}<textarea class="story-text" data-story="${p.data.k}" rows="${Math.min(7, 2 + Math.ceil(String(v).length / 70))}">${esc(v)}</textarea></div>`
      : `<div><span class="lbl">${esc(k)}:</span> ${fieldHtml(v)}</div>`)).join("")}
    ${p.layout ? `<div><span class="lbl">Canva layout:</span> ${esc(p.layout)}</div>` : ""}
    ${p.extra ? `<div style="margin-top:8px">${p.extra}</div>` : ""}
    ${withPrompts && p.prompt ? promptHtml(p.prompt) : ""}
  </details>`).join("");
}

function blueprintCard(c) {
  const a = P.a;
  if (P.product === "storybook") {
    const t = storyTitles(c);
    const beats = storyBeats(c);
    const third = Math.ceil(beats.length / 3);
    const part = (from, to) => beats.slice(from, to).map((b) => b.beat).join(" → ");
    const rows = [["Title options", t.join(" · ")], ["Story mix", labelOf(a.storyType) || "Story"], ["Target age", `Ages ${c.age}`], ["Main character", charDesc(c.ch)], ["Supporting characters", c.friends.length ? c.friends.map(charDesc).join(" | ") : "None — a solo adventure"], ["Setting", cap(c.kit.setting)], ["Main problem", a.theme], ["Story twist", a.twist || "—"], ["Mood", a.mood || "Heartwarming"], ["Goal", `${c.ch.name} wants to succeed and feel proud`], ["Important lesson", storyLessons().map((l) => l.lesson).join("; ")], ["Beginning", part(0, third)], ["Middle", part(third, third * 2)], ["Climax & resolution", part(third * 2, beats.length - 1)], ["Ending", `${beats[beats.length - 1].beat} — ${a.ending || "a warm, happy ending"}`], ["Writing level", AGE_TEXT[c.age]]];
    return `<div class="card"><div class="section-title"><span class="badge">🗺️</span><h2 style="margin:0">Story Blueprint</h2></div><div class="kv">${rows.map(([k, v]) => `<div>${esc(k)}</div><div>${esc(v)}</div>`).join("")}</div></div>`;
  }
  if (P.product === "game") {
    const g = gameSpec(c);
    const rows = [["Game name", productName(c)], ["Age group", `Ages ${c.age}`], ["Players", a.players], ["Learning goal", learningGoal(c)], ["Materials needed", g.materials.join(", ")], ["How to play", g.how], ["Game rules", g.rules], ["Winning condition", g.win], ["Game components", g.comps], ["Canva pages needed", `${genPages(c).length} pages (see below)`]];
    return `<div class="card"><div class="section-title"><span class="badge">🎲</span><h2 style="margin:0">Game Concept</h2></div><div class="kv">${rows.map(([k, v]) => `<div>${esc(k)}</div><div>${fieldHtml(v)}</div>`).join("")}</div></div>`;
  }
  if (P.product === "bundle") {
    const b = bundlePlan(c);
    const rows = [["Bundle name", b.name], ["Target age", `Ages ${c.age}`], ["Main theme", c.themeName], ["Learning goals", learningGoal(c)], ["Products included", b.sections.map((s) => `${s.name} (${PRODUCTS.find((p) => p.id === s.product).label}) — ${s.pages} pages`)], ["Page count", `About ${pageCount()} pages + bonuses`], ["Bonus items", b.bonus], ["Cover ideas", ["A — Character focus: big mascot, simple background", "B — Story moment: mascot doing the key activity", "C — World: mascot small inside a big themed world"]], ["Bundle organization", ["Cover → Contents → Section dividers + sections → Bonuses → Certificate", "Same fonts, colors, border and mascot in every section"]]];
    return `<div class="card"><div class="section-title"><span class="badge">🎁</span><h2 style="margin:0">Bundle Blueprint</h2></div><div class="kv">${rows.map(([k, v]) => `<div>${esc(k)}</div><div>${fieldHtml(v)}</div>`).join("")}</div></div>`;
  }
  const pages = genPages(c);
  return `<div class="card"><div class="section-title"><span class="badge">📋</span><h2 style="margin:0">${P.product === "pack" ? "Learning Pack Plan" : P.product === "workbook" ? "Workbook Plan" : "Activity Book Plan"}</h2></div><ol>${pages.map((p) => `<li>${esc(p.title)}</li>`).join("")}</ol>${P.product === "workbook" && listOf(P.a.skill).includes("ABC / Alphabet") && pageCount() < 29 ? `<p class="muted">Tip: this size covers part of the alphabet — make the rest as Volume 2 and sell them as a series!</p>` : ""}</div>`;
}

function aiBrief(c) {
  const pages = genPages(c);
  const lines = [
    `You are SANARA Kids Digital Product Creator. Write the text content for my kids digital product. Keep it original, age-appropriate, positive and child-safe. Do not use any protected characters or brands.`,
    ``,
    `PRODUCT: ${productName(c)} (${PRODUCTS.find((p) => p.id === P.product).label})`,
    `TARGET AGE: ${c.age}`,
    `THEME: ${P.product === "storybook" ? P.a.theme : c.themeName}`,
    `LEARNING GOAL: ${learningGoal(c)}`,
  ];
  if (c.ch) lines.push(`MAIN CHARACTER: ${charDesc(c.ch)}. Personality: ${c.ch.personality}.`);
  if (P.product === "storybook") {
    lines.push(`STORY TYPES TO MIX: ${labelOf(P.a.storyType)}`, `SETTING: ${c.kit.setting}`, `LESSON(S): ${storyLessons().map((l) => l.lesson).join("; ")}`);
    if (c.friends.length) lines.push(`SUPPORTING CHARACTERS: ${c.friends.map((f) => `${charDesc(f)}. Personality: ${f.personality}.`).join(" | ")}`);
    if (P.a.twist) lines.push(`STORY TWIST: ${P.a.twist}`);
    if (P.a.mood) lines.push(`MOOD: ${P.a.mood}`);
    if (P.a.ending) lines.push(`ENDING STYLE: ${P.a.ending}`);
    lines.push(`WRITING LEVEL: ${AGE_TEXT[c.age]}`);
  }
  lines.push("", "PAGES:");
  pages.forEach((p) => lines.push(`- ${p.title}${p.fields[1] ? ": " + [].concat(p.fields[1][1]).join("; ") : ""}`));
  lines.push("", P.product === "storybook" ? "For every story page write the exact Story Text that appears on the page. Use short sentences, repetition for young readers, and end with a warm, happy ending." : "For every page that needs written content (reading passages, questions, instructions, facts, clue cards) write it in full. Keep child instructions short and action-based. Include an answer key and double-check every answer and fact.");
  return lines.join("\n");
}

function productSummary(c) {
  const lines = [`PRODUCT: ${productName(c)} (${PRODUCTS.find((p) => p.id === P.product).label})`, `TARGET AGE: ${c.age}`, `THEME: ${P.product === "storybook" ? P.a.theme : c.themeName}`, `LEARNING GOAL: ${learningGoal(c)}`, `ART STYLE: ${c.styleLabel}`];
  if (c.ch) lines.push(`MAIN CHARACTER (Character Lock — keep exactly): ${charDesc(c.ch)}.`);
  return lines.join("\n");
}
function variationBrief(c) {
  return [
    "You are SANARA Kids Digital Product Creator. Help me make my kids digital product more unique and original.",
    "", productSummary(c), "",
    P.product === "storybook"
      ? "Give me 3 fresh, original story directions for this product (different problem, setting detail and lesson moment), each with a title, a 3-sentence summary and a 12-page beat outline. Keep the main character exactly the same."
      : "Give me 3 fresh, original concepts for this product (each with a unique name, a twist on the theme, and a list of 10 page/activity ideas with short child instructions). Keep the age level and learning goal.",
    "Keep everything age-appropriate, child-safe and original — no protected characters or brands. Ask me which one I like before writing the full content.",
  ].join("\n");
}
function promptVariationBrief(c, groups) {
  const list = groups.flatMap(([, ps]) => ps).filter((p) => p.tool !== TOOL.manual).slice(0, 12);
  return [
    "You are SANARA Kids Digital Product Creator. Below are my Canva AI image prompts. For each one, write 2 fresh, meaningfully different variations (new pose, composition or scene details) while keeping the Character Lock, art style, age level and all restrictions (no text, letters, numbers, watermark). Keep them copy-ready and child-safe.",
    "", productSummary(c), "",
    ...list.map((p, i) => `${i + 1}. ${p.name}\n${p.text}\n`),
  ].join("\n");
}
function sellBrief(c, k) {
  return [
    "You are SANARA Kids Digital Product Creator. Write a fresh, unique and honest marketplace listing for my kids digital product (Etsy/Gumroad style). Do not promise guaranteed sales, rankings or income.",
    "", productSummary(c), `PAGES: ${P.product === "game" ? genPages(c).length : pageCount()}`, "",
    "WHAT'S INCLUDED:", ...[...new Set(genPages(c).map((p) => p.title.replace(/^Page \d+ — /, "")))].slice(0, 15).map((x) => "- " + x), "",
    "Please give me: 5 product title options, 1 subtitle, a full product description (what it is, who it's for, what children learn, what's included, how to use it), 7 feature bullets, 15 search keywords/tags, a 6-8 image mockup plan, 1 promotional caption, 1 educational caption, 1 short sales caption, 5 hooks and 5 calls to action.",
    "Make the wording different from this draft so my listing stands out:", "", k.subtitle,
  ].join("\n");
}

function renderStage3(c) {
  const pages = genPages(c);
  return `<div class="card no-print"><div class="row"><b>Want something different?</b><span class="spacer"></span><button class="btn small secondary" data-act="reseed">🔄 Make a new version</button></div><p class="muted" style="margin:6px 0 0;font-size:.9rem">Every tap mixes new objects, scenes, puzzles and math problems. To change the story itself, use ✏️ in Stage 2 (story types, friends, twist, mood, ending) or “Get fresh ideas in ChatGPT” below.</p></div>
  ${overviewCard(c)}${characterCard(c)}${blueprintCard(c)}
  <div class="card"><div class="section-title"><span class="badge">📄</span><h2 style="margin:0">${P.product === "storybook" ? "Story Pages" : "Page-by-Page Content"}</h2></div>
    <p class="muted">Tap a page to open it. Image prompts for every page are in Stage 4.</p>
    ${pagesHtml(pages, false, true)}</div>
  ${P.product === "storybook" ? fullStoryCard(c, pages) : `<div class="card"><div class="section-title"><span class="badge">✍️</span><h2 style="margin:0">AI Writing Brief</h2></div>
    <p>Let ChatGPT write the full ${P.product === "storybook" ? "story text" : "written content"} for you — fresh and different every time. Tap the button, then copy ChatGPT's answer into Canva. Always read and check the result.</p>
    ${gptButton(aiBrief(c), P.product === "storybook" ? "✨ Write my story in ChatGPT" : "✨ Write my content in ChatGPT")}
    <details style="margin-top:10px"><summary class="muted" style="cursor:pointer">Show the brief</summary>${promptBox(aiBrief(c))}</details>
    <h3 style="margin-top:16px">💡 Want a different version?</h3>
    ${gptButton(variationBrief(c), "🔄 Get fresh ideas in ChatGPT")}</div>`}
  ${stageFooter(4, "Stage 4 — Canva AI Prompt Generator")}`;
}
function fullStoryCard(c, pages) {
  const story = pages.filter((p) => p.kind === "story");
  const all = [productName(c), "", ...story.map((p, i) => `Page ${i + 1}\n${p.fields[0][1]}`), "", "The End"].join("\n");
  const words = story.reduce((n, p) => n + String(p.fields[0][1]).split(/\s+/).length, 0);
  return `<div class="card"><div class="section-title"><span class="badge">📖</span><h2 style="margin:0">Your Complete Story</h2></div>
    <p class="muted">Written by SANARA for ages ${esc(c.age)} — ${story.length} pages, about ${words} words. Edit any page above, or get new wording below.</p>
    <div class="story-full">${story.map((p, i) => `<p><b>Page ${i + 1}.</b> ${esc(p.fields[0][1])}</p>`).join("")}<p><b>The End.</b></p></div>
    <div class="row" style="margin-top:10px">${copyBtn(all, "Copy the whole story")}<button class="btn small secondary" data-act="story-reword">🔄 New wording</button>${Object.keys(P.storyEdits || {}).length ? `<button class="btn small ghost" data-act="story-reset-all">↺ Undo all my edits</button>` : ""}</div>
    <p class="muted" style="font-size:.85rem;margin-top:8px">“New wording” rewrites every page you haven't edited. Your own edits are kept.</p></div>`;
}

/* ---------- Stage 4 ---------- */
function promptHtml(p) {
  if (!p) return "";
  const manualOnly = p.tool === TOOL.manual;
  return `<div style="margin-top:8px">
    <div class="row" style="gap:8px;margin-bottom:4px"><b>🎨 ${esc(p.name)}</b><span class="tool-tag">${esc(p.tool)}</span></div>
    ${manualOnly ? `<p>♻️ ${esc(p.text)}</p>` : promptBox(p.text)}
    ${p.placement ? `<div><span class="lbl">📍 Placement:</span> ${esc(p.placement)}</div>` : ""}
    ${p.manual.length ? `<div><span class="lbl">✋ Add manually in Canva:</span> ${esc(p.manual.join(" · "))}</div>` : ""}
    ${p.reuse.length ? `<div><span class="lbl">♻️ Reuse existing assets:</span> ${esc(p.reuse.join(" · "))}</div>` : ""}
    ${p.check.length ? `<div><span class="lbl">✅ Final check:</span> ${esc(p.check.join(" · "))}</div>` : ""}
  </div>`;
}
function allPrompts(c) {
  const groups = [];
  if (c.ch) groups.push(["🧸 Master Character — generate this FIRST", [
    pr(`${c.ch.name} — master character`, TOOL.media, P_.master(c, c.ch), "Save your favorite result and upload it as your visual reference.", [], [], ["Pick ONE favorite before making any pages"]),
    pr(`${c.ch.name} — reference sheet`, TOOL.dream, P_.sheet(c, c.ch), "Keep this sheet beside you while designing.", [], [], ["If views don't match, generate poses one at a time instead"]),
    pr(`${c.ch.name} — portrait`, TOOL.media, P_.portrait(c, c.ch), "Intro page, character cards, profile image.", [], [], []),
    ...(c.friends || []).map((f) => pr(`${f.name} — master character (friend)`, TOOL.media, P_.master(c, f), `Generate after ${c.ch.name}, in the same style. Save your favorite as ${f.name}'s reference.`, [], [], [`${f.name} matches ${c.ch.name}'s art style`])),
  ]]);
  const all = genPages(c);
  const front = all.find((p) => /^(Cover|Bundle Cover)$/.test(p.title)).prompt;
  const back = all.find((p) => p.title === "Back Cover").prompt;
  const hero = c.ch ? charDesc(c.ch) : `friendly original ${c.kit.objects.slice(0, 2).map(pl).join(" and ")}`;
  const titleSpace = "generous clean area across the upper third for the title, artwork only, no words, letters, watermark or logo";
  groups.push(["📕 Front & Back Cover", [
    { ...front, name: "Front cover — main artwork" },
    pr("Front cover — Concept B: Story moment", TOOL.dream, `Vertical children's ${coverKind()} cover artwork showing ${hero} in the middle of a joyful key moment, ${P.product === "storybook" ? `from a story about ${String(P.a.theme).replace(/\.$/, "").toLowerCase()}` : `playing and learning with ${c.kit.objects.slice(2, 4).map(pl).join(" and ")}`}, in ${c.kit.setting}. ${cap(c.style)}, dynamic but clear composition, bright welcoming colors, suitable for ages ${c.age}, ${titleSpace}.`, "Alternative cover — try only if you want a different option.", front.manual, front.reuse, front.check),
    pr("Front cover — Concept C: Big world", TOOL.dream, `Vertical children's ${coverKind()} cover artwork showing ${hero} small in the lower part of a big, magical ${c.themeName.toLowerCase()} world: ${c.kit.setting}, with ${c.kit.deco.slice(0, 3).join(", ")}. ${cap(c.style)}, sense of wonder and adventure, layered depth, bright welcoming colors, suitable for ages ${c.age}, ${titleSpace}.`, "Alternative cover — try only if you want a different option.", front.manual, front.reuse, front.check),
    { ...back, name: "Back cover artwork" },
  ]]);
  if (P.product !== "storybook") groups.push(["🧺 Reusable Asset Library — make once, reuse everywhere", c.kit.objects.map((o) => pr(cap(o), TOOL.graphics, P_.asset(c, o), "Save to a Canva folder called “Assets”.", [], [], ["Same style and scale as the others"]))]);
  groups.push(["🖼️ Backgrounds, Borders & Patterns", [
    P.product === "storybook" ? pr("Story background (no characters)", TOOL.dream, P_.background(c), "Reuse behind several pages.", [], [], []) : pr("Page border", TOOL.dream, P_.border(c), "Every activity page (lock it in place).", ["Page content"], [], ["Center is completely empty"]),
    pr("Pattern background", TOOL.graphics, P_.pattern(c), "Cover back, section dividers, game card backs.", [], [], []),
    pr("Low-ink printable background", TOOL.dream, P_.printSafe(c), "Use when buyers print at home.", [], [], []),
  ]]);
  const pages = all.filter((p) => p.prompt && !isCoverPage(p));
  groups.push(["📄 Page Prompts", pages.map((p) => ({ ...p.prompt, name: `${p.title} — ${p.prompt.name}` }))]);
  groups.push(["🛍️ Product Mockup Concept", [pr("Mockup scene", TOOL.dream, P_.mockup(c), "Put REAL screenshots of your pages into Canva mockup frames — never fake AI pages.", ["Your real page screenshots"], [], [])]]);
  return groups;
}
function renderStage4(c) {
  const groups = allPrompts(c);
  const all = groups.flatMap(([, ps]) => ps.filter((p) => p.tool !== TOOL.manual).map((p) => `${p.name}\n${p.text}`)).join("\n\n");
  const nGen = groups.flatMap(([, ps]) => ps).filter((p) => p.tool !== TOOL.manual).length;
  return `<div class="card"><div class="section-title"><span class="badge">4</span><h2 style="margin:0">Canva AI Prompt Generator</h2></div>
    <p><b>AI generates the art. Canva builds the activity.</b> Every prompt below is finished and ready to copy — no placeholders to fill in.</p>
    <div class="row" style="margin-bottom:10px"><button class="btn small secondary" data-act="reseed">🔄 Make a new version</button><span class="muted" style="font-size:.88rem">Mixes up the objects, scenes and puzzles — same character, same style.</span></div>
    <details class="page"><summary>🧭 How to use a prompt in Canva (tap to open)</summary><ol>
      <li>Tap <b>Copy</b> on a prompt.</li>
      <li>In Canva, open your design → left sidebar <b>Apps</b> → search <b>Dream Lab</b> or <b>Magic Media</b> (the tool shown beside each prompt).</li>
      <li>Paste the prompt (<b>Ctrl+V</b>). In Magic Media choose <b>Images</b> (scenes/characters) or <b>Graphics</b> (single objects).</li>
      <li>Pick the shape: <b>Portrait</b> for covers, <b>Landscape</b> for wide scenes, <b>Square</b> for objects and square books.</li>
      <li>Tap <b>Generate</b>, choose your favorite, and tap it to add it to the page.</li>
      <li>Then follow <b>Stage 5 → Step-by-step in Canva</b> for exact placement.</li>
    </ol></details>
    <div class="grid cols-3">
      <div class="page"><b>💳 Credit-saving plan</b><br>${nGen} AI generations planned. Make the master character and asset library first, then <b>reuse</b> them.</div>
      <div class="page"><b>🔢 Accuracy rule</b><br>Never ask AI for exact counts, letters, numbers, mazes or text. Generate one asset → duplicate it in Canva.</div>
      <div class="page"><b>🪄 Fix, don't redo</b><br>Mostly right? Use <b>Magic Edit</b> to fix the small part instead of generating again.</div>
    </div>
    <div class="row" style="margin-top:8px">${copyBtn(all, "Copy ALL prompts")}<button class="btn small secondary" data-nav="prompts">Fix a prompt (Prompt Repair)</button></div>
    <h3 style="margin-top:16px">🔄 Want new versions of these prompts?</h3>
    ${gptButton(promptVariationBrief(c, groups), "✨ Make fresh prompt variations in ChatGPT")}
  </div>
  ${groups.map(([t, ps]) => `<div class="card" ${t.includes("Master Character") ? 'id="char-prompts"' : ""}><h2>${t}</h2>${ps.map((p) => `<div class="page">${promptHtml(p)}</div>`).join("")}</div>`).join("")}
  ${stageFooter(5, "Stage 5 — Canva Build Guide")}`;
}

/* ---------- Stage 5 ---------- */
function docSetup(c) {
  const digital = P.product === "game" && String(P.a.format).startsWith("Digital");
  if (P.product === "storybook") return [["Recommended size", "8.5 × 8.5 in square (or 11 × 8.5 in landscape)"], ["Orientation", "Square or landscape"], ["Margins", "0.5 in safe zone — keep text inside"], ["Bleed", "Turn on File → Settings → Show print bleed (0.125 in) if you'll print-on-demand"]];
  if (digital) return [["Recommended size", "Presentation 1920 × 1080 px"], ["Orientation", "Landscape"], ["Margins", "80 px safe zone around buttons"], ["Bleed", "Not needed (digital)"]];
  if (P.product === "game") return [["Recommended size", "US Letter 8.5 × 11 in (cards 2.5 × 3.5 in, 9 per page)"], ["Orientation", "Portrait; board page landscape"], ["Margins", "0.4 in + dashed cut lines"], ["Bleed", "Not needed for home printing"]];
  return [["Recommended size", "US Letter 8.5 × 11 in — also make an A4 copy with Resize for international buyers"], ["Orientation", "Portrait"], ["Margins", "0.5 in on all sides"], ["Bleed", "Not needed for home printing; 0.125 in for professional print"]];
}
/* ---------- Step-by-step Canva instructions for every page ---------- */
function docGeo() {
  if (P.product === "game" && String(P.a.format).startsWith("Digital")) return { W: 1920, H: 1080, m: 80, top: 160, u: "px", name: "1920 × 1080 px (Presentation)" };
  if (P.product === "storybook") return { W: 8.5, H: 8.5, m: 0.5, top: 1.3, u: "in", name: "8.5 × 8.5 in" };
  return { W: 8.5, H: 11, m: 0.5, top: 1.4, u: "in", name: "8.5 × 11 in (US Letter)" };
}
const fmtU = (g, v) => (g.u === "px" ? `${Math.round(v)} px` : `${Math.round(v * 10) / 10} in`);
function zoneFor(text, g) {
  const t = String(text || "").toLowerCase(), { W, H, m, top } = g;
  if (/full page|full-bleed|behind|every screen|whole page|background|divider/.test(t)) return { full: true };
  const box = (label, w, x, y) => ({ label, w, x, y });
  if (/upper left|top-left|top left/.test(t)) return box("top-left area", W * 0.35, m, m + top);
  if (/left side|left column|^left|on the left/.test(t)) return box("left side", W * 0.4, m, H * 0.3);
  if (/right side|^right|on the right/.test(t)) return box("right side", W * 0.4, W - m - W * 0.4, H * 0.3);
  if (/corner|small/.test(t)) return box("bottom-right corner (small)", W * 0.18, W - m - W * 0.18, H - m - W * 0.2);
  if (/beside|next to/.test(t)) return box("beside the text", W * 0.3, W - m - W * 0.3, H * 0.35);
  if (/top center|top of|^top|top third/.test(t)) return box("top center, under the title", W * 0.5, (W - W * 0.5) / 2, m + top);
  if (/one row|in a row|grid|duplicate|copies/.test(t)) return { row: true };
  return box("center of the page", W * 0.7, W * 0.15, H * 0.28);
}
function textSteps(item, c, g, isCover) {
  const big = c.age === "2-4" || c.age === "4-6";
  const col = c.kit.colors[0][1], ink = "#23401f";
  return String(item).split(/\s*&\s*|\s*\+\s*/).filter(Boolean).map((part) => {
    const t = part.toLowerCase();
    if (/maze|svg/.test(t)) return `<b>Maze:</b> tap “Download maze” (Stage 3) → in Canva: <b>Uploads → Upload files</b> → pick the SVG → tap it to add → make it about ${fmtU(g, g.W - 2 * g.m)} wide → <b>Position → Align center</b>.`;
    if (/table|letter grid/.test(t)) return `<b>Letter grid:</b> Elements → search <b>“Table”</b> → add one → set rows/columns to match the grid → type one letter per cell (Fredoka 18 pt) → light-gray borders.`;
    if (/subtitle/.test(t)) return `<b>Subtitle:</b> press <b>T</b> → Add a subheading → Nunito ${isCover ? 24 : 18} pt, color ${ink} → just under the title.`;
    if (/title|heading|the end|great job|section/.test(t)) return `<b>${esc(cap(part))}:</b> press <b>T</b> → Add a heading → type it → font <b>Fredoka</b>, ${isCover ? "60–72" : "34–40"} pt, color <span class="hex" style="--c:${col}">${col}</span> → <b>Position → Align center</b>, about ${fmtU(g, g.m)} from the top.`;
    if (/age badge|badge|age range/.test(t)) return `<b>Age badge:</b> Elements → Shapes → circle (about ${fmtU(g, g.u === "px" ? 160 : 1.3)}) in sunny yellow → add text “Ages ${c.age}” (Fredoka 20 pt) on top → select both → <b>Group</b> (Ctrl+G) → bottom-right corner.`;
    if (/brand|logo/.test(t)) return `<b>Your logo:</b> Uploads → your brand logo → about ${fmtU(g, g.u === "px" ? 200 : 1)} wide → bottom center.`;
    if (/story text/.test(t)) return `<b>Story text:</b> Elements → Shapes → rounded rectangle → white, transparency 85% → place it in the clear text area → press <b>T</b> → Add body text on top → <b>Nunito ${big ? "22–26" : "16–18"} pt</b>, color ${ink}, line spacing 1.4. Keep it ${fmtU(g, g.m)} inside the page edge.`;
    if (/matching|dots and lines/.test(t)) return `<b>Matching dots:</b> Elements → Shapes → small circle (${fmtU(g, g.u === "px" ? 18 : 0.15)}, black) beside each picture on both sides — kids draw the lines.`;
    if (/dots/.test(t)) return `<b>Numbered dots:</b> small black circles (${fmtU(g, g.u === "px" ? 14 : 0.12)}) along the outline → <b>T</b> → small numbers (12 pt) next to each dot in order → when done, select the outline → <b>Transparency 0</b> (or delete it).`;
    if (/trac|dotted|dashed|path/.test(t)) return `<b>Tracing lines:</b> Elements → <b>Lines & shapes</b> → pick a line → toolbar: choose the <b>dashed</b> style, weight ${big ? 8 : 5} → for curves set <b>Line type → Curved</b> and drag the middle handle. For tracing letters/numbers: type them very big (100–150 pt) in light gray, or use <b>Effects → Hollow</b>.`;
    if (/shadow/.test(t)) return `<b>Shadows:</b> duplicate the picture (Ctrl+D) → <b>Edit → Adjust → Brightness −100</b> → it becomes a black shadow.`;
    if (/cut/.test(t)) return `<b>Cut lines:</b> Elements → Lines → dashed, weight 2 → draw a box around each cut-out → add a scissors icon (Elements → search “scissors”).`;
    if (/differences|magic edit/.test(t)) return `<b>Differences:</b> duplicate the scene (Ctrl+D) → on the copy, click it → <b>Edit → Magic Edit</b> → brush one small area → describe the change. Repeat for each difference.`;
    if (/button|link/.test(t)) return `<b>Buttons & links:</b> rounded rectangle + label text → <b>Group</b> → select → <b>Link</b> (🔗 in the toolbar) → choose the page it should open. Test in <b>Present</b> mode.`;
    if (/writing lines|name line|lines/.test(t)) return `<b>${esc(cap(part))}:</b> Elements → Lines → straight light-gray line (weight 2) → Ctrl+D to copy → space them ${big ? fmtU(g, 0.8) : fmtU(g, 0.5)} apart.`;
    if (/circle|box|square|answer|spaces|choice|border/.test(t)) return `<b>${esc(cap(part))}:</b> Elements → Shapes → rounded square or circle → no fill, ${col} border 3 pt → Ctrl+D for each spot → select all → <b>Position → Tidy up</b>.`;
    if (/page number/.test(t)) return `<b>Page number:</b> press <b>T</b> → small text (12 pt) at the bottom center — same spot on every page.`;
    if (/letter|number|word|label|digit|symbol/.test(t)) return `<b>${esc(cap(part))}:</b> type them yourself with <b>T</b> → Fredoka, large (${big ? "72–120" : "40–60"} pt), centered near the picture. Never use AI-generated letters.`;
    if (/instruction|question|welcome|description|inside|wording|passage|problem|prompt|text|rules|steps/.test(t)) return `<b>${esc(cap(part))}:</b> press <b>T</b> → Add body text → <b>Nunito ${big ? 22 : 16} pt</b>, color ${ink} → right under the title, inside the margins.`;
    return `<b>${esc(cap(part))}:</b> add it with <b>T</b> (text) or <b>Elements</b> (shapes, lines, icons).`;
  });
}
function canvaSteps(c, p, idx, g, total) {
  const steps = [];
  const isCover = /Cover$/.test(p.title) && idx === 0;
  const pr0 = p.prompt;
  const toolShort = (t) => (t === TOOL.dream ? "Dream Lab" : t === TOOL.graphics ? "Magic Media → Graphics" : "Magic Media → Images");
  steps.push(idx === 0 ? "This is <b>page 1</b> of your design." : `Add the page: click <b>“+ Add page”</b> under the last page — or select the previous page and tap <b>Duplicate page</b> to keep the same border and background.`);
  const zone = pr0 ? zoneFor(`${pr0.placement} ${p.layout}`, g) : null;
  if (!(zone && zone.full)) steps.push(`<b>Background:</b> click an empty spot on the page → color tile in the toolbar → type <span class="hex" style="--c:${c.kit.bg}">${c.kit.bg}</span>.${P.product !== "storybook" && !isCover ? " If you made the <b>Page border</b> (Stage 4 → Backgrounds), drag it in → right-click → <b>Set image as background</b>." : ""}`);
  if (pr0) {
    if (pr0.tool === TOOL.manual) steps.push(`<b>Pictures:</b> no new AI image needed. ${esc(pr0.text)}${pr0.reuse.length ? ` Copy (Ctrl+C) the ${esc(pr0.reuse.join(", "))} from an earlier page and paste (Ctrl+V) here.` : ""}`);
    else {
      const shape = /vertical|cover|bookmark|poster/i.test(pr0.text) ? "Portrait" : /landscape|wide|board/i.test(pr0.text) && P.product !== "storybook" ? "Landscape" : "Square";
      steps.push(`<b>Make the picture:</b> left sidebar <b>Apps → ${toolShort(pr0.tool)}</b> → paste the prompt “${esc(pr0.name)}” from Stage 4 → shape <b>${shape}</b> → <b>Generate</b> → tap your favorite to add it.${pr0.tool === TOOL.graphics ? ` Already made this object on another page? Skip this — copy it from that page instead (saves credits).` : ""}`);
      if (/white background/i.test(pr0.text) && !/coloring|line art/i.test(pr0.text)) steps.push(`Optional (Canva Pro): click the picture → <b>Edit → BG Remover</b> so it sits nicely on colored pages.`);
    }
    if (zone && zone.full) steps.push(`<b>Place it:</b> drag the corners until the picture covers the whole page → right-click → <b>Set image as background</b> (it stays behind your text).`);
    else if (zone && zone.row) steps.push(`<b>Place them:</b> line the pictures up in one row across the middle, each about ${fmtU(g, g.W * 0.15)} wide → select them all → <b>Position → Tidy up</b> for even spacing.`);
    else if (zone) steps.push(`<b>Place it in the ${zone.label}:</b> click the picture → <b>Position → Advanced</b> → Width <b>${fmtU(g, zone.w)}</b>, X <b>${fmtU(g, zone.x)}</b>, Y <b>${fmtU(g, zone.y)}</b> (keep the ratio lock on).`);
    const dup = /(?:duplicate|copies|copy)[^.]*?(\d+)\s*times/i.exec(pr0.placement) || /exactly (\d+)/i.exec(pr0.placement);
    if (dup && +dup[1] > 1) steps.push(`<b>Make ${dup[1]} copies:</b> select the picture → press <b>Ctrl+D</b> ${+dup[1] - 1} times → arrange them → select all → <b>Position → Tidy up</b>. Count them twice!`);
    if (pr0.placement) steps.push(`📍 ${esc(pr0.placement)}`);
    pr0.manual.forEach((m) => textSteps(m, c, g, isCover).forEach((s) => steps.push(s)));
  } else {
    p.fields.forEach(([k, v]) => textSteps(k, c, g, isCover).slice(0, 1).forEach((s) => steps.push(s)));
  }
  if (p.extra && /dl-svg/.test(p.extra) && !(pr0 && pr0.manual.some((m) => /maze|svg/i.test(m)))) textSteps("maze", c, g).forEach((s) => steps.push(s));
  if (!isCover && !/Back Cover/.test(p.title) && !(pr0 && pr0.manual.some((m) => /page number/i.test(m)))) steps.push(`<b>Page number:</b> small text “${idx}” (12 pt) at the bottom center.`);
  steps.push(`<b>Layers:</b> text must be on top — if a picture covers text, select the picture → <b>Position → Backward</b>. Lock finished backgrounds with the 🔒 padlock.`);
  if (pr0 && pr0.check.length) steps.push(`✅ <b>Check:</b> ${esc(pr0.check.join(" · "))}`);
  return steps;
}
function canvaSetupCard(c) {
  const g = docGeo(), name = productName(c);
  return `<div class="card"><h3>🛠️ Canva setup — do this once</h3><ol class="steps">
    <li>Canva home → <b>Create a design</b> → <b>Custom size</b> → <b>${g.u === "px" ? `${g.W} × ${g.H} px` : `${g.W} × ${g.H} in`}</b> → <b>Create new design</b>.</li>
    <li>Click the design name at the top → rename it <b>“${esc(name)}”</b>.</li>
    <li><b>File → Settings</b> → turn on <b>Show rulers and guides</b> and <b>Show margins</b>${P.product === "storybook" ? " (and <b>Show print bleed</b> if you'll print-on-demand)" : ""}. Keep all text inside the margin lines.</li>
    <li>Save your colors: select any text → <b>Text color → “+”</b> → add ${c.kit.colors.map(([n, h]) => `<span class="hex" style="--c:${h}">${h}</span>`).join(" ")}. (Canva Pro: add them to your <b>Brand Kit</b>.)</li>
    <li>Fonts: <b>Fredoka</b> for titles, <b>Nunito</b> for text — both are in Canva's font list.</li>
    <li>Make pictures in this order to save credits: ${hasChar() ? "<b>master character</b> → " : ""}${(c.friends || []).length ? "<b>friends</b> → " : ""}${P.product !== "storybook" ? "<b>asset library</b> → " : ""}<b>covers</b> → <b>backgrounds</b> → <b>pages</b>. Reuse pictures by copying them from earlier pages.</li>
  </ol></div>`;
}
function canvaExportCard() {
  const digital = P.product === "game" && String(P.a.format).startsWith("Digital");
  return `<div class="card"><h3>📤 Finish & export</h3><ol class="steps">
    ${digital ? `<li>Click <b>Present</b> and test every button and link.</li><li><b>Share → Public view link</b> (or Share → Template link) — this is what buyers receive.</li>` : `<li><b>Share → Download → PDF Print</b> → select all pages → <b>Download</b>.${P.product === "storybook" ? " For print-on-demand also tick <b>Crop marks and bleed</b>." : ""}</li>
    <li>Optional A4 version for international buyers: <b>Resize</b> (Canva Pro) → <b>Copy & resize → A4</b> → fix anything that moved.</li>`}
    <li>Mockup pictures: <b>Share → Download → PNG</b> → choose the cover + 3-4 best pages → use them in Stage 6's mockup plan.</li>
    <li>Open the PDF and print one test page before selling.</li>
  </ol></div>`;
}

/* ---------- Exact Layout engine: every element, its exact content, style and position ---------- */
const NUM_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
const COLOR_HEX = { red: "#e53935", blue: "#1e88e5", yellow: "#fdd835", green: "#43a047", orange: "#fb8c00", purple: "#8e24aa", pink: "#ec407a", brown: "#8d6e63", black: "#212121", white: "#ffffff" };
function layoutSpec(c, p, idx, g) {
  // Work in "virtual inches" on an 8.5-wide page. Digital (16:9) slides fit an 8.5 × 11 column centered on the slide.
  const px = g.u === "px", VH = px ? 11 : g.H, S = px ? Math.min(g.W / 8.5, g.H / 11) : 1, OX = px ? (g.W - 8.5 * S) / 2 : 0;
  const M = 0.5, CW = 8.5 - 2 * M, big = c.age === "2-4" || c.age === "4-6";
  const ink = "#23401f", head = c.kit.colors[0][1], accent = c.kit.colors[1][1], gray = "#c9c9c9";
  const cTop = 2.05, cBot = VH - 0.75;
  const rows = [];
  const add = (icon, el, content, style, x, y, w, h) => rows.push({ icon, el, content, style, x, y, w, h: h || w });
  const instr = (p.fields.find(([k]) => /instruction/i.test(k)) || [])[1];
  const TITLE = (t, size) => add("🔤", "Title text", t, `Fredoka ${size || (big ? 40 : 34)} pt · color ${head} · centered`, M, M, CW, 0.75);
  const INSTR = (t = instr) => t && add("🔤", "Instruction text", t, `Nunito ${big ? 22 : 16} pt · color ${ink} · centered`, M, 1.35, CW, 0.5);
  const PNUM = () => add("🔢", "Page number", String(idx), "Nunito 12 pt · gray · centered", 3.75, VH - 0.5, 1, 0.3);
  const PIC = (what, x, y, w, h, note = "picture from Stage 4 (or copy it from an earlier page)") => add("🖼️", "Picture", what, note, x, y, w, h);
  const BOX = (what, x, y, w, h, note = `rounded square · no fill · ${accent} border 3 pt`) => add("🟦", "Shape", what, note, x, y, w, h);
  const TXT = (el, t, style, x, y, w, h) => add("🔤", el, t, style, x, y, w, h);
  const LINE = (what, style, x, y, w) => add("📏", "Line", what, style, x, y, w, 0.08);
  const grid = (n, cols, top, bottom, gap = 0.25, left = M, width = CW) => {
    const rN = Math.ceil(n / cols), cw = (width - gap * (cols - 1)) / cols, ch = (bottom - top - gap * (rN - 1)) / rN;
    return Array.from({ length: n }, (_, i) => ({ x: left + (i % cols) * (cw + gap), y: top + Math.floor(i / cols) * (ch + gap), w: cw, h: ch }));
  };
  const r = rngFrom(P.id + (P.seed || "") + "layout" + idx);
  const d = p.data || {};
  const o = c.kit.objects;
  const t0 = p.title.replace(/^(Page|Activity) \d+ — /, "");
  switch (p.kind) {
    case "letter": {
      const l = d.L.toLowerCase();
      TITLE(`Letter ${d.L}`); INSTR();
      TXT("Big letters to trace", `${d.L} ${l}`, `Fredoka 170 pt · light gray ${gray} (or Effects → Hollow) · centered`, M, cTop, 3.8, 2.6);
      PIC(`${d.word} picture`, 4.6, cTop + 0.05, 3.3, 2.4);
      TXT("Word label", `${d.L} is for ${cap(d.word)}`, `Fredoka 28 pt · ${ink}`, 4.4, 4.7, 3.6, 0.55);
      LINE("Handwriting guide (row 1): top solid, middle dashed, bottom solid", "light gray · weight 2 · 0.45 in apart", M, 5.7, CW);
      TXT("Tracing row 1", `${d.L}    ${d.L}    ${d.L}    ${d.L}    ${d.L}`, `Fredoka ${big ? 90 : 72} pt · light gray / Hollow · sits on the guide lines`, M, 5.5, CW, 1.1);
      LINE("Handwriting guide (row 2)", "light gray · weight 2 · 0.45 in apart", M, 7.0, CW);
      TXT("Tracing row 2", `${l}    ${l}    ${l}    ${l}    ${l}`, `Fredoka ${big ? 90 : 72} pt · light gray / Hollow`, M, 6.8, CW, 1.1);
      TXT("Mini instruction", `Circle the ${d.L} picture:`, `Nunito 20 pt · ${ink} · left`, M, 8.15, CW, 0.4);
      grid(d.opts.length, d.opts.length, 8.65, cBot).forEach((cell, k) => { BOX(`Choice ${k + 1} box`, cell.x, cell.y, cell.w, cell.h); PIC(`${d.opts[k]} picture (inside box ${k + 1})`, cell.x + cell.w * 0.15, cell.y + 0.1, cell.w * 0.7, cell.h - 0.2); });
      PNUM(); break;
    }
    case "number": {
      const n = d.n, cols = Math.min(n, 5);
      TITLE(`Number ${n}`); INSTR();
      TXT("Big number to trace", String(n), `Fredoka 200 pt · light gray ${gray} / Hollow`, M, cTop, 3.4, 2.8);
      TXT("Number word", NUM_WORDS[n] || "", `Fredoka 40 pt · ${head}`, M, 4.9, 3.4, 0.6);
      PIC(`${n} × ${d.obj} (make 1, then Ctrl+D) — ${Math.ceil(n / cols)} row(s) of up to ${cols}, each about ${fmtU(g, Math.min(1.1, 3.6 / cols - 0.1) * S)} wide`, 4.3, cTop, 3.7, 3.4, "Position → Tidy up for even spacing");
      LINE("Handwriting guide", "light gray · weight 2", M, 6.35, CW);
      TXT("Tracing row", `${n}    ${n}    ${n}    ${n}    ${n}`, `Fredoka 80 pt · light gray / Hollow`, M, 6.0, CW, 1.2);
      TXT("Mini instruction", `Color ${n} circle${n === 1 ? "" : "s"}.`, `Nunito 20 pt · ${ink}`, M, 7.5, CW, 0.4);
      BOX(`${Math.max(n, 5)} empty circles in ${Math.max(n, 5) > 10 ? "2 rows" : "1 row"} (Elements → circle)`, M, 8.05, CW, cBot - 8.05, `circles about ${fmtU(g, (Math.max(n, 5) > 10 ? 0.6 : 0.7) * S)} · no fill · ${accent} border 3 pt`);
      PNUM(); break;
    }
    case "count": {
      const cols = Math.min(d.n, 5);
      TITLE(t0); INSTR();
      PIC(`${d.n} × ${d.obj} — ${Math.ceil(d.n / cols)} row(s) of up to ${cols}`, M + 0.5, cTop + 0.2, CW - 1, 4.6, `each about ${fmtU(g, Math.min(1.4, (CW - 1) / cols - 0.2) * S)} wide · Position → Tidy up`);
      grid(3, 3, 7.3, cBot, 0.6, 1.2, 6.1).forEach((cell, k) => { const s = Math.min(cell.w, cell.h); BOX(`Answer circle ${k + 1}`, cell.x, cell.y, s, s, `circle · no fill · ${accent} border 4 pt`); TXT(`Number in circle ${k + 1}`, String(d.choices[k]), `Fredoka 72 pt · ${ink} · centered in the circle`, cell.x, cell.y + 0.2, s, s - 0.4); });
      PNUM(); break;
    }
    case "bigsmall":
      TITLE("Big or Small?"); INSTR();
      PIC(`BIG ${d.obj}`, 0.8, 3.0, 4.0, 4.0); PIC(`small ${d.obj} (same picture, resized)`, 5.6, 5.2, 1.8, 1.8, "bottoms lined up with the big one");
      PNUM(); break;
    case "problems": {
      TITLE(t0); INSTR();
      grid(d.probs.length, d.cols, cTop + 0.1, cBot, 0.3).forEach((cell, k) => { BOX(`Box ${k + 1}`, cell.x, cell.y, cell.w, cell.h, `rounded rectangle · light fill ${c.kit.bg} · ${accent} border 2 pt`); TXT(`Problem ${k + 1}`, d.probs[k], `Fredoka ${d.cols === 1 ? (big ? 30 : 24) : big ? 34 : 26} pt · ${ink} · centered in box ${k + 1}`, cell.x + 0.15, cell.y + cell.h / 2 - 0.35, cell.w - 0.3, 0.7); });
      PNUM(); break;
    }
    case "wordprob":
      TITLE(t0); INSTR();
      grid(d.probs.length, 1, cTop, cBot, 0.3).forEach((cell, k) => { BOX(`Problem box ${k + 1}`, cell.x, cell.y, cell.w, cell.h); TXT(`Problem ${k + 1}`, d.probs[k], `Nunito ${big ? 20 : 17} pt · ${ink} · left`, cell.x + 0.2, cell.y + 0.15, cell.w - 0.4, 0.8); TXT(`Answer line ${k + 1}`, "Answer: ________", "Nunito 18 pt · right", cell.x + cell.w - 3.2, cell.y + cell.h - 0.6, 3.0, 0.45); });
      PNUM(); break;
    case "pattern": {
      // Learning-pack pattern: o0, o1, o0, o1, o0, ___ (answer o1)
      const seq = d.seq || [o[0], o[1], o[0], o[1], o[0]], choices = d.choices || [o[0], o[1]];
      TITLE(p.title.includes("Activity") ? t0 : "What Comes Next?"); INSTR(instr || "What comes next?");
      grid(seq.length + 1, seq.length + 1, 3.0, 4.15, 0.12).forEach((cell, k) => (k < seq.length ? PIC(`${k + 1}. ${seq[k]}`, cell.x, cell.y, cell.w, cell.h) : BOX("Answer box (empty)", cell.x, cell.y, cell.w, cell.h, `dashed border · ${accent} · weight 3`)));
      TXT("Mini instruction", "Circle what comes next:", `Nunito 20 pt · ${ink}`, M, 5.2, CW, 0.4);
      grid(choices.length, choices.length, 5.9, 7.7, 0.6, 1.5, 5.5).forEach((cell, k) => { const s = Math.min(cell.w, cell.h); BOX(`Choice circle ${k + 1}`, cell.x, cell.y, s, s, `circle · no fill · ${accent} border 3 pt`); PIC(`${choices[k]} (inside circle ${k + 1})`, cell.x + 0.25, cell.y + 0.25, s - 0.5, s - 0.5); });
      PNUM(); break;
    }
    case "reading": {
      TITLE(t0); INSTR();
      const draw = /Draw/.test(d.k);
      BOX(draw ? "Drawing box" : "Text box (paste your passage / questions here)", M, cTop, CW, draw ? 7.0 : 4.6, `rounded rectangle · fill ${c.kit.bg} · ${accent} border 2 pt`);
      if (!draw) {
        TXT("Passage / questions text", d.k === "Short Reading Passage" ? "Your original story (80–150 words) from ChatGPT" : d.k === "Vocabulary Words" ? "6 words, each next to a small picture" : "Your questions, numbered 1-5", `Nunito ${big ? 20 : 17} pt · line spacing 1.5 · ${ink}`, M + 0.3, cTop + 0.25, CW - 0.6, 4.1);
        PIC(`${o[idx % o.length]} (small)`, 6.4, 6.85, 1.6, 1.6);
        LINE("Answer lines × 4", "light gray · weight 2 · 0.6 in apart", M, 7.0, 5.6);
      }
      PNUM(); break;
    }
    case "writing": {
      TITLE("Writing Time"); INSTR(d.pmt + ".");
      BOX("Drawing box", M, cTop, CW, 3.6);
      const nL = c.age === "2-4" ? 0 : big ? 3 : 7, gap = big ? 0.9 : 0.5;
      if (nL) LINE(`Writing lines × ${nL}`, `light gray · weight 2 · ${fmtU(g, gap * S)} apart${big ? " · add a dashed middle line between each pair" : ""}`, M, 6.1, CW);
      PNUM(); break;
    }
    case "tracing": {
      TITLE(t0); INSTR();
      const nR = big ? 4 : 5, step = (cBot - cTop) / nR;
      for (let k = 0; k < nR; k++) {
        const y = cTop + k * step;
        PIC(`Row ${k + 1}: ${d.start} (left)`, M, y + 0.1, 1.2, step - 0.3);
        add("〰️", `Row ${k + 1}: dashed path`, `${d.step} from ${d.start} to the ${d.goal}`, `Elements → line · dashed · weight ${big ? 8 : 5} · color ${gray}${/curve|wave|loop|circle/i.test(d.step) ? " · Line type → Curved" : ""}`, 1.9, y + step / 2 - 0.1, 4.7, 0.2);
        PIC(`Row ${k + 1}: ${d.goal} (right)`, 6.8, y + 0.1, 1.2, step - 0.3);
      }
      PNUM(); break;
    }
    case "shape": {
      TITLE(`Shape: ${cap(d.sh)}`); INSTR();
      add("⬛", "Big shape to trace", d.sh, `Elements → Shapes → ${d.sh} · no fill · dashed border weight 6 · ${gray}`, M + 0.3, cTop, 3.3, 3.3);
      TXT("Shape name", cap(d.sh), `Fredoka 48 pt · ${head}`, 4.4, cTop + 1.2, 3.6, 0.8);
      const others = shuffle(r, SHAPES.filter((s) => s !== d.sh)).slice(0, 5);
      const mix = shuffle(r, [d.sh, d.sh, d.sh].concat(others));
      TXT("Mini instruction", `Color all the ${pl(d.sh)}.`, `Nunito 20 pt · ${ink}`, M, 5.7, CW, 0.4);
      grid(8, 4, 6.3, cBot, 0.35).forEach((cell, k) => add("⬛", `Shape ${k + 1}`, mix[k], `Elements → Shapes → ${mix[k]} · no fill · black outline 3 pt`, cell.x + 0.2, cell.y, Math.min(cell.w, cell.h) - 0.2, Math.min(cell.w, cell.h) - 0.2));
      add("✅", "Answer", `3 ${pl(d.sh)}`, "for your answer key", M, cBot, 0.1, 0.1);
      PNUM(); break;
    }
    case "color": {
      TITLE(`Color: ${cap(d.col)}`);
      TXT("Color word", d.col.toUpperCase(), `Fredoka 54 pt · color ${COLOR_HEX[d.col] || head}${d.col === "white" ? " with a gray outline" : ""}`, M, 1.25, CW, 0.75);
      INSTR && TXT("Instruction text", instr, `Nunito ${big ? 22 : 16} pt · ${ink}`, M, 2.0, CW, 0.45);
      PIC(`${d.o} line art (to color)`, 1.75, 2.6, 5.0, 4.8);
      const others = shuffle(r, COLOR_OBJECTS.filter(([cc]) => cc !== d.col)).slice(0, 2);
      const smalls = shuffle(r, [`${d.o} (colored ${d.col})`, `balloon (colored ${d.col})`, `${others[0][1]} (colored ${others[0][0]})`, `${others[1][1]} (colored ${others[1][0]})`]);
      TXT("Mini instruction", `Circle the ${d.col} things:`, `Nunito 20 pt · ${ink}`, M, 7.7, CW, 0.4);
      grid(4, 4, 8.2, cBot, 0.3).forEach((cell, k) => PIC(smalls[k], cell.x, cell.y, cell.w, cell.h, "small colored picture (Magic Media Graphics)"));
      PNUM(); break;
    }
    case "vocab":
      TITLE(d.w.toUpperCase()); INSTR();
      PIC(`${d.w} picture`, 2.5, cTop, 3.5, 3.4);
      TXT("Word", d.w, `Fredoka 64 pt · ${ink} · centered`, M, 5.6, CW, 1.0);
      TXT("Word to trace", d.w, `Fredoka 64 pt · light gray / Hollow · centered`, M, 6.7, CW, 1.0);
      BOX("Drawing box — “Draw it!”", M, 8.0, CW, cBot - 8.0);
      PNUM(); break;
    case "coloring":
      TITLE(`Color ${d.who ? cap(d.who) : "the picture"}!`, 30);
      PIC("Coloring line art (black & white)", M, 1.4, CW, VH - 2.1, "no BG Remover · keep white");
      PNUM(); break;
    case "maze": {
      const start = d.start || cap(o[0]), goal = d.goal || o[3];
      TITLE(`Help ${start} find the ${goal}!`, big ? 34 : 30); INSTR(instr || `Help ${start} reach the ${goal}!`);
      add("🖼️", "Background border", "Maze border decoration", "right-click → Set image as background", 0, 0, 8.5, VH);
      add("🌀", "Maze", "Downloaded maze SVG (Uploads)", "centered · keep it square", 1.0, cTop + 0.1, 6.5, 6.5);
      PIC(`${start} (at the green start dot)`, 0.35, cTop - 0.15, 1.1, 1.1);
      PIC(`${goal} (at the pink finish dot)`, 7.0, cTop + 6.2, 1.1, 1.1);
      PNUM(); break;
    }
    case "matching": {
      const items = d.items || o.slice(4, 8), right = d.right || shuffle(r, items);
      TITLE(t0); INSTR(instr || "Match each picture to its shadow.");
      const rws = grid(items.length, 1, cTop + 0.1, cBot, 0.3);
      rws.forEach((cell, k) => {
        PIC(`Left ${k + 1}: ${items[k]}`, 0.8, cell.y, Math.min(1.5, cell.h), Math.min(1.5, cell.h));
        add("●", `Dot L${k + 1}`, "small black circle", "Elements → circle · 0.15 in", 2.6, cell.y + cell.h / 2 - 0.08, 0.16, 0.16);
        add("●", `Dot R${k + 1}`, "small black circle", "Elements → circle · 0.15 in", 5.7, cell.y + cell.h / 2 - 0.08, 0.16, 0.16);
        PIC(`Right ${k + 1}: shadow of ${right[k]}`, 6.2, cell.y, Math.min(1.5, cell.h), Math.min(1.5, cell.h), "duplicate picture → Edit → Adjust → Brightness −100");
      });
      PNUM(); break;
    }
    case "spot": {
      TITLE("Spot the Difference"); INSTR();
      const hh = (cBot - cTop - 0.9) / 2;
      PIC("Master scene (top)", M, cTop, CW, hh);
      PIC("Copy of the scene (bottom) — make the changes here", M, cTop + hh + 0.25, CW, hh, `Magic Edit: ${d.diffs.join(" · ")}`);
      TXT("Counter", `Found: ${"○ ".repeat(d.diffs.length).trim()}`, `Fredoka 26 pt · ${head}`, M, cBot - 0.55, CW, 0.5);
      PNUM(); break;
    }
    case "wordsearch": {
      TITLE(t0); INSTR();
      const tw = Math.min(6.5, d.size * 0.6);
      add("🔡", "Letter grid", `Canva table ${d.size} × ${d.size} — copy the letters from Stage 3 (one per cell)`, "Elements → Table · Fredoka 18 pt · light-gray borders", (8.5 - tw) / 2, cTop, tw, tw);
      TXT("Word bank title", "Find these words:", `Fredoka 24 pt · ${head}`, M, cTop + tw + 0.2, CW, 0.45);
      grid(d.words.length, 3, cTop + tw + 0.75, cBot, 0.15).forEach((cell, k) => TXT(`Word ${k + 1}`, d.words[k], `Fredoka 20 pt · ${ink} · small picture to its left`, cell.x, cell.y, cell.w, Math.min(0.45, cell.h)));
      PNUM(); break;
    }
    case "oddone":
      TITLE("Which One Is Different?"); INSTR();
      grid(d.row.length, d.row.length, 4.0, 6.2, 0.25).forEach((cell, k) => { BOX(`Box ${k + 1}`, cell.x, cell.y, cell.w, cell.h); PIC(`${d.row[k]} (in box ${k + 1})`, cell.x + 0.1, cell.y + 0.1, cell.w - 0.2, cell.h - 0.2); });
      add("✅", "Answer", `${d.odd} — box ${d.row.indexOf(d.odd) + 1}`, "for your answer key", M, cBot, 0.1, 0.1);
      PNUM(); break;
    case "cutpaste": {
      TITLE("Cut & Glue"); INSTR();
      const sizes = Array.from({ length: d.n }, (_, k) => 0.8 + (1.2 * k) / Math.max(1, d.n - 1));
      grid(d.n, d.n, cTop + 0.1, 4.5, 0.25).forEach((cell, k) => { BOX(`Glue box ${k + 1}`, cell.x, cell.y, cell.w, cell.h); TXT(`Number ${k + 1}`, String(k + 1), "Fredoka 24 pt · top-left inside the box", cell.x + 0.1, cell.y + 0.05, 0.5, 0.45); });
      LINE("Cut here ✂ (dashed line across the page)", "dashed · weight 2 · gray · add a scissors icon at the left end", M, 5.0, CW);
      const order = shuffle(r, sizes.map((s, k) => k));
      grid(d.n, d.n, 5.5, 8.4, 0.25).forEach((cell, k) => PIC(`${d.obj} — size ${order[k] + 1} of ${d.n} (about ${fmtU(g, sizes[order[k]] * S)} wide)`, cell.x, cell.y, Math.min(cell.w, sizes[order[k]]), Math.min(cell.w, sizes[order[k]]), "dashed cut box around it"));
      PNUM(); break;
    }
    case "dot":
      TITLE(t0); INSTR();
      PIC(`${d.obj} outline (reference)`, 1.5, cTop + 0.2, 5.5, 6.0, "Transparency 20% while placing dots, then 0%");
      add("●", `Dots × ${d.n}`, `${d.n} small black circles along the outline + numbers 1–${d.n}`, "circle 0.12 in · numbers Nunito 12 pt beside each dot, in order", 1.5, cTop + 0.2, 5.5, 6.0);
      PNUM(); break;
    case "cover": {
      const nm = productName(c);
      add("🖼️", "Cover artwork", "Front cover artwork (Stage 4)", "covers the whole page → Set image as background", 0, 0, 8.5, VH);
      TXT("Title", nm, `Fredoka ${nm.length > 28 ? 54 : 66} pt · white with a soft dark shadow (Effects → Shadow) or ${head} · centered`, M, 0.6, CW, 1.7);
      TXT("Subtitle", P.product === "storybook" ? `A picture book for ages ${c.age}` : `${typeNoun()} for ages ${c.age}`, `Nunito 24 pt · ${ink} on a soft white pill shape`, 1.25, 2.4, 6.0, 0.6);
      BOX(`Age badge “Ages ${c.age}”`, 8.5 - M - 1.4, VH - M - 1.4, 1.4, 1.4, `circle · fill ${c.kit.colors[1][1]} · text Fredoka 20 pt`);
      add("🏷️", "Logo", "Your brand logo (Uploads)", "small", 3.75, VH - 1.0, 1.0, 0.6);
      break;
    }
    case "back": {
      add("🖼️", "Back cover artwork", "Back cover artwork (Stage 4)", "Set image as background", 0, 0, 8.5, VH);
      BOX("Text panel", 1.0, 1.2, 6.5, VH - 3.2, "rounded rectangle · white · transparency 85%");
      if (P.product === "storybook") TXT("Book description", "2–3 sentences about the story (from your listing)", `Nunito 18 pt · ${ink}`, 1.3, 1.5, 5.9, 2.2);
      else { TXT("Heading", "What's inside", `Fredoka 32 pt · ${head}`, 1.3, 1.4, 5.9, 0.6); TXT("Bullet list", genPages(c).slice(2, 6).map((x) => "• " + x.title.replace(/^Page \d+ — /, "")).join("  "), `Nunito 18 pt · ${ink} · one per line`, 1.3, 2.1, 5.9, 2.4); }
      TXT("Age range", `Ages ${c.age}`, `Fredoka 24 pt · ${head}`, 1.3, VH - 2.6, 5.9, 0.5);
      add("🏷️", "Logo", "Your brand logo", "small · centered", 3.75, VH - 1.2, 1.0, 0.6);
      break;
    }
    case "story": {
      const Z = { "upper left": [0.5, 0.5, 4.2, 2.2], "upper third": [0.5, 0.5, 7.5, 1.8], "right side": [4.6, 1.6, 3.4, 4.2], "bottom band": [0.5, VH - 2.2, 7.5, 1.7] }[d.zone] || [0.5, 0.5, 7.5, 1.8];
      add("🖼️", "Scene picture", `${p.prompt.name}${d.friend ? ` (with ${d.friend})` : ""}`, "covers the whole page → Set image as background", 0, 0, 8.5, VH);
      BOX("Text box background", ...Z, "rounded rectangle · white · transparency 85%");
      TXT("Story text", (p.fields.find(([k]) => k === "Story text") || [])[1] || "", `Nunito ${big ? "24" : "18"} pt · ${ink} · line spacing 1.4 · left aligned`, Z[0] + 0.2, Z[1] + 0.15, Z[2] - 0.4, Z[3] - 0.3);
      TXT("Page number", String(idx), "Nunito 12 pt · white circle behind it", d.zone === "bottom band" ? 7.6 : 3.95, d.zone === "bottom band" ? 0.3 : VH - 0.55, 0.6, 0.35);
      break;
    }
    case "end":
      add("🖼️", "End artwork", "End page artwork", "Set image as background", 0, 0, 8.5, VH);
      TXT("“The End”", "The End", `Fredoka 72 pt · white with soft shadow · centered`, M, 0.9, CW, 1.4);
      BOX("Optional question box", 1.5, VH - 2.4, 5.5, 1.6, "rounded rectangle · white 85%");
      TXT("Grown-up questions", "1) What was your favorite part?  2) How did the hero feel at the end?", `Nunito 16 pt · ${ink}`, 1.7, VH - 2.25, 5.1, 1.3);
      break;
    case "welcome": {
      TITLE("Welcome!", 44);
      PIC(c.ch ? `${c.ch.name} waving` : "Small theme picture", M, cTop, 3.2, 3.6);
      add("💬", "Speech bubble", `Hello! I'm ${c.ch ? c.ch.name : "your learning buddy"}. Let's learn and play!`, `Elements → search “speech bubble” · text Nunito ${big ? 22 : 18} pt`, 3.9, cTop, 4.1, 2.6);
      BOX("Grown-ups box", M, 6.0, CW, 2.4, `rounded rectangle · fill ${c.kit.bg} · ${accent} border 2 pt`);
      TXT("Tips (3 bullets)", "• One page a day is perfect  • Praise effort, not perfection  • Use crayons or pencils", `Nunito 16 pt · ${ink}`, M + 0.25, 6.2, CW - 0.5, 2.0);
      TXT("Name line", "This book belongs to: ____________", `Fredoka 24 pt · ${head}`, M, 8.8, CW, 0.6);
      break;
    }
    case "certificate":
      add("🖼️", "Border", "Certificate border (Stage 4)", "Set image as background", 0, 0, 8.5, VH);
      TXT("Heading", "Certificate of Completion", `Fredoka 44 pt · ${head}`, 1.0, 2.0, 6.5, 0.9);
      TXT("Great job", "Great Job!", `Fredoka 34 pt · ${accent}`, 1.0, 3.0, 6.5, 0.7);
      TXT("Award line", "This certificate is awarded to", `Nunito 20 pt · ${ink}`, 1.0, 4.1, 6.5, 0.5);
      LINE("Name line", `black · weight 2`, 1.75, 5.6, 5.0);
      TXT("For line", `for completing ${productName(c)}`, `Nunito 20 pt · ${ink}`, 1.0, 6.0, 6.5, 0.6);
      LINE("Date line (label “Date” under it)", "black · weight 1.5", 1.2, 8.0, 2.8);
      LINE("Signature line (label “Signed” under it)", "black · weight 1.5", 4.5, 8.0, 2.8);
      break;
    case "review":
      TITLE("Review Time!"); INSTR("Show what you learned!");
      grid(4, 2, cTop, cBot, 0.3).forEach((cell, k) => BOX(`Mini activity ${k + 1} — repeat a favorite from page ${2 + k * 3}`, cell.x, cell.y, cell.w, cell.h));
      PNUM(); break;
    case "answerkey":
      TITLE("Answer Key");
      TXT("Answers", "Copy the answers from Stage 3 (one line per page)", `Nunito 14 pt · ${ink} · 2 columns`, M, 1.5, CW, VH - 2.3);
      PNUM(); break;
    case "lettermatch": {
      const items = o.slice(0, 4), letters = shuffle(r, items.map((x) => x[0].toUpperCase()));
      TITLE(t0); INSTR();
      grid(4, 1, cTop + 0.1, cBot, 0.3).forEach((cell, k) => { PIC(`Left ${k + 1}: ${items[k]}`, 0.8, cell.y, Math.min(1.5, cell.h), Math.min(1.5, cell.h)); add("●", `Dots row ${k + 1}`, "one dot after the picture, one before the letter", "circle 0.15 in", 2.6, cell.y + cell.h / 2 - 0.08, 3.3, 0.16); TXT(`Letter ${k + 1}`, letters[k], `Fredoka 72 pt · ${ink}`, 6.3, cell.y, 1.4, Math.min(1.4, cell.h)); });
      PNUM(); break;
    }
    case "countboxes": {
      const counts = [2, 5, 3, 7];
      TITLE(t0); INSTR();
      grid(4, 2, cTop, cBot, 0.3).forEach((cell, k) => { BOX(`Box ${k + 1}`, cell.x, cell.y, cell.w, cell.h); PIC(`${counts[k]} × ${o[1]} (box ${k + 1})`, cell.x + 0.2, cell.y + 0.2, cell.w - 0.4, cell.h - 1.4); BOX(`Answer square ${k + 1}`, cell.x + cell.w / 2 - 0.5, cell.y + cell.h - 1.1, 1.0, 0.9, "square · no fill · black border 2 pt"); });
      PNUM(); break;
    }
    case "colormatch": {
      const cw = ["RED", "BLUE", "YELLOW", "GREEN"];
      TITLE(t0); INSTR();
      grid(4, 1, cTop + 0.1, cBot, 0.3).forEach((cell, k) => { PIC(`${o[2 + k]} line art`, 0.9, cell.y, Math.min(1.8, cell.h), Math.min(1.8, cell.h)); TXT(`Color word ${k + 1}`, cw[k], `Fredoka 48 pt · color ${COLOR_HEX[cw[k].toLowerCase()]}`, 4.2, cell.y + cell.h / 2 - 0.4, 3.5, 0.8); });
      PNUM(); break;
    }
    case "tracewords":
      TITLE(t0); INSTR();
      grid(4, 1, cTop + 0.1, cBot, 0.3).forEach((cell, k) => { const w = o[k].split(" ").pop().toUpperCase(); PIC(`${o[k]} (small)`, M, cell.y, Math.min(1.3, cell.h), Math.min(1.3, cell.h)); TXT(`Word ${k + 1} to trace`, w, `Fredoka 64 pt · light gray / Hollow`, 2.2, cell.y + 0.1, 5.8, Math.min(1.2, cell.h)); });
      PNUM(); break;
    case "rules":
      TITLE("How to Play");
      BOX("Steps panel", M, 1.45, CW, VH * 0.45, `rounded rectangle · fill ${c.kit.bg}`);
      TXT("Numbered steps", gameSpec(c).how.map((s, k) => `${k + 1}. ${s}`).join("  "), `Nunito ${big ? 20 : 17} pt · ${ink} · one step per line`, M + 0.25, 1.65, CW - 0.5, VH * 0.45 - 0.4);
      TXT("Rules", gameSpec(c).rules.join("  "), `Nunito 16 pt · ${ink}`, M, 1.6 + VH * 0.45, CW - 2.2, 1.4);
      TXT("How to win", gameSpec(c).win, `Fredoka 24 pt · ${head} · on a yellow banner shape`, M, VH - 2.0, CW - 2.2, 0.8);
      if (c.ch) PIC(`${c.ch.name} thumbs up`, 8.5 - M - 1.9, VH - 2.6, 1.9, 1.9);
      break;
    case "card": {
      const k = Math.max(0, parseInt((p.title.match(/Card (\d+)/) || [0, 1])[1], 10) - 1), col = k % 3, row = Math.floor(k / 3) % 3;
      const x = 0.5 + col * 2.6, y = 0.25 + row * 3.5;
      BOX(`Card ${k + 1} (sheet ${Math.floor(k / 9) + 1}, column ${col + 1}, row ${row + 1})`, x, y, 2.5, 3.5, `rounded rectangle 2.5 × 3.5 in · white · ${accent} border 4 pt · rows touch, cut on shared lines`);
      PIC(d.obj, x + 0.25, y + 0.3, 2.0, 2.0);
      TXT("Card word", d.obj.toUpperCase(), `Fredoka 22 pt · ${ink} · centered`, x + 0.15, y + 2.55, 2.2, 0.6);
      break;
    }
    case "questions":
      TITLE("Question Cards");
      grid(4, 2, 1.5, cBot, 0.25).forEach((cell, k) => { BOX(`Card ${k + 1}`, cell.x, cell.y, cell.w, cell.h, `rounded rectangle · ${accent} border 3 pt · dashed cut line around`); TXT(`Question ${k + 1}`, (d.qs[k] || "").replace(/\s*\(Answer:.*\)/, ""), `Nunito 18 pt · ${ink}`, cell.x + 0.2, cell.y + 0.3, cell.w - 0.4, cell.h - 0.6); });
      PNUM(); break;
    case "board":
      add("🖼️", "Board background", "Board background (Stage 4) — make the board its own 11 × 8.5 in landscape design", "Set image as background", 0, 0, 8.5, VH);
      add("⬜", "Path squares × 30", "6 squares per row × 5 rows, snake direction (left→right, then right→left)", `rounded squares 1.0 in · white · ${accent} border 3 pt · every 5th square yellow with a ⭐`, M, 2.0, CW, 7.5);
      TXT("START / FINISH", "START (bottom-left square) · FINISH (top-right square)", `Fredoka 20 pt · ${head}`, M, 1.3, CW, 0.5);
      break;
    case "tokens":
      TITLE("Player Tokens");
      grid(4, 2, cTop, 7.5, 0.6, 1.5, 5.5).forEach((cell, k) => { BOX(`Token circle ${k + 1}`, cell.x, cell.y, Math.min(cell.w, cell.h), Math.min(cell.w, cell.h), "circle 1.6 in · dashed cut line"); PIC(`${(d.list || o)[k]} token`, cell.x + 0.2, cell.y + 0.2, Math.min(cell.w, cell.h) - 0.4, Math.min(cell.w, cell.h) - 0.4); });
      break;
    case "screens":
      add("🖼️", "Background (every screen)", "Digital game background (Stage 4)", "Set image as background", 0, 0, 8.5, VH);
      TXT("Start screen title", productName(c), `Fredoka ${Math.round(110)} px · ${head} · centered`, M, 0.6, CW, 1.0);
      BOX("PLAY button", 2.75, VH - 1.8, 3.0, 0.9, "rounded rectangle · yellow · label Fredoka 60 px · Link → page 2");
      break;
    case "buttons":
      TITLE("Game Buttons");
      grid(4, 2, cTop, VH - 1, 0.4).forEach((cell, k) => BOX(`Button “${["PLAY", "NEXT", "TRY AGAIN", "HOME"][k]}”`, cell.x, cell.y, cell.w, Math.min(1.2, cell.h), "button shape (Stage 4) · label Fredoka 48 · Link to the right page"));
      break;
    case "contents":
      TITLE("What's Inside");
      (d.list || []).forEach((line, k) => TXT(`Line ${k + 1}`, line, `Nunito 22 pt · ${ink} · small theme icon on the left`, M + 0.6, 1.8 + k * 0.7, CW - 0.6, 0.55));
      PNUM(); break;
    case "divider":
      add("🖼️", "Background", "Cover artwork (cropped) or theme border", "Set image as background", 0, 0, 8.5, VH);
      TXT("Section title", d.name, `Fredoka 64 pt · ${head} · on a white rounded panel`, 1.0, VH / 2 - 1.0, 6.5, 1.6);
      if (c.ch) PIC(c.ch.name, 3.25, VH / 2 + 0.9, 2.0, 2.0);
      break;
    case "reward":
      add("🖼️", "Background", "Reward chart background (Stage 4)", "Set image as background", 0, 0, 8.5, VH);
      TITLE("My Reward Chart", 40);
      TXT("Day labels", "Mon  Tue  Wed  Thu  Fri  Sat  Sun", `Fredoka 18 pt · ${ink} · above each column`, 1.0, 2.3, 6.5, 0.4);
      add("⭕", "Sticker circles 7 × 5", "35 empty circles for stickers", `circles 0.75 in · no fill · ${accent} border 3 pt · Position → Tidy up`, 1.0, 2.9, 6.5, 5.6);
      break;
    case "bookmark":
      grid(4, 4, 1.0, 1.0 + 6, 0.2).forEach((cell, k) => { BOX(`Bookmark ${k + 1}`, cell.x, cell.y, cell.w, 6, "rounded rectangle 1.7 × 6 in · dashed cut line"); PIC("Bookmark art", cell.x + 0.05, cell.y + 0.1, cell.w - 0.1, 4.6); TXT("Bookmark text", "Keep reading!", "Fredoka 20 pt · centered", cell.x, cell.y + 4.9, cell.w, 0.6); });
      break;
    case "stickers":
      TITLE("Sticker Sheet");
      grid(12, 4, 1.5, cBot, 0.25).forEach((cell, k) => add("⭐", `Sticker ${k + 1}`, o[k % o.length], "cut from the sticker sheet image or make each one separately · circle 1.7 in", cell.x, cell.y, Math.min(cell.w, cell.h), Math.min(cell.w, cell.h)));
      break;
    default: {
      TITLE(t0);
      let y = 1.5;
      p.fields.forEach(([k, v]) => { const txt = [].concat(v).join(" · "); TXT(k, txt, `Nunito 18 pt · ${ink}`, M, y, CW, 0.9); y += 1.1; });
      PNUM();
    }
  }
  const toOut = (e) => (e.w >= 8.49 && e.h >= VH - 0.01 ? { x: 0, y: 0, w: g.W, h: g.H } : { x: OX + e.x * S, y: e.y * S, w: e.w * S, h: e.h * S });
  return { rows, S, VH, toOut, pos: (e) => { const q = toOut(e); return `X ${fmtU(g, q.x)} · Y ${fmtU(g, q.y)} · W ${fmtU(g, q.w)}${e.h && Math.abs(e.h - e.w) > 0.01 ? ` · H ${fmtU(g, q.h)}` : ""}`; } };
}
function wireframeSvg(spec, g) {
  const sc = 221 / g.W, Wp = g.W * sc, Hp = g.H * sc, m = g.m * sc;   // drawn in real page units
  const cols = ["#2ea3c3", "#ef6fa2", "#5fae3e", "#9b6bd3", "#f6c12a"];
  const els = spec.rows.filter((e) => e.w > 0.15 && e.h > 0.05).map((e, i) => {
    const q = spec.toOut(e), n = spec.rows.indexOf(e) + 1, colr = e.icon === "🖼️" ? "#5fae3e" : e.icon === "🔤" || e.icon === "🔢" ? "#2ea3c3" : cols[i % cols.length];
    const full = q.w >= g.W - 0.01 && q.h >= g.H - 0.01;
    return `<g><rect x="${q.x * sc}" y="${q.y * sc}" width="${q.w * sc}" height="${Math.max(q.h * sc, 3)}" rx="4" fill="${colr}" fill-opacity="${full ? 0.08 : 0.18}" stroke="${colr}" stroke-width="1.2"${full ? ' stroke-dasharray="4 3"' : ""}/>${!full ? (e.icon === "🟦" ? `<text x="${q.x * sc + 3}" y="${q.y * sc + 10}" font-size="9" font-weight="700" fill="#6a3fa6">${n}</text>` : `<text x="${(q.x + q.w / 2) * sc}" y="${(q.y + Math.max(q.h, 0.3 * spec.S) / 2) * sc + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#23401f">${n}</text>`) : ""}</g>`;
  }).join("");
  return `<svg class="wire" viewBox="-2 -2 ${Wp + 4} ${Hp + 4}" width="${Math.round(Wp)}" role="img" aria-label="Page layout preview"><rect x="0" y="0" width="${Wp}" height="${Hp}" fill="#fff" stroke="#b9c7b0"/><rect x="${m}" y="${m}" width="${Wp - 2 * m}" height="${Hp - 2 * m}" fill="none" stroke="#e3e9dc" stroke-dasharray="3 3"/>${els}</svg>`;
}
function layoutHtml(c, p, idx, g) {
  const spec = layoutSpec(c, p, idx, g);
  return `<div class="layout-box"><div class="wire-wrap">${wireframeSvg(spec, g)}<div class="muted" style="font-size:.75rem;text-align:center">Numbers match the list →</div></div>
    <ol class="layout-list">${spec.rows.map((e) => `<li><b>${e.icon} ${esc(e.el)}:</b> ${(e.icon === "🔤" || e.icon === "🔢") && !/^(Your |Copy |2–3 sentences)|from ChatGPT|from Stage|from your/i.test(e.content) ? `type <span class="exact">“${esc(e.content)}”</span>` : esc(e.content)}<br><span class="muted">${esc(e.style)}</span><br><span class="pos">📍 ${spec.pos(e)}</span></li>`).join("")}</ol></div>`;
}

function renderStage5(c) {
  const pages = genPages(c);
  const g = docGeo();
  const big = c.age === "2-4" || c.age === "4-6";
  const sys = [["Heading font", "Fredoka (or Baloo 2) — rounded, friendly"], ["Body font", big ? "Nunito or Andika — 20-26 pt for young readers" : "Nunito — 14-18 pt"], ["Heading hierarchy", "Cover title 54-72 pt · Page title 32-40 pt · Instructions 18-24 pt · Body 14-18 pt"], ["Page numbering", "Bottom center, 12 pt, same position on every page"], ["Illustration placement", "One main illustration per page, never cropped; small mascot in the same corner each time"], ["Text placement", "Title top, instructions under the title, activity in the middle"], ["Spacing", big ? "Lots of white space — big objects, few per page" : "Comfortable spacing; group related items"], ["Consistency rules", "Max 2 fonts · same border on every activity page · same colors · same mascot style"]];
  const checks = ["Page dimensions", "Margins", "Image resolution (Canva: download as PDF Print)", "Readability", "Answer keys", "Spelling", "Page order", "Print test on a home printer", "PDF export"];
  const dchecks = ["Buttons", "Links", "Navigation", "Clickable elements", "Page transitions"];
  const digital = P.product === "game" && String(P.a.format).startsWith("Digital");
  const cl = (list, key) => `<div class="checklist">${list.map((x, i) => `<label><input type="checkbox" data-act="check" data-k="${key}${i}" ${P.checks[key + i] ? "checked" : ""}> ${esc(x)}</label>`).join("")}</div>`;
  return `<div class="card"><div class="section-title"><span class="badge">5</span><h2 style="margin:0">Canva Build Guide</h2></div>
    <h3>📐 Document Setup</h3><div class="kv">${docSetup(c).map(([k, v]) => `<div>${esc(k)}</div><div>${esc(v)}</div>`).join("")}</div></div>
  <div class="card"><h3>🎨 Design System</h3>
    <div class="swatches" style="margin-bottom:12px">${c.kit.colors.map(([n, h]) => `<span class="swatch"><i style="background:${h}"></i>${esc(n)} <span class="muted">${h}</span></span>`).join("")}<span class="swatch"><i style="background:${c.kit.bg}"></i>Background <span class="muted">${c.kit.bg}</span></span></div>
    <div class="kv">${sys.map(([k, v]) => `<div>${esc(k)}</div><div>${esc(v)}</div>`).join("")}</div>
    <p class="muted" style="margin-top:10px">Decorations for this theme: ${esc(c.kit.deco.join(", "))}.</p></div>
  ${canvaSetupCard(c)}
  <div class="card"><h3>🧱 Page-by-Page Build Guide — step by step in Canva</h3>
    <p class="muted">Tap a page to see exactly what to do. Sizes and positions are for your ${esc(g.name)} design (Canva: click an item → <b>Position → Advanced</b> to type Width, X and Y).</p>
    ${pages.map((p, i) => `<details class="page" ${i === 0 ? "open" : ""}><summary>${esc(p.title)}</summary>
      <h4 class="sub-h">📐 Exact layout — what goes where</h4>
      ${layoutHtml(c, p, i, g)}
      <h4 class="sub-h">🧭 How to do it in Canva</h4>
      <ol class="steps">${canvaSteps(c, p, i, g, pages.length).map((s) => `<li>${s}</li>`).join("")}</ol></details>`).join("")}</div>
  ${canvaExportCard()}
  <div class="card"><h3>🖨️ Print Preparation</h3>${cl(checks, "p")}
    ${digital ? `<h3 style="margin-top:14px">💻 Digital Checks</h3>${cl(dchecks, "d")}` : ""}</div>
  ${stageFooter(6, "Stage 6 — Sell Your Product")}`;
}

/* ---------- Stage 6 ---------- */
function sellKit(c) {
  const name = productName(c), T = c.themeName, N = P.product === "game" ? genPages(c).length : pageCount();
  const goal = learningGoal(c), tn = typeNoun(), an = ageNoun(c.age);
  const titles = P.product === "storybook"
    ? [...new Set([name, ...storyTitles(c)])].slice(0, 3).concat([`${name}: ${article(firstOf(P.a.storyType) || "Picture")} Book for Ages ${c.age}`.replace(/Story Book/, "Storybook"), `${name} — A Picture Book About ${title(goal.split(" ").slice(0, 4).join(" "))}`])
    : [name, `${T} ${tn} for Kids Ages ${c.age}`, `${T} Fun: Printable ${tn} for ${title(an.split(" (")[0])}`, `My ${T} ${tn} — ${cap(goal)}`, `The Little ${T} ${tn}: ${N} Pages of Learning Fun`];
  const subtitle = `A ${N}-page printable ${tn.toLowerCase()} that helps ${an} build ${goal.toLowerCase()} through playful ${T.toLowerCase()} activities.`;
  const included = genPages(c).map((p) => p.title.replace(/^Page \d+ — /, ""));
  const uniq = [...new Set(included)].slice(0, 12);
  const desc = [
    `${name} is an original ${tn.toLowerCase()} for ${an}${c.ch ? `, starring ${c.ch.name}, ${article(c.ch.species)}` : ""}.`,
    ``, `WHO IT'S FOR`, `Parents, homeschoolers and teachers of children ages ${c.age}.`,
    ``, `WHAT CHILDREN WILL LEARN`, `${cap(goal)} — with short, child-friendly instructions and fun ${T.toLowerCase()} pictures.`,
    ``, `WHAT'S INCLUDED`, ...uniq.map((x) => `• ${x}`), uniq.length < included.length ? `• …and more (${N} pages in total)` : "",
    ``, `HOW TO USE IT`, `Print at home or school (US Letter${P.product === "storybook" ? "" : " + A4"}), use for quiet time, morning work, homeschool lessons, travel or rainy days.`,
    ``, `This is a digital product — no physical item will be shipped.`,
  ].filter((x) => x !== undefined).join("\n");
  const features = [`${N} ready-to-print pages`, `Designed for ages ${c.age}`, `Original ${T.toLowerCase()} illustrations`, "Short, simple instructions kids understand", P.product === "storybook" ? "Gentle, positive story with a clear lesson" : "Answer key included", "Low-prep — just print and play", "Great for home, classroom and homeschool"];
  const kw = [`${T.toLowerCase()} printable`, `kids ${tn.toLowerCase()}`, `ages ${c.age} activities`, `${goal.toLowerCase()} for kids`, `${T.toLowerCase()} ${tn.toLowerCase()}`, "preschool printable", "homeschool printable", "kindergarten worksheets", "kids learning activities", "printable activity pages", "educational printable", "busy book printable", `${T.toLowerCase()} activities for kids`, "classroom printable", "instant download kids"].filter((v, i, s) => s.indexOf(v) === i);
  const mockups = ["Mockup 1 — Product cover (hero image)", "Mockup 2 — Inside pages fanned out", "Mockup 3 — Activities included (grid of 6 pages)", "Mockup 4 — Learning benefits with icons", `Mockup 5 — ${P.product === "bundle" ? "Bundle overview (all sections)" : "What's inside: page count + age"}`, "Mockup 6 — Printed pages on a desk with crayons", "Mockup 7 — Answer key / certificate preview", "Mockup 8 — How it works: Download → Print → Learn"];
  const captions = {
    "Promotional caption": `New! 🎉 ${name} is here — ${N} pages of ${T.toLowerCase()} learning fun for ages ${c.age}. Print it today, play in minutes. 💚`,
    "Educational caption": `Did you know short, playful activities help young kids practice ${goal.toLowerCase()} without pressure? Try one ${T.toLowerCase()} page a day and celebrate every small win. ⭐`,
    "Short sales caption": `${N} printable pages. Ages ${c.age}. Instant download. ${name} ✨`,
  };
  const hooks = [`Rainy day? This ${T.toLowerCase()} pack saves the afternoon.`, `What if ${goal.toLowerCase()} felt like play?`, `Print it in 2 minutes. Keep them busy for an hour.`, `My little one asked for “one more page” — again!`, `The screen-free activity your ${c.age}-year-old will love.`];
  const ctas = ["Tap the link to download today.", "Save this for your next rainy day!", "Share with a teacher friend 💚", "Get your printable copy now.", "Comment ‘ME’ and I'll send you the link."];
  const offers = [`Series idea: make more ${tn.toLowerCase()}s in the same style (${T} Vol. 2, a new theme with the same mascot).`, `Upsell: combine this with a matching ${P.product === "storybook" ? "activity book" : "storybook or game"} as a bundle.`, "Cross-sell: offer the certificate, reward chart or stickers as a free bonus or lead magnet.", "Seasonal: create a holiday version using the same template."];
  const notes = ["Licensing: “For personal and single-classroom use. Do not resell or share the files.”", "Check commercial-use rights for every Canva element, font and AI image before selling.", "File name idea: " + `SANARA_${name.replace(/[^a-z0-9]+/gi, "-")}_Ages${c.age}_Letter.pdf`, "We can't guarantee sales, rankings or income — but a clear, honest, helpful listing gives you the best start."];
  return { titles, subtitle, desc, features, kw, mockups, captions, hooks, ctas, offers, notes };
}
function renderStage6(c) {
  if (P.sell !== "yes") {
    return `<div class="question">${bubble("Would you like me to prepare your product for selling?", "I'll create product names, a description, keywords, mockup ideas and social media captions.")}
      <div class="choices"><button class="choice" data-act="sell" data-v="yes"><span class="num" style="background:${BRAND[0]}">1</span>Yes, let's sell it!</button><button class="choice" data-act="sell" data-v="no"><span class="num" style="background:${BRAND[3]}">2</span>Not yet</button></div>
      ${P.sell === "no" ? `<div class="card" style="margin-top:16px"><p>No problem! Your project is saved. Come back anytime and tap <b>SELL IT</b>.</p><button class="btn secondary" data-act="final">View my finished product</button></div>` : ""}</div>`;
  }
  const k = sellKit(c);
  const list = (arr) => `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  const block = (t, inner, copy) => `<div class="card"><div class="row"><h3 style="margin:0">${t}</h3><span class="spacer"></span>${copy ? copyBtn(copy) : ""}</div><div style="margin-top:8px">${inner}</div></div>`;
  return `<div class="card"><div class="section-title"><span class="badge">6</span><h2 style="margin:0">Your Selling Kit</h2></div><p class="muted">Clear, honest and buyer-friendly. Edit anything to match your voice.</p>
    ${gptButton(sellBrief(c, k), "✨ Write a fresh, unique listing in ChatGPT")}</div>
    ${block("🏷️ Product name — 5 options", list(k.titles), k.titles.join("\n"))}
    ${block("✨ Subtitle", esc(k.subtitle), k.subtitle)}
    ${block("📝 Product description", `<div class="prompt-box">${esc(k.desc)}</div>`, k.desc)}
    ${block("⭐ Product features", list(k.features), k.features.map((x) => "• " + x).join("\n"))}
    ${block("🔎 Search keywords", `<div class="chips">${k.kw.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div>`, k.kw.join(", "))}
    ${block("📸 Mockup plan", list(k.mockups) + `<p class="muted">Use your real page screenshots inside Canva mockup frames.</p>`, k.mockups.join("\n"))}
    ${block("📣 Social media captions", Object.entries(k.captions).map(([t, v]) => `<div class="page"><b>${t}</b><br>${esc(v)} ${copyBtn(v)}</div>`).join(""))}
    ${block("🪝 5 hooks", list(k.hooks), k.hooks.join("\n"))}
    ${block("👉 5 calls to action", list(k.ctas), k.ctas.join("\n"))}
    ${block("📈 Offer ideas", list(k.offers))}
    ${block("📎 Important notes", list(k.notes))}
    <div class="stage-footer"><div><span class="muted">All done! 🎉</span><br><strong>See your complete product in one place</strong></div><button class="btn pink" data-act="final">View finished product →</button></div>`;
}

/* ---------- Final product ---------- */
function renderFinal() {
  const c = ctx();
  const html = `<div class="card no-print"><div class="row"><h2 style="margin:0">🎉 Your Finished Product</h2><span class="spacer"></span>
      <button class="btn small secondary" data-act="export-txt">⬇ Download (.txt)</button><button class="btn small" data-act="print">🖨 Print / Save as PDF</button>
      <button class="btn small ghost" data-act="goto" data-n="6">← Back</button></div></div>
    <div id="final">
      <div class="card" style="text-align:center"><img src="sanara-logo.webp" alt="" style="width:110px"><h1>${esc(productName(c))}</h1><p class="muted">Made with SANARA AI Tool</p></div>
      ${overviewCard(c)}${characterCard(c)}${blueprintCard(c)}
      <div class="card"><h2>Product Structure & Content</h2>${pagesHtml(genPages(c), false).replace(/<details class="page" ?/g, '<details class="page" open ')}</div>
      <div class="card"><h2>Canva AI Prompts</h2>${allPrompts(c).map(([t, ps]) => `<h3>${t}</h3>${ps.map((p) => `<div class="page">${promptHtml(p)}</div>`).join("")}`).join("")}</div>
      <div class="card"><h2>Canva Design Guide</h2><div class="kv">${docSetup(c).map(([k, v]) => `<div>${esc(k)}</div><div>${esc(v)}</div>`).join("")}</div>
        <p style="margin-top:10px"><b>Colors:</b> ${c.kit.colors.map(([n, h]) => `${esc(n)} ${h}`).join(" · ")} · Background ${c.kit.bg}</p><p><b>Fonts:</b> Fredoka (headings) + Nunito (body)</p></div>
      <div class="card"><h2>Quality Checklist</h2><ul>${["Content fits the age group", "Instructions are short and clear", "Every answer is correct", "Spelling checked", "Activities are playable", "Character looks the same everywhere", "No AI-generated text in images", "Everything is original", "Every page has a purpose"].map((x) => `<li>☐ ${x}</li>`).join("")}</ul></div>
      ${P.sell === "yes" ? (() => { const k = sellKit(c); return `<div class="card"><h2>Selling Kit</h2><h3>Product names</h3><ul>${k.titles.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><h3>Subtitle</h3><p>${esc(k.subtitle)}</p><h3>Description</h3><div class="prompt-box">${esc(k.desc)}</div><h3>Features</h3><ul>${k.features.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><h3>Keywords</h3><p>${esc(k.kw.join(", "))}</p><h3>Mockup plan</h3><ul>${k.mockups.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><h3>Captions</h3>${Object.entries(k.captions).map(([t, v]) => `<p><b>${t}:</b> ${esc(v)}</p>`).join("")}<h3>Hooks</h3><ul>${k.hooks.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><h3>Calls to action</h3><ul>${k.ctas.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`; })() : ""}
    </div>`;
  return html;
}

/* ---------- Ideas ---------- */
function renderIdeas() {
  const list = IDEAS.filter((x) => ideaFilter === "all" || x[0] === ideaFilter);
  return `<h1>💡 Product Ideas</h1><p class="muted">Original, age-based ideas from the SANARA Ideas Library. Tap “Create this” and SANARA fills in the setup for you.</p>
  <div class="filters">${[["all", "All ages"]].concat(AGES.map((a) => [a.id, a.label])).map(([id, l]) => `<button class="${ideaFilter === id ? "active" : ""}" data-act="filter" data-v="${id}">${l}</button>`).join("")}</div>
  <div class="grid cols-3">${list.map((x) => {
    const i = IDEAS.indexOf(x), p = PRODUCTS.find((pp) => pp.id === x[1]);
    return `<div class="card idea"><span class="pill ${["", "yellow", "pink", "teal", "purple"][i % 5]}">${p.emoji} ${p.label}</span> <span class="pill">Ages ${x[0]}</span><h3 style="margin-top:10px">${esc(x[2])}</h3><p class="muted">${esc(x[3])}</p><button class="btn small" data-act="idea" data-i="${i}">Create this →</button></div>`;
  }).join("")}</div>`;
}

/* ---------- Prompt Builder ---------- */
const BUILDER_TYPES = ["Character", "Character Pose", "Story Scene", "Background", "Book Cover", "Workbook Cover", "Activity Illustration", "Coloring Page", "Game Asset", "Flashcard", "Decorative Border", "Pattern", "Sticker Sheet", "Certificate", "Product Mockup Concept"];
function builderPrompt() {
  const b = builder, s = STYLES.find((x) => x.id === b.style) || STYLES[0];
  const c = { age: b.age, style: (s.prompt || STYLES[0].prompt), lv: 1, ageVis: AGE_VISUAL[b.age], themeName: b.subject || "kids", kit: getKit(b.subject) };
  const subj = b.subject || "cute bunny";
  const x = b.extra ? `, ${b.extra}` : "";
  const map = {
    "Character": [TOOL.media, `Create a full-body children's character: ${subj}${x}. Friendly, child-like proportions, large expressive eyes, warm smile, front-facing in a centered full-body standing pose, full body completely visible from head to feet. ${cap(c.style)}, simple light background, ${c.ageVis}, suitable for children ages ${c.age}. Simple and distinctive enough to stay consistent across a whole product. No text, watermark or logo.`],
    "Character Pose": [TOOL.media, `${cap(subj)}${x || ", in a joyful action pose"}, full body completely visible from head to feet with comfortable space around the character, no cropping. ${cap(c.style)}, isolated on a clean white background, bright gentle lighting, suitable for children ages ${c.age}, keep the exact same character design, colors, clothing and proportions, ${NO_TEXT}.`],
    "Story Scene": [TOOL.dream, `Children's picture-book scene featuring ${subj}${x}. ${cap(c.style)}, ${c.ageVis}, warm friendly lighting, landscape composition with generous uncluttered space in the upper left for story text, child-safe atmosphere, suitable for children ages ${c.age}, no text generated inside the image, no watermark.`],
    "Background": [TOOL.dream, `Children's illustrated background of ${subj}${x}, ${c.style}, welcoming child-friendly atmosphere, wide landscape composition, no characters, no text, no watermark.`],
    "Book Cover": [TOOL.dream, `Vertical children's picture-book cover artwork featuring ${subj}${x}, strong centered focal composition, ${c.style}, bright welcoming palette, generous clean area across the upper third for the title, professional publishing quality, suitable for ages ${c.age}. Artwork only, no words, letters, watermark or logo.`],
    "Workbook Cover": [TOOL.dream, `Vertical workbook cover artwork featuring ${subj}${x} surrounded by simple alphabet blocks, numbers, stars and basic shapes, ${c.style}, energetic but organized composition, large uncluttered area across the upper third for the title, professional printable educational resource quality, suitable for ages ${c.age}, artwork only, no text, letters, logo or watermark.`],
    "Activity Illustration": [TOOL.graphics, P_.asset(c, subj + x)],
    "Coloring Page": [TOOL.media, P_.coloring(c, subj + x)],
    "Game Asset": [TOOL.graphics, P_.asset(c, subj + x, "consistent game asset style, same scale as other game pieces")],
    "Flashcard": [TOOL.graphics, P_.asset(c, subj + x, "full object visible, bold readable silhouette, flashcard image")],
    "Decorative Border": [TOOL.dream, `Simple children's ${subj}-themed page border with small friendly elements arranged only around the outer edges${x}, clean educational illustration, large completely empty white center for content, minimal visual clutter, suitable for ages ${c.age}, no text or watermark.`],
    "Pattern": [TOOL.graphics, `Seamless children's ${subj} pattern${x}, tiny simplified evenly spaced elements, consistent cute cartoon illustration, clean light cream background, playful but subtle, no text, logo or watermark.`],
    "Sticker Sheet": [TOOL.graphics, `Children's printable sticker sheet featuring twelve separate original cute ${subj} illustrations${x}, consistent cute cartoon style, bold clean outlines, bright friendly colors, white sticker-style border around each object, evenly spaced, no overlapping objects, white background, no text or watermark.`],
    "Certificate": [TOOL.dream, `Cheerful children's achievement certificate border with ${subj}${x}, golden stars and colorful confetti around the outer edges, large completely clean white center for certificate text, balanced symmetrical composition, suitable for ages ${c.age}, no words, letters, numbers, logo or watermark.`],
    "Product Mockup Concept": [TOOL.dream, `Bright professional product-display scene for a children's printable ${subj} product${x}, colorful educational pages neatly arranged on a clean light wooden desk with colored pencils, warm natural lighting, slightly elevated camera angle, uncluttered composition, generous negative space.`],
  };
  const [tool, text] = map[b.type];
  const manual = { "Book Cover": "Title, subtitle, age badge", "Workbook Cover": "Title, subtitle, age badge", "Flashcard": "The word label", "Certificate": "All certificate wording", "Story Scene": "Story text", "Game Asset": "Labels and numbers", "Decorative Border": "Page content", "Product Mockup Concept": "Your REAL page screenshots" }[b.type];
  return { tool, text, manual };
}
const REPAIR = ["Character appearance", "Character pose", "Background", "Colors", "Art style", "Composition", "Too many objects", "Something else"];
function repaired() {
  const d = repair.detail.trim(), base = repair.prompt.trim().replace(/\s*$/, "");
  if (!base) return "";
  const add = {
    1: `Keep the character design exactly as described: identical colors, clothing, facial features, hairstyle/fur pattern, age and body proportions; one character only; simplified background${d ? "; " + d : ""}.`,
    2: `Pose: ${d || "a clear, natural, child-friendly pose"}; full body completely visible from head to feet, no cropping.`,
    3: `Background: ${d || "simple and uncluttered"}; keep the main subject unchanged.`,
    4: `Color palette: ${d || "bright, cheerful, child-friendly colors"}; keep everything else unchanged.`,
    5: `Art style: ${d || "clean modern children's illustration"}, consistent throughout; keep subject and composition unchanged.`,
    6: `Composition: ${d || "centered with comfortable space around the subject"}.`,
    7: `Show only the main subject${d ? " and " + d : ""}; remove all extra objects; generous white space; no duplicate objects.`,
    8: d,
  }[repair.issue];
  return `${base}${/[.!]$/.test(base) ? "" : "."} ${add}`.trim();
}
function renderBuilder() {
  const out = builderPrompt();
  const fixed = repaired();
  return `<h1>🎨 Prompt Builder</h1><p class="muted">Type something simple like “cute bunny” — SANARA turns it into a professional, copy-ready Canva AI prompt.</p>
  <div class="grid cols-2">
    <form class="card" data-act="builder-form">
      <div class="field"><label>What do you need?</label><select name="type">${BUILDER_TYPES.map((t) => `<option ${t === builder.type ? "selected" : ""}>${t}</option>`).join("")}</select></div>
      <div class="field" style="margin-top:10px"><label>Subject</label><input name="subject" value="${esc(builder.subject)}" placeholder="e.g. cute bunny holding a carrot"></div>
      <div class="grid cols-2" style="margin-top:10px">
        <div class="field"><label>Age</label><select name="age">${AGES.map((a) => `<option value="${a.id}" ${a.id === builder.age ? "selected" : ""}>${a.label}</option>`).join("")}</select></div>
        <div class="field"><label>Art style</label><select name="style">${STYLES.slice(0, 8).map((s) => `<option value="${s.id}" ${s.id === builder.style ? "selected" : ""}>${s.label}</option>`).join("")}</select></div>
      </div>
      <div class="field" style="margin-top:10px"><label>Extra details (optional)</label><input name="extra" value="${esc(builder.extra)}" placeholder="e.g. wearing a yellow raincoat, facing left"></div>
      ${checkIP(builder.subject) ? `<div class="warn">💡 Let's keep it original — try <b>${esc(checkIP(builder.subject).alt)}</b> instead.</div>` : ""}
    </form>
    <div class="card"><div class="row"><h3 style="margin:0">Your Canva AI prompt</h3><span class="tool-tag">${esc(out.tool)}</span></div>
      ${promptBox(out.text)}
      ${out.manual ? `<p><span class="lbl" style="font-weight:800;color:var(--green-dark)">✋ Add manually in Canva:</span> ${esc(out.manual)}</p>` : ""}
      <p class="muted" style="font-size:.9rem">Remember: no AI text, letters or exact counts. Generate one asset, then duplicate it in Canva.</p>
      ${gptButton(`You are SANARA Kids Digital Product Creator. Here is a Canva AI image prompt for a children's product:\n\n"${out.text}"\n\nWrite 3 fresh, meaningfully different versions of this prompt (different pose, composition or setting), keeping it original, child-safe, specific and copy-ready. Keep "no text, letters, numbers, watermark" restrictions. Do not use protected characters or brands. Number them 1-3.`, "🔄 Get 3 variations in ChatGPT")}</div>
  </div>
  <h2 style="margin-top:10px">🛠️ Prompt Repair</h2><p class="muted">Image came out wrong? Fix only what's wrong and keep everything that was right.</p>
  <div class="grid cols-2">
    <form class="card" data-act="repair-form">
      <div class="field"><label>What needs fixing?</label>
        <div class="choices" style="grid-template-columns:repeat(auto-fill,minmax(170px,1fr))">${REPAIR.map((r, i) => `<button type="button" class="choice ${repair.issue === i + 1 ? "selected" : ""}" data-act="repair-issue" data-v="${i + 1}"><span class="num" style="background:${BRAND[i % 6]}">${i + 1}</span>${r}</button>`).join("")}</div></div>
      <div class="field" style="margin-top:10px"><label>Paste your original prompt</label><textarea name="prompt" rows="4">${esc(repair.prompt)}</textarea></div>
      <div class="field" style="margin-top:10px"><label>What should change? (optional)</label><input name="detail" value="${esc(repair.detail)}" placeholder="e.g. sitting down, facing right"></div>
    </form>
    <div class="card"><h3>Repaired prompt</h3>${fixed ? promptBox(fixed) : `<p class="muted">Paste a prompt on the left to repair it.</p>`}
      <p class="muted" style="font-size:.9rem">💳 Small problem? Try Canva <b>Magic Edit</b> on just that area first — it saves credits. Still struggling? Split the image into background + character + objects and assemble them in Canva.</p></div>
  </div>`;
}

/* ---------- Projects ---------- */
function backupCard(hasProjects) {
  return `<div class="card backup">
    <h3>💾 Backup & move your projects</h3>
    <p class="muted">Projects are saved on <b>this device</b> only. To use them on another computer or phone, download a backup here, then tap <b>Restore backup</b> on the other device (log in with the same code).</p>
    <div class="row">
      ${hasProjects ? `<button class="btn small" data-act="backup">⬇ Download backup</button>` : ""}
      <label class="btn small secondary" for="restore-file" style="cursor:pointer">⬆ Restore backup</label>
      <input type="file" id="restore-file" accept=".json,application/json" hidden>
    </div>
  </div>`;
}
function downloadBackup() {
  const list = loadAll();
  const who = AUTH.user ? AUTH.user.customer : "SANARA";
  const data = { app: "SANARA AI Tool", kind: "projects-backup", version: 1, exported: new Date().toISOString(), owner: who, projects: list };
  const day = new Date().toISOString().slice(0, 10);
  download(`SANARA-backup-${String(who).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}-${day}.json`, JSON.stringify(data, null, 2), "application/json");
  toast(`Backup saved (${list.length} project${list.length === 1 ? "" : "s"}) 💾`);
}
function restoreBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try { data = JSON.parse(reader.result); } catch (e) { data = null; }
    const incoming = data && data.kind === "projects-backup" && Array.isArray(data.projects) ? data.projects : null;
    const valid = (incoming || []).filter((p) => p && typeof p.id === "string" && PRODUCTS.some((x) => x.id === p.product) && p.a && typeof p.a === "object");
    if (!valid.length) { toast("That file isn't a SANARA backup 🙁"); return; }
    // Merge: keep every project; if the same project exists on both, keep the newest version.
    const byId = new Map(loadAll().map((p) => [p.id, p]));
    let added = 0, updated = 0;
    for (const p of valid) {
      const cur = byId.get(p.id);
      const clean = { checks: {}, sell: null, char: null, q: 0, ...p };
      if (!cur) { byId.set(p.id, clean); added++; }
      else if ((p.updated || 0) > (cur.updated || 0)) { byId.set(p.id, clean); updated++; }
    }
    saveAll([...byId.values()].sort((x, y) => (y.updated || 0) - (x.updated || 0)));
    render();
    toast(added || updated ? `Restored! ${added} new, ${updated} updated ✨` : "Everything in that backup is already here 👍");
  };
  reader.readAsText(file);
}
function renderProjects() {
  const list = loadAll();
  if (!list.length) return `<h1>📁 My Projects</h1><div class="card empty"><img src="sanara-logo.webp" alt=""><p>No projects yet. Your products save automatically as you create them.</p><button class="btn" data-act="new">Start my first product</button></div>${backupCard(false)}`;
  return `<h1>📁 My Projects</h1><p class="muted">Saved on this device automatically.</p>${backupCard(true)}<div class="grid cols-3">${list.map((x) => {
    const p = PRODUCTS.find((pp) => pp.id === x.product);
    return `<div class="card"><span class="pill">${p ? p.emoji + " " + p.label : ""}</span><h3 style="margin-top:8px">${esc(x.name || "Untitled product")}</h3><p class="muted" style="font-size:.88rem">${x.a.age ? "Ages " + esc(x.a.age) + " · " : ""}Stage ${x.stage} of 6 · ${new Date(x.updated).toLocaleDateString()}</p>
      <div class="row"><button class="btn small" data-act="open" data-id="${x.id}">Continue</button><button class="btn small ghost" data-act="delete" data-id="${x.id}">Delete</button></div></div>`;
  }).join("")}</div>`;
}

/* ---------- Help ---------- */
function renderHelp() {
  const steps = [["Choose what you want to create.", "Storybook, workbook, activity book, interactive game, printable learning pack or complete kids bundle."], ["Tap a choice (or press its number).", "SANARA asks simple questions one step at a time, so you never feel overwhelmed."], ["Answer a few quick questions.", "Age, theme, learning goal, pages, difficulty or art style — only what's needed."], ["Let SANARA build it for you.", "Product structure, content, activities, characters and page ideas."], ["Copy the Canva AI prompts.", "Ready-to-copy professional prompts for characters, illustrations, covers, backgrounds and assets."], ["Follow the Canva design guide.", "Exactly where to place your text, images, colors and other elements in Canva."], ["Prepare your product for selling.", "Product names, description, keywords, mockup ideas, captions and selling materials."]];
  const cmds = [["START OVER", "Start a completely new product"], ["CHANGE THEME", "Keep the structure, pick a new theme"], ["CHANGE AGE", "Adapt the whole project to another age"], ["MAKE IT EASIER / HARDER", "Adjust the difficulty"], ["CHARACTER PROMPT", "Jump to your character prompts"], ["CANVA PROMPTS", "Show only the Canva AI prompts"], ["SELL IT", "Jump to Stage 6"]];
  return `<h1>How It Works</h1>
  <div class="card"><div class="flow"><b>Choose</b><i>→</i><b>Answer</b><i>→</i><b>Copy</b><i>→</i><b>Create in Canva</b><i>→</i><b>Finish</b><i>→</i><b>Sell</b></div>
    <ol>${steps.map(([t, d]) => `<li style="margin-bottom:8px"><b>${t}</b><br><span class="muted">${d}</span></li>`).join("")}</ol></div>
  <div class="grid cols-2">
    <div class="card"><h3>⌨️ Quick commands</h3><p class="muted">Find these buttons above every stage while you create.</p><div class="kv">${cmds.map(([k, v]) => `<div>${k}</div><div>${v}</div>`).join("")}</div></div>
    <div class="card"><h3>💳 Canva credit-saving rules</h3><ol>
      <li>Write a detailed prompt before generating.</li><li>Generate the master character first.</li><li>Reuse approved assets.</li><li>Duplicate in Canva (need 10 stars? make 1).</li><li>Edit before regenerating (Magic Edit).</li><li>Split complex scenes: background + character + objects.</li><li>Never use AI for exact answers, counts, letters or text.</li></ol></div>
    <div class="card"><h3>🛡️ Originality & safety</h3><p>Everything you create should be original. SANARA won't copy protected characters (like Disney, Bluey, Paw Patrol, Pokémon or Marvel) — it suggests an original idea instead.</p><p>All content stays child-safe and never asks children for private information.</p></div>
    <div class="card"><h3>🔧 Which Canva AI tool?</h3><div class="kv"><div>Dream Lab</div><div>Full scenes, covers, backgrounds</div><div>Magic Media — Images</div><div>Characters, animals, coloring pages</div><div>Magic Media — Graphics</div><div>Isolated objects, game & flashcard assets</div><div>Magic Edit</div><div>Fix a small part of an image</div></div></div>
  </div>
  <div class="card"><h3>🧭 Canva basics — the moves you'll use on every page</h3>
    <div class="kv">
      <div>Add text</div><div>Press <b>T</b> (or Text in the sidebar) → Add a heading / body text</div>
      <div>Exact size & position</div><div>Click an item → <b>Position → Advanced</b> → type Width, Height, X, Y</div>
      <div>Center something</div><div><b>Position → Align center</b> (left-right) and <b>Align middle</b> (top-bottom)</div>
      <div>Copy an item</div><div><b>Ctrl+D</b> duplicates it; select many → <b>Position → Tidy up</b> for even spacing</div>
      <div>Picture behind everything</div><div>Right-click the picture → <b>Set image as background</b></div>
      <div>Layer order</div><div><b>Position → Forward / Backward</b> so text stays on top</div>
      <div>Group & lock</div><div>Select items → <b>Group</b> (Ctrl+G); lock finished parts with the 🔒 padlock</div>
      <div>Shapes & lines</div><div><b>Elements → Lines & shapes</b>; dashed lines for tracing and cut lines</div>
      <div>Black shadows</div><div>Duplicate a picture → <b>Edit → Adjust → Brightness −100</b></div>
      <div>New page</div><div><b>+ Add page</b> under the last page, or <b>Duplicate page</b> to keep the border</div>
      <div>Rulers & margins</div><div><b>File → Settings → Show rulers and guides / Show margins</b></div>
      <div>Download</div><div><b>Share → Download → PDF Print</b> (printables) or <b>PNG</b> (mockups)</div>
    </div>
    <p class="muted" style="margin-top:10px">Every product's <b>Stage 5</b> has a full step-by-step list for each page, with exact sizes and positions.</p></div>`;
}

/* ============ Actions ============ */
function goStage(n) {
  P.stage = n; P.maxStage = Math.max(P.maxStage, n);
  if (n === 2) { const f = flow(); const first = f.findIndex((id) => P.a[id] == null || (id === "character" && !P.char)); P.q = first === -1 ? f.length : first; }
  saveProject(); render(); window.scrollTo(0, 0);
}
function advance() {
  const f = flow();
  if (P.returnTo === "summary") {
    const missing = f.findIndex((id) => P.a[id] == null || (id === "character" && !P.char));
    if (missing === -1) { P.returnTo = null; P.q = f.length; } else P.q = missing;
  }
  else {
    let i = P.q + 1;
    while (i < f.length && P.a[f[i]] != null && !(f[i] === "character" && !P.char)) i++;
    P.q = i;
  }
  saveProject(); render(); window.scrollTo(0, 0);
}
function setAnswer(id, val) {
  if (id === "charType" && P.a.charType !== val) P.char = null;
  if (id === "mascot" && !String(val).startsWith("Yes")) P.char = null;
  // Story edits are tied to page numbers — changing the story setup starts fresh text
  if (P.product === "storybook" && P.storyEdits && Object.keys(P.storyEdits).length && JSON.stringify(P.a[id]) !== JSON.stringify(val) && ["pages", "storyType", "lessons", "twist", "mood", "ending", "friends", "theme"].includes(id)) { P.storyEdits = {}; toast("Story setup changed — the story text was rewritten"); }
  P.a[id] = val;
  advance();
}
function startProduct(product, answers = {}, name = "") {
  P = newProject(product, answers, name);
  view = "create"; goStage(2);
}

document.addEventListener("click", (e) => {
  const navBtn = e.target.closest("[data-nav]");
  if (navBtn) { setView(navBtn.dataset.nav); return; }
  const cp = e.target.closest("[data-copy]");
  if (cp) { copyText(cp.dataset.copy, cp); return; }
  const el = e.target.closest("[data-act]");
  if (!el || el.tagName === "FORM") return;
  const d = el.dataset;
  switch (d.act) {
    case "new": P = newProject(); setView("create"); break;
    case "start": startProduct(d.product); break;
    case "product": if (P.product !== d.product) { P = newProject(d.product); } goStage(2); break;
    case "answer": setAnswer(d.id, d.val); break;
    case "use-alt": setAnswer(d.id, d.val); break;
    case "back":
      if (P.stage === 2 && P.q > 0) { P.q--; render(); }
      else if (P.stage === 2) { P.stage = 1; render(); }
      break;
    case "skip": advance(); break;
    case "gpt": openInGPT(d.text); break;
    case "toggle": {
      const Q = question(d.id), cur = listOf(P.a[d.id]).slice();
      const k = cur.indexOf(d.val);
      if (k >= 0) cur.splice(k, 1);
      else if (cur.length >= Q.max) { toast(`You can pick up to ${Q.max} — tap one to remove it first`); break; }
      else cur.push(d.val);
      P.a[d.id] = cur; render(); break;
    }
    case "multi-done":
      if (!listOf(P.a[d.id]).length) { toast("Pick at least one 🙂"); break; }
      saveProject(); advance(); break;
    case "surprise": {
      const pickR = (arr) => arr[Math.floor(Math.random() * arr.length)];
      const val = { lessons: shuffle(Math.random, Object.keys(STORY_LESSONS)).slice(0, 1 + Math.floor(Math.random() * 2)), twist: pickR(STORY_TWISTS), mood: pickR(STORY_MOODS), ending: pickR(STORY_ENDINGS) }[d.id];
      if (val) { toast(`🎲 ${labelOf(val)}`); setAnswer(d.id, val); }
      break;
    }
    case "libcat": P.libCat = d.v; render(); break;
    case "pick-char": P.char = libChar(+d.i); render(); break;
    case "char-mix": P.char = randomMix(); render(); toast("🎲 New mix! Change anything you like."); break;
    case "part": P.char[d.k] = d.val; render(); break;
    case "friend": {
      const f = libChar(+d.i); P.friends = P.friends || [];
      const k = P.friends.findIndex((x) => x.name === f.name);
      if (k >= 0) P.friends.splice(k, 1);
      else if (P.friends.length >= 2) { toast("Up to 2 friends — remove one first"); break; }
      else P.friends.push(f);
      render(); break;
    }
    case "friend-remove": P.friends.splice(+d.k, 1); render(); break;
    case "friends-none": P.friends = []; setAnswer("friends", "none"); break;
    case "friends-done": setAnswer("friends", (P.friends || []).length ? P.friends.map((x) => x.name).join(" + ") : "none"); break;
    case "reseed": P.seed = Math.random().toString(36).slice(2, 8); saveProject(); render(); toast("🔄 New version made — pages and prompts mixed up!"); break;
    case "backup": downloadBackup(); break;
    case "story-reword": P.textSeed = Math.random().toString(36).slice(2, 8); saveProject(); render(); toast("🔄 New wording written!"); break;
    case "story-reset": if (P.storyEdits) delete P.storyEdits[d.k]; saveProject(); render(); break;
    case "story-reset-all": sanaraConfirm("Undo all your story edits and go back to SANARA's text?", () => { P.storyEdits = {}; saveProject(); render(); }, "Undo edits"); break;
    case "edit-q": P.q = flow().indexOf(d.id); P.returnTo = "summary"; render(); window.scrollTo(0, 0); break;
    case "char-shuffle": {
      const kit = P.product === "storybook" ? getKit(P.a.setting || P.a.theme) : getKit(P.a.theme);
      P.charStep = (P.charStep || 0) + 1;
      P.char = presetFor(P.product === "storybook" ? P.a.charType : "Create one for me", kit, P.charStep);
      render(); break;
    }
    case "confirm": { const n = $("#pname"); P.name = n ? n.value.trim() : ""; P.a.character = "done"; goStage(3); break; }
    case "stage": goStage(+d.n); break;
    case "goto": goStage(+d.n); break;
    case "cmd": runCommand(d.c); break;
    case "check": P.checks[d.k] = el.checked; saveProject(); break;
    case "sell": P.sell = d.v; saveProject(); render(); break;
    case "final": app.innerHTML = renderFinal(); window.scrollTo(0, 0); break;
    case "print": window.print(); break;
    case "export-txt": {
      const node = $("#final"); node.querySelectorAll("details").forEach((x) => (x.open = true));
      download(`${productName(ctx()).replace(/[^a-z0-9]+/gi, "-")}.txt`, node.innerText.replace(/Copy\n?/g, "").replace(/\n{3,}/g, "\n\n"));
      break;
    }
    case "dl-svg": download(d.name, d.svg, "image/svg+xml"); break;
    case "section": {
      const c = ctx(), s = bundlePlan(c).sections[+d.k];
      const ans = { age: P.a.age, theme: P.a.theme, style: P.a.style, mascot: P.a.mascot, goal: P.a.goal, ...s.extra };
      if (s.product === "storybook") Object.assign(ans, { setting: P.a.theme, theme: undefined, charType: "Create one for me" });
      if (["workbook", "activity"].includes(s.product)) ans.pages = s.pages >= 35 ? "40 pages" : s.pages >= 25 ? "30 pages" : s.pages >= 15 ? "20 pages" : "10 pages";
      const keepChar = P.char;
      startProduct(s.product, JSON.parse(JSON.stringify(ans)), `${bundlePlan(c).name} — ${s.name}`);
      if (keepChar) { P.char = { ...keepChar }; goStage(2); }
      break;
    }
    case "filter": ideaFilter = d.v; render(); break;
    case "idea": {
      const x = IDEAS[+d.i];
      const ans = { age: x[0] };
      if (x[1] === "storybook") Object.assign(ans, { theme: x[3], setting: x[4] });
      else ans.theme = x[4];
      if (x[1] === "workbook") ans.skill = { Colors: "Colors", Shapes: "Shapes", Numbers: "Numbers", Alphabet: "ABC / Alphabet" }[x[4]] || undefined;
      startProduct(x[1], JSON.parse(JSON.stringify(ans)), x[2]);
      break;
    }
    case "open": { const x = loadAll().find((p) => p.id === d.id); if (x) { P = x; setView("create"); } break; }
    case "delete": sanaraConfirm("Delete this project? This can't be undone.", () => { saveAll(loadAll().filter((p) => p.id !== d.id)); if (P && P.id === d.id) P = null; render(); }, "Delete"); break;
    case "repair-issue": repair.issue = +d.v; render(); break;
  }
});

function runCommand(cmd) {
  const f = () => flow();
  switch (cmd) {
    case "start": sanaraConfirm("Start a completely new product? (This one stays saved in My Projects.)", () => { P = newProject(); render(); }, "Start over"); break;
    case "theme": P.stage = 2; P.q = f().indexOf("theme"); P.returnTo = "summary"; render(); break;
    case "age": P.stage = 2; P.q = f().indexOf("age"); P.returnTo = "summary"; render(); break;
    case "easier": case "harder": {
      const order = ["Easy", "Medium", "Challenging"];
      const cur = order.indexOf(P.a.difficulty === "Mixed" || !P.a.difficulty ? "Medium" : P.a.difficulty);
      P.a.difficulty = order[Math.max(0, Math.min(2, cur + (cmd === "easier" ? -1 : 1)))];
      saveProject(); render(); toast(`Difficulty: ${P.a.difficulty}`); break;
    }
    case "char": goStage(4); setTimeout(() => { const t = $("#char-prompts"); if (t) t.scrollIntoView({ behavior: "smooth" }); }, 50); break;
    case "prompts": goStage(4); break;
    case "sell": goStage(6); break;
  }
}

document.addEventListener("submit", (e) => {
  const form = e.target; e.preventDefault();
  const act = form.dataset.act;
  if (act === "text-form") {
    const v = form.v.value.trim();
    if (!v) { toast("Type an answer or tap an idea 🙂"); return; }
    if (checkIP(v)) { P.a[form.dataset.id] = v; render(); return; }
    setAnswer(form.dataset.id, v);
  }
  if (act === "multi-other") {
    const v = form.v.value.trim();
    if (!v) return;
    if (checkIP(v)) { toast(`Let's keep it original — try “${checkIP(v).alt}”`); return; }
    const Q = question(form.dataset.id), cur = listOf(P.a[form.dataset.id]).slice();
    if (cur.length >= Q.max) { toast(`You can pick up to ${Q.max}`); return; }
    if (!cur.includes(v)) cur.push(v);
    P.a[form.dataset.id] = cur; render();
  }
  if (act === "char-form") {
    const fd = new FormData(form); const ch = {};
    for (const [k, v] of fd.entries()) ch[k] = String(v).trim();
    if (!ch.name || !ch.species) { toast("Please add a name and what they are"); return; }
    P.char = ch;
    if (checkIP(ch.name + " " + ch.species)) { render(); return; }
    P.a.character = "done"; advance();
  }
});
document.addEventListener("input", (e) => {
  if (e.target.dataset && e.target.dataset.story != null && P) {
    P.storyEdits = P.storyEdits || {};
    P.storyEdits[e.target.dataset.story] = e.target.value;
    clearTimeout(window.__storySave); window.__storySave = setTimeout(saveProject, 400);
    return;
  }
  const form = e.target.closest("form");
  if (!form) return;
  if (form.dataset.act === "builder-form" || form.dataset.act === "repair-form") {
    const target = form.dataset.act === "builder-form" ? builder : repair;
    const name = e.target.name;
    if (!name) return;
    target[name] = e.target.value;
    const pos = e.target.selectionStart;
    render();
    const again = document.querySelector(`[data-act="${form.dataset.act}"] [name="${name}"]`);
    if (again) { again.focus(); if (pos != null && again.setSelectionRange) try { again.setSelectionRange(pos, pos); } catch (err) { /* select elements */ } }
  }
  if (form.dataset.act === "char-form" && P && P.char) P.char[e.target.name] = e.target.value;
});
document.addEventListener("change", (e) => {
  if (e.target.id === "restore-file" && e.target.files[0]) { restoreBackup(e.target.files[0]); e.target.value = ""; return; }
  const form = e.target.closest("form");
  if (form && form.dataset.act === "builder-form" && e.target.tagName === "SELECT") { builder[e.target.name] = e.target.value; render(); }
});

/* Number keys choose options (just like replying with a number) */
document.addEventListener("keydown", (e) => {
  if (view !== "create" || !P) return;
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  if (!/^[0-9]$/.test(e.key)) return;
  const idx = e.key === "0" ? 9 : +e.key - 1;
  const btns = [...document.querySelectorAll(".choices .choice")];
  if (btns[idx]) { e.preventDefault(); btns[idx].click(); }
});

AUTH.start(render);
