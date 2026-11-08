import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.js';

export default function Account() {
  const { user } = useAuth();
  const [presets, setPresets] = useState([]);

  useEffect(() => { api('/presets').then(setPresets).catch(() => {}); }, []);

  async function remove(id) {
    await api('/presets/' + id, { method: 'DELETE' });
    setPresets(presets.filter((p) => p.id !== id));
  }

  return (
    <main className="wrap">
      <h1>Your account</h1>
      <div className="account">
        <nav className="card side">
          <b>Saved presets</b>
          <Link to="/pricing">Plan and billing</Link>
        </nav>
        <div>
          <section className="card">
            <h2>Your plan: {user.plan === 'PRO' ? 'Pro' : 'Free'}</h2>
            <p className="muted">{user.email}</p>
            {user.plan === 'PRO' && user.proUntil && <p className="muted">Active until {new Date(user.proUntil).toLocaleDateString()}</p>}
            {user.plan !== 'PRO' && <Link className="btn alt" to="/pricing">Get Pro</Link>}
          </section>
          <section className="card">
            <h2>Saved presets</h2>
            {presets.length === 0 && <p className="muted">No presets yet. Set your rules on the Tools page and choose Save these rules as a preset.</p>}
            {presets.map((p) => (
              <div className="row" key={p.id}>
                <span><b>{p.name}</b><br /><span className="muted">{(p.format || '').replace('image/', '').toUpperCase()} {p.minKB ? p.minKB + '-' : 'up to '}{p.maxKB ? p.maxKB + ' KB' : 'any size'}{p.width ? ', ' + p.width + ' x ' + p.height + ' px' : ''}</span></span>
                <button className="btn alt small" onClick={() => remove(p.id)}>Delete</button>
              </div>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
