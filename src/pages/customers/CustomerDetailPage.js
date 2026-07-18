// ============================================================
//  src/pages/customers/CustomerDetailPage.js
//  Customer profile with unified transaction history —
//  wholesale invoices and POS retail sales combined, since a
//  POS sale always mirrors into an invoices row (source='pos').
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customersAPI } from '../../api/services';
import { fmtCur, fmtDate } from '../../hooks/useApi';
import toast from 'react-hot-toast';

const STATUS_STYLE = {
  draft:     { bg: 'rgba(107,127,163,.12)', color: '#6b7fa3' },
  sent:      { bg: 'rgba(30,107,189,.12)',  color: '#1e6bbd' },
  paid:      { bg: 'rgba(22,199,154,.12)',  color: '#0ea87f' },
  partial:   { bg: 'rgba(232,160,74,.14)',  color: '#c47a1a' },
  overdue:   { bg: 'rgba(224,92,92,.12)',   color: '#c04040' },
  cancelled: { bg: 'rgba(107,127,163,.12)', color: '#6b7fa3' },
  void:      { bg: 'rgba(224,92,92,.10)',   color: '#c04040' },
};

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all'); // all | pos | wholesale

  const load = useCallback(() => {
    setLoading(true);
    customersAPI.getOne(id)
      .then(res => setCustomer(res.data))
      .catch(() => toast.error('Could not load customer'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: '#6b7fa3' }}>Loading customer…</div>
  );
  if (!customer) return (
    <div style={{ padding: 60, textAlign: 'center', color: '#6b7fa3' }}>Customer not found</div>
  );

  const transactions = (customer.invoices || [])
    .filter(t => filter === 'all' || t.source === filter);

  // Financial totals come from the backend's own unlimited, status-
  // filtered aggregate (customer.totals) — NOT a reduce() over the
  // 50-row browsing list above, which would silently under-report
  // for any customer with more invoices than that, or over-report by
  // including draft/cancelled/void ones. Channel counts have no such
  // backend aggregate and aren't a financial figure, so they still
  // come from the local list.
  const channelCounts = (customer.invoices || []).reduce((acc, t) => {
    if (t.source === 'pos') acc.posCount++; else acc.wholesaleCount++;
    return acc;
  }, { posCount: 0, wholesaleCount: 0 });

  const totals = {
    billed:  parseFloat(customer.totals?.total_billed      || 0),
    paid:    parseFloat(customer.totals?.total_paid        || 0),
    balance: parseFloat(customer.totals?.total_outstanding || 0),
    ...channelCounts,
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>

      <button onClick={() => navigate('/customers')}
        style={{ background: 'none', border: 'none', color: '#6b7fa3',
          fontSize: 12, cursor: 'pointer', marginBottom: 8, padding: 0 }}>
        ← Back to Customers
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a2740', marginBottom: 4 }}>
            {customer.name}
          </h1>
          <div style={{ fontSize: 12, color: '#6b7fa3' }}>
            {customer.customer_code}
            {customer.phone && ` · ${customer.phone}`}
            {customer.email && ` · ${customer.email}`}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Billed', value: fmtCur(totals.billed, 'GHS'), color: '#C8102E' },
          { label: 'Total Paid', value: fmtCur(totals.paid, 'GHS'), color: '#D9A521' },
          { label: 'Outstanding', value: fmtCur(totals.balance, 'GHS'), color: '#046A38' },
          { label: 'Transactions', value: `${totals.posCount + totals.wholesaleCount} (${totals.posCount} POS · ${totals.wholesaleCount} wholesale)`, color: '#1A1A2E', small: true },
        ].map((s, i) => (
          <div key={i} style={{ background: s.color, borderRadius: 12, padding: 16,
            boxShadow: '0 2px 8px rgba(13,27,42,.1)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: s.small ? 12 : 18, fontWeight: 700, color: 'white' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Customer info */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12,
        padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7fa3',
          textTransform: 'uppercase', marginBottom: 10 }}>Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 13 }}>
          <div><span style={{ color: '#6b7fa3' }}>Address: </span>{customer.address || '—'}</div>
          <div><span style={{ color: '#6b7fa3' }}>Payment Terms: </span>{customer.payment_terms} days</div>
          <div><span style={{ color: '#6b7fa3' }}>Currency: </span>{customer.currency}</div>
        </div>
      </div>

      {/* Unified transaction history */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Transaction History</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              ['all', 'All'],
              ['pos', '🛒 POS'],
              ['wholesale', '📄 Wholesale'],
            ].map(([key, label]) => (
              <button key={key} onClick={() => setFilter(key)}
                style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: filter === key ? '#1e6bbd' : '#f4f6f9',
                  color: filter === key ? 'white' : '#6b7fa3' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {transactions.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7fa3', fontSize: 13 }}>
            No transactions yet
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Invoice #', 'Channel', 'Date', 'Total', 'Paid', 'Balance', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10,
                    fontWeight: 600, color: '#6b7fa3', textTransform: 'uppercase',
                    background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => {
                const s = STATUS_STYLE[t.status] || STATUS_STYLE.draft;
                return (
                  <tr key={t.id} onClick={() => navigate(`/invoices/${t.id}`)}
                    style={{ borderBottom: '1px solid #f4f6f9', cursor: 'pointer' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12,
                      color: '#1e6bbd', fontWeight: 600 }}>
                      {t.invoice_number}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12 }}>
                      {t.source === 'pos' ? '🛒 POS' : '📄 Wholesale'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7fa3' }}>
                      {fmtDate(t.invoice_date)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, fontFamily: 'monospace' }}>
                      {fmtCur(t.total_amount, 'GHS')}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, fontFamily: 'monospace', color: '#16c79a' }}>
                      {fmtCur(t.amount_paid, 'GHS')}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, fontFamily: 'monospace', fontWeight: 700,
                      color: parseFloat(t.balance_due) > 0 ? '#e8a04a' : '#16c79a' }}>
                      {fmtCur(t.balance_due, 'GHS')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11,
                        fontWeight: 600, background: s.bg, color: s.color, textTransform: 'capitalize' }}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
