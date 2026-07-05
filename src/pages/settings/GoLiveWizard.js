// ============================================================
//  src/pages/settings/GoLiveWizard.js
//  Go-Live / Data Reset Wizard — admin-only, one-time,
//  irreversible transition from test data to real live data.
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { goLiveAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const fmtCur = (n) => `GHS ${Number(n || 0).toLocaleString('en-GH', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})}`;

const WONT_DELETE = [
  'Company settings',
  'User accounts and roles',
  'Chart of Accounts',
  'Tax settings',
  'SDG reference data',
  'Product catalogue (stock quantities are reset, not the products)',
];

const STEPS = ['Warning', 'Opening Balances', 'Opening Stock', 'Review & Execute'];

export default function GoLiveWizard() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const isAdmin = hasRole('Admin');

  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [step,    setStep]    = useState(1);
  const [confirmText, setConfirmText] = useState('');
  const [balances, setBalances] = useState({}); // { accountId: amountString }
  const [stock,    setStock]    = useState({}); // { productId: quantityString }
  const [executing, setExecuting] = useState(false);
  const [result,   setResult]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    goLiveAPI.preview()
      .then(res => setPreview(res.data))
      .catch(() => toast.error('Could not load Go-Live status'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (isAdmin) load(); else setLoading(false); }, [isAdmin, load]);

  if (!isAdmin) return (
    <div style={{ padding: 60, textAlign: 'center', color: '#6b7fa3', fontFamily: 'sans-serif' }}>
      Only an organisation Admin can access the Go-Live wizard.
    </div>
  );
  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: '#6b7fa3', fontFamily: 'sans-serif' }}>Loading…</div>
  );
  if (!preview) return null;

  if (result) {
    return (
      <div style={{ fontFamily: 'sans-serif', maxWidth: 640, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a2740', marginBottom: 8 }}>
          You're live!
        </h1>
        <p style={{ fontSize: 14, color: '#6b7fa3', marginBottom: 24 }}>
          All test data has been cleared and your opening balances are posted.
          This organisation is now recording real transactions.
        </p>
        <button onClick={() => navigate('/dashboard')}
          style={{ padding: '12px 28px', background: '#1e6bbd', color: 'white',
            border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (preview.isLive) {
    return (
      <div style={{ fontFamily: 'sans-serif', maxWidth: 640, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🔒</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a2740', marginBottom: 8 }}>
          Already Live
        </h1>
        <p style={{ fontSize: 14, color: '#6b7fa3' }}>
          This organisation went live on{' '}
          {new Date(preview.liveAt).toLocaleString('en-GB', {
            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })}. The Go-Live wizard runs once and cannot be repeated.
        </p>
      </div>
    );
  }

  const inp = {
    width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0',
    borderRadius: 8, fontSize: 13, fontFamily: 'sans-serif',
    background: '#f9fafb', outline: 'none', boxSizing: 'border-box',
  };
  const card = {
    background: 'white', borderRadius: 12, border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(13,27,42,.04)', marginBottom: 16, overflow: 'hidden',
  };
  const cardHead = { padding: '14px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 14, color: '#1a2740' };
  const cardBody = { padding: 20 };

  const balanceTotal = Object.values(balances).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const stockTouched  = Object.values(stock).filter(v => v !== '' && v !== undefined).length;

  const handleExecute = async () => {
    setExecuting(true);
    try {
      const openingBalances = Object.entries(balances)
        .filter(([, v]) => parseFloat(v) > 0)
        .map(([accountId, v]) => ({ accountId: parseInt(accountId), amount: parseFloat(v) }));
      const openingStock = Object.entries(stock)
        .filter(([, v]) => v !== '' && v !== undefined)
        .map(([productId, v]) => ({ productId: parseInt(productId), quantity: parseFloat(v) || 0 }));

      const res = await goLiveAPI.execute({ confirmText, openingBalances, openingStock });
      setResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Go-Live failed');
    } finally { setExecuting(false); }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a2740', marginBottom: 4 }}>
        Go-Live Wizard
      </h1>
      <p style={{ fontSize: 13, color: '#6b7fa3', marginBottom: 20 }}>
        Safely clear test data and switch this organisation to recording real transactions.
      </p>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {STEPS.map((label, i) => (
          <div key={label} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', margin: '0 auto 6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
              background: step > i + 1 ? '#16c79a' : step === i + 1 ? '#1e6bbd' : '#e2e8f0',
              color: step >= i + 1 ? 'white' : '#6b7fa3' }}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <div style={{ fontSize: 10, color: step === i + 1 ? '#1a2740' : '#6b7fa3',
              fontWeight: step === i + 1 ? 700 : 400 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Step 1: Warning + Confirmation ── */}
      {step === 1 && (
        <>
          <div style={{ ...card, borderColor: '#fca5a5' }}>
            <div style={{ ...cardHead, color: '#e05c5c', borderColor: '#fca5a5' }}>
              ⚠ This will permanently delete
            </div>
            <div style={cardBody}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {[
                    ['Invoices', preview.counts.invoices],
                    ['Bills', preview.counts.bills],
                    ['POS Sales', preview.counts.posSales],
                    ['Journal Entries', preview.counts.journalEntries],
                    ['Inventory Movements', preview.counts.inventoryMovements],
                    ['Customers', preview.counts.customers],
                    ['Suppliers', preview.counts.suppliers],
                    ['ESG Metrics', preview.counts.esgMetrics],
                    ['Cash Drawer Sessions', preview.counts.cashSessions],
                  ].map(([label, count]) => (
                    <tr key={label} style={{ borderBottom: '1px solid #f4f6f9' }}>
                      <td style={{ padding: '8px 0', color: '#1a2740' }}>{label}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#e05c5c' }}>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={card}>
            <div style={cardHead}>✓ This will NOT be deleted</div>
            <div style={cardBody}>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#1a2740', lineHeight: 1.9 }}>
                {WONT_DELETE.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>

          <div style={{ ...card, borderColor: '#fca5a5' }}>
            <div style={cardBody}>
              <p style={{ fontSize: 13, color: '#1a2740', marginBottom: 12 }}>
                This action cannot be undone. Type <strong>GOLIVE</strong> below to confirm you understand.
              </p>
              <input style={{ ...inp, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 2 }}
                placeholder="Type GOLIVE"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}/>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button disabled={confirmText !== 'GOLIVE'}
              onClick={() => setStep(2)}
              style={{ padding: '11px 24px', borderRadius: 8, border: 'none',
                background: confirmText === 'GOLIVE' ? '#e05c5c' : '#6b7fa3',
                color: 'white', fontSize: 13, fontWeight: 700,
                cursor: confirmText === 'GOLIVE' ? 'pointer' : 'not-allowed' }}>
              Continue →
            </button>
          </div>
        </>
      )}

      {/* ── Step 2: Opening Balances ── */}
      {step === 2 && (
        <>
          <div style={card}>
            <div style={cardHead}>Opening Balances</div>
            <div style={cardBody}>
              <p style={{ fontSize: 12, color: '#6b7fa3', marginBottom: 16 }}>
                Enter the real cash/bank balance for each account as of today. Leave blank for accounts with no opening balance.
              </p>
              {preview.assetAccounts.length === 0 ? (
                <div style={{ fontSize: 13, color: '#6b7fa3' }}>No asset accounts found.</div>
              ) : preview.assetAccounts.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ flex: 1, fontSize: 13 }}>
                    <span style={{ fontFamily: 'monospace', color: '#6b7fa3', marginRight: 8 }}>{a.code}</span>
                    {a.name}
                  </div>
                  <input type="number" min="0" step="0.01" placeholder="0.00"
                    style={{ ...inp, width: 160, textAlign: 'right', fontFamily: 'monospace' }}
                    value={balances[a.id] || ''}
                    onChange={e => setBalances(b => ({ ...b, [a.id]: e.target.value }))}/>
                </div>
              ))}
              {balanceTotal > 0 && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(30,107,189,.06)',
                  borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#1e6bbd',
                  display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total opening balance</span>
                  <span style={{ fontFamily: 'monospace' }}>{fmtCur(balanceTotal)}</span>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(1)}
              style={{ padding: '11px 24px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: 'white', color: '#6b7fa3', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              ← Back
            </button>
            <button onClick={() => setStep(3)}
              style={{ padding: '11px 24px', borderRadius: 8, border: 'none',
                background: '#1e6bbd', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Continue →
            </button>
          </div>
        </>
      )}

      {/* ── Step 3: Opening Inventory Stock ── */}
      {step === 3 && (
        <>
          <div style={card}>
            <div style={cardHead}>Opening Inventory Stock</div>
            <div style={cardBody}>
              <p style={{ fontSize: 12, color: '#6b7fa3', marginBottom: 16 }}>
                Enter the actual quantity on hand for each product today. Stock is reset to zero
                first, so anything left blank starts at zero. Products with size/color variants
                can have their variant-level quantities set afterward from the Inventory page.
              </p>
              {preview.products.length === 0 ? (
                <div style={{ fontSize: 13, color: '#6b7fa3' }}>No inventory products found.</div>
              ) : (
                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                  {preview.products.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <div style={{ flex: 1, fontSize: 13 }}>
                        <span style={{ fontFamily: 'monospace', color: '#6b7fa3', marginRight: 8 }}>{p.sku}</span>
                        {p.name}
                      </div>
                      <input type="number" min="0" step="1" placeholder="0"
                        style={{ ...inp, width: 120, textAlign: 'right', fontFamily: 'monospace' }}
                        value={stock[p.id] ?? ''}
                        onChange={e => setStock(s => ({ ...s, [p.id]: e.target.value }))}/>
                    </div>
                  ))}
                </div>
              )}
              {stockTouched > 0 && (
                <div style={{ marginTop: 12, fontSize: 12, color: '#0ea87f', fontWeight: 600 }}>
                  ✓ {stockTouched} product{stockTouched !== 1 ? 's' : ''} set
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(2)}
              style={{ padding: '11px 24px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: 'white', color: '#6b7fa3', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              ← Back
            </button>
            <button onClick={() => setStep(4)}
              style={{ padding: '11px 24px', borderRadius: 8, border: 'none',
                background: '#1e6bbd', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Continue →
            </button>
          </div>
        </>
      )}

      {/* ── Step 4: Final Review ── */}
      {step === 4 && (
        <>
          <div style={card}>
            <div style={cardHead}>Final Review</div>
            <div style={cardBody}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#e05c5c', marginBottom: 6 }}>
                  WILL DELETE
                </div>
                <div style={{ fontSize: 13, color: '#1a2740' }}>
                  {preview.counts.invoices} invoices, {preview.counts.bills} bills,{' '}
                  {preview.counts.posSales} POS sales, {preview.counts.journalEntries} journal entries,{' '}
                  {preview.counts.customers} customers, {preview.counts.suppliers} suppliers,{' '}
                  {preview.counts.esgMetrics} ESG metrics, {preview.counts.cashSessions} cash sessions.
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e6bbd', marginBottom: 6 }}>
                  OPENING BALANCES
                </div>
                <div style={{ fontSize: 13, color: '#1a2740' }}>
                  {balanceTotal > 0
                    ? `${fmtCur(balanceTotal)} across ${Object.values(balances).filter(v => parseFloat(v) > 0).length} account(s)`
                    : 'None entered'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0ea87f', marginBottom: 6 }}>
                  OPENING STOCK
                </div>
                <div style={{ fontSize: 13, color: '#1a2740' }}>
                  {stockTouched > 0 ? `${stockTouched} product(s) set` : 'None entered — all stock starts at zero'}
                </div>
              </div>
            </div>
          </div>

          <div style={{ ...card, borderColor: '#fca5a5', background: '#fff5f5' }}>
            <div style={cardBody}>
              <p style={{ fontSize: 13, color: '#c04040', fontWeight: 600, margin: 0 }}>
                This is your last chance to go back. Once you click "Go Live Now", all test data
                listed above is permanently deleted and this wizard can never run again for this organisation.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(3)} disabled={executing}
              style={{ padding: '11px 24px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: 'white', color: '#6b7fa3', fontSize: 13, fontWeight: 600,
                cursor: executing ? 'not-allowed' : 'pointer' }}>
              ← Back
            </button>
            <button onClick={handleExecute} disabled={executing}
              style={{ padding: '11px 24px', borderRadius: 8, border: 'none',
                background: executing ? '#6b7fa3' : '#e05c5c', color: 'white',
                fontSize: 13, fontWeight: 700, cursor: executing ? 'not-allowed' : 'pointer' }}>
              {executing ? 'Going Live…' : '🚀 Go Live Now'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
