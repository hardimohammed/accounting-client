import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../../api/client';

const fmt = (n) => new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2, maximumFractionDigits: 2
}).format(n || 0);

const fmtCur = (n) => `GH₵ ${fmt(n)}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#0d1b2a', color:'white', padding:'10px 14px',
      borderRadius:8, fontSize:12, fontFamily:'monospace' }}>
      <div style={{ marginBottom:6, color:'rgba(255,255,255,.5)', fontSize:11 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color:p.color, display:'flex',
          justifyContent:'space-between', gap:16 }}>
          <span>{p.name}</span>
          <span>GH₵ {new Intl.NumberFormat().format(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [kpis,     setKpis]      = useState(null);
  const [sales,    setSales]     = useState([]);
  const [revExp,   setRevExp]    = useState({ revenue:[], expenses:[] });
  const [topCust,  setTopCust]   = useState([]);
  const [loading,  setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/kpis'),
      api.get('/dashboard/sales-trend'),
      api.get('/dashboard/revenue-expenses'),
      api.get('/dashboard/top-customers'),
    ]).then(([k, s, re, tc]) => {
      setKpis(k.data);
      setSales(s.data || []);
      setRevExp(re.data || { revenue:[], expenses:[] });
      setTopCust(tc.data || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center',
      height:'60vh', fontFamily:'sans-serif', color:'#6b7fa3',
      flexDirection:'column', gap:12 }}>
      <div style={{ width:32, height:32, border:'3px solid #e2e8f0',
        borderTopColor:'#1e6bbd', borderRadius:'50%',
        animation:'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{ fontSize:13 }}>Loading dashboard...</span>
    </div>
  );

  const d = kpis || {};

  const KPI_CARDS = [
    {
      label: 'Total Sales (30 Days)',
      value: fmtCur(d.sales30Days?.totalSales),
      sub:   `${d.sales30Days?.totalInvoices || 0} invoices`,
      color: '#C8102E',
      icon:  '📈',
    },
    {
      label: 'Cash Balance',
      value: fmtCur(d.cashBalance),
      sub:   'All bank accounts',
      color: '#D9A521',
      icon:  '💰',
    },
    {
      label: 'Outstanding Receivables',
      value: fmtCur(d.sales30Days?.outstanding),
      sub:   `Collection rate: ${d.sales30Days?.collectionRate || 0}%`,
      color: '#046A38',
      icon:  '⏳',
    },
    {
      label: 'Overdue Invoices',
      value: fmtCur(d.overdueInvoices?.amount),
      sub:   `${d.overdueInvoices?.count || 0} invoices past due`,
      color: '#1A1A2E',
      icon:  '⚠️',
    },
  ];

  const monthlyData = (revExp.revenue || []).map(r => {
    const exp = (revExp.expenses || []).find(e => e.month === r.month);
    return {
      month:    r.month ? r.month.slice(5) : '',
      revenue:  parseFloat(r.total  || 0),
      expenses: parseFloat(exp?.total || 0),
    };
  });

  return (
    <div style={{ fontFamily:'sans-serif' }}>

      {/* ── KPI Cards ────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)',
        gap:16, marginBottom:24 }}>
        {KPI_CARDS.map((k, i) => (
          <div key={i} style={{ background:k.color, borderRadius:12, padding:20,
            boxShadow:'0 2px 8px rgba(13,27,42,.12)' }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'rgba(255,255,255,.2)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:18, marginBottom:12 }}>
              {k.icon}
            </div>
            <div style={{ fontSize:24, fontWeight:700, fontFamily:'monospace',
              color:'white', marginBottom:4, letterSpacing:-1 }}>
              {k.value}
            </div>
            <div style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,.9)', marginBottom:4 }}>
              {k.label}
            </div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.7)' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ───────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr',
        gap:16, marginBottom:24 }}>

        {/* Sales Trend Chart */}
        <div style={{ background:'white', borderRadius:12, border:'1px solid #e2e8f0',
          boxShadow:'0 2px 8px rgba(13,27,42,.05)', overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0' }}>
            <div style={{ fontWeight:700, fontSize:14 }}>Sales Performance</div>
            <div style={{ fontSize:11, color:'#6b7fa3', marginTop:2 }}>
              Invoiced vs collected — last 30 days
            </div>
          </div>
          <div style={{ padding:16 }}>
            {sales.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 0',
                color:'#6b7fa3', fontSize:13 }}>
                No invoice data yet.{' '}
                <span style={{ color:'#1e6bbd', cursor:'pointer', fontWeight:600 }}
                  onClick={() => navigate('/invoices/new')}>
                  Create your first invoice →
                </span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={sales}
                  margin={{ top:5, right:5, bottom:0, left:10 }}>
                  <defs>
                    <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#2d84e0" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#2d84e0" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#16c79a" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#16c79a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3"
                    stroke="#e2e8f0" vertical={false}/>
                  <XAxis dataKey="date"
                    tick={{ fontSize:11, fill:'#6b7fa3' }}
                    axisLine={false} tickLine={false}/>
                  <YAxis
                    tick={{ fontSize:10, fill:'#6b7fa3' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => `GH₵${(v/1000).toFixed(0)}k`}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Legend wrapperStyle={{ fontSize:11 }}/>
                  <Area type="monotone" dataKey="total_sales"
                    name="Total Sales" stroke="#2d84e0"
                    strokeWidth={2} fill="url(#gS)"/>
                  <Area type="monotone" dataKey="amount_paid"
                    name="Amount Paid" stroke="#16c79a"
                    strokeWidth={2} fill="url(#gP)"/>
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Customers */}
        <div style={{ background:'white', borderRadius:12, border:'1px solid #e2e8f0',
          boxShadow:'0 2px 8px rgba(13,27,42,.05)', overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0' }}>
            <div style={{ fontWeight:700, fontSize:14 }}>Top Customers</div>
            <div style={{ fontSize:11, color:'#6b7fa3', marginTop:2 }}>By revenue</div>
          </div>
          <div style={{ padding:'12px 20px' }}>
            {topCust.length === 0 ? (
              <div style={{ textAlign:'center', padding:'30px 0',
                color:'#6b7fa3', fontSize:13 }}>
                No customers yet.{' '}
                <span style={{ color:'#1e6bbd', cursor:'pointer', fontWeight:600 }}
                  onClick={() => navigate('/customers')}>
                  Add customers →
                </span>
              </div>
            ) : topCust.map((c, i) => {
              const maxRev = topCust[0]?.total_revenue || 1;
              const pct    = Math.round((c.total_revenue / maxRev) * 100);
              return (
                <div key={i} onClick={() => c.id && navigate(`/customers/${c.id}`)}
                  style={{ display:'flex', alignItems:'center', gap:12,
                  padding:'8px 0', cursor: c.id ? 'pointer' : 'default',
                  borderBottom: i < topCust.length - 1
                    ? '1px solid #f4f6f9' : 'none' }}>
                  <div style={{ width:28, height:28, borderRadius:7,
                    background:`hsl(${200 + i * 20},60%,48%)`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:11, fontWeight:700, color:'white', flexShrink:0 }}>
                    {(c.name || '?')[0]}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, marginBottom:4,
                      overflow:'hidden', textOverflow:'ellipsis',
                      whiteSpace:'nowrap' }}>
                      {c.name}
                    </div>
                    <div style={{ background:'#e2e8f0', borderRadius:3,
                      height:5, overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%',
                        background:`hsl(${200 + i * 20},60%,48%)`,
                        borderRadius:3 }}/>
                    </div>
                  </div>
                  <div style={{ fontFamily:'monospace', fontSize:12,
                    fontWeight:700, flexShrink:0 }}>
                    {fmtCur(c.total_revenue)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Revenue vs Expenses Bar Chart ────────────────── */}
      {monthlyData.length > 0 && (
        <div style={{ background:'white', borderRadius:12,
          border:'1px solid #e2e8f0',
          boxShadow:'0 2px 8px rgba(13,27,42,.05)',
          overflow:'hidden', marginBottom:24 }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0' }}>
            <div style={{ fontWeight:700, fontSize:14 }}>Revenue vs Expenses</div>
            <div style={{ fontSize:11, color:'#6b7fa3', marginTop:2 }}>
              Monthly comparison
            </div>
          </div>
          <div style={{ padding:16 }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} barSize={16} barGap={4}
                margin={{ top:5, right:20, bottom:0, left:10 }}>
                <CartesianGrid strokeDasharray="3 3"
                  stroke="#e2e8f0" vertical={false}/>
                <XAxis dataKey="month"
                  tick={{ fontSize:11, fill:'#6b7fa3' }}
                  axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:10, fill:'#6b7fa3' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `GH₵${(v/1000).toFixed(0)}k`}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Legend wrapperStyle={{ fontSize:11 }}/>
                <Bar dataKey="revenue"  name="Revenue"
                  fill="#2d84e0" radius={[4,4,0,0]}/>
                <Bar dataKey="expenses" name="Expenses"
                  fill="#e8a04a" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Quick Actions ─────────────────────────────────── */}
      <div style={{ background:'white', borderRadius:12,
        border:'1px solid #e2e8f0',
        boxShadow:'0 2px 8px rgba(13,27,42,.05)', padding:20 }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:16 }}>
          Quick Actions
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          {[
            { label:'New Invoice',  path:'/invoices/new', icon:'🧾', color:'#1e6bbd' },
            { label:'Add Customer', path:'/customers',    icon:'👥', color:'#16c79a' },
            { label:'Record Bill',  path:'/bills/new',    icon:'📄', color:'#e8a04a' },
            { label:'View Reports', path:'/reports',      icon:'📈', color:'#7c3aed' },
          ].map((a, i) => (
            <button key={i} onClick={() => navigate(a.path)}
              style={{ padding:'14px 10px',
                background:`${a.color}10`,
                border:`1px solid ${a.color}30`,
                borderRadius:10, cursor:'pointer',
                textAlign:'center', transition:'all .2s' }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{a.icon}</div>
              <div style={{ fontSize:12, fontWeight:600, color:a.color }}>
                {a.label}
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
