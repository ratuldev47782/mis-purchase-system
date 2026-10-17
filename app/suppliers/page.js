'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
export default function Suppliers() {
  const [list, setList] = useState([]); const [f, setF] = useState({ name: '', phone: '', address: '' }); const [msg, setMsg] = useState('');
  const load = () => api('/api/suppliers').then(setList);
  useEffect(() => { load(); }, []);
  const save = async (e) => {
    e.preventDefault(); setMsg('');
    try { await api('/api/suppliers', { method: f._id ? 'PUT' : 'POST', body: f }); setF({ name: '', phone: '', address: '' }); load(); } catch (x) { setMsg(x.message); }
  };
  return (
    <><h1>Suppliers</h1>
      <form onSubmit={save} className="card row">
        <label>Name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label>Phone<input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
        <label>Address<input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></label>
        <button>{f._id ? 'Update' : 'Add'} supplier</button>
        {f._id && <button type="button" className="sec" onClick={() => setF({ name: '', phone: '', address: '' })}>Cancel</button>}
      </form>
      {msg && <div className="err">{msg}</div>}
      <table><thead><tr><th>Name</th><th>Phone</th><th>Address</th><th></th></tr></thead>
        <tbody>{list.map((s) => <tr key={s._id}><td>{s.name}</td><td>{s.phone}</td><td>{s.address}</td><td><button className="sec" onClick={() => setF(s)}>Edit</button></td></tr>)}</tbody></table>
    </>
  );
}
