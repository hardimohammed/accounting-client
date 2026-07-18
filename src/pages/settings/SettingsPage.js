// ============================================================
//  src/pages/settings/SettingsPage.js
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { validateImageFile } from '../../hooks/useApi';
import toast from 'react-hot-toast';

const API_URL  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
const API_BASE = API_URL.replace(/\/api\/v\d+\/?$/, '');
const DEFAULT_BRAND_COLOR = '#1e6bbd';

// `new Date('2027-04-01')` parses as UTC midnight, then
// .toLocaleDateString() renders it in the browser's LOCAL timezone —
// in any timezone behind UTC that silently rolls a pure calendar date
// (no time component, nothing UTC-specific about a fiscal year
// boundary) back a day. Format the YYYY-MM-DD string directly instead
// of routing a date-only value through a timezone-aware Date object.
const fmtDateOnly = (d) => {
  if (!d) return '—';
  const [, m, day] = d.slice(0, 10).split('-');
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${parseInt(day, 10)} ${MONTHS[parseInt(m, 10) - 1]}`;
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, hasRole, refreshUser } = useAuth();
  const [tab,     setTab]     = useState('organisation');
  const [org,     setOrg]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [exporting, setExporting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef();
  const [form,    setForm]    = useState({
    name:'', legalName:'', regNumber:'', taxId:'',
    address:'', city:'', country:'',
    phone:'', email:'', baseCurrency:'GHS',
    brandColor: DEFAULT_BRAND_COLOR,
    fiscalYearStart:'', fiscalYearEnd:'',
  });

  // My Account tab — the user's own profile, separate resource
  // (PUT /auth/me) and save action from the Organisation form above.
  const [profileForm, setProfileForm] = useState({ firstName:'', lastName:'', phone:'' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved,  setProfileSaved]  = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName:  user.lastName  || '',
        phone:     user.phone     || '',
      });
    }
  }, [user]);

  // Preferences tab — separate resource (org_settings), separate save
  // action from the rest of this page's Organisation form. The
  // notification toggles below are backed by a real scheduled check
  // (server-side notificationScheduler.js) that emails
  // notificationEmail (falling back to the org's own email) once a
  // day/deadline/month, deduped so it won't repeat itself.
  const [prefsForm, setPrefsForm] = useState({
    invoiceNumberPrefix:'INV', defaultPaymentTerms:30, defaultInvoiceNotes:'',
    notifyInvoiceOverdue:true, notifyTaxDeadlines:true, notifyLowStock:false, notifyMonthlySummary:true,
    notificationEmail:'',
  });
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving,  setPrefsSaving]  = useState(false);
  const [prefsSaved,   setPrefsSaved]   = useState(false);
  const updPrefs = (f, v) => setPrefsForm(p => ({ ...p, [f]: v }));

  useEffect(() => {
    api.get('/organizations/preferences')
      .then(res => setPrefsForm(res.data))
      .catch(console.error)
      .finally(() => setPrefsLoading(false));
  }, []);

  const handleSavePrefs = async () => {
    setPrefsSaving(true);
    try {
      await api.put('/organizations/preferences', prefsForm);
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 3000);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to save preferences');
    } finally { setPrefsSaving(false); }
  };

  // POS & Cash tab — separate resource (pos_settings), separate save
  // action from the rest of this page's Organisation form.
  const [glAccounts,   setGlAccounts]   = useState([]);
  const [posLoading,   setPosLoading]   = useState(true);
  const [posSaving,    setPosSaving]    = useState(false);
  const [posSaved,     setPosSaved]     = useState(false);
  const [posForm,      setPosForm]      = useState({
    cashAccountId:'', momoAccountId:'', cardAccountId:'',
    salesAccountId:'', vatAccountId:'', cogsAccountId:'', inventoryAccountId:'',
    vatRate:15, applyVat:true, allowPriceOverride:true, requireCustomer:false,
    varianceAlertThreshold:20, ownerAlertEmail:'',
    receiptFooter:'', paystackPublicKey:'', paystackSecretKey:'',
    hasSecretKey:false,
  });
  const updPos = (f, v) => setPosForm(p => ({ ...p, [f]: v }));

  useEffect(() => {
    api.get('/organizations')
      .then(res => {
        const o = res.data;
        setOrg(o);
        setForm({
          name:         o.name          || '',
          legalName:    o.legal_name    || '',
          regNumber:    o.reg_number    || '',
          taxId:        o.tax_id        || '',
          address:      o.address       || '',
          city:         o.city          || '',
          country:      o.country       || '',
          phone:        o.phone         || '',
          email:        o.email         || '',
          baseCurrency: o.base_currency || 'GHS',
          brandColor:   o.brand_color   || DEFAULT_BRAND_COLOR,
          fiscalYearStart: o.fiscal_year_start?.slice(0, 10) || '',
          fiscalYearEnd:   o.fiscal_year_end?.slice(0, 10)   || '',
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    Promise.all([
      api.get('/pos/settings'),
      api.get('/accounts', { params: { limit: 200 } }),
    ]).then(([settingsRes, accountsRes]) => {
      const s = settingsRes.data || {};
      setPosForm({
        cashAccountId:      s.cash_account_id      || '',
        momoAccountId:      s.momo_account_id       || '',
        cardAccountId:      s.card_account_id       || '',
        salesAccountId:     s.sales_account_id      || '',
        vatAccountId:       s.vat_account_id        || '',
        cogsAccountId:      s.cogs_account_id       || '',
        inventoryAccountId: s.inventory_account_id  || '',
        vatRate:            s.vat_rate !== undefined && s.vat_rate !== null ? parseFloat(s.vat_rate) : 15,
        applyVat:           !!s.apply_vat,
        allowPriceOverride: !!s.allow_price_override,
        requireCustomer:    !!s.require_customer,
        varianceAlertThreshold: s.variance_alert_threshold !== undefined && s.variance_alert_threshold !== null ? parseFloat(s.variance_alert_threshold) : 20,
        ownerAlertEmail:    s.owner_alert_email    || '',
        receiptFooter:      s.receipt_footer       || '',
        paystackPublicKey:  s.paystack_public_key  || '',
        paystackSecretKey:  '',
        hasSecretKey:       !!s.paystack_secret_key,
      });
      setGlAccounts(accountsRes.data || []);
    }).catch(console.error)
      .finally(() => setPosLoading(false));
  }, []);

  const handleSavePosSettings = async () => {
    setPosSaving(true);
    try {
      const payload = { ...posForm };
      delete payload.hasSecretKey;
      // Blank means "leave the existing key alone" — never overwrite a
      // saved secret with an empty string just because the field was
      // shown blank for masking.
      if (!payload.paystackSecretKey) delete payload.paystackSecretKey;
      // "— Not set —" posts as '' from the <select>, which the server
      // would otherwise try to use as a literal account id rather than
      // treating it as "no account chosen".
      for (const key of ['cashAccountId','momoAccountId','cardAccountId','salesAccountId','vatAccountId','cogsAccountId','inventoryAccountId']) {
        if (payload[key] === '') payload[key] = null;
      }
      await api.put('/pos/settings', payload);
      setPosSaved(true);
      setTimeout(() => setPosSaved(false), 3000);
      setPosForm(p => ({ ...p, paystackSecretKey: '', hasSecretKey: p.hasSecretKey || !!payload.paystackSecretKey }));
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to save POS settings');
    } finally { setPosSaving(false); }
  };

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
      // Keeps the "Current Fiscal Year" banner (and anything else on
      // this page reading straight off `org`) in sync immediately,
      // rather than only after a full reload.
      setOrg(o => ({ ...o, ...form, fiscal_year_start: form.fiscalYearStart, fiscal_year_end: form.fiscalYearEnd }));
      // Picks up the new brand color in the sidebar immediately —
      // without this, it'd only appear after a full page reload since
      // AppLayout reads it off the AuthContext user object, not
      // straight from this page's own local state.
      refreshUser();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to save settings');
    } finally { setSaving(false); }
  };

  const handleSaveProfile = async () => {
    if (!profileForm.firstName.trim()) return alert('First name is required');
    if (!profileForm.lastName.trim())  return alert('Last name is required');
    setProfileSaving(true);
    try {
      await api.put('/auth/me', profileForm);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
      await refreshUser();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update profile');
    } finally { setProfileSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!pwForm.currentPassword) return alert('Enter your current password');
    if (pwForm.newPassword.length < 8) return alert('New password must be at least 8 characters');
    if (pwForm.newPassword !== pwForm.confirmPassword) return alert('New password and confirmation do not match');
    setPwSaving(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwForm({ currentPassword:'', newPassword:'', confirmPassword:'' });
      toast.success('Password changed');
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to change password');
    } finally { setPwSaving(false); }
  };

  const handleLogoSelect = async (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // lets picking the exact same file again re-fire onChange
    if (!file) return;
    const problem = validateImageFile(file, { allowSvg: true });
    if (problem) return toast.error(problem);

    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await api.post('/organizations/logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setOrg(o => ({ ...o, logo_url: res.data.logoUrl }));
      toast.success('Logo updated');
      refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Logo upload failed');
    } finally { setUploadingLogo(false); }
  };

  const TABS = [
    { id:'organisation', label:'Organisation',    icon:'🏢' },
    { id:'pos',          label:'POS & Cash',      icon:'🏪' },
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

  // App.js's RoleRoute already redirects a non-Admin away before this
  // page ever renders — this is a second, cheap layer in case that
  // route guard is ever bypassed, matching the same pattern used for
  // UsersPage.js.
  if (!hasRole('Admin')) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
        height:'65vh', fontFamily:'sans-serif', textAlign:'center' }}>
        <div>
          <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
          <h2 style={{ fontSize:18, fontWeight:700, color:'#1a2740', marginBottom:6 }}>
            Admins only
          </h2>
          <p style={{ color:'#6b7fa3', fontSize:13 }}>
            Settings are restricted to Admin accounts.
          </p>
        </div>
      </div>
    );
  }

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
                    Business Registration Number
                  </label>
                  <input style={inp}
                    placeholder="e.g. BN-2026-001234"
                    value={form.regNumber}
                    onChange={e=>upd('regNumber',e.target.value)}/>
                </div>
                <div>
                  <label style={lbl}>
                    TIN / Tax Identification Number
                  </label>
                  <input style={inp}
                    placeholder="e.g. C0012345678"
                    value={form.taxId}
                    onChange={e=>upd('taxId',e.target.value)}/>
                </div>
              </div>
              <div style={{ ...g2, marginTop:16 }}>
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

          {/* Branding — logo + primary accent color, applied to the
              sidebar and other key brand touchpoints across the app */}
          <div style={card}>
            <div style={cardHead}>Branding</div>
            <div style={cardBody}>
              <div style={g2}>
                <div>
                  <label style={lbl}>Company Logo</label>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div onClick={() => logoInputRef.current?.click()}
                      style={{ width:64, height:64, borderRadius:12,
                        border:'2px dashed #e2e8f0', cursor:'pointer',
                        overflow:'hidden', flexShrink:0,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        background:'#f8fafc' }}>
                      {org?.logo_url ? (
                        <img src={`${API_BASE}${org.logo_url}?token=${localStorage.getItem('accessToken')}`}
                          alt="Logo" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                      ) : (
                        <span style={{ fontSize:22 }}>🖼️</span>
                      )}
                    </div>
                    <div>
                      <button type="button" onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        style={{ padding:'8px 16px', borderRadius:8,
                          border:'1px solid #e2e8f0', background:'white',
                          color:'#1a2740', fontSize:12, fontWeight:600,
                          cursor: uploadingLogo ? 'not-allowed' : 'pointer' }}>
                        {uploadingLogo ? 'Uploading…' : org?.logo_url ? 'Change logo' : 'Upload logo'}
                      </button>
                      <p style={{ fontSize:10, color:'#6b7fa3', marginTop:6 }}>
                        JPG, PNG, WEBP, GIF or SVG — max 5MB
                      </p>
                    </div>
                    <input ref={logoInputRef} type="file" accept="image/*"
                      style={{ display:'none' }} onChange={handleLogoSelect}/>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Brand Color</label>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <input type="color" value={form.brandColor}
                      onChange={e=>upd('brandColor', e.target.value)}
                      style={{ width:44, height:38, padding:2, border:'1.5px solid #e2e8f0',
                        borderRadius:8, cursor:'pointer', background:'#f9fafb' }}/>
                    <input style={{ ...inp, fontFamily:'monospace' }}
                      value={form.brandColor}
                      onChange={e=>upd('brandColor', e.target.value)}
                      placeholder="#1e6bbd"/>
                  </div>
                  <p style={{ fontSize:10, color:'#6b7fa3', marginTop:6 }}>
                    Used for the sidebar and your logo badge — saved with the rest of this form
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

      {/* POS & Cash Tab */}
      {tab === 'pos' && (
        posLoading ? (
          <div style={{ textAlign:'center', padding:60, color:'#6b7fa3' }}>Loading POS settings...</div>
        ) : (
        <>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12, gap:10, alignItems:'center' }}>
            {posSaved && (
              <span style={{ fontSize:12, color:'#16c79a', fontWeight:600 }}>✓ POS settings saved</span>
            )}
            <button onClick={handleSavePosSettings} disabled={posSaving}
              style={{ padding:'9px 18px', background: posSaving ? '#6b7fa3' : '#1e6bbd',
                color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:700,
                cursor: posSaving ? 'not-allowed' : 'pointer' }}>
              {posSaving ? 'Saving...' : 'Save POS Settings'}
            </button>
          </div>

          {/* GL Account Mappings */}
          <div style={card}>
            <div style={cardHead}>GL Account Mappings</div>
            <div style={cardBody}>
              <p style={{ fontSize:12, color:'#6b7fa3', marginBottom:16 }}>
                Which Chart of Accounts entry each POS payment method and sale component posts to.
              </p>
              <div style={g2}>
                {[
                  ['cashAccountId', 'Cash Account'],
                  ['momoAccountId', 'Mobile Money Account'],
                  ['cardAccountId', 'Card Account'],
                  ['salesAccountId', 'Sales Revenue Account'],
                  ['vatAccountId', 'VAT / Tax Payable Account'],
                  ['cogsAccountId', 'Cost of Goods Sold Account'],
                  ['inventoryAccountId', 'Inventory Asset Account'],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label style={lbl}>{label}</label>
                    <select style={inp} value={posForm[key]} onChange={e=>updPos(key, e.target.value)}>
                      <option value="">— Not set —</option>
                      {glAccounts.map(a => (
                        <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tax & Pricing */}
          <div style={card}>
            <div style={cardHead}>Tax &amp; Pricing</div>
            <div style={cardBody}>
              <div style={g2}>
                <div>
                  <label style={lbl}>VAT Rate (%)</label>
                  <input style={inp} type="number" min="0" max="100" step="0.01"
                    value={posForm.vatRate}
                    onChange={e=>updPos('vatRate', e.target.value)}/>
                </div>
              </div>
              {[
                ['applyVat', 'Apply VAT to sales'],
                ['allowPriceOverride', 'Allow cashiers to override item prices'],
                ['requireCustomer', 'Require a customer to be selected before checkout'],
              ].map(([key, label]) => (
                <label key={key} style={{ display:'flex', alignItems:'center', gap:10, marginTop:16, fontSize:13, color:'#1a2740', cursor:'pointer' }}>
                  <input type="checkbox" checked={posForm[key]} onChange={e=>updPos(key, e.target.checked)}/>
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Cash Reconciliation */}
          <div style={card}>
            <div style={cardHead}>Cash Reconciliation</div>
            <div style={cardBody}>
              <div style={g2}>
                <div>
                  <label style={lbl}>Variance Alert Threshold (GHS)</label>
                  <input style={inp} type="number" min="0" step="0.01"
                    value={posForm.varianceAlertThreshold}
                    onChange={e=>updPos('varianceAlertThreshold', e.target.value)}/>
                  <p style={{ fontSize:10, color:'#6b7fa3', marginTop:4 }}>
                    A shift closing off by more than this requires a note and alerts the owner email below.
                  </p>
                </div>
                <div>
                  <label style={lbl}>Owner Alert Email</label>
                  <input style={inp} type="email" placeholder="owner@company.com"
                    value={posForm.ownerAlertEmail}
                    onChange={e=>updPos('ownerAlertEmail', e.target.value)}/>
                  <p style={{ fontSize:10, color:'#6b7fa3', marginTop:4 }}>
                    Receives an email summary (cash, MoMo, card, total, variance) every time a shift closes. Leave blank to disable.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Receipt */}
          <div style={card}>
            <div style={cardHead}>Receipt</div>
            <div style={cardBody}>
              <label style={lbl}>Receipt Footer</label>
              <textarea style={{ ...inp, height:70, resize:'vertical' }}
                value={posForm.receiptFooter}
                onChange={e=>updPos('receiptFooter', e.target.value)}/>
            </div>
          </div>

          {/* Paystack */}
          <div style={card}>
            <div style={cardHead}>Paystack Integration</div>
            <div style={cardBody}>
              <div style={g2}>
                <div>
                  <label style={lbl}>Public Key</label>
                  <input style={inp} placeholder="pk_live_..."
                    value={posForm.paystackPublicKey}
                    onChange={e=>updPos('paystackPublicKey', e.target.value)}/>
                </div>
                <div>
                  <label style={lbl}>Secret Key</label>
                  <input style={inp} type="password"
                    placeholder={posForm.hasSecretKey ? '•••••••••••• (unchanged — type to replace)' : 'sk_live_...'}
                    value={posForm.paystackSecretKey}
                    onChange={e=>updPos('paystackSecretKey', e.target.value)}/>
                  <p style={{ fontSize:10, color:'#6b7fa3', marginTop:4 }}>
                    {posForm.hasSecretKey ? 'A secret key is already saved — leave blank to keep it.' : 'Not set yet.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
        )
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
              {fmtDateOnly(org?.fiscal_year_start)}{' '}
              to{' '}
              {fmtDateOnly(org?.fiscal_year_end)}
            </div>
            <div style={g2}>
              <div>
                <label style={lbl}>Fiscal Year Start</label>
                <input style={inp} type="date"
                  value={form.fiscalYearStart}
                  onChange={e=>upd('fiscalYearStart', e.target.value)}/>
              </div>
              <div>
                <label style={lbl}>Fiscal Year End</label>
                <input style={inp} type="date"
                  value={form.fiscalYearEnd}
                  onChange={e=>upd('fiscalYearEnd', e.target.value)}/>
              </div>
            </div>
            <p style={{ fontSize:11, color:'#6b7fa3', marginTop:10 }}>
              Saved together with the rest of this form via the "Save Settings" button above.
            </p>
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
        prefsLoading ? (
          <div style={{ textAlign:'center', padding:60, color:'#6b7fa3' }}>Loading preferences...</div>
        ) : (
        <>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12, gap:10, alignItems:'center' }}>
            {prefsSaved && (
              <span style={{ fontSize:12, color:'#16c79a', fontWeight:600 }}>✓ Preferences saved</span>
            )}
            <button onClick={handleSavePrefs} disabled={prefsSaving}
              style={{ padding:'9px 18px', background: prefsSaving ? '#6b7fa3' : '#1e6bbd',
                color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:700,
                cursor: prefsSaving ? 'not-allowed' : 'pointer' }}>
              {prefsSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>

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
                    value={prefsForm.invoiceNumberPrefix}
                    onChange={e => updPrefs('invoiceNumberPrefix', e.target.value.toUpperCase())}
                    placeholder="INV"/>
                  <p style={{ fontSize:11, color:'#6b7fa3',
                    marginTop:4 }}>
                    New invoices will be numbered: {prefsForm.invoiceNumberPrefix || 'INV'}-{new Date().getFullYear()}-0001
                  </p>
                </div>
                <div>
                  <label style={lbl}>
                    Default Payment Terms (days)
                  </label>
                  <input style={inp} type="number" min="0"
                    value={prefsForm.defaultPaymentTerms}
                    onChange={e => updPrefs('defaultPaymentTerms', e.target.value)}/>
                </div>
              </div>
              <div style={{ marginTop:16 }}>
                <label style={lbl}>
                  Default Invoice Notes
                </label>
                <textarea
                  style={{ ...inp, height:80,
                    resize:'vertical' }}
                  value={prefsForm.defaultInvoiceNotes}
                  onChange={e => updPrefs('defaultInvoiceNotes', e.target.value)}/>
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={cardHead}>
              Notification Preferences
            </div>
            <div style={cardBody}>
              <div style={{ marginBottom:16 }}>
                <label style={lbl}>
                  Notification Email
                </label>
                <input style={inp} type="email"
                  value={prefsForm.notificationEmail}
                  onChange={e => updPrefs('notificationEmail', e.target.value)}
                  placeholder={org?.email || 'you@company.com'}/>
                <p style={{ fontSize:11, color:'#6b7fa3', marginTop:4 }}>
                  Where the emails below get sent. Leave blank to use the organisation's
                  own email ({org?.email || 'not set'}).
                </p>
              </div>
              {[
                { key:'notifyInvoiceOverdue',  label:'Email me when an invoice is overdue' },
                { key:'notifyTaxDeadlines',    label:'Email me tax deadline reminders' },
                { key:'notifyLowStock',        label:'Email me low stock alerts' },
                { key:'notifyMonthlySummary',  label:'Monthly financial summary email' },
              ].map((item, i, arr) => (
                <div key={item.key} style={{ display:'flex',
                  justifyContent:'space-between',
                  alignItems:'center', padding:'12px 0',
                  borderBottom: i < arr.length - 1
                    ? '1px solid #f4f6f9' : 'none' }}>
                  <span style={{ fontSize:13,
                    color:'#1a2740' }}>{item.label}</span>
                  <label style={{ position:'relative',
                    display:'inline-block',
                    width:44, height:24, cursor:'pointer' }}>
                    <input type="checkbox"
                      checked={prefsForm[item.key]}
                      onChange={e => updPrefs(item.key, e.target.checked)}
                      style={{ opacity:0, width:0,
                        height:0 }}/>
                    <span style={{ position:'absolute',
                      cursor:'pointer', inset:0,
                      background: prefsForm[item.key]
                        ? '#1e6bbd' : '#e2e8f0',
                      borderRadius:12,
                      transition:'.3s' }}>
                      <span style={{ position:'absolute',
                        content:'""', height:18, width:18,
                        left:3, top:3,
                        background:'white',
                        borderRadius:'50%',
                        transition:'.3s',
                        transform: prefsForm[item.key]
                          ? 'translateX(20px)' : 'none' }}/>
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </>
        )
      )}
      )}

      {/* Account Tab */}
      {tab === 'account' && (
        <>
          <div style={card}>
            <div style={{ ...cardHead, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span>Profile Information</span>
              {profileSaved && (
                <span style={{ fontSize:12, color:'#16c79a', fontWeight:600 }}>✓ Saved</span>
              )}
            </div>
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
                  {(profileForm.firstName || user?.email || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:16 }}>
                    {profileForm.firstName || profileForm.lastName
                      ? `${profileForm.firstName} ${profileForm.lastName}`.trim()
                      : user?.email}
                  </div>
                  <div style={{ fontSize:13, color:'#6b7fa3' }}>
                    {user?.email}
                  </div>
                  <div style={{ fontSize:11,
                    color:'#16c79a', marginTop:4,
                    fontWeight:600 }}>
                    ● {user?.roles?.join(', ') || 'User'}
                  </div>
                </div>
              </div>
              <div style={g2}>
                <div>
                  <label style={lbl}>First Name</label>
                  <input style={inp} value={profileForm.firstName}
                    onChange={e => setProfileForm(p => ({ ...p, firstName: e.target.value }))}/>
                </div>
                <div>
                  <label style={lbl}>Last Name</label>
                  <input style={inp} value={profileForm.lastName}
                    onChange={e => setProfileForm(p => ({ ...p, lastName: e.target.value }))}/>
                </div>
              </div>
              <div style={{ ...g2, marginTop:16 }}>
                <div>
                  <label style={lbl}>Phone</label>
                  <input style={inp} value={profileForm.phone}
                    onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}/>
                </div>
                <div>
                  <label style={lbl}>Email Address</label>
                  <input style={{ ...inp, background:'#f0f2f5', color:'#6b7fa3' }} type="email"
                    value={user?.email || ''} disabled/>
                  <p style={{ fontSize:10, color:'#6b7fa3', marginTop:4 }}>
                    Contact an Admin to change your login email
                  </p>
                </div>
              </div>
              <div style={{ marginTop:16 }}>
                <button onClick={handleSaveProfile} disabled={profileSaving}
                  style={{ padding:'10px 20px',
                    background: profileSaving ? '#6b7fa3' : '#1e6bbd', color:'white',
                    border:'none', borderRadius:8, fontSize:13,
                    fontWeight:600, cursor: profileSaving ? 'not-allowed' : 'pointer' }}>
                  {profileSaving ? 'Saving…' : 'Save Profile'}
                </button>
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={cardHead}>Change Password</div>
            <div style={cardBody}>
              <div style={{ marginBottom:14 }}>
                <label style={lbl}>Current Password</label>
                <input style={inp} type="password"
                  placeholder="Enter current password"
                  value={pwForm.currentPassword}
                  onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}/>
              </div>
              <div style={g2}>
                <div>
                  <label style={lbl}>New Password</label>
                  <input style={inp} type="password"
                    placeholder="Min 8 characters"
                    value={pwForm.newPassword}
                    onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}/>
                </div>
                <div>
                  <label style={lbl}>
                    Confirm New Password
                  </label>
                  <input style={inp} type="password"
                    placeholder="Repeat new password"
                    value={pwForm.confirmPassword}
                    onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))}/>
                </div>
              </div>
              <div style={{ marginTop:16 }}>
                <button onClick={handleChangePassword} disabled={pwSaving}
                  style={{ padding:'10px 20px',
                  background: pwSaving ? '#6b7fa3' : '#1e6bbd', color:'white',
                  border:'none', borderRadius:8, fontSize:13,
                  fontWeight:600, cursor: pwSaving ? 'not-allowed' : 'pointer' }}>
                  {pwSaving ? 'Updating…' : 'Update Password'}
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
