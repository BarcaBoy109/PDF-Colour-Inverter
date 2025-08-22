const fileInput = document.getElementById("fileInput");
const processBtn = document.getElementById("processBtn");
const downloadBtn = document.getElementById("downloadBtn");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let processedFiles = []; // Store {name, blob}

processBtn.addEventListener("click", async () => {
  if (!fileInput.files.length) {
    alert("Please upload at least one PDF!");
    return;
  }

  processedFiles = []; // reset previous

  for (let file of fileInput.files) {
    const fileData = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data: fileData }).promise;

    const newPdf = await PDFLib.PDFDocument.create();

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;

      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let data = imageData.data;
      for (let j = 0; j < data.length; j += 4) {
        data[j] = 255 - data[j];       // R
        data[j + 1] = 255 - data[j+1]; // G
        data[j + 2] = 255 - data[j+2]; // B
      }
      ctx.putImageData(imageData, 0, 0);

      const pngUrl = canvas.toDataURL("image/png");
      const pngImage = await newPdf.embedPng(pngUrl);

      const pageRef = newPdf.addPage([viewport.width, viewport.height]);
      pageRef.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height
      });
    }

    const pdfBytes = await newPdf.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });

    processedFiles.push({
      name: file.name.replace(".pdf", "_inverted.pdf"),
      blob: blob
    });
  }

  // Enable download button
  downloadBtn.disabled = false;
  alert("Processing complete! Click 'Download All' to download your files.");
});

downloadBtn.addEventListener("click", () => {
  processedFiles.forEach((fileObj, idx) => {
    const url = URL.createObjectURL(fileObj.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileObj.name;
    document.body.appendChild(a);

    // Stagger downloads slightly to avoid browser blocking
    setTimeout(() => {
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, idx * 500);
  });
});
