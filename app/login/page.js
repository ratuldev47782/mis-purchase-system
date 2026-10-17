'use client';
import { useState } from 'react';
import { api } from '@/lib/client';
export default function Login() {
  const [f, setF] = useState({ username: '', password: '' }); const [err, setErr] = useState('');
  const submit = async (e) => { e.preventDefault(); setErr(''); try { await api('/api/login', { method: 'POST', body: f }); window.location.href = '/'; } catch (x) { setErr(x.message); } };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-cover bg-center"
      style={{ backgroundImage: 'linear-gradient(rgba(15,23,42,.7),rgba(15,23,42,.7)),url(/HKD_Building_image.jpeg)' }}>
      <form onSubmit={submit} className="card w-80 space-y-3 !p-6 shadow-2xl">
        <img src="/HKD_LOGO.png" alt="HKD" className="h-12 mx-auto" />
        <h1 className="!text-lg text-center !mb-2">MIS Purchase Billing ERP</h1>
        <label>Username<input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></label>
        <label>Password<input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
        {err && <div className="err">{err}</div>}
        <button className="w-full">Login</button>
      </form>
    </div>
  );
}