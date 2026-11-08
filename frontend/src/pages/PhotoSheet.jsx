import { useState, useRef, useEffect } from 'react';
import Dropzone from '../components/Dropzone.jsx';
import PlanBanner from '../components/PlanBanner.jsx';

export default function PhotoSheet() {
  const [file, setFile] = useState(null);
  const [paper, setPaper] = useState('4x6'); // '4x6' or 'A4'
  const [photoType, setPhotoType] = useState('india'); // 'india' (3.5x4.5cm) or 'us' (2x2 inch)
  const [drawBorders, setDrawBorders] = useState(true);
  const [gap, setGap] = useState(16);
  const [imgBmp, setImgBmp] = useState(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!file) { setImgBmp(null); return; }
    createImageBitmap(file, { imageOrientation: 'from-image' }).then(setImgBmp);
  }, [file]);

  useEffect(() => {
    if (!imgBmp || !canvasRef.current) return;
    renderSheet();
  }, [imgBmp, paper, photoType, drawBorders, gap]);

  function renderSheet() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // 300 DPI resolutions
    // 4x6 inch = 1200 x 1800 px (or 1800 x 1200 landscape)
    // A4 = 2480 x 3508 px
    const sheetW = paper === '4x6' ? 1800 : 2480;
    const sheetH = paper === '4x6' ? 1200 : 3508;

    canvas.width = sheetW;
    canvas.height = sheetH;

    // Fill white paper
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, sheetW, sheetH);

    // Photo dimensions in pixels @ 300 DPI
    // 3.5cm x 4.5cm ~ 413 x 531 px
    // 2x2 inch ~ 600 x 600 px
    let pw = 413, ph = 531;
    if (photoType === 'us') { pw = 600; ph = 600; }

    const marginX = 60;
    const marginY = 60;
    const cols = Math.floor((sheetW - 2 * marginX + gap) / (pw + gap));
    const rows = Math.floor((sheetH - 2 * marginY + gap) / (ph + gap));

    const totalGridW = cols * pw + (cols - 1) * gap;
    const totalGridH = rows * ph + (rows - 1) * gap;
    const startX = Math.round((sheetW - totalGridW) / 2);
    const startY = Math.round((sheetH - totalGridH) / 2);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * (pw + gap);
        const y = startY + r * (ph + gap);

        // Draw photo with aspect-fill
        const scale = Math.max(pw / imgBmp.width, ph / imgBmp.height);
        const dw = imgBmp.width * scale;
        const dh = imgBmp.height * scale;
        const ox = (pw - dw) / 2;
        const oy = (ph - dh) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, pw, ph);
        ctx.clip();
        ctx.drawImage(imgBmp, x + ox, y + oy, dw, dh);
        ctx.restore();

        // Optional cut lines
        if (drawBorders) {
          ctx.strokeStyle = '#D1D5DB';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(x, y, pw, ph);
          ctx.setLineDash([]);
        }
      }
    }
  }

  function downloadSheet() {
    if (!canvasRef.current) return;
    setBusy(true);
    canvasRef.current.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `passport-photo-sheet-${paper}.jpg`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      setBusy(false);
    }, 'image/jpeg', 0.95);
  }

  function printSheet() {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/jpeg', 0.95);
    const win = window.open('');
    win.document.write(`
      <html>
        <head><title>Print Passport Photo Sheet</title>
        <style>
          @page { size: ${paper === '4x6' ? '6in 4in' : 'A4'}; margin: 0; }
          body { margin: 0; display: flex; align-items: center; justify-content: center; }
          img { width: 100%; height: auto; max-height: 100vh; object-fit: contain; }
        </style></head>
        <body onload="window.print();window.close();">
          <img src="${url}" />
        </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <main className="wrap">
      <h1>Passport Photo Sheet Generator</h1>
      <p className="muted lead">Generate studio-quality, print-ready passport sheets for 4×6 inch or A4 paper. Save money on printing!</p>
      <PlanBanner />

      <div className="grid2">
        <section className="card">
          <h2>1. Select Photo</h2>
          <Dropzone
            onFile={(f) => setFile(f)}
            accept="image/jpeg,image/png,image/webp"
            label="Upload your passport photo"
            subtitle="JPG or PNG. Look straight at the camera."
          />
          {file && <p className="ok gap">Selected: {file.name}</p>}

          <h2 className="mt">2. Sheet Configuration</h2>
          <div className="rules">
            <div>
              <label htmlFor="ps">Paper Size</label>
              <select id="ps" className="field" value={paper} onChange={(e) => setPaper(e.target.value)}>
                <option value="4x6">4 × 6 inch (Standard Studio Photo Paper)</option>
                <option value="A4">A4 Sheet (Bulk 30+ Photos)</option>
              </select>
            </div>
            <div>
              <label htmlFor="pt">Photo Dimension</label>
              <select id="pt" className="field" value={photoType} onChange={(e) => setPhotoType(e.target.value)}>
                <option value="india">3.5 × 4.5 cm (India / UK / Govt Standard)</option>
                <option value="us">2 × 2 inch (US Visa / OCI / Passport)</option>
              </select>
            </div>
          </div>

          <div className="row">
            <span>Draw dotted cut borders</span>
            <input
              type="checkbox"
              checked={drawBorders}
              onChange={(e) => setDrawBorders(e.target.checked)}
              style={{ width: '20px', height: '20px' }}
            />
          </div>

          <button
            className="btn block gap"
            disabled={!imgBmp || busy}
            onClick={downloadSheet}
          >
            {busy ? 'Preparing sheet...' : 'Download Print-Ready Sheet (300 DPI)'}
          </button>
          <button
            className="btn alt block gap"
            disabled={!imgBmp}
            onClick={printSheet}
          >
            Print Sheet
          </button>
        </section>

        <section className="card">
          <h2>3. Live Sheet Preview</h2>
          {!imgBmp ? (
            <p className="muted">Upload your photo to see your printable sheet.</p>
          ) : (
            <div>
              <canvas
                ref={canvasRef}
                style={{
                  width: '100%',
                  maxHeight: '480px',
                  objectFit: 'contain',
                  border: '1px solid var(--line)',
                  borderRadius: '12px',
                  background: '#fff',
                }}
              />
              <p className="muted center mt">
                Preview rendered at 300 DPI resolution. Take this file on a USB or phone to any local studio or print at home.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

