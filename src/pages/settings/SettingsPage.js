// ============================================================
//  src/pages/settings/SettingsPage.js
// ============================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [tab,     setTab]     = useState('organisation');
  const [org,     setOrg]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [exporting, setExporting] = useState(false);
  const [form,    setForm]    = useState({
    name:'', legalName:'', taxId:'',
    address:'', city:'', country:'',
    phone:'', email:'', baseCurrency:'GHS',
  });

  useEffect(() => {
    api.get('/organizations')
      .then(res => {
        const o = res.data;
        setOrg(o);
        setForm({
          name:         o.name          || '',
          legalName:    o.legal_name    || '',
          taxId:        o.tax_id        || '',
          address:      o.address       || '',
          city:         o.city          || '',
          country:      o.country       || '',
          phone:        o.phone         || '',
          email:        o.email         || '',
          baseCurrency: o.base_currency || 'GHS',
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/organizations/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(org?.name || 'finsuite-export').replace(/\s+/g, '-').toLowerCase()}-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Failed to export data');
    } finally { setExporting(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/organizations', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.message || 'Failed to save settings');
    } finally { setSaving(false); }
  };

  const TABS = [
    { id:'organisation', label:'Organisation',    icon:'🏢' },
    { id:'fiscal',       label:'Fiscal Year',     icon:'📅' },
    { id:'preferences',  label:'Preferences',     icon:'⚙️' },
    { id:'account',      label:'My Account',      icon:'👤' },
  ];

  const inp = {
    width:'100%', padding:'10px 12px',
    border:'1.5px solid #e2e8f0', borderRadius:8,
    fontSize:13, fontFamily:'sans-serif',
    background:'#f9fafb', outline:'none',
    transition:'border-color .2s',
  };
  const lbl = {
    display:'block', fontSize:11, fontWeight:600,
    color:'#1a2740', marginBottom:6,
  };
  const g2 = {
    display:'grid', gridTemplateColumns:'1fr 1fr', gap:16,
  };
  const card = {
    background:'white', borderRadius:12,
    border:'1px solid #e2e8f0',
    boxShadow:'0 2px 8px rgba(13,27,42,.04)',
    marginBottom:16, overflow:'hidden',
  };
  const cardHead = {
    padding:'16px 24px', borderBottom:'1px solid #e2e8f0',
    fontWeight:700, fontSize:15, color:'#1a2740',
  };
  const cardBody = { padding:24 };

  if (loading) return (
    <div style={{ textAlign:'center', padding:80,
      color:'#6b7fa3', fontFamily:'sans-serif' }}>
      <div style={{ width:32, height:32,
        border:'3px solid #e2e8f0',
        borderTopColor:'#1e6bbd', borderRadius:'50%',
        animation:'spin .7s linear infinite',
        margin:'0 auto 16px' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      Loading settings...
    </div>
  );

  return (
    <div style={{ fontFamily:'sans-serif' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between',
        alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700,
            color:'#1a2740', marginBottom:4 }}>Settings</h1>
          <p style={{ fontSize:13, color:'#6b7fa3' }}>
            Manage organisation profile,
            fiscal year and preferences
          </p>
        </div>
        <div style={{ display:'flex',
          alignItems:'center', gap:10 }}>
          {saved && (
            <span style={{ fontSize:12, color:'#16c79a',
              fontWeight:600,
              animation:'fadeIn .3s ease' }}>
              ✓ Settings saved
            </span>
          )}
          <button onClick={handleSave} disabled={saving}
            style={{ padding:'10px 20px',
              background:saving?'#6b7fa3':'#1e6bbd',
              color:'white', border:'none', borderRadius:8,
              fontSize:13, fontWeight:700,
              cursor:saving?'not-allowed':'pointer' }}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ display:'flex', gap:4, marginBottom:24,
        background:'white', borderRadius:10,
        padding:4, border:'1px solid #e2e8f0',
        width:'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'9px 18px', borderRadius:8,
              border:'none', cursor:'pointer',
              fontSize:13, fontWeight:600,
              background: tab===t.id
                ? '#1e6bbd' : 'transparent',
              color: tab===t.id ? 'white' : '#6b7fa3',
              transition:'all .2s' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Organisation Tab */}
      {tab === 'organisation' && (
        <>
          {/* Org identity */}
          <div style={card}>
            <div style={cardHead}>
              Organisation Identity
            </div>
            <div style={cardBody}>
              <div style={g2}>
                <div>
                  <label style={lbl}>
                    Organisation Name *
                  </label>
                  <input style={inp}
                    placeholder="Your company name"
                    value={form.name}
                    onChange={e=>upd('name',e.target.value)}/>
                </div>
                <div>
                  <label style={lbl}>Legal Name</label>
                  <input style={inp}
                    placeholder="Registered legal name"
                    value={form.legalName}
                    onChange={e=>upd('legalName',
                      e.target.value)}/>
                </div>
              </div>
              <div style={{ ...g2, marginTop:16 }}>
                <div>
                  <label style={lbl}>
                    TIN / Tax Identification Number
                  </label>
                  <input style={inp}
                    placeholder="e.g. C0012345678"
                    value={form.taxId}
                    onChange={e=>upd('taxId',e.target.value)}/>
                </div>
                <div>
                  <label style={lbl}>Base Currency</label>
                  <select style={inp}
                    value={form.baseCurrency}
                    onChange={e=>upd('baseCurrency',
                      e.target.value)}>
                    {['GHS','USD','EUR','GBP',
                      'NGN','KES','ZAR'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <p style={{ fontSize:10, color:'#e8a04a',
                    marginTop:4 }}>
                    ⚠ Changing base currency affects
                    all reports
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact details */}
          <div style={card}>
            <div style={cardHead}>Contact Details</div>
            <div style={cardBody}>
              <div style={g2}>
                <div>
                  <label style={lbl}>Email Address</label>
                  <input style={inp} type="email"
                    placeholder="accounts@company.com"
                    value={form.email}
                    onChange={e=>upd('email',
                      e.target.value)}/>
                </div>
                <div>
                  <label style={lbl}>Phone Number</label>
                  <input style={inp}
                    placeholder="+233 30 000 0000"
                    value={form.phone}
                    onChange={e=>upd('phone',e.target.value)}/>
                </div>
              </div>
              <div style={{ marginTop:16 }}>
                <label style={lbl}>Address</label>
                <input style={inp}
                  placeholder="Street address"
                  value={form.address}
                  onChange={e=>upd('address',e.target.value)}/>
              </div>
              <div style={{ ...g2, marginTop:16 }}>
                <div>
                  <label style={lbl}>City</label>
                  <input style={inp}
                    placeholder="e.g. Accra"
                    value={form.city}
                    onChange={e=>upd('city',e.target.value)}/>
                </div>
                <div>
                  <label style={lbl}>Country</label>
                  <input style={inp}
                    placeholder="e.g. Ghana"
                    value={form.country}
                    onChange={e=>upd('country',
                      e.target.value)}/>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Fiscal Year Tab */}
      {tab === 'fiscal' && (
        <div style={card}>
          <div style={cardHead}>Fiscal Year Settings</div>
          <div style={cardBody}>
            <div style={{ background:'#f0f9ff',
              border:'1px solid #93c5fd', borderRadius:8,
              padding:14, marginBottom:20,
              fontSize:13, color:'#1e40af', lineHeight:1.7 }}>
              <strong>Current Fiscal Year:</strong>{' '}
              {org?.fiscal_year_start
                ? new Date(
                    org.fiscal_year_start
                  ).toLocaleDateString('en-GB', {
                    day:'2-digit', month:'long'
                  })
                : '—'}{' '}
              to{' '}
              {org?.fiscal_year_end
                ? new Date(
                    org.fiscal_year_end
                  ).toLocaleDateString('en-GB', {
                    day:'2-digit', month:'long'
                  })
                : '—'}
            </div>
            <div style={g2}>
              <div>
                <label style={lbl}>Fiscal Year Start</label>
                <input style={inp} type="date"
                  defaultValue={org?.fiscal_year_start
                    ?.slice(0,10)}/>
              </div>
              <div>
                <label style={lbl}>Fiscal Year End</label>
                <input style={inp} type="date"
                  defaultValue={org?.fiscal_year_end
                    ?.slice(0,10)}/>
              </div>
            </div>
            <div style={{ background:'#fffbeb',
              border:'1px solid #fcd34d',
              borderRadius:8, padding:12, marginTop:16,
              fontSize:12, color:'#92400e' }}>
              ⚠️ Changing the fiscal year will affect
              how financial reports are grouped.
              Please ensure all entries are posted
              before making this change.
            </div>
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {tab === 'preferences' && (
        <>
          <div style={card}>
            <div style={cardHead}>
              Invoice Preferences
            </div>
            <div style={cardBody}>
              <div style={g2}>
                <div>
                  <label style={lbl}>
                    Invoice Number Prefix
                  </label>
                  <input style={inp}
                    defaultValue="INV" placeholder="INV"/>
                  <p style={{ fontSize:11, color:'#6b7fa3',
                    marginTop:4 }}>
                    Invoices will be numbered: INV-2024-0001
                  </p>
                </div>
                <div>
                  <label style={lbl}>
                    Default Payment Terms (days)
                  </label>
                  <input style={inp} type="number"
                    defaultValue={30}/>
                </div>
              </div>
              <div style={{ marginTop:16 }}>
                <label style={lbl}>
                  Default Invoice Notes
                </label>
                <textarea
                  style={{ ...inp, height:80,
                    resize:'vertical' }}
                  defaultValue="Thank you for your business. Payment is due within the agreed terms."/>
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={cardHead}>
              Notification Preferences
            </div>
            <div style={cardBody}>
              {[
                { label:'Email me when an invoice is overdue',
                  def:true },
                { label:'Email me tax deadline reminders',
                  def:true },
                { label:'Email me low stock alerts',
                  def:false },
                { label:'Monthly financial summary email',
                  def:true },
              ].map((item, i) => (
                <div key={i} style={{ display:'flex',
                  justifyContent:'space-between',
                  alignItems:'center', padding:'12px 0',
                  borderBottom: i < 3
                    ? '1px solid #f4f6f9' : 'none' }}>
                  <span style={{ fontSize:13,
                    color:'#1a2740' }}>{item.label}</span>
                  <label style={{ position:'relative',
                    display:'inline-block',
                    width:44, height:24 }}>
                    <input type="checkbox"
                      defaultChecked={item.def}
                      style={{ opacity:0, width:0,
                        height:0 }}/>
                    <span style={{ position:'absolute',
                      cursor:'pointer', inset:0,
                      background: item.def
                        ? '#1e6bbd' : '#e2e8f0',
                      borderRadius:12,
                      transition:'.3s' }}>
                      <span style={{ position:'absolute',
                        content:'""', height:18, width:18,
                        left:3, top:3,
                        background:'white',
                        borderRadius:'50%',
                        transition:'.3s',
                        transform: item.def
                          ? 'translateX(20px)' : 'none' }}/>
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Account Tab */}
      {tab === 'account' && (
        <>
          <div style={card}>
            <div style={cardHead}>Profile Information</div>
            <div style={cardBody}>
              <div style={{ display:'flex',
                alignItems:'center', gap:20,
                marginBottom:24 }}>
                <div style={{ width:60, height:60,
                  borderRadius:14,
                  background:'linear-gradient(135deg,#e8a04a,#f0bc78)',
                  display:'flex', alignItems:'center',
                  justifyContent:'center', fontSize:22,
                  fontWeight:800, color:'#0d1b2a' }}>
                  A
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:16 }}>
                    Admin User
                  </div>
                  <div style={{ fontSize:13, color:'#6b7fa3' }}>
                    admin@mycompany.com
                  </div>
                  <div style={{ fontSize:11,
                    color:'#16c79a', marginTop:4,
                    fontWeight:600 }}>
                    ● Administrator
                  </div>
                </div>
              </div>
              <div style={g2}>
                <div>
                  <label style={lbl}>First Name</label>
                  <input style={inp} defaultValue="Admin"/>
                </div>
                <div>
                  <label style={lbl}>Last Name</label>
                  <input style={inp} defaultValue="User"/>
                </div>
              </div>
              <div style={{ marginTop:16 }}>
                <label style={lbl}>Email Address</label>
                <input style={inp} type="email"
                  defaultValue="admin@mycompany.com"/>
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={cardHead}>Change Password</div>
            <div style={cardBody}>
              <div style={{ marginBottom:14 }}>
                <label style={lbl}>Current Password</label>
                <input style={inp} type="password"
                  placeholder="Enter current password"/>
              </div>
              <div style={g2}>
                <div>
                  <label style={lbl}>New Password</label>
                  <input style={inp} type="password"
                    placeholder="Min 8 characters"/>
                </div>
                <div>
                  <label style={lbl}>
                    Confirm New Password
                  </label>
                  <input style={inp} type="password"
                    placeholder="Repeat new password"/>
                </div>
              </div>
              <div style={{ marginTop:16 }}>
                <button style={{ padding:'10px 20px',
                  background:'#1e6bbd', color:'white',
                  border:'none', borderRadius:8, fontSize:13,
                  fontWeight:600, cursor:'pointer' }}>
                  Update Password
                </button>
              </div>
            </div>
          </div>

          {/* Period Close */}
          {(hasRole('Admin') || hasRole('Accountant')) && (
            <div style={{ ...card, borderColor:'#1e6bbd' }}>
              <div style={{ ...cardHead, color:'#1e6bbd' }}>
                📊 Period Close
              </div>
              <div style={cardBody}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13, color:'#1a2740', marginBottom:4 }}>
                      Close an Accounting Period
                    </div>
                    <div style={{ fontSize:12, color:'#6b7fa3' }}>
                      Zero out revenue and expense accounts and roll net income
                      or loss into Retained Earnings.
                    </div>
                  </div>
                  <button onClick={() => navigate('/settings/period-close')}
                    style={{ padding:'9px 18px', border:'none',
                      background:'#1e6bbd', color:'white',
                      borderRadius:8, fontSize:12, fontWeight:700,
                      cursor:'pointer', whiteSpace:'nowrap' }}>
                    Open
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Go-Live Wizard */}
          {hasRole('Admin') && (
            <div style={{ ...card, borderColor:'#1e6bbd' }}>
              <div style={{ ...cardHead, color:'#1e6bbd' }}>
                🚀 Go Live
              </div>
              <div style={cardBody}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13, color:'#1a2740', marginBottom:4 }}>
                      Switch to Real Data
                    </div>
                    <div style={{ fontSize:12, color:'#6b7fa3' }}>
                      Clear all test invoices, sales and transactions, enter opening
                      balances, and start recording real business activity.
                    </div>
                  </div>
                  <button onClick={() => navigate('/settings/go-live')}
                    style={{ padding:'9px 18px', border:'none',
                      background:'#1e6bbd', color:'white',
                      borderRadius:8, fontSize:12, fontWeight:700,
                      cursor:'pointer', whiteSpace:'nowrap' }}>
                    Open Wizard
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <div style={{ ...card, borderColor:'#fca5a5' }}>
            <div style={{ ...cardHead,
              color:'#e05c5c', borderColor:'#fca5a5' }}>
              Danger Zone
            </div>
            <div style={cardBody}>
              <div style={{ display:'flex',
                justifyContent:'space-between',
                alignItems:'center' }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13,
                    color:'#1a2740', marginBottom:4 }}>
                    Export All Data
                  </div>
                  <div style={{ fontSize:12,
                    color:'#6b7fa3' }}>
                    Download a full backup of all your
                    accounting data
                  </div>
                </div>
                <button onClick={handleExport} disabled={exporting}
                  style={{ padding:'9px 18px',
                  border:'1px solid #1e6bbd',
                  background:'white', color: exporting ? '#6b7fa3' : '#1e6bbd',
                  borderRadius:8, fontSize:12,
                  fontWeight:600, cursor: exporting ? 'not-allowed' : 'pointer' }}>
                  {exporting ? 'Exporting…' : 'Export'}
                </button>
              </div>
              <div style={{ height:1,
                background:'#f4f6f9', margin:'16px 0' }}/>
              <div style={{ display:'flex',
                justifyContent:'space-between',
                alignItems:'center' }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13,
                    color:'#e05c5c', marginBottom:4 }}>
                    Delete Account
                  </div>
                  <div style={{ fontSize:12,
                    color:'#6b7fa3' }}>
                    Permanently delete your organisation
                    and all data. This cannot be undone.
                  </div>
                </div>
                <button
                  onClick={() => alert(
                    'Please contact support to delete your account.'
                  )}
                  style={{ padding:'9px 18px',
                    border:'1px solid #e05c5c',
                    background:'white', color:'#e05c5c',
                    borderRadius:8, fontSize:12,
                    fontWeight:600, cursor:'pointer' }}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
