// ============================================================
//  src/pages/invoices/InvoiceFormPage.js
//  Create / Edit Invoice with dynamic line items
// ============================================================
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { invoicesAPI, customersAPI, taxAPI, accountsAPI } from '../../api/services';
import api from '../../api/client';
import { fmtCur } from '../../hooks/useApi';
import toast from 'react-hot-toast';

const emptyLine = { productId:null, description:'', quantity:1, unitPrice:0, discountPct:0, taxId:null, taxRate:0, accountId:null, projectId:null };

export default function InvoiceFormPage() {
  const navigate     = useNavigate();
  const { id }       = useParams();
  const isEdit       = !!id;
  const [saving,     setSaving]     = useState(false);
  const [customers,  setCustomers]  = useState([]);
  const [taxTypes,   setTaxTypes]   = useState([]);
  const [accounts,   setAccounts]   = useState([]);
  const [products,   setProducts]   = useState([]);
  const [lines,      setLines]      = useState([{ ...emptyLine }]);
  const [header,     setHeader]     = useState({
    customerId:'', invoiceDate: new Date().toISOString().slice(0,10),
    dueDate:'', currency:'GHS', exchangeRate:1, notes:'', terms:'', template:'default',
  });

  // Load reference data
  useEffect(() => {
    Promise.all([
      customersAPI.list({ limit:200 }),
      taxAPI.types.list(),
      accountsAPI.list({ limit:200 }),
      api.get('/inventory'),
    ]).then(([c, t, a, inv]) => {
      const taxList = t.data || [];
      setCustomers(c.data || []);
      setTaxTypes(taxList);
      setAccounts(a.data  || []);
      setProducts(inv.products || []);

      // Load existing invoice if editing — nested inside this .then()
      // (rather than fired in parallel) so taxList is already resolved
      // by the time lines are built; taxRate is looked up from it directly
      // instead of from taxTypes state, which wouldn't be populated yet.
      if (isEdit) {
        invoicesAPI.getOne(id).then(res => {
          const invData = res.data;
          setHeader({
            customerId:   invData.customer_id,
            invoiceDate:  invData.invoice_date?.slice(0,10),
            dueDate:      invData.due_date?.slice(0,10),
            currency:     invData.currency,
            exchangeRate: invData.exchange_rate,
            notes:        invData.notes || '',
            terms:        invData.terms || '',
            template:     invData.template || 'default',
          });
          setLines(invData.lines.map(l => {
            const tx = taxList.find(t => t.id == l.tax_id);
            return {
              productId:   l.product_id || null,
              description: l.description,
              quantity:    l.quantity,
              unitPrice:   l.unit_price,
              discountPct: l.discount_pct,
              taxId:       l.tax_id,
              taxRate:     tx ? parseFloat(tx.rate) : 0,
              accountId:   l.account_id,
              projectId:   l.project_id,
            };
          }));
        });
      }
    });
  }, [id, isEdit]);

  // ── Line calculations ──────────────────────────────────────
  const calcLine = (line) => {
    const base = (line.quantity || 0) * (line.unitPrice || 0);
    const disc = base * ((line.discountPct || 0) / 100);
    const net  = base - disc;
    const tax  = net * ((line.taxRate  || 0) / 100);
    return { lineTotal: net + tax, taxAmount: tax, net };
  };

  const totals = lines.reduce((acc, l) => {
    const c = calcLine(l);
    acc.subtotal  += c.net;
    acc.taxAmount += c.taxAmount;
    acc.total     += c.lineTotal;
    return acc;
  }, { subtotal:0, taxAmount:0, total:0 });

  // ── Line handlers ──────────────────────────────────────────
  const updateLine = (i, field, value) => {
    setLines(prev => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [field]: value };
      if (field === 'taxId') {
        const tx = taxTypes.find(t => t.id == value);
        copy[i].taxRate = tx ? parseFloat(tx.rate) : 0;
      }
      if (field === 'productId') {
        const p = products.find(p => p.id == value);
        if (p) {
          copy[i].description = p.name;
          copy[i].unitPrice   = parseFloat(p.selling_price) || 0;
        }
      }
      return copy;
    });
  };
  const addLine    = () => setLines(prev => [...prev, { ...emptyLine }]);
  const removeLine = (i) => setLines(prev => prev.filter((_,idx) => idx !== i));

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!header.customerId) return toast.error('Please select a customer');
    if (!header.dueDate)    return toast.error('Please set a due date');
    if (lines.length === 0) return toast.error('Add at least one line item');

    setSaving(true);
    try {
      const payload = { ...header, lines };
      if (isEdit) {
        await invoicesAPI.update(id, payload);
        toast.success('Invoice updated');
      } else {
        const res = await invoicesAPI.create(payload);
        toast.success(`Invoice ${res.data.invoiceNumber} created`);
      }
      navigate('/invoices');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Styles (inline for portability) ───────────────────────
  const S = {
    page:     { maxWidth:1100, margin:'0 auto', fontFamily:"'Sora',sans-serif" },
    heading:  { fontSize:20, fontWeight:700, marginBottom:4 },
    sub:      { fontSize:12, color:'#6b7fa3', marginBottom:28 },
    card:     { background:'white', border:'1px solid #e2e8f0', borderRadius:12, marginBottom:20 },
    cardHead: { padding:'16px 20px', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'center', gap:10 },
    cardBody: { padding:'20px' },
    label:    { display:'block', fontSize:11, fontWeight:600, color:'#1a2740', marginBottom:6 },
    input:    { width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontFamily:"'Sora',sans-serif", fontSize:13, color:'#1a2740', background:'#f9fafb', outline:'none' },
    select:   { width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontFamily:"'Sora',sans-serif", fontSize:13, color:'#1a2740', background:'#f9fafb', outline:'none' },
    grid2:    { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 },
    grid3:    { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 },
    btnPrimary:{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:8, border:'none', background:'#1e6bbd', color:'white', fontFamily:"'Sora',sans-serif", fontSize:13, fontWeight:700, cursor:'pointer' },
    btnGhost:  { display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:8, border:'1px solid #e2e8f0', background:'white', color:'#6b7fa3', fontFamily:"'Sora',sans-serif", fontSize:13, fontWeight:600, cursor:'pointer' },
    btnDanger: { padding:'5px 10px', borderRadius:6, border:'1px solid #e05c5c', background:'#fff5f5', color:'#e05c5c', fontFamily:"'Sora',sans-serif", fontSize:11, cursor:'pointer' },
    btnAdd:    { display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:7, border:'1.5px dashed #e2e8f0', background:'none', color:'#6b7fa3', fontFamily:"'Sora',sans-serif", fontSize:12, cursor:'pointer', transition:'all .2s' },
    th:        { padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:600, color:'#6b7fa3', textTransform:'uppercase', letterSpacing:.6, background:'#f4f6f9', borderBottom:'1px solid #e2e8f0' },
    td:        { padding:'8px 10px', borderBottom:'1px solid #f4f6f9' },
    tdInput:   { width:'100%', padding:'7px 10px', border:'1.5px solid transparent', borderRadius:7, fontFamily:"'Sora',sans-serif", fontSize:12, background:'transparent', outline:'none' },
    totalsBox: { background:'#f4f6f9', borderRadius:10, padding:'16px 20px', marginTop:16, minWidth:280 },
    totalRow:  { display:'flex', justifyContent:'space-between', padding:'5px 0', fontSize:13 },
    totalFinal:{ display:'flex', justifyContent:'space-between', padding:'10px 0 0', fontSize:16, fontWeight:700, borderTop:'2px solid #e2e8f0', marginTop:8, color:'#1e6bbd' },
  };

  return (
    <div style={S.page}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <div>
          <h1 style={S.heading}>{isEdit ? 'Edit Invoice' : 'New Invoice'}</h1>
          <p style={S.sub}>Fill in the details below and save or post to the General Ledger</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button style={S.btnGhost} onClick={() => navigate('/invoices')}>Cancel</button>
          <button style={S.btnPrimary} onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update Invoice' : 'Save Invoice'}
          </button>
        </div>
      </div>

      {/* Header */}
      <div style={S.card}>
        <div style={S.cardHead}><span style={{ fontWeight:700, fontSize:14 }}>Invoice Details</span></div>
        <div style={S.cardBody}>
          <div style={S.grid3}>
            <div>
              <label style={S.label}>Customer *</label>
              <select style={S.select} value={header.customerId} onChange={e=>setHeader({...header,customerId:e.target.value})}>
                <option value="">Select customer…</option>
                {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Invoice Date *</label>
              <input style={S.input} type="date" value={header.invoiceDate} onChange={e=>setHeader({...header,invoiceDate:e.target.value})}/>
            </div>
            <div>
              <label style={S.label}>Due Date *</label>
              <input style={S.input} type="date" value={header.dueDate} onChange={e=>setHeader({...header,dueDate:e.target.value})}/>
            </div>
          </div>
          <div style={{ ...S.grid3, marginTop:16 }}>
            <div>
              <label style={S.label}>Currency</label>
              <select style={S.select} value={header.currency} onChange={e=>setHeader({...header,currency:e.target.value})}>
                {['GHS','USD','EUR','GBP','NGN','KES','ZAR'].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Exchange Rate</label>
              <input style={S.input} type="number" step="0.000001" value={header.exchangeRate} onChange={e=>setHeader({...header,exchangeRate:e.target.value})}/>
            </div>
            <div>
              <label style={S.label}>Template</label>
              <select style={S.select} value={header.template} onChange={e=>setHeader({...header,template:e.target.value})}>
                <option value="default">Default</option>
                <option value="professional">Professional</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div style={S.card}>
        <div style={S.cardHead}><span style={{ fontWeight:700, fontSize:14 }}>Line Items</span></div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
            <thead>
              <tr>
                {['Product','Description','Qty','Unit Price','Discount %','Tax','Line Total',''].map((h,i)=>(
                  <th key={i} style={{ ...S.th, width: i===1?'26%':i===7?60:undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => {
                const { lineTotal } = calcLine(line);
                return (
                  <tr key={i}>
                    <td style={S.td}>
                      <select style={{ ...S.tdInput, border:'1.5px solid #e2e8f0', borderRadius:7, background:'#fafafa', width:160 }}
                        value={line.productId||''} onChange={e=>updateLine(i,'productId',e.target.value||null)}>
                        <option value="">Custom item (no stock impact)</option>
                        {products.map(p=><option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select>
                    </td>
                    <td style={S.td}>
                      <input style={{ ...S.tdInput, border:'1.5px solid #e2e8f0', borderRadius:7, background:'#fafafa' }}
                        placeholder="Description of goods or services"
                        value={line.description} onChange={e=>updateLine(i,'description',e.target.value)}/>
                    </td>
                    <td style={S.td}>
                      <input style={{ ...S.tdInput, textAlign:'right', border:'1.5px solid #e2e8f0', borderRadius:7, background:'#fafafa', width:80 }}
                        type="number" min="0" step="0.01"
                        value={line.quantity} onChange={e=>updateLine(i,'quantity',parseFloat(e.target.value)||0)}/>
                    </td>
                    <td style={S.td}>
                      <input style={{ ...S.tdInput, textAlign:'right', border:'1.5px solid #e2e8f0', borderRadius:7, background:'#fafafa', width:110 }}
                        type="number" min="0" step="0.01"
                        value={line.unitPrice} onChange={e=>updateLine(i,'unitPrice',parseFloat(e.target.value)||0)}/>
                    </td>
                    <td style={S.td}>
                      <input style={{ ...S.tdInput, textAlign:'right', border:'1.5px solid #e2e8f0', borderRadius:7, background:'#fafafa', width:80 }}
                        type="number" min="0" max="100" step="0.01"
                        value={line.discountPct} onChange={e=>updateLine(i,'discountPct',parseFloat(e.target.value)||0)}/>
                    </td>
                    <td style={S.td}>
                      <select style={{ ...S.tdInput, border:'1.5px solid #e2e8f0', borderRadius:7, background:'#fafafa', width:120 }}
                        value={line.taxId||''} onChange={e=>updateLine(i,'taxId',e.target.value||null)}>
                        <option value="">No Tax</option>
                        {taxTypes.map(t=><option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>)}
                      </select>
                    </td>
                    <td style={{ ...S.td, fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:600, textAlign:'right', color:'#1e6bbd' }}>
                      {fmtCur(lineTotal, header.currency)}
                    </td>
                    <td style={S.td}>
                      {lines.length > 1 && (
                        <button style={S.btnDanger} onClick={()=>removeLine(i)}>✕</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
          <button style={S.btnAdd} onClick={addLine}>+ Add Line</button>
          <div style={S.totalsBox}>
            <div style={S.totalRow}><span style={{ color:'#6b7fa3' }}>Subtotal</span><span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12 }}>{fmtCur(totals.subtotal, header.currency)}</span></div>
            <div style={S.totalRow}><span style={{ color:'#6b7fa3' }}>Tax</span><span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12 }}>{fmtCur(totals.taxAmount, header.currency)}</span></div>
            <div style={S.totalFinal}><span>Total</span><span>{fmtCur(totals.total, header.currency)}</span></div>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      <div style={{ ...S.grid2 }}>
        {[['notes','Notes / Memo','e.g. Thank you for your business'],['terms','Payment Terms','e.g. Payment due within 30 days']].map(([field,label,ph])=>(
          <div style={S.card} key={field}>
            <div style={S.cardHead}><span style={{ fontWeight:700, fontSize:14 }}>{label}</span></div>
            <div style={S.cardBody}>
              <textarea style={{ ...S.input, height:100, resize:'vertical' }} placeholder={ph}
                value={header[field]} onChange={e=>setHeader({...header,[field]:e.target.value})}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
