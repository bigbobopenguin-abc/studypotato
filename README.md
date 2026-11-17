# studypotato

Interactive revision notes, one page per module. Plain HTML, CSS and JavaScript with no build step, served by GitHub Pages.

## Modules

| Module | Page |
| --- | --- |
| EGT214 Applied Deep Learning | `modules/applied-deep-learning/` |

## Features

- Topic sidebar with "Mark revised" progress (saved in your browser)
- Search across the page (press `/`)
- Recall mode: hides worked answers until you tap them
- Clickable MCQs with a running score, and self-marked written questions
- Flashcards
- Interactive calculators (Applied Deep Learning: neuron, activation plots, softmax, cross-entropy, backprop, gradient descent, learning-rate decay, convolution and pooling, and a CNN shape/parameter builder)
- Light and dark theme

## Adding a module

1. Copy `modules/_template/` to `modules/<slug>/` (for example `modules/data-structures/`).
2. Set `data-module="<slug>"` on its `<body>` and write the notes as `<section>` blocks.
3. Add an entry to `assets/modules.js` so it shows on the home page.

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.
