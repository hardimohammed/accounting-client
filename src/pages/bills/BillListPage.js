import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

const fmtCur = (n) => `GHS ${new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2 }).format(n || 0)}`;

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

function Badge({ status }) {
  const map = {
    draft:     { bg:'rgba(107,127,163,.12)', color:'#6b7fa3' },
    approved:  { bg:'rgba(30,107,189,.12)',  color:'#1e6bbd' },
    paid:      { bg:'rgba(22,199,154,.12)',  color:'#0ea87f' },
    partial:   { bg:'rgba(232,160,74,.14)',  color:'#c47a1a' },
    overdue:   { bg:'rgba(224,92,92,.12)',   color:'#c04040' },
    cancelled: { bg:'rgba(107,127,163,.12)', color:'#6b7fa3' },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11,
      fontWeight:600, background:s.bg, color:s.color,
      textTransform:'capitalize' }}>
      {status}
    </span>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0,
      background:'rgba(13,27,42,.5)', display:'flex',
      alignItems:'center', justifyContent:'center',
      zIndex:9999, padding:20 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'white', borderRadius:14,
        width:'100%', maxWidth:620,
        maxHeight:'90vh', overflow:'auto',
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

const EMPTY_LINE = {
  description:'', quantity:1, unitPrice:0, discountPct:0, taxRate:0
};

export default function BillListPage() {
  const navigate = useNavigate();

  const [bills,      setBills]     = useState([]);
  const [suppliers,  setSuppliers] = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [search,     setSearch]    = useState('');
  const [statusFilter, setStatus]  = useState('');
  const [modal,      setModal]     = useState(false);
  const [saving,     setSaving]    = useState(false);

  const [form, setForm] = useState({
    supplierId:'', billDate:'', dueDate:'',
    currency:'GHS', exchangeRate:1,
    supplierRef:'', notes:'',
  });
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/bills'),
      api.get('/suppliers'),
    ]).then(([b, s]) => {
      setBills(b.data || []);
      setSuppliers(s.data || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));

  // ── Line item helpers ──────────────────────────────────────
  const updLine = (i, f, v) => {
    setLines(prev => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [f]: v };
      return copy;
    });
  };
  const addLine    = () => setLines(p => [...p, { ...EMPTY_LINE }]);
  const removeLine = (i) => lines.length > 1 &&
    setLines(p => p.filter((_, idx) => idx !== i));

  // ── Totals ─────────────────────────────────────────────────
  const calcLine = (l) => {
    const base = (parseFloat(l.quantity)||0) * (parseFloat(l.unitPrice)||0);
    const disc = base * ((parseFloat(l.discountPct)||0) / 100);
    const net  = base - disc;
    const tax  = net  * ((parseFloat(l.taxRate)||0) / 100);
    return net + tax;
  };
  const subtotal = lines.reduce((s, l) => s + calcLine(l), 0);

  // ── Create bill ────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.supplierId) return alert('Please select a supplier');
    if (!form.billDate)   return alert('Please enter a bill date');
    if (!form.dueDate)    return alert('Please enter a due date');
    if (lines.some(l => !l.description))
      return alert('All line items must have a description');

    setSaving(true);
    try {
      const payload = {
        ...form,
        lines: lines.map(l => ({
          description:  l.description,
          quantity:     parseFloat(l.quantity)    || 1,
          unitPrice:    parseFloat(l.unitPrice)   || 0,
          discountPct:  parseFloat(l.discountPct) || 0,
          taxRate:      parseFloat(l.taxRate)     || 0,
        })),
      };
      const res = await api.post('/bills', payload);
      alert(`Bill ${res.data?.billNumber} created successfully!`);
      load();
      setModal(false);
      setForm({ supplierId:'', billDate:'', dueDate:'',
        currency:'GHS', exchangeRate:1, supplierRef:'', notes:'' });
      setLines([{ ...EMPTY_LINE }]);
    } catch (err) {
      alert(err.message || 'Failed to create bill');
    } finally { setSaving(false); }
  };

  // ── Actions ────────────────────────────────────────────────
  const handleApprove = async (id, e) => {
    e.stopPropagation();
    try {
      await api.post(`/bills/${id}/approve`);
      load();
    } catch (err) { alert(err.message); }
  };

  const filtered = bills.filter(b =>
    (!statusFilter || b.status === statusFilter) &&
    (!search ||
      b.bill_number?.toLowerCase().includes(search.toLowerCase()) ||
      b.supplier_name?.toLowerCase().includes(search.toLowerCase()))
  );

  // ── Totals across all bills ────────────────────────────────
  const totalBills   = bills.reduce((s,b) => s+parseFloat(b.total_amount||0),0);
  const totalPaid    = bills.reduce((s,b) => s+parseFloat(b.amount_paid ||0),0);
  const totalOutstanding = totalBills - totalPaid;

  const inp = { width:'100%', padding:'9px 12px',
    border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13,
    fontFamily:'sans-serif', background:'#f9fafb', outline:'none' };
  const lbl = { display:'block', fontSize:11, fontWeight:600,
    color:'#1a2740', marginBottom:6 };
  const g2  = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 };
  const g3  = { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 };

  return (
    <div style={{ fontFamily:'sans-serif' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between',
        alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700,
            color:'#1a2740', marginBottom:4 }}>Bills & Expenses</h1>
          <p style={{ fontSize:13, color:'#6b7fa3' }}>
            Track supplier bills, approvals and payments
          </p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ padding:'10px 20px', background:'#1e6bbd',
            color:'white', border:'none', borderRadius:8,
            fontSize:13, fontWeight:700, cursor:'pointer' }}>
          + New Bill
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid',
        gridTemplateColumns:'repeat(4,1fr)',
        gap:12, marginBottom:20 }}>
        {[
          { label:'Total Bills',    value:fmtCur(totalBills),       color:'#1e6bbd' },
          { label:'Total Paid',     value:fmtCur(totalPaid),        color:'#16c79a' },
          { label:'Outstanding',    value:fmtCur(totalOutstanding), color:'#e8a04a' },
          { label:'Overdue Bills',
            value:bills.filter(b=>b.status==='overdue').length,
            color:'#e05c5c' },
        ].map((s,i) => (
          <div key={i} style={{ background:'white', borderRadius:12,
            padding:16, border:'1px solid #e2e8f0',
            boxShadow:'0 2px 8px rgba(13,27,42,.04)' }}>
            <div style={{ fontSize:11, color:'#6b7fa3',
              fontWeight:500, marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:18, fontWeight:700, color:s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background:'white', border:'1px solid #e2e8f0',
        borderRadius:10, padding:'10px 16px', marginBottom:16,
        display:'flex', alignItems:'center', gap:12 }}>
        <span>🔍</span>
        <input placeholder="Search bills or suppliers..."
          value={search} onChange={e=>setSearch(e.target.value)}
          style={{ border:'none', outline:'none', fontSize:13,
            fontFamily:'sans-serif', flex:1, background:'none',
            color:'#1a2740' }}/>
        <select value={statusFilter}
          onChange={e=>setStatus(e.target.value)}
          style={{ padding:'7px 12px', border:'1px solid #e2e8f0',
            borderRadius:7, fontSize:12, fontFamily:'sans-serif',
            color:'#1a2740', background:'#f9fafb', outline:'none' }}>
          <option value="">All Status</option>
          {['draft','approved','partial','paid','overdue','cancelled']
            .map(s=>(
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase()+s.slice(1)}
              </option>
            ))}
        </select>
      </div>

      {/* Table */}
      <div style={{ background:'white', borderRadius:12,
        border:'1px solid #e2e8f0', overflow:'hidden',
        boxShadow:'0 2px 8px rgba(13,27,42,.04)' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:60, color:'#6b7fa3' }}>
            <div style={{ width:28, height:28, border:'3px solid #e2e8f0',
              borderTopColor:'#1e6bbd', borderRadius:'50%',
              animation:'spin .7s linear infinite',
              margin:'0 auto 12px' }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            Loading bills...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px',
            color:'#6b7fa3' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📄</div>
            <p style={{ fontSize:15, fontWeight:600,
              color:'#1a2740', marginBottom:20 }}>
              {search||statusFilter ? 'No bills match' : 'No bills yet'}
            </p>
            {!search && !statusFilter && (
              <button onClick={() => setModal(true)}
                style={{ padding:'10px 24px', background:'#1e6bbd',
                  color:'white', border:'none', borderRadius:8,
                  fontSize:13, fontWeight:600, cursor:'pointer' }}>
                + Create First Bill
              </button>
            )}
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Bill #','Supplier','Bill Date','Due Date',
                  'Total','Paid','Balance','Status','Actions'].map(h=>(
                  <th key={h} style={{ padding:'10px 16px',
                    textAlign:'left', fontSize:10, fontWeight:600,
                    color:'#6b7fa3', textTransform:'uppercase',
                    letterSpacing:.7, background:'#f8fafc',
                    borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((bill,i) => {
                const balance = parseFloat(bill.balance_due||0);
                return (
                  <tr key={i}
                    style={{ borderBottom:'1px solid #f4f6f9',
                      cursor:'pointer' }}>
                    <td style={{ padding:'12px 16px',
                      fontFamily:'monospace', fontSize:12,
                      color:'#1e6bbd', fontWeight:600 }}>
                      {bill.bill_number}
                    </td>
                    <td style={{ padding:'12px 16px',
                      fontWeight:500, fontSize:13 }}>
                      {bill.supplier_name}
                    </td>
                    <td style={{ padding:'12px 16px',
                      color:'#6b7fa3', fontSize:13 }}>
                      {fmtDate(bill.bill_date)}
                    </td>
                    <td style={{ padding:'12px 16px',
                      color: bill.status==='overdue'
                        ? '#e05c5c' : '#6b7fa3',
                      fontSize:13 }}>
                      {fmtDate(bill.due_date)}
                    </td>
                    <td style={{ padding:'12px 16px',
                      fontFamily:'monospace', fontSize:12 }}>
                      {fmtCur(bill.total_amount)}
                    </td>
                    <td style={{ padding:'12px 16px',
                      fontFamily:'monospace', fontSize:12,
                      color:'#16c79a' }}>
                      {fmtCur(bill.amount_paid)}
                    </td>
                    <td style={{ padding:'12px 16px',
                      fontFamily:'monospace', fontSize:12,
                      fontWeight:700,
                      color:balance>0?'#e8a04a':'#16c79a' }}>
                      {fmtCur(balance)}
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <Badge status={bill.status}/>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        {bill.status==='draft' && (
                          <button
                            onClick={e=>handleApprove(bill.id,e)}
                            style={{ padding:'5px 10px', borderRadius:6,
                              border:'1px solid #16c79a',
                              background:'none', color:'#16c79a',
                              fontSize:11, fontWeight:600,
                              cursor:'pointer' }}>
                            Approve
                          </button>
                        )}
                        {bill.status==='approved' && (
                          <button
                            onClick={async e => {
                              e.stopPropagation();
                              try {
                                await api.post(`/bills/${bill.id}/post`);
                                load();
                              } catch(err){ alert(err.message); }
                            }}
                            style={{ padding:'5px 10px', borderRadius:6,
                              border:'1px solid #1e6bbd',
                              background:'none', color:'#1e6bbd',
                              fontSize:11, fontWeight:600,
                              cursor:'pointer' }}>
                            Post to GL
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

      {/* New Bill Modal */}
      <Modal open={modal}
        onClose={()=>setModal(false)}
        title="New Bill">
        <div>
          {/* Supplier & Dates */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Supplier *</label>
            <select style={inp} value={form.supplierId}
              onChange={e=>upd('supplierId',e.target.value)}>
              <option value="">Select supplier...</option>
              {suppliers.map(s=>(
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {suppliers.length===0 && (
              <p style={{ fontSize:11, color:'#e05c5c', marginTop:4 }}>
                No suppliers found.{' '}
                <span style={{ color:'#1e6bbd', cursor:'pointer' }}
                  onClick={()=>{setModal(false);navigate('/suppliers');}}>
                  Add a supplier first →
                </span>
              </p>
            )}
          </div>

          <div style={g3}>
            <div>
              <label style={lbl}>Bill Date *</label>
              <input style={inp} type="date" value={form.billDate}
                onChange={e=>upd('billDate',e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>Due Date *</label>
              <input style={inp} type="date" value={form.dueDate}
                onChange={e=>upd('dueDate',e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>Currency</label>
              <select style={inp} value={form.currency}
                onChange={e=>upd('currency',e.target.value)}>
                {['GHS','USD','EUR','GBP'].map(c=>(
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop:14 }}>
            <label style={lbl}>Supplier Reference (optional)</label>
            <input style={inp} placeholder="Supplier's own invoice number"
              value={form.supplierRef}
              onChange={e=>upd('supplierRef',e.target.value)}/>
          </div>

          {/* Line Items */}
          <div style={{ marginTop:20 }}>
            <div style={{ fontSize:13, fontWeight:700,
              color:'#1a2740', marginBottom:12 }}>
              Line Items
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse',
                minWidth:600 }}>
                <thead>
                  <tr style={{ background:'#f8fafc' }}>
                    {['Description','Qty','Unit Price','Discount %','Total',''].map(h=>(
                      <th key={h} style={{ padding:'8px 10px',
                        textAlign: h==='Total'||h==='Qty'||h==='Unit Price'||h==='Discount %'
                          ? 'right' : 'left',
                        fontSize:10, fontWeight:600, color:'#6b7fa3',
                        textTransform:'uppercase', letterSpacing:.5,
                        borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line,i)=>(
                    <tr key={i}>
                      <td style={{ padding:'6px 8px' }}>
                        <input
                          placeholder="Description of goods/service"
                          value={line.description}
                          onChange={e=>updLine(i,'description',e.target.value)}
                          style={{ ...inp, padding:'6px 8px', fontSize:12 }}/>
                      </td>
                      <td style={{ padding:'6px 8px', width:70 }}>
                        <input type="number" min="0" step="0.01"
                          value={line.quantity}
                          onChange={e=>updLine(i,'quantity',e.target.value)}
                          style={{ ...inp, padding:'6px 8px',
                            fontSize:12, textAlign:'right', width:60 }}/>
                      </td>
                      <td style={{ padding:'6px 8px', width:110 }}>
                        <input type="number" min="0" step="0.01"
                          value={line.unitPrice}
                          onChange={e=>updLine(i,'unitPrice',e.target.value)}
                          style={{ ...inp, padding:'6px 8px',
                            fontSize:12, textAlign:'right', width:100 }}/>
                      </td>
                      <td style={{ padding:'6px 8px', width:90 }}>
                        <input type="number" min="0" max="100" step="0.01"
                          value={line.discountPct}
                          onChange={e=>updLine(i,'discountPct',e.target.value)}
                          style={{ ...inp, padding:'6px 8px',
                            fontSize:12, textAlign:'right', width:80 }}/>
                      </td>
                      <td style={{ padding:'6px 8px', width:110,
                        fontFamily:'monospace', fontSize:12,
                        fontWeight:700, color:'#1e6bbd',
                        textAlign:'right' }}>
                        {fmtCur(calcLine(line))}
                      </td>
                      <td style={{ padding:'6px 8px', width:32 }}>
                        {lines.length>1 && (
                          <button onClick={()=>removeLine(i)}
                            style={{ background:'none', border:'none',
                              color:'#e05c5c', fontSize:16,
                              cursor:'pointer', lineHeight:1 }}>×</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display:'flex', justifyContent:'space-between',
              alignItems:'center', marginTop:12 }}>
              <button onClick={addLine}
                style={{ background:'none', border:'1.5px dashed #e2e8f0',
                  borderRadius:7, padding:'7px 14px', fontSize:12,
                  color:'#6b7fa3', cursor:'pointer',
                  fontFamily:'sans-serif' }}>
                + Add Line
              </button>
              <div style={{ background:'#f4f6f9', borderRadius:9,
                padding:'12px 16px', minWidth:220 }}>
                <div style={{ display:'flex', justifyContent:'space-between',
                  fontSize:13, marginBottom:6 }}>
                  <span style={{ color:'#6b7fa3' }}>Subtotal</span>
                  <span style={{ fontFamily:'monospace',
                    fontWeight:600 }}>{fmtCur(subtotal)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between',
                  fontSize:15, fontWeight:800, paddingTop:8,
                  borderTop:'2px solid #e2e8f0', color:'#1e6bbd' }}>
                  <span>Total</span>
                  <span style={{ fontFamily:'monospace' }}>
                    {fmtCur(subtotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginTop:14 }}>
            <label style={lbl}>Notes (optional)</label>
            <textarea
              style={{ ...inp, height:70, resize:'vertical' }}
              placeholder="Additional notes..."
              value={form.notes}
              onChange={e=>upd('notes',e.target.value)}/>
          </div>

          {/* Buttons */}
          <div style={{ display:'flex', gap:10,
            justifyContent:'flex-end', marginTop:24 }}>
            <button onClick={()=>setModal(false)}
              style={{ padding:'10px 20px', borderRadius:8,
                border:'1px solid #e2e8f0', background:'white',
                color:'#6b7fa3', fontSize:13,
                fontWeight:600, cursor:'pointer' }}>
              Cancel
            </button>
            <button onClick={handleCreate} disabled={saving}
              style={{ padding:'10px 20px', borderRadius:8,
                border:'none',
                background:saving?'#6b7fa3':'#1e6bbd',
                color:'white', fontSize:13, fontWeight:700,
                cursor:saving?'not-allowed':'pointer' }}>
              {saving?'Saving...':'Create Bill'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
