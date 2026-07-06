// ============================================================
//  src/pages/purchasing/PurchaseOrderListPage.js
//  Was a Stub placeholder with a GET-only backend. Full create
//  (with line items), partial/full receiving, and cancel.
// ============================================================
import { useState, useEffect } from 'react';
import api from '../../api/client';

const fmtCur = (n) => `GHS ${new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2 }).format(n || 0)}`;

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', {
      day:'2-digit', month:'short', year:'numeric' })
  : '—';

const STATUS_COLOR = {
  draft:     { color:'#6b7fa3', bg:'rgba(107,127,163,.1)' },
  sent:      { color:'#1e6bbd', bg:'rgba(30,107,189,.1)'  },
  partial:   { color:'#e8a04a', bg:'rgba(232,160,74,.1)'  },
  received:  { color:'#16c79a', bg:'rgba(22,199,154,.1)'  },
  cancelled: { color:'#e05c5c', bg:'rgba(224,92,92,.1)'   },
};

function Modal({ open, onClose, title, children, width = 560 }) {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0,
      background:'rgba(13,27,42,.5)', display:'flex',
      alignItems:'center', justifyContent:'center',
      zIndex:9999, padding:20 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'white', borderRadius:14,
        width:'100%', maxWidth:width, maxHeight:'90vh',
        overflow:'auto',
        boxShadow:'0 20px 60px rgba(13,27,42,.25)' }}>
        <div style={{ display:'flex', alignItems:'center',
          justifyContent:'space-between',
          padding:'18px 24px',
          borderBottom:'1px solid #e2e8f0' }}>
          <span style={{ fontSize:16, fontWeight:700 }}>{title}</span>
          <button onClick={onClose}
            style={{ background:'none', border:'none',
              fontSize:22, color:'#6b7fa3',
              cursor:'pointer', lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
}

const emptyLine = () => ({ productId:'', description:'', quantity:1, unitPrice:0, taxId:'' });

export default function PurchaseOrderListPage() {
  const [pos,       setPos]       = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products,  setProducts]  = useState([]);
  const [taxTypes,  setTaxTypes]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [modal,     setModal]     = useState(false);
  const [receiveTarget, setReceiveTarget] = useState(null);
  const [receiveQtys,   setReceiveQtys]   = useState({});
  const [filter,    setFilter]    = useState('all');

  const [form, setForm] = useState({
    supplierId:'', poDate: new Date().toISOString().slice(0,10),
    expectedDate:'', notes:'',
  });
  const [lines, setLines] = useState([emptyLine()]);

  // allSettled — an Admin can customize any role to have some of
  // these four but not others (e.g. purchase_orders without
  // inventory), and one denied/failed call used to sink the whole
  // Promise.all, leaving this entire page blank instead of just
  // missing that one reference list.
  const load = () => {
    setLoading(true);
    Promise.allSettled([
      api.get('/purchase-orders'),
      api.get('/suppliers'),
      api.get('/inventory'),
      api.get('/tax/types'),
    ]).then(([p, s, i, tt]) => {
      if (p.status === 'fulfilled')  setPos(p.value.data || []);
      if (s.status === 'fulfilled')  setSuppliers(s.value.data || []);
      if (i.status === 'fulfilled')  setProducts(i.value.data || []);
      if (tt.status === 'fulfilled') setTaxTypes(tt.value.data || []);
      [p, s, i, tt].forEach(r => { if (r.status === 'rejected') console.error(r.reason); });
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const updLine = (idx, f, v) => setLines(p => p.map((l,i) => i===idx ? {...l,[f]:v} : l));
  const addLine = () => setLines(p => [...p, emptyLine()]);
  const removeLine = (idx) => setLines(p => p.length > 1 ? p.filter((_,i) => i!==idx) : p);

  const lineTotal = (l) => {
    const base = (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0);
    const rate = l.taxId ? (taxTypes.find(t => t.id === parseInt(l.taxId))?.rate || 0) : 0;
    return base + base * (parseFloat(rate) / 100);
  };
  const grandTotal = lines.reduce((s,l) => s + lineTotal(l), 0);

  const handleCreate = async () => {
    if (!form.supplierId) return alert('Supplier is required');
    if (!lines.some(l => l.description)) return alert('At least one line needs a description');
    setSaving(true);
    try {
      await api.post('/purchase-orders', { ...form, lines });
      load();
      setModal(false);
      setForm({ supplierId:'', poDate: new Date().toISOString().slice(0,10), expectedDate:'', notes:'' });
      setLines([emptyLine()]);
    } catch (err) {
      alert(err.message || 'Failed to create purchase order');
    } finally { setSaving(false); }
  };

  const openReceive = async (po) => {
    const res = await api.get(`/purchase-orders/${po.id}`);
    setReceiveTarget(res.data);
    const qtys = {};
    res.data.lines.forEach(l => {
      const remaining = parseFloat(l.quantity) - parseFloat(l.quantity_received);
      qtys[l.id] = remaining > 0 ? remaining : 0;
    });
    setReceiveQtys(qtys);
  };

  const handleReceive = async () => {
    const lines = Object.entries(receiveQtys)
      .filter(([, qty]) => parseFloat(qty) > 0)
      .map(([lineId, qty]) => ({ lineId: parseInt(lineId), quantityReceived: parseFloat(qty) }));
    if (!lines.length) return alert('Enter a quantity to receive for at least one line');
    setSaving(true);
    try {
      await api.post(`/purchase-orders/${receiveTarget.id}/receive`, { lines });
      load();
      setReceiveTarget(null);
    } catch (err) {
      alert(err.message || 'Failed to receive stock');
    } finally { setSaving(false); }
  };

  const handleCancel = async (po) => {
    if (!window.confirm(`Cancel ${po.po_number}?`)) return;
    try {
      await api.post(`/purchase-orders/${po.id}/cancel`);
      load();
    } catch (err) {
      alert(err.message || 'Failed to cancel purchase order');
    }
  };

  const filtered = filter === 'all' ? pos : pos.filter(p => p.status === filter);

  const inp = { width:'100%', padding:'9px 12px',
    border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13,
    fontFamily:'sans-serif', background:'#f9fafb', outline:'none' };
  const lbl = { display:'block', fontSize:11, fontWeight:600,
    color:'#1a2740', marginBottom:6 };
  const g2  = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 };
  const STATUSES = ['all','draft','sent','partial','received','cancelled'];

  return (
    <div style={{ fontFamily:'sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between',
        alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#1a2740', marginBottom:4 }}>
            Purchase Orders
          </h1>
          <p style={{ fontSize:13, color:'#6b7fa3' }}>
            Order stock from suppliers and track what's arrived
          </p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ padding:'10px 20px', background:'#1e6bbd',
            color:'white', border:'none', borderRadius:8,
            fontSize:13, fontWeight:700, cursor:'pointer' }}>
          + New Purchase Order
        </button>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {STATUSES.map(s => {
          const sc = STATUS_COLOR[s] || { color:'#1e6bbd', bg:'rgba(30,107,189,.1)' };
          const isActive = filter === s;
          return (
            <button key={s} onClick={() => setFilter(s)}
              style={{ padding:'7px 16px', borderRadius:20,
                border:'none', cursor:'pointer', fontSize:12,
                fontWeight:600,
                background: isActive ? (s==='all' ? '#1e6bbd' : sc.color) : 'white',
                color: isActive ? 'white' : (s==='all' ? '#1e6bbd' : sc.color),
                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,.15)' : '0 1px 4px rgba(0,0,0,.06)' }}>
              {s==='all' ? 'All' : s.charAt(0).toUpperCase()+s.slice(1)}
              {s !== 'all' && <span style={{ marginLeft:6, opacity:.7 }}>
                ({pos.filter(p=>p.status===s).length})
              </span>}
            </button>
          );
        })}
      </div>

      <div style={{ background:'white', borderRadius:12,
        border:'1px solid #e2e8f0', overflow:'hidden',
        boxShadow:'0 2px 8px rgba(13,27,42,.04)' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:60, color:'#6b7fa3' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#6b7fa3' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📦</div>
            <p style={{ fontSize:15, fontWeight:600, color:'#1a2740' }}>
              No purchase orders {filter !== 'all' ? `(${filter})` : 'yet'}
            </p>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['PO #','Supplier','Date','Total','Status',''].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left',
                    fontSize:10, fontWeight:600, color:'#6b7fa3',
                    textTransform:'uppercase', letterSpacing:.7,
                    background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(po => {
                const sc = STATUS_COLOR[po.status] || STATUS_COLOR.draft;
                return (
                  <tr key={po.id} style={{ borderBottom:'1px solid #f4f6f9' }}>
                    <td style={{ padding:'12px 16px', fontFamily:'monospace',
                      fontSize:12, color:'#1e6bbd', fontWeight:600 }}>
                      {po.po_number}
                    </td>
                    <td style={{ padding:'12px 16px', fontSize:13 }}>{po.supplier_name}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, color:'#6b7fa3' }}>
                      {fmtDate(po.po_date)}
                    </td>
                    <td style={{ padding:'12px 16px', fontFamily:'monospace', fontSize:12 }}>
                      {fmtCur(po.total_amount)}
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11,
                        fontWeight:600, background:sc.bg, color:sc.color }}>
                        {po.status}
                      </span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        {['draft','sent','partial'].includes(po.status) && (
                          <button onClick={() => openReceive(po)}
                            style={{ padding:'5px 10px', borderRadius:6,
                              border:'1px solid #e2e8f0', background:'white',
                              color:'#16c79a', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                            Receive
                          </button>
                        )}
                        {!['received','cancelled'].includes(po.status) && (
                          <button onClick={() => handleCancel(po)}
                            style={{ padding:'5px 10px', borderRadius:6,
                              border:'1px solid #f8b4b4', background:'white',
                              color:'#c04040', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* New PO Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="New Purchase Order" width={700}>
        <div>
          <div style={g2}>
            <div>
              <label style={lbl}>Supplier *</label>
              <select style={inp} value={form.supplierId}
                onChange={e=>setForm(p=>({...p,supplierId:e.target.value}))}>
                <option value="">Select…</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>PO Date *</label>
              <input style={inp} type="date" value={form.poDate}
                onChange={e=>setForm(p=>({...p,poDate:e.target.value}))}/>
            </div>
          </div>
          <div style={{ ...g2, marginTop:14 }}>
            <div>
              <label style={lbl}>Expected Date</label>
              <input style={inp} type="date" value={form.expectedDate}
                onChange={e=>setForm(p=>({...p,expectedDate:e.target.value}))}/>
            </div>
            <div>
              <label style={lbl}>Notes</label>
              <input style={inp} value={form.notes}
                onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/>
            </div>
          </div>

          <div style={{ marginTop:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <label style={lbl}>Line Items</label>
              <button onClick={addLine}
                style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #1e6bbd',
                  background:'white', color:'#1e6bbd', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                + Add Line
              </button>
            </div>
            {lines.map((line, idx) => (
              <div key={idx} style={{ display:'grid',
                gridTemplateColumns:'1.4fr 2fr 0.7fr 0.9fr 1fr auto',
                gap:8, marginBottom:8, alignItems:'center' }}>
                <select style={inp} value={line.productId}
                  onChange={e=>{
                    const prod = products.find(p => p.id === parseInt(e.target.value));
                    updLine(idx, 'productId', e.target.value);
                    if (prod) {
                      updLine(idx, 'description', prod.name);
                      updLine(idx, 'unitPrice', prod.cost_price || prod.unit_price || 0);
                    }
                  }}>
                  <option value="">No product…</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input style={inp} placeholder="Description"
                  value={line.description}
                  onChange={e=>updLine(idx,'description',e.target.value)}/>
                <input style={inp} type="number" placeholder="Qty"
                  value={line.quantity}
                  onChange={e=>updLine(idx,'quantity',e.target.value)}/>
                <input style={inp} type="number" step="0.01" placeholder="Price"
                  value={line.unitPrice}
                  onChange={e=>updLine(idx,'unitPrice',e.target.value)}/>
                <select style={inp} value={line.taxId}
                  onChange={e=>updLine(idx,'taxId',e.target.value)}>
                  <option value="">No tax</option>
                  {taxTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button onClick={() => removeLine(idx)}
                  style={{ background:'none', border:'none', color:'#c04040',
                    fontSize:18, cursor:'pointer', padding:0 }}>×</button>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:12,
            fontSize:14, fontWeight:700, color:'#1a2740' }}>
            Total: {fmtCur(grandTotal)}
          </div>

          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
            <button onClick={() => setModal(false)}
              style={{ padding:'10px 20px', borderRadius:8,
                border:'1px solid #e2e8f0', background:'white',
                color:'#6b7fa3', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Cancel
            </button>
            <button onClick={handleCreate} disabled={saving}
              style={{ padding:'10px 20px', borderRadius:8, border:'none',
                background:saving?'#6b7fa3':'#1e6bbd', color:'white',
                fontSize:13, fontWeight:700, cursor:saving?'not-allowed':'pointer' }}>
              {saving?'Creating...':'Create Purchase Order'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Receive Modal */}
      <Modal open={!!receiveTarget} onClose={() => setReceiveTarget(null)}
        title={`Receive Stock — ${receiveTarget?.po_number || ''}`}>
        <div>
          {receiveTarget?.lines.map(l => {
            const remaining = parseFloat(l.quantity) - parseFloat(l.quantity_received);
            return (
              <div key={l.id} style={{ display:'flex', justifyContent:'space-between',
                alignItems:'center', padding:'10px 0', borderBottom:'1px solid #f4f6f9' }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13 }}>{l.description}</div>
                  <div style={{ fontSize:11, color:'#6b7fa3' }}>
                    {parseFloat(l.quantity_received).toFixed(2)} / {parseFloat(l.quantity).toFixed(2)} received
                  </div>
                </div>
                <input type="number" step="0.01" min="0" max={remaining}
                  style={{ ...inp, width:100 }}
                  disabled={remaining <= 0}
                  value={receiveQtys[l.id] ?? 0}
                  onChange={e=>setReceiveQtys(p=>({...p,[l.id]:e.target.value}))}/>
              </div>
            );
          })}
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
            <button onClick={() => setReceiveTarget(null)}
              style={{ padding:'10px 20px', borderRadius:8,
                border:'1px solid #e2e8f0', background:'white',
                color:'#6b7fa3', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Cancel
            </button>
            <button onClick={handleReceive} disabled={saving}
              style={{ padding:'10px 20px', borderRadius:8, border:'none',
                background:saving?'#6b7fa3':'#16c79a', color:'white',
                fontSize:13, fontWeight:700, cursor:saving?'not-allowed':'pointer' }}>
              {saving?'Receiving...':'Confirm Receipt'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
