/* Shared helpers for module widgets. A module's widgets.js registers builders with
   SPW.add("name", el => {...}) and calls SPW.run() at the end; each
   <div data-widget="name"> on the page is then filled in. */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fmt = (x, d = 4) => {
    if (typeof x !== "number" || isNaN(x)) return "–";
    if (!isFinite(x)) return x > 0 ? "∞" : "−∞";
    if (x !== 0 && Math.abs(x) < 1e-3) return x.toExponential(2).replace("-", "−").replace("e", " × 10^");
    return (+x.toFixed(d)).toString().replace("-", "−");
  };
  const nums = s => s.split(/[\s,;]+/).filter(Boolean).map(Number);
  const sig = z => 1 / (1 + Math.exp(-z));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>';
  function shell(el, title) {
    el.classList.add("widget");
    el.innerHTML = '<div class="wh">' + ICON + "<span>Try it · " + title + '</span></div><div class="wb"></div>';
    return $(".wb", el);
  }
  function live(root, fn) { $$("input,select,textarea", root).forEach(i => i.addEventListener("input", fn)); fn(); }

  function flashcards(el, CARDS) {
    el.classList.add("flash");
    el.innerHTML = '<div class="wrow" style="justify-content:center"><label>Topic<select data-f="t"><option value="">All topics</option>' + [...new Set(CARDS.map(c => c[0]))].map(t => '<option value="' + t + '">Topic ' + t + "</option>").join("") + '</select></label><button class="btn ghost" data-f="s" type="button">Shuffle</button></div><button class="card" type="button" aria-label="Flashcard, press to flip"><div class="in"><div class="face"><span class="tag" data-f="tag"></span><div class="front-t" data-f="front"></div><p class="sub" style="margin-top:12px">Tap to flip</p></div><div class="face back"><span class="tag">Answer</span><div class="back-t" data-f="back"></div></div></div></button><div class="flashnav"><button class="btn ghost" data-f="p" type="button">← Prev</button><span class="n" data-f="n"></span><button class="btn" data-f="x" type="button">Next →</button></div><p class="sub" style="text-align:center">Keyboard: ← → to move, space to flip</p>';
    const q = k => $('[data-f="' + k + '"]', el);
    let deck = CARDS.slice(), i = 0;
    const card = $(".card", el);
    const show = () => { const c = deck[i]; card.classList.remove("flipped"); q("tag").textContent = "Topic " + c[0]; q("front").textContent = c[1]; q("back").textContent = c[2]; q("n").textContent = (i + 1) + " / " + deck.length; };
    card.addEventListener("click", () => card.classList.toggle("flipped"));
    q("x").addEventListener("click", () => { i = (i + 1) % deck.length; show(); });
    q("p").addEventListener("click", () => { i = (i - 1 + deck.length) % deck.length; show(); });
    q("s").addEventListener("click", () => { for (let k = deck.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [deck[k], deck[j]] = [deck[j], deck[k]]; } i = 0; show(); });
    q("t").addEventListener("input", () => { const t = q("t").value; deck = CARDS.filter(c => !t || c[0] === t); i = 0; show(); });
    addEventListener("keydown", e => {
      const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
      const tag = document.activeElement.tagName; if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") q("x").click(); else if (e.key === "ArrowLeft") q("p").click();
      else if (e.key === " " && document.activeElement !== card) { e.preventDefault(); card.click(); }
    });
    show();
  }

  const reg = {};
  window.SPW = {
    $, $$, fmt, nums, sig, esc, shell, live, flashcards,
    add(name, fn) { reg[name] = fn; },
    run() { $$("[data-widget]").forEach(el => { const f = reg[el.dataset.widget]; if (f) try { f(el); } catch (e) { console.error(el.dataset.widget, e); } }); }
  };
})();
