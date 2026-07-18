// ============================================================
//  src/pages/settings/BankReconciliationPage.js
//  Was a Stub — banks.routes.js used to be list/get only (table
//  bank_accounts, no way to actually reconcile anything). Real
//  backend now exists: bank_statement_lines import, unmatched
//  journal lines on the book side, and a match/unmatch workflow.
//  This page is the client side of that: pick a bank account, see
//  statement vs book balance, and match pairs by hand.
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { bankAPI, accountsAPI } from '../../api/services';

const fmtCur = (n) => `GHS ${new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2 }).format(n || 0)}`;

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

function Modal({ open, onClose, title, children, maxWidth = 520 }) {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0,
      background:'rgba(13,27,42,.5)', display:'flex',
      alignItems:'center', justifyContent:'center',
      zIndex:9999, padding:20 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'white', borderRadius:14,
        width:'100%', maxWidth, maxHeight:'90vh', overflow:'auto',
        boxShadow:'0 20px 60px rgba(13,27,42,.25)' }}>
        <div style={{ display:'flex', alignItems:'center',
          justifyContent:'space-between', padding:'18px 24px',
          borderBottom:'1px solid #e2e8f0' }}>
          <span style={{ fontSize:16, fontWeight:700 }}>{title}</span>
          <button onClick={onClose}
            style={{ background:'none', border:'none', fontSize:22,
              color:'#6b7fa3', cursor:'pointer', lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
}

const inp = { width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0',
  borderRadius:8, fontSize:13, fontFamily:'sans-serif', background:'#f9fafb', outline:'none' };
const lbl = { display:'block', fontSize:11, fontWeight:600, color:'#1a2740', marginBottom:6 };
const g2  = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 };

export default function BankReconciliationPage() {
  const [banks, setBanks] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [statementLines, setStatementLines] = useState([]);
  const [journalLines, setJournalLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatementLine, setSelectedStatementLine] = useState(null);
  const [selectedJournalLine, setSelectedJournalLine] = useState(null);
  const [matching, setMatching] = useState(false);

  const [addBankModal, setAddBankModal] = useState(false);
  const [glAccounts, setGlAccounts] = useState([]);
  const [bankForm, setBankForm] = useState({ accountId:'', bankName:'', accountName:'', accountNumber:'', currency:'GHS', openingBalance:0 });
  const [savingBank, setSavingBank] = useState(false);

  const [importModal, setImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);

  const loadBanks = useCallback(() => {
    bankAPI.list().then(res => {
      const rows = res.data || [];
      setBanks(rows);
      if (!selectedBankId && rows.length) setSelectedBankId(rows[0].id);
    }).catch(console.error);
  }, [selectedBankId]);

  useEffect(() => { loadBanks(); }, [loadBanks]);

  const loadReconciliationData = useCallback(() => {
    if (!selectedBankId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      bankAPI.getReconciliationSummary(selectedBankId),
      bankAPI.getStatementLines(selectedBankId, { reconciled: false, limit: 100 }),
      bankAPI.getUnmatchedJournalLines(selectedBankId),
    ]).then(([s, sl, jl]) => {
      setSummary(s.data);
      setStatementLines(sl.data || []);
      setJournalLines(jl.data || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [selectedBankId]);

  useEffect(() => { loadReconciliationData(); }, [loadReconciliationData]);

  const openAddBank = () => {
    accountsAPI.list().then(res => setGlAccounts(res.data || [])).catch(console.error);
    setAddBankModal(true);
  };

  const handleCreateBank = async () => {
    if (!bankForm.accountId)   return alert('Please select a linked GL account');
    if (!bankForm.bankName)    return alert('Bank name is required');
    if (!bankForm.accountName) return alert('Account name is required');
    if (!bankForm.accountNumber) return alert('Account number is required');
    setSavingBank(true);
    try {
      const res = await bankAPI.create(bankForm);
      setAddBankModal(false);
      setBankForm({ accountId:'', bankName:'', accountName:'', accountNumber:'', currency:'GHS', openingBalance:0 });
      loadBanks();
      setSelectedBankId(res.data.id);
    } catch (err) { alert(err.message || 'Failed to create bank account'); }
    finally { setSavingBank(false); }
  };

  // Expects one line per row: date,description,debit,credit,balance
  // — the same shape a bank's own CSV export typically uses, so a
  // user can paste straight from a spreadsheet without reformatting.
  const parseImportText = (text) => {
    return text.trim().split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      const [statementDate, description, debit, credit, balance] = line.split(',').map(s => s.trim());
      return {
        statementDate, description,
        debitAmount: parseFloat(debit) || 0,
        creditAmount: parseFloat(credit) || 0,
        balance: parseFloat(balance) || 0,
      };
    });
  };

  const handleImport = async () => {
    const lines = parseImportText(importText);
    if (lines.length === 0) return alert('Nothing to import — paste at least one line');
    if (lines.some(l => !l.statementDate)) return alert('Every line needs a date (format: YYYY-MM-DD,description,debit,credit,balance)');
    setImporting(true);
    try {
      const res = await bankAPI.importStatementLines(selectedBankId, lines);
      alert(`${res.data.imported} line(s) imported`);
      setImportModal(false);
      setImportText('');
      loadReconciliationData();
    } catch (err) { alert(err.message || 'Import failed'); }
    finally { setImporting(false); }
  };

  const handleMatch = async () => {
    if (!selectedStatementLine || !selectedJournalLine) return;
    setMatching(true);
    try {
      await bankAPI.match(selectedBankId, selectedStatementLine.id, selectedJournalLine.id);
      setSelectedStatementLine(null);
      setSelectedJournalLine(null);
      loadReconciliationData();
    } catch (err) { alert(err.message || 'Match failed'); }
    finally { setMatching(false); }
  };

  // A statement line's net amount (credit - debit, since a bank
  // deposit is a credit to us in their books) compared against a
  // journal line's net amount (debit - credit, our own books) — a
  // real match has these roughly equal in magnitude but opposite in
  // sign convention, so flag amount mismatches as a visual hint
  // rather than silently letting an obviously-wrong pair go through.
  const amountsLookConsistent = selectedStatementLine && selectedJournalLine &&
    Math.abs(
      (parseFloat(selectedStatementLine.debit_amount) - parseFloat(selectedStatementLine.credit_amount)) +
      (parseFloat(selectedJournalLine.debit_amount) - parseFloat(selectedJournalLine.credit_amount))
    ) < 0.01;

  return (
    <div style={{ fontFamily:'sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#1a2740', marginBottom:4 }}>Bank Reconciliation</h1>
          <p style={{ fontSize:13, color:'#6b7fa3' }}>Match your bank statement against the books</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={openAddBank}
            style={{ padding:'10px 18px', borderRadius:8, border:'1px solid #1e6bbd',
              background:'white', color:'#1e6bbd', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            + Add Bank Account
          </button>
          {selectedBankId && (
            <button onClick={() => setImportModal(true)}
              style={{ padding:'10px 20px', background:'#1e6bbd', color:'white',
                border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
              Import Statement
            </button>
          )}
        </div>
      </div>

      {banks.length === 0 ? (
        <div style={{ background:'white', borderRadius:12, border:'1px solid #e2e8f0',
          textAlign:'center', padding:'60px 20px', color:'#6b7fa3' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🏦</div>
          <p style={{ fontSize:15, fontWeight:600, color:'#1a2740', marginBottom:20 }}>No bank accounts yet</p>
          <button onClick={openAddBank}
            style={{ padding:'10px 24px', background:'#1e6bbd', color:'white',
              border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
            + Add Your First Bank Account
          </button>
        </div>
      ) : (
        <>
          {/* Bank account tabs */}
          <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
            {banks.map(b => (
              <button key={b.id} onClick={() => { setSelectedBankId(b.id); setSelectedStatementLine(null); setSelectedJournalLine(null); }}
                style={{ padding:'9px 18px', borderRadius:8, border:'none', cursor:'pointer',
                  fontSize:13, fontWeight:600,
                  background: selectedBankId===b.id ? '#1e6bbd' : 'white',
                  color: selectedBankId===b.id ? 'white' : '#6b7fa3',
                  boxShadow: selectedBankId===b.id ? '0 4px 12px rgba(30,107,189,.25)' : '0 1px 4px rgba(0,0,0,.06)' }}>
                {b.bank_name} — {b.account_name}
              </button>
            ))}
          </div>

          {/* Summary */}
          {summary && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
              {[
                { label:'Statement Balance', value: summary.statementBalance !== null ? fmtCur(summary.statementBalance) : '—', color:'#C8102E' },
                { label:'Book Balance', value: fmtCur(summary.bookBalance), color:'#D9A521' },
                // Keeps its warning behavior — this is a real balanced/
                // unbalanced signal, not just decorative, so it stays red
                // when something's actually wrong instead of always
                // showing green regardless of state.
                { label:'Difference', value: summary.difference !== null ? fmtCur(summary.difference) : '—',
                  color: summary.difference === null || Math.abs(summary.difference) < 0.01 ? '#046A38' : '#e05c5c' },
                { label:'Unreconciled Lines', value: summary.unreconciledStatementLines, color:'#1A1A2E' },
              ].map((s,i) => (
                <div key={i} style={{ background:s.color, borderRadius:12, padding:16,
                  boxShadow:'0 2px 8px rgba(13,27,42,.1)' }}>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.75)', fontWeight:500, marginBottom:6 }}>{s.label}</div>
                  <div style={{ fontSize:18, fontWeight:700, color:'white' }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign:'center', padding:60, color:'#6b7fa3' }}>Loading...</div>
          ) : (
            <>
              <div style={g2}>
                {/* Bank statement side */}
                <div style={{ background:'white', borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden' }}>
                  <div style={{ padding:'14px 20px', borderBottom:'1px solid #e2e8f0', fontWeight:700, fontSize:14 }}>
                    Bank Statement (unreconciled)
                  </div>
                  {statementLines.length === 0 ? (
                    <div style={{ textAlign:'center', padding:40, color:'#6b7fa3', fontSize:13 }}>
                      Nothing unreconciled — import a statement to get started.
                    </div>
                  ) : statementLines.map(line => (
                    <div key={line.id} onClick={() => setSelectedStatementLine(line)}
                      style={{ padding:'12px 20px', borderBottom:'1px solid #f4f6f9', cursor:'pointer',
                        background: selectedStatementLine?.id === line.id ? '#eff6ff' : 'white' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                        <span style={{ fontWeight:600 }}>{line.description || '(no description)'}</span>
                        <span style={{ fontFamily:'monospace', fontWeight:700,
                          color: parseFloat(line.credit_amount) > 0 ? '#16c79a' : '#e05c5c' }}>
                          {parseFloat(line.credit_amount) > 0 ? '+' : '−'}{fmtCur(parseFloat(line.credit_amount) || parseFloat(line.debit_amount))}
                        </span>
                      </div>
                      <div style={{ fontSize:11, color:'#6b7fa3', marginTop:4 }}>{fmtDate(line.statement_date)} · {line.reference || 'no ref'}</div>
                    </div>
                  ))}
                </div>

                {/* Book (GL) side */}
                <div style={{ background:'white', borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden' }}>
                  <div style={{ padding:'14px 20px', borderBottom:'1px solid #e2e8f0', fontWeight:700, fontSize:14 }}>
                    Books (unmatched GL entries)
                  </div>
                  {journalLines.length === 0 ? (
                    <div style={{ textAlign:'center', padding:40, color:'#6b7fa3', fontSize:13 }}>
                      Nothing unmatched on the books side.
                    </div>
                  ) : journalLines.map(line => (
                    <div key={line.id} onClick={() => setSelectedJournalLine(line)}
                      style={{ padding:'12px 20px', borderBottom:'1px solid #f4f6f9', cursor:'pointer',
                        background: selectedJournalLine?.id === line.id ? '#eff6ff' : 'white' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                        <span style={{ fontWeight:600 }}>{line.description || line.entry_number}</span>
                        <span style={{ fontFamily:'monospace', fontWeight:700,
                          color: parseFloat(line.debit_amount) > 0 ? '#16c79a' : '#e05c5c' }}>
                          {parseFloat(line.debit_amount) > 0 ? '+' : '−'}{fmtCur(parseFloat(line.debit_amount) || parseFloat(line.credit_amount))}
                        </span>
                      </div>
                      <div style={{ fontSize:11, color:'#6b7fa3', marginTop:4 }}>{fmtDate(line.entry_date)} · {line.entry_number}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Match action bar */}
              {(selectedStatementLine || selectedJournalLine) && (
                <div style={{ position:'sticky', bottom:20, marginTop:20, background:'white', borderRadius:12,
                  border:'1px solid #e2e8f0', boxShadow:'0 8px 24px rgba(13,27,42,.12)', padding:'16px 20px',
                  display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ fontSize:13 }}>
                    {selectedStatementLine ? `Statement: ${selectedStatementLine.description || '(no description)'}` : 'Select a statement line'}
                    {' ↔ '}
                    {selectedJournalLine ? `Book: ${selectedJournalLine.description || selectedJournalLine.entry_number}` : 'Select a book entry'}
                    {selectedStatementLine && selectedJournalLine && !amountsLookConsistent && (
                      <span style={{ color:'#e05c5c', fontWeight:600, marginLeft:10 }}>⚠️ Amounts don't look like a match</span>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={() => { setSelectedStatementLine(null); setSelectedJournalLine(null); }}
                      style={{ padding:'9px 16px', borderRadius:8, border:'1px solid #e2e8f0', background:'white',
                        color:'#6b7fa3', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                      Clear
                    </button>
                    <button onClick={handleMatch} disabled={!selectedStatementLine || !selectedJournalLine || matching}
                      style={{ padding:'9px 18px', borderRadius:8, border:'none',
                        background: (!selectedStatementLine || !selectedJournalLine || matching) ? '#6b7fa3' : '#16c79a',
                        color:'white', fontSize:12, fontWeight:700,
                        cursor: (!selectedStatementLine || !selectedJournalLine || matching) ? 'not-allowed' : 'pointer' }}>
                      {matching ? 'Matching...' : 'Match'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Add Bank Account Modal */}
      <Modal open={addBankModal} onClose={() => setAddBankModal(false)} title="Add Bank Account">
        <div>
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Linked GL Account *</label>
            <select style={inp} value={bankForm.accountId} onChange={e => setBankForm(f => ({ ...f, accountId: e.target.value }))}>
              <option value="">Select account...</option>
              {glAccounts.map(a => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          <div style={g2}>
            <div>
              <label style={lbl}>Bank Name *</label>
              <input style={inp} value={bankForm.bankName} onChange={e => setBankForm(f => ({ ...f, bankName: e.target.value }))} />
            </div>
            <div>
              <label style={lbl}>Account Name *</label>
              <input style={inp} value={bankForm.accountName} onChange={e => setBankForm(f => ({ ...f, accountName: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginTop:14 }}>
            <label style={lbl}>Account Number *</label>
            <input style={inp} value={bankForm.accountNumber} onChange={e => setBankForm(f => ({ ...f, accountNumber: e.target.value }))} />
          </div>
          <div style={{ ...g2, marginTop:14 }}>
            <div>
              <label style={lbl}>Currency</label>
              <input style={inp} value={bankForm.currency} onChange={e => setBankForm(f => ({ ...f, currency: e.target.value }))} />
            </div>
            <div>
              <label style={lbl}>Opening Balance</label>
              <input style={inp} type="number" step="0.01" value={bankForm.openingBalance}
                onChange={e => setBankForm(f => ({ ...f, openingBalance: e.target.value }))} />
            </div>
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:24 }}>
            <button onClick={() => setAddBankModal(false)}
              style={{ padding:'10px 20px', borderRadius:8, border:'1px solid #e2e8f0', background:'white',
                color:'#6b7fa3', fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancel</button>
            <button onClick={handleCreateBank} disabled={savingBank}
              style={{ padding:'10px 20px', borderRadius:8, border:'none',
                background: savingBank ? '#6b7fa3' : '#1e6bbd', color:'white', fontSize:13, fontWeight:700,
                cursor: savingBank ? 'not-allowed' : 'pointer' }}>
              {savingBank ? 'Saving...' : 'Add Bank Account'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Import Statement Modal */}
      <Modal open={importModal} onClose={() => setImportModal(false)} title="Import Bank Statement" maxWidth={620}>
        <div>
          <p style={{ fontSize:12.5, color:'#6b7fa3', marginBottom:10 }}>
            Paste one line per transaction: <code>date,description,debit,credit,balance</code> — e.g.
            <br /><code>2026-06-01,Deposit from customer,0,500,1500</code>
          </p>
          <textarea style={{ ...inp, height:180, resize:'vertical', fontFamily:'monospace' }}
            placeholder="2026-06-01,Deposit,0,500,1500&#10;2026-06-02,Withdrawal,100,0,1400"
            value={importText} onChange={e => setImportText(e.target.value)} />
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:24 }}>
            <button onClick={() => setImportModal(false)}
              style={{ padding:'10px 20px', borderRadius:8, border:'1px solid #e2e8f0', background:'white',
                color:'#6b7fa3', fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancel</button>
            <button onClick={handleImport} disabled={importing}
              style={{ padding:'10px 20px', borderRadius:8, border:'none',
                background: importing ? '#6b7fa3' : '#1e6bbd', color:'white', fontSize:13, fontWeight:700,
                cursor: importing ? 'not-allowed' : 'pointer' }}>
              {importing ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
