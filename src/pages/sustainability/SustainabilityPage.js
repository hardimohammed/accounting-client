// ============================================================
//  src/pages/sustainability/SustainabilityPage.js
//  Full ESG + SDG mapping system
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { orgAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';

const fmtNum = (n, unit = '') =>
  `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n || 0)}${unit ? ' ' + unit : ''}`;

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const PILLAR = {
  environmental: { color:'#C8102E', bg:'rgba(200,16,46,.1)',
    icon:'🌱', label:'Environmental' },
  social:        { color:'#D9A521', bg:'rgba(217,165,33,.1)',
    icon:'👥', label:'Social' },
  governance:    { color:'#046A38', bg:'rgba(4,106,56,.1)',
    icon:'⚖️', label:'Governance' },
};

function Modal({ open, onClose, title, children, width=560 }) {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0,
      background:'rgba(13,27,42,.55)', display:'flex',
      alignItems:'center', justifyContent:'center',
      zIndex:9999, padding:20 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'white', borderRadius:14,
        width:'100%', maxWidth:width, maxHeight:'92vh',
        overflow:'auto',
        boxShadow:'0 20px 60px rgba(13,27,42,.3)' }}>
        <div style={{ display:'flex', alignItems:'center',
          justifyContent:'space-between', padding:'18px 24px',
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
  { id:'overview',   label:'Overview'          },
  { id:'metrics',    label:'Metrics'           },
  { id:'sdg',        label:'SDG Mapping'       },
  { id:'impact',     label:'SDG Impact Report' },
  { id:'categories', label:'Categories'        },
];

export default function SustainabilityPage() {
  const { user } = useAuth();
  const [tab,        setTab]       = useState('overview');
  const [metrics,    setMetrics]   = useState([]);
  const [categories, setCategories]= useState([]);
  const [sdgGoals,   setSdgGoals]  = useState([]);
  const [sdgImpact,  setSdgImpact] = useState(null);
  const [org,        setOrg]       = useState(null);
  const [loading,    setLoading]   = useState(true);
  const [modal,      setModal]     = useState(false);
  const [saving,     setSaving]    = useState(false);
  const [suggested,  setSuggested] = useState([]);
  const [verifying,  setVerifying] = useState(null);
  const [exporting,  setExporting] = useState(false);

  const [form, setForm] = useState({
    categoryId: '',
    metricDate: new Date().toISOString().slice(0,10),
    value: '', unit: '', notes: '',
    dataSource: '',
    selectedSDGs: [],
  });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/sustainability'),
      api.get('/sustainability/categories'),
      api.get('/sustainability/sdg').catch(() => ({ data:[] })),
      api.get('/sustainability/sdg/impact')
        .catch(() => ({ data:{ sdgs:[], summary:{} } })),
      orgAPI.get().catch(() => ({ data:null })),
    ]).then(([m, c, s, imp, o]) => {
      setMetrics(m.data    || []);
      setCategories(c.data || []);
      setSdgGoals(s.data   || []);
      setSdgImpact(imp.data || { sdgs:[], summary:{} });
      setOrg(o.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleCategoryChange = async (catId) => {
    upd('categoryId', catId);
    upd('selectedSDGs', []);
    setSuggested([]);
    if (!catId) return;
    try {
      const res = await api.get(
        `/sustainability/sdg/suggest/${catId}`);
      setSuggested(res.data || []);
    } catch { setSuggested([]); }
  };

  const toggleSDG = (sdgId) => {
    const ids = form.selectedSDGs;
    upd('selectedSDGs',
      ids.includes(sdgId)
        ? ids.filter(i => i !== sdgId)
        : [...ids, sdgId]
    );
  };

  const handleCreate = async () => {
    if (!form.categoryId)
      return alert('Please select a category');
    if (!form.value)
      return alert('Please enter a value');
    setSaving(true);
    try {
      await api.post('/sustainability', {
        categoryId:  form.categoryId,
        metricDate:  form.metricDate,
        value:       form.value,
        unit:        form.unit,
        notes:       form.notes,
        dataSource:  form.dataSource,
        sdgIds:      form.selectedSDGs,
      });
      load();
      setModal(false);
      setForm({
        categoryId: '',
        metricDate: new Date().toISOString().slice(0,10),
        value: '', unit: '', notes: '',
        dataSource: '',
        selectedSDGs: [],
      });
      setSuggested([]);
    } catch (err) {
      alert(err.message || 'Failed to record metric');
    } finally { setSaving(false); }
  };

  const handleVerify = async (metricId) => {
    setVerifying(metricId);
    try {
      await api.post(`/sustainability/${metricId}/verify`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to verify metric');
    } finally { setVerifying(null); }
  };

  const handleExportPdf = async () => {
    if (!sdgImpact) return;
    setExporting(true);
    try {
      // jsPDF statically pulls in html2canvas (used only for its .html()
      // rendering path, which this text-only report never calls) — dead
      // weight in the main bundle for every page load. Loaded on demand,
      // only once someone actually clicks Export.
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const left = 40, right = 555, pageBottom = 780;
      let y = 50;

      const ensureRoom = (needed) => {
        if (y + needed > pageBottom) { doc.addPage(); y = 50; }
      };

      doc.setFontSize(18).setFont(undefined, 'bold');
      doc.text(org?.name || 'FinSuite Pro', left, y);
      doc.setFontSize(10).setFont(undefined, 'normal');
      y += 18;
      if (org?.address) { doc.text(org.address, left, y); y += 14; }

      doc.setFontSize(20).setFont(undefined, 'bold');
      doc.text('SDG Impact Report', 340, 50);
      doc.setFontSize(10).setFont(undefined, 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}`, 340, 68);

      y = Math.max(y, 68) + 24;
      doc.setFontSize(10).setFont(undefined, 'normal');
      doc.text(
        "This report summarises the organisation's recorded contribution to the UN Sustainable Development Goals, based on ESG metrics linked to each goal.",
        left, y, { maxWidth: right - left }
      );
      y += 34;

      // Summary stat boxes
      const stats = [
        { label: 'Total SDGs',        value: String(sdgImpact.summary?.totalSDGs || 0) },
        { label: 'SDGs with Metrics', value: String(sdgImpact.summary?.coveredSDGs || 0) },
        { label: 'Coverage Rate',     value: `${sdgImpact.summary?.coverageRate || 0}%` },
        { label: 'Metric Links',      value: String(sdgImpact.summary?.totalMetrics || 0) },
      ];
      const boxW = (right - left) / 4;
      stats.forEach((s, i) => {
        const x = left + i * boxW;
        doc.setDrawColor(220).rect(x, y, boxW - 8, 46);
        doc.setFontSize(8).setFont(undefined, 'normal').setTextColor(110);
        doc.text(s.label, x + 8, y + 16, { maxWidth: boxW - 16 });
        doc.setFontSize(15).setFont(undefined, 'bold').setTextColor(20);
        doc.text(s.value, x + 8, y + 36);
      });
      doc.setTextColor(0);
      y += 66;

      const covered = (sdgImpact.sdgs || []).filter(g => parseInt(g.metric_count) > 0);

      doc.setFontSize(13).setFont(undefined, 'bold');
      doc.text('Goals with Linked Metrics', left, y);
      y += 20;

      if (covered.length === 0) {
        doc.setFontSize(10).setFont(undefined, 'normal');
        doc.text('No SDG metrics linked yet.', left, y);
        y += 16;
      } else {
        covered.forEach(sdg => {
          ensureRoom(40);
          doc.setFontSize(11).setFont(undefined, 'bold');
          doc.text(`SDG ${sdg.number} — ${sdg.title}`, left, y);
          y += 16;
          doc.setFontSize(9).setFont(undefined, 'normal');
          const detail = `${sdg.metric_count} metric${parseInt(sdg.metric_count) !== 1 ? 's' : ''} contributing` +
            (sdg.last_updated ? `  ·  last updated ${new Date(sdg.last_updated).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}` : '');
          doc.text(detail, left, y);
          y += 22;
        });
      }

      ensureRoom(50);
      y += 10;
      doc.setDrawColor(220).line(left, y, right, y);
      y += 16;
      doc.setFontSize(8).setFont(undefined, 'normal').setTextColor(130);
      doc.text('Prepared for donor, investor and international-partner reporting purposes.', left, y, { maxWidth: right - left });
      doc.setTextColor(0);

      const orgSlug = (org?.name || 'organisation').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      doc.save(`sdg-impact-report-${orgSlug}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  const byPillar = ['environmental','social','governance']
    .reduce((acc, p) => {
      acc[p] = categories.filter(c => c.pillar === p);
      return acc;
    }, {});

  const metricsByPillar = metrics.reduce((acc, m) => {
    const p = m.pillar || 'environmental';
    if (!acc[p]) acc[p] = [];
    acc[p].push(m);
    return acc;
  }, {});

  const coveredSDGs = (sdgImpact?.sdgs || [])
    .filter(g => parseInt(g.metric_count) > 0);

  const inp = { width:'100%', padding:'9px 12px',
    border:'1.5px solid #e2e8f0', borderRadius:8,
    fontSize:13, fontFamily:'sans-serif',
    background:'#f9fafb', outline:'none' };
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
            Sustainability & ESG
          </h1>
          <p style={{ fontSize:13, color:'#6b7fa3' }}>
            Environmental, Social and Governance reporting
            with UN SDG alignment
          </p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ padding:'10px 20px', background:'#16c79a',
            color:'white', border:'none', borderRadius:8,
            fontSize:13, fontWeight:700, cursor:'pointer' }}>
          + Record Metric
        </button>
      </div>

      {/* ESG Pillar Cards */}
      <div style={{ display:'grid',
        gridTemplateColumns:'repeat(3,1fr)',
        gap:16, marginBottom:20 }}>
        {Object.entries(PILLAR).map(([pillar, cfg]) => {
          const count    = (metricsByPillar[pillar]||[]).length;
          const catCount = (byPillar[pillar]||[]).length;
          return (
            <div key={pillar} style={{ background:cfg.color,
              borderRadius:12, padding:20,
              boxShadow:'0 2px 8px rgba(13,27,42,.12)',
              position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute',
                right:-8, top:-8, fontSize:80,
                opacity:.12, userSelect:'none' }}>
                {cfg.icon}
              </div>
              <div style={{ width:44, height:44,
                borderRadius:12, background:'rgba(255,255,255,.2)',
                display:'flex', alignItems:'center',
                justifyContent:'center',
                fontSize:22, marginBottom:12 }}>
                {cfg.icon}
              </div>
              <div style={{ fontSize:13, fontWeight:700,
                color:'white', marginBottom:8 }}>
                {cfg.label}
              </div>
              <div style={{ display:'flex', gap:24 }}>
                <div>
                  <div style={{ fontSize:26, fontWeight:800,
                    color:'white' }}>{count}</div>
                  <div style={{ fontSize:11,
                    color:'rgba(255,255,255,.75)' }}>Metrics</div>
                </div>
                <div>
                  <div style={{ fontSize:26, fontWeight:800,
                    color:'white' }}>{catCount}</div>
                  <div style={{ fontSize:11,
                    color:'rgba(255,255,255,.75)' }}>Categories</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SDG Coverage strip */}
      {(sdgImpact?.summary?.totalSDGs || 0) > 0 && (
        <div style={{ background:'white', borderRadius:12,
          padding:'14px 20px', border:'1px solid #e2e8f0',
          marginBottom:20, display:'flex',
          alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex',
            alignItems:'center', gap:12 }}>
            <div style={{ fontSize:22 }}>🌐</div>
            <div>
              <div style={{ fontWeight:700, fontSize:14 }}>
                SDG Coverage
              </div>
              <div style={{ fontSize:12, color:'#6b7fa3' }}>
                {sdgImpact.summary.coveredSDGs} of{' '}
                {sdgImpact.summary.totalSDGs} UN SDGs aligned
              </div>
            </div>
          </div>
          <div style={{ display:'flex',
            flexDirection:'column', alignItems:'flex-end', gap:6 }}>
            <div style={{ fontSize:20, fontWeight:800,
              color:'#16c79a' }}>
              {sdgImpact.summary.coverageRate}%
            </div>
            <div style={{ width:200, height:8,
              background:'#e2e8f0', borderRadius:4,
              overflow:'hidden' }}>
              <div style={{
                width:`${sdgImpact.summary.coverageRate}%`,
                height:'100%', background:'#16c79a',
                borderRadius:4, transition:'width .5s' }}/>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:8,
        marginBottom:20, flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'9px 18px', borderRadius:8,
              border:'none', cursor:'pointer', fontSize:13,
              fontWeight:600,
              background: tab===t.id ? '#16c79a' : 'white',
              color: tab===t.id ? 'white' : '#6b7fa3',
              boxShadow: tab===t.id
                ? '0 4px 12px rgba(22,199,154,.3)'
                : '0 1px 4px rgba(0,0,0,.06)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div>
          {Object.entries(PILLAR).map(([pillar, cfg]) => {
            const items = metricsByPillar[pillar] || [];
            return (
              <div key={pillar} style={{ background:'white',
                borderRadius:12, border:'1px solid #e2e8f0',
                overflow:'hidden', marginBottom:16,
                boxShadow:'0 2px 8px rgba(13,27,42,.04)' }}>
                <div style={{ padding:'14px 20px',
                  borderBottom:'1px solid #e2e8f0',
                  display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:18 }}>{cfg.icon}</span>
                  <span style={{ fontWeight:700, fontSize:14,
                    color:cfg.color }}>{cfg.label}</span>
                  <span style={{ fontSize:12, color:'#6b7fa3',
                    marginLeft:'auto' }}>
                    {items.length} metric
                    {items.length!==1?'s':''} recorded
                  </span>
                </div>
                {items.length === 0 ? (
                  <div style={{ padding:'24px 20px',
                    textAlign:'center', color:'#6b7fa3',
                    fontSize:13 }}>
                    No {pillar} metrics yet.{' '}
                    <span style={{ color:'#16c79a',
                      cursor:'pointer', fontWeight:600 }}
                      onClick={() => setModal(true)}>
                      Record first metric →
                    </span>
                  </div>
                ) : (
                  <div style={{ padding:'4px 20px 12px' }}>
                    {items.slice(0,5).map((m, i) => (
                      <div key={i} style={{ display:'flex',
                        justifyContent:'space-between',
                        alignItems:'center', padding:'10px 0',
                        borderBottom: i < Math.min(items.length,5)-1
                          ? '1px solid #f4f6f9' : 'none' }}>
                        <div>
                          <div style={{ fontSize:13,
                            fontWeight:500 }}>
                            {m.category_name}
                          </div>
                          <div style={{ fontSize:11,
                            color:'#6b7fa3', marginTop:2 }}>
                            {fmtDate(m.metric_date)}
                            {m.data_source
                              ? ` · ${m.data_source}` : ''}
                          </div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontFamily:'monospace',
                            fontWeight:700, fontSize:15,
                            color:cfg.color }}>
                            {fmtNum(m.value, m.unit)}
                          </div>
                          {m.verified_by_name && (
                            <div style={{ fontSize:10,
                              color:'#16c79a' }}>✓ Verified</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Metrics */}
      {tab === 'metrics' && (
        <div style={{ background:'white', borderRadius:12,
          border:'1px solid #e2e8f0', overflow:'hidden',
          boxShadow:'0 2px 8px rgba(13,27,42,.04)' }}>
          {metrics.length === 0 ? (
            <div style={{ textAlign:'center',
              padding:'60px 20px', color:'#6b7fa3' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🌱</div>
              <p style={{ fontSize:14, fontWeight:600,
                color:'#1a2740', marginBottom:20 }}>
                No ESG metrics recorded yet
              </p>
              <button onClick={() => setModal(true)}
                style={{ padding:'10px 24px',
                  background:'#16c79a', color:'white',
                  border:'none', borderRadius:8, fontSize:13,
                  fontWeight:600, cursor:'pointer' }}>
                + Record First Metric
              </button>
            </div>
          ) : (
            <table style={{ width:'100%',
              borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Date','Category','Pillar','Value',
                    'Source','Verified'].map(h => (
                    <th key={h} style={{ padding:'10px 16px',
                      textAlign:'left', fontSize:10,
                      fontWeight:600, color:'#6b7fa3',
                      textTransform:'uppercase', letterSpacing:.7,
                      background:'#f8fafc',
                      borderBottom:'1px solid #e2e8f0' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, i) => {
                  const cfg = PILLAR[m.pillar]
                    || PILLAR.environmental;
                  return (
                    <tr key={i}
                      style={{ borderBottom:'1px solid #f4f6f9' }}>
                      <td style={{ padding:'12px 16px',
                        color:'#6b7fa3', fontSize:12 }}>
                        {fmtDate(m.metric_date)}
                      </td>
                      <td style={{ padding:'12px 16px',
                        fontWeight:500 }}>
                        {m.category_name}
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ padding:'3px 10px',
                          borderRadius:20, fontSize:11,
                          fontWeight:600,
                          background:cfg.bg, color:cfg.color }}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding:'12px 16px',
                        fontFamily:'monospace', fontWeight:700,
                        color:cfg.color }}>
                        {fmtNum(m.value, m.unit)}
                      </td>
                      <td style={{ padding:'12px 16px',
                        color:'#6b7fa3', fontSize:12 }}>
                        {m.data_source || '—'}
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        {m.verified_by_name ? (
                          <span style={{ fontSize:12,
                            color:'#16c79a', fontWeight:600 }}
                            title={fmtDate(m.verified_at)}>
                            ✓ {m.verified_by_name}
                          </span>
                        ) : m.recorded_by === user?.id ? (
                          <span style={{ fontSize:11,
                            color:'#6b7fa3' }}
                            title="You recorded this — someone else needs to verify it">
                            Pending
                          </span>
                        ) : (
                          <button onClick={() => handleVerify(m.id)}
                            disabled={verifying === m.id}
                            style={{ padding:'4px 12px', borderRadius:6,
                              border:'1px solid #16c79a',
                              background: verifying===m.id ? '#f0f0f0' : 'white',
                              color:'#0ea87f', fontSize:11, fontWeight:600,
                              cursor: verifying===m.id ? 'not-allowed' : 'pointer' }}>
                            {verifying === m.id ? 'Verifying…' : 'Verify'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* SDG Mapping */}
      {tab === 'sdg' && (
        <div>
          {sdgGoals.length === 0 ? (
            <div style={{ background:'white', borderRadius:12,
              border:'1px solid #e2e8f0', textAlign:'center',
              padding:'60px 20px', color:'#6b7fa3' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🌐</div>
              <p style={{ fontSize:14, fontWeight:600,
                color:'#1a2740', marginBottom:6 }}>
                SDG goals not set up yet
              </p>
              <p style={{ fontSize:13 }}>
                Run seed_sustainability_fix.sql in phpMyAdmin
                to load all 17 UN SDGs
              </p>
            </div>
          ) : (
            <>
              <p style={{ fontSize:13, color:'#6b7fa3',
                marginBottom:16 }}>
                All 17 UN Sustainable Development Goals.
                Highlighted goals have linked metrics.
                SDGs are auto-suggested when you record a metric.
              </p>
              <div style={{ display:'grid',
                gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                {sdgGoals.map(sdg => {
                  const hasMetrics =
                    parseInt(sdg.metric_count) > 0;
                  return (
                    <div key={sdg.id}
                      style={{ background:'white',
                        borderRadius:10,
                        border:`2px solid ${hasMetrics
                          ? sdg.color : '#e2e8f0'}`,
                        padding:14, transition:'all .2s',
                        boxShadow: hasMetrics
                          ? `0 4px 16px ${sdg.color}22`
                          : 'none',
                        opacity: hasMetrics ? 1 : .65 }}>
                      <div style={{ display:'flex',
                        alignItems:'center', gap:10,
                        marginBottom:8 }}>
                        <div style={{ width:38, height:38,
                          borderRadius:9,
                          background:sdg.color,
                          display:'flex',
                          flexDirection:'column',
                          alignItems:'center',
                          justifyContent:'center',
                          flexShrink:0 }}>
                          <div style={{ fontSize:12,
                            fontWeight:800, color:'white',
                            lineHeight:1 }}>{sdg.number}</div>
                          <div style={{ fontSize:13,
                            lineHeight:1, marginTop:1 }}>
                            {sdg.icon_emoji}
                          </div>
                        </div>
                        <div style={{ fontSize:11,
                          fontWeight:600, color:'#1a2740',
                          lineHeight:1.3 }}>
                          {sdg.title}
                        </div>
                      </div>
                      <div style={{ fontSize:11,
                        color: hasMetrics
                          ? '#16c79a' : '#6b7fa3',
                        fontWeight: hasMetrics ? 600 : 400 }}>
                        {hasMetrics
                          ? `✓ ${sdg.metric_count} metric${parseInt(sdg.metric_count)!==1?'s':''} linked`
                          : 'No metrics yet'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* SDG Impact Report */}
      {tab === 'impact' && (
        <div style={{ background:'white', borderRadius:12,
          border:'1px solid #e2e8f0', padding:24 }}>
          <div style={{ display:'flex',
            justifyContent:'space-between',
            alignItems:'flex-start', marginBottom:4 }}>
            <div style={{ fontWeight:700, fontSize:16 }}>
              SDG Impact Report
            </div>
            <button onClick={handleExportPdf}
              disabled={exporting}
              style={{ padding:'8px 16px', borderRadius:8,
                border:'none',
                background: exporting ? '#6b7fa3' : '#1e6bbd',
                color:'white', fontSize:12, fontWeight:700,
                cursor: exporting ? 'not-allowed' : 'pointer' }}>
              {exporting ? 'Exporting…' : '⬇ Export PDF'}
            </button>
          </div>
          <p style={{ fontSize:13, color:'#6b7fa3',
            marginBottom:20 }}>
            Your organisation's contribution to the
            UN Sustainable Development Goals.
            Share with donors, investors and
            international partners.
          </p>
          <div style={{ display:'grid',
            gridTemplateColumns:'repeat(4,1fr)',
            gap:12, marginBottom:24 }}>
            {[
              { label:'Total SDGs',
                value:sdgImpact?.summary?.totalSDGs||0,
                color:'#C8102E' },
              { label:'SDGs with Metrics',
                value:sdgImpact?.summary?.coveredSDGs||0,
                color:'#D9A521' },
              { label:'Coverage Rate',
                value:`${sdgImpact?.summary?.coverageRate||0}%`,
                color:'#046A38' },
              { label:'Metrics Linked',
                value:sdgImpact?.summary?.totalMetrics||0,
                color:'#1A1A2E' },
            ].map((s,i) => (
              <div key={i} style={{ background:s.color,
                borderRadius:10, padding:14,
                boxShadow:'0 2px 8px rgba(13,27,42,.1)' }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.75)',
                  marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:22, fontWeight:800,
                  color:'white' }}>{s.value}</div>
              </div>
            ))}
          </div>
          {coveredSDGs.length === 0 ? (
            <div style={{ textAlign:'center',
              padding:'30px 0', color:'#6b7fa3', fontSize:13 }}>
              No SDG metrics linked yet. Record metrics
              and select relevant SDGs to populate this report.
            </div>
          ) : (
            <div style={{ display:'grid',
              gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {coveredSDGs.map(sdg => (
                <div key={sdg.id}
                  style={{ border:`2px solid ${sdg.color}`,
                    borderRadius:10, padding:16,
                    display:'flex', gap:14,
                    alignItems:'center' }}>
                  <div style={{ width:52, height:52,
                    borderRadius:10, background:sdg.color,
                    flexShrink:0, display:'flex',
                    flexDirection:'column',
                    alignItems:'center',
                    justifyContent:'center' }}>
                    <div style={{ fontSize:15,
                      fontWeight:800, color:'white' }}>
                      {sdg.number}
                    </div>
                    <div style={{ fontSize:18 }}>
                      {sdg.icon_emoji}
                    </div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:13,
                      marginBottom:4 }}>{sdg.title}</div>
                    <div style={{ fontSize:11,
                      color:'#16c79a', fontWeight:600 }}>
                      {sdg.metric_count} metric
                      {parseInt(sdg.metric_count)!==1?'s':''}
                      {' '}contributing
                    </div>
                    {sdg.last_updated && (
                      <div style={{ fontSize:10,
                        color:'#6b7fa3', marginTop:2 }}>
                        Last updated:{' '}
                        {fmtDate(sdg.last_updated)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop:20,
            background:'rgba(30,107,189,.05)',
            border:'1px solid rgba(30,107,189,.15)',
            borderRadius:8, padding:12,
            fontSize:12, color:'#1e40af' }}>
            💡 Use "Export PDF" above to generate a shareable
            report — credible for NGO reporting, donor
            submissions and international outreach.
          </div>
        </div>
      )}

      {/* Categories */}
      {tab === 'categories' && (
        <div style={{ display:'grid',
          gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {Object.entries(PILLAR).map(([pillar, cfg]) => (
            <div key={pillar}>
              <div style={{ fontSize:12, fontWeight:700,
                color:cfg.color, marginBottom:10,
                display:'flex', alignItems:'center', gap:6 }}>
                {cfg.icon} {cfg.label.toUpperCase()}
                <span style={{ fontWeight:400,
                  color:'#6b7fa3', marginLeft:4 }}>
                  ({(byPillar[pillar]||[]).length})
                </span>
              </div>
              {(byPillar[pillar]||[]).length === 0 ? (
                <div style={{ background:'white',
                  borderRadius:10, border:'1px solid #e2e8f0',
                  padding:16, color:'#e05c5c', fontSize:12,
                  textAlign:'center' }}>
                  ⚠ Run seed SQL in phpMyAdmin
                </div>
              ) : (
                (byPillar[pillar]||[]).map((cat, i) => (
                  <div key={i} style={{ background:'white',
                    borderRadius:10,
                    border:'1px solid #e2e8f0',
                    padding:'12px 16px', marginBottom:8,
                    boxShadow:'0 1px 4px rgba(13,27,42,.04)' }}>
                    <div style={{ fontWeight:600,
                      fontSize:13, marginBottom:4 }}>
                      {cat.name}
                    </div>
                    {cat.description && (
                      <div style={{ fontSize:11,
                        color:'#6b7fa3', marginBottom:6,
                        lineHeight:1.5 }}>
                        {cat.description}
                      </div>
                    )}
                    <div style={{ fontSize:11,
                      color:cfg.color, fontWeight:600 }}>
                      {cat.metric_count||0} metric
                      {parseInt(cat.metric_count||0)!==1
                        ?'s':''} recorded
                    </div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {/* Record Metric Modal */}
      <Modal open={modal}
        onClose={() => setModal(false)}
        title="Record ESG Metric">
        <div>
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Category *</label>
            <select style={inp} value={form.categoryId}
              onChange={e =>
                handleCategoryChange(e.target.value)}>
              <option value="">Select category...</option>
              {Object.entries(PILLAR).map(([pillar, cfg]) => (
                <optgroup key={pillar}
                  label={`${cfg.icon} ${cfg.label}`}>
                  {(byPillar[pillar]||[]).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {categories.length === 0 && (
              <p style={{ fontSize:11, color:'#e05c5c',
                marginTop:4 }}>
                ⚠ Run seed_sustainability_fix.sql in
                phpMyAdmin to add categories first.
              </p>
            )}
          </div>

          {/* SDG auto-suggestions */}
          {suggested.length > 0 && (
            <div style={{ background:'rgba(22,199,154,.05)',
              border:'1px solid rgba(22,199,154,.25)',
              borderRadius:8, padding:12, marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700,
                color:'#0ea87f', marginBottom:8,
                textTransform:'uppercase', letterSpacing:.5 }}>
                🌐 Suggested SDGs — click to link
              </div>
              <div style={{ display:'flex',
                flexWrap:'wrap', gap:8 }}>
                {suggested.map(sdg => {
                  const sel = form.selectedSDGs
                    .includes(sdg.id);
                  return (
                    <div key={sdg.id}
                      onClick={() => toggleSDG(sdg.id)}
                      style={{ display:'flex',
                        alignItems:'center', gap:6,
                        padding:'5px 10px', borderRadius:20,
                        cursor:'pointer',
                        border:`1.5px solid ${sel
                          ? sdg.color : '#e2e8f0'}`,
                        background: sel
                          ? sdg.color+'15' : 'white',
                        transition:'all .2s' }}>
                      <div style={{ width:22, height:22,
                        borderRadius:5,
                        background:sdg.color,
                        display:'flex', alignItems:'center',
                        justifyContent:'center',
                        fontSize:9, fontWeight:800,
                        color:'white', flexShrink:0 }}>
                        {sdg.number}
                      </div>
                      <span style={{ fontSize:11,
                        fontWeight: sel ? 600 : 400,
                        color: sel ? sdg.color : '#1a2740' }}>
                        {sdg.title.length > 22
                          ? sdg.title.slice(0,22)+'…'
                          : sdg.title}
                      </span>
                      {sel && (
                        <span style={{ color:sdg.color,
                          fontSize:13, fontWeight:700 }}>
                          ✓
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {form.selectedSDGs.length > 0 && (
                <div style={{ fontSize:11, color:'#0ea87f',
                  fontWeight:600, marginTop:8 }}>
                  ✓ {form.selectedSDGs.length} SDG
                  {form.selectedSDGs.length!==1?'s':''}
                  {' '}selected
                </div>
              )}
            </div>
          )}

          <div style={g2}>
            <div>
              <label style={lbl}>Metric Date *</label>
              <input style={inp} type="date"
                value={form.metricDate}
                onChange={e =>
                  upd('metricDate', e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>Unit of Measure</label>
              <input style={inp}
                placeholder="e.g. tCO2e, kWh, m³"
                value={form.unit}
                onChange={e => upd('unit', e.target.value)}/>
            </div>
          </div>

          <div style={{ marginTop:14 }}>
            <label style={lbl}>Value *</label>
            <input style={inp} type="number" step="0.01"
              placeholder="e.g. 125.50"
              value={form.value}
              onChange={e => upd('value', e.target.value)}/>
          </div>

          <div style={{ marginTop:14 }}>
            <label style={lbl}>Data Source</label>
            <input style={inp}
              placeholder="e.g. Electricity bills"
              value={form.dataSource}
              onChange={e =>
                upd('dataSource', e.target.value)}/>
            <p style={{ fontSize:11, color:'#6b7fa3', marginTop:6 }}>
              Verification happens as a separate step after recording —
              anyone but you can verify this from the Metrics tab.
            </p>
          </div>

          <div style={{ marginTop:14 }}>
            <label style={lbl}>Notes</label>
            <textarea
              style={{ ...inp, height:60, resize:'vertical' }}
              placeholder="Additional notes..."
              value={form.notes}
              onChange={e => upd('notes', e.target.value)}/>
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
                background:saving ? '#6b7fa3' : '#16c79a',
                color:'white', fontSize:13, fontWeight:700,
                cursor:saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving...' : 'Record Metric'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
