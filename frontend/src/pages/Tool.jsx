import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.js';
import { parseRules, processImage, validate } from '../lib/image.js';
import PlanBanner from '../components/PlanBanner.jsx';

const empty = { format: 'image/jpeg', fit: 'crop', width: '', height: '', minKB: '', maxKB: '' };
const num = (v) => (v === '' || v == null ? undefined : Number(v));

export default function Tool() {
  const { user } = useAuth();
  const loc = useLocation();
  const [file, setFile] = useState(null);
  const [text, setText] = useState(loc.state?.text || '');
  const [r, setR] = useState(empty);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [presets, setPresets] = useState([]);

  useEffect(() => {
    if (user) api('/presets').then(setPresets).catch(() => {});
    else setPresets([]);
  }, [user]);

  useEffect(() => { if (loc.state?.text) fill(); }, []);

  const set = (k) => (e) => setR({ ...r, [k]: e.target.value });
  const rules = () => ({
    format: r.format, fit: r.fit,
    width: num(r.width), height: num(r.height), minKB: num(r.minKB), maxKB: num(r.maxKB),
  });

  function fill() {
    const p = parseRules(text);
    setR({
      ...r,
      format: p.format || r.format,
      width: p.width ?? r.width, height: p.height ?? r.height,
      minKB: p.minKB ?? r.minKB, maxKB: p.maxKB ?? r.maxKB,
    });
    setMsg(Object.keys(p).length ? 'Rules filled in. Check them, then make your file.' : 'We could not find any rules in that text. Fill them in below.');
  }

  async function run() {
    if (!file) { setMsg('Choose a file first.'); return; }
    setBusy(true); setMsg('');
    try {
      if (res) URL.revokeObjectURL(res.url);
      const o = rules();
      const out = await processImage(file, o);
      setRes({ ...out, url: URL.createObjectURL(out.blob), checks: validate(out, o), before: file.size, o });
    } catch {
      setMsg('We could not read this file. Try a JPG or PNG.');
    }
    setBusy(false);
  }

  async function savePreset() {
    const name = window.prompt('Name this preset');
    if (!name) return;
    try {
      const p = await api('/presets', { method: 'POST', body: { name, ...rules() } });
      setPresets([...presets, p]);
      setMsg('Preset saved.');
    } catch (e) { setMsg(e.message); }
  }

  function usePreset(id) {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    setR({
      format: p.format || 'image/jpeg', fit: p.fit || 'crop',
      width: p.width ?? '', height: p.height ?? '', minKB: p.minKB ?? '', maxKB: p.maxKB ?? '',
    });
  }

  const allPass = res && res.checks.every((c) => c.ok);
  const ext = res ? res.blob.type.replace('image/', '').replace('jpeg', 'jpg') : '';
  const hint = res && !allPass && res.o.maxKB && res.o.width && res.o.height
    ? `We cannot reach ${res.o.maxKB} KB at ${res.o.width} x ${res.o.height} px without making the image very blurry. Best result: ${(res.blob.size / 1024).toFixed(1)} KB.`
    : '';

  return (
    <main className="wrap">
      <h1>Make your file match the form rules</h1>
      <p className="muted lead">Add your photo, set the rules, and download a file that passes. Your photo stays on your device.</p>
      <PlanBanner />

      <section className="card">
        <label htmlFor="rules">Paste the form rules (optional)</label>
        <textarea id="rules" rows="2" value={text} onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Signature must be JPEG, 10-20 KB, 140 x 60 px" />
        <button className="btn alt" onClick={fill}>Fill in the rules</button>
      </section>

      <div className="grid2">
        <section className="card">
          <h2>1. Add your file</h2>
          <label htmlFor="file">Choose an image</label>
          <input id="file" className="field" type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0] || null)} />
          <label htmlFor="cam">Or take a photo</label>
          <input id="cam" className="field" type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files[0] || null)} />
          {file && <p className="muted">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>}

          <h2>2. Your rules</h2>
          {presets.length > 0 && (
            <>
              <label htmlFor="preset">Saved presets</label>
              <select id="preset" className="field" defaultValue="" onChange={(e) => usePreset(e.target.value)}>
                <option value="" disabled>Choose a preset</option>
                {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </>
          )}
          <div className="rules">
            <div><label htmlFor="f">Format</label>
              <select id="f" className="field" value={r.format} onChange={set('format')}>
                <option value="image/jpeg">JPG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option>
              </select></div>
            <div><label htmlFor="fit">Fit</label>
              <select id="fit" className="field" value={r.fit} onChange={set('fit')}>
                <option value="crop">Crop</option><option value="pad">Pad</option>
              </select></div>
            <div><label htmlFor="min">Min size (KB)</label><input id="min" className="field" inputMode="decimal" value={r.minKB} onChange={set('minKB')} /></div>
            <div><label htmlFor="max">Max size (KB)</label><input id="max" className="field" inputMode="decimal" value={r.maxKB} onChange={set('maxKB')} /></div>
            <div><label htmlFor="w">Width (px)</label><input id="w" className="field" inputMode="numeric" value={r.width} onChange={set('width')} /></div>
            <div><label htmlFor="h">Height (px)</label><input id="h" className="field" inputMode="numeric" value={r.height} onChange={set('height')} /></div>
          </div>
          <button className="btn block" onClick={run} disabled={busy}>{busy ? 'Working...' : 'Make my file'}</button>
          {user ? <button className="btn alt block gap" onClick={savePreset}>Save these rules as a preset</button> : <p className="lock">Saving presets needs a free account. <Link to="/login?mode=register">Sign up</Link></p>}
          {msg && <p role="status" className="note">{msg}</p>}
        </section>

        <section className="card">
          <h2>3. Result</h2>
          {!res && <p className="muted">Your result and the pass or fail checks will appear here.</p>}
          {res && (
            <>
              <div className="ba">
                <div className="box"><span className="muted">Before</span><b>{(res.before / 1024).toFixed(0)} KB</b></div>
                <div className={'box ' + (allPass ? 'good' : 'bad')}><span className="muted">After</span><b>{(res.blob.size / 1024).toFixed(1)} KB</b><span className="muted">{res.width} x {res.height} px</span></div>
              </div>
              <img className="preview" src={res.url} alt="Preview of your processed file" />
              {res.checks.map((c) => (
                <div className="row" key={c.label}>
                  <span>{c.label}: {c.detail}</span>
                  <span className={c.ok ? 'ok' : 'fail'}>{c.ok ? 'Pass' : 'Fail'}</span>
                </div>
              ))}
              {hint && <p className="note">{hint}</p>}
              <a className="btn block gap" href={res.url} download={'fileease-' + file.name.replace(/\.[^.]+$/, '') + '.' + ext}>Download</a>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
