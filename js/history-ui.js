/* ============================================================
   history-ui.js - Rendering helpers shared by result.html and
   history.html (chapter breakdown tables, escaping, formatting).
   ============================================================ */

const HistoryUI = {
  escape(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  pct(part, whole) {
    return whole ? Math.round((part / whole) * 100) : 0;
  },

  /* stats: { [chapter]: { total, attempted, correct } } — weakest accuracy first */
  chapterTable(stats) {
    const rows = Object.entries(stats)
      .map(([chapter, s]) => ({ chapter, ...s, acc: this.pct(s.correct, s.attempted) }))
      .sort((a, b) => (b.attempted > 0) - (a.attempted > 0) || a.acc - b.acc);

    return `
      <table class="history-table">
        <thead><tr><th>Chapter</th><th>Correct</th><th>Attempted</th><th>Accuracy</th></tr></thead>
        <tbody>
          ${rows
            .map(
              (r) => `<tr>
                <td>${this.escape(r.chapter)}</td>
                <td>${r.correct}</td>
                <td>${r.attempted}/${r.total}</td>
                <td><span class="acc ${this.accClass(r.acc, r.attempted)}">${r.attempted ? r.acc + "%" : "—"}</span></td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>`;
  },

  accClass(acc, attempted = 1) {
    if (!attempted) return "";
    return acc >= 75 ? "good" : acc >= 50 ? "ok" : "bad";
  },

  formatDate(iso) {
    return new Date(iso).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  },
};
