const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const processBtn = document.getElementById("processBtn");
const clearBtn = document.getElementById("clearBtn");
const downloadBtn = document.getElementById("downloadBtn");
const selectionSummary = document.getElementById("selectionSummary");
const selectionTitle = document.getElementById("selectionTitle");
const selectionDetails = document.getElementById("selectionDetails");
const progressPanel = document.getElementById("progressPanel");
const statusText = document.getElementById("statusText");
const progressText = document.getElementById("progressText");
const progressBar = document.getElementById("progressBar");
const progressTrack = progressPanel.querySelector("[role='progressbar']");
const results = document.getElementById("results");
const resultList = document.getElementById("resultList");
const errorMessage = document.getElementById("errorMessage");

let selectedFiles = [];
let processedFiles = [];
let isProcessing = false;

const formatBytes = (bytes) => {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** unitIndex;

  return `${value.toFixed(unitIndex === 0 || value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

const outputName = (name) =>
  name.replace(/\.pdf$/i, "") + "_inverted.pdf";

const setProgress = (message, completed, total) => {
  const percentage = total ? Math.round((completed / total) * 100) : 0;
  statusText.textContent = message;
  progressText.textContent = `${percentage}%`;
  progressBar.style.width = `${percentage}%`;
  progressTrack.setAttribute("aria-valuenow", percentage);
};

const resetResults = () => {
  processedFiles.forEach(({ url }) => URL.revokeObjectURL(url));
  processedFiles = [];
  resultList.replaceChildren();
  results.hidden = true;
};

const renderSelection = () => {
  const count = selectedFiles.length;
  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);

  selectionSummary.hidden = count === 0;
  processBtn.disabled = count === 0 || isProcessing;
  selectionTitle.textContent = count === 1 ? selectedFiles[0].name : `${count} PDFs selected`;
  selectionDetails.textContent =
    count === 1
      ? formatBytes(totalSize)
      : `${formatBytes(totalSize)} total · ${selectedFiles.map((file) => file.name).join(", ")}`;
};

const selectFiles = (files) => {
  const incomingFiles = Array.from(files);
  const pdfFiles = incomingFiles.filter(
    (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"),
  );

  resetResults();
  errorMessage.hidden = true;
  selectedFiles = pdfFiles;
  renderSelection();

  if (incomingFiles.length && !pdfFiles.length) {
    errorMessage.textContent = "Please choose one or more PDF files.";
    errorMessage.hidden = false;
  } else if (incomingFiles.length !== pdfFiles.length) {
    errorMessage.textContent = "Some non-PDF files were skipped.";
    errorMessage.hidden = false;
  }
};

const prependWhiteBackground = (pdf, page, { x, y, width, height }) => {
  const {
    fill,
    popGraphicsState,
    pushGraphicsState,
    rectangle,
    rgb,
    setFillingColor,
  } = PDFLib;

  // A PDF page's white background is often implicit rather than painted.
  // Add a real white layer before the original streams so Difference blend
  // mode can invert the empty parts of the page as well as its content.
  page.node.normalize();
  const backgroundStream = page.createContentStream(
    pushGraphicsState(),
    setFillingColor(rgb(1, 1, 1)),
    rectangle(x, y, width, height),
    fill(),
    popGraphicsState(),
  );
  const backgroundRef = pdf.context.register(backgroundStream);
  const contents = page.node.Contents();

  if (contents) {
    contents.insert(0, backgroundRef);
  } else {
    page.node.addContentStream(backgroundRef);
  }
};

const invertPdf = async (file, onPageComplete) => {
  const { PDFDocument, BlendMode, rgb } = PDFLib;
  const sourceBytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(sourceBytes, { updateMetadata: false });
  const pages = pdf.getPages();

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const page = pages[pageIndex];
    const bounds = page.getCropBox();
    const { x, y, width, height } = bounds;

    prependWhiteBackground(pdf, page, bounds);

    page.drawRectangle({
      x,
      y,
      width,
      height,
      color: rgb(1, 1, 1),
      borderWidth: 0,
      blendMode: BlendMode.Difference,
    });

    onPageComplete(pageIndex + 1, pages.length);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return pdf.save();
};

const addResult = (file, blob) => {
  const url = URL.createObjectURL(blob);
  const name = outputName(file.name);
  processedFiles.push({ name, blob, url });

  const row = document.createElement("div");
  row.className = "result-item";

  const details = document.createElement("div");
  details.className = "result-details";

  const badge = document.createElement("span");
  badge.className = "result-badge";
  badge.textContent = "PDF";

  const copy = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = name;
  const meta = document.createElement("small");
  meta.textContent = `${formatBytes(blob.size)} · vectors preserved`;
  copy.append(title, meta);

  const link = document.createElement("a");
  link.className = "download-link";
  link.href = url;
  link.download = name;
  link.textContent = "Download";

  details.append(badge, copy);
  row.append(details, link);
  resultList.append(row);
};

fileInput.addEventListener("change", () => selectFiles(fileInput.files));

clearBtn.addEventListener("click", () => {
  fileInput.value = "";
  selectedFiles = [];
  resetResults();
  errorMessage.hidden = true;
  progressPanel.hidden = true;
  renderSelection();
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    if (!isProcessing) dropZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-dragging");
  });
});

dropZone.addEventListener("drop", (event) => {
  if (!isProcessing) selectFiles(event.dataTransfer.files);
});

processBtn.addEventListener("click", async () => {
  if (!selectedFiles.length || isProcessing) return;

  isProcessing = true;
  resetResults();
  errorMessage.hidden = true;
  progressPanel.hidden = false;
  processBtn.classList.add("is-loading");
  processBtn.querySelector(".button-label").textContent = "Inverting…";
  fileInput.disabled = true;
  clearBtn.disabled = true;
  renderSelection();

  try {
    for (let fileIndex = 0; fileIndex < selectedFiles.length; fileIndex += 1) {
      const file = selectedFiles[fileIndex];
      setProgress(
        `Reading ${file.name} (${fileIndex + 1} of ${selectedFiles.length})`,
        fileIndex,
        selectedFiles.length,
      );

      const pdfBytes = await invertPdf(file, (pageNumber, pageCount) => {
        setProgress(
          `Inverting ${file.name} · page ${pageNumber} of ${pageCount}`,
          fileIndex + pageNumber / pageCount,
          selectedFiles.length,
        );
      });

      addResult(file, new Blob([pdfBytes], { type: "application/pdf" }));
    }

    setProgress("All PDFs are ready", 1, 1);
    results.hidden = false;
    results.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    console.error(error);
    const isEncrypted = /encrypted|password/i.test(error.message);
    errorMessage.textContent = isEncrypted
      ? "This PDF is password-protected. Unlock it first, then try again."
      : "We couldn't process this PDF. It may be damaged or use an unsupported feature.";
    errorMessage.hidden = false;
    progressPanel.hidden = true;
  } finally {
    isProcessing = false;
    processBtn.classList.remove("is-loading");
    processBtn.querySelector(".button-label").textContent = "Invert colours";
    fileInput.disabled = false;
    clearBtn.disabled = false;
    renderSelection();
  }
});

downloadBtn.addEventListener("click", () => {
  processedFiles.forEach(({ name, url }, index) => {
    setTimeout(() => {
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
    }, index * 250);
  });
});

window.addEventListener("beforeunload", () => {
  processedFiles.forEach(({ url }) => URL.revokeObjectURL(url));
});
