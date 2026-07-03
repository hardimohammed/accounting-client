import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

const fmtCur = (n) => `GHS ${new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2 }).format(n || 0)}`;

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0,
      background:'rgba(13,27,42,.5)', display:'flex',
      alignItems:'center', justifyContent:'center',
      zIndex:9999, padding:20 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'white', borderRadius:14, width:'100%',
        maxWidth:560, maxHeight:'90vh', overflow:'auto',
        boxShadow:'0 20px 60px rgba(13,27,42,.25)' }}>
        <div style={{ display:'flex', alignItems:'center',
          justifyContent:'space-between', padding:'18px 24px',
          borderBottom:'1px solid #e2e8f0' }}>
          <span style={{ fontSize:16, fontWeight:700 }}>{title}</span>
          <button onClick={onClose} style={{ background:'none',
            border:'none', fontSize:22, color:'#6b7fa3',
            cursor:'pointer', lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
}

export default function SupplierListPage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [modal,     setModal]     = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [form, setForm] = useState({
    supplierCode:'', name:'', email:'', phone:'',
    address:'', city:'', country:'', taxId:'',
    paymentTerms:30, currency:'GHS',
    bankName:'', bankAccount:'',
  });

  const load = () => {
    setLoading(true);
    api.get('/suppliers')
      .then(res => setSuppliers(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleCreate = async () => {
    if (!form.supplierCode) return alert('Supplier Code is required');
    if (!form.name)         return alert('Supplier Name is required');
    setSaving(true);
    try {
      await api.post('/suppliers', form);
      load();
      setModal(false);
      setForm({ supplierCode:'', name:'', email:'', phone:'',
        address:'', city:'', country:'', taxId:'',
        paymentTerms:30, currency:'GHS',
        bankName:'', bankAccount:'' });
    } catch (err) {
      alert(err.message || 'Failed to create supplier');
    } finally { setSaving(false); }
  };

  const filtered = suppliers.filter(s =>
    !search ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.supplier_code?.toLowerCase().includes(search.toLowerCase())
  );

  const inp = { width:'100%', padding:'9px 12px',
    border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13,
    fontFamily:'sans-serif', background:'#f9fafb', outline:'none' };
  const lbl = { display:'block', fontSize:11, fontWeight:600,
    color:'#1a2740', marginBottom:6 };
  const g2  = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 };

  return (
    <div style={{ fontFamily:'sans-serif' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between',
        alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700,
            color:'#1a2740', marginBottom:4 }}>Suppliers</h1>
          <p style={{ fontSize:13, color:'#6b7fa3' }}>
            Manage vendor relationships and payment details
          </p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ padding:'10px 20px', background:'#1e6bbd',
            color:'white', border:'none', borderRadius:8,
            fontSize:13, fontWeight:700, cursor:'pointer' }}>
          + New Supplier
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)',
        gap:12, marginBottom:20 }}>
        {[
          { label:'Total Suppliers', value:suppliers.length,        color:'#1e6bbd' },
          { label:'Active',          value:suppliers.filter(s=>s.is_active!==0).length, color:'#16c79a' },
          { label:'Total Payable',   value:fmtCur(suppliers.reduce((s,sup)=>s+parseFloat(sup.outstanding_balance||0),0)), color:'#e8a04a' },
        ].map((s,i)=>(
          <div key={i} style={{ background:'white', borderRadius:12,
            padding:16, border:'1px solid #e2e8f0',
            boxShadow:'0 2px 8px rgba(13,27,42,.04)' }}>
            <div style={{ fontSize:11, color:'#6b7fa3',
              fontWeight:500, marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:22, fontWeight:700, color:s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ background:'white', border:'1px solid #e2e8f0',
        borderRadius:10, padding:'10px 16px', marginBottom:16,
        display:'flex', alignItems:'center', gap:10 }}>
        <span>🔍</span>
        <input placeholder="Search suppliers..."
          value={search} onChange={e=>setSearch(e.target.value)}
          style={{ border:'none', outline:'none', fontSize:13,
            fontFamily:'sans-serif', flex:1, background:'none',
            color:'#1a2740' }}/>
        {search && (
          <button onClick={()=>setSearch('')}
            style={{ background:'none', border:'none',
              cursor:'pointer', color:'#6b7fa3', fontSize:16 }}>×</button>
        )}
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
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#6b7fa3' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🏭</div>
            <p style={{ fontSize:15, fontWeight:600,
              color:'#1a2740', marginBottom:20 }}>
              {search ? 'No suppliers match' : 'No suppliers yet'}
            </p>
            {!search && (
              <button onClick={()=>setModal(true)}
                style={{ padding:'10px 24px', background:'#1e6bbd',
                  color:'white', border:'none', borderRadius:8,
                  fontSize:13, fontWeight:600, cursor:'pointer' }}>
                + Add First Supplier
              </button>
            )}
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Code','Supplier Name','Contact','Country',
                  'Payment Terms','Status',''].map(h=>(
                  <th key={h} style={{ padding:'10px 16px',
                    textAlign:'left', fontSize:10, fontWeight:600,
                    color:'#6b7fa3', textTransform:'uppercase',
                    letterSpacing:.7, background:'#f8fafc',
                    borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((sup,i)=>(
                <tr key={i} style={{ borderBottom:'1px solid #f4f6f9' }}>
                  <td style={{ padding:'12px 16px',
                    fontFamily:'monospace', fontSize:12,
                    color:'#1e6bbd', fontWeight:600 }}>
                    {sup.supplier_code}
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:8,
                        background:`hsl(${(sup.id||i)*67+160},50%,48%)`,
                        display:'flex', alignItems:'center',
                        justifyContent:'center', fontSize:12,
                        fontWeight:700, color:'white', flexShrink:0 }}>
                        {(sup.name||'?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:13 }}>
                          {sup.name}
                        </div>
                        {sup.tax_id && (
                          <div style={{ fontSize:10, color:'#6b7fa3' }}>
                            TIN: {sup.tax_id}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    {sup.email && <div style={{ fontSize:12, color:'#6b7fa3' }}>✉ {sup.email}</div>}
                    {sup.phone && <div style={{ fontSize:12, color:'#6b7fa3' }}>📞 {sup.phone}</div>}
                  </td>
                  <td style={{ padding:'12px 16px', color:'#6b7fa3', fontSize:13 }}>
                    {sup.country||'—'}
                  </td>
                  <td style={{ padding:'12px 16px', color:'#6b7fa3', fontSize:13 }}>
                    {sup.payment_terms} days
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ padding:'3px 10px', borderRadius:20,
                      fontSize:11, fontWeight:600,
                      background: sup.is_active!==0
                        ? 'rgba(22,199,154,.12)' : 'rgba(107,127,163,.12)',
                      color: sup.is_active!==0 ? '#0ea87f' : '#6b7fa3' }}>
                      {sup.is_active!==0 ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <button
                      onClick={()=>navigate(`/bills`)}
                      style={{ padding:'5px 10px', borderRadius:6,
                        border:'1px solid #1e6bbd', background:'none',
                        color:'#1e6bbd', fontSize:11,
                        fontWeight:600, cursor:'pointer' }}>
                      New Bill
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title="New Supplier">
        <div>
          <div style={g2}>
            <div><label style={lbl}>Supplier Code *</label>
              <input style={inp} placeholder="e.g. SUP-001"
                value={form.supplierCode}
                onChange={e=>upd('supplierCode',e.target.value)}/></div>
            <div><label style={lbl}>Supplier Name *</label>
              <input style={inp} placeholder="Company name"
                value={form.name}
                onChange={e=>upd('name',e.target.value)}/></div>
          </div>
          <div style={{ ...g2, marginTop:14 }}>
            <div><label style={lbl}>Email</label>
              <input style={inp} type="email"
                value={form.email}
                onChange={e=>upd('email',e.target.value)}/></div>
            <div><label style={lbl}>Phone</label>
              <input style={inp} value={form.phone}
                onChange={e=>upd('phone',e.target.value)}/></div>
          </div>
          <div style={{ ...g2, marginTop:14 }}>
            <div><label style={lbl}>City</label>
              <input style={inp} value={form.city}
                onChange={e=>upd('city',e.target.value)}/></div>
            <div><label style={lbl}>Country</label>
              <input style={inp} value={form.country}
                onChange={e=>upd('country',e.target.value)}/></div>
          </div>
          <div style={{ ...g2, marginTop:14 }}>
            <div><label style={lbl}>Tax ID / TIN</label>
              <input style={inp} value={form.taxId}
                onChange={e=>upd('taxId',e.target.value)}/></div>
            <div><label style={lbl}>Payment Terms (days)</label>
              <input style={inp} type="number" value={form.paymentTerms}
                onChange={e=>upd('paymentTerms',parseInt(e.target.value)||30)}/></div>
          </div>
          <div style={{ ...g2, marginTop:14 }}>
            <div><label style={lbl}>Bank Name</label>
              <input style={inp} placeholder="e.g. GCB Bank"
                value={form.bankName}
                onChange={e=>upd('bankName',e.target.value)}/></div>
            <div><label style={lbl}>Account Number</label>
              <input style={inp} value={form.bankAccount}
                onChange={e=>upd('bankAccount',e.target.value)}/></div>
          </div>
          <div style={{ marginTop:14 }}>
            <label style={lbl}>Currency</label>
            <select style={inp} value={form.currency}
              onChange={e=>upd('currency',e.target.value)}>
              {['GHS','USD','EUR','GBP','NGN','KES','ZAR'].map(c=>(
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div style={{ display:'flex', gap:10,
            justifyContent:'flex-end', marginTop:24 }}>
            <button onClick={()=>setModal(false)}
              style={{ padding:'10px 20px', borderRadius:8,
                border:'1px solid #e2e8f0', background:'white',
                color:'#6b7fa3', fontSize:13, fontWeight:600,
                cursor:'pointer' }}>Cancel</button>
            <button onClick={handleCreate} disabled={saving}
              style={{ padding:'10px 20px', borderRadius:8,
                border:'none',
                background:saving?'#6b7fa3':'#1e6bbd',
                color:'white', fontSize:13, fontWeight:700,
                cursor:saving?'not-allowed':'pointer' }}>
              {saving?'Saving...':'Create Supplier'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
