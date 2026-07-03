import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

// ── Helpers ───────────────────────────────────────────────────
const fmtCur = (n) => `$${new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2
}).format(n || 0)}`;

// ── Small reusable components ─────────────────────────────────
function Badge({ status }) {
  const map = {
    active:    { bg:'rgba(22,199,154,.12)',  color:'#0ea87f' },
    inactive:  { bg:'rgba(107,127,163,.1)', color:'#6b7fa3' },
    cancelled: { bg:'rgba(107,127,163,.1)', color:'#6b7fa3' },
  };
  const s = map[status] || map.inactive;
  return (
    <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11,
      fontWeight:600, background:s.bg, color:s.color }}>
      {status}
    </span>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(13,27,42,.5)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:9999, padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'white', borderRadius:14, width:'100%',
        maxWidth:560, maxHeight:'90vh', overflow:'auto',
        boxShadow:'0 20px 60px rgba(13,27,42,.25)' }}>
        <div style={{ display:'flex', alignItems:'center',
          justifyContent:'space-between', padding:'18px 24px',
          borderBottom:'1px solid #e2e8f0' }}>
          <span style={{ fontSize:16, fontWeight:700 }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none',
            fontSize:22, color:'#6b7fa3', cursor:'pointer', lineHeight:1 }}>
            ×
          </button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function CustomerListPage() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [modal,     setModal]     = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [loaded,    setLoaded]    = useState(false);

  const [form, setForm] = useState({
    customerCode: '', name: '', email: '', phone: '',
    address: '', city: '', country: '',
    taxId: '', paymentTerms: 30, currency: 'USD',
  });

  // Load customers on first render
  useState(() => {
    api.get('/customers')
      .then(res => {
        setCustomers(res.data || []);
        setLoaded(true);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  });

  const upd = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleCreate = async () => {
    if (!form.customerCode) return alert('Customer Code is required');
    if (!form.name)         return alert('Customer Name is required');

    setSaving(true);
    try {
      await api.post('/customers', form);
      // Reload list
      const res = await api.get('/customers');
      setCustomers(res.data || []);
      setModal(false);
      setForm({
        customerCode: '', name: '', email: '', phone: '',
        address: '', city: '', country: '',
        taxId: '', paymentTerms: 30, currency: 'USD',
      });
    } catch (err) {
      alert(err.message || 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  };

  const filtered = customers.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.customer_code?.toLowerCase().includes(search.toLowerCase())
  );

  const inputStyle = {
    width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0',
    borderRadius:8, fontSize:13, fontFamily:'sans-serif',
    background:'#f9fafb', outline:'none',
  };
  const labelStyle = {
    display:'block', fontSize:11, fontWeight:600,
    color:'#1a2740', marginBottom:6,
  };
  const grid2 = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 };

  return (
    <div style={{ fontFamily:'sans-serif' }}>

      {/* ── Page Header ───────────────────────────────── */}
      <div style={{ display:'flex', justifyContent:'space-between',
        alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#1a2740', marginBottom:4 }}>
            Customers
          </h1>
          <p style={{ fontSize:13, color:'#6b7fa3' }}>
            Manage your customer base, credit limits and statements
          </p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ padding:'10px 20px', background:'#1e6bbd', color:'white',
            border:'none', borderRadius:8, fontSize:13, fontWeight:700,
            cursor:'pointer' }}>
          + New Customer
        </button>
      </div>

      {/* ── Stats Row ─────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)',
        gap:12, marginBottom:20 }}>
        {[
          { label:'Total Customers',   value: customers.length,  color:'#1e6bbd' },
          { label:'Active',            value: customers.filter(c => c.is_active !== 0).length, color:'#16c79a' },
          { label:'Outstanding Total', value: fmtCur(customers.reduce((s,c) => s + parseFloat(c.outstanding_balance || 0), 0)), color:'#e8a04a' },
        ].map((s, i) => (
          <div key={i} style={{ background:'white', borderRadius:12, padding:16,
            border:'1px solid #e2e8f0', boxShadow:'0 2px 8px rgba(13,27,42,.04)' }}>
            <div style={{ fontSize:11, color:'#6b7fa3', fontWeight:500, marginBottom:6 }}>
              {s.label}
            </div>
            <div style={{ fontSize:22, fontWeight:700, color:s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Search Bar ────────────────────────────────── */}
      <div style={{ background:'white', border:'1px solid #e2e8f0',
        borderRadius:10, padding:'10px 16px', marginBottom:16,
        display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:16 }}>🔍</span>
        <input
          placeholder="Search by name, email or code..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ border:'none', outline:'none', fontSize:13,
            fontFamily:'sans-serif', flex:1, background:'none', color:'#1a2740' }}
        />
        {search && (
          <button onClick={() => setSearch('')}
            style={{ background:'none', border:'none', cursor:'pointer',
              color:'#6b7fa3', fontSize:16 }}>×</button>
        )}
      </div>

      {/* ── Customers Table ───────────────────────────── */}
      <div style={{ background:'white', borderRadius:12, border:'1px solid #e2e8f0',
        boxShadow:'0 2px 8px rgba(13,27,42,.04)', overflow:'hidden' }}>

        {loading ? (
          <div style={{ textAlign:'center', padding:60, color:'#6b7fa3' }}>
            <div style={{ width:28, height:28, border:'3px solid #e2e8f0',
              borderTopColor:'#1e6bbd', borderRadius:'50%',
              animation:'spin .7s linear infinite', margin:'0 auto 12px' }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            Loading customers...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#6b7fa3' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>👥</div>
            <p style={{ fontSize:15, fontWeight:600, color:'#1a2740', marginBottom:6 }}>
              {search ? 'No customers match your search' : 'No customers yet'}
            </p>
            <p style={{ fontSize:13, marginBottom:20 }}>
              {search ? 'Try a different search term' : 'Add your first customer to start creating invoices'}
            </p>
            {!search && (
              <button onClick={() => setModal(true)}
                style={{ padding:'10px 24px', background:'#1e6bbd', color:'white',
                  border:'none', borderRadius:8, fontSize:13, fontWeight:600,
                  cursor:'pointer' }}>
                + Add First Customer
              </button>
            )}
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Code','Customer Name','Contact','Country','Currency',
                  'Payment Terms','Status',''].map(h => (
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
              {filtered.map((cust, i) => (
                <tr key={i} style={{ borderBottom:'1px solid #f4f6f9' }}>
                  <td style={{ padding:'12px 16px', fontFamily:'monospace',
                    fontSize:12, color:'#1e6bbd', fontWeight:600 }}>
                    {cust.customer_code}
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:8, flexShrink:0,
                        background:`hsl(${(cust.id || i) * 53 + 200},55%,50%)`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:12, fontWeight:700, color:'white' }}>
                        {(cust.name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:13 }}>{cust.name}</div>
                        {cust.tax_id && (
                          <div style={{ fontSize:10, color:'#6b7fa3' }}>
                            TIN: {cust.tax_id}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    {cust.email && (
                      <div style={{ fontSize:12, color:'#6b7fa3' }}>✉ {cust.email}</div>
                    )}
                    {cust.phone && (
                      <div style={{ fontSize:12, color:'#6b7fa3' }}>📞 {cust.phone}</div>
                    )}
                  </td>
                  <td style={{ padding:'12px 16px', color:'#6b7fa3', fontSize:13 }}>
                    {cust.country || '—'}
                  </td>
                  <td style={{ padding:'12px 16px', fontFamily:'monospace',
                    fontSize:12 }}>
                    {cust.currency}
                  </td>
                  <td style={{ padding:'12px 16px', color:'#6b7fa3', fontSize:13 }}>
                    {cust.payment_terms} days
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <Badge status={cust.is_active !== 0 ? 'active' : 'inactive'}/>
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button
                        onClick={() => navigate(`/invoices/new?customerId=${cust.id}`)}
                        style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #1e6bbd',
                          background:'none', color:'#1e6bbd', fontSize:11,
                          fontWeight:600, cursor:'pointer' }}>
                        Invoice
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── New Customer Modal ────────────────────────── */}
      <Modal open={modal} onClose={() => setModal(false)} title="New Customer">
        <div>
          <div style={grid2}>
            <div>
              <label style={labelStyle}>Customer Code *</label>
              <input style={inputStyle} placeholder="e.g. CUST-001"
                value={form.customerCode}
                onChange={e => upd('customerCode', e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>Customer Name *</label>
              <input style={inputStyle} placeholder="Full company or person name"
                value={form.name}
                onChange={e => upd('name', e.target.value)}/>
            </div>
          </div>

          <div style={{ ...grid2, marginTop:14 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} type="email" placeholder="email@company.com"
                value={form.email}
                onChange={e => upd('email', e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} placeholder="+233 20 000 0000"
                value={form.phone}
                onChange={e => upd('phone', e.target.value)}/>
            </div>
          </div>

          <div style={{ ...grid2, marginTop:14 }}>
            <div>
              <label style={labelStyle}>Tax ID / TIN</label>
              <input style={inputStyle} placeholder="VAT or TIN number"
                value={form.taxId}
                onChange={e => upd('taxId', e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>Payment Terms (days)</label>
              <input style={inputStyle} type="number" value={form.paymentTerms}
                onChange={e => upd('paymentTerms', parseInt(e.target.value) || 30)}/>
            </div>
          </div>

          <div style={{ ...grid2, marginTop:14 }}>
            <div>
              <label style={labelStyle}>City</label>
              <input style={inputStyle} placeholder="e.g. Accra"
                value={form.city}
                onChange={e => upd('city', e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>Country</label>
              <input style={inputStyle} placeholder="e.g. Ghana"
                value={form.country}
                onChange={e => upd('country', e.target.value)}/>
            </div>
          </div>

          <div style={{ marginTop:14 }}>
            <label style={labelStyle}>Currency</label>
            <select style={{ ...inputStyle }}
              value={form.currency}
              onChange={e => upd('currency', e.target.value)}>
              {['USD','EUR','GBP','GHS','NGN','KES','ZAR'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:24 }}>
            <button onClick={() => setModal(false)}
              style={{ padding:'10px 20px', borderRadius:8,
                border:'1px solid #e2e8f0', background:'white',
                color:'#6b7fa3', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Cancel
            </button>
            <button onClick={handleCreate} disabled={saving}
              style={{ padding:'10px 20px', borderRadius:8, border:'none',
                background: saving ? '#6b7fa3' : '#1e6bbd', color:'white',
                fontSize:13, fontWeight:700, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving...' : 'Create Customer'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
