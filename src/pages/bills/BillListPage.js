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

export default function BillListPage() {
  const navigate = useNavigate();

  const [bills,      setBills]     = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [search,     setSearch]    = useState('');
  const [statusFilter, setStatus]  = useState('');
  const [viewBill,    setViewBill]    = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/bills')
      .then(res => setBills(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // ── Bill detail ────────────────────────────────────────────
  const openDetail = (billId) => {
    setViewLoading(true);
    setViewBill(null);
    api.get(`/bills/${billId}`)
      .then(res => setViewBill(res.data))
      .catch(err => alert(err.message || 'Could not load bill'))
      .finally(() => setViewLoading(false));
  };
  const closeDetail = () => setViewBill(null);

  const runAction = async (fn) => {
    try { await fn(); load(); closeDetail(); }
    catch (err) { alert(err.message); }
  };

  // ── Actions ────────────────────────────────────────────────
  const handleApprove = async (id, e) => {
    e.stopPropagation();
    try {
      await api.post(`/bills/${id}/approve`);
      load();
    } catch (err) { alert(err.message); }
  };

  // Nothing in the backend ever sets a bill's status to the literal
  // value 'overdue' (only draft/approved/partial/paid/cancelled) — a
  // status-equality check here always evaluates to false, so the
  // "Overdue Bills" counter, the filter dropdown's Overdue option, and
  // the due-date/badge highlighting all silently never matched
  // anything, no matter how overdue a real bill was. Derive it the
  // same way InvoiceListPage.js already correctly does.
  // Comparing against `new Date()` (the exact current instant) meant
  // a bill due "today" showed overdue the moment any time passed
  // midnight — it should stay current for the whole day it's due.
  // Compare date-only strings instead.
  const isBillOverdue = (b) =>
    !['paid','cancelled'].includes(b.status) &&
    String(b.due_date).slice(0, 10) < new Date().toISOString().slice(0, 10) &&
    parseFloat(b.balance_due || 0) > 0;

  const filtered = bills.filter(b =>
    (!statusFilter ||
      (statusFilter === 'overdue' ? isBillOverdue(b) : b.status === statusFilter)) &&
    (!search ||
      b.bill_number?.toLowerCase().includes(search.toLowerCase()) ||
      b.supplier_name?.toLowerCase().includes(search.toLowerCase()))
  );

  // ── Totals across all bills ────────────────────────────────
  const totalBills   = bills.reduce((s,b) => s+parseFloat(b.total_amount||0),0);
  const totalPaid    = bills.reduce((s,b) => s+parseFloat(b.amount_paid ||0),0);
  const totalOutstanding = totalBills - totalPaid;
  const totalOverdue = bills.filter(isBillOverdue).length;

  const g2  = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 };

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
        <button onClick={() => navigate('/bills/new')}
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
            value:totalOverdue,
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
              <button onClick={() => navigate('/bills/new')}
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
                const overdue = isBillOverdue(bill);
                return (
                  <tr key={i}
                    onClick={() => openDetail(bill.id)}
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
                      color: overdue ? '#e05c5c' : '#6b7fa3',
                      fontWeight: overdue ? 600 : 400,
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
                      <Badge status={overdue ? 'overdue' : bill.status}/>
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
                        {bill.status==='approved' && !bill.journal_entry_id && (
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
                        {['approved','partial'].includes(bill.status) && balance > 0 && (
                          <button
                            onClick={async e => {
                              e.stopPropagation();
                              const amt = window.prompt(`Amount to pay (outstanding: ${fmtCur(balance)}):`, balance);
                              if (amt === null) return;
                              try {
                                await api.post(`/bills/${bill.id}/pay`, { paymentMethod: 'cash', amount: parseFloat(amt) });
                                load();
                              } catch(err){ alert(err.message); }
                            }}
                            style={{ padding:'5px 10px', borderRadius:6,
                              border:'1px solid #16c79a',
                              background:'none', color:'#16c79a',
                              fontSize:11, fontWeight:600,
                              cursor:'pointer' }}>
                            Pay
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

      {/* Bill Detail Modal */}
      <Modal open={!!viewBill || viewLoading}
        onClose={closeDetail}
        title={viewBill ? viewBill.bill_number : 'Loading…'}>
        {viewLoading && !viewBill ? (
          <div style={{ textAlign:'center', padding:30, color:'#6b7fa3' }}>Loading…</div>
        ) : viewBill && (
          <div>
            {/* Not-yet-posted warning — a bill only affects stock, the
                GL, and the supplier's balance once it's been posted
                (journal_entry_id set); "Approve" alone is just a status
                flag and has no financial effect on its own. */}
            {!viewBill.journal_entry_id && (
              <div style={{ display:'flex', alignItems:'flex-start', gap:12,
                padding:'14px 18px', marginBottom:18, borderRadius:10,
                background:'#fff8e6', border:'1px solid #f0d896' }}>
                <span style={{ fontSize:20, lineHeight:1 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight:700, fontSize:13, color:'#8a6d1a', marginBottom:3 }}>
                    {viewBill.status === 'draft'
                      ? 'This bill is still a draft'
                      : 'This bill has been approved but not yet posted'}
                  </div>
                  <div style={{ fontSize:12.5, color:'#8a6d1a', lineHeight:1.5 }}>
                    It hasn't affected inventory stock, the General Ledger, or the
                    supplier's balance yet.{' '}
                    {viewBill.status === 'draft'
                      ? <>Click <strong>Approve</strong>, then <strong>Post to GL</strong>{' '}below to make it take effect.</>
                      : <>Click <strong>Post to GL</strong> below to deduct stock (for any
                          product-linked lines) and record the accounting entries.</>}
                  </div>
                </div>
              </div>
            )}

            <div style={g2}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'#6b7fa3', textTransform:'uppercase', marginBottom:4 }}>Supplier</div>
                <div style={{ fontSize:14, fontWeight:600 }}>{viewBill.supplier_name}</div>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'#6b7fa3', textTransform:'uppercase', marginBottom:4 }}>Status</div>
                <Badge status={viewBill.status}/>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'#6b7fa3', textTransform:'uppercase', marginBottom:4 }}>Bill Date</div>
                <div style={{ fontSize:13 }}>{fmtDate(viewBill.bill_date)}</div>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'#6b7fa3', textTransform:'uppercase', marginBottom:4 }}>Due Date</div>
                <div style={{ fontSize:13 }}>{fmtDate(viewBill.due_date)}</div>
              </div>
            </div>

            <div style={{ marginTop:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#1a2740', marginBottom:10 }}>Line Items</div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#f8fafc' }}>
                    {['Description','Qty','Unit Price','Total'].map(h=>(
                      <th key={h} style={{ padding:'8px 10px',
                        textAlign: h==='Description' ? 'left' : 'right',
                        fontSize:10, fontWeight:600, color:'#6b7fa3',
                        textTransform:'uppercase', letterSpacing:.5,
                        borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {viewBill.lines.map(l=>(
                    <tr key={l.id} style={{ borderBottom:'1px solid #f4f6f9' }}>
                      <td style={{ padding:'8px 10px', fontSize:12 }}>{l.description}</td>
                      <td style={{ padding:'8px 10px', fontSize:12, textAlign:'right', fontFamily:'monospace' }}>{l.quantity}</td>
                      <td style={{ padding:'8px 10px', fontSize:12, textAlign:'right', fontFamily:'monospace' }}>{fmtCur(l.unit_price)}</td>
                      <td style={{ padding:'8px 10px', fontSize:12, textAlign:'right', fontFamily:'monospace', fontWeight:700 }}>{fmtCur(l.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:14 }}>
                <div style={{ background:'#f4f6f9', borderRadius:9, padding:'12px 16px', minWidth:220 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
                    <span style={{ color:'#6b7fa3' }}>Total</span>
                    <span style={{ fontFamily:'monospace', fontWeight:700 }}>{fmtCur(viewBill.total_amount)}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
                    <span style={{ color:'#6b7fa3' }}>Paid</span>
                    <span style={{ fontFamily:'monospace', color:'#16c79a' }}>{fmtCur(viewBill.amount_paid)}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:800, paddingTop:8, borderTop:'2px solid #e2e8f0' }}>
                    <span>Balance</span>
                    <span style={{ fontFamily:'monospace', color: parseFloat(viewBill.balance_due)>0 ? '#e8a04a' : '#16c79a' }}>
                      {fmtCur(viewBill.balance_due)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:24 }}>
              {viewBill.status === 'draft' && (
                <button onClick={() => runAction(() => api.post(`/bills/${viewBill.id}/approve`))}
                  style={{ padding:'9px 18px', borderRadius:8, border:'1px solid #16c79a',
                    background:'none', color:'#16c79a', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  Approve
                </button>
              )}
              {viewBill.status === 'approved' && !viewBill.journal_entry_id && (
                <button onClick={() => runAction(() => api.post(`/bills/${viewBill.id}/post`))}
                  style={{ padding:'9px 18px', borderRadius:8, border:'1px solid #1e6bbd',
                    background:'none', color:'#1e6bbd', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  Post to GL
                </button>
              )}
              {['approved','partial'].includes(viewBill.status) && parseFloat(viewBill.balance_due) > 0 && (
                <button onClick={() => {
                  const amt = window.prompt(`Amount to pay (outstanding: ${fmtCur(viewBill.balance_due)}):`, viewBill.balance_due);
                  if (amt === null) return;
                  runAction(() => api.post(`/bills/${viewBill.id}/pay`, { paymentMethod:'cash', amount: parseFloat(amt) }));
                }}
                  style={{ padding:'9px 18px', borderRadius:8, border:'1px solid #16c79a',
                    background:'none', color:'#16c79a', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  Pay
                </button>
              )}
              <button onClick={closeDetail}
                style={{ padding:'9px 18px', borderRadius:8, border:'1px solid #e2e8f0',
                  background:'white', color:'#6b7fa3', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
