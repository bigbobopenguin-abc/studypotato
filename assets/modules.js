/* The list of modules shown on the home page.
   To add a module: copy modules/_template/ to modules/<slug>/, fill it in, then add an entry here.
   exam: "YYYY-MM-DD" (leave "" if unknown) drives the countdown; color sets the card colour.
   topics: [section id, number, short name] for each topic, in order (used for "Up next" and the progress bar). */
window.MODULES = [
  {
    slug: "applied-deep-learning",
    code: "EGT214",
    title: "Applied Deep Learning",
    desc: "Neural networks, activations, loss functions, backprop and optimizers, Keras, and CNNs.",
    exam: "2026-12-11",
    color: "#2457d6", hot: "#ea6a1f",
    topics: [
      ["t1", "1", "Intro to DL"], ["t21", "2.1", "NN fundamentals"], ["t22", "2.2", "Build NN in Python"],
      ["t23", "2.3", "Activations"], ["t24", "2.4", "Loss functions"], ["t25", "2.5", "Backprop & optimizers"],
      ["t3", "3", "Keras"], ["t41", "4.1", "CNN fundamentals"], ["t42", "4.2", "CNN layers"], ["t43", "4.3", "CNN image classification"]
    ]
  },
  {
    slug: "nlp",
    code: "NLP",
    title: "Natural Language Processing",
    desc: "Tokenisation, POS tagging and HMM, NER, vectorisation, TF-IDF and PPMI, Naive Bayes, logistic regression, CNN and Transformers.",
    exam: "2026-11-30",
    color: "#0b8174", hot: "#d9466f",
    topics: [
      ["n1", "1", "Intro to NLP"], ["n2", "2", "Pre-processing & tokens"], ["n3", "3", "POS tagging & HMM"],
      ["n4", "4", "NER & chunking"], ["n5", "5", "Semantics & vectorisation"], ["n6", "6", "TDM, TTM & cosine"],
      ["n7", "7", "TF-IDF & PPMI"], ["n8", "8", "Naive Bayes"], ["n9", "9", "Logistic regression"],
      ["n10", "10", "CNN"], ["n11", "11", "Transformers"]
    ]
  },
  {
    slug: "eg2a55",
    code: "EG2A55",
    title: "Product Design & Life Cycle",
    desc: "Manufacturing processes, the process selection matrix, PLC, PLM, LCM and PLM software (Part, BOM, Revision, Costing, ECO).",
    exam: "",
    color: "#2f7a3a", hot: "#c8780a",
    topics: [
      ["m1", "1.1", "Manufacturing vs production"], ["m2", "1.2", "The six process categories"], ["m3", "1.3", "Selection factors"],
      ["m4", "2", "Process selection matrix"], ["m5", "3.1", "Product Life Cycle (PLC)"], ["m6", "3.2", "PLM"],
      ["m7", "3.3", "LCM & comparison"], ["m8", "4", "PLM software: 6 concepts"]
    ]
  }
];
