import { useState, useEffect } from 'react';
import api from '../../api/client';

// ── Classification colours ────────────────────────────────────
const CLS_COLOR = {
  asset:     { color:'#1e6bbd', bg:'rgba(30,107,189,.1)'  },
  liability: { color:'#e05c5c', bg:'rgba(224,92,92,.1)'   },
  equity:    { color:'#7c3aed', bg:'rgba(124,58,237,.1)'  },
  revenue:   { color:'#16c79a', bg:'rgba(22,199,154,.1)'  },
  expense:   { color:'#e8a04a', bg:'rgba(232,160,74,.1)'  },
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
          justifyContent:'space-between', padding:'18px 24px',
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

export default function AccountListPage() {
  const [accounts,  setAccounts]  = useState([]);
  const [types,     setTypes]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [expanded,  setExpanded]  = useState({
    asset:true, liability:true, equity:true,
    revenue:true, expense:true,
  });
  const [form, setForm] = useState({
    code:'', name:'', accountTypeId:'',
    currency:'GHS', description:'',
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/accounts'),
      api.get('/accounts/types'),
    ]).then(([a, t]) => {
      setAccounts(a.data || []);
      setTypes(t.data || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleCreate = async () => {
    if (!form.code)          return alert('Account code is required');
    if (!form.name)          return alert('Account name is required');
    if (!form.accountTypeId) return alert('Account type is required');
    setSaving(true);
    try {
      await api.post('/accounts', form);
      load();
      setModal(false);
      setForm({ code:'', name:'', accountTypeId:'',
        currency:'GHS', description:'' });
    } catch (err) {
      alert(err.message || 'Failed to create account');
    } finally { setSaving(false); }
  };

  // Group by classification
  const CLASSIFICATIONS = ['asset','liability','equity','revenue','expense'];
  const grouped = CLASSIFICATIONS.reduce((acc, cls) => {
    acc[cls] = accounts.filter(a => a.classification === cls);
    return acc;
  }, {});

  const inp = { width:'100%', padding:'9px 12px',
    border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13,
    fontFamily:'sans-serif', background:'#f9fafb', outline:'none' };
  const lbl = { display:'block', fontSize:11, fontWeight:600,
    color:'#1a2740', marginBottom:6 };

  return (
    <div style={{ fontFamily:'sans-serif' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between',
        alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700,
            color:'#1a2740', marginBottom:4 }}>
            Chart of Accounts
          </h1>
          <p style={{ fontSize:13, color:'#6b7fa3' }}>
            Define your account hierarchy for double-entry bookkeeping
          </p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ padding:'10px 20px', background:'#1e6bbd',
            color:'white', border:'none', borderRadius:8,
            fontSize:13, fontWeight:700, cursor:'pointer' }}>
          + New Account
        </button>
      </div>

      {/* Summary pills */}
      <div style={{ display:'flex', gap:10,
        marginBottom:20, flexWrap:'wrap' }}>
        {CLASSIFICATIONS.map(cls => {
          const c = CLS_COLOR[cls] || CLS_COLOR.asset;
          return (
            <div key={cls}
              onClick={() => setExpanded(p=>({...p,[cls]:!p[cls]}))}
              style={{ padding:'8px 16px', borderRadius:20,
                background:c.bg, color:c.color,
                fontSize:12, fontWeight:600, cursor:'pointer',
                border:`1px solid ${c.color}30` }}>
              {cls.charAt(0).toUpperCase()+cls.slice(1)}
              {' '}({grouped[cls]?.length || 0})
              {' '}{expanded[cls] ? '▲' : '▼'}
            </div>
          );
        })}
      </div>

      {/* Account groups */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60,
          color:'#6b7fa3' }}>
          <div style={{ width:28, height:28,
            border:'3px solid #e2e8f0',
            borderTopColor:'#1e6bbd', borderRadius:'50%',
            animation:'spin .7s linear infinite',
            margin:'0 auto 12px' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          Loading accounts...
        </div>
      ) : (
        CLASSIFICATIONS.map(cls => {
          const items = grouped[cls] || [];
          const c = CLS_COLOR[cls] || CLS_COLOR.asset;
          return (
            <div key={cls} style={{ marginBottom:12 }}>
              {/* Section header */}
              <div onClick={() => setExpanded(p=>({...p,[cls]:!p[cls]}))}
                style={{ display:'flex', alignItems:'center',
                  justifyContent:'space-between',
                  padding:'12px 20px', background:'white',
                  border:'1px solid #e2e8f0',
                  borderRadius: expanded[cls]
                    ? '12px 12px 0 0' : 12,
                  cursor:'pointer',
                  borderBottom: expanded[cls]
                    ? '1px solid #e2e8f0' : '1px solid #e2e8f0' }}>
                <div style={{ display:'flex',
                  alignItems:'center', gap:12 }}>
                  <span style={{ width:10, height:10,
                    borderRadius:'50%',
                    background:c.color,
                    display:'inline-block' }}/>
                  <span style={{ fontWeight:700, fontSize:14,
                    color:c.color, textTransform:'capitalize' }}>
                    {cls}
                  </span>
                  <span style={{ fontSize:12, color:'#6b7fa3' }}>
                    {items.length} account{items.length!==1?'s':''}
                  </span>
                </div>
                <span style={{ color:'#6b7fa3', fontSize:12 }}>
                  {expanded[cls] ? '▲ Hide' : '▼ Show'}
                </span>
              </div>

              {/* Accounts table */}
              {expanded[cls] && (
                <div style={{ background:'white',
                  border:'1px solid #e2e8f0',
                  borderTop:'none',
                  borderRadius:'0 0 12px 12px',
                  overflow:'hidden' }}>
                  {items.length === 0 ? (
                    <div style={{ padding:'20px',
                      textAlign:'center',
                      color:'#6b7fa3', fontSize:13 }}>
                      No {cls} accounts yet.
                      <span
                        style={{ color:'#1e6bbd',
                          cursor:'pointer', marginLeft:4,
                          fontWeight:600 }}
                        onClick={() => {
                          const typeId = types.find(
                            t => t.classification === cls
                          )?.id || '';
                          setForm(p=>({...p,accountTypeId:String(typeId)}));
                          setModal(true);
                        }}>
                        Add one →
                      </span>
                    </div>
                  ) : (
                    <table style={{ width:'100%',
                      borderCollapse:'collapse' }}>
                      <thead>
                        <tr>
                          {['Code','Account Name',
                            'Currency','Normal Balance'].map(h=>(
                            <th key={h} style={{ padding:'8px 20px',
                              textAlign:'left', fontSize:10,
                              fontWeight:600, color:'#6b7fa3',
                              textTransform:'uppercase',
                              letterSpacing:.7,
                              background:'#f8fafc',
                              borderBottom:'1px solid #e2e8f0' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((acc, i) => (
                          <tr key={i}
                            style={{ borderBottom:
                              i<items.length-1
                                ? '1px solid #f4f6f9' : 'none' }}>
                            <td style={{ padding:'10px 20px',
                              fontFamily:'monospace', fontSize:12,
                              color:c.color, fontWeight:600 }}>
                              {acc.code}
                            </td>
                            <td style={{ padding:'10px 20px',
                              fontSize:13 }}>
                              <div style={{ fontWeight:500 }}>
                                {acc.name}
                              </div>
                              {acc.description && (
                                <div style={{ fontSize:11,
                                  color:'#6b7fa3' }}>
                                  {acc.description}
                                </div>
                              )}
                            </td>
                            <td style={{ padding:'10px 20px',
                              fontFamily:'monospace', fontSize:12,
                              color:'#6b7fa3' }}>
                              {acc.currency}
                            </td>
                            <td style={{ padding:'10px 20px' }}>
                              <span style={{ padding:'2px 8px',
                                borderRadius:20, fontSize:11,
                                fontWeight:600,
                                background: acc.normal_balance==='debit'
                                  ? 'rgba(30,107,189,.1)'
                                  : 'rgba(22,199,154,.1)',
                                color: acc.normal_balance==='debit'
                                  ? '#1e6bbd' : '#0ea87f' }}>
                                {acc.normal_balance}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* New Account Modal */}
      <Modal open={modal}
        onClose={() => setModal(false)}
        title="New Account">
        <div>
          <div style={{ display:'grid',
            gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div>
              <label style={lbl}>Account Code *</label>
              <input style={inp}
                placeholder="e.g. 1001"
                value={form.code}
                onChange={e=>upd('code',e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>Account Name *</label>
              <input style={inp}
                placeholder="e.g. Cash at Bank"
                value={form.name}
                onChange={e=>upd('name',e.target.value)}/>
            </div>
          </div>

          <div style={{ marginTop:14 }}>
            <label style={lbl}>Account Type *</label>
            <select style={inp} value={form.accountTypeId}
              onChange={e=>upd('accountTypeId',e.target.value)}>
              <option value="">Select type...</option>
              {CLASSIFICATIONS.map(cls => (
                <optgroup key={cls}
                  label={cls.toUpperCase()}>
                  {types.filter(t=>t.classification===cls)
                    .map(t=>(
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div style={{ marginTop:14 }}>
            <label style={lbl}>Currency</label>
            <select style={inp} value={form.currency}
              onChange={e=>upd('currency',e.target.value)}>
              {['GHS','USD','EUR','GBP','NGN'].map(c=>(
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={{ marginTop:14 }}>
            <label style={lbl}>Description (optional)</label>
            <textarea style={{ ...inp, height:70, resize:'vertical' }}
              placeholder="Brief description of this account"
              value={form.description}
              onChange={e=>upd('description',e.target.value)}/>
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
            <button onClick={handleCreate} disabled={saving}
              style={{ padding:'10px 20px', borderRadius:8,
                border:'none',
                background:saving?'#6b7fa3':'#1e6bbd',
                color:'white', fontSize:13, fontWeight:700,
                cursor:saving?'not-allowed':'pointer' }}>
              {saving?'Saving...':'Create Account'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
