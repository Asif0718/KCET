/* ============================================================
   storage.js - LocalStorage helper module
   Persists: current question index, answers, bookmarks, theme,
   and the latest quiz result for each subject.
   ============================================================ */

const Storage = {
  PREFIX: "kcet_mcq_",

  /* ---- Generic get/set helpers ---- */
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      console.warn("Storage read failed:", key, e);
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn("Storage write failed:", key, e);
    }
  },

  remove(key) {
    localStorage.removeItem(this.PREFIX + key);
  },

  /* ---- Theme ---- */
  getTheme() {
    return this.get("theme", "light");
  },

  setTheme(theme) {
    this.set("theme", theme);
  },

  /* ---- Session state (per subject) ---- */
  _key(subject, prop) {
    return `session_${subject}_${prop}`;
  },

  getCurrentIndex(subject) {
    return this.get(this._key(subject, "current"), 0);
  },

  setCurrentIndex(subject, index) {
    this.set(this._key(subject, "current"), index);
  },

  /** answers: { [questionId]: "A" | "B" | "C" | "D" } */
  getAnswers(subject) {
    return this.get(this._key(subject, "answers"), {});
  },

  saveAnswer(subject, questionId, option) {
    const answers = this.getAnswers(subject);
    answers[questionId] = option;
    this.set(this._key(subject, "answers"), answers);
  },

  /* ---- Bookmarks: array of question ids (global across subjects) ---- */
  getBookmarks() {
    return this.get("bookmarks", []);
  },

  isBookmarked(questionId) {
    return this.getBookmarks().includes(questionId);
  },

  toggleBookmark(questionId) {
    let bookmarks = this.getBookmarks();
    if (bookmarks.includes(questionId)) {
      bookmarks = bookmarks.filter((id) => id !== questionId);
    } else {
      bookmarks.push(questionId);
    }
    this.set("bookmarks", bookmarks);
    return bookmarks.includes(questionId);
  },

  /* ---- Result summary ---- */
  getResult(subject) {
    return this.get(this._key(subject, "result"), null);
  },

  saveResult(subject, result) {
    this.set(this._key(subject, "result"), result);
  },

  /* ---- Clear one subject's practice session ---- */
  resetSession(subject) {
    this.remove(this._key(subject, "current"));
    this.remove(this._key(subject, "answers"));
  },

  /* ---- Clear everything ---- */
  clearAll() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(this.PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  },
};
