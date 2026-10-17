'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
export default function Settings() {
  const [s, setS] = useState(null); const [cats, setCats] = useState([]); const [name, setName] = useState(''); const [msg, setMsg] = useState('');
  const load = () => { api('/api/settings').then(setS); api('/api/categories').then(setCats); };
  useEffect(() => { load(); }, []);
  const run = async (fn) => { setMsg(''); try { await fn(); load(); } catch (x) { setMsg(x.message); } };
  if (!s) return <><h1>Settings</h1>Loading...</>;
  return (
    <><h1>Settings</h1>
      <div className="card row">
        <label>Starting Bill No (used only when there are no bills yet)<input type="number" value={s.startingBillNo} onChange={(e) => setS({ ...s, startingBillNo: e.target.value })} /></label>
        <label>Ledger Amount mode
          <select value={s.ledgerAmountMode} onChange={(e) => setS({ ...s, ledgerAmountMode: e.target.value })}>
            <option value="subtotal">Subtotal (without AIT/VAT/TAX)</option><option value="total">Total (with tax)</option>
          </select></label>
        <button onClick={() => run(async () => { await api('/api/settings', { method: 'PUT', body: s }); setMsg('Saved'); })}>Save</button>
      </div>
      <div className="card">
        <b>Categories (Item&apos;s Name in IT Accessories sheet)</b>
        <table style={{ marginTop: 8 }}><tbody>
          {cats.map((c) => (
            <tr key={c._id}>
              <td><input style={{ width: '100%' }} defaultValue={c.name} onBlur={(e) => e.target.value !== c.name && run(() => api('/api/categories', { method: 'PUT', body: { ...c, name: e.target.value } }))} /></td>
              <td><button className="red" onClick={() => confirm('Delete category?') && run(() => api('/api/categories?id=' + c._id, { method: 'DELETE' }))}>Delete</button></td>
            </tr>))}
        </tbody></table>
        <div className="row" style={{ marginTop: 8 }}>
          <input placeholder="New category" value={name} onChange={(e) => setName(e.target.value)} />
          <button onClick={() => run(async () => { await api('/api/categories', { method: 'POST', body: { name } }); setName(''); })}>Add</button>
        </div>
      </div>
      {msg && <div className={msg === 'Saved' ? 'ok' : 'err'}>{msg}</div>}
    </>
  );
}
