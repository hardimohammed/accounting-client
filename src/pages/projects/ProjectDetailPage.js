// ============================================================
//  src/pages/projects/ProjectDetailPage.js
//  Was a Stub placeholder — project cards on ProjectListPage.js
//  didn't even navigate anywhere. Profitability (budget vs actual
//  cost/revenue), team resource assignment, and timesheet logging
//  all lived only in services.js as an unimplemented contract.
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
        width:'100%', maxWidth:480, maxHeight:'90vh',
        overflow:'auto',
        boxShadow:'0 20px 60px rgba(13,27,42,.25)' }}>
        <div style={{ display:'flex', alignItems:'center',
          justifyContent:'space-between',
          padding:'18px 24px',
          borderBottom:'1px solid #e2e8f0' }}>
          <span style={{ fontSize:16, fontWeight:700 }}>{title}</span>
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

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project,  setProject]  = useState(null);
  const [profit,   setProfit]   = useState(null);
  const [resources,setResources]= useState([]);
  const [timesheets,setTimesheets] = useState([]);
  const [staff,    setStaff]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [resModal, setResModal] = useState(false);
  const [tsModal,  setTsModal]  = useState(false);

  const [resForm, setResForm] = useState({ userId:'', role:'', hourlyRate:0, allocatedHours:0 });
  const [tsForm,  setTsForm]  = useState({
    userId:'', workDate: new Date().toISOString().slice(0,10),
    hoursWorked:'', description:'', isBillable:true,
  });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/projects/${id}/profitability`).catch(() => ({ data:null })),
      api.get(`/projects/${id}/resources`).catch(() => ({ data:[] })),
      api.get('/projects/timesheets', { params:{ projectId:id } }).catch(() => ({ data:[] })),
      api.get('/users').catch(() => ({ data:[] })),
    ]).then(([p, pr, res, ts, u]) => {
      setProject(p.data);
      setProfit(pr.data);
      setResources(res.data || []);
      setTimesheets(ts.data || []);
      setStaff(u.data || []);
    }).catch(err => alert(err.message || 'Failed to load project'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleAddResource = async () => {
    if (!resForm.userId) return alert('Select a person');
    setSaving(true);
    try {
      await api.post(`/projects/${id}/resources`, resForm);
      load();
      setResModal(false);
      setResForm({ userId:'', role:'', hourlyRate:0, allocatedHours:0 });
    } catch (err) {
      alert(err.message || 'Failed to add resource');
    } finally { setSaving(false); }
  };

  const handleRemoveResource = async (userId) => {
    if (!window.confirm('Remove this person from the project?')) return;
    try {
      await api.delete(`/projects/${id}/resources/${userId}`);
      load();
    } catch (err) {
      alert(err.message || 'Failed to remove resource');
    }
  };

  const handleLogTimesheet = async () => {
    if (!tsForm.userId) return alert('Select who worked');
    if (!tsForm.hoursWorked || parseFloat(tsForm.hoursWorked) <= 0)
      return alert('Hours worked must be greater than 0');
    setSaving(true);
    try {
      await api.post('/projects/timesheets', { ...tsForm, projectId: id });
      load();
      setTsModal(false);
      setTsForm({
        userId:'', workDate: new Date().toISOString().slice(0,10),
        hoursWorked:'', description:'', isBillable:true,
      });
    } catch (err) {
      alert(err.message || 'Failed to log timesheet');
    } finally { setSaving(false); }
  };

  const inp = { width:'100%', padding:'9px 12px',
    border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13,
    fontFamily:'sans-serif', background:'#f9fafb', outline:'none' };
  const lbl = { display:'block', fontSize:11, fontWeight:600,
    color:'#1a2740', marginBottom:6 };
  const card = { background:'white', borderRadius:12,
    border:'1px solid #e2e8f0', boxShadow:'0 2px 8px rgba(13,27,42,.04)' };

  if (loading) {
    return (
      <div style={{ textAlign:'center', padding:60, color:'#6b7fa3' }}>
        Loading project...
      </div>
    );
  }
  if (!project) {
    return (
      <div style={{ textAlign:'center', padding:60, color:'#6b7fa3' }}>
        Project not found.
      </div>
    );
  }

  const sc = STATUS_COLOR[project.status] || STATUS_COLOR.planning;
  const assignedUserIds = new Set(resources.map(r => r.user_id));
  const availableStaff = staff.filter(u => !assignedUserIds.has(u.id));

  return (
    <div style={{ fontFamily:'sans-serif' }}>
      <button onClick={() => navigate('/projects')}
        style={{ background:'none', border:'none', color:'#6b7fa3',
          fontSize:13, cursor:'pointer', marginBottom:12, padding:0 }}>
        ← Back to Projects
      </button>

      <div style={{ display:'flex', justifyContent:'space-between',
        alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <h1 style={{ fontSize:22, fontWeight:700, color:'#1a2740' }}>
              {project.name}
            </h1>
            <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11,
              fontWeight:600, background:sc.bg, color:sc.color }}>
              {project.status?.replace('_',' ')}
            </span>
          </div>
          <div style={{ fontSize:12, color:'#6b7fa3', fontFamily:'monospace', marginTop:4 }}>
            {project.project_code}
            {project.customer_name && ` · 👥 ${project.customer_name}`}
          </div>
          {project.description && (
            <p style={{ fontSize:13, color:'#6b7fa3', marginTop:8, maxWidth:600 }}>
              {project.description}
            </p>
          )}
        </div>
      </div>

      {/* Profitability */}
      {profit && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)',
          gap:12, marginBottom:20 }}>
          {[
            { label:'Budget', value:fmtCur(profit.budget), color:'#1a2740' },
            { label:'Total Cost', value:fmtCur(profit.totalCost), color:'#e8a04a' },
            { label:'Total Revenue', value:fmtCur(profit.totalRevenue), color:'#16c79a' },
            { label:'Profit / Loss', value:fmtCur(profit.profit),
              color: profit.profit >= 0 ? '#16c79a' : '#e05c5c' },
            { label:'Budget Remaining', value:fmtCur(profit.budgetRemaining),
              color: profit.budgetRemaining >= 0 ? '#1a2740' : '#e05c5c' },
          ].map((s,i) => (
            <div key={i} style={{ ...card, padding:16 }}>
              <div style={{ fontSize:11, color:'#6b7fa3', fontWeight:500, marginBottom:6 }}>
                {s.label}
              </div>
              <div style={{ fontSize:17, fontWeight:700, color:s.color }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}
      {profit && (profit.billCosts === 0 && profit.totalRevenue === 0) && (
        <div style={{ background:'#f0f9ff', border:'1px solid #93c5fd',
          borderRadius:8, padding:12, marginBottom:20, fontSize:12, color:'#1e40af' }}>
          ℹ️ Bill/invoice costs and revenue aren't tagged to this project yet —
          only labor cost (from logged hours) factors into the numbers above so far.
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* Resources */}
        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between',
            alignItems:'center', padding:'16px 20px', borderBottom:'1px solid #f4f6f9' }}>
            <span style={{ fontWeight:700, fontSize:14 }}>Team</span>
            <button onClick={() => setResModal(true)}
              style={{ padding:'6px 14px', borderRadius:8,
                border:'none', background:'#1e6bbd', color:'white',
                fontSize:12, fontWeight:600, cursor:'pointer' }}>
              + Add Person
            </button>
          </div>
          <div style={{ padding: resources.length ? 0 : 20 }}>
            {resources.length === 0 ? (
              <p style={{ fontSize:13, color:'#6b7fa3', textAlign:'center' }}>
                No one assigned yet.
              </p>
            ) : resources.map(r => (
              <div key={r.id} style={{ display:'flex', justifyContent:'space-between',
                alignItems:'center', padding:'12px 20px',
                borderBottom:'1px solid #f4f6f9' }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13 }}>
                    {r.first_name} {r.last_name}
                  </div>
                  <div style={{ fontSize:11, color:'#6b7fa3' }}>
                    {r.role || 'No role set'} · {fmtCur(r.hourly_rate)}/hr
                  </div>
                  <div style={{ fontSize:11, color:'#6b7fa3' }}>
                    {parseFloat(r.actual_hours).toFixed(1)}h / {parseFloat(r.allocated_hours).toFixed(1)}h allocated
                  </div>
                </div>
                <button onClick={() => handleRemoveResource(r.user_id)}
                  style={{ padding:'4px 10px', borderRadius:6,
                    border:'1px solid #f8b4b4', background:'white',
                    color:'#c04040', fontSize:11, fontWeight:600,
                    cursor:'pointer' }}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Timesheets */}
        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between',
            alignItems:'center', padding:'16px 20px', borderBottom:'1px solid #f4f6f9' }}>
            <span style={{ fontWeight:700, fontSize:14 }}>Timesheets</span>
            <button onClick={() => setTsModal(true)}
              disabled={resources.length === 0}
              title={resources.length === 0 ? 'Add someone to the team first' : ''}
              style={{ padding:'6px 14px', borderRadius:8,
                border:'none',
                background: resources.length === 0 ? '#6b7fa3' : '#16c79a',
                color:'white', fontSize:12, fontWeight:600,
                cursor: resources.length === 0 ? 'not-allowed' : 'pointer' }}>
              + Log Hours
            </button>
          </div>
          <div style={{ padding: timesheets.length ? 0 : 20, maxHeight:360, overflowY:'auto' }}>
            {timesheets.length === 0 ? (
              <p style={{ fontSize:13, color:'#6b7fa3', textAlign:'center' }}>
                No hours logged yet.
              </p>
            ) : timesheets.map(t => (
              <div key={t.id} style={{ padding:'12px 20px',
                borderBottom:'1px solid #f4f6f9' }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontWeight:600, fontSize:13 }}>
                    {t.first_name} {t.last_name}
                  </span>
                  <span style={{ fontSize:12, fontFamily:'monospace' }}>
                    {parseFloat(t.hours_worked).toFixed(1)}h
                  </span>
                </div>
                <div style={{ fontSize:11, color:'#6b7fa3', marginTop:2 }}>
                  {fmtDate(t.work_date)}
                  {!t.is_billable && ' · Non-billable'}
                  {t.description && ` · ${t.description}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Resource Modal */}
      <Modal open={resModal} onClose={() => setResModal(false)} title="Add Person to Project">
        <div>
          <div>
            <label style={lbl}>Person *</label>
            <select style={inp} value={resForm.userId}
              onChange={e=>setResForm(p=>({...p,userId:e.target.value}))}>
              <option value="">Select…</option>
              {availableStaff.map(u => (
                <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
              ))}
            </select>
          </div>
          <div style={{ marginTop:14 }}>
            <label style={lbl}>Role</label>
            <input style={inp} placeholder="e.g. Carpenter"
              value={resForm.role}
              onChange={e=>setResForm(p=>({...p,role:e.target.value}))}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginTop:14 }}>
            <div>
              <label style={lbl}>Hourly Rate</label>
              <input style={inp} type="number" step="0.01"
                value={resForm.hourlyRate}
                onChange={e=>setResForm(p=>({...p,hourlyRate:e.target.value}))}/>
            </div>
            <div>
              <label style={lbl}>Allocated Hours</label>
              <input style={inp} type="number" step="0.5"
                value={resForm.allocatedHours}
                onChange={e=>setResForm(p=>({...p,allocatedHours:e.target.value}))}/>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:24 }}>
            <button onClick={() => setResModal(false)}
              style={{ padding:'10px 20px', borderRadius:8,
                border:'1px solid #e2e8f0', background:'white',
                color:'#6b7fa3', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Cancel
            </button>
            <button onClick={handleAddResource} disabled={saving}
              style={{ padding:'10px 20px', borderRadius:8, border:'none',
                background:saving?'#6b7fa3':'#1e6bbd', color:'white',
                fontSize:13, fontWeight:700, cursor:saving?'not-allowed':'pointer' }}>
              {saving?'Adding...':'Add'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Log Timesheet Modal */}
      <Modal open={tsModal} onClose={() => setTsModal(false)} title="Log Hours">
        <div>
          <div>
            <label style={lbl}>Person *</label>
            <select style={inp} value={tsForm.userId}
              onChange={e=>setTsForm(p=>({...p,userId:e.target.value}))}>
              <option value="">Select…</option>
              {resources.map(r => (
                <option key={r.user_id} value={r.user_id}>{r.first_name} {r.last_name}</option>
              ))}
            </select>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginTop:14 }}>
            <div>
              <label style={lbl}>Date *</label>
              <input style={inp} type="date"
                value={tsForm.workDate}
                onChange={e=>setTsForm(p=>({...p,workDate:e.target.value}))}/>
            </div>
            <div>
              <label style={lbl}>Hours *</label>
              <input style={inp} type="number" step="0.25"
                value={tsForm.hoursWorked}
                onChange={e=>setTsForm(p=>({...p,hoursWorked:e.target.value}))}/>
            </div>
          </div>
          <div style={{ marginTop:14 }}>
            <label style={lbl}>Description</label>
            <input style={inp} placeholder="What was worked on"
              value={tsForm.description}
              onChange={e=>setTsForm(p=>({...p,description:e.target.value}))}/>
          </div>
          <label style={{ display:'flex', alignItems:'center', gap:8,
            marginTop:14, fontSize:13, color:'#1a2740', cursor:'pointer' }}>
            <input type="checkbox" checked={tsForm.isBillable}
              onChange={e=>setTsForm(p=>({...p,isBillable:e.target.checked}))}/>
            Billable to customer
          </label>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:24 }}>
            <button onClick={() => setTsModal(false)}
              style={{ padding:'10px 20px', borderRadius:8,
                border:'1px solid #e2e8f0', background:'white',
                color:'#6b7fa3', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Cancel
            </button>
            <button onClick={handleLogTimesheet} disabled={saving}
              style={{ padding:'10px 20px', borderRadius:8, border:'none',
                background:saving?'#6b7fa3':'#16c79a', color:'white',
                fontSize:13, fontWeight:700, cursor:saving?'not-allowed':'pointer' }}>
              {saving?'Saving...':'Log Hours'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
