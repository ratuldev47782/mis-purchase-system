// app/components/CategorySelect.js

'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

// Searchable category picker. Type to filter, click / Enter to select.
export default function CategorySelect({ categories, value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const [pos, setPos] = useState(null);
  const box = useRef(null);
  const listRef = useRef(null);
  const current = categories.find((c) => String(c._id) === String(value));
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? categories.filter((c) => c.name.toLowerCase().includes(s)) : categories;
  }, [categories, q]);

  const show = () => {
    if (disabled || !box.current) return;
    const r = box.current.getBoundingClientRect();
    const width = Math.max(r.width, 240);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    setPos({ left, top: r.bottom + 2, width });
    setQ(''); setHi(0); setOpen(true);
  };
  const pick = (c) => { onChange(String(c._id)); setOpen(false); };

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (e && listRef.current && listRef.current.contains(e.target)) return; setOpen(false); };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [open]);

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) show(); else setHi((h) => Math.min(h + 1, list.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { if (open) { e.preventDefault(); if (list[hi]) pick(list[hi]); } }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={box}>
      <input
        className="w-full"
        disabled={disabled}
        value={open ? q : current ? current.name : ''}
        placeholder="Select category (type to search)"
        onFocus={show}
        onClick={() => { if (!open) show(); }}
        onChange={(e) => { setQ(e.target.value); setHi(0); if (!open) show(); }}
        onBlur={() => setOpen(false)}
        onKeyDown={onKey}
        style={!current && !open ? { background: '#fff1f1' } : undefined}
      />
      {open && pos && (
        <div ref={listRef} role="listbox" style={{
          position: 'fixed', left: pos.left, top: pos.top, width: pos.width, zIndex: 1000, background: '#fff', color: '#000',
          border: '1px solid #888', boxShadow: '0 4px 14px rgba(0,0,0,.25)', maxHeight: 220, overflowY: 'auto',
          fontSize: 12, fontWeight: 400,
        }}>
          {list.map((c, i) => (
            <div key={c._id} role="option" aria-selected={String(c._id) === String(value)}
              onMouseDown={(e) => { e.preventDefault(); pick(c); }} onMouseEnter={() => setHi(i)}
              style={{ padding: '4px 8px', cursor: 'pointer', background: i === hi ? '#dbeafe' : '#fff', fontWeight: String(c._id) === String(value) ? 700 : 400 }}>
              {c.name}
            </div>
          ))}
          {!list.length && <div style={{ padding: '6px 8px', color: '#888' }}>No category found</div>}
        </div>
      )}
    </div>
  );
}