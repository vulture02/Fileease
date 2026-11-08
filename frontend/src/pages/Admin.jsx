import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Admin() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');

  const load = () => api('/admin/payments').then(setList).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function act(id, what) {
    try { await api(`/admin/payments/${id}/${what}`, { method: 'POST' }); load(); }
    catch (e) { setErr(e.message); }
  }

  return (
    <main className="wrap">
      <h1>Pending payments</h1>
      <p className="muted">Check each payment in your bank app before you approve it.</p>
      <section className="card">
        {list.length === 0 && <p className="muted">No pending payments.</p>}
        {list.map((p) => (
          <div className="row" key={p.id}>
            <span><b>{p.email}</b><br /><span className="muted">Transaction ID: {p.txnId}</span></span>
            <span className="actions">
              <button className="btn small" onClick={() => act(p.id, 'approve')}>Approve</button>
              <button className="btn alt small" onClick={() => act(p.id, 'reject')}>Reject</button>
            </span>
          </div>
        ))}
        {err && <p role="alert" className="note bad">{err}</p>}
      </section>
    </main>
  );
}
