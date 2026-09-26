/* ============================================================
   app.js - Shared application helpers
   Theme toggle, data loading (with file:// fallback), and
   subject metadata used by all pages.
   ============================================================ */

/* ---- Subject metadata for the home cards ---- */
const SUBJECTS = [
  {
    key: "physics",
    name: "Physics",
    file: "data/physics.json",
    color: "#4f6ef7",
    color2: "#7b5cf0",
    icon: "⚛",
    tagline: "Mechanics, Thermodynamics, Modern Physics and more",
  },
  {
    key: "chemistry",
    name: "Chemistry",
    file: "data/chemistry.json",
    color: "#10b981",
    color2: "#14b8a6",
    icon: "⚗",
    tagline: "Organic, Inorganic & Physical Chemistry MCQs",
  },
  {
    key: "maths",
    name: "Mathematics",
    file: "data/maths.json",
    color: "#f59e0b",
    color2: "#ef7c4a",
    icon: "∑",
    tagline: "Algebra, Trigonometry, Calculus & Probability",
  },
  {
    key: "power_drive_vol_3",
    name: "Power Drive Vol 3",
    file: "data/power_drive_vol_3.json",
    color: "#e11d48",
    color2: "#f43f5e",
    icon: "⚡",
    tagline: "Electrostatics, Current Electricity, Magnetism & EM Waves",
  },
];

/* ---- Theme handling ---- */
function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
}

function initTheme() {
  const theme = Storage.getTheme();
  applyTheme(theme);

  const toggle = document.getElementById("themeToggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const next = Storage.getTheme() === "dark" ? "light" : "dark";
      Storage.setTheme(next);
      applyTheme(next);
    });
  }
}

/* ------------------------------------------------------------
   Quiz keys
   A quiz key is "physics", "maths-2026", etc. Year-paper keys
   ("<subject>-<year>") resolve to data/<year>/<subject>.json and
   get their own storage + result slot.
   ------------------------------------------------------------ */
function parseQuizKey(key) {
  const m = /^(\w+)-(\d{4})$/.exec(key || "");
  if (m) return { subjectKey: m[1], year: Number(m[2]) };
  return { subjectKey: key, year: null };
}

function subjectMeta(subjectKey) {
  return SUBJECTS.find((s) => s.key === subjectKey) || null;
}

/* Display metadata for a quiz key (handles year papers). */
function quizMeta(key) {
  const { subjectKey, year } = parseQuizKey(key);
  const base = subjectMeta(subjectKey);
  if (!base) return null;
  if (year) {
    return {
      ...base,
      key,
      name: `${base.name} ${year} Paper`,
      tagline: `KCET ${year} previous year paper`,
    };
  }
  return { ...base, key: subjectKey };
}

/* ------------------------------------------------------------
   Data loading
   Works over http(s) (VS Code Live Server, GitHub Pages) using
   fetch(), and also over the file:// protocol by falling back
   to a plain <script> tag that exposes window.EMBEDDED_DATA.
   ------------------------------------------------------------ */
async function loadDataFile(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return res.json();
}

async function loadSubjectData(key) {
  const { subjectKey, year } = parseQuizKey(key);
  const meta = subjectMeta(subjectKey);
  if (!meta) throw new Error(`Unknown subject: ${subjectKey}`);

  const file = year ? `data/${year}/${subjectKey}.json` : meta.file;

  /* Prefer fetched JSON ... */
  try {
    const data = await loadDataFile(file);
    if (Array.isArray(data) && data.length) return data;
  } catch (err) {
    /* fetch fails under file:// or when the year file is missing */
  }

  /* ... otherwise fall back to embedded data (works when opened
     directly as index.html without a server). Year papers use the
     full key, e.g. "maths-2026". */
  if (window.EMBEDDED_DATA) {
    const embedded = window.EMBEDDED_DATA;
    const candidates = year ? [key, subjectKey] : [subjectKey];
    for (const c of candidates) {
      if (embedded[c]) return embedded[c];
    }
  }

  const label = year ? `${year} ${meta.name}` : meta.name;
  throw new Error(
    `Could not load questions for "${label}". ` +
      (year
        ? `Make sure data/${year}/${subjectKey}.json exists.`
        : "Start a local server (e.g. VS Code Live Server) or add data/embedded.js.")
  );
}

/* ---- Small DOM helper ---- */
function $(selector, scope = document) {
  return scope.querySelector(selector);
}

function $all(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

/* ---- Navigation helper ---- */
function goTo(url) {
  window.location.href = url;
}

/* ---- Navbar: page links + mobile menu toggle. Returns the menu element. ---- */
function initNav() {
  const bar = $(".navbar .container");
  const actions = bar && $(".nav-actions", bar);
  if (!actions || bar.classList.contains("nav-inner")) return null; // dbms.html has its own nav
  const existing = $(".nav-menu", bar);
  if (existing) return existing;

  const links = [["index.html", "Home"], ["dbms.html", "DBMS"]];
  if (typeof Auth !== "undefined" && Auth.enabled) links.splice(1, 0, ["history.html", "History"]);
  const page = location.pathname.split("/").pop() || "index.html";

  const menu = document.createElement("div");
  menu.className = "nav-menu";
  menu.id = "navMenu";
  menu.innerHTML = links
    .map(([href, label]) => `<a href="${href}" class="nav-link${href === page ? " active" : ""}">${label}</a>`)
    .join("");
  bar.insertBefore(menu, actions);

  const toggle = document.createElement("button");
  toggle.className = "icon-btn nav-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-label", "Menu");
  toggle.setAttribute("aria-controls", "navMenu");
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = "<span></span>";
  toggle.addEventListener("click", () => {
    toggle.setAttribute("aria-expanded", bar.parentElement.classList.toggle("open"));
  });
  actions.appendChild(toggle);
  return menu;
}

/* ---- Boot shared features on every page ---- */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initNav();
});
