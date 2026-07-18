import { useState, useEffect, Fragment } from 'react';
import api from '../../api/client';

const fmt = (n) => new Intl.NumberFormat('en-US', {
  minimumFractionDigits:2, maximumFractionDigits:2
}).format(n || 0);

const fmtCur = (n) => `GHS ${fmt(n)}`;

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', {
      day:'2-digit', month:'short', year:'numeric' })
  : '—';

// ── Reusable row ──────────────────────────────────────────────
function ReportRow({ label, value, bold, color, indent, topBorder }) {
  return (
    <div style={{
      display:'flex', justifyContent:'space-between',
      padding:'7px 0',
      paddingLeft: indent ? 16 : 0,
      borderTop: topBorder ? '2px solid #e2e8f0' : 'none',
      marginTop: topBorder ? 8 : 0,
      borderBottom:'1px solid #f4f6f9',
    }}>
      <span style={{ fontSize:13, color: bold?'#1a2740':'#6b7fa3',
        fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontFamily:'monospace', fontSize:13,
        fontWeight: bold ? 800 : 500,
        color: color || (bold ? '#1e6bbd' : '#1a2740') }}>
        {value}
      </span>
    </div>
  );
}

// ── Profit & Loss ─────────────────────────────────────────────
function ProfitLoss() {
  const today = new Date().toISOString().slice(0,10);
  const jan1  = `${new Date().getFullYear()}-01-01`;
  const [from, setFrom] = useState(jan1);
  const [to,   setTo]   = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/profit-loss?from=${from}&to=${to}`);
      setData(res.data);
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div>
      {/* Date range */}
      <div style={{ display:'flex', gap:12, marginBottom:20,
        background:'white', border:'1px solid #e2e8f0',
        borderRadius:10, padding:'12px 16px',
        alignItems:'center' }}>
        <span style={{ fontSize:12, color:'#6b7fa3',
          fontWeight:600 }}>From</span>
        <input type="date" value={from}
          onChange={e=>setFrom(e.target.value)}
          style={{ padding:'7px 12px', border:'1px solid #e2e8f0',
            borderRadius:7, fontSize:12, fontFamily:'sans-serif',
            color:'#1a2740', outline:'none' }}/>
        <span style={{ fontSize:12, color:'#6b7fa3' }}>To</span>
        <input type="date" value={to}
          onChange={e=>setTo(e.target.value)}
          style={{ padding:'7px 12px', border:'1px solid #e2e8f0',
            borderRadius:7, fontSize:12, fontFamily:'sans-serif',
            color:'#1a2740', outline:'none' }}/>
        <button onClick={generate} disabled={loading}
          style={{ padding:'8px 20px', background:'#1e6bbd',
            color:'white', border:'none', borderRadius:7,
            fontSize:12, fontWeight:700, cursor:'pointer' }}>
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {!data ? (
        <div style={{ textAlign:'center', padding:'60px 0',
          color:'#6b7fa3' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📊</div>
          <p style={{ fontSize:14, fontWeight:600,
            color:'#1a2740', marginBottom:6 }}>
            Select a date range and click Generate
          </p>
          <p style={{ fontSize:12 }}>
            Report pulls live data from your General Ledger
          </p>
        </div>
      ) : (
        <div style={{ display:'grid',
          gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {/* Revenue */}
          <div style={{ background:'white', borderRadius:12,
            border:'1px solid #e2e8f0',
            boxShadow:'0 2px 8px rgba(13,27,42,.04)',
            overflow:'hidden' }}>
            <div style={{ padding:'14px 20px',
              borderBottom:'1px solid #e2e8f0',
              display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontWeight:700 }}>Revenue</span>
              <span style={{ fontFamily:'monospace',
                fontWeight:800, color:'#16c79a', fontSize:14 }}>
                {fmtCur(data.revenue?.total)}
              </span>
            </div>
            <div style={{ padding:'12px 20px' }}>
              {(data.revenue?.items||[]).length===0 ? (
                <p style={{ color:'#6b7fa3', fontSize:13,
                  textAlign:'center', padding:'16px 0' }}>
                  No revenue yet
                </p>
              ) : (data.revenue?.items||[]).map((item,i)=>(
                <ReportRow key={i} indent
                  label={`${item.code} — ${item.name}`}
                  value={fmtCur(item.amount)}/>
              ))}
              <ReportRow bold topBorder
                label="Total Revenue"
                value={fmtCur(data.revenue?.total)}
                color="#16c79a"/>
            </div>
          </div>

          {/* Expenses */}
          <div style={{ background:'white', borderRadius:12,
            border:'1px solid #e2e8f0',
            boxShadow:'0 2px 8px rgba(13,27,42,.04)',
            overflow:'hidden' }}>
            <div style={{ padding:'14px 20px',
              borderBottom:'1px solid #e2e8f0',
              display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontWeight:700 }}>Expenses</span>
              <span style={{ fontFamily:'monospace',
                fontWeight:800, color:'#e05c5c', fontSize:14 }}>
                ({fmtCur(data.expenses?.total)})
              </span>
            </div>
            <div style={{ padding:'12px 20px' }}>
              {(data.expenses?.items||[]).length===0 ? (
                <p style={{ color:'#6b7fa3', fontSize:13,
                  textAlign:'center', padding:'16px 0' }}>
                  No expenses yet
                </p>
              ) : (data.expenses?.items||[]).map((item,i)=>(
                <ReportRow key={i} indent
                  label={`${item.code} — ${item.name}`}
                  value={`(${fmtCur(Math.abs(item.amount))})`}/>
              ))}
              <ReportRow bold topBorder
                label="Total Expenses"
                value={`(${fmtCur(data.expenses?.total)})`}
                color="#e05c5c"/>
            </div>
          </div>

          {/* Net Profit */}
          <div style={{ gridColumn:'1 / -1', background:'white',
            borderRadius:12, border:'1px solid #e2e8f0',
            boxShadow:'0 2px 8px rgba(13,27,42,.04)',
            padding:'20px 24px',
            display:'flex', justifyContent:'space-between',
            alignItems:'center' }}>
            <div>
              <div style={{ fontWeight:700, fontSize:16 }}>
                Net Profit / (Loss)
              </div>
              <div style={{ fontSize:12, color:'#6b7fa3',
                marginTop:4 }}>
                {fmtDate(from)} — {fmtDate(to)}
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:'monospace', fontSize:32,
                fontWeight:800, letterSpacing:-1,
                color: data.netProfit >= 0
                  ? '#16c79a' : '#e05c5c' }}>
                {data.netProfit < 0
                  ? `(${fmtCur(Math.abs(data.netProfit))})`
                  : fmtCur(data.netProfit)}
              </div>
              <div style={{ fontSize:12, color:'#6b7fa3',
                marginTop:4 }}>
                Margin:{' '}
                <strong style={{ color: data.netProfit>=0
                  ? '#16c79a' : '#e05c5c' }}>
                  {data.revenue?.total > 0
                    ? `${((data.netProfit/data.revenue.total)*100).toFixed(1)}%`
                    : '0%'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Balance Sheet ─────────────────────────────────────────────
function BalanceSheet() {
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0,10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/balance-sheet?asOf=${asOf}`);
      setData(res.data);
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:20,
        background:'white', border:'1px solid #e2e8f0',
        borderRadius:10, padding:'12px 16px',
        alignItems:'center' }}>
        <span style={{ fontSize:12, color:'#6b7fa3',
          fontWeight:600 }}>As of</span>
        <input type="date" value={asOf}
          onChange={e=>setAsOf(e.target.value)}
          style={{ padding:'7px 12px', border:'1px solid #e2e8f0',
            borderRadius:7, fontSize:12,
            fontFamily:'sans-serif', color:'#1a2740',
            outline:'none' }}/>
        <button onClick={generate} disabled={loading}
          style={{ padding:'8px 20px', background:'#1e6bbd',
            color:'white', border:'none', borderRadius:7,
            fontSize:12, fontWeight:700, cursor:'pointer' }}>
          {loading?'Generating...':'Generate'}
        </button>
      </div>

      {!data ? (
        <div style={{ textAlign:'center', padding:'60px 0',
          color:'#6b7fa3' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>⚖️</div>
          <p style={{ fontSize:14, fontWeight:600,
            color:'#1a2740', marginBottom:6 }}>
            Select a date and click Generate
          </p>
        </div>
      ) : (
        <>
          <div style={{ display:'grid',
            gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {/* Assets */}
            <div style={{ background:'white', borderRadius:12,
              border:'1px solid #e2e8f0',
              boxShadow:'0 2px 8px rgba(13,27,42,.04)' }}>
              <div style={{ padding:'14px 20px',
                borderBottom:'1px solid #e2e8f0',
                display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontWeight:700 }}>Assets</span>
                <span style={{ fontFamily:'monospace',
                  fontWeight:800, color:'#1e6bbd' }}>
                  {fmtCur(data.assets?.total)}
                </span>
              </div>
              <div style={{ padding:'12px 20px' }}>
                {(data.assets?.items||[]).map((item,i)=>(
                  <ReportRow key={i} indent
                    label={`${item.code} — ${item.name}`}
                    value={fmtCur(item.balance)}/>
                ))}
                <ReportRow bold topBorder
                  label="Total Assets"
                  value={fmtCur(data.assets?.total)}
                  color="#1e6bbd"/>
              </div>
            </div>

            {/* Liabilities + Equity */}
            <div style={{ background:'white', borderRadius:12,
              border:'1px solid #e2e8f0',
              boxShadow:'0 2px 8px rgba(13,27,42,.04)' }}>
              <div style={{ padding:'14px 20px',
                borderBottom:'1px solid #e2e8f0' }}>
                <span style={{ fontWeight:700 }}>
                  Liabilities & Equity
                </span>
              </div>
              <div style={{ padding:'12px 20px' }}>
                <div style={{ fontSize:11, fontWeight:700,
                  color:'#6b7fa3', textTransform:'uppercase',
                  letterSpacing:1, marginBottom:8 }}>
                  Liabilities
                </div>
                {(data.liabilities?.items||[]).map((item,i)=>(
                  <ReportRow key={i} indent
                    label={`${item.code} — ${item.name}`}
                    value={fmtCur(item.balance)}/>
                ))}
                <ReportRow bold topBorder
                  label="Total Liabilities"
                  value={fmtCur(data.liabilities?.total)}
                  color="#e05c5c"/>
                <div style={{ fontSize:11, fontWeight:700,
                  color:'#6b7fa3', textTransform:'uppercase',
                  letterSpacing:1, margin:'16px 0 8px' }}>
                  Equity
                </div>
                {(data.equity?.items||[]).map((item,i)=>(
                  <ReportRow key={i} indent
                    label={`${item.code} — ${item.name}`}
                    value={fmtCur(item.balance)}/>
                ))}
                <ReportRow bold topBorder
                  label="Total Equity"
                  value={fmtCur(data.equity?.total)}
                  color="#7c3aed"/>
                <ReportRow bold topBorder
                  label="Total Liabilities + Equity"
                  value={fmtCur(
                    (data.liabilities?.total||0) +
                    (data.equity?.total||0)
                  )}
                  color="#1e6bbd"/>
              </div>
            </div>
          </div>

          {/* Balance check */}
          <div style={{ marginTop:12, textAlign:'center',
            padding:'12px', borderRadius:8, fontSize:13,
            fontWeight:700,
            background: data.balanced
              ? 'rgba(22,199,154,.1)' : 'rgba(224,92,92,.1)',
            color: data.balanced ? '#0ea87f' : '#c04040',
            border:`1px solid ${data.balanced?'#86efac':'#fca5a5'}` }}>
            {data.balanced
              ? '✓ Balance Sheet is balanced'
              : '⚠ Balance Sheet does not balance — check your journal entries'}
          </div>
        </>
      )}
    </div>
  );
}

// ── Trial Balance ─────────────────────────────────────────────
function TrialBalance() {
  const today = new Date().toISOString().slice(0,10);
  const jan1  = `${new Date().getFullYear()}-01-01`;
  const [from, setFrom] = useState(jan1);
  const [to,   setTo]   = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/reports/trial-balance?from=${from}&to=${to}`
      );
      setData(res.data);
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const grouped = (data?.rows||[]).reduce((acc, r) => {
    if (!acc[r.classification]) acc[r.classification] = [];
    acc[r.classification].push(r);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:20,
        background:'white', border:'1px solid #e2e8f0',
        borderRadius:10, padding:'12px 16px',
        alignItems:'center' }}>
        <span style={{ fontSize:12, color:'#6b7fa3',
          fontWeight:600 }}>From</span>
        <input type="date" value={from}
          onChange={e=>setFrom(e.target.value)}
          style={{ padding:'7px 12px', border:'1px solid #e2e8f0',
            borderRadius:7, fontSize:12,
            fontFamily:'sans-serif', color:'#1a2740',
            outline:'none' }}/>
        <span style={{ fontSize:12, color:'#6b7fa3' }}>To</span>
        <input type="date" value={to}
          onChange={e=>setTo(e.target.value)}
          style={{ padding:'7px 12px', border:'1px solid #e2e8f0',
            borderRadius:7, fontSize:12,
            fontFamily:'sans-serif', color:'#1a2740',
            outline:'none' }}/>
        <button onClick={generate} disabled={loading}
          style={{ padding:'8px 20px', background:'#1e6bbd',
            color:'white', border:'none', borderRadius:7,
            fontSize:12, fontWeight:700, cursor:'pointer' }}>
          {loading?'Generating...':'Generate'}
        </button>
      </div>

      {!data ? (
        <div style={{ textAlign:'center', padding:'60px 0',
          color:'#6b7fa3' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
          <p style={{ fontSize:14, fontWeight:600,
            color:'#1a2740' }}>
            Select a date range and click Generate
          </p>
        </div>
      ) : (
        <div style={{ background:'white', borderRadius:12,
          border:'1px solid #e2e8f0', overflow:'hidden',
          boxShadow:'0 2px 8px rgba(13,27,42,.04)' }}>
          <table style={{ width:'100%',
            borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Code','Account Name','Debit','Credit','Balance']
                  .map(h=>(
                  <th key={h} style={{ padding:'10px 16px',
                    textAlign: h==='Code'||h==='Account Name'
                      ? 'left' : 'right',
                    fontSize:10, fontWeight:600, color:'#6b7fa3',
                    textTransform:'uppercase', letterSpacing:.7,
                    background:'#f8fafc',
                    borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['asset','liability','equity',
                'revenue','expense'].map(cls => {
                const items = grouped[cls] || [];
                if (!items.length) return null;
                return [
                  <tr key={`h-${cls}`}>
                    <td colSpan={5} style={{ padding:'10px 16px',
                      fontSize:10, fontWeight:700, letterSpacing:1.2,
                      textTransform:'uppercase', color:'#6b7fa3',
                      background:'#f8fafc',
                      borderBottom:'1px solid #e2e8f0',
                      paddingTop:14 }}>
                      {cls}
                    </td>
                  </tr>,
                  ...items.map((r,i)=>(
                    <tr key={`${cls}-${i}`}
                      style={{ borderBottom:'1px solid #f4f6f9' }}>
                      <td style={{ padding:'9px 16px 9px 28px',
                        fontFamily:'monospace', fontSize:11,
                        color:'#1e6bbd', fontWeight:600 }}>
                        {r.code}
                      </td>
                      <td style={{ padding:'9px 16px',
                        fontSize:13 }}>{r.name}</td>
                      <td style={{ padding:'9px 16px',
                        fontFamily:'monospace', fontSize:12,
                        textAlign:'right' }}>
                        {fmtCur(r.total_debit)}
                      </td>
                      <td style={{ padding:'9px 16px',
                        fontFamily:'monospace', fontSize:12,
                        textAlign:'right' }}>
                        {fmtCur(r.total_credit)}
                      </td>
                      <td style={{ padding:'9px 16px',
                        fontFamily:'monospace', fontSize:12,
                        textAlign:'right', fontWeight:600,
                        color: parseFloat(r.balance)<0
                          ? '#e05c5c' : '#1a2740' }}>
                        {fmtCur(Math.abs(r.balance))}
                        {parseFloat(r.balance)<0?' Cr':''}
                      </td>
                    </tr>
                  )),
                ];
              })}
              {/* Totals row */}
              <tr style={{ background:'#f8fafc',
                borderTop:'2px solid #e2e8f0' }}>
                <td colSpan={2} style={{ padding:'12px 16px',
                  fontWeight:800, fontSize:13 }}>TOTALS</td>
                <td style={{ padding:'12px 16px',
                  fontFamily:'monospace', fontWeight:800,
                  fontSize:14, textAlign:'right',
                  color:'#1e6bbd' }}>
                  {fmtCur(data.totals?.totalDebits)}
                </td>
                <td style={{ padding:'12px 16px',
                  fontFamily:'monospace', fontWeight:800,
                  fontSize:14, textAlign:'right',
                  color:'#1e6bbd' }}>
                  {fmtCur(data.totals?.totalCredits)}
                </td>
                <td style={{ padding:'12px 16px',
                  textAlign:'right' }}>
                  <span style={{ fontSize:12, fontWeight:700,
                    padding:'4px 12px', borderRadius:20,
                    background: data.balanced
                      ? 'rgba(22,199,154,.12)'
                      : 'rgba(224,92,92,.12)',
                    color: data.balanced
                      ? '#0ea87f' : '#c04040' }}>
                    {data.balanced
                      ? '✓ Balanced' : '⚠ Out of balance'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Cash Reconciliation (POS shift history) ────────────────────
// Closing a shift computes expected/counted/variance on the spot, but
// that comparison used to vanish the moment the cashier clicked past
// it — nothing in either app ever surfaced it again. This is the
// first place a manager can actually trace a past shift's variance.
function CashReconciliation() {
  const jan1  = `${new Date().getFullYear()}-01-01`;
  const today = new Date().toISOString().slice(0,10);
  const [dateFrom, setDateFrom] = useState(jan1);
  const [dateTo,   setDateTo]   = useState(today);
  const [status,   setStatus]   = useState('');
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [detail,   setDetail]   = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = { dateFrom, dateTo, limit: 100 };
      if (status) params.status = status;
      const res = await api.get('/pos/sessions', { params });
      setSessions(res.data || []);
    } catch (err) { alert(err.message || 'Failed to load shift history'); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const toggleExpand = async (session) => {
    if (expanded === session.id) { setExpanded(null); setDetail(null); return; }
    setExpanded(session.id);
    setDetailLoading(true);
    try {
      const res = await api.get(`/pos/sessions/${session.id}`);
      setDetail(res.data);
    } catch (err) { alert(err.message || 'Failed to load shift detail'); }
    finally { setDetailLoading(false); }
  };

  const varianceColor = (v) => {
    const n = parseFloat(v);
    if (v === null || v === undefined || isNaN(n)) return '#6b7fa3';
    if (Math.abs(n) < 0.01) return '#0ea87f';
    return '#c04040';
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap',
        background:'white', border:'1px solid #e2e8f0',
        borderRadius:10, padding:'12px 16px', alignItems:'center' }}>
        <span style={{ fontSize:12, color:'#6b7fa3', fontWeight:600 }}>From</span>
        <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
          style={{ padding:'7px 12px', border:'1px solid #e2e8f0',
            borderRadius:7, fontSize:12, fontFamily:'sans-serif',
            color:'#1a2740', outline:'none' }}/>
        <span style={{ fontSize:12, color:'#6b7fa3' }}>To</span>
        <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
          style={{ padding:'7px 12px', border:'1px solid #e2e8f0',
            borderRadius:7, fontSize:12, fontFamily:'sans-serif',
            color:'#1a2740', outline:'none' }}/>
        <span style={{ fontSize:12, color:'#6b7fa3' }}>Status</span>
        <select value={status} onChange={e=>setStatus(e.target.value)}
          style={{ padding:'7px 12px', border:'1px solid #e2e8f0',
            borderRadius:7, fontSize:12, fontFamily:'sans-serif',
            color:'#1a2740', outline:'none', background:'white' }}>
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        <button onClick={load} disabled={loading}
          style={{ padding:'8px 20px', background:'#1e6bbd',
            color:'white', border:'none', borderRadius:7,
            fontSize:12, fontWeight:700, cursor:'pointer' }}>
          {loading ? 'Loading...' : 'Filter'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#6b7fa3' }}>Loading shift history...</div>
      ) : sessions.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#6b7fa3' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🧾</div>
          <p style={{ fontSize:14, fontWeight:600, color:'#1a2740' }}>No shifts in this range</p>
        </div>
      ) : (
        <div style={{ background:'white', borderRadius:12,
          border:'1px solid #e2e8f0', boxShadow:'0 2px 8px rgba(13,27,42,.04)',
          overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                {['Cashier','Opened','Closed','Status','Cash Sales','MoMo','Card','Expected','Counted','Variance'].map(h=>(
                  <th key={h} style={{ padding:'10px 14px', textAlign: h==='Cashier'||h==='Status' ? 'left' : 'right',
                    fontSize:11, fontWeight:700, color:'#6b7fa3', textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <Fragment key={s.id}>
                  <tr onClick={()=>toggleExpand(s)}
                    style={{ borderBottom:'1px solid #f1f5f9', cursor:'pointer' }}>
                    <td style={{ padding:'10px 14px' }}>{s.first_name} {s.last_name}</td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontSize:12 }}>{fmtDate(s.opened_at)}</td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontSize:12 }}>{fmtDate(s.closed_at)}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20,
                        background: s.status==='closed' ? 'rgba(107,127,163,.12)' : 'rgba(22,199,154,.12)',
                        color: s.status==='closed' ? '#6b7fa3' : '#0ea87f' }}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'monospace' }}>{fmtCur(s.total_cash_sales)}</td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'monospace' }}>{fmtCur(s.total_momo_sales)}</td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'monospace' }}>{fmtCur(s.total_card_sales)}</td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'monospace' }}>
                      {s.expected_cash !== null ? fmtCur(s.expected_cash) : '—'}
                    </td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'monospace' }}>
                      {s.closing_cash_counted !== null ? fmtCur(s.closing_cash_counted) : '—'}
                    </td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'monospace',
                      fontWeight:700, color: varianceColor(s.variance) }}>
                      {s.variance !== null ? fmtCur(s.variance) : '—'}
                    </td>
                  </tr>
                  {expanded === s.id && (
                    <tr key={`${s.id}-detail`}>
                      <td colSpan={10} style={{ padding:'14px 20px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                        {detailLoading ? 'Loading sales...' : (
                          <div>
                            <div style={{ fontSize:12, fontWeight:700, color:'#1a2740', marginBottom:8 }}>
                              Opening float {fmtCur(s.opening_float)} — {detail?.sales?.length || 0} sale(s) this shift
                            </div>
                            {(detail?.sales || []).length === 0 ? (
                              <p style={{ fontSize:12, color:'#6b7fa3' }}>No sales recorded.</p>
                            ) : (
                              <table style={{ width:'100%', fontSize:12 }}>
                                <tbody>
                                  {detail.sales.map(sale => (
                                    <tr key={sale.id}>
                                      <td style={{ padding:'4px 8px' }}>{sale.sale_number}</td>
                                      <td style={{ padding:'4px 8px' }}>{sale.payment_method}</td>
                                      <td style={{ padding:'4px 8px' }}>
                                        <span style={{ color: sale.payment_status==='completed' ? '#0ea87f'
                                          : sale.payment_status==='pending' ? '#e8a04a' : '#c04040' }}>
                                          {sale.payment_status}
                                        </span>
                                      </td>
                                      <td style={{ padding:'4px 8px', textAlign:'right', fontFamily:'monospace' }}>
                                        {fmtCur(sale.total_amount)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Reports Page ─────────────────────────────────────────
const TABS = [
  { id:'pl',  label:'Profit & Loss',   icon:'📈' },
  { id:'bs',  label:'Balance Sheet',   icon:'⚖️' },
  { id:'tb',  label:'Trial Balance',   icon:'📋' },
  { id:'cash',label:'Cash Reconciliation', icon:'🧾' },
];

export default function ReportsPage() {
  const [tab, setTab] = useState('pl');

  return (
    <div style={{ fontFamily:'sans-serif' }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:700,
          color:'#1a2740', marginBottom:4 }}>
          Financial Reports
        </h1>
        <p style={{ fontSize:13, color:'#6b7fa3' }}>
          IFRS 18 compliant statements generated live
          from your General Ledger
        </p>
      </div>

      {/* Tab selector */}
      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ padding:'10px 20px',
              borderRadius:8, border:'none', cursor:'pointer',
              fontSize:13, fontWeight:600,
              background: tab===t.id ? '#1e6bbd' : 'white',
              color: tab===t.id ? 'white' : '#6b7fa3',
              boxShadow: tab===t.id
                ? '0 4px 12px rgba(30,107,189,.3)'
                : '0 1px 4px rgba(0,0,0,.06)',
              transition:'all .2s' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab==='pl' && <ProfitLoss/>}
      {tab==='bs' && <BalanceSheet/>}
      {tab==='tb' && <TrialBalance/>}
      {tab==='cash' && <CashReconciliation/>}
    </div>
  );
}
