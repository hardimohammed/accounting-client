// ============================================================
//  src/pages/settings/PeriodClosePage.js
//  Close a period: zero revenue/expense accounts via a closing
//  journal entry and roll net income/loss into Retained Earnings.
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { periodCloseAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const fmtCur = (n) => `GHS ${Number(n || 0).toLocaleString('en-GH', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})}`;
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const card = {
  background: 'white', borderRadius: 12, border: '1px solid #e2e8f0',
  boxShadow: '0 2px 8px rgba(13,27,42,.04)', marginBottom: 16,
};
const cardHead = { padding: '14px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 14 };
const cardBody = { padding: 20 };

export default function PeriodClosePage() {
  const { hasRole } = useAuth();
  const canClose = hasRole('Admin') || hasRole('Accountant');

  const [history,   setHistory]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));
  const [preview,   setPreview]   = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [closing,   setClosing]   = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const loadHistory = useCallback(() => {
    setLoading(true);
    periodCloseAPI.history()
      .then(res => setHistory(res.data || []))
      .catch(() => toast.error('Could not load period close history'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const runPreview = () => {
    setPreviewing(true);
    setPreview(null);
    periodCloseAPI.preview(periodEnd)
      .then(res => setPreview(res.data))
      .catch(err => toast.error(err.message || 'Could not preview this period'))
      .finally(() => setPreviewing(false));
  };

  const executeClose = () => {
    if (confirmText !== 'CLOSE') {
      return toast.error('Type CLOSE to confirm');
    }
    setClosing(true);
    periodCloseAPI.execute({ periodEnd, notes: `Period close through ${periodEnd}` })
      .then(() => {
        toast.success('Period closed successfully');
        setPreview(null);
        setConfirmText('');
        loadHistory();
      })
      .catch(err => toast.error(err.message || 'Failed to close period'))
      .finally(() => setClosing(false));
  };

  if (!canClose) return (
    <div style={{ padding: 60, textAlign: 'center', color: '#6b7fa3', fontFamily: 'sans-serif' }}>
      Only an Admin or Accountant can close accounting periods.
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a2740', marginBottom: 4 }}>
          Period Close
        </h1>
        <p style={{ fontSize: 13, color: '#6b7fa3' }}>
          Zero out revenue and expense accounts for a period and roll the net income
          or loss into Retained Earnings, so the Balance Sheet reconciles.
        </p>
      </div>

      {/* Run a new close */}
      <div style={card}>
        <div style={cardHead}>Close a Period</div>
        <div style={cardBody}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#1a2740', marginBottom: 6 }}>
            Close through (period end date)
          </label>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input type="date" value={periodEnd}
              onChange={e => { setPeriodEnd(e.target.value); setPreview(null); }}
              style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0',
                borderRadius: 8, fontSize: 13, fontFamily: 'sans-serif',
                background: '#f9fafb', outline: 'none' }}/>
            <button onClick={runPreview} disabled={previewing}
              style={{ padding: '9px 18px', border: '1px solid #1e6bbd',
                background: 'white', color: '#1e6bbd', borderRadius: 8,
                fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {previewing ? 'Loading…' : 'Preview'}
            </button>
          </div>

          {preview && !preview.hasActivity && (
            <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8,
              color: '#6b7fa3', fontSize: 13 }}>
              No posted revenue or expense activity between {fmtDate(preview.periodStart)}
              {' '}and {fmtDate(preview.periodEnd)} — nothing to close.
            </div>
          )}

          {preview && preview.hasActivity && (
            <div>
              <div style={{ fontSize: 12, color: '#6b7fa3', marginBottom: 10 }}>
                Period: {fmtDate(preview.periodStart)} to {fmtDate(preview.periodEnd)}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
                <tbody>
                  {preview.revenueAccounts.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f4f6f9' }}>
                      <td style={{ padding: '6px 4px', fontSize: 12, color: '#1a2740' }}>{a.code} — {a.name}</td>
                      <td style={{ padding: '6px 4px', fontSize: 12, textAlign: 'right',
                        fontFamily: 'monospace', color: '#16c79a' }}>{fmtCur(a.balance)}</td>
                    </tr>
                  ))}
                  {preview.expenseAccounts.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f4f6f9' }}>
                      <td style={{ padding: '6px 4px', fontSize: 12, color: '#1a2740' }}>{a.code} — {a.name}</td>
                      <td style={{ padding: '6px 4px', fontSize: 12, textAlign: 'right',
                        fontFamily: 'monospace', color: '#e05c5c' }}>({fmtCur(a.balance)})</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: '#6b7fa3', marginBottom: 4 }}>Net Income / (Loss)</div>
                  <div style={{ fontSize: 16, fontWeight: 700,
                    color: preview.netIncome >= 0 ? '#16c79a' : '#e05c5c' }}>
                    {preview.netIncome >= 0 ? fmtCur(preview.netIncome) : `(${fmtCur(Math.abs(preview.netIncome))})`}
                  </div>
                </div>
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: '#6b7fa3', marginBottom: 4 }}>Retained Earnings After</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2740' }}>
                    {fmtCur(preview.retainedEarningsAfter)}
                  </div>
                </div>
              </div>

              <div style={{ padding: 14, background: '#fff8e6', border: '1px solid #f0d896',
                borderRadius: 8, marginBottom: 14, fontSize: 12, color: '#8a6d1a' }}>
                This posts a closing journal entry and cannot be undone from this screen.
                Type <strong>CLOSE</strong> below to confirm.
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <input value={confirmText} onChange={e => setConfirmText(e.target.value)}
                  placeholder="Type CLOSE to confirm"
                  style={{ flex: 1, padding: '9px 12px', border: '1.5px solid #e2e8f0',
                    borderRadius: 8, fontSize: 13, fontFamily: 'sans-serif',
                    background: '#f9fafb', outline: 'none' }}/>
                <button onClick={executeClose} disabled={closing || confirmText !== 'CLOSE'}
                  style={{ padding: '9px 20px', border: 'none',
                    background: confirmText === 'CLOSE' ? '#e05c5c' : '#e2e8f0',
                    color: confirmText === 'CLOSE' ? 'white' : '#a1aebd',
                    borderRadius: 8, fontSize: 13, fontWeight: 700,
                    cursor: confirmText === 'CLOSE' ? 'pointer' : 'not-allowed' }}>
                  {closing ? 'Closing…' : 'Close Period'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div style={card}>
        <div style={cardHead}>Close History</div>
        <div style={cardBody}>
          {loading ? (
            <div style={{ color: '#6b7fa3', fontSize: 13 }}>Loading…</div>
          ) : history.length === 0 ? (
            <div style={{ color: '#6b7fa3', fontSize: 13 }}>No periods have been closed yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Period','Revenue','Expenses','Net Income','Entry','Closed By'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left',
                      fontSize: 10, fontWeight: 600, color: '#6b7fa3',
                      textTransform: 'uppercase', letterSpacing: .6,
                      borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} style={{ borderBottom: '1px solid #f4f6f9' }}>
                    <td style={{ padding: '8px 10px', fontSize: 12 }}>
                      {fmtDate(h.period_start)} – {fmtDate(h.period_end)}
                    </td>
                    <td style={{ padding: '8px 10px', fontSize: 12, fontFamily: 'monospace' }}>
                      {fmtCur(h.total_revenue)}
                    </td>
                    <td style={{ padding: '8px 10px', fontSize: 12, fontFamily: 'monospace' }}>
                      {fmtCur(h.total_expenses)}
                    </td>
                    <td style={{ padding: '8px 10px', fontSize: 12, fontFamily: 'monospace',
                      fontWeight: 700, color: parseFloat(h.net_income) >= 0 ? '#16c79a' : '#e05c5c' }}>
                      {fmtCur(h.net_income)}
                    </td>
                    <td style={{ padding: '8px 10px', fontSize: 12, color: '#1e6bbd', fontFamily: 'monospace' }}>
                      {h.entry_number}
                    </td>
                    <td style={{ padding: '8px 10px', fontSize: 12 }}>
                      {h.first_name} {h.last_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
