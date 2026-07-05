// ============================================================
//  src/pages/assets/AssetListPage.js
// ============================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

const fmtCur = (n) => `GHS ${new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2 }).format(n || 0)}`;

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

function Modal({ open, onClose, title, children, width = 500 }) {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0,
      background:'rgba(13,27,42,.5)', display:'flex',
      alignItems:'center', justifyContent:'center',
      zIndex:9999, padding:20 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'white', borderRadius:14,
        width:'100%', maxWidth:width, maxHeight:'90vh',
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

function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const color = pct > 90 ? '#e05c5c'
    : pct > 70 ? '#e8a04a' : '#1e6bbd';
  return (
    <div style={{ background:'#e2e8f0', borderRadius:4,
      height:7, overflow:'hidden', flex:1 }}>
      <div style={{ width:`${pct}%`, height:'100%',
        background:color, borderRadius:4,
        transition:'width .5s' }}/>
    </div>
  );
}

export default function AssetListPage() {
  const navigate = useNavigate();
  const [assets,     setAssets]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts,   setAccounts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(false);
  const [depModal,   setDepModal]   = useState(false);
  const [catModal,   setCatModal]   = useState(false);
  const [disposeAsset, setDisposeAsset] = useState(null);
  const [scheduleAsset, setScheduleAsset] = useState(null);
  const [schedule,   setSchedule]   = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [depPeriod,  setDepPeriod]  = useState({
    from:'', to:'' });
  const [newCat, setNewCat] = useState({
    name:'', usefulLifeMonths:60, depreciationMethod:'straight_line',
    assetAccountId:'', accumDepAccountId:'', depExpenseAccountId:'',
  });
  const [disposeForm, setDisposeForm] = useState({
    disposalDate: new Date().toISOString().slice(0,10),
    disposalAmount:0, disposalNotes:'',
  });

  const [form, setForm] = useState({
    assetCode:'', name:'', description:'',
    categoryId:'', serialNumber:'', location:'',
    acquisitionDate: new Date().toISOString().slice(0,10),
    acquisitionCost:0, residualValue:0,
    usefulLifeMonths:60,
    depreciationMethod:'straight_line',
    currency:'GHS',
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/assets'),
      api.get('/assets/categories').catch(() => ({ data:[] })),
      api.get('/accounts').catch(() => ({ data:[] })),
    ]).then(([a, c, acc]) => {
      setAssets(a.data || []);
      setCategories(c.data || []);
      setAccounts(acc.data || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleCreate = async () => {
    if (!form.assetCode) return alert('Asset Code is required');
    if (!form.name)      return alert('Asset Name is required');
    if (!form.categoryId) return alert('Category is required');
    if (!form.acquisitionDate)
      return alert('Acquisition Date is required');
    setSaving(true);
    try {
      await api.post('/assets', form);
      load();
      setModal(false);
      setForm({
        assetCode:'', name:'', description:'',
        categoryId:'', serialNumber:'', location:'',
        acquisitionDate: new Date().toISOString().slice(0,10),
        acquisitionCost:0, residualValue:0,
        usefulLifeMonths:60,
        depreciationMethod:'straight_line',
        currency:'GHS',
      });
    } catch (err) {
      alert(err.message || 'Failed to add asset');
    } finally { setSaving(false); }
  };

  const handleCreateCategory = async () => {
    if (!newCat.name) return alert('Category name is required');
    if (!newCat.depExpenseAccountId || !newCat.accumDepAccountId)
      return alert('Depreciation Expense and Accumulated Depreciation accounts are required — without them, Run Depreciation has nowhere to post for this category');
    setSaving(true);
    try {
      const res = await api.post('/assets/categories', newCat);
      const created = await api.get('/assets/categories');
      setCategories(created.data || []);
      upd('categoryId', String(res.data.id));
      setCatModal(false);
      setNewCat({
        name:'', usefulLifeMonths:60, depreciationMethod:'straight_line',
        assetAccountId:'', accumDepAccountId:'', depExpenseAccountId:'',
      });
    } catch (err) {
      alert(err.message || 'Failed to create category');
    } finally { setSaving(false); }
  };

  const openDispose = (asset) => {
    setDisposeForm({
      disposalDate: new Date().toISOString().slice(0,10),
      disposalAmount:0, disposalNotes:'',
    });
    setDisposeAsset(asset);
  };

  const handleDispose = async () => {
    if (!disposeForm.disposalDate) return alert('Disposal date is required');
    setSaving(true);
    try {
      await api.post(`/assets/${disposeAsset.id}/dispose`, disposeForm);
      load();
      setDisposeAsset(null);
    } catch (err) {
      alert(err.message || 'Failed to dispose asset');
    } finally { setSaving(false); }
  };

  const openSchedule = async (asset) => {
    setScheduleAsset(asset);
    setSchedule([]);
    try {
      const res = await api.get(`/assets/${asset.id}/schedule`);
      setSchedule(res.data || []);
    } catch { /* leave empty */ }
  };

  // Stats
  const activeAssets = assets.filter(a => a.status === 'active');
  const totalCost    = assets.reduce((s,a) =>
    s + parseFloat(a.acquisition_cost || 0), 0);
  const totalBV      = assets.reduce((s,a) =>
    s + parseFloat(a.book_value || a.acquisition_cost || 0), 0);
  const totalDep     = totalCost - totalBV;

  // Annual depreciation preview
  const annualDep = () => {
    const cost  = parseFloat(form.acquisitionCost) || 0;
    const resid = parseFloat(form.residualValue)   || 0;
    const life  = (parseInt(form.usefulLifeMonths) || 1) / 12;
    return life > 0 ? (cost - resid) / life : 0;
  };

  const inp = { width:'100%', padding:'9px 12px',
    border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13,
    fontFamily:'sans-serif', background:'#f9fafb',
    outline:'none' };
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
            color:'#1a2740', marginBottom:4 }}>Fixed Assets</h1>
          <p style={{ fontSize:13, color:'#6b7fa3' }}>
            IAS 16 / IAS 38 compliant asset register
            with automated depreciation
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button
            onClick={() => setDepModal(true)}
            style={{ padding:'10px 18px', borderRadius:8,
              border:'1px solid #16c79a', background:'white',
              color:'#16c79a', fontSize:13,
              fontWeight:600, cursor:'pointer' }}>
            ▶ Run Depreciation
          </button>
          <button onClick={() => setModal(true)}
            style={{ padding:'10px 20px', background:'#1e6bbd',
              color:'white', border:'none', borderRadius:8,
              fontSize:13, fontWeight:700, cursor:'pointer' }}>
            + Add Asset
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid',
        gridTemplateColumns:'repeat(4,1fr)',
        gap:12, marginBottom:20 }}>
        {[
          { label:'Active Assets',
            value:activeAssets.length,
            note:`of ${assets.length} total`,
            color:'#1e6bbd' },
          { label:'Total Cost Basis',
            value:fmtCur(totalCost),
            note:'Acquisition value',
            color:'#1a2740' },
          { label:'Net Book Value',
            value:fmtCur(totalBV),
            note:'After depreciation',
            color:'#16c79a' },
          { label:'Accumulated Depreciation',
            value:fmtCur(totalDep),
            note:'Total written off',
            color:'#e8a04a' },
        ].map((s,i) => (
          <div key={i} style={{ background:'white',
            borderRadius:12, padding:16,
            border:'1px solid #e2e8f0',
            boxShadow:'0 2px 8px rgba(13,27,42,.04)' }}>
            <div style={{ fontSize:11, color:'#6b7fa3',
              fontWeight:500, marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:18, fontWeight:700,
              color:s.color }}>{s.value}</div>
            <div style={{ fontSize:10, color:'#6b7fa3',
              marginTop:4 }}>{s.note}</div>
          </div>
        ))}
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
            Loading assets...
          </div>
        ) : assets.length === 0 ? (
          <div style={{ textAlign:'center',
            padding:'60px 20px', color:'#6b7fa3' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🏗️</div>
            <p style={{ fontSize:15, fontWeight:600,
              color:'#1a2740', marginBottom:20 }}>
              No assets yet
            </p>
            <button onClick={() => setModal(true)}
              style={{ padding:'10px 24px',
                background:'#1e6bbd', color:'white',
                border:'none', borderRadius:8, fontSize:13,
                fontWeight:600, cursor:'pointer' }}>
              + Add First Asset
            </button>
          </div>
        ) : (
          <table style={{ width:'100%',
            borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Code','Asset Name','Acquisition Date',
                  'Cost','Book Value',
                  'Depreciated','Status',''].map(h => (
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
              {assets.map((asset, i) => {
                const cost = parseFloat(
                  asset.acquisition_cost || 0);
                const bv   = parseFloat(
                  asset.book_value || cost);
                const dep  = cost - bv;
                const pct  = cost > 0
                  ? Math.round((dep / cost) * 100) : 0;
                return (
                  <tr key={i}
                    style={{ borderBottom:'1px solid #f4f6f9' }}>
                    <td style={{ padding:'12px 16px',
                      fontFamily:'monospace', fontSize:12,
                      color:'#1e6bbd', fontWeight:600 }}>
                      {asset.asset_code}
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ fontWeight:600,
                        fontSize:13 }}>{asset.name}</div>
                      {asset.location && (
                        <div style={{ fontSize:11,
                          color:'#6b7fa3' }}>
                          📍 {asset.location}
                        </div>
                      )}
                      {asset.serial_number && (
                        <div style={{ fontSize:11,
                          color:'#6b7fa3' }}>
                          S/N: {asset.serial_number}
                        </div>
                      )}
                    </td>
                    <td style={{ padding:'12px 16px',
                      color:'#6b7fa3', fontSize:13 }}>
                      {fmtDate(asset.acquisition_date)}
                    </td>
                    <td style={{ padding:'12px 16px',
                      fontFamily:'monospace', fontSize:12 }}>
                      {fmtCur(cost)}
                    </td>
                    <td style={{ padding:'12px 16px',
                      fontFamily:'monospace', fontSize:12,
                      fontWeight:700,
                      color: bv > 0 ? '#1a2740' : '#6b7fa3' }}>
                      {fmtCur(bv)}
                    </td>
                    <td style={{ padding:'12px 16px',
                      width:180 }}>
                      <div style={{ display:'flex',
                        alignItems:'center', gap:10 }}>
                        <ProgressBar value={dep} max={cost}/>
                        <span style={{ fontSize:11,
                          color:'#6b7fa3', width:36,
                          flexShrink:0, textAlign:'right' }}>
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ padding:'3px 10px',
                        borderRadius:20, fontSize:11,
                        fontWeight:600,
                        background: asset.status==='active'
                          ? 'rgba(22,199,154,.12)'
                          : 'rgba(107,127,163,.12)',
                        color: asset.status==='active'
                          ? '#0ea87f' : '#6b7fa3' }}>
                        {asset.status || 'active'}
                      </span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        <button
                          onClick={() =>
                            navigate(`/assets/${asset.id}/edit`)}
                          style={{ padding:'5px 10px',
                            borderRadius:6,
                            border:'1px solid #e2e8f0',
                            background:'white', color:'#6b7fa3',
                            fontSize:11, fontWeight:600,
                            cursor:'pointer' }}>
                          Edit
                        </button>
                        <button
                          onClick={() => openSchedule(asset)}
                          style={{ padding:'5px 10px',
                            borderRadius:6,
                            border:'1px solid #e2e8f0',
                            background:'white', color:'#6b7fa3',
                            fontSize:11, fontWeight:600,
                            cursor:'pointer' }}>
                          Schedule
                        </button>
                        {asset.status === 'active' && (
                          <button
                            onClick={() => openDispose(asset)}
                            style={{ padding:'5px 10px',
                              borderRadius:6,
                              border:'1px solid #f8b4b4',
                              background:'white', color:'#c04040',
                              fontSize:11, fontWeight:600,
                              cursor:'pointer' }}>
                            Dispose
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Asset Modal */}
      <Modal open={modal}
        onClose={() => setModal(false)}
        title="Add Fixed Asset"
        width={580}>
        <div>
          <div style={g2}>
            <div>
              <label style={lbl}>Asset Code *</label>
              <input style={inp} placeholder="e.g. FA-001"
                value={form.assetCode}
                onChange={e=>upd('assetCode',e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>Asset Name *</label>
              <input style={inp}
                placeholder="e.g. Toyota HiLux"
                value={form.name}
                onChange={e=>upd('name',e.target.value)}/>
            </div>
          </div>
          <div style={{ marginTop:14 }}>
            <label style={lbl}>Category *</label>
            {categories.length === 0 ? (
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ fontSize:12, color:'#6b7fa3' }}>
                  No categories yet —
                </span>
                <button type="button"
                  onClick={() => setCatModal(true)}
                  style={{ padding:'6px 12px', borderRadius:6,
                    border:'1px solid #1e6bbd', background:'white',
                    color:'#1e6bbd', fontSize:12, fontWeight:600,
                    cursor:'pointer' }}>
                  + New Category
                </button>
              </div>
            ) : (
              <div style={{ display:'flex', gap:8 }}>
                <select style={inp} value={form.categoryId}
                  onChange={e=>upd('categoryId',e.target.value)}>
                  <option value="">Select a category…</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button type="button"
                  onClick={() => setCatModal(true)}
                  style={{ padding:'9px 14px', borderRadius:8,
                    border:'1px solid #e2e8f0', background:'white',
                    color:'#6b7fa3', fontSize:12, fontWeight:600,
                    cursor:'pointer', whiteSpace:'nowrap' }}>
                  + New
                </button>
              </div>
            )}
          </div>
          <div style={{ ...g2, marginTop:14 }}>
            <div>
              <label style={lbl}>Serial Number</label>
              <input style={inp} value={form.serialNumber}
                onChange={e=>upd('serialNumber',
                  e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>Location</label>
              <input style={inp}
                placeholder="e.g. Head Office"
                value={form.location}
                onChange={e=>upd('location',e.target.value)}/>
            </div>
          </div>
          <div style={{ ...g2, marginTop:14 }}>
            <div>
              <label style={lbl}>Acquisition Date *</label>
              <input style={inp} type="date"
                value={form.acquisitionDate}
                onChange={e=>upd('acquisitionDate',
                  e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>Currency</label>
              <select style={inp} value={form.currency}
                onChange={e=>upd('currency',e.target.value)}>
                {['GHS','USD','EUR','GBP'].map(c=>(
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ ...g2, marginTop:14 }}>
            <div>
              <label style={lbl}>Acquisition Cost</label>
              <input style={inp} type="number" step="0.01"
                value={form.acquisitionCost}
                onChange={e=>upd('acquisitionCost',
                  e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>Residual Value</label>
              <input style={inp} type="number" step="0.01"
                value={form.residualValue}
                onChange={e=>upd('residualValue',
                  e.target.value)}/>
            </div>
          </div>
          <div style={{ ...g2, marginTop:14 }}>
            <div>
              <label style={lbl}>Useful Life (months)</label>
              <input style={inp} type="number"
                value={form.usefulLifeMonths}
                onChange={e=>upd('usefulLifeMonths',
                  e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>
                Depreciation Method
              </label>
              <select style={inp}
                value={form.depreciationMethod}
                onChange={e=>upd('depreciationMethod',
                  e.target.value)}>
                <option value="straight_line">
                  Straight Line
                </option>
                <option value="declining_balance">
                  Declining Balance
                </option>
              </select>
            </div>
          </div>

          {/* Preview */}
          {parseFloat(form.acquisitionCost) > 0 && (
            <div style={{ background:'#f0f9ff',
              border:'1px solid #93c5fd', borderRadius:8,
              padding:12, marginTop:14, fontSize:12 }}>
              <div style={{ fontWeight:600,
                color:'#1e40af', marginBottom:6 }}>
                Depreciation Preview
              </div>
              <div style={{ display:'flex', gap:20 }}>
                <span style={{ color:'#6b7fa3' }}>
                  Annual:{' '}
                  <strong style={{ color:'#1e6bbd' }}>
                    {fmtCur(annualDep())}
                  </strong>
                </span>
                <span style={{ color:'#6b7fa3' }}>
                  Monthly:{' '}
                  <strong style={{ color:'#1e6bbd' }}>
                    {fmtCur(annualDep() / 12)}
                  </strong>
                </span>
                <span style={{ color:'#6b7fa3' }}>
                  Life:{' '}
                  <strong>
                    {((parseInt(form.usefulLifeMonths)||0)/12)
                      .toFixed(1)} yrs
                  </strong>
                </span>
              </div>
            </div>
          )}

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
              {saving?'Saving...':'Add Asset'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Run Depreciation Modal */}
      <Modal open={depModal}
        onClose={() => setDepModal(false)}
        title="Run Depreciation">
        <div>
          <p style={{ fontSize:13, color:'#6b7fa3',
            marginBottom:20, lineHeight:1.7 }}>
            This will calculate depreciation for all active
            assets for the selected period and post journal
            entries to the General Ledger.
          </p>
          <div style={g2}>
            <div>
              <label style={lbl}>Period Start</label>
              <input style={inp} type="date"
                value={depPeriod.from}
                onChange={e=>setDepPeriod(p=>
                  ({...p,from:e.target.value}))}/>
            </div>
            <div>
              <label style={lbl}>Period End</label>
              <input style={inp} type="date"
                value={depPeriod.to}
                onChange={e=>setDepPeriod(p=>
                  ({...p,to:e.target.value}))}/>
            </div>
          </div>
          <div style={{ background:'#fffbeb',
            border:'1px solid #fcd34d', borderRadius:8,
            padding:12, marginTop:16, fontSize:12,
            color:'#92400e' }}>
            ⚠️ This action will post journal entries.
            Ensure the period is correct before proceeding.
          </div>
          <div style={{ display:'flex', gap:10,
            justifyContent:'flex-end', marginTop:20 }}>
            <button onClick={() => setDepModal(false)}
              style={{ padding:'10px 20px', borderRadius:8,
                border:'1px solid #e2e8f0', background:'white',
                color:'#6b7fa3', fontSize:13,
                fontWeight:600, cursor:'pointer' }}>
              Cancel
            </button>
            <button
              disabled={!depPeriod.from || !depPeriod.to}
              onClick={async () => {
                try {
                  await api.post(
                    '/assets/run-depreciation', depPeriod);
                  alert('Depreciation run complete!');
                  setDepModal(false);
                  load();
                } catch(err) { alert(err.message); }
              }}
              style={{ padding:'10px 20px', borderRadius:8,
                border:'none', background:'#16c79a',
                color:'white', fontSize:13, fontWeight:700,
                cursor:'pointer' }}>
              Run & Post
            </button>
          </div>
        </div>
      </Modal>

      {/* New Category Modal */}
      <Modal open={catModal}
        onClose={() => setCatModal(false)}
        title="New Asset Category">
        <div>
          <div>
            <label style={lbl}>Category Name *</label>
            <input style={inp} placeholder="e.g. Motor Vehicles"
              value={newCat.name}
              onChange={e=>setNewCat(p=>({...p,name:e.target.value}))}/>
          </div>
          <div style={{ ...g2, marginTop:14 }}>
            <div>
              <label style={lbl}>Useful Life (months)</label>
              <input style={inp} type="number"
                value={newCat.usefulLifeMonths}
                onChange={e=>setNewCat(p=>
                  ({...p,usefulLifeMonths:e.target.value}))}/>
            </div>
            <div>
              <label style={lbl}>Depreciation Method</label>
              <select style={inp} value={newCat.depreciationMethod}
                onChange={e=>setNewCat(p=>
                  ({...p,depreciationMethod:e.target.value}))}>
                <option value="straight_line">Straight Line</option>
                <option value="declining_balance">Declining Balance</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop:14 }}>
            <label style={lbl}>Asset Account (balance sheet)</label>
            <select style={inp} value={newCat.assetAccountId}
              onChange={e=>setNewCat(p=>
                ({...p,assetAccountId:e.target.value}))}>
              <option value="">Select an account…</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          <div style={{ ...g2, marginTop:14 }}>
            <div>
              <label style={lbl}>Depreciation Expense Account *</label>
              <select style={inp} value={newCat.depExpenseAccountId}
                onChange={e=>setNewCat(p=>
                  ({...p,depExpenseAccountId:e.target.value}))}>
                <option value="">Select an account…</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Accumulated Depreciation Account *</label>
              <select style={inp} value={newCat.accumDepAccountId}
                onChange={e=>setNewCat(p=>
                  ({...p,accumDepAccountId:e.target.value}))}>
                <option value="">Select an account…</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:10,
            justifyContent:'flex-end', marginTop:24 }}>
            <button onClick={() => setCatModal(false)}
              style={{ padding:'10px 20px', borderRadius:8,
                border:'1px solid #e2e8f0', background:'white',
                color:'#6b7fa3', fontSize:13,
                fontWeight:600, cursor:'pointer' }}>
              Cancel
            </button>
            <button onClick={handleCreateCategory} disabled={saving}
              style={{ padding:'10px 20px', borderRadius:8,
                border:'none',
                background:saving?'#6b7fa3':'#1e6bbd',
                color:'white', fontSize:13, fontWeight:700,
                cursor:saving?'not-allowed':'pointer' }}>
              {saving?'Saving...':'Create Category'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Dispose Asset Modal */}
      <Modal open={!!disposeAsset}
        onClose={() => setDisposeAsset(null)}
        title={`Dispose Asset — ${disposeAsset?.asset_code || ''}`}>
        <div>
          <p style={{ fontSize:13, color:'#6b7fa3',
            marginBottom:20, lineHeight:1.7 }}>
            Current book value:{' '}
            <strong>{fmtCur(parseFloat(disposeAsset?.book_value || 0))}</strong>.
            This removes the asset from the register and posts the
            resulting gain or loss to the General Ledger.
          </p>
          <div style={g2}>
            <div>
              <label style={lbl}>Disposal Date *</label>
              <input style={inp} type="date"
                value={disposeForm.disposalDate}
                onChange={e=>setDisposeForm(p=>
                  ({...p,disposalDate:e.target.value}))}/>
            </div>
            <div>
              <label style={lbl}>Amount Received</label>
              <input style={inp} type="number" step="0.01"
                value={disposeForm.disposalAmount}
                onChange={e=>setDisposeForm(p=>
                  ({...p,disposalAmount:e.target.value}))}/>
            </div>
          </div>
          <div style={{ marginTop:14 }}>
            <label style={lbl}>Notes</label>
            <input style={inp} placeholder="e.g. Sold to staff member"
              value={disposeForm.disposalNotes}
              onChange={e=>setDisposeForm(p=>
                ({...p,disposalNotes:e.target.value}))}/>
          </div>
          <div style={{ background:'#fffbeb',
            border:'1px solid #fcd34d', borderRadius:8,
            padding:12, marginTop:16, fontSize:12,
            color:'#92400e' }}>
            ⚠️ This action cannot be undone.
          </div>
          <div style={{ display:'flex', gap:10,
            justifyContent:'flex-end', marginTop:20 }}>
            <button onClick={() => setDisposeAsset(null)}
              style={{ padding:'10px 20px', borderRadius:8,
                border:'1px solid #e2e8f0', background:'white',
                color:'#6b7fa3', fontSize:13,
                fontWeight:600, cursor:'pointer' }}>
              Cancel
            </button>
            <button onClick={handleDispose} disabled={saving}
              style={{ padding:'10px 20px', borderRadius:8,
                border:'none',
                background:saving?'#6b7fa3':'#c04040',
                color:'white', fontSize:13, fontWeight:700,
                cursor:saving?'not-allowed':'pointer' }}>
              {saving?'Processing...':'Confirm Disposal'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Depreciation Schedule Modal */}
      <Modal open={!!scheduleAsset}
        onClose={() => setScheduleAsset(null)}
        title={`Depreciation Schedule — ${scheduleAsset?.asset_code || ''}`}
        width={640}>
        {schedule.length === 0 ? (
          <p style={{ fontSize:13, color:'#6b7fa3',
            textAlign:'center', padding:'20px 0' }}>
            No depreciation has been posted for this asset yet.
          </p>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Period','Amount','Book Value After','Status'].map(h => (
                  <th key={h} style={{ padding:'8px 10px',
                    textAlign:'left', fontSize:10, fontWeight:600,
                    color:'#6b7fa3', textTransform:'uppercase',
                    letterSpacing:.5, borderBottom:'1px solid #e2e8f0' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedule.map(s => (
                <tr key={s.id} style={{ borderBottom:'1px solid #f4f6f9' }}>
                  <td style={{ padding:'10px', fontSize:12 }}>
                    {fmtDate(s.period_start)} – {fmtDate(s.period_end)}
                  </td>
                  <td style={{ padding:'10px', fontSize:12, fontFamily:'monospace' }}>
                    {fmtCur(parseFloat(s.depreciation_amount))}
                  </td>
                  <td style={{ padding:'10px', fontSize:12, fontFamily:'monospace' }}>
                    {fmtCur(parseFloat(s.book_value_after))}
                  </td>
                  <td style={{ padding:'10px', fontSize:11 }}>
                    <span style={{ padding:'2px 8px', borderRadius:20,
                      background: s.status==='posted'
                        ? 'rgba(22,199,154,.12)' : 'rgba(107,127,163,.12)',
                      color: s.status==='posted' ? '#0ea87f' : '#6b7fa3' }}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}
