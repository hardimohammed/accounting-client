// ============================================================
//  src/pages/accounts/JournalDetailPage.js
//  Read-only view of a single journal entry — JournalListPage's rows
//  navigate to /journals/:id but no route (or component) for that ever
//  existed, so every click silently fell through the app's catch-all
//  route to /dashboard. Deliberately NOT reusing JournalFormPage for
//  this: that form's Save always POSTs a brand-new entry regardless of
//  whether it's mid "edit" — wiring this route to it would let clicking
//  into a posted, system-generated entry (e.g. from a POS sale) end
//  with an accidental duplicate. Posted entries are corrected via
//  Reverse (same as the list page), not by editing history in place.
// ============================================================
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';

const fmtCur = (n) => `GHS ${new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(n || 0)}`;

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

function Badge({ status }) {
  const map = {
    draft:    { bg: 'rgba(107,127,163,.12)', color: '#6b7fa3' },
    posted:   { bg: 'rgba(22,199,154,.12)',  color: '#0ea87f' },
    reversed: { bg: 'rgba(224,92,92,.12)',   color: '#c04040' },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{ padding: '4px 12px', borderRadius: 20,
      fontSize: 12, fontWeight: 600, background: s.bg,
      color: s.color, textTransform: 'capitalize' }}>
      {status}
    </span>
  );
}

export default function JournalDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [entry,   setEntry]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [busy,    setBusy]    = useState(false);
  const [related, setRelated] = useState([]);

  const load = () => {
    setLoading(true);
    api.get(`/journals/${id}`)
      .then((res) => {
        setEntry(res.data);
        setError('');
        return res.data;
      })
      .then(loadRelated)
      .catch((err) => setError(err.message || 'Failed to load journal entry'))
      .finally(() => setLoading(false));
  };

  // A split-payment sale posts as TWO separate entries: the original
  // sale (cash settles immediately; a pending mobile-money leg goes to
  // Accounts Receivable as a placeholder) and, once Paystack actually
  // confirms the charge, a second entry that reclassifies AR into the
  // real MoMo account. That second entry's `reference` is a synthetic
  // split-leg id, not the sale number, so it can't be matched via
  // reference — but both entries' descriptions do embed the same
  // source document number (e.g. "POS-2026-00069"), which is also what
  // GET /journals?search= already matches against. Surfacing the other
  // entry here is what actually answers "is the rest of this sale
  // recorded somewhere" instead of leaving it to look incomplete.
  const loadRelated = (currentEntry) => {
    const docNumber = currentEntry?.description?.match(/[A-Z]+-\d{4}-\d+/)?.[0];
    if (!docNumber) { setRelated([]); return; }
    return api.get('/journals', { params: { search: docNumber, limit: 10 } })
      .then((res) => setRelated((res.data || []).filter((e) => e.id !== currentEntry.id)))
      .catch(() => setRelated([]));
  };

  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePost = async () => {
    if (!window.confirm('Post this journal entry to the General Ledger?')) return;
    setBusy(true);
    try {
      await api.post(`/journals/${id}/post`);
      load();
    } catch (err) { alert(err.message); } finally { setBusy(false); }
  };

  const handleReverse = async () => {
    if (!window.confirm('Reverse this journal entry? A new counter-entry will be created.')) return;
    setBusy(true);
    try {
      await api.post(`/journals/${id}/reverse`);
      load();
    } catch (err) { alert(err.message); } finally { setBusy(false); }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80,
      color: '#6b7fa3', fontFamily: 'sans-serif' }}>
      <div style={{ width: 28, height: 28,
        border: '3px solid #e2e8f0', borderTopColor: '#1e6bbd',
        borderRadius: '50%', animation: 'spin .7s linear infinite',
        margin: '0 auto 12px' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      Loading journal entry...
    </div>
  );

  if (error || !entry) return (
    <div style={{ textAlign: 'center', padding: '60px 20px',
      color: '#6b7fa3', fontFamily: 'sans-serif' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <p style={{ fontSize: 15, fontWeight: 600, color: '#1a2740' }}>
        {error || 'Journal entry not found'}
      </p>
      <button onClick={() => navigate('/journals')}
        style={{ marginTop: 16, padding: '10px 22px',
          background: '#1e6bbd', color: 'white', border: 'none',
          borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        Back to Journals
      </button>
    </div>
  );

  const totalDebits  = entry.lines.reduce((s, l) => s + (parseFloat(l.debit_amount)  || 0), 0);
  const totalCredits = entry.lines.reduce((s, l) => s + (parseFloat(l.credit_amount) || 0), 0);

  const card = {
    background: 'white', borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(13,27,42,.04)',
    marginBottom: 16, overflow: 'hidden',
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 1000, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <button onClick={() => navigate('/journals')}
            style={{ background: 'none', border: 'none', color: '#6b7fa3',
              fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 10 }}>
            ← Back to Journals
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a2740',
              fontFamily: 'monospace', margin: 0 }}>
              {entry.entry_number}
            </h1>
            <Badge status={entry.status}/>
          </div>
          {entry.reference && (
            <p style={{ fontSize: 13, color: '#6b7fa3', marginTop: 6 }}>
              Reference: {entry.reference}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {entry.status === 'draft' && (
            <button onClick={handlePost} disabled={busy}
              style={{ padding: '10px 20px', borderRadius: 8,
                border: '1px solid #16c79a', background: 'white',
                color: '#16c79a', fontSize: 13, fontWeight: 700,
                cursor: busy ? 'not-allowed' : 'pointer' }}>
              Post to GL
            </button>
          )}
          {entry.status === 'posted' && (
            <button onClick={handleReverse} disabled={busy}
              style={{ padding: '10px 20px', borderRadius: 8,
                border: '1px solid #e05c5c', background: 'white',
                color: '#e05c5c', fontSize: 13, fontWeight: 700,
                cursor: busy ? 'not-allowed' : 'pointer' }}>
              Reverse Entry
            </button>
          )}
        </div>
      </div>

      {/* Related entries — e.g. a split-payment sale's original entry
          and the later mobile-money confirmation entry are two separate
          rows on the list page; this is what actually shows they're
          part of the same sale instead of one looking incomplete. */}
      {related.length > 0 && (
        <div style={{ ...card, borderLeft: '3px solid #1e6bbd' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0',
            fontWeight: 700, fontSize: 13, color: '#1e6bbd' }}>
            Related Entries — part of the same transaction
          </div>
          <div style={{ padding: '4px 20px' }}>
            {related.map((r) => (
              <div key={r.id}
                onClick={() => navigate(`/journals/${r.id}`)}
                style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '10px 0',
                  borderBottom: '1px solid #f4f6f9', cursor: 'pointer' }}>
                <div>
                  <span style={{ fontFamily: 'monospace', fontSize: 12,
                    color: '#1e6bbd', fontWeight: 600, marginRight: 10 }}>
                    {r.entry_number}
                  </span>
                  <span style={{ fontSize: 13, color: '#1a2740' }}>{r.description}</span>
                </div>
                <Badge status={r.status}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entry details */}
      <div style={card}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0',
          fontWeight: 700, fontSize: 14 }}>
          Entry Details
        </div>
        <div style={{ padding: 20, display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: '#6b7fa3', fontWeight: 600,
              textTransform: 'uppercase', marginBottom: 4 }}>Description</div>
            <div style={{ fontSize: 13, color: '#1a2740' }}>{entry.description}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6b7fa3', fontWeight: 600,
              textTransform: 'uppercase', marginBottom: 4 }}>Entry Date</div>
            <div style={{ fontSize: 13, color: '#1a2740' }}>{fmtDate(entry.entry_date)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6b7fa3', fontWeight: 600,
              textTransform: 'uppercase', marginBottom: 4 }}>Currency</div>
            <div style={{ fontSize: 13, color: '#1a2740' }}>{entry.currency}</div>
          </div>
        </div>
      </div>

      {/* Lines */}
      <div style={card}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0',
          fontWeight: 700, fontSize: 14 }}>
          Journal Lines
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Account', 'Description', 'Debit', 'Credit'].map((h) => (
                <th key={h} style={{ padding: '9px 16px',
                  textAlign: h === 'Debit' || h === 'Credit' ? 'right' : 'left',
                  fontSize: 10, fontWeight: 600, color: '#6b7fa3',
                  textTransform: 'uppercase', letterSpacing: .6,
                  borderBottom: '1px solid #e2e8f0' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entry.lines.map((l) => (
              <tr key={l.id} style={{ borderBottom: '1px solid #f4f6f9' }}>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>
                  <span style={{ fontFamily: 'monospace', color: '#1e6bbd', fontWeight: 600 }}>
                    {l.account_code}
                  </span>{' — '}{l.account_name}
                </td>
                <td style={{ padding: '10px 16px', fontSize: 13, color: '#6b7fa3' }}>
                  {l.description || '—'}
                </td>
                <td style={{ padding: '10px 16px', fontSize: 13, textAlign: 'right',
                  fontFamily: 'monospace', color: '#1e6bbd', fontWeight: 600 }}>
                  {parseFloat(l.debit_amount) > 0 ? fmtCur(l.debit_amount) : ''}
                </td>
                <td style={{ padding: '10px 16px', fontSize: 13, textAlign: 'right',
                  fontFamily: 'monospace', color: '#16c79a', fontWeight: 600 }}>
                  {parseFloat(l.credit_amount) > 0 ? fmtCur(l.credit_amount) : ''}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f8fafc' }}>
              <td colSpan={2} style={{ padding: '10px 16px', fontSize: 12,
                fontWeight: 700, color: '#1a2740' }}>
                Total
              </td>
              <td style={{ padding: '10px 16px', fontSize: 13, textAlign: 'right',
                fontFamily: 'monospace', fontWeight: 800, color: '#1e6bbd' }}>
                {fmtCur(totalDebits)}
              </td>
              <td style={{ padding: '10px 16px', fontSize: 13, textAlign: 'right',
                fontFamily: 'monospace', fontWeight: 800, color: '#16c79a' }}>
                {fmtCur(totalCredits)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
