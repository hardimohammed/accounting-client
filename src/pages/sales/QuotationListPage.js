// ============================================================
//  src/pages/sales/QuotationListPage.js
//  Was a Stub placeholder with a GET-only backend. Quotations have
//  no line-items table in this schema — totals are entered directly
//  rather than itemized.
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
  accepted:  { color:'#16c79a', bg:'rgba(22,199,154,.1)'  },
  rejected:  { color:'#e05c5c', bg:'rgba(224,92,92,.1)'   },
  expired:   { color:'#e8a04a', bg:'rgba(232,160,74,.1)'  },
  converted: { color:'#7c3aed', bg:'rgba(124,58,237,.1)'  },
};

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0,
      background:'rgba(13,27,42,.5)', display:'flex',
      alignItems:'center', justifyContent:'center',
      zIndex:9999, padding:20 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'white', borderRadius:14,
        width:'100%', maxWidth:520, maxHeight:'90vh',
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

export default function QuotationListPage() {
  const [quotes,    setQuotes]    = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [modal,     setModal]     = useState(false);
  const [filter,    setFilter]    = useState('all');

  const [form, setForm] = useState({
    customerId:'', quotationDate: new Date().toISOString().slice(0,10),
    expiryDate:'', subtotal:0, taxAmount:0, discountAmount:0, notes:'', terms:'',
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/quotations'),
      api.get('/customers'),
    ]).then(([q, c]) => {
      setQuotes(q.data || []);
      setCustomers(c.data || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const total = (parseFloat(form.subtotal)||0) + (parseFloat(form.taxAmount)||0) - (parseFloat(form.discountAmount)||0);

  const handleCreate = async () => {
    if (!form.customerId) return alert('Customer is required');
    if (!form.quotationDate) return alert('Quotation date is required');
    setSaving(true);
    try {
      await api.post('/quotations', form);
      load();
      setModal(false);
      setForm({
        customerId:'', quotationDate: new Date().toISOString().slice(0,10),
        expiryDate:'', subtotal:0, taxAmount:0, discountAmount:0, notes:'', terms:'',
      });
    } catch (err) {
      alert(err.message || 'Failed to create quotation');
    } finally { setSaving(false); }
  };

  const handleSend = async (q) => {
    try {
      await api.post(`/quotations/${q.id}/send`);
      load();
    } catch (err) { alert(err.message || 'Failed to send quotation'); }
  };

  const handleConvert = async (q) => {
    if (!window.confirm(`Convert ${q.quotation_number} to an invoice?`)) return;
    try {
      const res = await api.post(`/quotations/${q.id}/convert`);
      load();
      alert(`Converted to invoice ${res.data.invoiceNumber}`);
    } catch (err) { alert(err.message || 'Failed to convert quotation'); }
  };

  const handleDelete = async (q) => {
    if (!window.confirm(`Delete ${q.quotation_number}?`)) return;
    try {
      await api.delete(`/quotations/${q.id}`);
      load();
    } catch (err) { alert(err.message || 'Failed to delete quotation'); }
  };

  const filtered = filter === 'all' ? quotes : quotes.filter(q => q.status === filter);

  const inp = { width:'100%', padding:'9px 12px',
    border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13,
    fontFamily:'sans-serif', background:'#f9fafb', outline:'none' };
  const lbl = { display:'block', fontSize:11, fontWeight:600,
    color:'#1a2740', marginBottom:6 };
  const g2  = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 };
  const STATUSES = ['all','draft','sent','accepted','rejected','expired','converted'];

  return (
    <div style={{ fontFamily:'sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between',
        alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#1a2740', marginBottom:4 }}>
            Quotations
          </h1>
          <p style={{ fontSize:13, color:'#6b7fa3' }}>
            Send price quotes to customers and convert accepted ones to invoices
          </p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ padding:'10px 20px', background:'#1e6bbd',
            color:'white', border:'none', borderRadius:8,
            fontSize:13, fontWeight:700, cursor:'pointer' }}>
          + New Quotation
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
                ({quotes.filter(q=>q.status===s).length})
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
            <div style={{ fontSize:40, marginBottom:12 }}>📄</div>
            <p style={{ fontSize:15, fontWeight:600, color:'#1a2740' }}>
              No quotations {filter !== 'all' ? `(${filter})` : 'yet'}
            </p>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Quote #','Customer','Date','Expiry','Total','Status',''].map(h => (
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
              {filtered.map(q => {
                const sc = STATUS_COLOR[q.status] || STATUS_COLOR.draft;
                return (
                  <tr key={q.id} style={{ borderBottom:'1px solid #f4f6f9' }}>
                    <td style={{ padding:'12px 16px', fontFamily:'monospace',
                      fontSize:12, color:'#1e6bbd', fontWeight:600 }}>
                      {q.quotation_number}
                    </td>
                    <td style={{ padding:'12px 16px', fontSize:13 }}>{q.customer_name}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, color:'#6b7fa3' }}>
                      {fmtDate(q.quotation_date)}
                    </td>
                    <td style={{ padding:'12px 16px', fontSize:13, color:'#6b7fa3' }}>
                      {fmtDate(q.expiry_date)}
                    </td>
                    <td style={{ padding:'12px 16px', fontFamily:'monospace', fontSize:12 }}>
                      {fmtCur(q.total_amount)}
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11,
                        fontWeight:600, background:sc.bg, color:sc.color }}>
                        {q.status}
                      </span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        {q.status === 'draft' && (
                          <>
                            <button onClick={() => handleSend(q)}
                              style={{ padding:'5px 10px', borderRadius:6,
                                border:'1px solid #e2e8f0', background:'white',
                                color:'#1e6bbd', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                              Send
                            </button>
                            <button onClick={() => handleDelete(q)}
                              style={{ padding:'5px 10px', borderRadius:6,
                                border:'1px solid #f8b4b4', background:'white',
                                color:'#c04040', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                              Delete
                            </button>
                          </>
                        )}
                        {['sent','accepted'].includes(q.status) && (
                          <button onClick={() => handleConvert(q)}
                            style={{ padding:'5px 10px', borderRadius:6,
                              border:'none', background:'#16c79a',
                              color:'white', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                            Convert to Invoice
                          </button>
                        )}
                        {q.status === 'converted' && q.converted_to_invoice_id && (
                          <span style={{ fontSize:11, color:'#6b7fa3' }}>
                            → Invoice #{q.converted_to_invoice_id}
                          </span>
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

      {/* New Quotation Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="New Quotation">
        <div>
          <div style={g2}>
            <div>
              <label style={lbl}>Customer *</label>
              <select style={inp} value={form.customerId}
                onChange={e=>upd('customerId',e.target.value)}>
                <option value="">Select…</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Quotation Date *</label>
              <input style={inp} type="date" value={form.quotationDate}
                onChange={e=>upd('quotationDate',e.target.value)}/>
            </div>
          </div>
          <div style={{ ...g2, marginTop:14 }}>
            <div>
              <label style={lbl}>Expiry Date</label>
              <input style={inp} type="date" value={form.expiryDate}
                onChange={e=>upd('expiryDate',e.target.value)}/>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginTop:14 }}>
            <div>
              <label style={lbl}>Subtotal</label>
              <input style={inp} type="number" step="0.01" value={form.subtotal}
                onChange={e=>upd('subtotal',e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>Tax Amount</label>
              <input style={inp} type="number" step="0.01" value={form.taxAmount}
                onChange={e=>upd('taxAmount',e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>Discount</label>
              <input style={inp} type="number" step="0.01" value={form.discountAmount}
                onChange={e=>upd('discountAmount',e.target.value)}/>
            </div>
          </div>
          <div style={{ marginTop:14 }}>
            <label style={lbl}>Notes</label>
            <textarea style={{ ...inp, height:60, resize:'vertical' }}
              value={form.notes} onChange={e=>upd('notes',e.target.value)}/>
          </div>
          <div style={{ marginTop:14 }}>
            <label style={lbl}>Terms</label>
            <textarea style={{ ...inp, height:60, resize:'vertical' }}
              value={form.terms} onChange={e=>upd('terms',e.target.value)}/>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:12,
            fontSize:14, fontWeight:700, color:'#1a2740' }}>
            Total: {fmtCur(total)}
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
              {saving?'Creating...':'Create Quotation'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
