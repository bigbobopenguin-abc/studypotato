/* Interactive widgets for EG2A55 Sustainable Product Design & Life Cycle Management.
   Uses SPW from assets/widgets-core.js. */
(function () {
  "use strict";
  const { $, $$, fmt, esc, shell, live, flashcards } = window.SPW;
  const A = SPW.add;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const money = v => "$" + (Math.round(v * 100) / 100).toFixed(2);

  /* ---------- process finder (Table 2.1) ---------- */
  const PROC = [
    { n: "Die casting", mats: ["al", "zn"], vmin: 10000, vmax: Infinity, tol: 0.1, tool: "$10,000–80,000+", lead: "6–12 weeks", solid: true, sheet: false },
    { n: "Injection molding", mats: ["plastic"], vmin: 1000, vmax: Infinity, tol: 0.05, tool: "$5,000–100,000+", lead: "2–12 weeks", solid: true, sheet: true },
    { n: "Sheet metal forming", mats: ["al", "steel", "ti"], vmin: 50, vmax: Infinity, tol: 0.1, tool: "$500–20,000+", lead: "1–5 days", solid: false, sheet: true },
    { n: "CNC machining", mats: ["plastic", "al", "zn", "steel", "ti"], vmin: 1, vmax: 5000, tol: 0.025, tool: "None", lead: "1–5 days", solid: true, sheet: true },
    { n: "3D printing", mats: ["plastic", "al", "steel", "ti"], vmin: 1, vmax: 500, tol: 0.1, tool: "None", lead: "1–3 days", solid: true, sheet: true, partial: ["al", "steel", "ti"] }
  ];
  A("finder", el => {
    const b = shell(el, "process finder, using the Table 2.1 data");
    b.innerHTML = '<div class="wrow"><label>Material<select id="fm"><option value="plastic">Thermoplastic (e.g. ABS)</option><option value="al">Aluminium</option><option value="zn">Zinc / magnesium alloy</option><option value="steel">Steel</option><option value="ti">Titanium</option></select></label><label>Shape<select id="fs"><option value="solid">Solid / complex 3D</option><option value="sheet">Sheet-like (panel, bracket)</option></select></label><label>Units per year<input type="number" id="fv" value="50000" min="1"></label><label>Tolerance needed (± mm)<input type="number" id="ft" value="0.1" step="0.01" min="0.005"></label></div><div class="tbl"><table><thead><tr><th>Process</th><th>Fit</th><th>Why</th></tr></thead><tbody id="fo"></tbody></table></div><p class="sub" id="fx"></p>';
    live(b, () => {
      const m = $("#fm", b).value, sh = $("#fs", b).value, v = Math.max(1, +$("#fv", b).value || 1), t = +$("#ft", b).value || 0.1;
      const rows = PROC.map(p => {
        const why = []; let score = 0, ok = true;
        if (!p.mats.includes(m)) { ok = false; why.push("✗ material not compatible"); } else if (p.partial && p.partial.includes(m)) { score += 1; why.push("~ material possible (metal printing is limited/growing)"); } else { score += 2; why.push("✓ material compatible"); }
        if (sh === "solid" && !p.solid) { ok = false; why.push("✗ sheet-form parts only"); }
        if (v < p.vmin) { score -= 1; why.push("✗ " + v.toLocaleString() + " units is too few to pay off " + p.tool + " tooling"); }
        else if (v > p.vmax) { score -= 1; why.push("✗ above its best range (≤ " + p.vmax.toLocaleString() + "), unit cost too high"); }
        else { score += 2; why.push("✓ volume in range"); }
        if (p.tol <= t) { score += 1; why.push("✓ can hold ±" + t + " mm (typical ±" + p.tol + ")"); } else { score -= 1; why.push("✗ typical ±" + p.tol + " mm is looser than ±" + t); }
        why.push("tooling " + p.tool + ", first part " + p.lead);
        return { p, ok, score: ok ? score : -9, why };
      }).sort((a, c) => c.score - a.score);
      $("#fo", b).innerHTML = rows.map((r, i) => "<tr><td><b>" + r.p.n + "</b></td><td>" + (r.score >= 5 ? '<span style="color:var(--ok);font-weight:700">Strong</span>' : r.score >= 3 ? '<span style="color:var(--trap);font-weight:700">Possible</span>' : '<span style="color:var(--bad);font-weight:700">Poor</span>') + "</td><td>" + r.why.join("<br>") + "</td></tr>").join("");
      $("#fx", b).textContent = "This is a first filter only. Joining isn't listed because it connects parts rather than making them. Use the selection matrix in Topic 2 to make and justify the final choice.";
    });
  });

  /* ---------- weighted selection matrix ---------- */
  const CRIT = ["Production volume suitability", "Unit cost at volume", "Dimensional accuracy", "Material compatibility", "Surface finish quality", "Tooling lead time"];
  const PRE = {
    "Plastic housing (ABS, 50,000/yr)": { w: [.25, .25, .15, .15, .10, .10], p: { "Injection molding": [5, 5, 4, 5, 5, 2], "CNC machining": [2, 2, 5, 4, 4, 5], "3D printing": [1, 1, 3, 3, 2, 5] } },
    "Titanium surgical bracket (500/yr)": { w: [.15, .10, .30, .25, .20, 0], p: { "CNC machining": [4, 3, 5, 5, 5, 4], "Die casting": [2, 3, 2, 1, 3, 1], "Metal 3D printing (DMLS)": [4, 2, 3, 4, 2, 5] } },
    "Aluminium heat sink (10,000/yr)": { w: [.25, .30, .10, .20, .05, .10], p: { "Extrusion (forming)": [5, 5, 3, 5, 4, 4], "Die casting": [5, 4, 3, 4, 4, 2], "CNC machining": [3, 2, 5, 5, 5, 5] } },
    "Blank: build your own": { w: [.2, .2, .2, .2, .1, .1], p: { "Process 1": [3, 3, 3, 3, 3, 3], "Process 2": [3, 3, 3, 3, 3, 3], "Process 3": [3, 3, 3, 3, 3, 3] } }
  };
  A("matrix", el => {
    const b = shell(el, "weighted selection matrix");
    b.innerHTML = '<div class="wrow"><label>Load a case<select id="mp">' + Object.keys(PRE).map(k => "<option>" + k + "</option>").join("") + '</select></label></div><div class="tbl"><table id="mt"></table></div><div class="out" id="mo" style="white-space:pre-wrap"></div>';
    let names, w, r;
    const load = k => { const p = PRE[k]; names = Object.keys(p.p); w = p.w.slice(); r = names.map(n => p.p[n].slice()); render(); };
    const render = () => {
      const head = "<tr><th>Criterion</th><th>Weight</th>" + names.map((n, j) => '<th><input type="text" data-n="' + j + '" value="' + esc(n) + '" style="width:12.5em;font-weight:700"><br><small>rating → weighted</small></th>').join("") + "</tr>";
      const body = CRIT.map((c, i) => "<tr><td>" + c + '</td><td><input type="number" step="0.05" min="0" max="1" data-w="' + i + '" value="' + w[i] + '" style="width:5em"></td>' + names.map((_, j) => '<td><select data-r="' + i + "," + j + '">' + [1, 2, 3, 4, 5].map(v => "<option" + (r[j][i] === v ? " selected" : "") + ">" + v + "</option>").join("") + '</select> <span data-s="' + i + "," + j + '"></span></td>').join("") + "</tr>").join("");
      $("#mt", b).innerHTML = head + body + '<tr><td><b>Total</b></td><td><b id="mw"></b></td>' + names.map((_, j) => '<td><b data-t="' + j + '"></b></td>').join("") + "</tr>";
      $$("#mt input,#mt select", b).forEach(x => x.addEventListener("input", read));
      calc();
    };
    const read = e => {
      const t = e.target;
      if (t.dataset.n !== undefined) names[+t.dataset.n] = t.value || "Process " + (+t.dataset.n + 1);
      if (t.dataset.w !== undefined) w[+t.dataset.w] = Math.max(0, +t.value || 0);
      if (t.dataset.r !== undefined) { const [i, j] = t.dataset.r.split(",").map(Number); r[j][i] = +t.value; }
      calc();
    };
    const calc = () => {
      const ws = w.reduce((a, c) => a + c, 0);
      $("#mw", b).textContent = fmt(ws, 2); $("#mw", b).style.color = Math.abs(ws - 1) < 1e-9 ? "var(--ok)" : "var(--bad)";
      const tot = names.map((_, j) => CRIT.reduce((s, _, i) => s + w[i] * r[j][i], 0));
      CRIT.forEach((_, i) => names.forEach((_, j) => { $('[data-s="' + i + "," + j + '"]', b).textContent = "→ " + fmt(w[i] * r[j][i], 2); }));
      const best = tot.indexOf(Math.max(...tot));
      names.forEach((_, j) => { const t = $('[data-t="' + j + '"]', b); t.textContent = fmt(tot[j], 2); t.style.color = j === best ? "var(--ok)" : ""; });
      // auto write-up
      let weak = -1, gap = 0, runner = null;
      names.forEach((_, j) => { if (j === best) return; CRIT.forEach((_, i) => { const g = (r[j][i] - r[best][i]) * (w[i] > 0 ? 1 : 0); if (g > gap || (g === gap && g > 0 && w[i] > w[weak])) { gap = g; weak = i; runner = [tot[j], j]; } }); });
      let txt = (Math.abs(ws - 1) > 1e-9 ? "⚠ Weights add up to " + fmt(ws, 2) + ". Adjust them to total 1.00.\n\n" : "") +
        "Recommendation: " + names[best] + " (" + fmt(tot[best], 2) + ", highest total).\n" +
        "Key trade-off: " + (weak >= 0 ? names[best] + " is weaker on " + CRIT[weak].toLowerCase() + " (" + r[best][weak] + " vs " + r[runner[1]][weak] + " for " + names[runner[1]] + ")." : "no criterion where another process rates higher.") + "\n" +
        "Final decision: justify it against the product requirements, then add one sustainability point (energy, waste, recyclability).";
      $("#mo", b).textContent = txt;
    };
    $("#mp", b).addEventListener("input", e => load(e.target.value));
    load(Object.keys(PRE)[0]);
  });

  /* ---------- sorter quiz (generic) ---------- */
  function sorter(el, title, cats, items) {
    const b = shell(el, title);
    b.innerHTML = '<div class="out" id="sq" style="white-space:normal;font-family:var(--f-body);font-size:16px;min-height:3.2em"></div><div class="wrow" id="sb" style="margin-top:10px"></div><p class="sub" id="sf" style="min-height:1.5em"></p><p class="sub"><b id="ss">0 / 0</b> correct · <button class="btn ghost" type="button" id="sn" style="height:28px">Skip</button></p>';
    let deck = shuffle(items), i = 0, right = 0, done = 0, locked = false;
    $("#sb", b).innerHTML = cats.map(c => '<button class="btn ghost" type="button" data-c="' + esc(c) + '">' + esc(c) + "</button>").join("");
    const show = () => { if (i >= deck.length) { deck = shuffle(items); i = 0; } locked = false; $("#sq", b).textContent = deck[i][0]; $("#sf", b).textContent = ""; $$("#sb button", b).forEach(x => { x.style.background = ""; x.style.color = ""; }); };
    $$("#sb button", b).forEach(btn => btn.addEventListener("click", () => {
      if (locked) return; locked = true; done++;
      const [, ans, why] = deck[i], ok = btn.dataset.c === ans;
      if (ok) right++;
      $$("#sb button", b).forEach(x => { if (x.dataset.c === ans) { x.style.background = "var(--ok)"; x.style.color = "#fff"; } });
      if (!ok) { btn.style.background = "var(--bad)"; btn.style.color = "#fff"; }
      $("#sf", b).innerHTML = (ok ? "<b style='color:var(--ok)'>Correct.</b> " : "<b style='color:var(--bad)'>It's " + esc(ans) + ".</b> ") + esc(why || "");
      $("#ss", b).textContent = right + " / " + done;
      i++; setTimeout(show, ok ? 1100 : 2600);
    }));
    $("#sn", b).addEventListener("click", () => { i++; show(); });
    show();
  }
  A("plcstage", el => sorter(el, "which PLC stage is this?", ["Introduction", "Growth", "Maturity", "Decline"], [
    ["A new bottle has just launched; few people know about it and the company is collecting reviews.", "Introduction", "Low sales, building awareness, flexible small-batch production."],
    ["Sales are rising fast and the company buys more equipment and orders more stainless steel.", "Growth", "Increase capacity while keeping quality."],
    ["Many competing brands exist, so the company adds new colours and cuts production cost.", "Maturity", "High sales, slowing growth: differentiate and reduce unit cost."],
    ["A newer smart bottle takes over; the company reduces production and clears stock.", "Decline", "Manage falling demand and decide the product's future."],
    ["Profit is low or negative because development and promotion costs are high.", "Introduction", "Typical of a newly launched product."],
    ["The market is close to saturation and prices are under pressure.", "Maturity", "Competition intensifies, so the focus is efficiency."],
    ["The company improves supplier coordination and standardises processes to keep up with demand.", "Growth", "Scaling up production."],
    ["The company is deciding whether to redesign, reposition, replace or discontinue the product.", "Decline", "Those are the four options in the decline stage."],
    ["Production uses flexible methods so the design can still change easily.", "Introduction", "Design changes are likely early on."],
    ["The priority is avoiding overproduction and excess inventory.", "Decline", "Demand is falling."]
  ]));
  A("whichone", el => sorter(el, "PLC, PLM or LCM?", ["PLC", "PLM", "LCM"], [
    ["Deciding whether to discontinue a bottle whose sales are falling.", "PLC", "Market performance."],
    ["Controlling a revised bottle-cap design with an engineering change order.", "PLM", "Product information and changes."],
    ["Comparing the whole-life impacts of aluminium vs plastic bottles.", "LCM", "Whole-life sustainability."],
    ["Making sure purchasing orders from the latest approved BOM.", "PLM", "BOM and revision control."],
    ["Running a Life-Cycle Assessment (LCA).", "LCM", "LCA is an LCM tool."],
    ["Tracking sales, demand and market share over time.", "PLC", "Market data."],
    ["Designing the bottle for easy disassembly so it can be recycled.", "LCM", "End-of-life sustainability."],
    ["Keeping a record of Rev A, B and C of a drawing.", "PLM", "Revision control."],
    ["Measuring energy use, emissions and waste across the bottle's life.", "LCM", "Environmental impacts."],
    ["Planning more production capacity because the product is in its growth stage.", "PLC", "Market stage guides capacity."]
  ]));

  /* ---------- BOM roll-up ---------- */
  const BOMS = {
    "Bracket assembly (single-level)": [["Bracket assembly", 1, null, [["Bracket", 1, 2.5], ["Screw", 4, 0.1], ["Washer", 4, 0.05], ["Nut", 4, 0.08]]]],
    "Water bottle (multi-level)": [["Water bottle", 1, null, [
      ["Body subassembly", 1, null, [["Outer shell (stainless)", 1, 3.2], ["Inner wall (stainless)", 1, 2.8]]],
      ["Cap subassembly", 1, null, [["Cap", 1, 0.9], ["Sealing ring (silicone)", 1, 0.15], ["Handle", 1, 0.4]]]
    ]]]
  };
  A("bom", el => {
    const b = shell(el, "BOM cost roll-up (Unit Cost)");
    b.innerHTML = '<div class="wrow"><label>BOM<select id="bp">' + Object.keys(BOMS).map(k => "<option>" + k + "</option>").join("") + '</select></label></div><div class="tbl"><table><thead><tr><th>Level</th><th>Item</th><th>Qty</th><th>Unit cost</th><th>Line cost</th></tr></thead><tbody id="bt"></tbody></table></div><div class="out" id="bo"></div>';
    let tree;
    const clone = t => t.map(n => [n[0], n[1], n[2], n[3] ? clone(n[3]) : null]);
    const cost = n => n[3] ? n[3].reduce((s, c) => s + c[1] * cost(c), 0) : n[2];
    const rows = (nodes, lvl, path) => nodes.flatMap((n, i) => {
      const p = path.concat(i), u = cost(n);
      const row = "<tr><td>" + lvl + '</td><td style="padding-left:' + (12 + lvl * 18) + 'px">' + (n[3] ? "<b>" + esc(n[0]) + "</b>" : esc(n[0])) + '</td><td><input type="number" min="0" step="1" data-q="' + p.join(".") + '" value="' + n[1] + '" style="width:4.5em"></td><td>' + (n[3] ? "<i>" + money(u) + " (rolled up)</i>" : '<input type="number" min="0" step="0.01" data-c="' + p.join(".") + '" value="' + n[2] + '" style="width:6em">') + "</td><td>" + money(n[1] * u) + "</td></tr>";
      return [row].concat(n[3] ? rows(n[3], lvl + 1, p) : []);
    });
    const at = path => { let n = null, list = tree; path.split(".").map(Number).forEach(i => { n = list[i]; list = n[3]; }); return n; };
    const render = () => {
      $("#bt", b).innerHTML = rows(tree, 0, []).join("");
      $$("#bt input", b).forEach(x => x.addEventListener("change", e => { const t = e.target; if (t.dataset.q) at(t.dataset.q)[1] = Math.max(0, +t.value || 0); else at(t.dataset.c)[2] = Math.max(0, +t.value || 0); render(); }));
      const top = tree[0];
      const parts = top[3].map(c => c[1] + " × " + c[0] + " (" + money(cost(c)) + ")").join(" + ");
      $("#bo", b).textContent = "Unit cost of " + top[0] + " = " + parts + "\n= " + money(cost(top)) + "\nChange a quantity or cost and the parent costs update automatically, just as a parent's cost comes from its BOM.";
    };
    $("#bp", b).addEventListener("input", e => { tree = clone(BOMS[e.target.value]); render(); });
    tree = clone(BOMS[Object.keys(BOMS)[0]]); render();
  });

  /* ---------- cost base hierarchy ---------- */
  A("costbase", el => {
    const b = shell(el, "which cost value applies?");
    const B = ["Target", "Estimated", "Calculated", "Actual"], D = [5, 6, 6.2, 6.4];
    b.innerHTML = '<div class="wrow">' + B.map((n, i) => '<label><span><input type="checkbox" id="cb' + i + '"' + (i < 2 ? " checked" : "") + "> " + n + '</span><input type="number" step="0.1" id="cv' + i + '" value="' + D[i] + '"></label>').join("") + '</div><div class="out" id="co"></div>';
    live(b, () => {
      const set = B.map((n, i) => $("#cb" + i, b).checked ? [n, +$("#cv" + i, b).value] : null);
      const top = [...set].reverse().find(Boolean);
      const tgt = set[0];
      $("#co", b).textContent = !top ? "Tick at least one cost base." :
        "Values set: " + set.filter(Boolean).map(x => x[0] + " $" + x[1].toFixed(2)).join(", ") +
        "\nApplies: " + top[0] + " ($" + top[1].toFixed(2) + "): the highest base that is set overrides the lower ones." +
        (tgt && top[0] !== "Target" ? "\nCompared with the target: " + (top[1] > tgt[1] ? "$" + (top[1] - tgt[1]).toFixed(2) + " over target" : top[1] < tgt[1] ? "$" + (tgt[1] - top[1]).toFixed(2) + " under target" : "on target") : "");
    });
  });

  /* ---------- put the steps in order ---------- */
  const SEQ = {
    "ECO process (7 steps)": ["Identify the problem or improvement", "Describe the proposed change", "Identify affected Parts, Documents and BOMs", "Evaluate technical, cost, quality and production impacts", "Review and approve", "Update affected records and revisions", "Implement and maintain traceability"],
    "Process selection framework (5 steps)": ["Define product requirements", "Identify candidate processes", "Evaluate alternatives", "Select optimal process", "Justify decision"],
    "PLC stages": ["Introduction", "Growth", "Maturity", "Decline"],
    "PLM stages": ["Conception & ideation", "Design & development", "Production & launch", "Service & maintenance", "End-of-life management"],
    "LCM life cycle stages": ["Raw materials", "Manufacturing", "Packaging & distribution", "Product use", "End-of-life"],
    "PLM software workflow": ["Part", "Document", "BOM", "Revision", "Costing", "ECO"]
  };
  A("order", el => {
    const b = shell(el, "put the steps in the right order");
    b.innerHTML = '<div class="wrow"><label>Sequence<select id="os">' + Object.keys(SEQ).map(k => "<option>" + k + "</option>").join("") + '</select></label><button class="btn ghost" type="button" id="or">Shuffle again</button></div><ol id="od" style="margin:0 0 10px;min-height:1.6em"></ol><div class="wrow" id="ob"></div><p class="sub" id="of"></p>';
    let seq, got, miss;
    const start = () => {
      seq = SEQ[$("#os", b).value]; got = 0; miss = 0;
      $("#od", b).innerHTML = ""; $("#of", b).textContent = "Tap the first step.";
      $("#ob", b).innerHTML = shuffle(seq.map((s, i) => [s, i])).map(([s, i]) => '<button class="btn ghost" type="button" data-i="' + i + '">' + esc(s) + "</button>").join("");
      $$("#ob button", b).forEach(x => x.addEventListener("click", () => {
        if (+x.dataset.i === got) {
          $("#od", b).insertAdjacentHTML("beforeend", "<li>" + esc(seq[got]) + "</li>"); x.remove(); got++;
          $("#of", b).innerHTML = got === seq.length ? "<b style='color:var(--ok)'>Done!</b> " + (miss ? miss + " wrong tap" + (miss > 1 ? "s" : "") + ". Shuffle and try again for a clean run." : "Perfect order.") : "Good. Now step " + (got + 1) + ".";
        } else { miss++; x.animate && x.animate([{ transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "none" }], { duration: 250 }); $("#of", b).innerHTML = "<b style='color:var(--bad)'>Not that one.</b> Which comes at step " + (got + 1) + "?"; }
      }));
    };
    $("#os", b).addEventListener("input", start); $("#or", b).addEventListener("click", start);
    start();
  });

  /* ---------- flashcards ---------- */
  A("flashcards", el => flashcards(el, [
    ["1", "Manufacturing vs production", "Manufacturing: how do we make it? Production: how do we produce enough efficiently and deliver it? Manufacturing is part of production."],
    ["1", "4 production systems", "Job (unit), batch, mass, continuous (process)"],
    ["1", "6 manufacturing process categories", "Casting, molding, forming, machining, joining, additive (3D printing)"],
    ["1", "Casting and molding share…", "A cavity defines the shape of the final product"],
    ["1", "Forming vs machining", "Forming: productivity and material efficiency. Machining: precision and flexibility."],
    ["1", "Swarf", "Material removed during machining; can be collected and recycled"],
    ["1", "Additive manufacturing is best for…", "Prototypes, personalised products, complex low-volume parts, aerospace and medical"],
    ["1", "6 AM categories", "Vat photopolymerisation, material extrusion, powder bed fusion, binder jetting, directed energy deposition, sheet lamination"],
    ["1", "10 selection factors", "Material, geometry, volume, quality, cost, time, equipment, labour, sustainability, flexibility"],
    ["1", "Mass production principles", "Repeatability and consistency, cost efficiency, quality control and process optimisation"],
    ["2", "Selection matrix formula", "Weighted score = weight × rating; total = sum; weights add to 1.00; ratings 1–5"],
    ["2", "6 matrix criteria", "Volume, unit cost, dimensional accuracy, material compatibility, surface finish, tooling lead time"],
    ["2", "5-step framework", "Define requirements → identify candidates → evaluate → select → justify"],
    ["2", "Matrix write-up ends with…", "Recommendation, key trade-off, final decision"],
    ["2", "Technical / economic / sustainability factors", "Geometry, material, accuracy / volume, tooling, labour / energy, waste, recyclability"],
    ["2", "Tightest typical tolerance in Table 2.1", "CNC machining, ±0.025 mm"],
    ["3", "PLC stages", "Introduction → growth → maturity → decline"],
    ["3", "PLM definition", "Managing product information, processes and collaboration across the whole product lifecycle"],
    ["3", "PLM stages", "Conception → design → production & launch → service → end-of-life"],
    ["3", "PDM vs PLM", "PDM manages product data (CAD, BOM, revisions); PLM adds processes, ECO workflows and collaboration. PDM is part of PLM."],
    ["3", "LCM definition", "Managing a product's environmental, economic and social impacts across its whole life cycle"],
    ["3", "LCM stages", "Raw materials → manufacturing → packaging & distribution → use → end-of-life"],
    ["3", "3 dimensions of sustainability", "Environmental, economic, social"],
    ["3", "PLC / PLM / LCM key questions", "How is it selling? / How do we manage its information and changes? / How can we improve its whole-life impacts?"],
    ["4", "6 PLM software concepts", "Part, Document, BOM, Revision, Costing, ECO"],
    ["4", "Part vs CAD file", "The Part identifies the engineering item; the CAD file represents its geometry"],
    ["4", "Single vs multi-level BOM", "Single: one level, no subassemblies. Multi: subassemblies broken into further subassemblies."],
    ["4", "Part number vs revision", "Part number identifies the item; revision identifies the version"],
    ["4", "Cost hierarchy", "Target < Estimated < Calculated < Actual; the highest set base overrides"],
    ["4", "Calculated cost", "Sum of the children's Estimated and/or Actual values"],
    ["4", "ECO vs revision", "The ECO controls the change process; the revision identifies the resulting version"],
    ["4", "Assigned Creator", "The owner, responsible for designing the part (not necessarily who typed it in)"]
  ]));

  SPW.run();
})();
