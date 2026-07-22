// ============================================================
//  src/App.js — Complete App with all real pages wired
// ============================================================
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route,
         Navigate, useNavigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// ── Pages — lazy-loaded per route ───────────────────────────────
// Every one of these used to be a static import, so a first-time
// visitor downloaded every module's code (invoices, payroll, tax,
// sustainability, everything) before the dashboard could even render,
// regardless of which pages they'd actually use that session. Only
// LoginPage/RegisterPage/AppLayout stay eager below — they're the app
// shell, needed immediately, and already live in this same file.
const JournalListPage = lazy(() => import('./pages/accounts/JournalListPage'));
const JournalFormPage = lazy(() => import('./pages/accounts/JournalFormPage'));
const JournalDetailPage = lazy(() => import('./pages/accounts/JournalDetailPage'));
const SustainabilityPage = lazy(() => import('./pages/sustainability/SustainabilityPage'));
const UsersPage          = lazy(() => import('./pages/users/UsersPage'));
const DashboardPage    = lazy(() => import('./pages/dashboard/DashboardPage'));
const CustomerListPage = lazy(() => import('./pages/customers/CustomerListPage'));
const CustomerDetailPage = lazy(() => import('./pages/customers/CustomerDetailPage'));
const InvoiceListPage  = lazy(() => import('./pages/invoices/InvoiceListPage'));
const InvoiceFormPage  = lazy(() => import('./pages/invoices/InvoiceFormPage'));
const InvoiceDetailPage = lazy(() => import('./pages/invoices/InvoiceDetailPage'));
const SupplierListPage = lazy(() => import('./pages/suppliers/SupplierListPage'));
const BillListPage     = lazy(() => import('./pages/bills/BillListPage'));
const BillFormPage     = lazy(() => import('./pages/bills/BillFormPage'));
const AccountListPage  = lazy(() => import('./pages/accounts/AccountListPage'));
const ReportsPage      = lazy(() => import('./pages/reports/ReportsPage'));
const AssetListPage    = lazy(() => import('./pages/assets/AssetListPage'));
const AssetFormPage    = lazy(() => import('./pages/assets/AssetFormPage'));
const InventoryPage    = lazy(() => import('./pages/inventory/InventoryPage'));
const ProjectListPage  = lazy(() => import('./pages/projects/ProjectListPage'));
const ProjectDetailPage = lazy(() => import('./pages/projects/ProjectDetailPage'));
const QuotationListPage = lazy(() => import('./pages/sales/QuotationListPage'));
const PurchaseOrderPage = lazy(() => import('./pages/purchasing/PurchaseOrderListPage'));
const TaxDashboardPage = lazy(() => import('./pages/tax/TaxDashboardPage'));
const PayrollPage      = lazy(() => import('./pages/payroll/PayrollPage'));
const AgentPage        = lazy(() => import('./pages/agent/AgentPage'));
const SettingsPage     = lazy(() => import('./pages/settings/SettingsPage'));
const GoLiveWizard     = lazy(() => import('./pages/settings/GoLiveWizard'));
const PeriodClosePage  = lazy(() => import('./pages/settings/PeriodClosePage'));
const PublicInvoicePage = lazy(() => import('./pages/public/PublicInvoicePage'));
const BankReconciliationPage = lazy(() => import('./pages/settings/BankReconciliationPage'));

// Scattered, low-opacity commerce/industry motifs for the login/
// register background — sales, markets, stores, factories, the
// people and goods that move through them. Purely decorative
// (aria-hidden), positioned to stay clear of the centered card so it
// never competes with the actual sign-in form.
const AUTH_BG_MOTIFS = [
  { icon:'🏭', top:'6%',  left:'5%',  size:64, rot:-12, op:.16 },
  { icon:'🏪', top:'16%', left:'85%', size:56, rot:8,   op:.15 },
  { icon:'🛒', top:'70%', left:'8%',  size:52, rot:10,  op:.16 },
  { icon:'📊', top:'82%', left:'80%', size:60, rot:-8,  op:.14 },
  { icon:'🏬', top:'4%',  left:'45%', size:48, rot:6,   op:.12 },
  { icon:'📦', top:'40%', left:'2%',  size:46, rot:-6,  op:.14 },
  { icon:'🤝', top:'55%', left:'90%', size:50, rot:-10, op:.13 },
  { icon:'💰', top:'88%', left:'40%', size:44, rot:14,  op:.13 },
  { icon:'🏭', top:'30%', left:'93%', size:42, rot:16,  op:.12 },
  { icon:'🛍️', top:'92%', left:'62%', size:46, rot:-14, op:.13 },
  { icon:'🏗️', top:'12%', left:'68%', size:44, rot:9,   op:.11 },
  { icon:'📈', top:'62%', left:'50%', size:38, rot:-6,  op:.1  },
];

function AuthBackdrop() {
  return (
    <div aria-hidden="true" style={{ position:'absolute', inset:0, overflow:'hidden', zIndex:0 }}>
      {/* Rich brand gradient, deep navy through blue with a warm
          gold undertone — evokes dusk over a market/industrial skyline
          rather than a flat corporate blue. */}
      <div style={{ position:'absolute', inset:0,
        background:'linear-gradient(150deg,#0a1626 0%,#123256 38%,#1e6bbd 72%,#2d84e0 100%)' }}/>

      {/* Soft blurred glow blobs for depth — gold, green, red, echoing
          the app's own palette without being a literal flag. */}
      <div style={{ position:'absolute', width:520, height:520, borderRadius:'50%',
        background:'#D9A521', opacity:.22, filter:'blur(110px)', top:'-14%', left:'-10%' }}/>
      <div style={{ position:'absolute', width:460, height:460, borderRadius:'50%',
        background:'#046A38', opacity:.22, filter:'blur(120px)', bottom:'-16%', right:'-8%' }}/>
      <div style={{ position:'absolute', width:360, height:360, borderRadius:'50%',
        background:'#C8102E', opacity:.16, filter:'blur(100px)', top:'38%', left:'50%',
        transform:'translateX(-50%)' }}/>

      {/* Fine dot-grid texture for a subtle "at scale" industrial feel */}
      <div style={{ position:'absolute', inset:0, opacity:.25,
        backgroundImage:'radial-gradient(rgba(255,255,255,.35) 1px, transparent 1px)',
        backgroundSize:'26px 26px' }}/>

      {/* Scattered commerce/industry motifs */}
      {AUTH_BG_MOTIFS.map((m, i) => (
        <div key={i} style={{ position:'absolute', top:m.top, left:m.left,
          fontSize:m.size, opacity:m.op, transform:`rotate(${m.rot}deg)`,
          filter:'grayscale(.15)', userSelect:'none', lineHeight:1 }}>
          {m.icon}
        </div>
      ))}

      {/* Gentle vignette so the card always reads clearly regardless
          of what's behind it */}
      <div style={{ position:'absolute', inset:0,
        background:'radial-gradient(ellipse at center, transparent 35%, rgba(6,14,26,.35) 100%)' }}/>
    </div>
  );
}

// ── Login Page ────────────────────────────────────────────────
function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = React.useState({
    email: '', password: '' });
  const [loading, setLoading] = React.useState(false);
  const [error,   setError]   = React.useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form.email, form.password);
      nav('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Check credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', position:'relative', overflow:'hidden',
      display:'flex', alignItems:'center',
      justifyContent:'center', fontFamily:'sans-serif' }}>
      <AuthBackdrop/>
      <div style={{ position:'relative', zIndex:1, background:'white', borderRadius:14,
        padding:40, width:400,
        boxShadow:'0 24px 60px rgba(6,14,26,.35)' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:52, height:52, borderRadius:14,
            background:'linear-gradient(135deg,#2d84e0,#3d9fff)',
            display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:22,
            fontWeight:800, color:'white',
            margin:'0 auto 14px' }}>F</div>
          <h2 style={{ fontSize:22, fontWeight:800,
            color:'#1a2740', marginBottom:4 }}>
            FinSuite Pro
          </h2>
          <p style={{ fontSize:12, color:'#6b7fa3' }}>
            Sign in to your account
          </p>
        </div>
        {error && (
          <div style={{ background:'#fff5f5',
            border:'1px solid #fca5a5', borderRadius:8,
            padding:'10px 14px', marginBottom:16,
            fontSize:12, color:'#c04040' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:11,
              fontWeight:600, color:'#1a2740',
              marginBottom:7 }}>Email Address</label>
            <input type="email" value={form.email}
              required autoComplete="email"
              onChange={e =>
                setForm({ ...form, email:e.target.value })}
              style={{ width:'100%', padding:'11px 14px',
                border:'1.5px solid #e2e8f0',
                borderRadius:9, fontSize:13,
                outline:'none', fontFamily:'sans-serif',
                boxSizing:'border-box' }}/>
          </div>
          <div style={{ marginBottom:24 }}>
            <label style={{ display:'block', fontSize:11,
              fontWeight:600, color:'#1a2740',
              marginBottom:7 }}>Password</label>
            <input type="password" value={form.password}
              required autoComplete="current-password"
              onChange={e =>
                setForm({ ...form, password:e.target.value })}
              style={{ width:'100%', padding:'11px 14px',
                border:'1.5px solid #e2e8f0',
                borderRadius:9, fontSize:13,
                outline:'none', fontFamily:'sans-serif',
                boxSizing:'border-box' }}/>
          </div>
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:13,
              background: loading
                ? '#6b7fa3' : '#1e6bbd',
              color:'white', border:'none',
              borderRadius:9, fontSize:14,
              fontWeight:700, cursor:'pointer',
              fontFamily:'sans-serif',
              transition:'background .2s' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p style={{ textAlign:'center', marginTop:20,
          fontSize:12, color:'#6b7fa3' }}>
          No account?{' '}
          <span onClick={() => nav('/register')}
            style={{ color:'#1e6bbd', fontWeight:600,
              cursor:'pointer' }}>
            Register here
          </span>
        </p>
      </div>
      <p style={{ position:'fixed', bottom:16, left:0, right:0,
        zIndex:1, textAlign:'center', margin:0,
        fontSize:11, color:'rgba(255,255,255,.55)' }}>
        © {new Date().getFullYear()} FinSuite Pro. All rights reserved.
      </p>
    </div>
  );
}

// ── Register Page ─────────────────────────────────────────────
// A fiscal year is a 12-month period — end is always exactly one
// year minus a day after start. Ghanaian SMEs almost universally
// use a calendar-year fiscal year, so only fiscalYearStart is a
// user-facing field; the end date is derived, never independently
// editable (there was previously no way to edit it at all, and its
// hardcoded default silently went stale every year — a new org
// registered in 2026 got a fiscal year already two years in the
// past, or — if a user only changed the start date — an end date
// before the start date, since nothing kept them in sync).
const oneYearMinusOneDay = (startDateStr) => {
  const d = new Date(startDateStr);
  d.setFullYear(d.getFullYear() + 1);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [error,   setError]   = React.useState('');
  const defaultFiscalYearStart = `${new Date().getFullYear()}-01-01`;
  const [form, setForm] = React.useState({
    orgName:'', fiscalYearStart: defaultFiscalYearStart,
    fiscalYearEnd: oneYearMinusOneDay(defaultFiscalYearStart), baseCurrency:'GHS',
    firstName:'', lastName:'', email:'', password:'',
  });

  const upd = (f, v) => setForm(p => f === 'fiscalYearStart'
    ? { ...p, fiscalYearStart: v, fiscalYearEnd: oneYearMinusOneDay(v) }
    : { ...p, [f]: v });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8)
      return setError('Password must be at least 8 characters');
    setLoading(true);
    setError('');
    try {
      await register(form);
      nav('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const inp = { width:'100%', padding:'10px 12px',
    border:'1.5px solid #e2e8f0', borderRadius:8,
    fontSize:13, outline:'none', fontFamily:'sans-serif',
    background:'#f9fafb', boxSizing:'border-box' };
  const lbl = { display:'block', fontSize:11,
    fontWeight:600, color:'#1a2740', marginBottom:6 };

  return (
    <div style={{ minHeight:'100vh', position:'relative', overflow:'hidden',
      display:'flex', alignItems:'center',
      justifyContent:'center', fontFamily:'sans-serif',
      padding:20 }}>
      <AuthBackdrop/>
      <div style={{ position:'relative', zIndex:1, background:'white', borderRadius:14,
        padding:40, width:'100%', maxWidth:480,
        boxShadow:'0 24px 60px rgba(6,14,26,.35)' }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ width:44, height:44, borderRadius:11,
            background:'linear-gradient(135deg,#2d84e0,#3d9fff)',
            display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:18,
            fontWeight:800, color:'white',
            margin:'0 auto 10px' }}>F</div>
          <h2 style={{ fontSize:18, fontWeight:700,
            color:'#1a2740' }}>Create Account</h2>
        </div>
        {error && (
          <div style={{ background:'#fff5f5',
            border:'1px solid #fca5a5', borderRadius:8,
            padding:'10px 14px', marginBottom:16,
            fontSize:12, color:'#c04040' }}>{error}</div>
        )}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Organisation Name *</label>
            <input style={inp} required
              placeholder="e.g. Asante Group Ltd"
              value={form.orgName}
              onChange={e=>upd('orgName',e.target.value)}/>
          </div>
          <div style={{ display:'grid',
            gridTemplateColumns:'1fr 1fr',
            gap:12, marginBottom:14 }}>
            <div>
              <label style={lbl}>First Name *</label>
              <input style={inp} required
                value={form.firstName}
                onChange={e=>upd('firstName',e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>Last Name</label>
              <input style={inp} value={form.lastName}
                onChange={e=>upd('lastName',e.target.value)}/>
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Email *</label>
            <input style={inp} type="email" required
              value={form.email}
              onChange={e=>upd('email',e.target.value)}/>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Password * (min 8 chars)</label>
            <input style={inp} type="password"
              required minLength={8}
              value={form.password}
              onChange={e=>upd('password',e.target.value)}/>
          </div>
          <div style={{ display:'grid',
            gridTemplateColumns:'1fr 1fr',
            gap:12, marginBottom:14 }}>
            <div>
              <label style={lbl}>Base Currency</label>
              <select style={{ ...inp, background:'#f9fafb' }}
                value={form.baseCurrency}
                onChange={e=>upd('baseCurrency',e.target.value)}>
                {['GHS','USD','EUR','GBP','NGN',
                  'KES','ZAR'].map(c=>(
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Fiscal Year Start</label>
              <input style={inp} type="date"
                value={form.fiscalYearStart}
                onChange={e=>upd('fiscalYearStart',
                  e.target.value)}/>
            </div>
          </div>
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:12,
              background: loading ? '#6b7fa3' : '#1e6bbd',
              color:'white', border:'none', borderRadius:8,
              fontSize:14, fontWeight:700, cursor:'pointer',
              fontFamily:'sans-serif', marginTop:8 }}>
            {loading?'Creating...':'Create Account'}
          </button>
        </form>
        <p style={{ textAlign:'center', marginTop:16,
          fontSize:12, color:'#6b7fa3' }}>
          Already have an account?{' '}
          <span onClick={() => nav('/login')}
            style={{ color:'#1e6bbd', fontWeight:600,
              cursor:'pointer' }}>Sign in</span>
        </p>
      </div>
      <p style={{ position:'fixed', bottom:16, left:0, right:0,
        zIndex:1, textAlign:'center', margin:0,
        fontSize:11, color:'rgba(255,255,255,.55)' }}>
        © {new Date().getFullYear()} FinSuite Pro. All rights reserved.
      </p>
    </div>
  );
}

// Same convention as InventoryPage.js's ProductImage — static
// /uploads files are served from the API root, not the /api/v1 base.
const API_URL  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
const API_BASE = API_URL.replace(/\/api\/v\d+\/?$/, '');

// Small hex-color helpers for tenant branding (sidebar accent) — no
// need for a color library for two simple transforms: a translucent
// tint for backgrounds, and a lightened variant to fake a gradient
// partner for the brand color the same way the original hardcoded
// #2d84e0->#3d9fff gradient did.
const hexToRgba = (hex, alpha) => {
  const m = (hex || '').replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return `rgba(30,107,189,${alpha})`;
  const [, r, g, b] = m;
  return `rgba(${parseInt(r,16)},${parseInt(g,16)},${parseInt(b,16)},${alpha})`;
};
const lightenHex = (hex, amount) => {
  const m = (hex || '').replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return hex;
  const [, r, g, b] = m;
  const clamp = (n) => Math.max(0, Math.min(255, n));
  return '#' + [r, g, b]
    .map(x => clamp(parseInt(x, 16) + amount).toString(16).padStart(2, '0'))
    .join('');
};

// ── App Layout ────────────────────────────────────────────────
function AppLayout() {
  const { user, logout, hasRole, hasModule } = useAuth();
  const nav = useNavigate();
  const loc = window.location.pathname;

  // Falls back to the original hardcoded blue when an org hasn't set
  // a brand color yet, so every existing tenant looks exactly the
  // same as before this feature existed.
  const brandColor = /^#[0-9a-f]{6}$/i.test(user?.brandColor || '') ? user.brandColor : '#1e6bbd';
  const brandColorLight = lightenHex(brandColor, 40);

  // Persisted so the sidebar stays collapsed/expanded across page
  // reloads and navigation, not just within one render.
  const [collapsed, setCollapsed] = React.useState(
    () => localStorage.getItem('sidebar_collapsed') === 'true'
  );
  const toggleCollapsed = () => {
    setCollapsed(prev => {
      localStorage.setItem('sidebar_collapsed', String(!prev));
      return !prev;
    });
  };

  // module: checked against the admin-editable permission set (see
  // role.routes.js) — an Admin can grant or revoke any of these per
  // role from Users > Role Permissions, and this list reflects that
  // in real time on next login. roles: a hardcoded, non-customizable
  // boundary (Users) — see the comment on RoleRoute for why.
  const ALL_NAV = [
    { path:'/dashboard',      label:'Dashboard',         icon:'📊', module:'dashboard' },
    { path:'/invoices',       label:'Invoices',          icon:'🧾', module:'invoices' },
    { path:'/customers',      label:'Customers',         icon:'👥', module:'customers' },
    { path:'/bills',          label:'Bills',             icon:'📄', module:'bills' },
    { path:'/suppliers',      label:'Suppliers',         icon:'🏭', module:'suppliers' },
    { path:'/accounts',       label:'Chart of Accounts', icon:'📒', module:'accounts' },
    { path:'/journals',       label:'Journals',          icon:'📔', module:'journals' },
    { path:'/assets',         label:'Fixed Assets',      icon:'🏗️', module:'assets' },
    { path:'/inventory',      label:'Inventory',         icon:'📦', module:'inventory' },
    { path:'/projects',       label:'Projects',          icon:'📁', module:'projects' },
    { path:'/tax',            label:'Tax',               icon:'🧮', module:'tax' },
    { path:'/payroll',        label:'Payroll',           icon:'👔', module:'payroll' },
    { path:'/agent',          label:'Agent',             icon:'🤖', module:'agent' },
    { path:'/reports',        label:'Reports',           icon:'📈', module:'reports' },
    { path:'/sustainability', label:'Sustainability',    icon:'🌱', module:'sustainability' },
    { path:'/banks',          label:'Banks',             icon:'🏦', module:'banks' },
    { path:'/users',          label:'Users',             icon:'👤', roles:['Admin'] },
    { path:'/settings',       label:'Settings',          icon:'⚙️', roles:['Admin'] },
  ];
  // No more hardcoded Cashier exclusion here — Cashier defaults to
  // zero granted modules (see permissions.js's ROLE_DEFAULT_MODULES),
  // which already produces an empty nav for it without special-casing
  // the role by name. That default is exactly what an Admin can now
  // change from Role Permissions (e.g. granting Cashier access to
  // Customers/Invoices for a worker who also raises wholesale
  // invoices) — a hardcoded exclusion here would silently override
  // that choice and hide items the Admin explicitly turned on.
  const NAV = ALL_NAV.filter(item => {
    if (item.module) return hasModule(item.module);
    if (item.roles) return item.roles.some(r => hasRole(r));
    return true;
  });

  const initials = user
    ? `${(user.firstName||user.first_name||'U')[0].toUpperCase()}${(user.lastName||user.last_name||'')[0]?.toUpperCase()||''}`
    : 'U';

  const currentPage = NAV.find(n =>
    loc === n.path ||
    (n.path !== '/dashboard' && loc.startsWith(n.path))
  );

  return (
    <div style={{ display:'flex', height:'100vh',
      fontFamily:'sans-serif', overflow:'hidden' }}>

      {/* Sidebar */}
      <div style={{ width: collapsed ? 68 : 222, background:'#0d1b2a',
        display:'flex', flexDirection:'column',
        flexShrink:0, overflowY:'auto', overflowX:'hidden',
        position:'relative',
        transition:'width .18s ease' }}>

        {/* Collapse/expand toggle */}
        <button onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{ position:'absolute', top:18, right:-12,
            width:24, height:24, borderRadius:'50%',
            border:'1px solid rgba(255,255,255,.15)',
            background:'#1a2f4a', color:'rgba(255,255,255,.7)',
            fontSize:12, cursor:'pointer', zIndex:10,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 2px 6px rgba(0,0,0,.3)' }}>
          {collapsed ? '›' : '‹'}
        </button>

        {/* Brand */}
        <div style={{ padding: collapsed ? '20px 0' : '20px 16px',
          borderBottom:'1px solid rgba(255,255,255,.08)',
          flexShrink:0 }}>
          <div style={{ display:'flex',
            alignItems:'center', gap:10,
            justifyContent: collapsed ? 'center' : 'flex-start' }}>
            {user?.logoUrl ? (
              <img src={`${API_BASE}${user.logoUrl}?token=${localStorage.getItem('accessToken')}`}
                alt="" onError={e => { e.target.style.display = 'none'; }}
                style={{ width:36, height:36, borderRadius:10,
                  objectFit:'cover', flexShrink:0, background:'white' }}/>
            ) : (
              <div style={{ width:36, height:36,
                borderRadius:10,
                background:`linear-gradient(135deg,${brandColor},${brandColorLight})`,
                display:'flex', alignItems:'center',
                justifyContent:'center', fontSize:16,
                fontWeight:800, color:'white',
                flexShrink:0 }}>F</div>
            )}
            {!collapsed && (
              <div>
                <div style={{ fontSize:13, fontWeight:700,
                  color:'white', whiteSpace:'nowrap' }}>FinSuite Pro</div>
                <div style={{ fontSize:10,
                  color:'rgba(255,255,255,.4)', whiteSpace:'nowrap' }}>
                  Accounting
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <div style={{ flex:1, padding:'8px 0',
          overflowY:'auto' }}>
          {NAV.map(item => {
            const active = loc === item.path ||
              (item.path !== '/dashboard' &&
               loc.startsWith(item.path));
            return (
              <div key={item.path}
                onClick={() => nav(item.path)}
                title={collapsed ? item.label : undefined}
                style={{ display:'flex', alignItems:'center',
                  gap:10, padding: collapsed ? '9px 0' : '9px 16px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  cursor:'pointer', fontSize:13,
                  transition:'all .15s',
                  color: active
                    ? 'white'
                    : 'rgba(255,255,255,.55)',
                  background: active
                    ? hexToRgba(brandColor, .2)
                    : 'transparent',
                  borderRight: active
                    ? `3px solid ${brandColorLight}`
                    : '3px solid transparent',
                  fontWeight: active ? 600 : 400 }}>
                <span style={{ fontSize:15 }}>
                  {item.icon}
                </span>
                {!collapsed && <span style={{ whiteSpace:'nowrap' }}>{item.label}</span>}
              </div>
            );
          })}
        </div>

        {/* User */}
        <div style={{ padding:12,
          borderTop:'1px solid rgba(255,255,255,.08)',
          flexShrink:0 }}>
          <div
            onClick={() => { logout(); nav('/login'); }}
            title={collapsed ? 'Click to sign out' : undefined}
            style={{ display:'flex', alignItems:'center',
              gap:10, padding:'8px', borderRadius:8,
              cursor:'pointer',
              justifyContent: collapsed ? 'center' : 'flex-start',
              transition:'background .15s' }}>
            <div style={{ width:32, height:32,
              borderRadius:8, flexShrink:0,
              background:'linear-gradient(135deg,#e8a04a,#f0bc78)',
              display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:12,
              fontWeight:700, color:'#0d1b2a' }}>
              {initials}
            </div>
            {!collapsed && (
              <div style={{ flex:1, overflow:'hidden' }}>
                <div style={{ fontSize:12, fontWeight:600,
                  color:'white', overflow:'hidden',
                  textOverflow:'ellipsis',
                  whiteSpace:'nowrap' }}>
                  {user
                    ? `${user.firstName||user.first_name||''} ${user.lastName||user.last_name||''}`
                    : 'User'}
                </div>
                <div style={{ fontSize:10,
                  color:'rgba(255,255,255,.4)' }}>
                  Click to sign out
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div style={{ flex:1, display:'flex',
        flexDirection:'column', overflow:'hidden' }}>

        {/* Top bar */}
        <div style={{ height:54, background:'white',
          borderBottom:'1px solid #e2e8f0',
          display:'flex', alignItems:'center',
          padding:'0 24px', flexShrink:0,
          justifyContent:'space-between' }}>
          <div style={{ fontSize:16, fontWeight:700,
            color:'#1a2740' }}>
            {currentPage?.label || 'FinSuite Pro'}
          </div>
          <div style={{ fontSize:12, color:'#6b7fa3' }}>
            {new Date().toLocaleDateString('en-GB', {
              weekday:'long', day:'2-digit',
              month:'long', year:'numeric' })}
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex:1, overflowY:'auto',
          padding:24, background:'#f4f6f9' }}>
          <Suspense fallback={<PageLoading/>}>
            <Outlet/>
          </Suspense>
        </div>

        {/* Footer */}
        <div style={{ height:32, flexShrink:0, background:'white',
          borderTop:'1px solid #e2e8f0', display:'flex',
          alignItems:'center', justifyContent:'center',
          fontSize:11, color:'#6b7fa3' }}>
          © {new Date().getFullYear()} FinSuite Pro. All rights reserved.
        </div>
      </div>
    </div>
  );
}

// ── Loading states ───────────────────────────────────────────
// Full-viewport spinner — auth-state resolution (ProtectedRoute/
// RoleRoute) and the outer route-level Suspense (top-level lazy
// routes like PublicInvoicePage, before AppLayout has even mounted)
// both need the whole screen, not just a content pane.
function FullPageLoading() {
  return (
    <div style={{ display:'flex', alignItems:'center',
      justifyContent:'center', height:'100vh',
      fontFamily:'sans-serif', color:'#6b7fa3',
      flexDirection:'column', gap:16 }}>
      <div style={{ width:32, height:32,
        border:'3px solid #e2e8f0',
        borderTopColor:'#1e6bbd', borderRadius:'50%',
        animation:'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ fontSize:13 }}>Loading...</p>
    </div>
  );
}

// Same spinner, sized for AppLayout's content pane rather than the
// whole viewport — used for in-app navigation between lazy routes, so
// the sidebar/header stay mounted and only the content area shows a
// loading state (see AppLayout's <Outlet/> below).
function PageLoading() {
  return (
    <div style={{ display:'flex', alignItems:'center',
      justifyContent:'center', height:'100%', minHeight:300,
      fontFamily:'sans-serif', color:'#6b7fa3' }}>
      <div style={{ width:28, height:28,
        border:'3px solid #e2e8f0',
        borderTopColor:'#1e6bbd', borderRadius:'50%',
        animation:'spin .7s linear infinite' }}/>
      {/* Duplicated from FullPageLoading rather than shared — this
          <style> tag is removed from the DOM whenever its owning
          component unmounts, and these two loading states don't
          reliably mount/unmount in a fixed order relative to each
          other, so each needs its own copy to guarantee the keyframe
          exists whichever one shows first. */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Route Guards ──────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <FullPageLoading/>;
  return isAuthenticated
    ? children
    : <Navigate to="/login" replace/>;
}

// Guards a route to a specific set of roles — direct URL navigation
// to a restricted page (e.g. /users, /payroll) previously worked for
// any authenticated user regardless of role, since ProtectedRoute
// only checked isAuthenticated. Redirects a disallowed role back to
// the dashboard rather than rendering the page and letting its API
// calls fail one by one with 403s. hasRole() already treats Admin as
// implicitly satisfying any role check, so `roles` doesn't need to
// list 'Admin' explicitly — it's included below anyway for the same
// readability reason the backend's authorize(...) calls do.
// Two ways to gate a route:
//  - `module="accounts"` — checked against the admin-editable
//    permission set (accounting-api's role.routes.js lets an Admin
//    change which modules a role can see; this is most routes).
//  - `roles={['Admin']}` — a hardcoded, non-customizable boundary
//    (Users, Go-Live, Period Close). These deliberately stay
//    role-name checks, not modules — letting "who can manage users"
//    itself be reassignable would recreate the self-promotion hole
//    the RBAC work started by closing.
// Ordered module -> route map, shared between RoleRoute's fallback
// and AppLayout's nav — a Cashier granted only Customers/Invoices
// (no Dashboard) still needs somewhere to land when redirected away
// from a module they don't have, so the fallback below picks the
// first one this specific user actually has, not just 'dashboard'.
const MODULE_ROUTES = [
  ['dashboard', '/dashboard'], ['invoices', '/invoices'], ['customers', '/customers'],
  ['bills', '/bills'], ['suppliers', '/suppliers'], ['inventory', '/inventory'],
  ['quotations', '/quotations'], ['purchase_orders', '/purchase-orders'],
  ['accounts', '/accounts'], ['journals', '/journals'], ['assets', '/assets'],
  ['tax', '/tax'], ['payroll', '/payroll'], ['banks', '/banks'],
  ['projects', '/projects'], ['reports', '/reports'],
  ['sustainability', '/sustainability'], ['agent', '/agent'],
];

function RoleRoute({ module, roles, children }) {
  const { isAuthenticated, loading, hasRole, hasModule } = useAuth();
  if (loading) return <FullPageLoading/>;
  if (!isAuthenticated) return <Navigate to="/login" replace/>;
  const allowed = module ? hasModule(module) : roles.some(r => hasRole(r));
  if (allowed) return children;

  // Redirecting straight to /dashboard broke for anyone without
  // Dashboard access (Cashier defaults to zero grants, but an Admin
  // might grant just Customers/Invoices to one without Dashboard) —
  // /dashboard is itself a RoleRoute, so landing there while denied
  // bounced right back, rendering as a blank page. Find the first
  // module this specific user actually has instead of assuming
  // Dashboard is always it.
  const fallback = MODULE_ROUTES.find(([m]) => hasModule(m));
  if (fallback) return <Navigate to={fallback[1]} replace/>;
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', fontFamily:'sans-serif', textAlign:'center', padding:20 }}>
      <div>
        <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
        <h2 style={{ fontSize:18, fontWeight:700, color:'#1a2740', marginBottom:6 }}>
          No access to this app
        </h2>
        <p style={{ color:'#6b7fa3', fontSize:13, maxWidth:340 }}>
          Your account doesn't have access to any part of this dashboard.
          If you're a cashier, sign in on the POS terminal app instead
          using the same email and password.
        </p>
      </div>
    </div>
  );
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated
    ? <Navigate to="/dashboard" replace/>
    : children;
}

// ── Root ──────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style:{ fontFamily:'sans-serif',
            fontSize:13, borderRadius:8 },
        }}/>
        {/* Covers lazy top-level routes (just PublicInvoicePage —
            LoginPage/RegisterPage/AppLayout are eager, so this rarely
            triggers). In-app navigation is covered separately by the
            Suspense around AppLayout's <Outlet/> above, so the
            sidebar/header don't disappear on every route change. */}
        <Suspense fallback={<FullPageLoading/>}>
        <Routes>
          {/* Public */}
          <Route path="/login"
            element={<PublicRoute><LoginPage/></PublicRoute>}/>
          <Route path="/register"
            element={<PublicRoute><RegisterPage/></PublicRoute>}/>
          {/* Truly public — no login gate either way, this is what a
              customer with no staff account opens */}
          <Route path="/pay/:token" element={<PublicInvoicePage/>}/>

          {/* Protected */}
          <Route path="/"
            element={
              <ProtectedRoute><AppLayout/></ProtectedRoute>}>
            <Route index
              element={<Navigate to="/dashboard" replace/>}/>
            <Route path="dashboard"
              element={<RoleRoute module="dashboard"><DashboardPage/></RoleRoute>}/>
            <Route path="invoices"
              element={<RoleRoute module="invoices"><InvoiceListPage/></RoleRoute>}/>
            <Route path="invoices/new"
              element={<RoleRoute module="invoices"><InvoiceFormPage/></RoleRoute>}/>
            <Route path="invoices/:id"
              element={<RoleRoute module="invoices"><InvoiceDetailPage/></RoleRoute>}/>
            <Route path="invoices/:id/edit"
              element={<RoleRoute module="invoices"><InvoiceFormPage/></RoleRoute>}/>
            <Route path="quotations"
              element={<RoleRoute module="quotations"><QuotationListPage/></RoleRoute>}/>
            <Route path="customers"
              element={<RoleRoute module="customers"><CustomerListPage/></RoleRoute>}/>
            <Route path="customers/:id"
              element={<RoleRoute module="customers"><CustomerDetailPage/></RoleRoute>}/>
            <Route path="bills"
              element={<RoleRoute module="bills"><BillListPage/></RoleRoute>}/>
            <Route path="bills/new"
              element={<RoleRoute module="bills"><BillFormPage/></RoleRoute>}/>
            <Route path="suppliers"
              element={<RoleRoute module="suppliers"><SupplierListPage/></RoleRoute>}/>
            <Route path="purchase-orders"
              element={<RoleRoute module="purchase_orders"><PurchaseOrderPage/></RoleRoute>}/>
            <Route path="accounts"
              element={<RoleRoute module="accounts"><AccountListPage/></RoleRoute>}/>
            <Route path="journals"
              element={<RoleRoute module="journals"><JournalListPage/></RoleRoute>}/>
            <Route path="journals/new"
              element={<RoleRoute module="journals"><JournalFormPage/></RoleRoute>}/>
            <Route path="journals/:id"
              element={<RoleRoute module="journals"><JournalDetailPage/></RoleRoute>}/>
            <Route path="assets"
              element={<RoleRoute module="assets"><AssetListPage/></RoleRoute>}/>
            <Route path="assets/new"
              element={<RoleRoute module="assets"><AssetFormPage/></RoleRoute>}/>
            <Route path="assets/:id/edit"
              element={<RoleRoute module="assets"><AssetFormPage/></RoleRoute>}/>
            <Route path="inventory"
              element={<RoleRoute module="inventory"><InventoryPage/></RoleRoute>}/>
            <Route path="projects"
              element={<RoleRoute module="projects"><ProjectListPage/></RoleRoute>}/>
            <Route path="projects/:id"
              element={<RoleRoute module="projects"><ProjectDetailPage/></RoleRoute>}/>
            <Route path="tax"
              element={<RoleRoute module="tax"><TaxDashboardPage/></RoleRoute>}/>
            <Route path="payroll"
              element={<RoleRoute module="payroll"><PayrollPage/></RoleRoute>}/>
            <Route path="agent"
              element={<RoleRoute module="agent"><AgentPage/></RoleRoute>}/>
            <Route path="reports"
              element={<RoleRoute module="reports"><ReportsPage/></RoleRoute>}/>
            <Route path="sustainability"
              element={<RoleRoute module="sustainability"><SustainabilityPage/></RoleRoute>}/>
            <Route path="banks"
              element={<RoleRoute module="banks"><BankReconciliationPage/></RoleRoute>}/>
            <Route path="users"
              element={<RoleRoute roles={['Admin']}><UsersPage/></RoleRoute>}/>
            <Route path="settings"
              element={<RoleRoute roles={['Admin']}><SettingsPage/></RoleRoute>}/>
            <Route path="settings/go-live"
              element={<RoleRoute roles={['Admin']}><GoLiveWizard/></RoleRoute>}/>
            <Route path="settings/period-close"
              element={<RoleRoute roles={['Admin','Accountant']}><PeriodClosePage/></RoleRoute>}/>
            <Route path="*"
              element={<Navigate to="/dashboard" replace/>}/>
          </Route>
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
