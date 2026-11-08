import { useState, useRef } from 'react';
import JSZip from 'jszip';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth.js';
import { upload } from '../api.js';
import { limitsFor } from '../lib/limits.js';
import PlanBanner from '../components/PlanBanner.jsx';
import Dropzone from '../components/Dropzone.jsx';

const ext = (n) => { const i = n.lastIndexOf('.'); return i > 0 ? n.slice(i) : ''; };

function saveBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function sha256(file) {
  const buf = await file.arrayBuffer();
  const d = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function Convert() {
  const { user } = useAuth();
  const lim = limitsFor(user);
  const modes = {
    'word-to-pdf': ['Word to PDF', '.doc,.docx', 'pdf'],
    'excel-to-pdf': ['Excel to PDF', '.xls,.xlsx', 'pdf'],
    'pdf-to-word': ['PDF to Word', '.pdf', 'docx'],
  };
  const [mode, setMode] = useState('word-to-pdf');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function go() {
    setBusy(true); setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file); fd.append('mode', mode);
      const blob = await upload('/convert', fd);
      saveBlob(blob, file.name.replace(/\.[^.]+$/, '') + '.' + modes[mode][2]);
      setMsg('Done. Your file was downloaded.');
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  }

  return (
    <section className="card" id="convert">
      <h2>Word / Excel and PDF</h2>
      {!user ? (
        <p className="lock">Conversion needs a free account. <Link to="/login?mode=register">Sign up</Link> or <Link to="/login">log in</Link>.</p>
      ) : (
        <>
          <div className="btnrow">
            {Object.entries(modes).map(([k, v]) => (
              <button key={k} className={'btn small' + (mode === k ? '' : ' alt')} onClick={() => { setMode(k); setFile(null); setMsg(''); }}>{v[0]}</button>
            ))}
          </div>
          <Dropzone
            onFile={(f) => setFile(f)}
            accept={modes[mode][1]}
            label={`Drag & drop ${modes[mode][0]} file`}
            subtitle={`Accepts ${modes[mode][1]}`}
          />
          {file && <p className="ok gap">Selected: <b>{file.name}</b></p>}
          <button className="btn block gap" disabled={!file || busy} onClick={go}>{busy ? 'Converting... this can take a minute' : 'Convert and download'}</button>
          <p className="muted">Your {lim.plan} plan: {lim.convert} conversions per day. The file is uploaded to our server and deleted right after.</p>
          {msg && <p role="status" className="note">{msg}</p>}
        </>
      )}
    </section>
  );
}

function Rename() {
  const { user } = useAuth();
  const lim = limitsFor(user);
  const [files, setFiles] = useState([]);
  const [prefix, setPrefix] = useState('Holiday_');
  const [start, setStart] = useState(1);
  const names = files.map((f, i) => prefix + String(Number(start) + i).padStart(3, '0') + ext(f.name));

  async function download() {
    const zip = new JSZip();
    files.forEach((f, i) => zip.file(names[i], f));
    saveBlob(await zip.generateAsync({ type: 'blob' }), 'renamed-files.zip');
  }

  return (
    <section className="card">
      <h2>Bulk rename</h2>
      {!user ? (
        <p className="lock">Bulk rename needs a free account. <Link to="/login?mode=register">Sign up</Link> or <Link to="/login">log in</Link>.</p>
      ) : (
        <>
          <Dropzone
            onFile={(newFiles) => setFiles(newFiles)}
            multiple={true}
            label="Drag & drop files to bulk rename"
            subtitle="Choose or drop multiple files"
          />
          <div className="rules gap">
            <div><label htmlFor="pf">Name starts with</label><input id="pf" className="field" value={prefix} onChange={(e) => setPrefix(e.target.value)} /></div>
            <div><label htmlFor="st">First number</label><input id="st" className="field" inputMode="numeric" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          </div>
          {files.slice(0, 5).map((f, i) => (
            <div className="row" key={i}><span className="muted">{f.name}</span><span>{names[i]}</span></div>
          ))}
          {files.length > 5 && <p className="muted">and {files.length - 5} more files</p>}
          {files.length > lim.rename && <p className="note">Your {lim.plan} plan can rename up to {lim.rename} files at a time. You chose {files.length}.</p>}
          <button className="btn block gap" disabled={!files.length || files.length > lim.rename} onClick={download}>Rename and download ZIP</button>
        </>
      )}
    </section>
  );
}

function Dupes() {
  const { user } = useAuth();
  const [all, setAll] = useState([]);
  const [groups, setGroups] = useState(null);
  const lim = limitsFor(user);
  const [busy, setBusy] = useState(false);
  const [limitMsg, setLimitMsg] = useState('');
  const folderInputRef = useRef(null);

  async function scan(e) {
    const files = [...e.target.files];
    setLimitMsg('');
    if (files.length > lim.dupes) { setAll([]); setGroups(null); setLimitMsg(`Your ${lim.plan} plan can scan up to ${lim.dupes} files at a time. You chose ${files.length}.`); return; }
    setAll(files); setBusy(true); setGroups(null);
    const bySize = new Map();
    files.forEach((f) => bySize.set(f.size, [...(bySize.get(f.size) || []), f]));
    const found = [];
    for (const same of bySize.values()) {
      if (same.length < 2) continue;
      const byHash = new Map();
      for (const f of same) {
        const h = await sha256(f);
        byHash.set(h, [...(byHash.get(h) || []), f]);
      }
      byHash.forEach((g) => { if (g.length > 1) found.push(g); });
    }
    setGroups(found); setBusy(false);
  }

  const drop = new Set((groups || []).flatMap((g) => g.slice(1)));
  const freed = [...drop].reduce((s, f) => s + f.size, 0);

  async function download() {
    const zip = new JSZip();
    all.filter((f) => !drop.has(f)).forEach((f) => zip.file(f.webkitRelativePath || f.name, f));
    saveBlob(await zip.generateAsync({ type: 'blob' }), 'unique-files.zip');
  }

  return (
    <section className="card">
      <h2>Duplicate finder</h2>
      {!user ? (
        <p className="lock">Duplicate finder needs a free account. <Link to="/login?mode=register">Sign up</Link> or <Link to="/login">log in</Link>.</p>
      ) : (
        <>
          <div
            className="dropzone"
            onClick={() => folderInputRef.current && folderInputRef.current.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') folderInputRef.current?.click(); }}
          >
            <input
              ref={folderInputRef}
              id="df"
              type="file"
              multiple
              webkitdirectory=""
              style={{ display: 'none' }}
              onChange={scan}
            />
            <div className="dropzone-icon">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <p className="dropzone-text"><b>Click to select a folder</b></p>
            <p className="dropzone-sub muted">Scans and groups duplicates safely on device</p>
          </div>
          <p className="muted">Scanning happens on your device. Browsers cannot delete files from your computer, so you get a ZIP of the unique files.</p>
          {busy && <p role="status">Scanning...</p>}
          {limitMsg && <p className="note">{limitMsg}</p>}
          {groups && groups.length === 0 && <p className="ok">No duplicates found in {all.length} files.</p>}
          {groups && groups.length > 0 && (
            <>
              <p><b>{drop.size} duplicate files</b> found. You can free {(freed / 1024 / 1024).toFixed(1)} MB.</p>
              {groups.map((g, i) => (
                <div className="row" key={i}>
                  <span>{g[0].name}</span><span className="muted">{g.length - 1} copy found: {g.slice(1).map((f) => f.name).join(', ')}</span>
                </div>
              ))}
              <button className="btn block gap" onClick={download}>Download ZIP without duplicates</button>
            </>
          )}
        </>
      )}
    </section>
  );
}

export default function Tools() {
  return (
    <main className="wrap">
      <h1>Convert and organize files</h1>
      <PlanBanner />
      <div className="grid3 gap">
        <Convert />
        <Rename />
        <Dupes />
      </div>
    </main>
  );
}
