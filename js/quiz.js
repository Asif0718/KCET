/* ============================================================
   quiz.js - Quiz page logic (practice.html)
   Handles: data loading, rendering, answering, palette,
   filters, search, bookmarks, keyboard shortcuts and results. 
   ============================================================ */

(function () {
  "use strict";

  /* ---- State ---- */
  const state = {
    subject: "chemistry",
    questions: [],      // full question list for the subject
    filtered: [],       // questions after chapter/search filter
    index: 0,           // position inside `filtered`
    answers: {},        // { [questionId]: optionKey } restored from storage
    bookmarks: [],      // array of question ids
  };

  const DOM = {
    subjectTitle: $("#subjectTitle"),
    subjectSub: $("#subjectSub"),
    qNumber: $("#qNumber"),
    qMeta: $("#qMeta"),
    bookmark: $("#bookmarkBtn"),
    question: $("#questionText"),
    imageWrap: $("#imageWrap"),
    options: $("#optionsList"),
    feedback: $("#feedback"),
    explanation: $("#explanation"),
    explanationText: $("#explanationText"),
    prevBtn: $("#prevBtn"),
    nextBtn: $("#nextBtn"),
    palette: $("#palette"),
    progressFill: $("#progressFill"),
    progressInfo: $("#progressInfo"),
    chapterFilter: $("#chapterFilter"),
    searchBox: $("#searchBox"),
    empty: $("#emptyState"),
    mainArea: $("#mainArea"),
  };

  /* ==========================================================
     Loading & initialisation
     ========================================================== */
  async function init() {
    state.subject = new URLSearchParams(window.location.search).get("subject") || "chemistry";
    const meta = SUBJECTS.find((s) => s.key === state.subject);
    if (meta) {
      DOM.subjectTitle.textContent = meta.name;
      DOM.subjectSub.textContent = meta.tagline;
      document.title = `${meta.name} · KCET Practice`;
      const brand = $("#brandName");
      if (brand) brand.textContent = meta.name;
    }

    try {
      state.questions = await loadSubjectData(state.subject);
    } catch (err) {
      DOM.mainArea.classList.add("hidden");
      DOM.empty.classList.remove("hidden");
      DOM.empty.querySelector(".big").textContent = "⚠️";
      DOM.empty.querySelector("p").textContent = err.message;
      return;
    }

    /* Restore session from LocalStorage (auto-resume on refresh) */
    state.answers = Storage.getAnswers(state.subject);
    state.bookmarks = Storage.getBookmarks();
    const savedIndex = Storage.getCurrentIndex(state.subject);
    state.index = Math.min(savedIndex, state.questions.length - 1);

    /* Default: chapter filter = "all" => filtered = full list */
    state.filtered = state.questions.slice();

    buildChapterFilter();
    attachEventListeners();
    renderAll();
  }

  /* ==========================================================
     Filters (by chapter) & Search (by question text)
     ========================================================== */
  function buildChapterFilter() {
    const chapters = [...new Set(state.questions.map((q) => q.chapter))].sort();
    DOM.chapterFilter.innerHTML =
      '<option value="all">All Chapters</option>' +
      chapters.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");

    DOM.chapterFilter.addEventListener("change", () => {
      applyFilters();
    });
  }

  function applyFilters() {
    const chapter = DOM.chapterFilter.value;
    const query = DOM.searchBox.value.trim().toLowerCase();

    state.filtered = state.questions.filter((q) => {
      const matchesChapter = chapter === "all" || q.chapter === chapter;
      const matchesSearch = !query || q.question.toLowerCase().includes(query);
      return matchesChapter && matchesSearch;
    });

    /* Jump to first match (or first un-answered one) when filtering */
    state.index = 0;
    renderAll();
  }

  function debounce(fn, wait = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  /* ==========================================================
     Rendering
     ========================================================== */
  function renderAll() {
    if (state.filtered.length === 0) {
      DOM.mainArea.classList.add("hidden");
      DOM.empty.classList.remove("hidden");
      DOM.empty.querySelector(".big").textContent = "🔍";
      DOM.empty.querySelector("p").textContent =
        "No questions match your search. Try a different chapter or keyword.";
      return;
    }
    DOM.mainArea.classList.remove("hidden");
    DOM.empty.classList.add("hidden");
    renderQuestion();
    renderPalette();
    renderProgress();
  }

  function currentQuestion() {
    return state.filtered[state.index];
  }

  function renderQuestion() {
    const q = currentQuestion();
    const total = state.filtered.length;
    const answeredCount = state.filtered.filter((fq) => state.answers[fq.id] !== undefined).length;

    /* Header + meta chips */
    DOM.qNumber.textContent = `Question ${state.index + 1} of ${total}`;
    DOM.qMeta.innerHTML =
      `<span class="chip">📘 ${escapeHtml(q.chapter)}</span>` +
      `<span class="chip">${answeredCount}/${total} answered</span>`;

    /* Question text */
    DOM.question.textContent = q.question;

    /* Image */
    renderImage(q);

    /* Bookmark */
    updateBookmarkButton();

    /* Options (fresh, not yet answered on this render pass —
       existing answers are re-applied visually below) */
    DOM.options.innerHTML = Object.entries(q.options)
      .map(
        ([key, text], i) =>
          `<button class="option" data-key="${key}" ${answered(key) ? "disabled" : ""}>
             <span class="key">${key}</span>
             <span>${escapeHtml(text)}</span>
           </button>`
      )
      .join("");

    /* Apply saved feedback styling if this question was answered before */
    const saved = state.answers[q.id];
    if (saved) {
      showResult(q, saved, true);
    } else {
      DOM.feedback.classList.remove("show");
      DOM.explanation.classList.remove("show");
      DOM.nextBtn.disabled = false;
    }
  
    /* Nav buttons */
    DOM.prevBtn.disabled = state.index === 0;
    DOM.nextBtn.disabled = state.index >= total - 1;
  }

  function answered(qid) {
    return state.answers[qid] !== undefined;
  }

  function renderImage(q) {
    DOM.imageWrap.classList.add("hidden");
    DOM.imageWrap.innerHTML = "";
    if (!q.hasImage) return;

    DOM.imageWrap.classList.remove("hidden");
    if (q.image) {
      const img = document.createElement("img");
      img.className = "question-image";
      img.src = q.image;
      img.alt = "Question diagram";
      DOM.imageWrap.appendChild(img);
    } else {
      const ph = document.createElement("div");
      ph.className = "chip";
      ph.textContent = "🖼️ Diagram required for this question";
      DOM.imageWrap.appendChild(ph);
    }
  }

  /* ==========================================================
     Answering
     ========================================================== */
  function handleOptionClick(key) {
    const q = currentQuestion();
    if (answered(q.id)) return; // answers are locked once submitted
    submitAnswer(key);
  }

  function submitAnswer(key) {
    const q = currentQuestion();
    state.answers[q.id] = key;
    Storage.saveAnswer(state.subject, q.id, key);

    showResult(q, key, false);
    renderPalette();
    renderProgress();
    updateBookmarkButton();
  }

  /** Reveal correctness, highlight options and show explanation. */
  function showResult(q, selectedKey, isRestored) {
    const correct = selectedKey === q.correctAnswer;

    /* Highlight all options */
    $all(".option", DOM.options).forEach((opt) => {
      const key = opt.dataset.key;
      opt.disabled = true;
      opt.classList.remove("selected", "correct", "wrong");
      if (key === q.correctAnswer) opt.classList.add("correct");
      if (key === selectedKey && !correct) opt.classList.add("wrong");
      if (key === selectedKey && correct) opt.classList.add("selected");
    });

    /* Feedback banner */
    DOM.feedback.classList.add("show");
    DOM.feedback.classList.toggle("correct-feedback", correct);
    DOM.feedback.classList.toggle("wrong-feedback", !correct);
    DOM.feedback.textContent = correct
      ? "✅ Correct!"
      : `❌ Wrong! (Correct answer: ${q.correctAnswer})`;

    /* Explanation card */
    DOM.explanationText.textContent = q.explanation;
    DOM.explanation.classList.add("show");

    /* If restored from storage, keep feedback visible */
    if (isRestored) {
      DOM.feedback.dataset.restored = "true";
    }
  }

  /* ==========================================================
     Palette & Progress
     ========================================================== */
  function renderPalette() {
    DOM.palette.innerHTML = state.filtered
      .map((q, i) => {
        const ans = state.answers[q.id];
        let cls = "attempted";
        if (ans !== undefined) {
          cls = ans === q.correctAnswer ? "correct-pal" : "wrong-pal";
        }
        const current = i === state.index ? " current" : "";
        return `<button class="${cls}${current}" data-goto="${i}" title="Question ${i + 1}">${i + 1}</button>`;
      })
      .join("");

    $all("[data-goto]", DOM.palette).forEach((btn) => {
      btn.addEventListener("click", () => {
        state.index = Number(btn.dataset.goto);
        Storage.setCurrentIndex(state.subject, state.index);
        renderQuestion();
        renderPalette();
      });
    });
  }

  function renderProgress() {
    const total = state.filtered.length;
    const done = state.filtered.filter((q) => state.answers[q.id] !== undefined).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    DOM.progressFill.style.width = pct + "%";
    DOM.progressInfo.textContent = `${done} of ${total} answered`;
  }

  /* ==========================================================
     Navigation (prev / next)
     ========================================================== */
  function goToIndex(newIndex) {
    state.index = Math.max(0, Math.min(state.filtered.length - 1, newIndex));
    Storage.setCurrentIndex(state.subject, state.index);
    renderQuestion();
    renderPalette();
  }

  /* ==========================================================
     Bookmarks
     ========================================================== */
  function updateBookmarkButton() {
    const q = currentQuestion();
    DOM.bookmark.classList.toggle("active", state.bookmarks.includes(q.id));
    DOM.bookmark.title = state.bookmarks.includes(q.id)
      ? "Remove bookmark"
      : "Bookmark this question";
  }

  function toggleBookmark() {
    const q = currentQuestion();
    const active = Storage.toggleBookmark(q.id);
    if (active) {
      state.bookmarks.push(q.id);
    } else {
      state.bookmarks = state.bookmarks.filter((id) => id !== q.id);
    }
    updateBookmarkButton();
  }

  /* ==========================================================
     Results
     ========================================================== */
  function finishQuiz() {
    const total = state.questions.length;
    let correct = 0;
    state.questions.forEach((q) => {
      if (state.answers[q.id] === q.correctAnswer) correct++;
    });
    const wrong = total - correct;
    const percentage = total === 0 ? 0 : Math.round((correct / total) * 100);

    Storage.saveResult(state.subject, { total, correct, wrong, percentage });
    goTo(`result.html?subject=${state.subject}`);
  }

  /* ==========================================================
     Keyboard shortcuts
       ← / →  previous / next
       1-4    select option A-D
       B      toggle bookmark
       S      submit / finish
     ========================================================== */
  function setupKeyboard() {
    document.addEventListener("keydown", (e) => {
      /* ignore while typing in the search box */
      if (e.target.matches("input, select, textarea")) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          goToIndex(state.index - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          goToIndex(state.index + 1);
          break;
        case "1":
        case "2":
        case "3":
        case "4": {
          e.preventDefault();
          handleOptionClick(["A", "B", "C", "D"][Number(e.key) - 1]);
          break;
        }
        case "b":
        case "B":
          toggleBookmark();
          break;
        case "s":
        case "S":
          finishQuiz();
          break;
      }
    });
  }

  /* ==========================================================
     Event wiring
     ========================================================== */
  function attachEventListeners() {
    DOM.options.addEventListener("click", (e) => {
      const opt = e.target.closest(".option");
      if (opt) handleOptionClick(opt.dataset.key);
    });

    DOM.prevBtn.addEventListener("click", () => goToIndex(state.index - 1));
    DOM.nextBtn.addEventListener("click", () => goToIndex(state.index + 1));
    DOM.bookmark.addEventListener("click", toggleBookmark);

    DOM.searchBox.addEventListener("input", debounce(applyFilters));

    /* Finish practice buttons (header + nav) */
    ["#finishBtn", "#finishNavBtn"].forEach((sel) => {
      const finishBtn = $(sel);
      if (finishBtn) finishBtn.addEventListener("click", finishQuiz);
    });
  }

  /* ---- tiny HTML escaping util ---- */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---- start ---- */
  init();
})();
