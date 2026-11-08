import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.js';

const PRICE = '399'; // set your Pro price here

export default function Pricing() {
  const { user } = useAuth();
  const [txn, setTxn] = useState('');
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState('');

  const load = () => { if (user) api('/payments').then(setList).catch(() => {}); };
  useEffect(load, [user]);

  async function pay(e) {
    e.preventDefault(); setMsg('');
    try {
      await api('/payments', { method: 'POST', body: { txnId: txn } });
      setTxn(''); setMsg('Received. We will activate Pro after we check the payment.'); load();
    } catch (ex) { setMsg(ex.message); }
  }

  return (
    <main className="wrap center">
      <h1>Simple plans</h1>
      <p className="muted lead">Pay with any UPI app by scanning the QR code below.</p>

      <div className="grid3 left pricing">
        <section className="card">
          <h2>Free</h2>
          <p className="price">Free</p>
          <div className="row">Image resize and compress</div>
          <div className="row">3 saved presets</div>
          <div className="row">3 conversions per day</div>
          <div className="row">Bulk rename up to 50 files</div>
          <Link className="btn alt block gap" to="/prepare">Start free</Link>
        </section>
        <section className="card pro">
          <h2>Pro</h2>
          <p className="price">{PRICE} <span className="muted">/ month</span></p>
          <div className="row">Unlimited saved presets</div>
          <div className="row">50 conversions per day</div>
          <div className="row">Bulk rename up to 500 files</div>
          <a className="btn block gap" href="#pay">Get Pro</a>
        </section>
        <section className="card">
          <h2>Business <span className="tag">Coming soon</span></h2>
          <p className="price">Custom <span className="muted">/ team</span></p>
          <div className="row">Shared presets for a team</div>
          <div className="row">Priority support</div>
          <button className="btn alt block gap" disabled>Contact us</button>
        </section>
      </div>

      <section className="card left compare mid">
        <h2>What you get</h2>
        <table>
          <thead><tr><th></th><th>Guest</th><th>Free</th><th>Pro</th></tr></thead>
          <tbody>
            <tr><td>Image resize and compress</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>
            <tr><td>Saved presets</td><td>Log in first</td><td>3</td><td>Unlimited</td></tr>
            <tr><td>Bulk rename</td><td>Log in first</td><td>50 files</td><td>500 files</td></tr>
            <tr><td>Duplicate finder</td><td>Log in first</td><td>500 files</td><td>No limit</td></tr>
            <tr><td>Word, Excel, PDF conversion</td><td>Log in first</td><td>3 per day</td><td>50 per day</td></tr>
          </tbody>
        </table>
      </section>

      <section className="card narrow mid left" id="pay">
        <h2>Pay by QR to activate Pro</h2>
        <img className="qr" src="/qr.png" alt="Payment QR code" />
        <div className="row">1. Scan with any UPI app and pay {PRICE}</div>
        <div className="row">2. Enter the UPI transaction ID below</div>
        <div className="row">3. We check the payment and activate Pro</div>
        {user ? (
          <form onSubmit={pay}>
            <label htmlFor="t">UPI transaction ID</label>
            <input id="t" className="field" required maxLength={40} value={txn} onChange={(e) => setTxn(e.target.value)} />
            <button className="btn block gap">I have paid</button>
            {msg && <p role="status" className="note">{msg}</p>}
          </form>
        ) : (
          <p><Link to="/login">Log in</Link> first so we can attach the payment to your account.</p>
        )}
        {list.map((p) => (
          <div className="row" key={p.id}><span>{p.txnId}</span><span className="muted">{p.status}</span></div>
        ))}
      </section>
    </main>
  );
}
