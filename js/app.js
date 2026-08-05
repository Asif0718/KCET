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
  const meta = SUBJECTS.find((s) => s.key === key);
  if (!meta) throw new Error(`Unknown subject: ${key}`);

  /* Prefer fetched JSON ... */
  try {
    const data = await loadDataFile(meta.file);
    if (Array.isArray(data) && data.length) return data;
  } catch (err) {
    /* fetch fails under file:// in most browsers */
  }

  /* ... otherwise fall back to embedded data (works when opened
     directly as index.html without a server). */
  if (window.EMBEDDED_DATA && window.EMBEDDED_DATA[key]) {
    return window.EMBEDDED_DATA[key];
  }

  throw new Error(
    `Could not load questions for "${meta.name}". ` +
      "Start a local server (e.g. VS Code Live Server) or add data/embedded.js."
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

/* ---- Boot shared features on every page ---- */
document.addEventListener("DOMContentLoaded", initTheme);
