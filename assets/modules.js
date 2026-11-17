/* The list of modules shown on the home page.
   To add a module: copy modules/_template/ to modules/<slug>/, fill it in, then add an entry here.
   exam: "YYYY-MM-DD" (leave "" if unknown) — drives the countdown. */
window.MODULES = [
  {
    slug: "applied-deep-learning",
    code: "EGT214",
    title: "Applied Deep Learning",
    desc: "Neural networks, activations, loss functions, backprop and optimizers, Keras, and CNNs. Topics 1 to 4.3.",
    exam: "2026-12-08",
    tags: ["Calculators", "Quiz", "Flashcards"]
  },
  {
    slug: "nlp",
    code: "NLP",
    title: "Natural Language Processing",
    desc: "Tokenisation, POS tagging and HMM, NER, vectorisation, TF-IDF and PPMI, Naive Bayes, logistic regression, CNN and Transformers.",
    exam: "2026-12-01",
    tags: ["Calculators", "Quiz", "Flashcards"]
  }
];
