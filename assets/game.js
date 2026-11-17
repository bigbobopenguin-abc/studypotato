/* studypotato game layer: XP, potato levels, daily streak, badges, toasts, confetti,
   the profile panel and the Speed Round. Loaded after site.js on every page.
   Everything is stored in this browser only (localStorage). */
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
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const dayDiff = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);

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

  /* ---------- levels & badges ---------- */
  const LEVELS = [
    [0, "Raw potato"], [100, "Washed potato"], [250, "Peeled potato"], [450, "Boiled potato"], [700, "Mashed potato"],
    [1000, "Roast potato"], [1400, "Hash brown"], [1900, "Golden fries"], [2500, "Potato scholar"], [3300, "Potato professor"], [4300, "Legendary spud"]
  ];
  const levelOf = xp => { let i = 0; while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1][0]) i++; return i; };
  const DAILY_GOAL = 100;
  const BADGES = [
    ["first", "First bite", "Answer your first question", g => g.c.correct + g.c.wrong >= 1],
    ["warm", "Warming up", "Get 10 answers right", g => g.c.correct >= 10],
    ["machine", "Quiz machine", "Get 50 answers right", g => g.c.correct >= 50],
    ["centurion", "Centurion", "Get 100 answers right", g => g.c.correct >= 100],
    ["topic", "Topic down", "Mark your first topic revised", g => g.c.topics >= 1],
    ["five", "High five", "Mark 5 topics revised", g => g.c.topics >= 5],
    ["module", "Module master", "Revise every topic in a module", g => g.c.modules >= 1],
    ["tinker", "Tinkerer", "Try 5 different calculators", g => (g.c.widgets || []).length >= 5],
    ["lab", "Lab rat", "Try 12 different calculators", g => (g.c.widgets || []).length >= 12],
    ["stepper", "Step by step", "Step through 10 worked examples", g => g.c.steps >= 10],
    ["flash", "Flash flood", "Flip 50 flashcards", g => g.c.flips >= 50],
    ["speed10", "Speedy spud", "Score 10 in a Speed Round", g => g.c.speedBest >= 10],
    ["speed20", "Lightning fries", "Score 20 in a Speed Round", g => g.c.speedBest >= 20],
    ["combo", "Combo chef", "Hit a 8× combo in a Speed Round", g => g.c.bestCombo >= 8],
    ["streak3", "On a roll", "Study 3 days in a row", g => g.streak >= 3],
    ["streak7", "Week warrior", "Study 7 days in a row", g => g.streak >= 7],
    ["goal", "Goal getter", "Hit the daily XP goal", g => Object.values(g.days).some(v => v >= DAILY_GOAL)],
    ["lv5", "Mashed it", "Reach level 5", g => levelOf(g.xp) >= 4]
  ];
  const BADGE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/></svg>';
  const FLAME = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z"/></svg>';

  let G = S.get("sp:game", null) || { xp: 0, days: {}, streak: 0, lastDay: "", badges: {}, awarded: {}, c: { correct: 0, wrong: 0, topics: 0, modules: 0, widgets: [], steps: 0, flips: 0, speedBest: 0, bestCombo: 0 } };
  G.c = Object.assign({ correct: 0, wrong: 0, topics: 0, modules: 0, widgets: [], steps: 0, flips: 0, speedBest: 0, bestCombo: 0 }, G.c || {});
  const save = () => S.set("sp:game", G);
  window.SPG = { get: () => G, potato, LEVELS, levelOf, BADGES, DAILY_GOAL, FLAME, BADGE_ICON, award: (...a) => award(...a), openProfile: () => openProfile() };

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

  /* ---------- XP ---------- */
  function touchDay() {
    const d = today();
    if (G.lastDay !== d) {
      const gap = G.lastDay ? dayDiff(G.lastDay, d) : 99;
      G.streak = gap === 1 ? G.streak + 1 : 1;
      G.lastDay = d;
      if (G.streak > 1) setTimeout(() => toast('<span class="ti flame">' + FLAME + "</span><b>" + G.streak + "-day streak!</b> Keep it going", "streak", 3200), 600);
    }
    G.days[d] = G.days[d] || 0;
  }
  function award(xp, why, key) {
    if (key) { if (G.awarded[key]) return false; G.awarded[key] = 1; }
    touchDay();
    const before = levelOf(G.xp), dayBefore = G.days[today()] || 0;
    G.xp += xp; G.days[today()] = dayBefore + xp;
    save();
    if (xp > 0) toast('<b class="xp">+' + xp + " XP</b> " + why, "", 1600);
    const after = levelOf(G.xp);
    if (after > before) { setTimeout(() => { toast(potato("cool", 44) + "<div><b>Level up!</b><br>You're now a <b>" + LEVELS[after][1] + "</b></div>", "big", 4000); confetti(160); }, 400); }
    if (dayBefore < DAILY_GOAL && dayBefore + xp >= DAILY_GOAL) setTimeout(() => { toast(potato("wow", 44) + "<div><b>Daily goal reached!</b><br>" + DAILY_GOAL + " XP today</div>", "big", 3500); confetti(90); }, 900);
    checkBadges(); renderHud();
    return true;
  }
  function checkBadges() {
    BADGES.forEach(([id, name, desc, test]) => {
      if (!G.badges[id] && test(G)) {
        G.badges[id] = Date.now(); save();
        setTimeout(() => toast('<span class="ti badge">' + BADGE_ICON + "</span><div><b>Badge unlocked: " + name + "</b><br>" + desc + "</div>", "big", 3800), 1200);
      }
    });
  }

  /* ---------- HUD ---------- */
  let hud = null;
  function renderHud() {
    if (!hud) return;
    const lv = levelOf(G.xp), cur = LEVELS[lv][0], nxt = (LEVELS[lv + 1] || [cur + 1000])[0];
    const pct = Math.min(100, 100 * (G.xp - cur) / (nxt - cur));
    const alive = G.lastDay && dayDiff(G.lastDay, today()) <= 1;
    hud.innerHTML = '<span class="lv">Lv ' + (lv + 1) + '</span><span class="xpbar"><span style="width:' + pct + '%"></span></span><span class="streak' + (alive && G.streak ? " on" : "") + '">' + FLAME + (alive ? G.streak : 0) + "</span>";
    hud.title = LEVELS[lv][1] + " · " + G.xp + " XP · open your profile";
  }
  const bar = $(".topbar-in");
  if (bar) {
    hud = document.createElement("button"); hud.type = "button"; hud.className = "hud"; hud.setAttribute("aria-label", "Your level, XP and streak");
    const anchor = $("#recallBtn", bar) || $("#themeBtn", bar);
    bar.insertBefore(hud, anchor);
    hud.addEventListener("click", () => openProfile());
    renderHud();
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

  function profileHTML() {
    const lv = levelOf(G.xp), cur = LEVELS[lv][0], nxt = LEVELS[lv + 1];
    const pct = nxt ? Math.min(100, 100 * (G.xp - cur) / (nxt[0] - cur)) : 100;
    const td = G.days[today()] || 0;
    const alive = G.lastDay && dayDiff(G.lastDay, today()) <= 1;
    const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); return [d.toLocaleDateString(undefined, { weekday: "narrow" }), G.days[k] || 0]; });
    return '<div class="prof"><div class="prof-top">' + potato(lv >= 4 ? "cool" : "happy", 84) + '<div><div class="eyebrow">Level ' + (lv + 1) + '</div><h2 class="pname">' + LEVELS[lv][1] + '</h2><div class="xpline"><span style="width:' + pct + '%"></span></div><small>' + G.xp + " XP" + (nxt ? " · " + (nxt[0] - G.xp) + " to " + nxt[1] : " · max level!") + "</small></div></div>" +
      '<div class="pstats"><div><b class="flamebig' + (alive && G.streak ? " on" : "") + '">' + FLAME + (alive ? G.streak : 0) + "</b><small>day streak</small></div><div><b>" + td + "/" + DAILY_GOAL + "</b><small>XP today</small></div><div><b>" + G.c.correct + "</b><small>right answers</small></div><div><b>" + G.c.speedBest + "</b><small>best Speed Round</small></div></div>" +
      '<div class="week">' + week.map(([d, v]) => '<div><span class="col"><span style="height:' + Math.min(100, v / DAILY_GOAL * 100) + '%" class="' + (v >= DAILY_GOAL ? "hit" : "") + '"></span></span><small>' + d + "</small></div>").join("") + "</div>" +
      '<h3>Badges <small>' + Object.keys(G.badges).length + " / " + BADGES.length + '</small></h3><div class="badges">' +
      BADGES.map(([id, name, desc]) => '<div class="bdg' + (G.badges[id] ? " got" : "") + '" title="' + desc + '"><span class="bi">' + BADGE_ICON + "</span><b>" + name + "</b><small>" + desc + "</small></div>").join("") + "</div>" +
      '<h3>How to earn XP</h3><ul class="earn"><li><b>+10</b> right answer · <b>+2</b> for trying</li><li><b>+5</b> quick check right</li><li><b>+25</b> topic marked revised</li><li><b>+5</b> worked example stepped through</li><li><b>+5</b> new calculator tried</li><li><b>+5</b> per Speed Round point</li></ul></div>';
  }
  function openProfile() { const m = modal("profile"); m.body.innerHTML = profileHTML(); }

  /* ---------- daily visit ---------- */
  setTimeout(() => {
    const d = today();
    if (!G.awarded["visit:" + d]) award(5, "for showing up today", "visit:" + d);
  }, 900);

  if (!mod) { window.SPG.ready = true; document.dispatchEvent(new Event("spg:ready")); return; }

  /* ---------- page events ---------- */
  document.addEventListener("sp:mcq", e => {
    const { correct, quick, el } = e.detail;
    if (correct) G.c.correct++; else G.c.wrong++;
    save();
    const id = el.id || el.dataset.qid;
    if (correct) award(quick ? 5 : 10, quick ? "quick check" : "right answer", "mcq:" + mod + ":" + id);
    else award(2, "for trying, check the explanation", "mcq:" + mod + ":" + id);
    if (!reduce) { el.classList.remove("pop", "shake"); void el.offsetWidth; el.classList.add(correct ? "pop" : "shake"); }
    if (quick && correct) {
      const box = el.closest(".quick"), all = $$(".mcq", box);
      const st = S.get("sp:" + mod + ":mcq", {});
      if (all.every(q => st[q.dataset.qid] === Number(q.dataset.answer))) {
        const sec = el.closest("section"); confetti(70);
        toast(potato("wow", 40) + "<div><b>Quick check aced!</b><br>Tap “Mark revised” on this topic for +25 XP</div>", "big", 3500);
        $(".donebtn", sec)?.classList.add("nudge");
      }
    }
  });
  document.addEventListener("sp:self", e => award(8, "you got it", "self:" + mod + ":" + e.detail.id));
  document.addEventListener("sp:step", () => { G.c.steps++; save(); award(5, "worked example done"); });
  document.addEventListener("sp:done", e => {
    const { id, on, title, count, total } = e.detail;
    $(".donebtn.nudge")?.classList.remove("nudge");
    if (!on) return;
    award(25, "“" + title + "” revised", "done:" + mod + ":" + id);
    G.c.topics = Object.keys(G.awarded).filter(k => k.startsWith("done:")).length; save(); checkBadges();
    if (count === total) {
      if (!G.awarded["module:" + mod]) { G.c.modules++; save(); }
      award(100, "whole module revised!", "module:" + mod);
      setTimeout(() => { toast(potato("cool", 48) + "<div><b>Module complete!</b><br>Every topic revised. Now beat your Speed Round score.</div>", "big", 4500); confetti(220); }, 300);
    } else confetti(40);
  });
  // calculators: first interaction with each one
  document.addEventListener("input", e => {
    const w = e.target.closest("[data-widget]"); if (!w || w.dataset.widget === "flashcards") return;
    const key = mod + ":" + w.dataset.widget;
    if (!G.c.widgets.includes(key)) { G.c.widgets.push(key); save(); award(5, "new calculator tried", "w:" + key); }
  });
  document.addEventListener("click", e => {
    const w = e.target.closest("[data-widget]");
    if (w && e.target.closest("button") && w.dataset.widget !== "flashcards") {
      const key = mod + ":" + w.dataset.widget;
      if (!G.c.widgets.includes(key)) { G.c.widgets.push(key); save(); award(5, "new calculator tried", "w:" + key); }
    }
    if (e.target.closest(".card") && e.target.closest(".flash")) {
      G.c.flips++; const d = today(); G.awarded["flipday:" + d] = (G.awarded["flipday:" + d] || 0) + 1; save();
      if (G.awarded["flipday:" + d] <= 40 && G.c.flips % 5 === 0) award(5, "5 flashcards flipped");
      else checkBadges();
    }
  });

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
      G.c.speedBest = Math.max(G.c.speedBest, score); G.c.bestCombo = Math.max(G.c.bestCombo, maxCombo); G.c.correct += right; G.c.wrong += wrong; save();
      const acc = right + wrong ? Math.round(100 * right / (right + wrong)) : 0;
      m.body.innerHTML = '<div class="sr-end">' + potato(score >= 15 ? "cool" : score >= 6 ? "happy" : "think", 96) + "<h2>" + (isBest ? "New best!" : score >= 10 ? "Nice round!" : "Round over") + '</h2><div class="sr-big">' + score + '</div><div class="pstats"><div><b>' + right + "</b><small>right</small></div><div><b>" + acc + "%</b><small>accuracy</small></div><div><b>" + maxCombo + "×</b><small>best combo</small></div><div><b>" + Math.max(prev, score) + "</b><small>best score</small></div></div>" +
        (missed.length ? '<h3>Review what you missed</h3><div class="sr-miss">' + missed.slice(0, 8).map(q => "<div><b>" + strip(q.text) + "</b><p>Answer: " + q.opts[q.ans] + "</p><small>" + q.exp.replace(/<b[^>]*>(Correct\.|Not quite\.)<\/b>\s*/, "") + "</small></div>").join("") + "</div>" : "") +
        '<div class="sr-actions"><button class="btn big" type="button" id="sragain">Play again</button><button class="btn ghost" type="button" id="srclose">Back to notes</button></div></div>';
      $("#sragain", m.body).addEventListener("click", play); $("#srclose", m.body).addEventListener("click", m.close);
      if (score > 0) award(score * 5, "Speed Round: " + score + " points");
      if (isBest && score >= 3) confetti(140);
    };
    m.ov.addEventListener("closed", () => { clearInterval(timer); document.removeEventListener("keydown", keyH); if (location.hash === "#play") history.replaceState(null, "", location.pathname); });
    intro();
  }
  window.SPG.speedRound = speedRound;

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
