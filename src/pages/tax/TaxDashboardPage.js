// ============================================================
//  src/pages/tax/TaxDashboardPage.js
// ============================================================
import { useState, useEffect } from 'react';
import api from '../../api/client';

const fmtCur = (n) => `GHS ${new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2 }).format(n || 0)}`;

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

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
          <span style={{ fontSize:16, fontWeight:700 }}>
            {title}
          </span>
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

const TABS = [
  { id:'overview',  label:'Overview'          },
  { id:'returns',   label:'Tax Returns'       },
  { id:'wht',       label:'Withholding Tax'   },
  { id:'types',     label:'Tax Types & Rates' },
];

export default function TaxDashboardPage() {
  const [tab,       setTab]      = useState('overview');
  const [taxTypes,  setTaxTypes] = useState([]);
  const [returns,   setReturns]  = useState([]);
  const [whtRecs,   setWhtRecs]  = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [modal,     setModal]    = useState(false);
  const [retModal,  setRetModal] = useState(false);
  const [saving,    setSaving]   = useState(false);

  const [typeForm, setTypeForm] = useState({
    name:'', taxCategory:'vat', rate:0,
    appliesTo:'both', description:'',
  });
  const [retForm, setRetForm] = useState({
    taxTypeId:'', periodStart:'', periodEnd:'', dueDate:'',
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/tax/types'),
      api.get('/tax/returns'),
      api.get('/tax/withholding').catch(() => ({ data:[] })),
    ]).then(([t, r, w]) => {
      setTaxTypes(t.data || []);
      setReturns(r.data  || []);
      setWhtRecs(w.data  || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const updType = (f,v) =>
    setTypeForm(p => ({ ...p, [f]:v }));
  const updRet  = (f,v) =>
    setRetForm(p  => ({ ...p, [f]:v }));

  const handleCreateType = async () => {
    if (!typeForm.name)
      return alert('Tax name is required');
    setSaving(true);
    try {
      await api.post('/tax', typeForm);
      load();
      setModal(false);
      setTypeForm({ name:'', taxCategory:'vat', rate:0,
        appliesTo:'both', description:'' });
    } catch (err) {
      alert(err.message || 'Failed to create tax type');
    } finally { setSaving(false); }
  };

  const handleCreateReturn = async () => {
    if (!retForm.taxTypeId)
      return alert('Please select a tax type');
    if (!retForm.periodStart)
      return alert('Period start is required');
    if (!retForm.periodEnd)
      return alert('Period end is required');
    if (!retForm.dueDate)
      return alert('Due date is required');
    setSaving(true);
    try {
      await api.post('/tax/returns', retForm);
      load();
      setRetModal(false);
      setRetForm({ taxTypeId:'',
        periodStart:'', periodEnd:'', dueDate:'' });
    } catch (err) {
      alert(err.message || 'Failed to create tax return');
    } finally { setSaving(false); }
  };

  const handleFileReturn = async (id) => {
    if (!window.confirm(
      'Mark this tax return as filed?')) return;
    try {
      await api.post(`/tax/returns/${id}/file`);
      load();
    } catch (err) { alert(err.message); }
  };

  const totalWHT = whtRecs.reduce((s,w) =>
    s + parseFloat(w.wht_amount || 0), 0);
  const unremitted = whtRecs
    .filter(w => w.status === 'withheld')
    .reduce((s,w) => s + parseFloat(w.wht_amount || 0), 0);

  const CAT_COLOR = {
    vat:          { color:'#1e6bbd', bg:'rgba(30,107,189,.1)'  },
    withholding:  { color:'#e8a04a', bg:'rgba(232,160,74,.1)'  },
    levy:         { color:'#7c3aed', bg:'rgba(124,58,237,.1)'  },
    capital_allowance:
                  { color:'#16c79a', bg:'rgba(22,199,154,.1)'  },
    other:        { color:'#6b7fa3', bg:'rgba(107,127,163,.1)' },
  };

  const inp = { width:'100%', padding:'9px 12px',
    border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13,
    fontFamily:'sans-serif', background:'#f9fafb',
    outline:'none' };
  const lbl = { display:'block', fontSize:11, fontWeight:600,
    color:'#1a2740', marginBottom:6 };
  const g2  = { display:'grid',
    gridTemplateColumns:'1fr 1fr', gap:14 };

  return (
    <div style={{ fontFamily:'sans-serif' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between',
        alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700,
            color:'#1a2740', marginBottom:4 }}>
            Tax & Compliance
          </h1>
          <p style={{ fontSize:13, color:'#6b7fa3' }}>
            VAT, withholding tax, levies
            and filing deadlines
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => setRetModal(true)}
            style={{ padding:'10px 18px', borderRadius:8,
              border:'1px solid #1e6bbd', background:'white',
              color:'#1e6bbd', fontSize:13,
              fontWeight:600, cursor:'pointer' }}>
            + New Tax Return
          </button>
          <button onClick={() => setModal(true)}
            style={{ padding:'10px 20px',
              background:'#1e6bbd', color:'white',
              border:'none', borderRadius:8, fontSize:13,
              fontWeight:700, cursor:'pointer' }}>
            + Add Tax Type
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid',
        gridTemplateColumns:'repeat(4,1fr)',
        gap:12, marginBottom:20 }}>
        {[
          { label:'Tax Types Configured',
            value:taxTypes.length, color:'#C8102E' },
          { label:'Tax Returns',
            value:returns.length, color:'#D9A521' },
          { label:'WHT Collected',
            value:fmtCur(totalWHT), color:'#046A38' },
          // Keeps its warning behavior — real unremitted-tax signal,
          // not just decorative, so it still flags red when money is
          // actually owed instead of always showing black regardless.
          { label:'Unremitted WHT',
            value:fmtCur(unremitted),
            color: unremitted>0 ? '#e05c5c' : '#1A1A2E' },
        ].map((s,i) => (
          <div key={i} style={{ background:s.color,
            borderRadius:12, padding:16,
            boxShadow:'0 2px 8px rgba(13,27,42,.1)' }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.75)',
              fontWeight:500, marginBottom:6 }}>
              {s.label}
            </div>
            <div style={{ fontSize:18, fontWeight:700,
              color:'white' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'9px 18px', borderRadius:8,
              border:'none', cursor:'pointer', fontSize:13,
              fontWeight:600,
              background: tab===t.id ? '#1e6bbd' : 'white',
              color: tab===t.id ? 'white' : '#6b7fa3',
              boxShadow: tab===t.id
                ? '0 4px 12px rgba(30,107,189,.25)'
                : '0 1px 4px rgba(0,0,0,.06)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div style={g2}>
          {/* VAT Summary */}
          <div style={{ background:'white', borderRadius:12,
            border:'1px solid #e2e8f0',
            boxShadow:'0 2px 8px rgba(13,27,42,.04)',
            overflow:'hidden' }}>
            <div style={{ padding:'14px 20px',
              borderBottom:'1px solid #e2e8f0',
              fontWeight:700, fontSize:14 }}>
              VAT Summary
            </div>
            <div style={{ padding:20 }}>
              {taxTypes.filter(t =>
                t.tax_category === 'vat').length === 0 ? (
                <div style={{ textAlign:'center',
                  padding:'20px 0', color:'#6b7fa3',
                  fontSize:13 }}>
                  No VAT types configured yet.
                  <div style={{ marginTop:8 }}>
                    <button onClick={() => setModal(true)}
                      style={{ color:'#1e6bbd',
                        background:'none', border:'none',
                        cursor:'pointer', fontWeight:600,
                        fontFamily:'sans-serif',
                        fontSize:13 }}>
                      + Add VAT Type →
                    </button>
                  </div>
                </div>
              ) : (
                taxTypes
                  .filter(t => t.tax_category === 'vat')
                  .map((t,i) => (
                  <div key={i} style={{ display:'flex',
                    justifyContent:'space-between',
                    padding:'8px 0',
                    borderBottom:'1px solid #f4f6f9',
                    fontSize:13 }}>
                    <span style={{ color:'#6b7fa3' }}>
                      {t.name}
                    </span>
                    <span style={{ fontFamily:'monospace',
                      fontWeight:700, color:'#1e6bbd' }}>
                      {t.rate}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* WHT Summary */}
          <div style={{ background:'white', borderRadius:12,
            border:'1px solid #e2e8f0',
            boxShadow:'0 2px 8px rgba(13,27,42,.04)',
            overflow:'hidden' }}>
            <div style={{ padding:'14px 20px',
              borderBottom:'1px solid #e2e8f0',
              fontWeight:700, fontSize:14 }}>
              Withholding Tax
            </div>
            <div style={{ padding:20 }}>
              {[
                { label:'Total WHT Collected',
                  value:fmtCur(totalWHT), bold:false },
                { label:'Remitted',
                  value:fmtCur(totalWHT - unremitted),
                  bold:false },
                { label:'Unremitted (Payable)',
                  value:fmtCur(unremitted), bold:true },
              ].map((r,i) => (
                <div key={i} style={{ display:'flex',
                  justifyContent:'space-between',
                  padding:'8px 0', fontSize:13,
                  borderBottom: i<2
                    ? '1px solid #f4f6f9' : 'none',
                  marginTop: i===2 ? 8 : 0 }}>
                  <span style={{ color: r.bold
                    ? '#1a2740' : '#6b7fa3',
                    fontWeight: r.bold ? 700 : 400 }}>
                    {r.label}
                  </span>
                  <span style={{ fontFamily:'monospace',
                    fontWeight: r.bold ? 800 : 600,
                    color: r.bold && unremitted>0
                      ? '#e05c5c' : '#1e6bbd' }}>
                    {r.value}
                  </span>
                </div>
              ))}
              {unremitted > 0 && (
                <div style={{ background:'#fff5f5',
                  border:'1px solid #fca5a5',
                  borderRadius:7, padding:10,
                  marginTop:12, fontSize:11,
                  color:'#c04040' }}>
                  ⚠️ You have unremitted WHT.
                  Please remit to the tax authority.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tax Returns Tab */}
      {tab === 'returns' && (
        <div style={{ background:'white', borderRadius:12,
          border:'1px solid #e2e8f0', overflow:'hidden',
          boxShadow:'0 2px 8px rgba(13,27,42,.04)' }}>
          {loading ? (
            <div style={{ textAlign:'center',
              padding:40, color:'#6b7fa3' }}>
              Loading...
            </div>
          ) : returns.length === 0 ? (
            <div style={{ textAlign:'center',
              padding:'60px 20px', color:'#6b7fa3' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>
                📋
              </div>
              <p style={{ fontSize:14, fontWeight:600,
                color:'#1a2740', marginBottom:20 }}>
                No tax returns yet
              </p>
              <button onClick={() => setRetModal(true)}
                style={{ padding:'10px 24px',
                  background:'#1e6bbd', color:'white',
                  border:'none', borderRadius:8, fontSize:13,
                  fontWeight:600, cursor:'pointer' }}>
                + Create First Return
              </button>
            </div>
          ) : (
            <table style={{ width:'100%',
              borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Tax Type','Period','Due Date',
                    'Output Tax','Input Tax',
                    'Net Tax','Status',''].map(h => (
                    <th key={h} style={{ padding:'10px 16px',
                      textAlign:'left', fontSize:10,
                      fontWeight:600, color:'#6b7fa3',
                      textTransform:'uppercase',
                      letterSpacing:.7, background:'#f8fafc',
                      borderBottom:'1px solid #e2e8f0' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {returns.map((r, i) => (
                  <tr key={i}
                    style={{ borderBottom:'1px solid #f4f6f9' }}>
                    <td style={{ padding:'12px 16px',
                      fontWeight:600 }}>{r.tax_name}</td>
                    <td style={{ padding:'12px 16px',
                      color:'#6b7fa3', fontSize:12 }}>
                      {fmtDate(r.period_start)} —{' '}
                      {fmtDate(r.period_end)}
                    </td>
                    <td style={{ padding:'12px 16px',
                      color: r.status==='overdue'
                        ? '#e05c5c' : '#6b7fa3',
                      fontSize:12 }}>
                      {fmtDate(r.due_date)}
                    </td>
                    <td style={{ padding:'12px 16px',
                      fontFamily:'monospace', fontSize:12 }}>
                      {fmtCur(r.output_tax)}
                    </td>
                    <td style={{ padding:'12px 16px',
                      fontFamily:'monospace', fontSize:12 }}>
                      {fmtCur(r.input_tax)}
                    </td>
                    <td style={{ padding:'12px 16px',
                      fontFamily:'monospace', fontSize:12,
                      fontWeight:700, color:'#1e6bbd' }}>
                      {fmtCur(r.net_tax)}
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ padding:'3px 10px',
                        borderRadius:20, fontSize:11,
                        fontWeight:600,
                        background: r.status==='filed'
                          ? 'rgba(22,199,154,.12)'
                          : r.status==='overdue'
                            ? 'rgba(224,92,92,.12)'
                            : 'rgba(107,127,163,.12)',
                        color: r.status==='filed'
                          ? '#0ea87f'
                          : r.status==='overdue'
                            ? '#c04040' : '#6b7fa3' }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      {r.status === 'draft' && (
                        <button
                          onClick={() =>
                            handleFileReturn(r.id)}
                          style={{ padding:'5px 10px',
                            borderRadius:6,
                            border:'1px solid #16c79a',
                            background:'none',
                            color:'#16c79a', fontSize:11,
                            fontWeight:600,
                            cursor:'pointer' }}>
                          File Return
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* WHT Tab */}
      {tab === 'wht' && (
        <div style={{ background:'white', borderRadius:12,
          border:'1px solid #e2e8f0', overflow:'hidden',
          boxShadow:'0 2px 8px rgba(13,27,42,.04)' }}>
          {whtRecs.length === 0 ? (
            <div style={{ textAlign:'center',
              padding:'60px 20px', color:'#6b7fa3' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>
                🧮
              </div>
              <p style={{ fontSize:14, fontWeight:600,
                color:'#1a2740', marginBottom:6 }}>
                No WHT records yet
              </p>
              <p style={{ fontSize:13 }}>
                WHT records are auto-created when bills
                with withholding tax types are posted
                to the General Ledger.
              </p>
            </div>
          ) : (
            <table style={{ width:'100%',
              borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Date','Party','Tax Type',
                    'Gross','Rate','WHT Amount',
                    'Net','Status'].map(h => (
                    <th key={h} style={{ padding:'10px 16px',
                      textAlign:'left', fontSize:10,
                      fontWeight:600, color:'#6b7fa3',
                      textTransform:'uppercase',
                      letterSpacing:.7, background:'#f8fafc',
                      borderBottom:'1px solid #e2e8f0' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {whtRecs.map((w,i) => (
                  <tr key={i}
                    style={{ borderBottom:'1px solid #f4f6f9' }}>
                    <td style={{ padding:'12px 16px',
                      color:'#6b7fa3', fontSize:12 }}>
                      {fmtDate(w.transaction_date)}
                    </td>
                    <td style={{ padding:'12px 16px',
                      fontWeight:500 }}>
                      {w.supplier_name || w.customer_name
                        || '—'}
                    </td>
                    <td style={{ padding:'12px 16px',
                      color:'#6b7fa3', fontSize:12 }}>
                      {w.tax_name}
                    </td>
                    <td style={{ padding:'12px 16px',
                      fontFamily:'monospace', fontSize:12 }}>
                      {fmtCur(w.gross_amount)}
                    </td>
                    <td style={{ padding:'12px 16px',
                      fontFamily:'monospace',
                      fontSize:12 }}>
                      {w.wht_rate}%
                    </td>
                    <td style={{ padding:'12px 16px',
                      fontFamily:'monospace', fontSize:12,
                      fontWeight:700, color:'#e8a04a' }}>
                      {fmtCur(w.wht_amount)}
                    </td>
                    <td style={{ padding:'12px 16px',
                      fontFamily:'monospace',
                      fontSize:12 }}>
                      {fmtCur(w.net_amount)}
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ padding:'3px 10px',
                        borderRadius:20, fontSize:11,
                        fontWeight:600,
                        background: w.status==='remitted'
                          ? 'rgba(22,199,154,.12)'
                          : 'rgba(232,160,74,.12)',
                        color: w.status==='remitted'
                          ? '#0ea87f' : '#c47a1a' }}>
                        {w.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tax Types Tab */}
      {tab === 'types' && (
        <div style={{ background:'white', borderRadius:12,
          border:'1px solid #e2e8f0', overflow:'hidden',
          boxShadow:'0 2px 8px rgba(13,27,42,.04)' }}>
          {loading ? (
            <div style={{ textAlign:'center',
              padding:40, color:'#6b7fa3' }}>
              Loading...
            </div>
          ) : taxTypes.length === 0 ? (
            <div style={{ textAlign:'center',
              padding:'60px 20px', color:'#6b7fa3' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>
                📊
              </div>
              <p style={{ fontSize:14, fontWeight:600,
                color:'#1a2740', marginBottom:6 }}>
                No tax types yet
              </p>
              <p style={{ fontSize:13, marginBottom:20 }}>
                Run the seed SQL in phpMyAdmin
                to add Ghana tax types automatically
              </p>
              <button onClick={() => setModal(true)}
                style={{ padding:'10px 24px',
                  background:'#1e6bbd', color:'white',
                  border:'none', borderRadius:8, fontSize:13,
                  fontWeight:600, cursor:'pointer' }}>
                + Add Tax Type Manually
              </button>
            </div>
          ) : (
            <table style={{ width:'100%',
              borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Tax Name','Category','Rate',
                    'Applies To','Status'].map(h => (
                    <th key={h} style={{ padding:'10px 16px',
                      textAlign:'left', fontSize:10,
                      fontWeight:600, color:'#6b7fa3',
                      textTransform:'uppercase',
                      letterSpacing:.7, background:'#f8fafc',
                      borderBottom:'1px solid #e2e8f0' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {taxTypes.map((t, i) => {
                  const cc = CAT_COLOR[t.tax_category]
                    || CAT_COLOR.other;
                  return (
                    <tr key={i}
                      style={{ borderBottom:
                        '1px solid #f4f6f9' }}>
                      <td style={{ padding:'12px 16px',
                        fontWeight:600 }}>{t.name}</td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ padding:'3px 10px',
                          borderRadius:20, fontSize:11,
                          fontWeight:600,
                          background:cc.bg,
                          color:cc.color }}>
                          {t.tax_category}
                        </span>
                      </td>
                      <td style={{ padding:'12px 16px',
                        fontFamily:'monospace',
                        fontWeight:700, color:'#1e6bbd',
                        fontSize:14 }}>
                        {t.rate}%
                      </td>
                      <td style={{ padding:'12px 16px',
                        color:'#6b7fa3',
                        textTransform:'capitalize' }}>
                        {t.applies_to}
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ padding:'3px 10px',
                          borderRadius:20, fontSize:11,
                          fontWeight:600,
                          background: t.is_active
                            ? 'rgba(22,199,154,.12)'
                            : 'rgba(107,127,163,.12)',
                          color: t.is_active
                            ? '#0ea87f' : '#6b7fa3' }}>
                          {t.is_active ? 'active' : 'inactive'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Tax Type Modal */}
      <Modal open={modal}
        onClose={() => setModal(false)}
        title="Add Tax Type">
        <div>
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Tax Name *</label>
            <input style={inp}
              placeholder="e.g. VAT (15%)"
              value={typeForm.name}
              onChange={e=>updType('name',e.target.value)}/>
          </div>
          <div style={g2}>
            <div>
              <label style={lbl}>Category</label>
              <select style={inp}
                value={typeForm.taxCategory}
                onChange={e=>updType('taxCategory',
                  e.target.value)}>
                <option value="vat">VAT</option>
                <option value="withholding">Withholding</option>
                <option value="levy">Levy</option>
                <option value="capital_allowance">
                  Capital Allowance
                </option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Rate (%)</label>
              <input style={inp} type="number"
                step="0.01" min="0" max="100"
                value={typeForm.rate}
                onChange={e=>updType('rate',e.target.value)}/>
            </div>
          </div>
          <div style={{ marginTop:14 }}>
            <label style={lbl}>Applies To</label>
            <select style={inp}
              value={typeForm.appliesTo}
              onChange={e=>updType('appliesTo',e.target.value)}>
              <option value="both">Both Sales & Purchases</option>
              <option value="sales">Sales Only</option>
              <option value="purchases">Purchases Only</option>
            </select>
          </div>
          <div style={{ marginTop:14 }}>
            <label style={lbl}>Description</label>
            <textarea
              style={{ ...inp, height:60, resize:'vertical' }}
              value={typeForm.description}
              onChange={e=>updType('description',e.target.value)}/>
          </div>
          <div style={{ display:'flex', gap:10,
            justifyContent:'flex-end', marginTop:24 }}>
            <button onClick={() => setModal(false)}
              style={{ padding:'10px 20px', borderRadius:8,
                border:'1px solid #e2e8f0', background:'white',
                color:'#6b7fa3', fontSize:13,
                fontWeight:600, cursor:'pointer' }}>
              Cancel
            </button>
            <button onClick={handleCreateType}
              disabled={saving}
              style={{ padding:'10px 20px', borderRadius:8,
                border:'none',
                background:saving?'#6b7fa3':'#1e6bbd',
                color:'white', fontSize:13, fontWeight:700,
                cursor:saving?'not-allowed':'pointer' }}>
              {saving?'Saving...':'Add Tax Type'}
            </button>
          </div>
        </div>
      </Modal>

      {/* New Tax Return Modal */}
      <Modal open={retModal}
        onClose={() => setRetModal(false)}
        title="New Tax Return">
        <div>
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Tax Type *</label>
            <select style={inp}
              value={retForm.taxTypeId}
              onChange={e=>updRet('taxTypeId',e.target.value)}>
              <option value="">Select tax type...</option>
              {taxTypes.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div style={g2}>
            <div>
              <label style={lbl}>Period Start *</label>
              <input style={inp} type="date"
                value={retForm.periodStart}
                onChange={e=>updRet('periodStart',
                  e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>Period End *</label>
              <input style={inp} type="date"
                value={retForm.periodEnd}
                onChange={e=>updRet('periodEnd',
                  e.target.value)}/>
            </div>
          </div>
          <div style={{ marginTop:14 }}>
            <label style={lbl}>Due Date *</label>
            <input style={inp} type="date"
              value={retForm.dueDate}
              onChange={e=>updRet('dueDate',e.target.value)}/>
          </div>
          <div style={{ background:'#eff6ff',
            border:'1px solid #93c5fd', borderRadius:8,
            padding:12, marginTop:14, fontSize:12,
            color:'#1e40af' }}>
            💡 Totals will be calculated automatically from
            posted journal entries for this period.
          </div>
          <div style={{ display:'flex', gap:10,
            justifyContent:'flex-end', marginTop:24 }}>
            <button onClick={() => setRetModal(false)}
              style={{ padding:'10px 20px', borderRadius:8,
                border:'1px solid #e2e8f0', background:'white',
                color:'#6b7fa3', fontSize:13,
                fontWeight:600, cursor:'pointer' }}>
              Cancel
            </button>
            <button onClick={handleCreateReturn}
              disabled={saving}
              style={{ padding:'10px 20px', borderRadius:8,
                border:'none',
                background:saving?'#6b7fa3':'#1e6bbd',
                color:'white', fontSize:13, fontWeight:700,
                cursor:saving?'not-allowed':'pointer' }}>
              {saving?'Creating...':'Create Return'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
