'use client';
import { useState } from 'react';
import { api } from '@/lib/client';
export default function Login() {
  const [f, setF] = useState({ username: '', password: '' }); const [err, setErr] = useState('');
  const submit = async (e) => { e.preventDefault(); setErr(''); try { await api('/api/login', { method: 'POST', body: f }); window.location.href = '/'; } catch (x) { setErr(x.message); } };
  return (
    <div style={{ maxWidth: 320, marginTop: 60 }}>
      <h1>MIS Purchase Billing ERP</h1>
      <form onSubmit={submit} className="card">
        <label>Username<input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></label><br />
        <label>Password<input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label><br />
        {err && <div className="err">{err}</div>}
        <button>Login</button>
      </form>
    </div>
  );
}
