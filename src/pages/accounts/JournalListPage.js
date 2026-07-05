// ============================================================
//  src/pages/accounts/JournalListPage.js
// ============================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

const fmtCur = (n) => `GHS ${new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2 }).format(n || 0)}`;

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', {
      day:'2-digit', month:'short', year:'numeric' })
  : '—';

function Badge({ status }) {
  const map = {
    draft:    { bg:'rgba(107,127,163,.12)', color:'#6b7fa3' },
    posted:   { bg:'rgba(22,199,154,.12)',  color:'#0ea87f' },
    reversed: { bg:'rgba(224,92,92,.12)',   color:'#c04040' },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{ padding:'3px 10px', borderRadius:20,
      fontSize:11, fontWeight:600, background:s.bg,
      color:s.color, textTransform:'capitalize' }}>
      {status}
    </span>
  );
}

export default function JournalListPage() {
  const navigate = useNavigate();
  const [entries,  setEntries]  = useState([]);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [statusF,  setStatusF]  = useState('');

  // Search/status are sent to the server (it already supports both
  // query params) rather than filtered client-side over whatever
  // page happens to be loaded — a search for an entry beyond the
  // first page previously looked like "not found" even when it
  // existed. Stats come from a separate, unpaginated aggregate
  // endpoint so the summary tiles reflect true totals, not just the
  // fetched page.
  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/journals', { params: { limit: 100, status: statusF || undefined, search: search || undefined } }),
      api.get('/journals/stats'),
    ])
      .then(([listRes, statsRes]) => {
        setEntries(listRes.data || []);
        setStats(statsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // Single effect covers both the initial load and subsequent
  // search/status changes — debounced so typing doesn't fire a
  // request per keystroke, but still runs immediately on mount.
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, statusF]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePost = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Post this journal entry to the General Ledger?')) return;
    try {
      await api.post(`/journals/${id}/post`);
      load();
    } catch (err) { alert(err.message); }
  };

  const handleReverse = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Reverse this journal entry? A new counter-entry will be created.')) return;
    try {
      await api.post(`/journals/${id}/reverse`);
      load();
    } catch (err) { alert(err.message); }
  };

  // search/statusF are already applied server-side (see load()), so
  // entries IS the filtered set — no client-side re-filtering needed.
  const filtered = entries;

  return (
    <div style={{ fontFamily:'sans-serif' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between',
        alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700,
            color:'#1a2740', marginBottom:4 }}>
            Journal Entries
          </h1>
          <p style={{ fontSize:13, color:'#6b7fa3' }}>
            Manual double-entry bookkeeping —
            every debit must equal every credit
          </p>
        </div>
        <button onClick={() => navigate('/journals/new')}
          style={{ padding:'10px 20px', background:'#1e6bbd',
            color:'white', border:'none', borderRadius:8,
            fontSize:13, fontWeight:700, cursor:'pointer' }}>
          + New Journal Entry
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid',
        gridTemplateColumns:'repeat(4,1fr)',
        gap:12, marginBottom:20 }}>
        {[
          { label:'Total Entries',
            value:stats?.total_entries ?? 0, color:'#1e6bbd' },
          { label:'Posted to GL',
            value:stats?.total_posted ?? 0, color:'#16c79a' },
          { label:'Draft',
            value:stats?.total_draft ?? 0,
            color:'#e8a04a' },
          { label:'Total Debits Posted',
            value:fmtCur(stats?.total_debits_posted), color:'#1a2740' },
        ].map((s,i) => (
          <div key={i} style={{ background:'white',
            borderRadius:12, padding:16,
            border:'1px solid #e2e8f0',
            boxShadow:'0 2px 8px rgba(13,27,42,.04)' }}>
            <div style={{ fontSize:11, color:'#6b7fa3',
              fontWeight:500, marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:20, fontWeight:700,
              color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background:'white',
        border:'1px solid #e2e8f0', borderRadius:10,
        padding:'10px 16px', marginBottom:16,
        display:'flex', alignItems:'center', gap:12 }}>
        <span>🔍</span>
        <input placeholder="Search by entry number or description..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ border:'none', outline:'none', fontSize:13,
            fontFamily:'sans-serif', flex:1,
            background:'none', color:'#1a2740' }}/>
        <select value={statusF}
          onChange={e => setStatusF(e.target.value)}
          style={{ padding:'7px 12px',
            border:'1px solid #e2e8f0', borderRadius:7,
            fontSize:12, fontFamily:'sans-serif',
            color:'#1a2740', background:'#f9fafb',
            outline:'none' }}>
          <option value="">All Status</option>
          {['draft','posted','reversed'].map(s => (
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
          <div style={{ textAlign:'center',
            padding:60, color:'#6b7fa3' }}>
            <div style={{ width:28, height:28,
              border:'3px solid #e2e8f0',
              borderTopColor:'#1e6bbd', borderRadius:'50%',
              animation:'spin .7s linear infinite',
              margin:'0 auto 12px' }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            Loading journal entries...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center',
            padding:'60px 20px', color:'#6b7fa3' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📔</div>
            <p style={{ fontSize:15, fontWeight:600,
              color:'#1a2740', marginBottom:6 }}>
              {search||statusF
                ? 'No entries match'
                : 'No journal entries yet'}
            </p>
            <p style={{ fontSize:13, marginBottom:20 }}>
              {!search && !statusF
                ? 'Create manual journal entries for adjustments, accruals and corrections'
                : 'Try clearing your filters'}
            </p>
            {!search && !statusF && (
              <button onClick={() => navigate('/journals/new')}
                style={{ padding:'10px 24px',
                  background:'#1e6bbd', color:'white',
                  border:'none', borderRadius:8, fontSize:13,
                  fontWeight:600, cursor:'pointer' }}>
                + Create First Journal Entry
              </button>
            )}
          </div>
        ) : (
          <table style={{ width:'100%',
            borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Entry #','Date','Description',
                  'Lines','Total Debits',
                  'Status','Actions'].map(h => (
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
              {filtered.map((entry, i) => (
                <tr key={i}
                  style={{ borderBottom:'1px solid #f4f6f9',
                    cursor:'pointer' }}
                  onClick={() =>
                    navigate(`/journals/${entry.id}`)}>
                  <td style={{ padding:'12px 16px',
                    fontFamily:'monospace', fontSize:12,
                    color:'#1e6bbd', fontWeight:600 }}>
                    {entry.entry_number}
                  </td>
                  <td style={{ padding:'12px 16px',
                    color:'#6b7fa3', fontSize:13 }}>
                    {fmtDate(entry.entry_date)}
                  </td>
                  <td style={{ padding:'12px 16px',
                    fontSize:13, maxWidth:280 }}>
                    <div style={{ overflow:'hidden',
                      textOverflow:'ellipsis',
                      whiteSpace:'nowrap',
                      fontWeight:500 }}>
                      {entry.description}
                    </div>
                    {entry.reference && (
                      <div style={{ fontSize:11,
                        color:'#6b7fa3' }}>
                        Ref: {entry.reference}
                      </div>
                    )}
                  </td>
                  <td style={{ padding:'12px 16px',
                    color:'#6b7fa3', fontSize:13,
                    textAlign:'center' }}>
                    {entry.line_count || 0}
                  </td>
                  <td style={{ padding:'12px 16px',
                    fontFamily:'monospace', fontSize:12,
                    fontWeight:700 }}>
                    {fmtCur(entry.total_debits)}
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <Badge status={entry.status}/>
                  </td>
                  <td style={{ padding:'12px 16px' }}
                    onClick={e => e.stopPropagation()}>
                    <div style={{ display:'flex', gap:6 }}>
                      {entry.status === 'draft' && (
                        <button
                          onClick={e =>
                            handlePost(entry.id, e)}
                          style={{ padding:'5px 10px',
                            borderRadius:6,
                            border:'1px solid #16c79a',
                            background:'none',
                            color:'#16c79a', fontSize:11,
                            fontWeight:600,
                            cursor:'pointer' }}>
                          Post
                        </button>
                      )}
                      {entry.status === 'posted' && (
                        <button
                          onClick={e =>
                            handleReverse(entry.id, e)}
                          style={{ padding:'5px 10px',
                            borderRadius:6,
                            border:'1px solid #e05c5c',
                            background:'none',
                            color:'#e05c5c', fontSize:11,
                            fontWeight:600,
                            cursor:'pointer' }}>
                          Reverse
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
