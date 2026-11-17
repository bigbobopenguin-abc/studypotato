/* studypotato — shared behaviour for module pages.
   Builds the topic rail, search, progress tracking, quizzes, recall mode and theme toggle.
   A module page only needs: <body data-module="slug">, a <main> with <section id=".."><h2>..</h2>, and this script. */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  window.SP = { store, $, $$ };

  /* ---------- theme (shared with home page) ---------- */
  const THEMES = ["system", "light", "dark"];
  function applyTheme(t) {
    if (t === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
    const b = $("#themeBtn");
    if (b) { b.title = "Theme: " + t; b.setAttribute("aria-label", "Theme: " + t + " (click to change)"); b.dataset.mode = t; }
    document.dispatchEvent(new CustomEvent("sp:theme"));
  }
  applyTheme(store.get("sp:theme", "system"));
  document.addEventListener("click", e => {
    const b = e.target.closest("#themeBtn"); if (!b) return;
    const cur = store.get("sp:theme", "system");
    const next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
    store.set("sp:theme", next); applyTheme(next);
  });
  if (window.matchMedia) matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => document.dispatchEvent(new CustomEvent("sp:theme")));

  const mod = document.body.dataset.module;
  if (!mod) return; // home page stops here
  const K = name => "sp:" + mod + ":" + name;
  const main = $("main");
  const sections = $$("main > section[id]");
  const tracked = sections.filter(s => !s.hasAttribute("data-noprogress"));
  store.set(K("total"), tracked.length);

  /* ---------- topic rail ---------- */
  const rail = $("#rail");
  const groups = {};
  sections.forEach(s => {
    const g = s.dataset.group || "Topics";
    (groups[g] = groups[g] || []).push(s);
  });
  let html = '<div class="railprog"><small>Topics revised: <b id="progN">0</b> / ' + tracked.length + '</small><div class="bar"><span id="progBar"></span></div></div>';
  Object.keys(groups).forEach(g => {
    html += '<p class="lbl">' + g + "</p><ol>";
    groups[g].forEach(s => {
      const h = $("h2", s);
      const tn = $(".tn", h);
      const title = Array.from(h.childNodes).filter(n => !(n.nodeType === 1 && (n.classList.contains("tn") || n.classList.contains("donebtn")))).map(n => n.textContent).join("").trim();
      const short = s.dataset.short || title;
      const num = s.dataset.num || (tn ? tn.textContent.replace(/^Topic\s*/i, "") : "");
      html += '<li><a href="#' + s.id + '" data-id="' + s.id + '"><span class="t">' + num + "</span><span>" + short + '</span><span class="done-mark" hidden>✓</span></a></li>';
    });
    html += "</ol>";
  });
  rail.innerHTML = html;
  rail.addEventListener("click", e => { if (e.target.closest("a")) document.body.classList.remove("nav-open"); });
  $("#navBtn")?.addEventListener("click", () => document.body.classList.toggle("nav-open"));
  $(".scrim")?.addEventListener("click", () => document.body.classList.remove("nav-open"));

  /* ---------- done tracking ---------- */
  let done = new Set(store.get(K("done"), []));
  function renderDone() {
    tracked.forEach(s => {
      const on = done.has(s.id);
      const b = $(".donebtn", s); if (b) { b.setAttribute("aria-pressed", on); b.textContent = on ? "✓ Revised" : "Mark revised"; }
      const m = $('a[data-id="' + s.id + '"] .done-mark', rail); if (m) m.hidden = !on;
    });
    const n = tracked.filter(s => done.has(s.id)).length;
    $("#progN").textContent = n;
    $("#progBar").style.width = (tracked.length ? 100 * n / tracked.length : 0) + "%";
  }
  tracked.forEach(s => {
    const b = document.createElement("button");
    b.className = "donebtn"; b.type = "button";
    b.addEventListener("click", () => { done.has(s.id) ? done.delete(s.id) : done.add(s.id); store.set(K("done"), [...done]); renderDone(); });
    $("h2", s).appendChild(b);
  });
  renderDone();

  /* ---------- scrollspy + reading progress ---------- */
  const links = $$("a[data-id]", rail);
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        links.forEach(a => a.classList.toggle("active", a.dataset.id === en.target.id));
      }
    });
  }, { rootMargin: "-30% 0px -60% 0px" });
  sections.forEach(s => io.observe(s));
  const line = $(".progressline");
  addEventListener("scroll", () => {
    const h = document.documentElement;
    const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    if (line) line.style.width = (p * 100).toFixed(1) + "%";
  }, { passive: true });

  /* ---------- search ---------- */
  const input = $("#q");
  const countChip = $("#hitCount");
  function clearMarks() {
    $$("mark.hit", main).forEach(m => { const t = document.createTextNode(m.textContent); m.replaceWith(t); t.parentNode.normalize(); });
    sections.forEach(s => s.classList.remove("dim"));
  }
  function search(q) {
    clearMarks();
    q = q.trim().toLowerCase();
    if (q.length < 2) { if (countChip) countChip.hidden = true; return; }
    let hits = 0, first = null;
    sections.forEach(s => {
      if (!s.textContent.toLowerCase().includes(q)) { s.classList.add("dim"); return; }
      const walker = document.createTreeWalker(s, NodeFilter.SHOW_TEXT, {
        acceptNode: n => n.parentElement.closest("script,style,button,.widget") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
      });
      const nodes = []; let n; while ((n = walker.nextNode())) nodes.push(n);
      nodes.forEach(node => {
        const txt = node.nodeValue, low = txt.toLowerCase();
        let i = low.indexOf(q); if (i < 0) return;
        const frag = document.createDocumentFragment(); let last = 0;
        while (i >= 0) {
          frag.appendChild(document.createTextNode(txt.slice(last, i)));
          const m = document.createElement("mark"); m.className = "hit"; m.textContent = txt.slice(i, i + q.length);
          frag.appendChild(m); hits++; if (!first) first = m;
          last = i + q.length; i = low.indexOf(q, last);
        }
        frag.appendChild(document.createTextNode(txt.slice(last)));
        node.replaceWith(frag);
      });
      $$("details", s).forEach(d => { if ($("mark.hit", d)) d.open = true; });
    });
    if (countChip) { countChip.hidden = false; countChip.textContent = hits + (hits === 1 ? " match" : " matches"); }
    return first;
  }
  let tmr;
  input?.addEventListener("input", () => { clearTimeout(tmr); tmr = setTimeout(() => search(input.value), 180); });
  input?.addEventListener("keydown", e => {
    if (e.key === "Enter") { const marks = $$("mark.hit", main); if (!marks.length) return;
      const y = scrollY + 80; const next = marks.find(m => m.getBoundingClientRect().top + scrollY > y + 5) || marks[0];
      next.scrollIntoView({ block: "center" }); }
    if (e.key === "Escape") { input.value = ""; search(""); input.blur(); }
  });
  addEventListener("keydown", e => {
    if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") { e.preventDefault(); input?.focus(); }
  });

  /* ---------- recall mode ---------- */
  const recallBtn = $("#recallBtn");
  function setRecall(on) {
    document.body.classList.toggle("recall", on);
    if (recallBtn) recallBtn.setAttribute("aria-pressed", on);
    if (!on) $$(".ex .ln.shown").forEach(l => l.classList.remove("shown"));
    $$(".ex.revealed").forEach(x => x.classList.remove("revealed"));
    store.set("sp:recall", on);
  }
  recallBtn?.addEventListener("click", () => setRecall(!document.body.classList.contains("recall")));
  main.addEventListener("click", e => {
    const ln = e.target.closest(".ex .ln");
    if (ln && document.body.classList.contains("recall")) { ln.classList.add("shown"); ln.closest(".ex").classList.add("revealed"); }
  });
  setRecall(store.get("sp:recall", false));

  /* ---------- MCQs ---------- */
  const mcqState = store.get(K("mcq"), {});
  const mcqs = $$(".mcq");
  mcqs.forEach((q, qi) => {
    const id = q.id || "mcq" + qi;
    const items = $$(".choices > li", q);
    const ans = Number(q.dataset.answer);
    const exp = $(".explain", q); if (exp) exp.hidden = true;
    const buttons = items.map((li, i) => {
      const b = document.createElement("button"); b.type = "button";
      b.innerHTML = '<span class="l">' + "abcdefg"[i] + "</span><span>" + li.innerHTML + "</span>";
      li.innerHTML = ""; li.appendChild(b); return b;
    });
    function show(choice) {
      buttons.forEach((b, i) => { b.disabled = true; if (i === ans) b.classList.add("right"); if (i === choice && i !== ans) b.classList.add("wrong"); });
      if (exp) { exp.hidden = false; exp.insertAdjacentHTML("afterbegin", choice === ans ? "<b style='color:var(--ok)'>Correct.</b> " : "<b style='color:var(--bad)'>Not quite.</b> "); }
    }
    buttons.forEach((b, i) => b.addEventListener("click", () => { mcqState[id] = i; store.set(K("mcq"), mcqState); show(i); score(); }));
    if (id in mcqState) show(mcqState[id]);
    q.dataset.qid = id;
  });

  /* ---------- self-marked questions ---------- */
  const selfState = store.get(K("self"), {});
  const selfs = $$("details.q");
  selfs.forEach((d, i) => {
    const id = d.id || "sq" + i; d.dataset.qid = id;
    const ans = $(".ans", d); if (!ans) return;
    const row = document.createElement("div"); row.className = "selfmark";
    row.innerHTML = '<button type="button" class="y">I got it</button><button type="button" class="n">Review again</button>';
    ans.appendChild(row);
    const [y, n] = $$("button", row);
    function paint() {
      const v = selfState[id];
      y.setAttribute("aria-pressed", v === "y"); n.setAttribute("aria-pressed", v === "n");
      d.classList.toggle("got", v === "y"); d.classList.toggle("miss", v === "n");
    }
    y.addEventListener("click", () => { selfState[id] = selfState[id] === "y" ? undefined : "y"; store.set(K("self"), selfState); paint(); score(); });
    n.addEventListener("click", () => { selfState[id] = selfState[id] === "n" ? undefined : "n"; store.set(K("self"), selfState); paint(); score(); });
    paint();
  });

  const sb = $("#scorebar");
  function score() {
    if (!sb) return;
    let right = 0, answered = 0;
    mcqs.forEach(q => { const v = mcqState[q.dataset.qid]; if (v !== undefined) { answered++; if (v === Number(q.dataset.answer)) right++; } });
    const got = selfs.filter(d => selfState[d.dataset.qid] === "y").length;
    const miss = selfs.filter(d => selfState[d.dataset.qid] === "n").length;
    $("#mcqScore", sb).textContent = right + " / " + answered + " correct (" + mcqs.length + " MCQs)";
    $("#selfScore", sb).textContent = got + " got it · " + miss + " to review (" + selfs.length + " questions)";
  }
  $("#onlyMissed")?.addEventListener("click", e => {
    const on = e.currentTarget.getAttribute("aria-pressed") !== "true";
    e.currentTarget.setAttribute("aria-pressed", on);
    mcqs.forEach(q => { const v = mcqState[q.dataset.qid]; q.hidden = on && v !== undefined && v === Number(q.dataset.answer); });
    selfs.forEach(d => { d.hidden = on && selfState[d.dataset.qid] === "y"; });
  });
  $("#resetQuiz")?.addEventListener("click", () => {
    const b = $("#resetQuiz");
    if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "Tap again to reset"; setTimeout(() => { b.dataset.armed = ""; b.textContent = "Reset answers"; }, 3000); return; }
    store.set(K("mcq"), {}); store.set(K("self"), {}); location.reload();
  });
  score();
})();
