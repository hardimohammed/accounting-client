// ============================================================
//  src/pages/bills/BillFormPage.js
//  Standalone bill creation page at /bills/new
// ============================================================
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/client';

const fmtCur = (n) => `GHS ${new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2 }).format(n || 0)}`;

const EMPTY_LINE = {
  productId: '', description: '', quantity: 1,
  unitPrice: 0, discountPct: 0, taxRate: 0, accountId: '',
};

export default function BillFormPage() {
  const navigate  = useNavigate();
  const location  = useLocation();

  // Pre-select supplier if coming from supplier page
  const params     = new URLSearchParams(location.search);
  const preSupId   = params.get('supplierId') || '';

  const [suppliers, setSuppliers] = useState([]);
  const [accounts,  setAccounts]  = useState([]);
  const [products,  setProducts]  = useState([]);
  const [saving,    setSaving]    = useState(false);
  const [lines,     setLines]     = useState([{ ...EMPTY_LINE }]);
  const [form, setForm] = useState({
    supplierId:  preSupId,
    billDate:    new Date().toISOString().slice(0, 10),
    dueDate:     '',
    currency:    'GHS',
    exchangeRate: 1,
    supplierRef: '',
    notes:       '',
  });

  useEffect(() => {
    api.get('/suppliers')
      .then(res => setSuppliers(res.data || []))
      .catch(console.error);
    api.get('/accounts')
      .then(res => setAccounts((res.data || []).filter(a =>
        ['asset','expense'].includes(a.classification))))
      .catch(console.error);
    api.get('/inventory?limit=200')
      .then(res => setProducts(res.data || []))
      .catch(console.error);
  }, []);

  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const updLine = (i, f, v) => {
    setLines(prev => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [f]: v };
      if (f === 'productId') {
        const p = products.find(p => String(p.id) === String(v));
        if (p) {
          copy[i].description = p.name;
          copy[i].unitPrice   = parseFloat(p.cost_price) || 0;
        }
      }
      return copy;
    });
  };

  const addLine    = () => setLines(p => [...p, { ...EMPTY_LINE }]);
  const removeLine = (i) => lines.length > 1 &&
    setLines(p => p.filter((_, idx) => idx !== i));

  const calcLine = (l) => {
    const base = (parseFloat(l.quantity) || 0) *
                 (parseFloat(l.unitPrice) || 0);
    const disc = base * ((parseFloat(l.discountPct) || 0) / 100);
    const net  = base - disc;
    const tax  = net  * ((parseFloat(l.taxRate)     || 0) / 100);
    return net + tax;
  };

  const subtotal = lines.reduce((s, l) => s + calcLine(l), 0);

  const handleSave = async () => {
    if (!form.supplierId)
      return alert('Please select a supplier');
    if (!form.billDate)
      return alert('Please enter a bill date');
    if (!form.dueDate)
      return alert('Please enter a due date');
    if (lines.some(l => !l.description))
      return alert('All line items need a description');

    setSaving(true);
    try {
      const payload = {
        ...form,
        lines: lines.map(l => ({
          productId:    l.productId || null,
          description:  l.description,
          quantity:     parseFloat(l.quantity)    || 1,
          unitPrice:    parseFloat(l.unitPrice)   || 0,
          discountPct:  parseFloat(l.discountPct) || 0,
          taxRate:      parseFloat(l.taxRate)     || 0,
          accountId:    l.accountId || null,
        })),
      };
      const res = await api.post('/bills', payload);
      alert(`Bill ${res.data?.billNumber} created successfully!`);
      navigate('/bills');
    } catch (err) {
      alert(err.message || 'Failed to create bill');
    } finally { setSaving(false); }
  };

  // ── Styles ─────────────────────────────────────────────────
  const inp = {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid #e2e8f0', borderRadius: 8,
    fontSize: 13, fontFamily: 'sans-serif',
    background: '#f9fafb', outline: 'none',
  };
  const lbl = {
    display: 'block', fontSize: 11, fontWeight: 600,
    color: '#1a2740', marginBottom: 6,
  };
  const card = {
    background: 'white', borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(13,27,42,.04)',
    marginBottom: 16,
  };
  const cardHead = {
    padding: '14px 20px',
    borderBottom: '1px solid #e2e8f0',
    fontWeight: 700, fontSize: 14,
  };
  const cardBody = { padding: 20 };
  const g3 = { display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr', gap: 14 };

  return (
    <div style={{ fontFamily: 'sans-serif',
      maxWidth: 1000, margin: '0 auto' }}>

      {/* ── Header ───────────────────────────────────────── */}
      <div style={{ display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700,
            color: '#1a2740', marginBottom: 4 }}>
            New Bill
          </h1>
          <p style={{ fontSize: 13, color: '#6b7fa3' }}>
            Record a supplier bill or expense
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/bills')}
            style={{ padding: '10px 20px', borderRadius: 8,
              border: '1px solid #e2e8f0', background: 'white',
              color: '#6b7fa3', fontSize: 13,
              fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '10px 20px', borderRadius: 8,
              border: 'none',
              background: saving ? '#6b7fa3' : '#1e6bbd',
              color: 'white', fontSize: 13,
              fontWeight: 700, cursor: saving
                ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving...' : 'Save Bill'}
          </button>
        </div>
      </div>

      {/* ── Bill Details ──────────────────────────────────── */}
      <div style={card}>
        <div style={cardHead}>Bill Details</div>
        <div style={cardBody}>

          {/* Supplier */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Supplier *</label>
            <select style={inp} value={form.supplierId}
              onChange={e => upd('supplierId', e.target.value)}>
              <option value="">Select supplier...</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {suppliers.length === 0 && (
              <p style={{ fontSize: 11, color: '#e05c5c',
                marginTop: 4 }}>
                No suppliers found.{' '}
                <span
                  style={{ color: '#1e6bbd', cursor: 'pointer' }}
                  onClick={() => navigate('/suppliers')}>
                  Add a supplier first →
                </span>
              </p>
            )}
          </div>

          {/* Dates & Currency */}
          <div style={g3}>
            <div>
              <label style={lbl}>Bill Date *</label>
              <input style={inp} type="date"
                value={form.billDate}
                onChange={e => upd('billDate', e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>Due Date *</label>
              <input style={inp} type="date"
                value={form.dueDate}
                onChange={e => upd('dueDate', e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>Currency</label>
              <select style={inp} value={form.currency}
                onChange={e => upd('currency', e.target.value)}>
                {['GHS','USD','EUR','GBP','NGN'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Supplier Ref */}
          <div style={{ marginTop: 14 }}>
            <label style={lbl}>
              Supplier Reference (optional)
            </label>
            <input style={inp}
              placeholder="Supplier's own invoice number"
              value={form.supplierRef}
              onChange={e => upd('supplierRef', e.target.value)}/>
          </div>
        </div>
      </div>

      {/* ── Line Items ────────────────────────────────────── */}
      <div style={card}>
        <div style={cardHead}>Line Items</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%',
            borderCollapse: 'collapse', minWidth: 960 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Product','Description','Account','Qty','Unit Price',
                  'Discount %','Line Total',''].map(h => (
                  <th key={h} style={{ padding: '9px 12px',
                    textAlign: ['Product','Description','Account'].includes(h)
                      ? 'left' : 'right',
                    fontSize: 10, fontWeight: 600,
                    color: '#6b7fa3',
                    textTransform: 'uppercase',
                    letterSpacing: .6,
                    borderBottom: '1px solid #e2e8f0' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={i}
                  style={{ borderBottom: '1px solid #f4f6f9' }}>
                  {/* Product (optional — linking one makes this bill
                      receive stock for it when posted to GL) */}
                  <td style={{ padding: '8px 6px', width: 170 }}>
                    <select
                      value={line.productId}
                      onChange={e => updLine(
                        i, 'productId', e.target.value)}
                      style={{ ...inp, padding: '7px 8px',
                        fontSize: 12, width: 160 }}>
                      <option value="">— None (not stock) —</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  {/* Description */}
                  <td style={{ padding: '8px 10px' }}>
                    <input
                      placeholder="Description of goods or service"
                      value={line.description}
                      onChange={e => updLine(
                        i, 'description', e.target.value)}
                      style={{ ...inp, padding: '7px 10px',
                        fontSize: 12, minWidth: 200 }}/>
                  </td>
                  {/* Account */}
                  <td style={{ padding: '8px 6px', width: 170 }}>
                    <select
                      value={line.accountId}
                      onChange={e => updLine(
                        i, 'accountId', e.target.value)}
                      style={{ ...inp, padding: '7px 8px',
                        fontSize: 12, width: 160 }}>
                      <option value="">Default (Misc Expense)</option>
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  {/* Qty */}
                  <td style={{ padding: '8px 6px', width: 80 }}>
                    <input type="number" min="0" step="0.01"
                      value={line.quantity}
                      onChange={e => updLine(
                        i, 'quantity', e.target.value)}
                      style={{ ...inp, padding: '7px 8px',
                        fontSize: 12, textAlign: 'right',
                        width: 70 }}/>
                  </td>
                  {/* Unit Price */}
                  <td style={{ padding: '8px 6px', width: 120 }}>
                    <input type="number" min="0" step="0.01"
                      value={line.unitPrice}
                      onChange={e => updLine(
                        i, 'unitPrice', e.target.value)}
                      style={{ ...inp, padding: '7px 8px',
                        fontSize: 12, textAlign: 'right',
                        width: 110 }}/>
                  </td>
                  {/* Discount */}
                  <td style={{ padding: '8px 6px', width: 90 }}>
                    <input type="number" min="0"
                      max="100" step="0.01"
                      value={line.discountPct}
                      onChange={e => updLine(
                        i, 'discountPct', e.target.value)}
                      style={{ ...inp, padding: '7px 8px',
                        fontSize: 12, textAlign: 'right',
                        width: 80 }}/>
                  </td>
                  {/* Line Total */}
                  <td style={{ padding: '8px 12px',
                    fontFamily: 'monospace', fontSize: 12,
                    fontWeight: 700, color: '#1e6bbd',
                    textAlign: 'right', width: 120 }}>
                    {fmtCur(calcLine(line))}
                  </td>
                  {/* Remove */}
                  <td style={{ padding: '8px 8px',
                    width: 32, textAlign: 'center' }}>
                    {lines.length > 1 && (
                      <button onClick={() => removeLine(i)}
                        style={{ background: 'none',
                          border: 'none', color: '#e05c5c',
                          fontSize: 18, cursor: 'pointer',
                          lineHeight: 1 }}>
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add line + Totals */}
        <div style={{ padding: '12px 16px',
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-end' }}>
          <button onClick={addLine}
            style={{ background: 'none',
              border: '1.5px dashed #e2e8f0',
              borderRadius: 7, padding: '7px 16px',
              fontSize: 12, color: '#6b7fa3',
              cursor: 'pointer',
              fontFamily: 'sans-serif' }}>
            + Add Line
          </button>

          {/* Totals box */}
          <div style={{ background: '#f4f6f9',
            borderRadius: 9, padding: '14px 18px',
            minWidth: 240 }}>
            <div style={{ display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: '#6b7fa3' }}>Subtotal</span>
              <span style={{ fontFamily: 'monospace',
                fontWeight: 600 }}>
                {fmtCur(subtotal)}
              </span>
            </div>
            <div style={{ display: 'flex',
              justifyContent: 'space-between',
              fontSize: 15, fontWeight: 800,
              paddingTop: 10,
              borderTop: '2px solid #e2e8f0',
              color: '#1e6bbd' }}>
              <span>Total</span>
              <span style={{ fontFamily: 'monospace' }}>
                {fmtCur(subtotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Notes ─────────────────────────────────────────── */}
      <div style={card}>
        <div style={cardHead}>Notes (Optional)</div>
        <div style={cardBody}>
          <textarea
            style={{ ...inp, height: 80, resize: 'vertical' }}
            placeholder="Additional notes about this bill..."
            value={form.notes}
            onChange={e => upd('notes', e.target.value)}/>
        </div>
      </div>

      {/* ── Bottom buttons ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10,
        justifyContent: 'flex-end', paddingBottom: 32 }}>
        <button onClick={() => navigate('/bills')}
          style={{ padding: '12px 24px', borderRadius: 8,
            border: '1px solid #e2e8f0', background: 'white',
            color: '#6b7fa3', fontSize: 13,
            fontWeight: 600, cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '12px 24px', borderRadius: 8,
            border: 'none',
            background: saving ? '#6b7fa3' : '#1e6bbd',
            color: 'white', fontSize: 14,
            fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Saving...' : 'Save Bill'}
        </button>
      </div>
    </div>
  );
}
