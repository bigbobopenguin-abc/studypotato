/* Interactive widgets for Applied Deep Learning.
   Each <div class="widget" data-widget="NAME"> in the page is filled in by the matching builder below. */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const fmt = (x, d = 4) => {
    if (!isFinite(x)) return x > 0 ? "∞" : x < 0 ? "−∞" : "NaN";
    const s = (+x.toFixed(d)).toString();
    return s.replace("-", "−");
  };
  const nums = s => s.split(/[\s,;]+/).filter(Boolean).map(Number);
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>';
  function shell(el, title) {
    el.innerHTML = '<div class="wh">' + ICON + "<span>Try it · " + title + '</span></div><div class="wb"></div>';
    return $(".wb", el);
  }
  const sig = x => 1 / (1 + Math.exp(-x));

  /* ---------- plotting helper ---------- */
  function setupCanvas(cv) {
    const r = cv.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(280, r.width), h = w * 10 / 16;
    cv.width = w * dpr; cv.height = h * dpr;
    const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { g, w, h };
  }
  function axes(g, w, h, xr, yr, pad) {
    const X = x => pad + (x - xr[0]) / (xr[1] - xr[0]) * (w - 2 * pad);
    const Y = y => h - pad - (y - yr[0]) / (yr[1] - yr[0]) * (h - 2 * pad);
    g.clearRect(0, 0, w, h);
    g.strokeStyle = css("--line"); g.lineWidth = 1; g.font = "12px " + css("--f-mono"); g.fillStyle = css("--muted");
    const step = (a, b) => { const r = b - a; return r > 20 ? 5 : r > 6 ? 1 : 0.5; };
    const sx = step(...xr), sy = step(...yr);
    for (let x = Math.ceil(xr[0] / sx) * sx; x <= xr[1] + 1e-9; x += sx) { g.beginPath(); g.moveTo(X(x), pad); g.lineTo(X(x), h - pad); g.stroke(); }
    for (let y = Math.ceil(yr[0] / sy) * sy; y <= yr[1] + 1e-9; y += sy) { g.beginPath(); g.moveTo(pad, Y(y)); g.lineTo(w - pad, Y(y)); g.stroke(); g.fillText(fmt(y, 1), 4, Y(y) + 4); }
    g.strokeStyle = css("--muted"); g.lineWidth = 1.4;
    if (yr[0] < 0 && yr[1] > 0) { g.beginPath(); g.moveTo(pad, Y(0)); g.lineTo(w - pad, Y(0)); g.stroke(); }
    if (xr[0] < 0 && xr[1] > 0) { g.beginPath(); g.moveTo(X(0), pad); g.lineTo(X(0), h - pad); g.stroke(); }
    for (let x = Math.ceil(xr[0] / sx) * sx; x <= xr[1] + 1e-9; x += sx) g.fillText(fmt(x, 1), X(x) - 6, h - pad + 15);
    return { X, Y };
  }
  function curve(g, f, xr, X, Y, color, yr) {
    g.strokeStyle = color; g.lineWidth = 2.4; g.beginPath(); let pen = false;
    for (let i = 0; i <= 400; i++) {
      const x = xr[0] + (xr[1] - xr[0]) * i / 400; let y = f(x);
      if (!isFinite(y)) { pen = false; continue; }
      y = Math.max(yr[0] - 1, Math.min(yr[1] + 1, y));
      pen ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)); pen = true;
    }
    g.stroke();
  }

  const W = {};

  /* ---------- single neuron ---------- */
  W.neuron = el => {
    const b = shell(el, "one neuron");
    b.innerHTML = '<div class="wrow"><label>Inputs x<input type="text" class="wide" id="nx" value="2, -1, 3"></label><label>Weights w<input type="text" class="wide" id="nw" value="0.5, 0.4, 0.2"></label><label>Bias b<input type="number" step="0.1" id="nb" value="0.1"></label><label>Activation<select id="nf"><option>sigmoid</option><option>relu</option><option>tanh</option><option>linear</option><option>step</option></select></label></div><div class="out" id="no"></div>';
    const run = () => {
      const x = nums($("#nx", b).value), w = nums($("#nw", b).value), bias = +$("#nb", b).value, f = $("#nf", b).value;
      if (x.length !== w.length) { $("#no", b).textContent = "x and w need the same number of values (" + x.length + " vs " + w.length + ")."; return; }
      const terms = x.map((xi, i) => fmt(xi, 3) + "×" + fmt(w[i], 3));
      const z = x.reduce((s, xi, i) => s + xi * w[i], 0) + bias;
      const F = { sigmoid: sig, relu: v => Math.max(0, v), tanh: Math.tanh, linear: v => v, step: v => v > 0 ? 1 : 0 }[f];
      $("#no", b).textContent = "z = " + terms.join(" + ") + " + " + fmt(bias, 3) + "\n  = " + fmt(z) + "\ny = " + f + "(" + fmt(z) + ") = " + fmt(F(z));
    };
    $$("input,select", b).forEach(i => i.addEventListener("input", run)); run();
  };

  /* ---------- activation explorer ---------- */
  W.activation = el => {
    const b = shell(el, "activation functions and their derivatives");
    b.innerHTML = '<div class="wrow"><label>Function<select id="af"><option value="sigmoid">Sigmoid</option><option value="tanh">Tanh</option><option value="relu" selected>ReLU</option><option value="leaky">Leaky ReLU (α = 0.1)</option><option value="softplus">SoftPlus</option><option value="linear">Linear</option><option value="step">Binary step</option></select></label><label>x = <b id="axv">1.0</b><input type="range" id="ax" min="-5" max="5" step="0.1" value="1"></label></div><canvas class="plot" id="ac"></canvas><p class="sub" style="margin-top:8px"><span style="color:var(--accent)">━ f(x)</span> &nbsp; <span style="color:var(--plot-2)">┅ f′(x)</span></p><div class="out" id="ao"></div>';
    const F = {
      sigmoid: [sig, x => sig(x) * (1 - sig(x)), "Saturates at both ends → vanishing gradient. Max f′ = 0.25 at x = 0.", "f′ = f(x)(1 − f(x))"],
      tanh: [Math.tanh, x => 1 - Math.tanh(x) ** 2, "Zero-centred, range (−1, 1). Still saturates → vanishing gradient.", "f′ = 1 − f(x)²"],
      relu: [x => Math.max(0, x), x => x > 0 ? 1 : 0, "f′ = 0 for x < 0 → a neuron stuck there 'dies' (dying ReLU).", "f′ = 0 (x<0), 1 (x>0)"],
      leaky: [x => x < 0 ? 0.1 * x : x, x => x < 0 ? 0.1 : 1, "Small slope for x < 0 keeps the gradient alive.", "f′ = α (x<0), 1 (x≥0)"],
      softplus: [x => Math.log(1 + Math.exp(x)), sig, "Smooth ReLU. Its derivative is the sigmoid.", "f′ = 1/(1+e^−x)"],
      linear: [x => x, () => 1, "Used at the output for regression.", "f′ = 1"],
      step: [x => x > 0 ? 1 : 0, () => 0, "Gradient is 0 everywhere → cannot learn by gradient descent.", "f′ = 0"]
    };
    const cv = $("#ac", b);
    const draw = () => {
      const k = $("#af", b).value, x0 = +$("#ax", b).value; $("#axv", b).textContent = x0.toFixed(1);
      const [f, d, note, dtxt] = F[k];
      const { g, w, h } = setupCanvas(cv);
      const yr = k === "linear" || k === "leaky" || k === "relu" || k === "softplus" ? [-2, 5] : [-1.2, 1.2];
      const xr = [-5, 5];
      const { X, Y } = axes(g, w, h, xr, yr, 28);
      curve(g, f, xr, X, Y, css("--accent"), yr);
      g.setLineDash([6, 4]); curve(g, d, xr, X, Y, css("--plot-2"), yr); g.setLineDash([]);
      const y0 = f(x0);
      if (y0 >= yr[0] && y0 <= yr[1]) { g.fillStyle = css("--accent"); g.beginPath(); g.arc(X(x0), Y(y0), 5, 0, 7); g.fill(); }
      $("#ao", b).textContent = "f(" + fmt(x0, 2) + ")  = " + fmt(y0) + "\nf′(" + fmt(x0, 2) + ") = " + fmt(d(x0)) + "     (" + dtxt + ")\n" + note;
    };
    $$("input,select", b).forEach(i => i.addEventListener("input", draw));
    addEventListener("resize", draw); document.addEventListener("sp:theme", draw);
    requestAnimationFrame(draw);
  };

  /* ---------- softmax ---------- */
  W.softmax = el => {
    const b = shell(el, "softmax calculator");
    b.innerHTML = '<div class="wrow"><label>Output values (logits)<input type="text" class="wide" id="sx" value="2.33, -1.46, 0.56"></label></div><div class="out" id="so"></div><div class="bars" id="sb"></div>';
    const run = () => {
      const y = nums($("#sx", b).value); if (!y.length) return;
      const e = y.map(Math.exp), s = e.reduce((a, c) => a + c, 0), p = e.map(v => v / s);
      $("#so", b).textContent = y.map((v, i) => "e^" + fmt(v, 3) + " = " + fmt(e[i], 3)).join("\n") + "\nsum = " + fmt(s, 3) + "\nP = [" + p.map(v => fmt(v, 3)).join(", ") + "]   (sum = " + fmt(p.reduce((a, c) => a + c, 0), 3) + ")";
      const mx = p.indexOf(Math.max(...p));
      $("#sb", b).innerHTML = p.map((v, i) => '<div class="b"><span>class ' + (i + 1) + '</span><div class="track"><div class="fill" style="width:' + (v * 100) + "%;" + (i === mx ? "" : "opacity:.45") + '"></div></div><span>' + (v * 100).toFixed(1) + "%</span></div>").join("");
    };
    $("#sx", b).addEventListener("input", run); run();
  };

  /* ---------- cross entropy ---------- */
  W.bce = el => {
    const b = shell(el, "binary cross-entropy calculator");
    b.innerHTML = '<div class="wrow"><label>Labels y (0 or 1)<input type="text" class="wide" id="by" value="1, 0, 1, 0"></label><label>Predicted ŷ<input type="text" class="wide" id="bp" value="0.9, 0.55, 0.51, 0.9"></label><label>Log base<select id="bl"><option value="10">log₁₀ (lecturer)</option><option value="e">ln (Keras)</option></select></label></div><div class="out" id="bo"></div><p style="margin:10px 0 0">Loss = <span class="big" id="bv"></span></p>';
    const run = () => {
      const y = nums($("#by", b).value), p = nums($("#bp", b).value), L = $("#bl", b).value === "10" ? Math.log10 : Math.log, nm = $("#bl", b).value === "10" ? "log" : "ln";
      if (y.length !== p.length) { $("#bo", b).textContent = "Give the same number of labels and predictions."; $("#bv", b).textContent = "–"; return; }
      let sum = 0;
      const rows = y.map((yi, i) => {
        const t = yi === 1 ? L(p[i]) : L(1 - p[i]); sum += t;
        const verdict = (yi === 1) === (p[i] >= 0.5) ? (Math.abs(p[i] - 0.5) > 0.3 ? "correct + sure" : "correct, unsure") : (Math.abs(p[i] - 0.5) > 0.3 ? "WRONG + sure → heavy penalty" : "wrong");
        return "S" + (i + 1) + "  y=" + yi + "  ŷ=" + fmt(p[i], 3) + "  →  " + (yi === 1 ? nm + "(" + fmt(p[i], 3) + ")" : nm + "(1−" + fmt(p[i], 3) + ")") + " = " + fmt(t, 3) + "   " + verdict;
      });
      $("#bo", b).textContent = rows.join("\n") + "\nLoss = −(1/" + y.length + ")(" + fmt(sum, 3) + ")";
      $("#bv", b).textContent = fmt(-sum / y.length, 3);
    };
    $$("input,select", b).forEach(i => i.addEventListener("input", run)); run();
  };

  /* ---------- backprop single step ---------- */
  W.backprop = el => {
    const b = shell(el, "one backpropagation step (output weight w₁₂)");
    const f = (id, lab, v, st) => '<label>' + lab + '<input type="number" step="' + (st || 0.1) + '" id="' + id + '" value="' + v + '"></label>';
    b.innerHTML = '<div class="wrow">' + f("a1", "a₁", 0.6) + f("a2", "a₂", 0.4) + f("w12", "w₁₂", 0.5) + f("w22", "w₂₂", -0.3) + f("yy", "target y", 1, 1) + f("eta", "η", 0.1, 0.05) + '</div><div class="out" id="bpo"></div><div class="wrow" style="margin-top:10px"><button class="btn" id="bpstep" type="button">Apply update and repeat</button><span class="sub" id="bpn"></span></div>';
    let n = 0;
    const run = () => {
      const v = id => +$("#" + id, b).value;
      const a1 = v("a1"), a2 = v("a2"), w12 = v("w12"), w22 = v("w22"), y = v("yy"), eta = v("eta");
      const h = w12 * a1 + w22 * a2, a = sig(h), dEa = a - y, dah = a * (1 - a), g = dEa * dah * a1, nw = w12 - eta * g;
      $("#bpo", b).textContent =
        "Forward   h₂ = " + fmt(w12, 4) + "×" + fmt(a1, 3) + " + " + fmt(w22, 3) + "×" + fmt(a2, 3) + " = " + fmt(h) + "\n" +
        "          a  = σ(" + fmt(h) + ") = " + fmt(a) + "      E = ½(a − y)² = " + fmt(0.5 * (a - y) ** 2, 5) + "\n" +
        "Backward  ∂E/∂a    = a − y   = " + fmt(dEa) + "\n" +
        "          ∂a/∂h₂   = a(1 − a) = " + fmt(dah) + "\n" +
        "          ∂h₂/∂w₁₂ = a₁      = " + fmt(a1) + "\n" +
        "          ∂E/∂w₁₂  = " + fmt(dEa) + " × " + fmt(dah) + " × " + fmt(a1) + " = " + fmt(g, 5) + "\n" +
        "Update    w₁₂ = " + fmt(w12) + " − " + fmt(eta) + " × (" + fmt(g, 5) + ") = " + fmt(nw, 5);
      return nw;
    };
    $$("input", b).forEach(i => i.addEventListener("input", () => { n = 0; $("#bpn", b).textContent = ""; run(); }));
    $("#bpstep", b).addEventListener("click", () => { const nw = run(); $("#w12", b).value = +nw.toFixed(5); n++; run(); $("#bpn", b).textContent = n + " update" + (n > 1 ? "s" : "") + " applied. Watch E shrink."; });
    run();
  };

  /* ---------- gradient descent on x^2 ---------- */
  W.gd = el => {
    const b = shell(el, "gradient descent on f(x) = x²");
    b.innerHTML = '<div class="wrow"><label>Start x₀<input type="number" id="gx" value="3" step="0.5"></label><label>Learning rate η = <b id="gev">0.10</b><input type="range" id="ge" min="0.01" max="1.1" step="0.01" value="0.1"></label><button class="btn" id="gs" type="button">Step</button><button class="btn ghost" id="gr" type="button">Run 10</button><button class="btn ghost" id="g0" type="button">Reset</button></div><canvas class="plot" id="gc"></canvas><div class="out" id="go" style="margin-top:10px"></div>';
    let path = [];
    const reset = () => { path = [+$("#gx", b).value]; draw(); };
    const step = () => { const x = path[path.length - 1], eta = +$("#ge", b).value; path.push(x - eta * 2 * x); draw(); };
    const draw = () => {
      const eta = +$("#ge", b).value; $("#gev", b).textContent = eta.toFixed(2);
      const { g, w, h } = setupCanvas($("#gc", b));
      const xr = [-5, 5], yr = [0, 25];
      const { X, Y } = axes(g, w, h, xr, yr, 28);
      curve(g, x => x * x, xr, X, Y, css("--accent"), yr);
      g.strokeStyle = css("--plot-2"); g.fillStyle = css("--plot-2"); g.lineWidth = 1.6;
      path.forEach((x, i) => {
        const cx = Math.max(-5, Math.min(5, x)), cy = Math.min(25, x * x);
        if (i) { const px = Math.max(-5, Math.min(5, path[i - 1])); g.beginPath(); g.moveTo(X(px), Y(Math.min(25, path[i - 1] ** 2))); g.lineTo(X(cx), Y(cy)); g.stroke(); }
        g.beginPath(); g.arc(X(cx), Y(cy), i === path.length - 1 ? 6 : 3.5, 0, 7); g.fill();
      });
      const last = path.slice(-6);
      let msg = last.map((x, i) => { const k = path.length - last.length + i; return "x" + k + " = " + fmt(x) + "   f′ = 2x = " + fmt(2 * x); }).join("\n");
      const x = path[path.length - 1];
      msg += "\n" + (eta >= 1 ? "η ≥ 1: every step overshoots by at least as much → it never settles (diverges or bounces)." : eta > 0.5 ? "η > 0.5: steps overshoot the minimum and zig-zag across it." : Math.abs(x) < 0.01 ? "Converged near the minimum x = 0." : "Moving against the gradient toward x = 0.");
      $("#go", b).textContent = msg;
    };
    $("#gs", b).addEventListener("click", step);
    $("#gr", b).addEventListener("click", () => { for (let i = 0; i < 10; i++) step(); });
    $("#g0", b).addEventListener("click", reset);
    $("#gx", b).addEventListener("input", reset);
    $("#ge", b).addEventListener("input", reset);
    addEventListener("resize", draw); document.addEventListener("sp:theme", draw);
    requestAnimationFrame(reset);
  };

  /* ---------- learning rate decay ---------- */
  W.lrdecay = el => {
    const b = shell(el, "learning-rate decay table");
    b.innerHTML = '<div class="wrow"><label>r₀<input type="number" id="r0" value="0.4" step="0.05"></label><label>r_T<input type="number" id="rt" value="0.1" step="0.05"></label><label>T<input type="number" id="tt" value="5" min="1" step="1"></label></div><div class="out" id="ro"></div>';
    const run = () => {
      const r0 = +$("#r0", b).value, rT = +$("#rt", b).value, T = Math.max(1, Math.round(+$("#tt", b).value));
      const lines = [];
      for (let k = 0; k <= T + 1; k++) {
        const kk = Math.min(k, T), r = (1 - kk / T) * r0 + (kk / T) * rT;
        lines.push("r" + k + " = (1 − " + kk + "/" + T + ")(" + r0 + ") + (" + kk + "/" + T + ")(" + rT + ") = " + fmt(r, 4) + (k > T ? "   (held at r_T)" : ""));
      }
      $("#ro", b).textContent = lines.join("\n");
    };
    $$("input", b).forEach(i => i.addEventListener("input", run)); run();
  };

  /* ---------- convolution playground ---------- */
  W.conv = el => {
    const b = shell(el, "convolution and pooling playground");
    const IMG = [[1, 2, 3, 1, 4, 8], [3, 2, 1, 3, 9, 5], [7, 6, 5, 3, 4, 1], [2, 2, 3, 6, 2, 4], [4, 7, 4, 2, 5, 6], [5, 1, 5, 1, 8, 4]];
    const PRE = {
      "Sobel (slide)": [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
      "Vertical edge": [[1, 0, -1], [2, 0, -2], [1, 0, -1]],
      "Horizontal edge": [[1, 2, 1], [0, 0, 0], [-1, -2, -1]],
      "Sharpen": [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
      "Box blur (sum)": [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
      "Identity": [[0, 0, 0], [0, 1, 0], [0, 0, 0]]
    };
    b.innerHTML = '<div class="wrow"><label>Filter preset<select id="cp">' + Object.keys(PRE).map(k => "<option>" + k + "</option>").join("") + '</select></label><label>Stride<select id="cs"><option>1</option><option>2</option></select></label><label>Padding<select id="cpad"><option value="valid">valid (none)</option><option value="same">same (zeros)</option></select></label><label>Activation<select id="ca"><option value="none">none</option><option value="relu">ReLU</option></select></label><label>Then pool 2×2<select id="cpool"><option value="none">no pooling</option><option value="max">max</option><option value="avg">average</option></select></label></div>' +
      '<div class="convwrap"><div><span class="cap">Input (edit me)</span><div class="gridin" id="ci"></div></div><div><span class="cap">Filter 3×3 (edit me)</span><div class="gridin" id="cf"></div></div><div><span class="cap">Feature map <span id="csz"></span></span><div class="gridout" id="co"></div></div><div id="cpw" hidden><span class="cap">Pooled <span id="cpsz"></span></span><div class="gridout" id="cpo"></div></div></div>' +
      '<p class="sub" style="margin:10px 0 6px">Tap a feature-map cell to see its multiply-and-sum.</p><div class="out" id="cx"></div>';
    const ci = $("#ci", b), cf = $("#cf", b);
    ci.style.gridTemplateColumns = "repeat(6,auto)"; cf.style.gridTemplateColumns = "repeat(3,auto)";
    IMG.flat().forEach(v => ci.insertAdjacentHTML("beforeend", '<input type="number" value="' + v + '" aria-label="input pixel">'));
    for (let i = 0; i < 9; i++) cf.insertAdjacentHTML("beforeend", '<input type="number" aria-label="filter weight">');
    const setFilter = k => $$("input", cf).forEach((inp, i) => inp.value = PRE[k][Math.floor(i / 3)][i % 3]);
    setFilter("Sobel (slide)");
    let sel = [0, 0], out = [], P = 0, S = 1;
    const read = (box, n) => { const a = $$("input", box).map(i => +i.value || 0); return Array.from({ length: n }, (_, r) => a.slice(r * n, r * n + n)); };
    const run = () => {
      const I = read(ci, 6), K = read(cf, 3);
      S = +$("#cs", b).value; P = $("#cpad", b).value === "same" ? 1 : 0;
      const N = 6 + 2 * P, n = Math.floor((N - 3) / S) + 1;
      const px = (r, c) => (r - P < 0 || c - P < 0 || r - P > 5 || c - P > 5) ? 0 : I[r - P][c - P];
      const relu = $("#ca", b).value === "relu";
      out = [];
      for (let r = 0; r < n; r++) { out.push([]); for (let c = 0; c < n; c++) { let s = 0; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) s += px(r * S + i, c * S + j) * K[i][j]; out[r].push(relu ? Math.max(0, s) : s); } }
      $("#csz", b).textContent = "(" + n + "×" + n + ")";
      const co = $("#co", b); co.style.gridTemplateColumns = "repeat(" + n + ",auto)";
      if (sel[0] >= n || sel[1] >= n) sel = [0, 0];
      co.innerHTML = out.flat().map((v, i) => '<span tabindex="0" data-i="' + i + '" class="' + (Math.floor(i / n) === sel[0] && i % n === sel[1] ? "sel" : "") + '">' + fmt(v, 2) + "</span>").join("");
      // pooling
      const pool = $("#cpool", b).value, pw = $("#cpw", b);
      pw.hidden = pool === "none";
      if (pool !== "none") {
        const m = Math.floor(n / 2), po = $("#cpo", b); po.style.gridTemplateColumns = "repeat(" + Math.max(1, m) + ",auto)";
        const cells = [];
        for (let r = 0; r < m; r++) for (let c = 0; c < m; c++) { const v = [out[2 * r][2 * c], out[2 * r][2 * c + 1], out[2 * r + 1][2 * c], out[2 * r + 1][2 * c + 1]]; cells.push(pool === "max" ? Math.max(...v) : v.reduce((a, x) => a + x, 0) / 4); }
        po.innerHTML = cells.map(v => "<span>" + fmt(v, 2) + "</span>").join("") || "<span>–</span>";
        $("#cpsz", b).textContent = "(" + m + "×" + m + ")";
      }
      explain(I, K, n, px, relu);
    };
    const explain = (I, K, n, px, relu) => {
      const [r, c] = sel;
      $$("input", ci).forEach((inp, i) => { const rr = Math.floor(i / 6) + P, cc = i % 6 + P; inp.classList.toggle("win", rr >= r * S && rr < r * S + 3 && cc >= c * S && cc < c * S + 3); });
      const rows = []; let tot = 0;
      for (let i = 0; i < 3; i++) { let sub = 0; const t = []; for (let j = 0; j < 3; j++) { const v = px(r * S + i, c * S + j); t.push(fmt(v) + "×" + fmt(K[i][j])); sub += v * K[i][j]; } tot += sub; rows.push("row " + (i + 1) + ": " + t.join(" + ") + " = " + fmt(sub)); }
      const sz = "Output size = ⌊(6 − 3 + 2×" + P + ")/" + S + "⌋ + 1 = " + n;
      $("#cx", b).textContent = "Cell (" + r + "," + c + ")\n" + rows.join("\n") + "\nsum = " + fmt(tot) + (relu ? "   → ReLU → " + fmt(Math.max(0, tot)) : "") + (P ? "\n(zeros outside the image are padding)" : "") + "\n" + sz;
    };
    $("#co", b).addEventListener("click", e => { const s = e.target.closest("span[data-i]"); if (!s) return; const n = out.length; const i = +s.dataset.i; sel = [Math.floor(i / n), i % n]; run(); });
    $("#co", b).addEventListener("keydown", e => { if (e.key === "Enter") e.target.click(); });
    $("#cp", b).addEventListener("input", e => { setFilter(e.target.value); run(); });
    $$("select,input", b).forEach(i => { if (i.id !== "cp") i.addEventListener("input", run); });
    run();
  };

  /* ---------- CNN shape & parameter builder ---------- */
  W.shapes = el => {
    const b = shell(el, "model.summary() builder: shapes and parameters");
    const PRESETS = {
      "Slide CNN (28×28×1)": { in: [28, 28, 1], L: [["conv", 16, 3, 1, "same"], ["pool", 2], ["conv", 32, 3, 1, "same"], ["pool", 2], ["flatten"], ["dense", 64], ["dense", 10]] },
      "Cats vs dogs (150×150×3)": { in: [150, 150, 3], L: [["conv", 32, 3, 1, "valid"], ["pool", 2], ["conv", 64, 3, 1, "valid"], ["pool", 2], ["conv", 128, 3, 1, "valid"], ["pool", 2], ["conv", 128, 3, 1, "valid"], ["pool", 2], ["flatten"], ["dense", 512], ["dense", 1]] },
      "MNIST ANN (784)": { in: [784], L: [["dense", 20], ["dense", 10]] },
      "With GAP (32×32×3)": { in: [32, 32, 3], L: [["conv", 32, 3, 1, "same"], ["pool", 2], ["conv", 10, 3, 1, "same"], ["gap"]] }
    };
    b.innerHTML = '<div class="wrow"><label>Preset<select id="sp">' + Object.keys(PRESETS).map(k => "<option>" + k + "</option>").join("") + '</select></label><label>Input shape (H, W, C or N)<input type="text" id="sin" value=""></label></div><div class="layers" id="sl"></div><div class="wrow"><button class="btn ghost" type="button" data-add="conv">+ Conv2D</button><button class="btn ghost" type="button" data-add="pool">+ MaxPool</button><button class="btn ghost" type="button" data-add="flatten">+ Flatten</button><button class="btn ghost" type="button" data-add="gap">+ GlobalAvgPool</button><button class="btn ghost" type="button" data-add="dense">+ Dense</button></div><div class="tbl"><table><thead><tr><th>Layer</th><th>Output shape</th><th>Params</th><th>Working</th></tr></thead><tbody id="st"></tbody></table></div>';
    let L = [];
    const sl = $("#sl", b);
    const renderLayers = () => {
      sl.innerHTML = L.map((l, i) => {
        const x = '<button class="x" type="button" data-del="' + i + '" aria-label="Remove layer">×</button>';
        if (l[0] === "conv") return '<div class="layer"><span class="tag">Conv2D</span><label>filters <input type="number" min="1" data-i="' + i + '" data-k="1" value="' + l[1] + '"></label><label>size <input type="number" min="1" data-i="' + i + '" data-k="2" value="' + l[2] + '"></label><label>stride <input type="number" min="1" data-i="' + i + '" data-k="3" value="' + l[3] + '"></label><select data-i="' + i + '" data-k="4"><option' + (l[4] === "valid" ? " selected" : "") + '>valid</option><option' + (l[4] === "same" ? " selected" : "") + ">same</option></select>" + x + "</div>";
        if (l[0] === "pool") return '<div class="layer"><span class="tag">MaxPooling2D</span><label>pool <input type="number" min="1" data-i="' + i + '" data-k="1" value="' + l[1] + '"></label>' + x + "</div>";
        if (l[0] === "dense") return '<div class="layer"><span class="tag">Dense</span><label>units <input type="number" min="1" data-i="' + i + '" data-k="1" value="' + l[1] + '"></label>' + x + "</div>";
        return '<div class="layer"><span class="tag">' + (l[0] === "gap" ? "GlobalAvgPool2D" : "Flatten") + "</span>" + x + "</div>";
      }).join("");
      calc();
    };
    const calc = () => {
      let s = $("#sin", b).value.split(/[\s,x×]+/).filter(Boolean).map(Number);
      let total = 0; const rows = [];
      const shp = a => "(None, " + a.join(", ") + ")";
      rows.push("<tr><td>Input</td><td>" + shp(s) + "</td><td>0</td><td></td></tr>");
      for (const l of L) {
        let p = 0, work = "", err = "";
        if (l[0] === "conv") {
          if (s.length !== 3) err = "Conv2D needs a 3D input (H, W, C)";
          else { const [H, Wd, C] = s, [, K, F, St, pad] = l; const o = pad === "same" ? [Math.ceil(H / St), Math.ceil(Wd / St)] : [Math.floor((H - F) / St) + 1, Math.floor((Wd - F) / St) + 1];
            if (o[0] < 1) err = "Filter larger than input"; else { p = F * F * C * K + K; work = F + "×" + F + "×" + C + "×" + K + " + " + K + "<br>size: " + (pad === "same" ? "⌈" + H + "/" + St + "⌉" : "⌊(" + H + "−" + F + ")/" + St + "⌋+1") + " = " + o[0]; s = [o[0], o[1], K]; } }
        } else if (l[0] === "pool") {
          if (s.length !== 3) err = "Pooling needs a 3D input";
          else { const k = l[1]; work = "⌊" + s[0] + "/" + k + "⌋ = " + Math.floor(s[0] / k) + " · no weights"; s = [Math.floor(s[0] / k), Math.floor(s[1] / k), s[2]]; }
        } else if (l[0] === "flatten") {
          const n = s.reduce((a, c) => a * c, 1); work = s.join("×") + " = " + n; s = [n];
        } else if (l[0] === "gap") {
          if (s.length !== 3) err = "GAP needs a 3D input"; else { work = "average each " + s[0] + "×" + s[1] + " map → 1 number"; s = [s[2]]; }
        } else if (l[0] === "dense") {
          if (s.length !== 1) err = "Add Flatten (or GAP) before Dense";
          else { p = s[0] * l[1] + l[1]; work = s[0] + "×" + l[1] + " + " + l[1]; s = [l[1]]; }
        }
        total += p;
        const name = { conv: "Conv2D", pool: "MaxPooling2D", flatten: "Flatten", gap: "GlobalAvgPool2D", dense: "Dense" }[l[0]];
        rows.push("<tr><td>" + name + "</td><td>" + (err ? '<span class="err" style="color:var(--bad)">' + err + "</span>" : shp(s)) + "</td><td>" + p.toLocaleString() + "</td><td>" + work + "</td></tr>");
        if (err) break;
      }
      rows.push("<tr><td colspan=2><b>Total trainable params</b></td><td><b>" + total.toLocaleString() + "</b></td><td></td></tr>");
      $("#st", b).innerHTML = rows.join("");
    };
    const load = k => { const p = PRESETS[k]; $("#sin", b).value = p.in.join(", "); L = p.L.map(x => x.slice()); renderLayers(); };
    $("#sp", b).addEventListener("input", e => load(e.target.value));
    $("#sin", b).addEventListener("input", calc);
    sl.addEventListener("input", e => { const t = e.target; if (t.dataset.i === undefined) return; const v = t.tagName === "SELECT" ? t.value : Math.max(1, +t.value || 1); L[+t.dataset.i][+t.dataset.k] = v; calc(); });
    sl.addEventListener("click", e => { const d = e.target.closest("[data-del]"); if (d) { L.splice(+d.dataset.del, 1); renderLayers(); } });
    $$("[data-add]", b).forEach(btn => btn.addEventListener("click", () => {
      const t = btn.dataset.add; L.push(t === "conv" ? ["conv", 32, 3, 1, "valid"] : t === "pool" ? ["pool", 2] : t === "dense" ? ["dense", 10] : [t]); renderLayers();
    }));
    load(Object.keys(PRESETS)[0]);
  };

  /* ---------- flashcards ---------- */
  const CARDS = [
    ["2.3", "Vanishing gradient", "Sigmoid/tanh saturate at large |x| → gradient ≈ 0 → weights stop updating."],
    ["2.3", "Dying ReLU", "Input stuck negative → output 0 and gradient 0 forever. Fix: Leaky ReLU."],
    ["2.3", "Sigmoid derivative", "f′(x) = f(x)(1 − f(x)), max 0.25 at x = 0"],
    ["2.3", "Tanh derivative", "f′(x) = 1 − f(x)²"],
    ["2.3", "Binary classification output", "1 neuron · sigmoid · binary cross-entropy"],
    ["2.3", "Multi-class output", "1 neuron per class · softmax + one-hot · categorical cross-entropy"],
    ["2.3", "Regression output", "Linear activation · MSE loss"],
    ["2.3", "3 purposes of activation functions", "Firing decision · bounded values · non-linearity"],
    ["2.1", "What makes a network \"deep\"?", "2 or more hidden layers"],
    ["2.1", "4 things that set NN capacity", "Depth · width · connectivity · number of parameters"],
    ["2.1", "Dense layer parameters", "inputs × neurons + neurons"],
    ["2.2", "7 general steps of building an ANN", "Prepare data → define & compile → train → evaluate → optimize → predict → save/deploy"],
    ["2.2", "Weight matrix shape", "(neurons in this layer) × (neurons in previous layer), e.g. W1 = 20 × 784"],
    ["2.4", "Binary cross-entropy", "−(1/n) Σ [y log ŷ + (1−y) log(1−ŷ)]"],
    ["2.4", "Why not MSE for classification?", "With sigmoid it gives a non-convex loss with local minima; CE punishes confident wrong answers."],
    ["2.5", "Backpropagation uses…", "Gradient descent + chain rule, from the output layer back to the input."],
    ["2.5", "∂E/∂w₁₂ (sigmoid, E = ½(a−y)²)", "(a − y) · a(1 − a) · a₁"],
    ["2.5", "Learning-rate decay", "rₖ = (1 − k/T) r₀ + (k/T) r_T"],
    ["2.5", "Momentum update", "Δwₜ = −η J′(w) + m Δwₜ₋₁ (escape local minima, faster)"],
    ["2.5", "Adagrad", "Per-weight learning rate, divided by √(sum of all past squared gradients). Slows over time."],
    ["2.5", "RMSprop", "Moving average of root-mean-square of past gradients; designed for mini-batch"],
    ["2.5", "Adam", "Default optimizer: Adagrad + RMSprop + momentum"],
    ["2.5", "Batch vs stochastic", "Batch: all samples, accurate, heavy memory. Stochastic: 1 sample, noisy, low memory, online."],
    ["3", "Sequential vs Functional API", "Sequential = simple stack. Functional = multiple inputs/outputs, branches, shared layers, transfer learning."],
    ["3", "What does None mean in (None, 65536)?", "Batch size is not fixed"],
    ["4.1", "3 attributes of image data", "Spatial correlation · translation invariance · hierarchy of features"],
    ["4.1", "Why ANN is weak on images", "Flattening loses spatial relationships and hierarchy; too many weights"],
    ["4.1", "AlexNet 2012 ingredients", "CNN + ReLU + data augmentation + dropout + GPU"],
    ["4.2", "Conv output size", "⌊(N − F + 2P)/S⌋ + 1"],
    ["4.2", "Conv parameters", "F × F × C_in × K + K"],
    ["4.2", "3 characteristics of conv layers", "Local pattern detectors · translation invariance · spatial hierarchy"],
    ["4.2", "Padding: valid vs same", "valid = no padding (shrinks) · same = zero-pad to keep size"],
    ["4.2", "Pooling layer parameters", "None — pooling has no learnable weights"],
    ["4.2", "Global average pooling", "(h × w × d) → (1 × 1 × d); replaces dense layers, fewer params, less overfitting"],
    ["4.3", "ImageDataGenerator class_mode", "categorical (one-hot) · binary · sparse (integers) · None"]
  ];
  W.flashcards = el => {
    el.classList.add("flash"); el.classList.remove("widget");
    el.innerHTML = '<div class="wrow" style="justify-content:center"><label>Topic<select id="ft"><option value="">All topics</option>' + [...new Set(CARDS.map(c => c[0]))].map(t => '<option value="' + t + '">Topic ' + t + "</option>").join("") + '</select></label><button class="btn ghost" id="fs" type="button">Shuffle</button></div><button class="card" id="fc" type="button" aria-label="Flashcard, press to flip"><div class="in"><div class="face"><span class="tag" id="ftag"></span><div class="front-t" id="ff"></div><p class="sub" style="margin-top:12px">Tap to flip</p></div><div class="face back"><span class="tag">Answer</span><div class="back-t" id="fb"></div></div></div></button><div class="flashnav"><button class="btn ghost" id="fp" type="button">← Prev</button><span class="n" id="fn"></span><button class="btn" id="fx" type="button">Next →</button></div><p class="sub" style="text-align:center">Keyboard: ← → to move, space to flip</p>';
    let deck = CARDS.slice(), i = 0;
    const card = $("#fc", el);
    const show = () => { const c = deck[i]; card.classList.remove("flipped"); $("#ftag", el).textContent = "Topic " + c[0]; $("#ff", el).textContent = c[1]; $("#fb", el).textContent = c[2]; $("#fn", el).textContent = (i + 1) + " / " + deck.length; };
    const filter = () => { const t = $("#ft", el).value; deck = CARDS.filter(c => !t || c[0] === t); i = 0; show(); };
    card.addEventListener("click", () => card.classList.toggle("flipped"));
    $("#fx", el).addEventListener("click", () => { i = (i + 1) % deck.length; show(); });
    $("#fp", el).addEventListener("click", () => { i = (i - 1 + deck.length) % deck.length; show(); });
    $("#fs", el).addEventListener("click", () => { for (let k = deck.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [deck[k], deck[j]] = [deck[j], deck[k]]; } i = 0; show(); });
    $("#ft", el).addEventListener("input", filter);
    addEventListener("keydown", e => {
      const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
      if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "SELECT") return;
      if (e.key === "ArrowRight") $("#fx", el).click();
      else if (e.key === "ArrowLeft") $("#fp", el).click();
      else if (e.key === " " && document.activeElement !== card) { e.preventDefault(); card.click(); }
    });
    show();
  };

  $$("[data-widget]").forEach(el => { const f = W[el.dataset.widget]; if (f) try { f(el); } catch (e) { console.error(e); } });
})();
