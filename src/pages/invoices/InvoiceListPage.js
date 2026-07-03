import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

// ── Helpers ───────────────────────────────────────────────────
const fmtCur = (n) => `GHS ${new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(n || 0)}`;

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  : '—';

// ── Badge ─────────────────────────────────────────────────────
function Badge({ status }) {
  const map = {
    draft:     { bg: 'rgba(107,127,163,.12)', color: '#6b7fa3' },
    sent:      { bg: 'rgba(30,107,189,.12)',  color: '#1e6bbd' },
    paid:      { bg: 'rgba(22,199,154,.12)',  color: '#0ea87f' },
    partial:   { bg: 'rgba(232,160,74,.14)',  color: '#c47a1a' },
    overdue:   { bg: 'rgba(224,92,92,.12)',   color: '#c04040' },
    cancelled: { bg: 'rgba(107,127,163,.12)', color: '#6b7fa3' },
    void:      { bg: 'rgba(224,92,92,.10)',   color: '#c04040' },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11,
      fontWeight: 600, background: s.bg, color: s.color,
      textTransform: 'capitalize' }}>
      {status}
    </span>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function InvoiceListPage() {
  const navigate = useNavigate();

  const [invoices,   setInvoices]   = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [page,       setPage]       = useState(1);
  const [total,      setTotal]      = useState(0);
  const LIMIT = 20;

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page, limit: LIMIT,
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      const [listRes, statsRes] = await Promise.all([
        api.get(`/invoices?${params}`),
        api.get('/invoices/stats'),
      ]);
      setInvoices(listRes.data || []);
      setTotal(listRes.pagination?.total || 0);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, statusFilter]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };
  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter') load();
  };

  const totalPages = Math.ceil(total / LIMIT);
  const s = stats || {};

  return (
    <div style={{ fontFamily: 'sans-serif' }}>

      {/* ── Header ──────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700,
            color: '#1a2740', marginBottom: 4 }}>
            Invoices
          </h1>
          <p style={{ fontSize: 13, color: '#6b7fa3' }}>
            Create, send and track all your customer invoices
          </p>
        </div>
        <button onClick={() => navigate('/invoices/new')}
          style={{ padding: '10px 20px', background: '#1e6bbd',
            color: 'white', border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + New Invoice
        </button>
      </div>

      {/* ── Stats Row ───────────────────────────────────── */}
      <div style={{ display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Billed',       value: fmtCur(s.total_billed),      color: '#1e6bbd' },
          { label: 'Total Collected',    value: fmtCur(s.total_collected),   color: '#16c79a' },
          { label: 'Outstanding',        value: fmtCur(s.total_outstanding), color: '#e8a04a' },
          { label: 'Collection Rate',    value: `${s.collection_rate || 0}%`, color: '#7c3aed' },
        ].map((st, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12,
            padding: 16, border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(13,27,42,.04)' }}>
            <div style={{ fontSize: 11, color: '#6b7fa3',
              fontWeight: 500, marginBottom: 6 }}>
              {st.label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: st.color }}>
              {st.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────── */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0',
        borderRadius: 10, padding: '10px 16px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center',
          gap: 8, flex: 1, minWidth: 200 }}>
          <span>🔍</span>
          <input
            placeholder="Search invoice number or customer..."
            value={search}
            onChange={handleSearch}
            onKeyDown={handleSearchSubmit}
            style={{ border: 'none', outline: 'none', fontSize: 13,
              fontFamily: 'sans-serif', flex: 1, background: 'none',
              color: '#1a2740' }}
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }}
              style={{ background: 'none', border: 'none',
                cursor: 'pointer', color: '#6b7fa3', fontSize: 16 }}>
              ×
            </button>
          )}
        </div>
        {/* Status filter */}
        <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }}
          style={{ padding: '7px 12px', border: '1px solid #e2e8f0',
            borderRadius: 7, fontSize: 12, fontFamily: 'sans-serif',
            color: '#1a2740', background: '#f9fafb', outline: 'none' }}>
          <option value="">All Status</option>
          {['draft','sent','partial','paid','overdue','cancelled','void'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
          ))}
        </select>
        <button onClick={load}
          style={{ padding: '7px 16px', background: '#1e6bbd', color: 'white',
            border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600,
            cursor: 'pointer' }}>
          Search
        </button>
      </div>

      {/* ── Table ───────────────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: 12,
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(13,27,42,.04)', overflow: 'hidden' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#6b7fa3' }}>
            <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0',
              borderTopColor: '#1e6bbd', borderRadius: '50%',
              animation: 'spin .7s linear infinite',
              margin: '0 auto 12px' }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            Loading invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px',
            color: '#6b7fa3' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
            <p style={{ fontSize: 15, fontWeight: 600,
              color: '#1a2740', marginBottom: 6 }}>
              {statusFilter || search ? 'No invoices match your filter'
                : 'No invoices yet'}
            </p>
            <p style={{ fontSize: 13, marginBottom: 20 }}>
              {statusFilter || search
                ? 'Try clearing your filters'
                : 'Create your first invoice to get started'}
            </p>
            {!statusFilter && !search && (
              <button onClick={() => navigate('/invoices/new')}
                style={{ padding: '10px 24px', background: '#1e6bbd',
                  color: 'white', border: 'none', borderRadius: 8,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                + Create First Invoice
              </button>
            )}
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Invoice #','Customer','Invoice Date','Due Date',
                    'Total','Paid','Balance','Status',''].map(h => (
                    <th key={h} style={{ padding: '10px 16px',
                      textAlign: 'left', fontSize: 10, fontWeight: 600,
                      color: '#6b7fa3', textTransform: 'uppercase',
                      letterSpacing: .7, background: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => {
                  const balance = parseFloat(inv.balance_due || 0);
                  const isOverdue = inv.status !== 'paid' &&
                    new Date(inv.due_date) < new Date() && balance > 0;
                  return (
                    <tr key={i}
                      style={{ borderBottom: '1px solid #f4f6f9',
                        cursor: 'pointer' }}
                      onClick={() => navigate(`/invoices/${inv.id}`)}>
                      <td style={{ padding: '12px 16px',
                        fontFamily: 'monospace', fontSize: 12,
                        color: '#1e6bbd', fontWeight: 600 }}>
                        {inv.invoice_number}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>
                          {inv.customer_name}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px',
                        color: '#6b7fa3', fontSize: 13 }}>
                        {fmtDate(inv.invoice_date)}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13,
                        color: isOverdue ? '#e05c5c' : '#6b7fa3',
                        fontWeight: isOverdue ? 600 : 400 }}>
                        {fmtDate(inv.due_date)}
                      </td>
                      <td style={{ padding: '12px 16px',
                        fontFamily: 'monospace', fontSize: 12 }}>
                        {fmtCur(inv.total_amount)}
                      </td>
                      <td style={{ padding: '12px 16px',
                        fontFamily: 'monospace', fontSize: 12,
                        color: '#16c79a' }}>
                        {fmtCur(inv.amount_paid)}
                      </td>
                      <td style={{ padding: '12px 16px',
                        fontFamily: 'monospace', fontSize: 12,
                        fontWeight: 700,
                        color: balance > 0 ? '#e8a04a' : '#16c79a' }}>
                        {fmtCur(balance)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge status={isOverdue ? 'overdue' : inv.status}/>
                      </td>
                      <td style={{ padding: '12px 16px' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => navigate(`/invoices/${inv.id}`)}
                            style={{ padding: '5px 10px', borderRadius: 6,
                              border: '1px solid #e2e8f0', background: 'white',
                              color: '#6b7fa3', fontSize: 11,
                              cursor: 'pointer', fontWeight: 600 }}>
                            View
                          </button>
                          {inv.status === 'draft' && (
                            <button
                              onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                              style={{ padding: '5px 10px', borderRadius: 6,
                                border: '1px solid #1e6bbd', background: 'white',
                                color: '#1e6bbd', fontSize: 11,
                                cursor: 'pointer', fontWeight: 600 }}>
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', padding: '12px 20px',
                borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 12, color: '#6b7fa3' }}>
                  Showing {((page-1)*LIMIT)+1}–{Math.min(page*LIMIT,total)} of {total}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(0, 7).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ width: 32, height: 32, borderRadius: 6,
                        border: `1px solid ${p===page?'#1e6bbd':'#e2e8f0'}`,
                        background: p===page ? '#1e6bbd' : 'white',
                        color: p===page ? 'white' : '#6b7fa3',
                        fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
