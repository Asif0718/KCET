/* ============================================================
   dbms.js - Interactive features for the DBMS learning page.
   Syntax highlighting, copy buttons, show-answer accordions,
   mobile drawer navigation, scroll-spy and progress indicator.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Helpers ---------- */
  const $all = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /* ---------- SQL syntax highlighting ---------- */
  const KEYWORDS = [
    "SELECT", "FROM", "WHERE", "GROUP", "BY", "ORDER", "HAVING", "LIMIT",
    "INNER", "LEFT", "RIGHT", "FULL", "OUTER", "JOIN", "ON", "AS",
    "AND", "OR", "NOT", "NULL", "IS", "IN", "LIKE", "BETWEEN", "DISTINCT",
    "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE",
    "CREATE", "TABLE", "DATABASE", "USE", "ALTER", "DROP", "TRUNCATE",
    "PRIMARY", "FOREIGN", "KEY", "REFERENCES", "CHECK", "DEFAULT", "UNIQUE",
    "GRANT", "REVOKE", "COMMIT", "ROLLBACK", "SAVEPOINT",
    "ASC", "DESC", "UNION", "TRUE", "FALSE", "INT", "VARCHAR", "CHAR",
    "DECIMAL", "DATE", "BOOLEAN"
  ];

  const FUNCTIONS = ["COUNT", "SUM", "AVG", "MIN", "MAX"];

  const TOKEN_RE = new RegExp(
    "(--[^\\n]*)" +                                   /* comments   */
    "|('(?:[^']|'')*')" +                             /* strings    */
    "|\\b(" + KEYWORDS.join("|") + ")\\b" +           /* keywords   */
    "|\\b(" + FUNCTIONS.join("|") + ")\\s*(?=\\()" +  /* functions  */
    "|\\b(\\d+(?:\\.\\d+)?)\\b",                      /* numbers    */
    "gi"
  );

  function highlightSql(el) {
    const raw = el.textContent;
    let out = "";
    let last = 0;
    let m;

    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(raw)) !== null) {
      out += escapeHtml(raw.slice(last, m.index));
      if (m[1]) out += '<span class="cmt">' + escapeHtml(m[1]) + "</span>";
      else if (m[2]) out += '<span class="str">' + escapeHtml(m[2]) + "</span>";
      else if (m[3]) out += '<span class="kw">' + escapeHtml(m[3]) + "</span>";
      else if (m[4]) out += '<span class="fn">' + escapeHtml(m[4]) + "</span>";
      else if (m[5]) out += '<span class="num">' + escapeHtml(m[5]) + "</span>";
      last = m.index + m[0].length;
    }
    out += escapeHtml(raw.slice(last));
    el.innerHTML = out;
  }

  $all(".code-block:not(.ascii) pre code").forEach(highlightSql);

  /* ---------- Copy buttons ---------- */
  $all(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const block = btn.closest(".code-block");
      const code = block ? block.querySelector("code") : null;
      if (!code) return;

      const text = code.innerText;

      const done = () => {
        const original = "Copy";
        btn.textContent = "Copied!";
        btn.classList.add("copied");
        setTimeout(() => {
          btn.textContent = original;
          btn.classList.remove("copied");
        }, 1500);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
      } else {
        fallbackCopy(text, done);
      }
    });
  });

  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* no-op */ }
    document.body.removeChild(ta);
    done();
  }

  /* ---------- Show Answer accordions ---------- */
  $all(".answer-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const answer = btn.nextElementSibling;
      if (!answer) return;
      const open = answer.hidden;
      answer.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      btn.textContent = open ? "Hide Answer" : "Show Answer";
    });
  });

  /* ---------- Mobile drawer menu ---------- */
  const menuBtn = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("backdrop");

  function setMenu(open) {
    sidebar.classList.toggle("open", open);
    backdrop.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open && window.innerWidth <= 992 ? "hidden" : "";
  }

  if (menuBtn && sidebar && backdrop) {
    menuBtn.addEventListener("click", () => setMenu(!sidebar.classList.contains("open")));
    backdrop.addEventListener("click", () => setMenu(false));
    $all(".side-nav a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setMenu(false);
    });
  }

  /* ---------- Scroll progress + percentage ---------- */
  const bar = document.getElementById("scrollProgressBar");
  const fill = document.getElementById("learningProgress");
  const percentLabel = document.getElementById("progressPercent");

  function updateProgress() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const pct = max > 0 ? Math.min(100, Math.round((window.scrollY / max) * 100)) : 0;

    if (bar) bar.style.width = pct + "%";
    if (fill) fill.style.width = pct + "%";
    if (percentLabel) percentLabel.textContent = pct + "%";
  }

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateProgress();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
  updateProgress();

  /* ---------- Sidebar scroll-spy ---------- */
  const links = $all(".side-nav a");
  const sections = links
    .map((a) => document.getElementById(a.getAttribute("href").slice(1)))
    .filter(Boolean);

  function setActive(id) {
    links.forEach((a) =>
      a.classList.toggle("active", a.getAttribute("href") === "#" + id)
    );
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s));
  }
})();
