import { useState, useEffect, useRef } from 'react';
import api from '../../api/client';

const fmt  = (n) => Number(n || 0).toLocaleString('en-GH', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const fmtC = (n) => `GHS ${fmt(n)}`;

// REACT_APP_API_URL points at the /api/v1 base used by axios calls;
// static /uploads files are served from the API root, so strip the
// /api/v1 suffix back off for building file URLs.
const API_URL  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
const API_BASE = API_URL.replace(/\/api\/v\d+\/?$/, '');

const ProductImage = ({ src, name, size = 48 }) => {
  const [err, setErr] = useState(false);
  const token = localStorage.getItem('accessToken');
  if (src && !err) return (
    <img src={`${API_BASE}${src}?token=${token}`} alt={name}
      onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: 8,
        objectFit: 'cover', flexShrink: 0 }}/>
  );
  return (
    <div style={{ width: size, height: size, borderRadius: 8,
      background: '#e2e8f0', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size * 0.4, flexShrink: 0 }}>
      📦
    </div>
  );
};

const EMPTY_VARIANT = { sku: '', size: '', color: '', costPrice: '', sellingPrice: '', quantityOnHand: '' };

const VariantsModal = ({ product, onClose }) => {
  const [variants, setVariants] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [form,     setForm]     = useState(EMPTY_VARIANT);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [uploadingImg, setUploadingImg] = useState(null);
  const imgInputRefs = useRef({});

  const load = () => {
    setLoading(true);
    api.get(`/inventory/${product.id}/variants`)
      .then(res => setVariants(res.variants || []))
      .catch(() => setError('Failed to load variants'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    setError('');
    if (!form.sku) return setError('SKU is required');
    if (!form.size && !form.color) return setError('Enter a size or color');
    setSaving(true);
    try {
      await api.post(`/inventory/${product.id}/variants`, {
        sku: form.sku,
        size: form.size || undefined,
        color: form.color || undefined,
        costPrice: form.costPrice || 0,
        sellingPrice: form.sellingPrice || 0,
        quantityOnHand: form.quantityOnHand || 0,
      });
      setForm(EMPTY_VARIANT);
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create variant');
    } finally { setSaving(false); }
  };

  const handleDeactivate = async (variantId) => {
    if (!window.confirm('Deactivate this variant? It will stop showing on POS.')) return;
    try {
      await api.delete(`/inventory/variants/${variantId}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to deactivate variant');
    }
  };

  const handleImageUpload = async (variantId, file) => {
    setUploadingImg(variantId);
    try {
      const fd = new FormData();
      fd.append('image', file);
      await api.post(`/inventory/variants/${variantId}/image`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Image upload failed');
    } finally { setUploadingImg(null); }
  };

  const inp = {
    width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0',
    borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'sans-serif',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,42,.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%',
        maxWidth: 640, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>

        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Variants — {product.name}</div>
            <div style={{ fontSize: 12, color: '#6b7fa3' }}>
              Each variant tracks its own stock and price
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none',
            fontSize: 20, cursor: 'pointer', color: '#6b7fa3' }}>×</button>
        </div>

        <div style={{ padding: 24 }}>
          {error && (
            <div style={{ background: '#fff5f5', border: '1px solid #fca5a5',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              fontSize: 12, color: '#c04040' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#6b7fa3' }}>Loading…</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Image', 'SKU', 'Size', 'Color', 'Cost', 'Price', 'Stock', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left',
                      fontSize: 10, fontWeight: 700, color: '#6b7fa3',
                      textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variants.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #f0f2f5' }}>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <ProductImage src={v.image_url} name={v.sku} size={36}/>
                        <button
                          title="Upload image"
                          onClick={() => imgInputRefs.current[v.id]?.click()}
                          style={{ position: 'absolute', bottom: -4, right: -4,
                            width: 16, height: 16, borderRadius: '50%',
                            background: '#7c3aed', border: '2px solid white',
                            cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: 8, color: 'white', padding: 0 }}>
                          {uploadingImg === v.id ? '…' : '📷'}
                        </button>
                        <input type="file" accept="image/*"
                          ref={el => imgInputRefs.current[v.id] = el}
                          style={{ display: 'none' }}
                          onChange={e => {
                            const f = e.target.files[0];
                            if (f) handleImageUpload(v.id, f);
                          }}/>
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 600, color: '#1e6bbd' }}>{v.sku}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12 }}>{v.size || '—'}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12 }}>{v.color || '—'}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12 }}>{fmtC(v.cost_price)}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12 }}>{fmtC(v.retail_price || v.selling_price)}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 700 }}>{parseFloat(v.quantity_on_hand)}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                        background: v.is_active ? 'rgba(22,199,154,.1)' : 'rgba(224,92,92,.1)',
                        color: v.is_active ? '#0ea87f' : '#e05c5c' }}>
                        {v.is_active ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      {v.is_active && (
                        <button onClick={() => handleDeactivate(v.id)}
                          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e05c5c',
                            background: '#fff5f5', color: '#e05c5c', fontSize: 11,
                            cursor: 'pointer', fontFamily: 'sans-serif' }}>
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {variants.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: 20, textAlign: 'center', color: '#6b7fa3', fontSize: 13 }}>
                    No variants yet — add one below
                  </td></tr>
                )}
              </tbody>
            </table>
          )}

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Add Variant</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 10 }}>
              <input style={inp} placeholder="SKU *" value={form.sku} onChange={e => upd('sku', e.target.value)}/>
              <input style={inp} placeholder="Size (e.g. 42)" value={form.size} onChange={e => upd('size', e.target.value)}/>
              <input style={inp} placeholder="Color (e.g. Red)" value={form.color} onChange={e => upd('color', e.target.value)}/>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
              <input style={inp} type="number" min="0" step="0.01" placeholder="Cost price"
                value={form.costPrice} onChange={e => upd('costPrice', e.target.value)}/>
              <input style={inp} type="number" min="0" step="0.01" placeholder="Selling price"
                value={form.sellingPrice} onChange={e => upd('sellingPrice', e.target.value)}/>
              <input style={inp} type="number" min="0" placeholder="Opening stock"
                value={form.quantityOnHand} onChange={e => upd('quantityOnHand', e.target.value)}/>
            </div>
            <button onClick={handleAdd} disabled={saving}
              style={{ padding: '10px 20px', background: saving ? '#6b7fa3' : '#7c3aed',
                color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'sans-serif' }}>
              {saving ? 'Adding…' : '+ Add Variant'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EMPTY_FORM = {
  sku: '', name: '', description: '',
  productType: 'inventory', unitOfMeasure: 'unit',
  costPrice: '', sellingPrice: '', reorderLevel: '',
  openingStock: '', valuationMethod: 'weighted_average',
  taxId: '',
};

export default function InventoryPage() {
  const [products,   setProducts]   = useState([]);
  const [movements,  setMovements]  = useState([]);
  const [taxTypes,   setTaxTypes]   = useState([]);
  const [tab,        setTab]        = useState('products');
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [imageFile,  setImageFile]  = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjProduct, setAdjProduct] = useState(null);
  const [adjQty,     setAdjQty]     = useState('');
  const [adjNotes,   setAdjNotes]   = useState('');
  const [adjLoading, setAdjLoading] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(null);
  const [showVariants, setShowVariants] = useState(false);
  const [variantsProduct, setVariantsProduct] = useState(null);
  const fileInputRef  = useRef();
  const imgInputRefs  = useRef({});

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/inventory'),
      api.get('/inventory/movements'),
      api.get('/tax/types'),
    ]).then(([p, m, tx]) => {
      setProducts(p.products || []);
      setMovements(m.movements || []);
      setTaxTypes(tx.data || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview(null);
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditingId(p.id);
    setForm({
      sku: p.sku, name: p.name, description: p.description || '',
      productType: p.product_type || 'inventory',
      unitOfMeasure: p.unit_of_measure || 'unit',
      costPrice: p.cost_price ?? '', sellingPrice: p.selling_price ?? '',
      reorderLevel: p.reorder_level ?? '', openingStock: '',
      valuationMethod: p.valuation_method || 'weighted_average',
      taxId: p.tax_id || '',
    });
    setImageFile(null);
    setImagePreview(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!form.sku)  return alert('SKU is required');
    if (!form.name) return alert('Product Name is required');
    setSaving(true);
    try {
      if (editingId) {
        // No sku/product_type/opening_stock — those aren't editable
        // (see the PUT /inventory/:id comment on the backend for why).
        await api.put(`/inventory/${editingId}`, {
          name:             form.name,
          description:      form.description || '',
          unit_of_measure:  form.unitOfMeasure,
          cost_price:       parseFloat(form.costPrice)    || 0,
          selling_price:    parseFloat(form.sellingPrice) || 0,
          reorder_level:    parseFloat(form.reorderLevel) || 0,
          valuation_method: form.valuationMethod,
          tax_id:           form.taxId || null,
        });
      } else {
        const fd = new FormData();
        fd.append('sku',              form.sku);
        fd.append('name',             form.name);
        fd.append('description',      form.description || '');
        fd.append('product_type',     form.productType);
        fd.append('unit_of_measure',  form.unitOfMeasure);
        fd.append('cost_price',       parseFloat(form.costPrice)    || 0);
        fd.append('selling_price',    parseFloat(form.sellingPrice)  || 0);
        fd.append('reorder_level',    parseFloat(form.reorderLevel)  || 0);
        fd.append('opening_stock',    parseFloat(form.openingStock)  || 0);
        fd.append('valuation_method', form.valuationMethod);
        if (form.taxId) fd.append('tax_id', form.taxId);
        if (imageFile) fd.append('image', imageFile);

        await api.post('/inventory', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      load();
      closeModal();
    } catch (err) {
      alert(err.response?.data?.message || err.message || `Failed to ${editingId ? 'update' : 'create'} product`);
    } finally { setSaving(false); }
  };

  const handleProductImageUpload = async (productId, file) => {
    setUploadingImg(productId);
    try {
      const fd = new FormData();
      fd.append('image', file);
      await api.post(`/inventory/${productId}/image`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      load();
    } catch (err) {
      alert('Image upload failed');
    } finally { setUploadingImg(null); }
  };

  const handleAdjust = async () => {
    if (!adjQty || isNaN(adjQty)) return;
    setAdjLoading(true);
    try {
      await api.post('/inventory/adjust', {
        productId: adjProduct.id,
        quantity:  parseFloat(adjQty),
        notes:     adjNotes || 'Manual adjustment',
      });
      load();
      setShowAdjust(false);
      setAdjProduct(null);
      setAdjQty('');
      setAdjNotes('');
    } catch (err) {
      alert(err.response?.data?.message || 'Adjustment failed');
    } finally { setAdjLoading(false); }
  };

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const inp = {
    width: '100%', padding: '10px 12px',
    border: '1px solid #e2e8f0', borderRadius: 8,
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'sans-serif',
  };
  const lbl = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: '#6b7fa3', marginBottom: 6, textTransform: 'uppercase',
  };

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#6b7fa3' }}>
      Loading inventory...
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif' }}>

      {/* ── Summary Cards ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
        gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Products',   color: '#1e6bbd',
            value: products.length },
          { label: 'Inventory Value',  color: '#16c79a',
            value: fmtC(products.reduce((s, p) =>
              s + parseFloat(p.quantity_on_hand || 0)
                * parseFloat(p.cost_price || 0), 0)) },
          { label: 'Low Stock Items',  color: '#e8a04a',
            value: products.filter(p =>
              parseFloat(p.reorder_level) > 0 &&
              parseFloat(p.quantity_on_hand || 0) <= parseFloat(p.reorder_level)
            ).length },
          { label: 'Product Types',    color: '#7c3aed',
            value: new Set(products.map(p => p.product_type).filter(Boolean)).size },
        ].map((c, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12,
            padding: 20, border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(13,27,42,.05)' }}>
            <div style={{ fontSize: 28, fontWeight: 700,
              color: c.color, marginBottom: 4 }}>{c.value}</div>
            <div style={{ fontSize: 13, color: '#6b7fa3' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* ── Main Card ──────────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: 12,
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(13,27,42,.05)', overflow: 'hidden' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0',
          padding: '0 20px' }}>
          {[
            { id: 'products',  label: `Products (${products.length})` },
            { id: 'movements', label: 'Stock Movements' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '14px 20px', border: 'none', background: 'none',
              cursor: 'pointer', fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? '#1e6bbd' : '#6b7fa3',
              borderBottom: tab === t.id
                ? '2px solid #1e6bbd' : '2px solid transparent',
              fontSize: 14, fontFamily: 'sans-serif',
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ padding: 20 }}>

          {/* ── Products Tab ─────────────────────────── */}
          {tab === 'products' && (<>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 16 }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
                <input placeholder="Search products or SKUs..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  style={{ ...inp, padding: '10px 12px 10px 36px' }}/>
              </div>
              <button onClick={openCreate} style={{
                padding: '10px 20px', background: '#1e6bbd', color: 'white',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'sans-serif' }}>
                + Add Product
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Image','SKU','Product Name','Type','On Hand',
                    'Reorder','Cost Price','Tax','Total Value','Status','Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, color: '#6b7fa3',
                      textTransform: 'uppercase', letterSpacing: '.5px',
                      borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const qty  = parseFloat(p.quantity_on_hand || 0);
                  const reord = parseFloat(p.reorder_level || 0);
                  const val  = qty * parseFloat(p.cost_price || 0);
                  const low  = reord > 0 && qty <= reord;
                  return (
                    <tr key={p.id} style={{
                      background: i % 2 === 0 ? 'white' : '#fafbfc',
                      borderBottom: '1px solid #f0f2f5' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <ProductImage src={p.image_url} name={p.name} size={44}/>
                          <button
                            title="Upload image"
                            onClick={() => imgInputRefs.current[p.id]?.click()}
                            style={{ position: 'absolute', bottom: -4, right: -4,
                              width: 18, height: 18, borderRadius: '50%',
                              background: '#1e6bbd', border: '2px solid white',
                              cursor: 'pointer', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              fontSize: 9, color: 'white', padding: 0 }}>
                            {uploadingImg === p.id ? '…' : '📷'}
                          </button>
                          <input type="file" accept="image/*"
                            ref={el => imgInputRefs.current[p.id] = el}
                            style={{ display: 'none' }}
                            onChange={e => {
                              const f = e.target.files[0];
                              if (f) handleProductImageUpload(p.id, f);
                            }}/>
                        </div>
                      </td>
                      <td style={{ padding: '12px', fontSize: 13,
                        color: '#1e6bbd', fontWeight: 600 }}>{p.sku}</td>
                      <td style={{ padding: '12px', fontSize: 13,
                        fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20,
                          fontSize: 11, fontWeight: 600,
                          background: p.product_type === 'inventory'
                            ? 'rgba(30,107,189,.1)' : 'rgba(124,58,237,.1)',
                          color: p.product_type === 'inventory'
                            ? '#1e6bbd' : '#7c3aed' }}>
                          {p.product_type || 'service'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: 13,
                        fontWeight: 700, color: low ? '#e05c5c' : '#1a2740' }}>
                        {qty} {p.unit_of_measure || 'unit'}
                      </td>
                      <td style={{ padding: '12px', fontSize: 13,
                        color: '#6b7fa3' }}>
                        {reord > 0 ? reord : '—'}
                      </td>
                      <td style={{ padding: '12px', fontSize: 13 }}>
                        {fmtC(p.cost_price)}
                      </td>
                      <td style={{ padding: '12px', fontSize: 12, color: '#6b7fa3' }}>
                        {p.tax_name ? `${p.tax_name} (${p.tax_rate}%)` : '—'}
                      </td>
                      <td style={{ padding: '12px', fontSize: 13,
                        fontWeight: 600, color: '#16c79a' }}>
                        {fmtC(val)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20,
                          fontSize: 11, fontWeight: 600,
                          background: p.is_active
                            ? 'rgba(22,199,154,.1)' : 'rgba(224,92,92,.1)',
                          color: p.is_active ? '#0ea87f' : '#e05c5c' }}>
                          {p.is_active ? 'active' : 'inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => openEdit(p)}
                          style={{ padding: '6px 14px', marginRight: 6,
                          background: 'rgba(107,127,163,.08)',
                          color: '#6b7fa3',
                          border: '1px solid rgba(107,127,163,.2)',
                          borderRadius: 6, fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'sans-serif' }}>
                          Edit
                        </button>
                        <button onClick={() => {
                          setAdjProduct(p); setShowAdjust(true);
                        }} style={{ padding: '6px 14px', marginRight: 6,
                          background: 'rgba(30,107,189,.08)',
                          color: '#1e6bbd',
                          border: '1px solid rgba(30,107,189,.2)',
                          borderRadius: 6, fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'sans-serif' }}>
                          Adjust
                        </button>
                        {p.product_type === 'inventory' && (
                          <button onClick={() => {
                            setVariantsProduct(p); setShowVariants(true);
                          }} style={{ padding: '6px 14px',
                            background: 'rgba(124,58,237,.08)',
                            color: '#7c3aed',
                            border: '1px solid rgba(124,58,237,.2)',
                            borderRadius: 6, fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'sans-serif' }}>
                            Variants
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={11} style={{ padding: '60px',
                    textAlign: 'center', color: '#6b7fa3' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      No products yet
                    </div>
                    <button onClick={openCreate} style={{
                      padding: '10px 24px', background: '#1e6bbd',
                      color: 'white', border: 'none', borderRadius: 8,
                      fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                      + Add First Product
                    </button>
                  </td></tr>
                )}
              </tbody>
            </table>
          </>)}

          {/* ── Movements Tab ────────────────────────── */}
          {tab === 'movements' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Date','Product','Type','Qty','Unit Cost','Total','Notes'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, color: '#6b7fa3',
                      textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.map((m, i) => (
                  <tr key={m.id} style={{
                    background: i % 2 === 0 ? 'white' : '#fafbfc',
                    borderBottom: '1px solid #f0f2f5' }}>
                    <td style={{ padding: '12px', fontSize: 13, color: '#6b7fa3' }}>
                      {m.movement_date
                        ? new Date(m.movement_date).toLocaleDateString('en-GH')
                        : '—'}
                    </td>
                    <td style={{ padding: '12px', fontSize: 13, fontWeight: 600 }}>
                      {m.product_name || '—'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20,
                        fontSize: 11, fontWeight: 600,
                        background: m.movement_type === 'sale'
                          ? 'rgba(224,92,92,.1)'
                          : m.movement_type === 'purchase'
                            ? 'rgba(22,199,154,.1)' : 'rgba(232,160,74,.1)',
                        color: m.movement_type === 'sale'     ? '#e05c5c'
                             : m.movement_type === 'purchase' ? '#0ea87f'
                             : '#e8a04a' }}>
                        {m.movement_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: 13, fontWeight: 700,
                      color: m.movement_type === 'sale' ? '#e05c5c' : '#0ea87f' }}>
                      {m.movement_type === 'sale' ? '-' : '+'}
                      {parseFloat(m.quantity || 0)}
                    </td>
                    <td style={{ padding: '12px', fontSize: 13 }}>
                      {fmtC(m.unit_cost)}
                    </td>
                    <td style={{ padding: '12px', fontSize: 13, fontWeight: 600 }}>
                      {fmtC(m.total_cost)}
                    </td>
                    <td style={{ padding: '12px', fontSize: 13, color: '#6b7fa3' }}>
                      {m.notes || '—'}
                    </td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '40px',
                    textAlign: 'center', color: '#6b7fa3' }}>
                    No stock movements yet.
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Add Product Modal ──────────────────────────── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0,
          background: 'rgba(13,27,42,.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16,
            width: '100%', maxWidth: 560, maxHeight: '90vh',
            overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>

            {/* Header */}
            <div style={{ padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {editingId ? `Edit Product — ${form.sku}` : 'Add Product'}
              </div>
              <button onClick={closeModal}
                style={{ background: 'none', border: 'none', fontSize: 20,
                  cursor: 'pointer', color: '#6b7fa3' }}>×</button>
            </div>

            <div style={{ padding: 24 }}>

              {/* Image upload area — create only; edit uses the per-row 📷 button */}
              {!editingId && (
                <div style={{ marginBottom: 20, textAlign: 'center' }}>
                  <div onClick={() => fileInputRef.current?.click()}
                    style={{ width: 100, height: 100, borderRadius: 12,
                      border: '2px dashed #e2e8f0', cursor: 'pointer',
                      margin: '0 auto 8px', overflow: 'hidden',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', background: '#f8fafc' }}>
                    {imagePreview
                      ? <img src={imagePreview} alt="preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                      : <div style={{ textAlign: 'center', color: '#6b7fa3' }}>
                          <div style={{ fontSize: 28 }}>📷</div>
                          <div style={{ fontSize: 11, marginTop: 4 }}>Upload image</div>
                        </div>
                    }
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*"
                    style={{ display: 'none' }} onChange={handleImageSelect}/>
                  <div style={{ fontSize: 12, color: '#6b7fa3' }}>
                    Click to upload product image (optional)
                  </div>
                </div>
              )}

              {/* Form fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={lbl}>SKU *</label>
                  <input style={{ ...inp, ...(editingId ? { background: '#f0f2f5', color: '#6b7fa3', cursor: 'not-allowed' } : {}) }}
                    placeholder="e.g. PROD-001" readOnly={!!editingId}
                    value={form.sku} onChange={e => upd('sku', e.target.value)}/>
                </div>
                <div>
                  <label style={lbl}>Product Name *</label>
                  <input style={inp} placeholder="Product name"
                    value={form.name} onChange={e => upd('name', e.target.value)}/>
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={lbl}>Description</label>
                <input style={inp} placeholder="Brief description"
                  value={form.description}
                  onChange={e => upd('description', e.target.value)}/>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 16, marginTop: 14 }}>
                <div>
                  <label style={lbl}>Product Type{editingId ? ' (locked)' : ''}</label>
                  <select style={{ ...inp, ...(editingId ? { background: '#f0f2f5', color: '#6b7fa3', cursor: 'not-allowed' } : {}) }}
                    value={form.productType} disabled={!!editingId}
                    onChange={e => upd('productType', e.target.value)}>
                    <option value="inventory">Inventory</option>
                    <option value="service">Service</option>
                    <option value="non-inventory">Non-Inventory</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Unit of Measure</label>
                  <input style={inp} placeholder="e.g. unit, kg, pair"
                    value={form.unitOfMeasure}
                    onChange={e => upd('unitOfMeasure', e.target.value)}/>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 16, marginTop: 14 }}>
                <div>
                  <label style={lbl}>Cost Price (GHS)</label>
                  <input style={inp} type="number" min="0" step="0.01"
                    placeholder="0.00" value={form.costPrice}
                    onChange={e => upd('costPrice', e.target.value)}/>
                </div>
                <div>
                  <label style={lbl}>Selling Price (GHS)</label>
                  <input style={inp} type="number" min="0" step="0.01"
                    placeholder="0.00" value={form.sellingPrice}
                    onChange={e => upd('sellingPrice', e.target.value)}/>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 16, marginTop: 14 }}>
                <div>
                  <label style={lbl}>Reorder Level (optional)</label>
                  <input style={inp} type="number" min="0"
                    placeholder="e.g. 10" value={form.reorderLevel}
                    onChange={e => upd('reorderLevel', e.target.value)}/>
                </div>
                <div>
                  <label style={lbl}>Valuation Method</label>
                  <select style={inp} value={form.valuationMethod}
                    onChange={e => upd('valuationMethod', e.target.value)}>
                    <option value="weighted_average">Weighted Average</option>
                    <option value="fifo">FIFO</option>
                    <option value="lifo">LIFO</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid',
                gridTemplateColumns: editingId ? '1fr' : '1fr 1fr',
                gap: 16, marginTop: 14 }}>
                {!editingId && (
                  <div>
                    <label style={lbl}>Opening Stock (optional)</label>
                    <input style={inp} type="number" min="0"
                      placeholder="0" value={form.openingStock}
                      onChange={e => upd('openingStock', e.target.value)}/>
                  </div>
                )}
                <div>
                  <label style={lbl}>Tax Type (optional)</label>
                  <select style={inp} value={form.taxId}
                    onChange={e => upd('taxId', e.target.value)}>
                    <option value="">No Tax</option>
                    {taxTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button onClick={closeModal}
                  style={{ flex: 1, padding: 12, border: '1px solid #e2e8f0',
                    background: 'white', borderRadius: 8, fontSize: 14,
                    cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={saving}
                  style={{ flex: 2, padding: 12,
                    background: saving ? '#6b7fa3' : '#1e6bbd',
                    color: 'white', border: 'none', borderRadius: 8,
                    fontSize: 14, fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontFamily: 'sans-serif' }}>
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Adjust Stock Modal ─────────────────────────── */}
      {showAdjust && adjProduct && (
        <div style={{ position: 'fixed', inset: 0,
          background: 'rgba(13,27,42,.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: 16,
            padding: 32, width: 400,
            boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center',
              gap: 12, marginBottom: 16 }}>
              <ProductImage src={adjProduct.image_url}
                name={adjProduct.name} size={48}/>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Adjust Stock</div>
                <div style={{ fontSize: 13, color: '#6b7fa3' }}>
                  {adjProduct.name} — Current: {adjProduct.quantity_on_hand}
                </div>
              </div>
            </div>
            <label style={lbl}>New Quantity</label>
            <input type="number" value={adjQty}
              onChange={e => setAdjQty(e.target.value)}
              placeholder="Enter new quantity" style={{ ...inp, marginBottom: 16 }}/>
            <label style={lbl}>Notes</label>
            <textarea value={adjNotes}
              onChange={e => setAdjNotes(e.target.value)}
              placeholder="Reason for adjustment..." rows={3}
              style={{ ...inp, resize: 'none', marginBottom: 20 }}/>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setShowAdjust(false);
                setAdjProduct(null); setAdjQty(''); setAdjNotes(''); }}
                style={{ flex: 1, padding: 12, border: '1px solid #e2e8f0',
                  background: 'white', borderRadius: 8, fontSize: 14,
                  cursor: 'pointer', fontFamily: 'sans-serif' }}>
                Cancel
              </button>
              <button onClick={handleAdjust} disabled={adjLoading}
                style={{ flex: 2, padding: 12,
                  background: adjLoading ? '#6b7fa3' : '#1e6bbd',
                  color: 'white', border: 'none', borderRadius: 8,
                  fontSize: 14, fontWeight: 600,
                  cursor: adjLoading ? 'not-allowed' : 'pointer',
                  fontFamily: 'sans-serif' }}>
                {adjLoading ? 'Saving...' : 'Save Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Variants Modal ──────────────────────────────── */}
      {showVariants && variantsProduct && (
        <VariantsModal
          product={variantsProduct}
          onClose={() => { setShowVariants(false); setVariantsProduct(null); }}/>
      )}
    </div>
  );
}
