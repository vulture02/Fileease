import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const tiles = [
  { title: 'Photo or signature', sub: 'Exact pixels and KB', to: '/prepare' },
  { title: 'PDF tools', sub: 'Merge, split, compress' },
  { title: 'Word or Excel to PDF', sub: 'Both directions' },
  { title: 'Bulk rename', sub: 'Hundreds of files at once', to: '/tools' },
  { title: 'Duplicate finder', sub: 'Find and remove copies', to: '/tools' },
  { title: 'Photo sheet', sub: 'Passport photos on A4' },
];

export default function Home() {
  const [text, setText] = useState('');
  const nav = useNavigate();

  return (
    <main className="wrap hero">
      <h1>Make your file match<br />the form rules</h1>
      <p className="muted lead">Paste the rules, add your file, and we resize, compress and check it for you.</p>

      <section className="card">
        <label htmlFor="rules">Paste the form rules (optional)</label>
        <textarea id="rules" rows="3" value={text} onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Signature must be JPEG, 10-20 KB, 140 x 60 px" />
        <button className="btn" onClick={() => nav('/prepare', { state: { text } })}>Auto-fill requirements</button>
      </section>

      <h2 className="mt">What do you need to do?</h2>
      <div className="tiles">
        {tiles.map((t) =>
          t.to ? (
            <Link key={t.title} className="tile" to={t.to}>
              <b>{t.title}</b><div className="muted">{t.sub}</div>
            </Link>
          ) : (
            <div key={t.title} className="tile soon">
              <b>{t.title}</b><span className="tag">Coming soon</span><div className="muted">{t.sub}</div>
            </div>
          )
        )}
      </div>
      <p className="muted mt">Your photos stay on your device. Nothing is uploaded for image tools.</p>
    </main>
  );
}
