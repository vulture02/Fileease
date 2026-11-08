import { useState } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import Dropzone from '../components/Dropzone.jsx';
import PlanBanner from '../components/PlanBanner.jsx';

function saveBlob(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function parsePageNumbers(str, maxPages) {
  const pages = new Set();
  const parts = str.split(',').map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      if (start && end) {
        for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
          pages.add(i - 1);
        }
      }
    } else {
      const p = Number(part);
      if (p >= 1 && p <= maxPages) pages.add(p - 1);
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

export default function PdfTools() {
  const [tab, setTab] = useState('merge'); // 'merge', 'split', 'rotate'
  const [mergeFiles, setMergeFiles] = useState([]);
  const [singleFile, setSingleFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageRange, setPageRange] = useState('1');
  const [rotation, setRotation] = useState(90);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function loadSinglePdf(file) {
    setSingleFile(file);
    setMsg('');
    try {
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);
      const count = pdf.getPageCount();
      setPageCount(count);
      setPageRange(`1-${count}`);
    } catch {
      setMsg('Failed to read PDF. Make sure it is not password protected.');
    }
  }

  async function handleMerge() {
    if (mergeFiles.length < 2) {
      setMsg('Please choose at least 2 PDF files to merge.');
      return;
    }
    setBusy(true); setMsg('');
    try {
      const mergedPdf = await PDFDocument.create();
      for (const file of mergeFiles) {
        const bytes = await file.arrayBuffer();
        const pdf = await PDFDocument.load(bytes);
        const copied = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copied.forEach((p) => mergedPdf.addPage(p));
      }
      const finalBytes = await mergedPdf.save();
      saveBlob(finalBytes, 'fileease-merged.pdf');
      setMsg('Merged PDF downloaded successfully.');
    } catch (e) {
      setMsg('Merge failed: ' + e.message);
    }
    setBusy(false);
  }

  async function handleSplit() {
    if (!singleFile) { setMsg('Please choose a PDF file.'); return; }
    setBusy(true); setMsg('');
    try {
      const bytes = await singleFile.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);
      const indices = parsePageNumbers(pageRange, pdf.getPageCount());
      if (indices.length === 0) {
        setMsg('Invalid page range.');
        setBusy(false);
        return;
      }
      const newPdf = await PDFDocument.create();
      const copied = await newPdf.copyPages(pdf, indices);
      copied.forEach((p) => newPdf.addPage(p));
      const finalBytes = await newPdf.save();
      saveBlob(finalBytes, `fileease-extracted-pages.pdf`);
      setMsg('Extracted PDF downloaded successfully.');
    } catch (e) {
      setMsg('Split failed: ' + e.message);
    }
    setBusy(false);
  }

  async function handleRotate() {
    if (!singleFile) { setMsg('Please choose a PDF file.'); return; }
    setBusy(true); setMsg('');
    try {
      const bytes = await singleFile.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);
      pdf.getPages().forEach((p) => {
        p.setRotation(degrees((p.getRotation().angle + Number(rotation)) % 360));
      });
      const finalBytes = await pdf.save();
      saveBlob(finalBytes, `fileease-rotated.pdf`);
      setMsg('Rotated PDF downloaded successfully.');
    } catch (e) {
      setMsg('Rotation failed: ' + e.message);
    }
    setBusy(false);
  }

  function removeMergeFile(index) {
    setMergeFiles(mergeFiles.filter((_, i) => i !== index));
  }

  return (
    <main className="wrap">
      <h1>Client-Side PDF Tools</h1>
      <p className="muted lead">Merge, split, and rotate PDFs directly inside your browser. 100% private: your files are never uploaded to any server.</p>
      <PlanBanner />

      <div className="tabs">
        <button className={`tab ${tab === 'merge' ? 'on' : ''}`} onClick={() => { setTab('merge'); setMsg(''); }}>Merge PDFs</button>
        <button className={`tab ${tab === 'split' ? 'on' : ''}`} onClick={() => { setTab('split'); setMsg(''); }}>Split / Extract</button>
        <button className={`tab ${tab === 'rotate' ? 'on' : ''}`} onClick={() => { setTab('rotate'); setMsg(''); }}>Rotate Pages</button>
      </div>

      {tab === 'merge' && (
        <section className="card">
          <h2>Merge multiple PDF files</h2>
          <Dropzone
            onFile={(newFiles) => setMergeFiles([...mergeFiles, ...newFiles])}
            multiple={true}
            accept="application/pdf"
            label="Drag & drop PDF files here to merge"
            subtitle="Choose multiple files in the order you want them merged"
          />

          {mergeFiles.length > 0 && (
            <div className="gap">
              <h3>Files to merge ({mergeFiles.length}):</h3>
              {mergeFiles.map((f, i) => (
                <div className="row" key={i}>
                  <span><b>{i + 1}.</b> {f.name} ({(f.size / 1024).toFixed(0)} KB)</span>
                  <button className="btn small alt" onClick={() => removeMergeFile(i)}>Remove</button>
                </div>
              ))}
              <button className="btn block gap" disabled={busy || mergeFiles.length < 2} onClick={handleMerge}>
                {busy ? 'Merging PDFs...' : 'Merge and Download PDF'}
              </button>
            </div>
          )}
        </section>
      )}

      {tab === 'split' && (
        <section className="card narrow2">
          <h2>Split or extract pages from PDF</h2>
          <Dropzone
            onFile={loadSinglePdf}
            accept="application/pdf"
            label="Upload PDF to extract pages"
          />

          {singleFile && (
            <div className="gap">
              <p className="ok">Loaded: <b>{singleFile.name}</b> ({pageCount} pages total)</p>
              <label htmlFor="pr">Enter pages to extract (e.g. 1-3, 5, 8-10)</label>
              <input
                id="pr"
                className="field"
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                placeholder="e.g. 1-2, 5"
              />
              <button className="btn block gap" disabled={busy} onClick={handleSplit}>
                {busy ? 'Extracting...' : 'Extract and Download PDF'}
              </button>
            </div>
          )}
        </section>
      )}

      {tab === 'rotate' && (
        <section className="card narrow2">
          <h2>Rotate PDF pages</h2>
          <Dropzone
            onFile={loadSinglePdf}
            accept="application/pdf"
            label="Upload PDF to rotate"
          />

          {singleFile && (
            <div className="gap">
              <p className="ok">Loaded: <b>{singleFile.name}</b> ({pageCount} pages)</p>
              <label htmlFor="rot">Rotation Angle</label>
              <select id="rot" className="field" value={rotation} onChange={(e) => setRotation(Number(e.target.value))}>
                <option value={90}>90° Clockwise</option>
                <option value={180}>180° Upside Down</option>
                <option value={270}>270° (90° Counter-Clockwise)</option>
              </select>
              <button className="btn block gap" disabled={busy} onClick={handleRotate}>
                {busy ? 'Rotating...' : 'Rotate and Download PDF'}
              </button>
            </div>
          )}
        </section>
      )}

      {msg && <p role="status" className="note mt">{msg}</p>}
    </main>
  );
}

