import { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.js';
import { parseRules, processImage, validate, EXAM_PRESETS } from '../lib/image.js';
import PlanBanner from '../components/PlanBanner.jsx';
import Dropzone from '../components/Dropzone.jsx';
import CropBox from '../components/CropBox.jsx';

const empty = { format: 'image/jpeg', fit: 'crop', width: '', height: '', minKB: '', maxKB: '', filter: 'none' };
const num = (v) => (v === '' || v == null ? undefined : Number(v));

export default function Tool() {
  const { user } = useAuth();
  const loc = useLocation();
  const [file, setFile] = useState(null);
  const [text, setText] = useState(loc.state?.text || '');
  const [r, setR] = useState(empty);
  const [crop, setCrop] = useState(null);
  const [showCrop, setShowCrop] = useState(false);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [presets, setPresets] = useState([]);

  // Manual brush touch-up state
  const [brushActive, setBrushActive] = useState(false);
  const [brushSize, setBrushSize] = useState(25);
  const brushCanvasRef = useRef(null);
  const isPaintingRef = useRef(false);

  useEffect(() => {
    if (user) api('/presets').then(setPresets).catch(() => {});
    else setPresets([]);
  }, [user]);

  useEffect(() => { if (loc.state?.text) fill(); }, []);

  useEffect(() => {
    if (!brushActive || !res || !brushCanvasRef.current) return;
    const canvas = brushCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = res.url;
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
    };
  }, [brushActive, res]);

  const set = (k) => (e) => setR({ ...r, [k]: e.target.value });
  const rules = (extra = {}) => ({
    format: r.format, fit: r.fit, filter: r.filter, crop: showCrop ? crop : null,
    width: num(r.width), height: num(r.height), minKB: num(r.minKB), maxKB: num(r.maxKB),
    ...extra,
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

  function handleExamPreset(e) {
    const idx = e.target.value;
    if (idx === '') return;
    const item = EXAM_PRESETS[idx];
    if (item && item.rules) {
      setR({
        ...r,
        format: item.rules.format || r.format,
        fit: item.rules.fit || r.fit,
        width: item.rules.width ?? '',
        height: item.rules.height ?? '',
        minKB: item.rules.minKB ?? '',
        maxKB: item.rules.maxKB ?? '',
      });
      setMsg(`Applied ${item.label}`);
    }
  }

  async function run(extraOptions = {}) {
    if (!file) { setMsg('Choose a file first.'); return; }
    setBusy(true);
    setMsg(r.filter === 'whiten-bg' ? 'AI is isolating the person and making the background solid white...' : '');
    try {
      if (res) URL.revokeObjectURL(res.url);
      const o = rules(extraOptions);
      const out = await processImage(file, o);
      setRes({ ...out, url: URL.createObjectURL(out.blob), checks: validate(out, o), before: file.size, o });
      setMsg(r.filter === 'whiten-bg' ? 'Person isolated successfully! Background is now pure white.' : '');
    } catch {
      setMsg('We could not read this file. Try a JPG or PNG.');
    }
    setBusy(false);
  }

  function paintAt(e) {
    const canvas = brushCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x, y, brushSize * (canvas.width / 400), 0, Math.PI * 2);
    ctx.fill();
  }

  function handleBrushMouseDown(e) {
    isPaintingRef.current = true;
    paintAt(e);
  }

  function handleBrushMouseMove(e) {
    if (!isPaintingRef.current) return;
    paintAt(e);
  }

  function handleBrushMouseUp() {
    isPaintingRef.current = false;
  }

  function saveBrushTouchup() {
    const canvas = brushCanvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (res.url) URL.revokeObjectURL(res.url);
      setRes({
        ...res,
        blob,
        url: URL.createObjectURL(blob),
      });
      setBrushActive(false);
      setMsg('Touch-up applied!');
    }, res.blob.type || 'image/jpeg', 0.95);
  }

  async function savePreset() {
    if (!user) {
      setMsg('Please log in or sign up to save presets.');
      return;
    }
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
      format: p.format || 'image/jpeg', fit: p.fit || 'crop', filter: r.filter,
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
      <p className="muted lead">Add your photo or signature, set the rules, and download a compliant file that passes. 100% private.</p>
      <PlanBanner />

      <section className="card">
        <label htmlFor="exam-sel">⚡ Fast Template (UPSC, SSC, NEET, PAN, Visa)</label>
        <select id="exam-sel" className="field" defaultValue="" onChange={handleExamPreset}>
          {EXAM_PRESETS.map((p, i) => (
            <option key={i} value={i === 0 ? '' : i}>{p.label}</option>
          ))}
        </select>

        <label htmlFor="rules" className="mt">Or paste custom form rules from notification / website</label>
        <textarea id="rules" rows="2" value={text} onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Signature must be JPEG, 10-20 KB, 140 x 60 px" />
        <button className="btn alt" onClick={fill}>Auto-fill rules from text</button>
      </section>

      <div className="grid2">
        <section className="card">
          <h2>1. Add your file</h2>
          <Dropzone
            onFile={(f) => setFile(f)}
            accept="image/jpeg,image/png,image/webp"
            label="Drag & drop your photo or signature"
            subtitle="JPG, PNG, or WebP up to 25MB"
          />
          {file && (
            <div className="gap">
              <p className="ok">Selected: <b>{file.name}</b> ({(file.size / 1024).toFixed(0)} KB)</p>
              <div className="row">
                <span><b>Live Visual Crop Box</b> (Crop around face & shoulders)</span>
                <button
                  type="button"
                  className={`btn small ${showCrop ? '' : 'alt'}`}
                  onClick={() => setShowCrop(!showCrop)}
                >
                  {showCrop ? 'Disable Crop Box' : 'Enable Crop Box'}
                </button>
              </div>
              {showCrop && (
                <CropBox
                  file={file}
                  onCropChange={setCrop}
                  aspect={r.width && r.height ? Number(r.width) / Number(r.height) : undefined}
                />
              )}
            </div>
          )}

          <h2>2. Your rules & Clean-up</h2>
          {presets.length > 0 && (
            <>
              <label htmlFor="preset">Saved presets</label>
              <select id="preset" className="field" defaultValue="" onChange={(e) => usePreset(e.target.value)}>
                <option value="" disabled>Choose a preset</option>
                {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </>
          )}

          <label htmlFor="flt">✨ Filter & Clean-up</label>
          <select id="flt" className="field" value={r.filter} onChange={set('filter')}>
            <option value="none">Original Colors (No Filter)</option>
            <option value="whiten-bg">Whiten Background (AI Auto-Cut Person, Solid White BG)</option>
            <option value="bw-signature">Clean Signature (Paper to Pure White, Ink to Dark)</option>
            <option value="grayscale">Black & White (Grayscale)</option>
            <option value="contrast">Boost Contrast</option>
          </select>

          <div className="rules gap">
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
          <button className="btn block" onClick={() => run()} disabled={busy}>
            {busy ? (r.filter === 'whiten-bg' ? 'AI isolating person...' : 'Processing...') : 'Make my file'}
          </button>
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

              {!brushActive ? (
                <>
                  <img
                    className="preview"
                    src={res.url}
                    alt="Preview of your processed file"
                  />
                  {r.filter === 'whiten-bg' && (
                    <div className="btnrow gap" style={{ justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="btn small alt"
                        onClick={() => setBrushActive(true)}
                      >
                        🖌️ Optional Touch-up Brush
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="gap">
                  <div className="row">
                    <span><b>Drag mouse over image to paint white:</b></span>
                    <button type="button" className="btn small alt" onClick={() => setBrushActive(false)}>Cancel</button>
                  </div>
                  <canvas
                    ref={brushCanvasRef}
                    onMouseDown={handleBrushMouseDown}
                    onMouseMove={handleBrushMouseMove}
                    onMouseUp={handleBrushMouseUp}
                    onMouseLeave={handleBrushMouseUp}
                    style={{
                      display: 'block',
                      maxWidth: '100%',
                      margin: '8px auto',
                      border: '2px dashed var(--blue)',
                      borderRadius: '8px',
                      cursor: 'crosshair',
                      touchAction: 'none',
                    }}
                  />
                  <div className="row">
                    <span>Brush Size ({brushSize}px)</span>
                    <input
                      type="range"
                      min="10"
                      max="70"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                    />
                  </div>
                  <button type="button" className="btn block gap" onClick={saveBrushTouchup}>
                    ✓ Done & Apply Touch-up
                  </button>
                </div>
              )}

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
