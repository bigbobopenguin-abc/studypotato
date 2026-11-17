/* studypotato study helpers, loaded after site.js on every page:
   the potato mascot, small notices, and the 60-second Speed Round quiz built
   from the multiple-choice questions on the page. Best scores are kept in
   this browser only. */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const S = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const mod = document.body.dataset.module || "";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- mascot ---------- */
  const FACES = {
    happy: '<path d="M38 58 q12 10 24 0" stroke="#5a3415" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
    wow: '<ellipse cx="50" cy="60" rx="6" ry="7" fill="#5a3415"/>',
    think: '<path d="M40 60 h20" stroke="#5a3415" stroke-width="3.5" stroke-linecap="round"/>',
    sad: '<path d="M38 64 q12 -9 24 0" stroke="#5a3415" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
    cool: '<path d="M38 57 q12 12 24 0" stroke="#5a3415" stroke-width="3.5" fill="#fff" stroke-linecap="round"/>'
  };
  const potato = (mood = "happy", size = 64) =>
    '<svg class="potato" width="' + size + '" height="' + size + '" viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="pg' + mood + '" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#f3d496"/><stop offset=".65" stop-color="#d9a35b"/><stop offset="1" stop-color="#a86b2d"/></radialGradient></defs>' +
    '<path d="M50 8 C78 8 94 30 92 56 C90 82 70 94 48 92 C24 90 8 74 9 50 C10 24 26 8 50 8Z" fill="url(#pg' + mood + ')"/>' +
    '<circle cx="26" cy="30" r="2.4" fill="#a86b2d" opacity=".6"/><circle cx="74" cy="76" r="2.2" fill="#a86b2d" opacity=".6"/><circle cx="80" cy="34" r="1.8" fill="#a86b2d" opacity=".6"/>' +
    (mood === "cool" ? '<rect x="28" y="36" width="18" height="10" rx="4" fill="#1d1d1f"/><rect x="54" y="36" width="18" height="10" rx="4" fill="#1d1d1f"/><path d="M46 40 h8" stroke="#1d1d1f" stroke-width="3"/>' :
      '<ellipse cx="38" cy="42" rx="4.2" ry="5.2" fill="#3a2210"/><ellipse cx="62" cy="42" rx="4.2" ry="5.2" fill="#3a2210"/><circle cx="39.5" cy="40" r="1.4" fill="#fff"/><circle cx="63.5" cy="40" r="1.4" fill="#fff"/>') +
    '<ellipse cx="29" cy="54" rx="5" ry="3" fill="#e9807a" opacity=".45"/><ellipse cx="71" cy="54" rx="5" ry="3" fill="#e9807a" opacity=".45"/>' + (FACES[mood] || FACES.happy) + "</svg>";

  /* ---------- toasts & confetti ---------- */
  const tray = document.createElement("div"); tray.className = "toasts"; tray.setAttribute("aria-live", "polite"); document.body.appendChild(tray);
  function toast(html, kind = "", ms = 2200) {
    const t = document.createElement("div"); t.className = "toast " + kind; t.innerHTML = html; tray.appendChild(t);
    while (tray.children.length > 3) tray.firstChild.remove();
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 300); }, ms);
  }
  function confetti(n = 120) {
    if (reduce) return;
    const cv = document.createElement("canvas"); cv.className = "confetti"; document.body.appendChild(cv);
    const dpr = devicePixelRatio || 1; cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    const g = cv.getContext("2d"); g.scale(dpr, dpr);
    const cs = getComputedStyle(document.body);
    const cols = [cs.getPropertyValue("--accent"), cs.getPropertyValue("--hot"), "#f2c14e", "#3cb371", "#e9807a"].map(c => c.trim() || "#f2c14e");
    const P = Array.from({ length: n }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * 6 + 4, c: cols[Math.floor(Math.random() * cols.length)], a: Math.random() * 6, va: (Math.random() - .5) * .4 }));
    let f = 0;
    (function tick() {
      g.clearRect(0, 0, innerWidth, innerHeight);
      P.forEach(p => { p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); g.restore(); });
      if (++f < 150) requestAnimationFrame(tick); else cv.remove();
    })();
  }

  /* ---------- modal helper ---------- */
  function modal(cls) {
    const ov = document.createElement("div"); ov.className = "ov " + (cls || "");
    ov.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><button class="x" type="button" aria-label="Close">×</button><div class="sb"></div></div>';
    document.body.appendChild(ov); document.body.classList.add("noscroll");
    const close = () => { ov.remove(); document.body.classList.remove("noscroll"); document.removeEventListener("keydown", esc); ov.dispatchEvent(new Event("closed")); };
    const esc = e => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", esc);
    $(".x", ov).addEventListener("click", close);
    ov.addEventListener("click", e => { if (e.target === ov) close(); });
    return { ov, body: $(".sb", ov), close };
  }


  window.SPS = { potato, toast };
  if (!mod) return;

  /* ---------- quick check: suggest marking the topic revised ---------- */
  document.addEventListener("sp:mcq", e => {
    const { correct, quick, el } = e.detail;
    if (!reduce) { el.classList.remove("pop", "shake"); void el.offsetWidth; el.classList.add(correct ? "pop" : "shake"); }
    if (!(quick && correct)) return;
    const box = el.closest(".quick"), st = S.get("sp:" + mod + ":mcq", {});
    if ($$(".mcq", box).every(q => st[q.dataset.qid] === Number(q.dataset.answer))) {
      const btn = $(".donebtn", el.closest("section"));
      if (btn && btn.getAttribute("aria-pressed") !== "true") {
        toast(potato("wow", 40) + "<div><b>Quick check: all correct.</b><br>Mark this topic as revised?</div>", "big", 3500);
        btn.classList.add("nudge");
      }
    }
  });
  document.addEventListener("sp:done", () => $(".donebtn.nudge")?.classList.remove("nudge"));

  /* ---------- Speed Round ---------- */
  const pool = () => $$(".mcq").map(q => q.spData).filter(Boolean);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const strip = h => h.replace(/^\s*\d+\.\s*/, "");
  function speedRound() {
    const qs = pool();
    if (!qs.length) return;
    const best = (S.get("sp:speedbest", {})[mod]) || 0;
    const m = modal("speed");
    const intro = () => {
      m.body.innerHTML = '<div class="sr-intro">' + potato("happy", 96) + '<h2>Speed Round</h2><p>Answer as many questions as you can in <b>60 seconds</b>. Right answers in a row build a <b>combo</b> worth bonus points. ' + qs.length + " questions in the pool.</p>" +
        '<div class="sr-best">Your best: <b>' + best + '</b></div><button class="btn big" type="button" id="srgo">Start</button><p class="sub">Keys 1–4 answer · Esc quits</p></div>';
      $("#srgo", m.body).addEventListener("click", play); $("#srgo", m.body).focus();
    };
    let deck, i, score, combo, maxCombo, right, wrong, missed, t0, timer, locked, keyH;
    const play = () => {
      deck = shuffle(qs.slice()); i = 0; score = 0; combo = 0; maxCombo = 0; right = 0; wrong = 0; missed = []; locked = false;
      m.body.innerHTML = '<div class="sr"><div class="sr-top"><span class="sr-score">0</span><span class="sr-combo"></span><span class="sr-time">60</span></div><div class="sr-timer"><span></span></div><div class="sr-q"></div><div class="sr-opts"></div><div class="sr-fb"></div></div>';
      t0 = performance.now();
      timer = setInterval(tick, 100);
      keyH = e => { const n = +e.key; if (n >= 1 && n <= 4) { const b = $$(".sr-opts button", m.body)[n - 1]; b && b.click(); } };
      document.addEventListener("keydown", keyH);
      next();
    };
    const tick = () => {
      const left = Math.max(0, 60 - (performance.now() - t0) / 1000);
      const t = $(".sr-time", m.body); if (!t) return clearInterval(timer);
      t.textContent = Math.ceil(left); $(".sr-timer span", m.body).style.width = (left / 60 * 100) + "%";
      t.classList.toggle("low", left < 10);
      if (left <= 0) end();
    };
    const next = () => {
      if (i >= deck.length) { deck = deck.concat(shuffle(qs.slice())); }
      const q = deck[i++]; locked = false;
      const order = shuffle(q.opts.map((o, k) => k));
      $(".sr-q", m.body).innerHTML = strip(q.text);
      $(".sr-fb", m.body).innerHTML = "";
      $(".sr-opts", m.body).innerHTML = order.map((k, n) => '<button type="button" data-k="' + k + '"><span class="n">' + (n + 1) + "</span><span>" + q.opts[k] + "</span></button>").join("");
      $$(".sr-opts button", m.body).forEach(b => b.addEventListener("click", () => {
        if (locked) return; locked = true;
        const k = +b.dataset.k, ok = k === q.ans;
        $$(".sr-opts button", m.body).forEach(x => { if (+x.dataset.k === q.ans) x.classList.add("right"); });
        if (ok) {
          combo++; maxCombo = Math.max(maxCombo, combo); right++;
          const pts = combo >= 5 ? 3 : combo >= 3 ? 2 : 1; score += pts;
          $(".sr-score", m.body).textContent = score;
          const cb = $(".sr-combo", m.body); cb.textContent = combo >= 2 ? combo + "× combo" + (pts > 1 ? " · +" + pts : "") : ""; cb.classList.remove("bump"); void cb.offsetWidth; cb.classList.add("bump");
          setTimeout(next, 450);
        } else {
          b.classList.add("wrong"); combo = 0; wrong++; missed.push(q);
          $(".sr-combo", m.body).textContent = "";
          $(".sr-fb", m.body).innerHTML = q.exp.replace(/<b[^>]*>(Correct\.|Not quite\.)<\/b>\s*/, "");
          setTimeout(next, 1700);
        }
      }));
    };
    const end = () => {
      clearInterval(timer); document.removeEventListener("keydown", keyH);
      const bestAll = S.get("sp:speedbest", {}); const prev = bestAll[mod] || 0; const isBest = score > prev;
      if (isBest) { bestAll[mod] = score; S.set("sp:speedbest", bestAll); }
      const acc = right + wrong ? Math.round(100 * right / (right + wrong)) : 0;
      m.body.innerHTML = '<div class="sr-end">' + potato(score >= 15 ? "cool" : score >= 6 ? "happy" : "think", 96) + "<h2>" + (isBest ? "New best!" : score >= 10 ? "Nice round!" : "Round over") + '</h2><div class="sr-big">' + score + '</div><div class="pstats"><div><b>' + right + "</b><small>right</small></div><div><b>" + acc + "%</b><small>accuracy</small></div><div><b>" + maxCombo + "×</b><small>best combo</small></div><div><b>" + Math.max(prev, score) + "</b><small>best score</small></div></div>" +
        (missed.length ? '<h3>Review what you missed</h3><div class="sr-miss">' + missed.slice(0, 8).map(q => "<div><b>" + strip(q.text) + "</b><p>Answer: " + q.opts[q.ans] + "</p><small>" + q.exp.replace(/<b[^>]*>(Correct\.|Not quite\.)<\/b>\s*/, "") + "</small></div>").join("") + "</div>" : "") +
        '<div class="sr-actions"><button class="btn big" type="button" id="sragain">Play again</button><button class="btn ghost" type="button" id="srclose">Back to notes</button></div></div>';
      $("#sragain", m.body).addEventListener("click", play); $("#srclose", m.body).addEventListener("click", m.close);
      if (isBest && score >= 3) confetti(140);
    };
    m.ov.addEventListener("closed", () => { clearInterval(timer); document.removeEventListener("keydown", keyH); if (location.hash === "#play") history.replaceState(null, "", location.pathname); });
    intro();
  }
  window.SPS.speedRound = speedRound;

  // entry points: header button, practice section, #play
  const tool = $(".toolrow");
  if (tool && pool().length) {
    const b = document.createElement("button"); b.type = "button"; b.className = "btn big playbtn";
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>Play Speed Round';
    b.addEventListener("click", speedRound); tool.prepend(b);
  }
  const sb = $("#scorebar");
  if (sb) { const b = document.createElement("button"); b.type = "button"; b.className = "iconbtn"; b.textContent = "Speed Round"; b.addEventListener("click", speedRound); sb.appendChild(b); }
  if (location.hash === "#play") setTimeout(speedRound, 300);

  // header mascot
  const top = $("header.top");
  if (top && !$(".hero-potato", top)) { const d = document.createElement("div"); d.className = "hero-potato"; d.innerHTML = potato("happy", 120); top.appendChild(d); }
})();
