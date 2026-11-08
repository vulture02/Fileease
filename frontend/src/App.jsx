import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { api, tok } from './api.js';
import { AuthContext } from './auth.js';
import Home from './pages/Home.jsx';
import Tool from './pages/Tool.jsx';
import Tools from './pages/Tools.jsx';
import Login from './pages/Login.jsx';
import Pricing from './pages/Pricing.jsx';
import Account from './pages/Account.jsx';
import Admin from './pages/Admin.jsx';
import Help from './pages/Help.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!tok.get()) { setReady(true); return; }
    api('/me').then(setUser).catch(() => tok.set(null)).finally(() => setReady(true));
  }, []);

  const login = (d) => { tok.set(d.token); setUser(d.user); };
  const logout = () => { tok.set(null); setUser(null); };
  if (!ready) return null;

  const need = (el) => (user ? el : <Navigate to="/login" />);
  const admin = (el) => (user && user.role === 'ADMIN' ? el : <Navigate to="/" />);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <header className="nav">
        <Link className="logo" to="/">FileEase</Link>
        <Link to="/prepare">Tools</Link>
        <Link to="/tools">Convert</Link>
        <Link to="/pricing">Pricing</Link>
        <Link to="/help">Help</Link>
        {user ? (
          <>
            <Link to="/account">Account <span className="tag">{user.plan === 'PRO' ? 'Pro' : 'Free'}</span></Link>
            {user.role === 'ADMIN' && <Link to="/admin">Admin</Link>}
            <button className="linkbtn" onClick={logout}>Log out</button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link className="btn small" to="/login?mode=register">Sign up</Link>
          </>
        )}
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/prepare" element={<Tool />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/help" element={<Help />} />
        <Route path="/login" element={<Login />} />
        <Route path="/account" element={need(<Account />)} />
        <Route path="/admin" element={admin(<Admin />)} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthContext.Provider>
  );
}
