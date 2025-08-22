const fileInput = document.getElementById("fileInput");
const processBtn = document.getElementById("processBtn");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

processBtn.addEventListener("click", async () => {
  if (!fileInput.files.length) {
    alert("Please upload a PDF first!");
    return;
  }

  const file = fileInput.files[0];
  const fileData = new Uint8Array(await file.arrayBuffer());

  // Load PDF
  const pdf = await pdfjsLib.getDocument({ data: fileData }).promise;

  // Create new PDF with pdf-lib
  const newPdf = await PDFLib.PDFDocument.create();

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);

    const viewport = page.getViewport({ scale: 2.0 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render to canvas
    await page.render({ canvasContext: ctx, viewport }).promise;

    // Invert pixels
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    for (let j = 0; j < data.length; j += 4) {
      data[j] = 255 - data[j];     // R
      data[j + 1] = 255 - data[j + 1]; // G
      data[j + 2] = 255 - data[j + 2]; // B
    }
    ctx.putImageData(imageData, 0, 0);

    // Export canvas to PNG
    const pngUrl = canvas.toDataURL("image/png");
    const pngImage = await newPdf.embedPng(pngUrl);

    // Add as new page
    const pageRef = newPdf.addPage([viewport.width, viewport.height]);
    pageRef.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height
    });
  }

  // Save new PDF
  const pdfBytes = await newPdf.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  // Trigger download
  const a = document.createElement("a");
  a.href = url;
  a.download = "inverted.pdf";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});
