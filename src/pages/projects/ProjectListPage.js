// ============================================================
//  src/pages/projects/ProjectListPage.js
// ============================================================
import { useState, useEffect } from 'react';
import api from '../../api/client';

const fmtCur = (n) => `GHS ${new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2 }).format(n || 0)}`;

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', {
      day:'2-digit', month:'short', year:'numeric' })
  : '—';

const STATUS_COLOR = {
  planning:  { color:'#6b7fa3', bg:'rgba(107,127,163,.1)' },
  active:    { color:'#16c79a', bg:'rgba(22,199,154,.1)'  },
  on_hold:   { color:'#e8a04a', bg:'rgba(232,160,74,.1)'  },
  completed: { color:'#1e6bbd', bg:'rgba(30,107,189,.1)'  },
  cancelled: { color:'#e05c5c', bg:'rgba(224,92,92,.1)'   },
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
        width:'100%', maxWidth:560, maxHeight:'90vh',
        overflow:'auto',
        boxShadow:'0 20px 60px rgba(13,27,42,.25)' }}>
        <div style={{ display:'flex', alignItems:'center',
          justifyContent:'space-between',
          padding:'18px 24px',
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

export default function ProjectListPage() {
  const [projects,  setProjects]  = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [filter,    setFilter]    = useState('all');

  const [form, setForm] = useState({
    projectCode:'', name:'', description:'',
    customerId:'', startDate:'', endDate:'',
    budgetAmount:0, currency:'GHS', status:'planning',
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/projects'),
      api.get('/customers'),
    ]).then(([p, c]) => {
      setProjects(p.data || []);
      setCustomers(c.data || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleCreate = async () => {
    if (!form.projectCode)
      return alert('Project Code is required');
    if (!form.name)
      return alert('Project Name is required');
    setSaving(true);
    try {
      await api.post('/projects', form);
      load();
      setModal(false);
      setForm({ projectCode:'', name:'', description:'',
        customerId:'', startDate:'', endDate:'',
        budgetAmount:0, currency:'GHS', status:'planning' });
    } catch (err) {
      alert(err.message || 'Failed to create project');
    } finally { setSaving(false); }
  };

  const filtered = filter === 'all'
    ? projects
    : projects.filter(p => p.status === filter);

  const totalBudget = projects.reduce((s,p) =>
    s + parseFloat(p.budget_amount || 0), 0);
  const activeCount = projects.filter(
    p => p.status === 'active').length;
  const completedCount = projects.filter(
    p => p.status === 'completed').length;

  const inp = { width:'100%', padding:'9px 12px',
    border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13,
    fontFamily:'sans-serif', background:'#f9fafb',
    outline:'none' };
  const lbl = { display:'block', fontSize:11, fontWeight:600,
    color:'#1a2740', marginBottom:6 };
  const g2  = { display:'grid',
    gridTemplateColumns:'1fr 1fr', gap:14 };

  const STATUSES = [
    'all','planning','active','on_hold','completed','cancelled'
  ];

  return (
    <div style={{ fontFamily:'sans-serif' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between',
        alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700,
            color:'#1a2740', marginBottom:4 }}>Projects</h1>
          <p style={{ fontSize:13, color:'#6b7fa3' }}>
            Track project profitability, budgets
            and resources
          </p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ padding:'10px 20px', background:'#1e6bbd',
            color:'white', border:'none', borderRadius:8,
            fontSize:13, fontWeight:700, cursor:'pointer' }}>
          + New Project
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid',
        gridTemplateColumns:'repeat(4,1fr)',
        gap:12, marginBottom:20 }}>
        {[
          { label:'Total Projects',
            value:projects.length, color:'#1e6bbd' },
          { label:'Total Budget',
            value:fmtCur(totalBudget), color:'#1a2740' },
          { label:'Active',
            value:activeCount, color:'#16c79a' },
          { label:'Completed',
            value:completedCount, color:'#6b7fa3' },
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

      {/* Status filter pills */}
      <div style={{ display:'flex', gap:8,
        marginBottom:20, flexWrap:'wrap' }}>
        {STATUSES.map(s => {
          const sc = STATUS_COLOR[s] || {
            color:'#1e6bbd', bg:'rgba(30,107,189,.1)' };
          const isActive = filter === s;
          return (
            <button key={s} onClick={() => setFilter(s)}
              style={{ padding:'7px 16px', borderRadius:20,
                border:'none', cursor:'pointer', fontSize:12,
                fontWeight:600, transition:'all .2s',
                background: isActive
                  ? (s==='all' ? '#1e6bbd' : sc.color)
                  : 'white',
                color: isActive ? 'white'
                  : (s==='all' ? '#1e6bbd' : sc.color),
                boxShadow: isActive
                  ? '0 2px 8px rgba(0,0,0,.15)'
                  : '0 1px 4px rgba(0,0,0,.06)' }}>
              {s==='all' ? 'All Projects'
                : s.replace('_',' ').replace(/^\w/,
                  c => c.toUpperCase())}
              {s !== 'all' && (
                <span style={{ marginLeft:6,
                  opacity:.7 }}>
                  ({projects.filter(
                    p=>p.status===s).length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Project Cards Grid */}
      {loading ? (
        <div style={{ textAlign:'center',
          padding:60, color:'#6b7fa3' }}>
          <div style={{ width:28, height:28,
            border:'3px solid #e2e8f0',
            borderTopColor:'#1e6bbd', borderRadius:'50%',
            animation:'spin .7s linear infinite',
            margin:'0 auto 12px' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          Loading projects...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background:'white', borderRadius:12,
          border:'1px solid #e2e8f0',
          boxShadow:'0 2px 8px rgba(13,27,42,.04)',
          textAlign:'center', padding:'60px 20px',
          color:'#6b7fa3' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📁</div>
          <p style={{ fontSize:15, fontWeight:600,
            color:'#1a2740', marginBottom:6 }}>
            {filter !== 'all'
              ? `No ${filter} projects`
              : 'No projects yet'}
          </p>
          <p style={{ fontSize:13, marginBottom:20 }}>
            {filter !== 'all'
              ? 'Try a different filter'
              : 'Create your first project to start tracking'}
          </p>
          {filter === 'all' && (
            <button onClick={() => setModal(true)}
              style={{ padding:'10px 24px',
                background:'#1e6bbd', color:'white',
                border:'none', borderRadius:8, fontSize:13,
                fontWeight:600, cursor:'pointer' }}>
              + Create First Project
            </button>
          )}
        </div>
      ) : (
        <div style={{ display:'grid',
          gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
          {filtered.map((proj, i) => {
            const budget  = parseFloat(
              proj.budget_amount || 0);
            const spent   = parseFloat(
              proj.total_spent || 0);
            const pct     = budget > 0
              ? Math.min(100, (spent/budget)*100) : 0;
            const sc = STATUS_COLOR[proj.status]
              || STATUS_COLOR.planning;
            return (
              <div key={i} style={{ background:'white',
                borderRadius:12, border:'1px solid #e2e8f0',
                boxShadow:'0 2px 8px rgba(13,27,42,.04)',
                overflow:'hidden',
                transition:'transform .2s, box-shadow .2s',
                cursor:'pointer' }}>
                {/* Color top bar */}
                <div style={{ height:4,
                  background:sc.color }}/>
                <div style={{ padding:20 }}>
                  {/* Status badge */}
                  <div style={{ display:'flex',
                    justifyContent:'space-between',
                    alignItems:'flex-start',
                    marginBottom:12 }}>
                    <div style={{ width:40, height:40,
                      borderRadius:10,
                      background:'rgba(30,107,189,.1)',
                      display:'flex', alignItems:'center',
                      justifyContent:'center',
                      fontSize:18 }}>📁</div>
                    <span style={{ padding:'3px 10px',
                      borderRadius:20, fontSize:11,
                      fontWeight:600,
                      background:sc.bg, color:sc.color }}>
                      {proj.status?.replace('_',' ')}
                    </span>
                  </div>

                  <div style={{ fontWeight:700, fontSize:15,
                    marginBottom:4 }}>{proj.name}</div>
                  <div style={{ fontSize:11,
                    color:'#6b7fa3', fontFamily:'monospace',
                    marginBottom:10 }}>
                    {proj.project_code}
                  </div>

                  {proj.description && (
                    <div style={{ fontSize:12, color:'#6b7fa3',
                      marginBottom:14, lineHeight:1.6,
                      overflow:'hidden',
                      display:'-webkit-box',
                      WebkitLineClamp:2,
                      WebkitBoxOrient:'vertical' }}>
                      {proj.description}
                    </div>
                  )}

                  {/* Budget bar */}
                  <div style={{ marginBottom:14 }}>
                    <div style={{ display:'flex',
                      justifyContent:'space-between',
                      fontSize:11, marginBottom:5 }}>
                      <span style={{ color:'#6b7fa3' }}>
                        Budget Used
                      </span>
                      <span style={{ fontWeight:700,
                        color: pct > 90
                          ? '#e05c5c' : '#1a2740' }}>
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div style={{ background:'#e2e8f0',
                      borderRadius:4, height:6,
                      overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`,
                        height:'100%', borderRadius:4,
                        background: pct > 90
                          ? '#e05c5c'
                          : pct > 70 ? '#e8a04a' : '#1e6bbd',
                        transition:'width .5s' }}/>
                    </div>
                    <div style={{ display:'flex',
                      justifyContent:'space-between',
                      fontSize:10, color:'#6b7fa3',
                      marginTop:4 }}>
                      <span>
                        Spent: {fmtCur(spent)}
                      </span>
                      <span>
                        Budget: {fmtCur(budget)}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ display:'flex', gap:12,
                    fontSize:11, color:'#6b7fa3',
                    paddingTop:12,
                    borderTop:'1px solid #f4f6f9' }}>
                    {proj.customer_name && (
                      <span>👥 {proj.customer_name}</span>
                    )}
                    {proj.end_date && (
                      <span>📅 {fmtDate(proj.end_date)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Project Modal */}
      <Modal open={modal}
        onClose={() => setModal(false)}
        title="New Project">
        <div>
          <div style={g2}>
            <div>
              <label style={lbl}>Project Name *</label>
              <input style={inp}
                placeholder="e.g. Office Renovation"
                value={form.name}
                onChange={e=>upd('name',e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>Project Code *</label>
              <input style={inp} placeholder="e.g. PROJ-001"
                value={form.projectCode}
                onChange={e=>upd('projectCode',
                  e.target.value)}/>
            </div>
          </div>

          <div style={{ marginTop:14 }}>
            <label style={lbl}>Description</label>
            <textarea
              style={{ ...inp, height:70, resize:'vertical' }}
              placeholder="Project description..."
              value={form.description}
              onChange={e=>upd('description',e.target.value)}/>
          </div>

          <div style={{ ...g2, marginTop:14 }}>
            <div>
              <label style={lbl}>Customer (optional)</label>
              <select style={inp} value={form.customerId}
                onChange={e=>upd('customerId',e.target.value)}>
                <option value="">— No Customer —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Status</label>
              <select style={inp} value={form.status}
                onChange={e=>upd('status',e.target.value)}>
                {['planning','active','on_hold',
                  'completed','cancelled'].map(s => (
                  <option key={s} value={s}>
                    {s.replace('_',' ').replace(/^\w/,
                      c=>c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ ...g2, marginTop:14 }}>
            <div>
              <label style={lbl}>Start Date</label>
              <input style={inp} type="date"
                value={form.startDate}
                onChange={e=>upd('startDate',e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>End Date</label>
              <input style={inp} type="date"
                value={form.endDate}
                onChange={e=>upd('endDate',e.target.value)}/>
            </div>
          </div>

          <div style={{ ...g2, marginTop:14 }}>
            <div>
              <label style={lbl}>Budget Amount</label>
              <input style={inp} type="number" step="0.01"
                placeholder="0.00"
                value={form.budgetAmount}
                onChange={e=>upd('budgetAmount',
                  e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>Currency</label>
              <select style={inp} value={form.currency}
                onChange={e=>upd('currency',e.target.value)}>
                {['GHS','USD','EUR','GBP'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
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
              {saving?'Creating...':'Create Project'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
