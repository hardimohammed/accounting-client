// ============================================================
//  src/pages/assets/AssetFormPage.js
//  Was a Stub placeholder — "Edit" in AssetListPage.js navigated
//  here but nothing real existed. Asset creation itself already
//  has a full working modal in AssetListPage.js, so this page
//  focuses on edit mode; it also supports create for route
//  completeness (/assets/new), mirroring that same modal's fields.
// ============================================================
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';

export default function AssetFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(isEdit);
  const [saving,     setSaving]     = useState(false);
  const [depreciationLocked, setDepreciationLocked] = useState(false);
  const [form, setForm] = useState({
    assetCode:'', name:'', description:'',
    categoryId:'', serialNumber:'', location:'',
    acquisitionDate: new Date().toISOString().slice(0,10),
    acquisitionCost:0, residualValue:0,
    usefulLifeMonths:60,
    depreciationMethod:'straight_line',
    currency:'GHS',
  });

  useEffect(() => {
    api.get('/assets/categories').catch(() => ({ data:[] }))
      .then(res => setCategories(res.data || []));

    if (isEdit) {
      Promise.all([
        api.get(`/assets/${id}`),
        api.get(`/assets/${id}/schedule`).catch(() => ({ data:[] })),
      ]).then(([asset, sched]) => {
        setForm({
          assetCode: asset.data.asset_code || '',
          name: asset.data.name || '',
          description: asset.data.description || '',
          categoryId: String(asset.data.category_id || ''),
          serialNumber: asset.data.serial_number || '',
          location: asset.data.location || '',
          acquisitionDate: (asset.data.acquisition_date || '').slice(0,10),
          acquisitionCost: asset.data.acquisition_cost || 0,
          residualValue: asset.data.residual_value || 0,
          usefulLifeMonths: asset.data.useful_life_months || 60,
          depreciationMethod: asset.data.depreciation_method || 'straight_line',
          currency: asset.data.currency || 'GHS',
        });
        // Matches the backend's own guard: once any depreciation has
        // posted, acquisitionCost/residualValue/usefulLifeMonths/
        // depreciationMethod/acquisitionDate can no longer change —
        // disable them here too rather than letting the user fill
        // them in only to have the save rejected.
        setDepreciationLocked((sched.data || []).some(s => s.status === 'posted'));
      }).catch(err => alert(err.message || 'Failed to load asset'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSubmit = async () => {
    if (!form.assetCode) return alert('Asset Code is required');
    if (!form.name)      return alert('Asset Name is required');
    if (!form.categoryId) return alert('Category is required');
    if (!form.acquisitionDate) return alert('Acquisition Date is required');
    setSaving(true);
    try {
      if (isEdit) await api.put(`/assets/${id}`, form);
      else        await api.post('/assets', form);
      navigate('/assets');
    } catch (err) {
      alert(err.message || 'Failed to save asset');
    } finally { setSaving(false); }
  };

  const inp = { width:'100%', padding:'9px 12px',
    border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13,
    fontFamily:'sans-serif', background:'#f9fafb', outline:'none' };
  const inpLocked = { ...inp, background:'#f1f5f9', color:'#94a3b8', cursor:'not-allowed' };
  const lbl = { display:'block', fontSize:11, fontWeight:600,
    color:'#1a2740', marginBottom:6 };
  const g2  = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 };

  if (loading) {
    return (
      <div style={{ textAlign:'center', padding:60, color:'#6b7fa3' }}>
        Loading asset...
      </div>
    );
  }

  return (
    <div style={{ fontFamily:'sans-serif', maxWidth:640 }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:700,
          color:'#1a2740', marginBottom:4 }}>
          {isEdit ? `Edit Asset — ${form.assetCode}` : 'Add Fixed Asset'}
        </h1>
        <p style={{ fontSize:13, color:'#6b7fa3' }}>
          IAS 16 / IAS 38 compliant asset register
        </p>
      </div>

      <div style={{ background:'white', borderRadius:12,
        border:'1px solid #e2e8f0', padding:24,
        boxShadow:'0 2px 8px rgba(13,27,42,.04)' }}>

        {depreciationLocked && (
          <div style={{ background:'#fffbeb', border:'1px solid #fcd34d',
            borderRadius:8, padding:12, marginBottom:20,
            fontSize:12, color:'#92400e' }}>
            ⚠️ Depreciation has already been posted for this asset —
            acquisition cost, residual value, useful life, depreciation
            method and acquisition date can no longer be changed.
          </div>
        )}

        <div style={g2}>
          <div>
            <label style={lbl}>Asset Code *</label>
            <input style={inp} placeholder="e.g. FA-001"
              value={form.assetCode}
              onChange={e=>upd('assetCode',e.target.value)}/>
          </div>
          <div>
            <label style={lbl}>Asset Name *</label>
            <input style={inp} placeholder="e.g. Toyota HiLux"
              value={form.name}
              onChange={e=>upd('name',e.target.value)}/>
          </div>
        </div>

        <div style={{ marginTop:14 }}>
          <label style={lbl}>Category *</label>
          <select style={inp} value={form.categoryId}
            onChange={e=>upd('categoryId',e.target.value)}>
            <option value="">Select a category…</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginTop:14 }}>
          <label style={lbl}>Description</label>
          <input style={inp} value={form.description}
            onChange={e=>upd('description',e.target.value)}/>
        </div>

        <div style={{ ...g2, marginTop:14 }}>
          <div>
            <label style={lbl}>Serial Number</label>
            <input style={inp} value={form.serialNumber}
              onChange={e=>upd('serialNumber',e.target.value)}/>
          </div>
          <div>
            <label style={lbl}>Location</label>
            <input style={inp} placeholder="e.g. Head Office"
              value={form.location}
              onChange={e=>upd('location',e.target.value)}/>
          </div>
        </div>

        <div style={{ ...g2, marginTop:14 }}>
          <div>
            <label style={lbl}>Acquisition Date *</label>
            <input style={depreciationLocked ? inpLocked : inp} type="date"
              disabled={depreciationLocked}
              value={form.acquisitionDate}
              onChange={e=>upd('acquisitionDate',e.target.value)}/>
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

        <div style={{ ...g2, marginTop:14 }}>
          <div>
            <label style={lbl}>Acquisition Cost</label>
            <input style={depreciationLocked ? inpLocked : inp}
              type="number" step="0.01" disabled={depreciationLocked}
              value={form.acquisitionCost}
              onChange={e=>upd('acquisitionCost',e.target.value)}/>
          </div>
          <div>
            <label style={lbl}>Residual Value</label>
            <input style={depreciationLocked ? inpLocked : inp}
              type="number" step="0.01" disabled={depreciationLocked}
              value={form.residualValue}
              onChange={e=>upd('residualValue',e.target.value)}/>
          </div>
        </div>

        <div style={{ ...g2, marginTop:14 }}>
          <div>
            <label style={lbl}>Useful Life (months)</label>
            <input style={depreciationLocked ? inpLocked : inp}
              type="number" disabled={depreciationLocked}
              value={form.usefulLifeMonths}
              onChange={e=>upd('usefulLifeMonths',e.target.value)}/>
          </div>
          <div>
            <label style={lbl}>Depreciation Method</label>
            <select style={depreciationLocked ? inpLocked : inp}
              disabled={depreciationLocked}
              value={form.depreciationMethod}
              onChange={e=>upd('depreciationMethod',e.target.value)}>
              <option value="straight_line">Straight Line</option>
              <option value="declining_balance">Declining Balance</option>
            </select>
          </div>
        </div>

        <div style={{ display:'flex', gap:10,
          justifyContent:'flex-end', marginTop:24 }}>
          <button onClick={() => navigate('/assets')}
            style={{ padding:'10px 20px', borderRadius:8,
              border:'1px solid #e2e8f0', background:'white',
              color:'#6b7fa3', fontSize:13,
              fontWeight:600, cursor:'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ padding:'10px 20px', borderRadius:8,
              border:'none',
              background:saving?'#6b7fa3':'#1e6bbd',
              color:'white', fontSize:13, fontWeight:700,
              cursor:saving?'not-allowed':'pointer' }}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Asset'}
          </button>
        </div>
      </div>
    </div>
  );
}
