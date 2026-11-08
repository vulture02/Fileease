import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.js';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [mode, setMode] = useState(sp.get('mode') === 'register' ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault(); setErr('');
    try {
      const d = await api('/auth/' + mode, { method: 'POST', body: { email, password } });
      login(d); nav('/');
    } catch (ex) { setErr(ex.message); }
  }

  return (
    <main className="wrap narrow">
      <form className="card" onSubmit={submit}>
        <div className="tabs">
          <button type="button" className={mode === 'login' ? 'tab on' : 'tab'} onClick={() => setMode('login')}>Log in</button>
          <button type="button" className={mode === 'register' ? 'tab on' : 'tab'} onClick={() => setMode('register')}>Sign up</button>
        </div>
        <label htmlFor="e">Email</label>
        <input id="e" className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="p">Password (at least 6 characters)</label>
        <input id="p" className="field" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn block gap">{mode === 'login' ? 'Log in' : 'Create account'}</button>
        {err && <p role="alert" className="note bad">{err}</p>}
      </form>
      <p className="muted center">An account lets you save presets and use your plan on any device.</p>
    </main>
  );
}
