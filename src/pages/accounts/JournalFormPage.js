// ============================================================
//  src/pages/accounts/JournalFormPage.js
// ============================================================
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';

const fmtCur = (n) => `GHS ${new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(n || 0)}`;

const EMPTY_LINE = {
  accountId: '', description: '',
  debitAmount: '', creditAmount: '',
};

export default function JournalFormPage() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const isEdit    = Boolean(id);

  const [accounts, setAccounts] = useState([]);
  const [saving,   setSaving]   = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [lines,    setLines]    = useState([
    { ...EMPTY_LINE },
    { ...EMPTY_LINE },
  ]);
  const [form, setForm] = useState({
    entryDate:   new Date().toISOString().slice(0, 10),
    description: '',
    reference:   '',
    currency:    'GHS',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const accRes = await api.get('/accounts');
        setAccounts(accRes.data || []);

        if (isEdit) {
          const jeRes = await api.get(`/journals/${id}`);
          const je = jeRes.data;
          setForm({
            entryDate:   je.entry_date?.slice(0, 10) || '',
            description: je.description || '',
            reference:   je.reference   || '',
            currency:    je.currency    || 'GHS',
          });
          setLines(je.lines?.map(l => ({
            accountId:     String(l.account_id),
            description:   l.description || '',
            debitAmount:   parseFloat(l.debit_amount)  || '',
            creditAmount:  parseFloat(l.credit_amount) || '',
          })) || [{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const upd    = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const updLine = (i, f, v) => {
    setLines(prev => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [f]: v };

      // Auto-fill opposing side if one is blank
      if (f === 'debitAmount' && v) {
        copy[i].creditAmount = '';
      }
      if (f === 'creditAmount' && v) {
        copy[i].debitAmount = '';
      }
      return copy;
    });
  };

  const addLine    = () =>
    setLines(p => [...p, { ...EMPTY_LINE }]);
  const removeLine = (i) =>
    lines.length > 2 &&
    setLines(p => p.filter((_, idx) => idx !== i));

  // ── Totals ─────────────────────────────────────────────────
  const totalDebits  = lines.reduce((s, l) =>
    s + (parseFloat(l.debitAmount)  || 0), 0);
  const totalCredits = lines.reduce((s, l) =>
    s + (parseFloat(l.creditAmount) || 0), 0);
  const diff         = Math.abs(totalDebits - totalCredits);
  const isBalanced   = diff < 0.01;

  // ── Group accounts by classification ──────────────────────
  const CLASSES = ['asset','liability','equity',
    'revenue','expense'];
  const grouped = CLASSES.reduce((acc, cls) => {
    acc[cls] = accounts.filter(a => a.classification === cls);
    return acc;
  }, {});

  // ── Save ───────────────────────────────────────────────────
  const handleSave = async (postAfter = false) => {
    if (!form.entryDate)
      return alert('Entry date is required');
    if (!form.description)
      return alert('Description is required');

    const filledLines = lines.filter(
      l => l.accountId &&
        (parseFloat(l.debitAmount) > 0 ||
         parseFloat(l.creditAmount) > 0)
    );

    if (filledLines.length < 2)
      return alert('At least 2 lines with amounts are required');

    if (!isBalanced) {
      return alert(
        `Journal entry is not balanced!\n` +
        `Debits: ${fmtCur(totalDebits)}\n` +
        `Credits: ${fmtCur(totalCredits)}\n` +
        `Difference: ${fmtCur(diff)}`
      );
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        lines: filledLines.map(l => ({
          accountId:    parseInt(l.accountId),
          description:  l.description || null,
          debitAmount:  parseFloat(l.debitAmount)  || 0,
          creditAmount: parseFloat(l.creditAmount) || 0,
        })),
      };

      const res = await api.post('/journals', payload);
      const newId = res.data?.id;

      if (postAfter && newId) {
        await api.post(`/journals/${newId}/post`);
        alert(`Journal entry ${res.data?.entryNumber} created and posted!`);
      } else {
        alert(`Journal entry ${res.data?.entryNumber} saved as draft.`);
      }

      navigate('/journals');
    } catch (err) {
      alert(err.message || 'Failed to save journal entry');
    } finally { setSaving(false); }
  };

  // ── Styles ─────────────────────────────────────────────────
  const inp = {
    width: '100%', padding: '8px 10px',
    border: '1.5px solid #e2e8f0', borderRadius: 7,
    fontSize: 12, fontFamily: 'sans-serif',
    background: '#f9fafb', outline: 'none',
    boxSizing: 'border-box',
  };
  const card = {
    background: 'white', borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(13,27,42,.04)',
    marginBottom: 16, overflow: 'hidden',
  };

  if (loading) return (
    <div style={{ textAlign:'center', padding:80,
      color:'#6b7fa3', fontFamily:'sans-serif' }}>
      <div style={{ width:28, height:28,
        border:'3px solid #e2e8f0',
        borderTopColor:'#1e6bbd', borderRadius:'50%',
        animation:'spin .7s linear infinite',
        margin:'0 auto 12px' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      Loading...
    </div>
  );

  return (
    <div style={{ fontFamily:'sans-serif',
      maxWidth:1100, margin:'0 auto' }}>

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display:'flex',
        justifyContent:'space-between',
        alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700,
            color:'#1a2740', marginBottom:4 }}>
            {isEdit ? 'Edit Journal Entry' : 'New Journal Entry'}
          </h1>
          <p style={{ fontSize:13, color:'#6b7fa3' }}>
            Total Debits must equal Total Credits
            for the entry to balance
          </p>
        </div>
        <div style={{ display:'flex',
          alignItems:'center', gap:10 }}>
          <button onClick={() => navigate('/journals')}
            style={{ padding:'10px 18px', borderRadius:8,
              border:'1px solid #e2e8f0', background:'white',
              color:'#6b7fa3', fontSize:13,
              fontWeight:600, cursor:'pointer' }}>
            Cancel
          </button>
          <button onClick={() => handleSave(false)}
            disabled={saving}
            style={{ padding:'10px 18px', borderRadius:8,
              border:'1px solid #1e6bbd', background:'white',
              color:'#1e6bbd', fontSize:13,
              fontWeight:600,
              cursor:saving ? 'not-allowed' : 'pointer' }}>
            Save Draft
          </button>
          <button onClick={() => handleSave(true)}
            disabled={saving || !isBalanced}
            style={{ padding:'10px 18px', borderRadius:8,
              border:'none',
              background: (!isBalanced || saving)
                ? '#6b7fa3' : '#16c79a',
              color:'white', fontSize:13, fontWeight:700,
              cursor: (!isBalanced || saving)
                ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving...' : 'Save & Post to GL'}
          </button>
        </div>
      </div>

      {/* ── Entry Details ───────────────────────────────── */}
      <div style={card}>
        <div style={{ padding:'14px 20px',
          borderBottom:'1px solid #e2e8f0',
          fontWeight:700, fontSize:14 }}>
          Entry Details
        </div>
        <div style={{ padding:20 }}>
          <div style={{ display:'grid',
            gridTemplateColumns:'2fr 1fr 1fr 1fr',
            gap:14 }}>
            <div>
              <label style={{ display:'block', fontSize:11,
                fontWeight:600, color:'#1a2740',
                marginBottom:6 }}>
                Description *
              </label>
              <input
                style={{ ...inp, padding:'10px 12px',
                  fontSize:13 }}
                placeholder="e.g. Monthly accrual for rent expense"
                value={form.description}
                onChange={e =>
                  upd('description', e.target.value)}/>
            </div>
            <div>
              <label style={{ display:'block', fontSize:11,
                fontWeight:600, color:'#1a2740',
                marginBottom:6 }}>
                Entry Date *
              </label>
              <input
                style={{ ...inp, padding:'10px 12px',
                  fontSize:13 }}
                type="date" value={form.entryDate}
                onChange={e =>
                  upd('entryDate', e.target.value)}/>
            </div>
            <div>
              <label style={{ display:'block', fontSize:11,
                fontWeight:600, color:'#1a2740',
                marginBottom:6 }}>
                Reference
              </label>
              <input
                style={{ ...inp, padding:'10px 12px',
                  fontSize:13 }}
                placeholder="Optional reference"
                value={form.reference}
                onChange={e =>
                  upd('reference', e.target.value)}/>
            </div>
            <div>
              <label style={{ display:'block', fontSize:11,
                fontWeight:600, color:'#1a2740',
                marginBottom:6 }}>
                Currency
              </label>
              <select
                style={{ ...inp, padding:'10px 12px',
                  fontSize:13 }}
                value={form.currency}
                onChange={e =>
                  upd('currency', e.target.value)}>
                {['GHS','USD','EUR','GBP'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Journal Lines ────────────────────────────────── */}
      <div style={card}>
        <div style={{ padding:'14px 20px',
          borderBottom:'1px solid #e2e8f0',
          display:'flex', justifyContent:'space-between',
          alignItems:'center' }}>
          <span style={{ fontWeight:700, fontSize:14 }}>
            Journal Lines
          </span>
          <span style={{ fontSize:11, color:'#6b7fa3' }}>
            Enter debit OR credit for each line — not both
          </span>
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%',
            borderCollapse:'collapse', minWidth:700 }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Account','Line Description',
                  'Debit','Credit',''].map(h => (
                  <th key={h} style={{ padding:'9px 14px',
                    textAlign: h==='Debit'||h==='Credit'
                      ? 'right' : 'left',
                    fontSize:10, fontWeight:600,
                    color:'#6b7fa3',
                    textTransform:'uppercase',
                    letterSpacing:.6,
                    borderBottom:'1px solid #e2e8f0' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => {
                const hasDebit  = parseFloat(line.debitAmount)  > 0;
                const hasCredit = parseFloat(line.creditAmount) > 0;
                return (
                  <tr key={i}
                    style={{ borderBottom:
                      '1px solid #f4f6f9' }}>

                    {/* Account selector */}
                    <td style={{ padding:'8px 10px',
                      minWidth:220 }}>
                      <select
                        value={line.accountId}
                        onChange={e =>
                          updLine(i, 'accountId',
                            e.target.value)}
                        style={{ ...inp, minWidth:200 }}>
                        <option value="">
                          Select account...
                        </option>
                        {CLASSES.map(cls => (
                          <optgroup key={cls}
                            label={cls.toUpperCase()}>
                            {grouped[cls]?.map(a => (
                              <option key={a.id}
                                value={a.id}>
                                {a.code} — {a.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </td>

                    {/* Description */}
                    <td style={{ padding:'8px 10px',
                      minWidth:180 }}>
                      <input
                        placeholder="Line description..."
                        value={line.description}
                        onChange={e =>
                          updLine(i, 'description',
                            e.target.value)}
                        style={inp}/>
                    </td>

                    {/* Debit */}
                    <td style={{ padding:'8px 10px',
                      width:130 }}>
                      <input type="number"
                        min="0" step="0.01"
                        placeholder="0.00"
                        value={line.debitAmount}
                        disabled={hasCredit}
                        onChange={e =>
                          updLine(i, 'debitAmount',
                            e.target.value)}
                        style={{ ...inp,
                          textAlign:'right', width:120,
                          background: hasCredit
                            ? '#f4f6f9' : '#f9fafb',
                          color: hasDebit
                            ? '#1e6bbd' : '#1a2740' }}/>
                    </td>

                    {/* Credit */}
                    <td style={{ padding:'8px 10px',
                      width:130 }}>
                      <input type="number"
                        min="0" step="0.01"
                        placeholder="0.00"
                        value={line.creditAmount}
                        disabled={hasDebit}
                        onChange={e =>
                          updLine(i, 'creditAmount',
                            e.target.value)}
                        style={{ ...inp,
                          textAlign:'right', width:120,
                          background: hasDebit
                            ? '#f4f6f9' : '#f9fafb',
                          color: hasCredit
                            ? '#16c79a' : '#1a2740' }}/>
                    </td>

                    {/* Remove */}
                    <td style={{ padding:'8px 6px',
                      width:32, textAlign:'center' }}>
                      {lines.length > 2 && (
                        <button onClick={() => removeLine(i)}
                          style={{ background:'none',
                            border:'none',
                            color:'#e05c5c',
                            fontSize:18, cursor:'pointer',
                            lineHeight:1 }}>
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer — add line + totals */}
        <div style={{ padding:'12px 16px',
          display:'flex',
          justifyContent:'space-between',
          alignItems:'flex-end',
          borderTop:'1px solid #f4f6f9' }}>
          <button onClick={addLine}
            style={{ background:'none',
              border:'1.5px dashed #e2e8f0',
              borderRadius:7, padding:'7px 16px',
              fontSize:12, color:'#6b7fa3',
              cursor:'pointer',
              fontFamily:'sans-serif' }}>
            + Add Line
          </button>

          {/* Totals */}
          <div style={{ background:'#f4f6f9',
            borderRadius:10, padding:'14px 20px',
            minWidth:300 }}>
            <div style={{ display:'grid',
              gridTemplateColumns:'1fr 1fr 1fr',
              gap:16, marginBottom:10 }}>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:10,
                  color:'#6b7fa3', fontWeight:600,
                  textTransform:'uppercase',
                  letterSpacing:.5,
                  marginBottom:4 }}>Total Debits</div>
                <div style={{ fontFamily:'monospace',
                  fontWeight:800, fontSize:16,
                  color:'#1e6bbd' }}>
                  {fmtCur(totalDebits)}
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:10,
                  color:'#6b7fa3', fontWeight:600,
                  textTransform:'uppercase',
                  letterSpacing:.5,
                  marginBottom:4 }}>Total Credits</div>
                <div style={{ fontFamily:'monospace',
                  fontWeight:800, fontSize:16,
                  color:'#16c79a' }}>
                  {fmtCur(totalCredits)}
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:10,
                  color:'#6b7fa3', fontWeight:600,
                  textTransform:'uppercase',
                  letterSpacing:.5,
                  marginBottom:4 }}>Difference</div>
                <div style={{ fontFamily:'monospace',
                  fontWeight:800, fontSize:16,
                  color: isBalanced
                    ? '#16c79a' : '#e05c5c' }}>
                  {fmtCur(diff)}
                </div>
              </div>
            </div>

            {/* Balance indicator */}
            <div style={{ textAlign:'center',
              padding:'8px 0',
              borderTop:'1px solid #e2e8f0',
              fontSize:12, fontWeight:700,
              color: isBalanced ? '#16c79a' : '#e05c5c' }}>
              {totalDebits === 0 && totalCredits === 0
                ? '— Enter amounts above —'
                : isBalanced
                  ? '✓ Balanced — ready to post'
                  : `⚠ Out of balance by ${fmtCur(diff)}`}
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick reference ──────────────────────────────── */}
      <div style={{ background:'rgba(30,107,189,.04)',
        border:'1px solid rgba(30,107,189,.15)',
        borderRadius:10, padding:'14px 18px',
        marginBottom:24, fontSize:12,
        color:'#1e40af', lineHeight:1.8 }}>
        <strong>Double-Entry Rules:</strong>{' '}
        Assets & Expenses increase with <strong>Debits</strong>.
        Liabilities, Equity & Revenue increase with{' '}
        <strong>Credits</strong>.
        Every entry must have equal Debits and Credits.
      </div>

      {/* ── Bottom buttons ───────────────────────────────── */}
      <div style={{ display:'flex', gap:10,
        justifyContent:'flex-end', paddingBottom:32 }}>
        <button onClick={() => navigate('/journals')}
          style={{ padding:'11px 22px', borderRadius:8,
            border:'1px solid #e2e8f0', background:'white',
            color:'#6b7fa3', fontSize:13,
            fontWeight:600, cursor:'pointer' }}>
          Cancel
        </button>
        <button onClick={() => handleSave(false)}
          disabled={saving}
          style={{ padding:'11px 22px', borderRadius:8,
            border:'1px solid #1e6bbd', background:'white',
            color:'#1e6bbd', fontSize:13,
            fontWeight:600,
            cursor:saving ? 'not-allowed' : 'pointer' }}>
          Save Draft
        </button>
        <button onClick={() => handleSave(true)}
          disabled={saving || !isBalanced}
          style={{ padding:'11px 22px', borderRadius:8,
            border:'none',
            background: (!isBalanced || saving)
              ? '#6b7fa3' : '#16c79a',
            color:'white', fontSize:13, fontWeight:700,
            cursor: (!isBalanced || saving)
              ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Saving...' : '✓ Save & Post to GL'}
        </button>
      </div>
    </div>
  );
}
