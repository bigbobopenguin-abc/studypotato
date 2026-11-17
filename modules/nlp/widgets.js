/* Interactive widgets for Natural Language Processing. Uses SPW from assets/widgets-core.js. */
(function () {
  "use strict";
  const { $, $$, fmt, nums, sig, esc, shell, live, flashcards } = window.SPW;
  const mat = s => s.trim().split(/\n|;/).map(r => nums(r)).filter(r => r.length);
  const mstr = m => m.map(r => "[" + r.map(v => fmt(v, 3)).join(", ") + "]").join("\n");
  const matmul = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
  const dot = (a, b) => a.reduce((s, v, i) => s + v * (b[i] || 0), 0);
  const norm = a => Math.sqrt(dot(a, a));
  const ta = (id, val, rows) => '<textarea id="' + id + '" rows="' + (rows || 3) + '" spellcheck="false" style="width:min(340px,80vw);font-family:var(--f-mono);font-size:14px;border:1px solid var(--line);border-radius:6px;background:var(--bg);padding:6px 8px">' + val + "</textarea>";
  const A = SPW.add;

  /* ---------- BPE ---------- */
  A("bpe", el => {
    const b = shell(el, "Byte Pair Encoding, one merge at a time");
    b.innerHTML = '<div class="wrow"><label>Corpus (words, repeats count)' + ta("bc", "low low low low low lower lower newest newest newest newest newest newest widest widest widest", 3) + '</label></div><div class="wrow"><button class="btn" id="bs" type="button">Merge next pair</button><button class="btn ghost" id="ba" type="button">Merge 5</button><button class="btn ghost" id="br" type="button">Reset</button></div><div class="out" id="bo"></div>';
    let words, merges, vocab;
    const reset = () => {
      const freq = {};
      $("#bc", b).value.trim().split(/\s+/).filter(Boolean).forEach(w => freq[w] = (freq[w] || 0) + 1);
      words = Object.entries(freq).map(([w, f]) => ({ s: w.split(""), f }));
      vocab = [...new Set(words.flatMap(w => w.s))].sort();
      merges = []; render();
    };
    const pairs = () => {
      const c = new Map();
      words.forEach(w => { for (let i = 0; i < w.s.length - 1; i++) { const k = w.s[i] + "\u0001" + w.s[i + 1]; c.set(k, (c.get(k) || 0) + w.f); } });
      return [...c.entries()].sort((a, b) => b[1] - a[1]);
    };
    const step = () => {
      const p = pairs(); if (!p.length) return false;
      const [k, n] = p[0], [x, y] = k.split("\u0001"), t = x + y;
      words.forEach(w => { const o = []; for (let i = 0; i < w.s.length; i++) { if (i < w.s.length - 1 && w.s[i] === x && w.s[i + 1] === y) { o.push(t); i++; } else o.push(w.s[i]); } w.s = o; });
      merges.push(x + " + " + y + " → " + t + "   (seen " + n + "×)"); vocab.push(t); return true;
    };
    const render = () => {
      const p = pairs().slice(0, 4).map(([k, n]) => k.replace("\u0001", " ") + " (" + n + ")").join(", ");
      $("#bo", b).textContent = "Words now:  " + words.map(w => w.s.join("·") + " ×" + w.f).join("   ") +
        "\nMerges:     " + (merges.length ? "\n  " + merges.map((m, i) => (i + 1) + ". " + m).join("\n  ") : "none yet") +
        "\nVocabulary (" + vocab.length + "): " + vocab.join(" ") +
        "\nTop pairs:  " + (p || "nothing left to merge");
    };
    $("#bs", b).addEventListener("click", () => { step(); render(); });
    $("#ba", b).addEventListener("click", () => { for (let i = 0; i < 5; i++) if (!step()) break; render(); });
    $("#br", b).addEventListener("click", reset);
    $("#bc", b).addEventListener("input", reset);
    reset();
  });

  /* ---------- HMM ---------- */
  A("hmm", el => {
    const b = shell(el, "HMM tagger: pick tags and score the path");
    b.innerHTML = '<div class="wrow"><label>Training corpus (word/TAG, one sentence per line)' + ta("hc", "Mary/N Jane/N can/M see/V Will/N\nSpot/N will/M see/V Mary/N\nWill/M Jane/N spot/V Mary/N\nMary/N will/M pat/V Spot/N", 4) + '</label></div><div class="wrow"><label>Sentence to tag<input type="text" class="wide" id="hs" value="Will can spot Mary"></label><button class="btn ghost" id="hb" type="button">Find best tagging</button></div><div class="wrow" id="ht"></div><div class="out" id="ho"></div>';
    let em, tr, tags, tagCount, trOut;
    const train = () => {
      em = {}; tr = {}; tagCount = {}; trOut = {};
      $("#hc", b).value.trim().split("\n").forEach(line => {
        const toks = line.trim().split(/\s+/).filter(t => t.includes("/")).map(t => { const i = t.lastIndexOf("/"); return [t.slice(0, i).toLowerCase(), t.slice(i + 1)]; });
        let prev = "<S>";
        toks.forEach(([w, t]) => {
          tagCount[t] = (tagCount[t] || 0) + 1; em[t] = em[t] || {}; em[t][w] = (em[t][w] || 0) + 1;
          tr[prev] = tr[prev] || {}; tr[prev][t] = (tr[prev][t] || 0) + 1; trOut[prev] = (trOut[prev] || 0) + 1; prev = t;
        });
        if (toks.length) { tr[prev] = tr[prev] || {}; tr[prev]["<E>"] = (tr[prev]["<E>"] || 0) + 1; trOut[prev] = (trOut[prev] || 0) + 1; }
      });
      tags = Object.keys(tagCount);
    };
    const eP = (w, t) => [(em[t] && em[t][w]) || 0, tagCount[t] || 0];
    const tP = (a, c) => [(tr[a] && tr[a][c]) || 0, trOut[a] || 0];
    const score = (words, seq) => {
      let p = 1; const parts = []; let prev = "<S>";
      words.forEach((w, i) => {
        const [tn, td] = tP(prev, seq[i]), [en, ed] = eP(w.toLowerCase(), seq[i]);
        parts.push(prev + "→" + seq[i] + " " + tn + "/" + td, w + "|" + seq[i] + " " + en + "/" + ed);
        p *= (td ? tn / td : 0) * (ed ? en / ed : 0); prev = seq[i];
      });
      const [n, d] = tP(prev, "<E>"); parts.push(prev + "→<E> " + n + "/" + d); p *= d ? n / d : 0;
      return { p, parts };
    };
    const pickers = () => {
      const words = $("#hs", b).value.trim().split(/\s+/).filter(Boolean).slice(0, 8);
      const prevSel = $$("select", $("#ht", b)).map(s => s.value);
      $("#ht", b).innerHTML = words.map((w, i) => '<label>' + esc(w) + '<select data-i="' + i + '">' + tags.map(t => "<option" + ((prevSel[i] || tags[0]) === t ? " selected" : "") + ">" + t + "</option>").join("") + "</select></label>").join("");
      $$("select", $("#ht", b)).forEach(s => s.addEventListener("input", calc));
      return words;
    };
    const calc = () => {
      const words = $("#hs", b).value.trim().split(/\s+/).filter(Boolean).slice(0, 8);
      const seq = $$("select", $("#ht", b)).map(s => s.value);
      const { p, parts } = score(words, seq);
      $("#ho", b).textContent = "Tags: " + seq.join(" ") + "\n" + parts.join(" × ") + "\nP = " + (p ? fmt(p, 8) : "0  (a zero factor makes the path impossible)");
    };
    const all = () => { train(); pickers(); calc(); };
    $("#hb", b).addEventListener("click", () => {
      const words = $("#hs", b).value.trim().split(/\s+/).filter(Boolean).slice(0, 8);
      let best = { p: -1, seq: [] };
      const rec = (i, seq) => { if (i === words.length) { const s = score(words, seq).p; if (s > best.p) best = { p: s, seq: seq.slice() }; return; } tags.forEach(t => { seq.push(t); rec(i + 1, seq); seq.pop(); }); };
      rec(0, []);
      $$("select", $("#ht", b)).forEach((s, i) => s.value = best.seq[i]); calc();
      $("#ho", b).textContent += "\n→ best of " + Math.pow(tags.length, words.length) + " possible taggings";
    });
    $("#hc", b).addEventListener("input", all);
    $("#hs", b).addEventListener("input", () => { pickers(); calc(); });
    all();
  });

  /* ---------- chunking ---------- */
  A("chunk", el => {
    const b = shell(el, "noun-phrase chunker  NP: {<DT>?<JJ>*<NN>}");
    b.innerHTML = '<div class="wrow"><label>Tagged sentence (word/TAG)<input type="text" class="wide" id="cs" value="The/DT graceful/JJ gazelle/NN leaped/VBD through/IN the/DT savanna/NN" style="width:min(560px,80vw)"></label></div><div class="out" id="co"></div>';
    live(b, () => {
      const toks = $("#cs", b).value.trim().split(/\s+/).map(t => { const i = t.lastIndexOf("/"); return i < 0 ? [t, "?"] : [t.slice(0, i), t.slice(i + 1).toUpperCase()]; });
      const out = []; const chunks = []; let i = 0;
      const isNN = t => t === "NN" || t === "NNS" ? t === "NN" : false;
      while (i < toks.length) {
        let j = i; if (toks[j] && toks[j][1] === "DT") j++;
        while (toks[j] && toks[j][1] === "JJ") j++;
        if (toks[j] && isNN(toks[j][1])) { const ph = toks.slice(i, j + 1).map(t => t[0]).join(" "); out.push("[NP " + ph + "]"); chunks.push(ph); i = j + 1; }
        else { out.push(toks[i][0]); i++; }
      }
      $("#co", b).textContent = out.join(" ") + "\nNP chunks: " + (chunks.length ? chunks.map(c => "“" + c + "”").join(", ") : "none") + "\n(Only NN counts as the noun here, exactly as the pattern says. NNS or NNP would need <NN.*>.)";
    });
  });

  /* ---------- skip-gram ---------- */
  A("skipgram", el => {
    const b = shell(el, "skip-gram probability σ(w·c)");
    b.innerHTML = '<div class="wrow"><label>Target vector w<input type="text" class="wide" id="sw" value="1, 2"></label><label>Context vector c<input type="text" class="wide" id="sc" value="0.5, 1"></label></div><div class="out" id="so"></div>';
    live(b, () => {
      const w = nums($("#sw", b).value), c = nums($("#sc", b).value), d = dot(w, c);
      $("#so", b).textContent = "w·c = " + w.map((v, i) => fmt(v, 3) + "×" + fmt(c[i] || 0, 3)).join(" + ") + " = " + fmt(d) + "\nP(+ | w, c) = 1/(1 + e^−" + fmt(d) + ") = " + fmt(sig(d)) + "\nP(− | w, c) = 1 − " + fmt(sig(d)) + " = " + fmt(1 - sig(d)) + "\n" + (d > 0 ? "Positive dot product → more likely a real neighbour." : "Non-positive dot product → more likely a fake (negative) pair.");
    });
  });

  /* ---------- cosine ---------- */
  A("cosine", el => {
    const b = shell(el, "dot product and cosine similarity");
    b.innerHTML = '<div class="wrow"><label>Vector v<input type="text" class="wide" id="cv" value="5, 1683, 1670"></label><label>Vector w<input type="text" class="wide" id="cw" value="5, 3982, 3325"></label></div><div class="out" id="co"></div><p style="margin:10px 0 0">cos θ = <span class="big" id="cb"></span></p>';
    live(b, () => {
      const v = nums($("#cv", b).value), w = nums($("#cw", b).value);
      if (v.length !== w.length) { $("#co", b).textContent = "Both vectors need the same length (" + v.length + " vs " + w.length + ")."; $("#cb", b).textContent = "–"; return; }
      const d = dot(v, w), nv = norm(v), nw = norm(w);
      $("#co", b).textContent = "v·w = " + v.map((x, i) => fmt(x) + "×" + fmt(w[i])).join(" + ") + " = " + fmt(d, 3) +
        "\n|v| = √(" + v.map(x => fmt(x) + "²").join(" + ") + ") = " + fmt(nv, 3) + "\n|w| = √(" + w.map(x => fmt(x) + "²").join(" + ") + ") = " + fmt(nw, 3) +
        "\ncos = " + fmt(d, 3) + " / (" + fmt(nv, 3) + " × " + fmt(nw, 3) + ")";
      $("#cb", b).textContent = nv && nw ? fmt(d / nv / nw, 4) : "–";
    });
  });

  /* ---------- TF-IDF ---------- */
  A("tfidf", el => {
    const b = shell(el, "TF-IDF (log₁₀)");
    b.innerHTML = '<div class="wrow"><label>Count in this document<input type="number" id="tc" value="1" min="0"></label><label>Total documents N<input type="number" id="tn" value="37" min="1"></label><label>Documents containing the word (df)<input type="number" id="td" value="21" min="1"></label></div><div class="out" id="to"></div>';
    live(b, () => {
      const c = +$("#tc", b).value, N = +$("#tn", b).value, df = +$("#td", b).value;
      const tf = Math.log10(c + 1), idf = Math.log10(N / df);
      $("#to", b).textContent = "TF  = log₁₀(" + c + " + 1) = " + fmt(tf) + "\nIDF = log₁₀(" + N + " / " + df + ") = log₁₀(" + fmt(N / df) + ") = " + fmt(idf) + "\nTF-IDF = " + fmt(tf) + " × " + fmt(idf) + " = " + fmt(tf * idf) + (df > N ? "\n(df can't be larger than N)" : df === N ? "\nIn every document → IDF = 0, so the word carries no weight." : "");
    });
  });

  /* ---------- PPMI ---------- */
  A("ppmi", el => {
    const b = shell(el, "PPMI (log₂)");
    b.innerHTML = '<div class="wrow"><label>P(w, c)<input type="number" step="0.01" id="pj" value="0.3399"></label><label>P(w)<input type="number" step="0.01" id="pw" value="0.6575"></label><label>P(c)<input type="number" step="0.01" id="pc" value="0.4842"></label></div><p class="sub" style="margin:0 0 8px">From counts: P(w,c) = cell / grand total, P(w) = row total / grand total, P(c) = column total / grand total.</p><div class="out" id="po"></div>';
    live(b, () => {
      const j = +$("#pj", b).value, w = +$("#pw", b).value, c = +$("#pc", b).value;
      const r = j / (w * c), pmi = Math.log2(r);
      $("#po", b).textContent = "P(w)P(c) = " + fmt(w) + " × " + fmt(c) + " = " + fmt(w * c) + "   (chance co-occurrence)\nratio = " + fmt(j) + " / " + fmt(w * c) + " = " + fmt(r) + "\nPMI = log₂(" + fmt(r) + ") = log(" + fmt(r) + ")/log(2) = " + fmt(pmi) + "\nPPMI = max(" + fmt(pmi) + ", 0) = " + fmt(Math.max(pmi, 0)) + (pmi < 0 ? "\nNegative PMI → they co-occur less than chance → set to 0." : "");
    });
  });

  /* ---------- Naive Bayes ---------- */
  A("nb", el => {
    const b = shell(el, "Naive Bayes with Laplace smoothing");
    b.innerHTML = '<div class="wrow"><label>Training data (Label: text, one per line)' + ta("nt", "Positive: i loved this movie\nPositive: acting was superb\nPositive: impressive plot twist\nNegative: movie did not live up to expectation\nNegative: very disappointed with plot", 5) + '</label></div><div class="wrow"><label>Review to classify<input type="text" class="wide" id="nq" value="very impressive movie"></label></div><div class="out" id="no"></div>';
    live(b, () => {
      const docs = $("#nt", b).value.split("\n").map(l => { const i = l.indexOf(":"); return i < 0 ? null : [l.slice(0, i).trim(), l.slice(i + 1).trim().toLowerCase().split(/\s+/).filter(Boolean)]; }).filter(d => d && d[0] && d[1].length);
      if (!docs.length) { $("#no", b).textContent = "Add some lines like  Positive: great film"; return; }
      const classes = [...new Set(docs.map(d => d[0]))];
      const V = new Set(docs.flatMap(d => d[1]));
      const q = $("#nq", b).value.toLowerCase().split(/\s+/).filter(Boolean);
      const unk = q.filter(w => !V.has(w)), use = q.filter(w => V.has(w));
      const lines = ["Vocabulary size |V| = " + V.size + (unk.length ? "     ignored (not in vocabulary): " + unk.join(", ") : "")];
      const res = classes.map(c => {
        const cd = docs.filter(d => d[0] === c), words = cd.flatMap(d => d[1]), prior = cd.length / docs.length;
        lines.push("\n" + c + ": prior = " + cd.length + "/" + docs.length + ", words in class = " + words.length);
        let p = 1;
        use.forEach(w => { const n = words.filter(x => x === w).length; p *= (n + 1) / (words.length + V.size); lines.push("  P(" + w + "|" + c + ") = (" + n + "+1)/(" + words.length + "+" + V.size + ") = " + (n + 1) + "/" + (words.length + V.size)); });
        lines.push("  likelihood = " + fmt(p, 6) + "     × prior → score = " + fmt(p * prior, 6));
        return [c, p * prior];
      });
      res.sort((a, b2) => b2[1] - a[1]);
      lines.push("\n→ predict " + res[0][0].toUpperCase());
      $("#no", b).textContent = lines.join("\n");
    });
  });

  /* ---------- confusion matrix ---------- */
  A("confusion", el => {
    const b = shell(el, "confusion matrix metrics");
    const f = (id, l, v) => '<label>' + l + '<input type="number" min="0" id="' + id + '" value="' + v + '"></label>';
    b.innerHTML = '<div class="wrow">' + f("tp", "TP", 40) + f("fn", "FN", 10) + f("fp", "FP", 5) + f("tn", "TN", 45) + '</div><div class="out" id="mo"></div>';
    live(b, () => {
      const tp = +$("#tp", b).value, fn = +$("#fn", b).value, fp = +$("#fp", b).value, tn = +$("#tn", b).value, T = tp + fn + fp + tn;
      const acc = (tp + tn) / T, pr = tp / (tp + fp), rc = tp / (tp + fn), f1 = 2 * pr * rc / (pr + rc);
      $("#mo", b).textContent = "Accuracy  = (" + tp + " + " + tn + ") / " + T + " = " + fmt(acc) + "\nPrecision = " + tp + " / (" + tp + " + " + fp + ") = " + fmt(pr) + "\nRecall    = " + tp + " / (" + tp + " + " + fn + ") = " + fmt(rc) + "\nF1        = 2 × " + fmt(pr) + " × " + fmt(rc) + " / (" + fmt(pr) + " + " + fmt(rc) + ") = " + fmt(f1);
    });
  });

  /* ---------- slide LR model ---------- */
  const LRV = "acting did disappointed expectation impressive live loved movie not plot superb this to twist up very was with".split(" ");
  const LRW = [0.0, -0.2464937045221402, -0.33081722204225855, -0.2464937045221402, 0.2940105632646871, -0.2464937045221402, 0.2832988871347252, 0.03680518261258496, -0.2464937045221402, -0.03680665877757143, 0.0, 0.2832988871347252, -0.2464937045221402, 0.2940105632646871, -0.2464937045221402, -0.33081722204225855, 0.0, -0.33081722204225855];
  const LRB = 0.3247669594865432;
  A("lrreview", el => {
    const b = shell(el, "score any review with the slides' trained model");
    b.innerHTML = '<div class="wrow"><label>Review<input type="text" class="wide" id="lq" value="very impressive movie"></label></div><div class="out" id="lo"></div><p style="margin:10px 0 0">σ(z) = <span class="big" id="lb"></span> <span id="lc" style="font-weight:700"></span></p>';
    live(b, () => {
      const toks = $("#lq", b).value.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
      const x = LRV.map(t => toks.filter(w => w === t).length);
      const used = LRV.map((t, i) => x[i] ? (x[i] > 1 ? x[i] + "×" : "") + t + " (" + fmt(LRW[i], 3) + ")" : null).filter(Boolean);
      const ign = [...new Set(toks.filter(w => !LRV.includes(w)))];
      const z = dot(x, LRW) + LRB, p = sig(z);
      $("#lo", b).textContent = "x = [" + x.join(" ") + "]\nz = " + (used.length ? used.join(" + ") + " + " : "") + "b (" + fmt(LRB, 3) + ") = " + fmt(z) + (ign.length ? "\nnot in vocabulary (ignored): " + ign.join(", ") : "") + "\nσ(z) = 1/(1 + e^−" + fmt(z) + ")";
      $("#lb", b).textContent = fmt(p);
      $("#lc", b).textContent = p > 0.5 ? "→ class 1 (positive)" : "→ class 0 (negative)";
      $("#lc", b).style.color = p > 0.5 ? "var(--ok)" : "var(--bad)";
    });
  });

  /* ---------- generic LR ---------- */
  A("logreg", el => {
    const b = shell(el, "logistic regression: z, σ(z), loss and one SGD step");
    b.innerHTML = '<div class="wrow"><label>Features x<input type="text" class="wide" id="gx" value="3, 2, 1, 3, 0, 4.19"></label><label>Weights w<input type="text" class="wide" id="gw" value="2.5, -5, -1.2, 0.5, 2, 0.7"></label><label>Bias b<input type="number" step="0.1" id="gb" value="0.1"></label></div><div class="wrow"><label>True label y (optional)<select id="gy"><option value="">none</option><option>1</option><option>0</option></select></label><label>Learning rate η<input type="number" step="0.05" id="ge" value="0.1"></label></div><div class="out" id="go"></div>';
    live(b, () => {
      const x = nums($("#gx", b).value), w = nums($("#gw", b).value), bb = +$("#gb", b).value, yv = $("#gy", b).value, eta = +$("#ge", b).value;
      if (x.length !== w.length) { $("#go", b).textContent = "x and w need the same length (" + x.length + " vs " + w.length + ")."; return; }
      const z = dot(x, w) + bb, p = sig(z);
      let t = "z = " + x.map((v, i) => fmt(w[i], 3) + "×" + fmt(v, 3)).join(" + ") + " + " + fmt(bb, 3) + " = " + fmt(z) + "\nσ(z) = " + fmt(p) + " → class " + (p > 0.5 ? 1 : 0);
      if (yv !== "") {
        const y = +yv, L = -(y * Math.log(p) + (1 - y) * Math.log(1 - p)), g = p - y;
        t += "\nloss = −[y ln ŷ + (1−y) ln(1−ŷ)] = " + fmt(L) + "\nŷ − y = " + fmt(g) + "\nnew w = [" + w.map((v, i) => fmt(v - eta * g * x[i])).join(", ") + "]\nnew b = " + fmt(bb - eta * g);
      }
      $("#go", b).textContent = t;
    });
  });

  /* ---------- convolution ---------- */
  A("conv", el => {
    const b = shell(el, "convolution: tap an output cell to see the working");
    b.innerHTML = '<div class="wrow"><label>Input matrix' + ta("ci", "1 1 1 0 0\n0 1 1 1 0\n0 0 1 1 1\n0 0 1 1 0\n0 1 1 0 0", 5) + '</label><label>Kernel' + ta("ck", "1 0 1\n0 1 0\n1 0 1", 3) + '</label><label>Stride<select id="cs"><option>1</option><option>2</option></select></label><label>Then<select id="cr"><option value="">no activation</option><option value="relu">ReLU</option></select></label></div><div class="convwrap"><div><span class="cap">Feature map <span id="cz"></span></span><div class="gridout" id="cg"></div></div></div><div class="out" id="cx" style="margin-top:10px"></div>';
    let sel = [0, 0];
    const run = () => {
      const I = mat($("#ci", b).value), K = mat($("#ck", b).value), s = +$("#cs", b).value, relu = $("#cr", b).value;
      if (!I.length || !K.length) return;
      const n = Math.floor((I.length - K.length) / s) + 1, m = Math.floor((I[0].length - K[0].length) / s) + 1;
      if (n < 1 || m < 1) { $("#cx", b).textContent = "The kernel is larger than the input."; $("#cg", b).innerHTML = ""; return; }
      const F = [];
      for (let r = 0; r < n; r++) { F.push([]); for (let c = 0; c < m; c++) { let t = 0; K.forEach((kr, i) => kr.forEach((kv, j) => t += ((I[r * s + i] || [])[c * s + j] || 0) * kv)); F[r].push(relu ? Math.max(0, t) : t); } }
      if (sel[0] >= n || sel[1] >= m) sel = [0, 0];
      $("#cz", b).textContent = "(" + n + "×" + m + ")";
      const g = $("#cg", b); g.style.gridTemplateColumns = "repeat(" + m + ",auto)";
      g.innerHTML = F.flat().map((v, i) => '<span tabindex="0" data-r="' + Math.floor(i / m) + '" data-c="' + (i % m) + '" class="' + (Math.floor(i / m) === sel[0] && i % m === sel[1] ? "sel" : "") + '">' + fmt(v, 2) + "</span>").join("");
      const [r, c] = sel, terms = []; let t = 0;
      K.forEach((kr, i) => kr.forEach((kv, j) => { const v = (I[r * s + i] || [])[c * s + j] || 0; terms.push(fmt(v) + "×" + fmt(kv)); t += v * kv; }));
      $("#cx", b).textContent = "F(" + r + ", " + c + ") = " + terms.join(" + ") + " = " + fmt(t) + (relu ? " → ReLU → " + fmt(Math.max(0, t)) : "") + "\nOutput size = (" + I.length + " − " + K.length + ")/" + s + " + 1 = " + n + (Math.floor((I.length - K.length) / s) !== (I.length - K.length) / s ? "  (rounded down)" : "");
    };
    $("#cg", b).addEventListener("click", e => { const t = e.target.closest("span[data-r]"); if (t) { sel = [+t.dataset.r, +t.dataset.c]; run(); } });
    $("#cg", b).addEventListener("keydown", e => { if (e.key === "Enter") e.target.click(); });
    live(b, run);
  });

  /* ---------- pooling ---------- */
  A("pool", el => {
    const b = shell(el, "max and average pooling");
    b.innerHTML = '<div class="wrow"><label>Feature map' + ta("pi", "1 1 2 4\n5 6 7 8\n3 2 1 0\n1 2 3 4", 4) + '</label><label>Window<select id="pk"><option>2</option><option>3</option></select></label><label>Stride<select id="ps"><option>2</option><option>1</option></select></label></div><div class="out" id="po"></div>';
    live(b, () => {
      const M = mat($("#pi", b).value), k = +$("#pk", b).value, s = +$("#ps", b).value;
      const n = Math.floor((M.length - k) / s) + 1, m = Math.floor(((M[0] || []).length - k) / s) + 1;
      if (n < 1 || m < 1) { $("#po", b).textContent = "Window larger than the map."; return; }
      const mx = [], av = [], lines = [];
      for (let r = 0; r < n; r++) { mx.push([]); av.push([]); for (let c = 0; c < m; c++) { const v = []; for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) v.push((M[r * s + i] || [])[c * s + j] || 0); mx[r].push(Math.max(...v)); av[r].push(v.reduce((a, x) => a + x, 0) / v.length); lines.push("(" + r + "," + c + ") {" + v.join(", ") + "}  max " + fmt(Math.max(...v)) + "  avg " + v.reduce((a, x) => a + x, 0) + "/" + v.length + " = " + fmt(v.reduce((a, x) => a + x, 0) / v.length)); } }
      $("#po", b).textContent = "Output size = (" + M.length + " − " + k + ")/" + s + " + 1 = " + n + "\n\nMax pooling:\n" + mstr(mx) + "\n\nAverage pooling:\n" + mstr(av) + "\n\nWindows:\n" + lines.join("\n");
    });
  });

  /* ---------- self-attention ---------- */
  A("attention", el => {
    const b = shell(el, "self-attention step by step");
    b.innerHTML = '<div class="wrow"><label>Inputs X (one row per token)' + ta("ax", "1 0 1 0\n0 2 0 2\n1 1 1 1", 3) + '</label><label>W_Q' + ta("aq", "1 0 1\n1 0 0\n0 0 1\n0 1 1", 4) + '</label><label>W_K' + ta("ak", "0 0 1\n1 1 0\n0 1 0\n1 1 0", 4) + '</label><label>W_V' + ta("av", "0 2 0\n0 3 0\n1 0 3\n1 1 0", 4) + '</label></div><div class="wrow"><label>Output for token #<select id="at"></select></label><label>Scale by √d_k<select id="as"><option value="0">no (slides: d_k = 1)</option><option value="1">yes</option></select></label><label>Softmax<select id="ar"><option value="1">rounded like the slides</option><option value="0">exact</option></select></label></div><div class="out" id="ao"></div>';
    const run = () => {
      const X = mat($("#ax", b).value), Wq = mat($("#aq", b).value), Wk = mat($("#ak", b).value), Wv = mat($("#av", b).value);
      const sel = $("#at", b), n = X.length;
      if (sel.options.length !== n) { const cur = +sel.value || 1; sel.innerHTML = X.map((_, i) => "<option value=" + (i + 1) + ">" + (i + 1) + "</option>").join(""); sel.value = Math.min(cur, n); }
      if (X[0].length !== Wq.length || X[0].length !== Wk.length || X[0].length !== Wv.length) { $("#ao", b).textContent = "Each W needs as many rows as X has columns (" + X[0].length + ")."; return; }
      const Q = matmul(X, Wq), K = matmul(X, Wk), V = matmul(X, Wv), t = +sel.value - 1, dk = K[0].length;
      const scale = $("#as", b).value === "1", round = $("#ar", b).value === "1";
      const raw = K.map(k => dot(Q[t], k)), sc = raw.map(v => scale ? v / Math.sqrt(dk) : v);
      const ex = sc.map(Math.exp), sum = ex.reduce((a, c) => a + c, 0);
      let al = ex.map(v => v / sum); const exact = al.slice();
      if (round) al = al.map(v => v < 0.1 ? 0 : Math.round(v * 10) / 10);
      const wv = V.map((v, i) => v.map(x => al[i] * x)), y = V[0].map((_, j) => wv.reduce((s, r) => s + r[j], 0));
      $("#ao", b).textContent =
        "Q = X·W_Q =\n" + mstr(Q) + "\nK = X·W_K =\n" + mstr(K) + "\nV = X·W_V =\n" + mstr(V) +
        "\n\nquery q" + (t + 1) + " = [" + Q[t].join(", ") + "]\nscores = " + K.map((k, i) => "q·k" + (i + 1) + " = " + fmt(raw[i])).join(",  ") +
        (scale ? "\n÷ √" + dk + " = [" + sc.map(v => fmt(v, 3)).join(", ") + "]" : "") +
        "\nsoftmax = [" + exact.map(v => fmt(v, 3)).join(", ") + "]" + (round ? "  → rounded [" + al.map(v => v.toFixed(1)).join(", ") + "]" : "") +
        "\n\n" + wv.map((r, i) => fmt(al[i], 3) + " × [" + V[i].join(", ") + "] = [" + r.map(v => fmt(v, 3)).join(", ") + "]").join("\n") +
        "\n\noutput y" + (t + 1) + " = [" + y.map(v => fmt(v, 3)).join(", ") + "]";
    };
    live(b, run);
  });

  /* ---------- flashcards ---------- */
  A("flashcards", el => flashcards(el, [
    ["1", "When did Transformers appear?", "2017, \"Attention is all you need\""],
    ["1", "What did Word2Vec (2013) introduce?", "Dense word vectors that capture meaning"],
    ["2", "Word vs character vs subword tokens", "Word: OOV problem, big vocabulary · Character: tiny vocabulary, long sequences · Subword: best of both"],
    ["2", "BPE in one line", "Start from characters; repeatedly merge the most frequent adjacent pair"],
    ["2", "Stemming vs lemmatisation", "Stemming removes affixes to get the stem (flies → fli); lemmatisation returns the lemma, the dictionary form (flies → fly)"],
    ["3", "Emission probability", "P(word | tag) = count(word as tag) / count(tag)"],
    ["3", "Transition probability", "P(tag₂ | tag₁) = count(tag₁ → tag₂) / transitions out of tag₁"],
    ["3", "HMM path score", "Multiply every transition and emission from <S> to <E>; highest wins"],
    ["3", "DT, JJ, NN, VB, MD", "Determiner, adjective, noun, verb, modal"],
    ["4", "NP chunk grammar", "{<DT>?<JJ>*<NN>}: optional determiner, any adjectives, a noun"],
    ["4", "4 NER entity types", "Person, organisation, location, date"],
    ["5", "3 problems with one-hot / BoW", "Sparse and huge · no meaning/similarity · can't handle OOV"],
    ["5", "Skip-gram positive vs negative samples", "Positive: real neighbours in the window · Negative: target + random word"],
    ["5", "Small vs large window", "Small → syntactic (same POS) · Large → topical"],
    ["5", "WordSim-353", "353 word pairs rated 0–10 by humans, used to evaluate embeddings"],
    ["6", "TDM rows and columns", "Rows = words, columns = documents; column = document vector"],
    ["6", "TTM", "|V| × |V| counts of words co-occurring within a window (about ±4)"],
    ["6", "Cosine similarity", "v·w / (|v| |w|), from 0 to 1 for counts"],
    ["7", "TF and IDF", "TF = log₁₀(count + 1) · IDF = log₁₀(N / df)"],
    ["7", "PPMI", "max(log₂[P(w,c) / (P(w)P(c))], 0)"],
    ["7", "TF-IDF vs PPMI", "TF-IDF → TDM (words × documents) · PPMI → TTM (words × words)"],
    ["8", "Naive assumption", "Each word is independent of the others (given the class)"],
    ["8", "Laplace smoothing", "(count + 1) / (words in class + vocabulary size)"],
    ["8", "Why ignore P(text)?", "It's the same for every class, so it doesn't change which is bigger"],
    ["8", "Precision vs recall", "Precision = TP/(TP+FP) · Recall = TP/(TP+FN)"],
    ["8", "Independent vs mutually exclusive", "Independent: P(A∩B) = P(A)P(B) · Mutually exclusive: P(A∩B) = 0"],
    ["9", "Logistic regression model", "z = w·x + b, σ(z) = 1/(1 + e^−z), class 1 if σ(z) > 0.5"],
    ["9", "N-grams", "Sequences of N consecutive items: unigram, bigram (\"brown fox\")…"],
    ["9", "Generative vs discriminative", "Naive Bayes: generative · Logistic regression: discriminative"],
    ["10", "Receptive field and stride", "Filter size sets the receptive field; stride = step size. Both are hyperparameters"],
    ["10", "Three repeated CNN operations", "Convolution, activation, pooling"],
    ["10", "Dropout", "Randomly disables neurons in training to reduce overfitting"],
    ["11", "Encoder / decoder / both", "BERT (classify, NER) · GPT (generate) · T5, BART (translate, summarise)"],
    ["11", "Q, K, V", "Q = XW_Q, K = XW_K, V = XW_V; output = softmax(QKᵀ/√d_k)V"],
    ["11", "Self-attention strength", "Captures long-range relationships; processes tokens in parallel"]
  ]));

  SPW.run();
})();
