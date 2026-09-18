# PDF Colour Inverter

A privacy-first browser tool for turning bright PDFs into dark-mode-friendly documents without rasterising their pages.

Choose one or more PDF files, invert their colours locally in your browser, and download the generated PDFs. Files are never uploaded to a server.

## Features

- Inverts one or multiple PDFs in a single run
- Drag-and-drop and file-picker support
- Preserves selectable text, links, and vector graphics
- Keeps output sharp at any zoom level
- Shows per-file progress and provides individual or bulk downloads
- Rejects non-PDF files before processing
- Uses no backend, build step, or application framework

## Run locally

The project is a static website. Because browsers restrict some file and script behaviour when opening pages directly from `file://`, serve the project with a local HTTP server.

For example, with Python installed:

```bash
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in a browser.

Alternatively, use any static-file server of your choice. No package installation is required.

## Usage

1. Drop PDF files onto the upload area, or click **browse files**.
2. Click **Invert colours**.
3. Download each converted file, or click **Download all**.

Generated files use the original filename with `_inverted` appended, for example:

```text
paper.pdf -> paper_inverted.pdf
```

## How it works

The app uses [`pdf-lib`](https://github.com/Hopding/pdf-lib) in the browser. For each page, it:

1. Adds an explicit white page background so implicit white areas are inverted too.
2. Draws a full-page white rectangle using the PDF `Difference` blend mode.
3. Saves the modified PDF and exposes it as a local browser download.

The original file is read into memory and the resulting PDF is generated locally. Object URLs are revoked when results are cleared or the page is closed.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Page structure, upload controls, status messages, and CDN dependency |
| `styles.css` | Responsive visual design and component states |
| `app.js` | File selection, PDF inversion, progress reporting, and downloads |
| `LICENSE` | MIT license |

## Limitations

- Password-protected or encrypted PDFs are not supported unless unlocked first.
- Signed PDFs may no longer have a valid signature after modification.
- Very large or complex PDFs can require substantial browser memory.
- The app depends on the browser being able to load `pdf-lib` from `unpkg.com`; for an offline deployment, vendor that dependency locally and update the script reference in `index.html`.
- PDF features unsupported by `pdf-lib` may fail during processing.

## Browser support

The app uses standard browser APIs including the File API, drag-and-drop events, Blob URLs, and modern JavaScript. Use a current version of Chrome, Edge, Firefox, or Safari for the best experience.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
