// ============================================================
//  src/pages/public/PublicInvoicePage.js
//  Customer-facing invoice + payment page — reachable at /pay/:token
//  with no login at all. Rendered outside AppLayout/ProtectedRoute.
// ============================================================
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/client';

const fmtCur = (n, cur) => `${cur || 'GHS'} ${new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2 }).format(n || 0)}`;

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const STATUS_LABEL = {
  paid: { text: 'Paid', bg: 'rgba(22,199,154,.12)', color: '#0ea87f' },
  partial: { text: 'Partially Paid', bg: 'rgba(232,160,74,.14)', color: '#c47a1a' },
  void: { text: 'Void', bg: 'rgba(224,92,92,.12)', color: '#c04040' },
  cancelled: { text: 'Cancelled', bg: 'rgba(224,92,92,.12)', color: '#c04040' },
};

export default function PublicInvoicePage() {
  const { token } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/public/invoices/${token}`)
      .then(res => setInvoice(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  const handlePayNow = async () => {
    setPaying(true);
    setError('');
    try {
      const res = await api.post(`/public/invoices/${token}/pay`);
      window.location.href = res.data.paymentUrl;
    } catch (err) {
      setError(err.message || 'Could not start payment — please try again');
      setPaying(false);
    }
  };

  const page = {
    minHeight: '100vh', background: '#f4f6f9', fontFamily: 'sans-serif',
    display: 'flex', justifyContent: 'center', padding: '40px 16px',
  };
  const card = {
    background: 'white', borderRadius: 16, maxWidth: 560, width: '100%',
    boxShadow: '0 4px 24px rgba(13,27,42,.08)', overflow: 'hidden', height: 'fit-content',
  };

  if (loading) return (
    <div style={page}>
      <div style={{ color: '#6b7fa3', marginTop: 100 }}>Loading invoice…</div>
    </div>
  );

  if (notFound) return (
    <div style={page}>
      <div style={{ ...card, padding: 40, textAlign: 'center', marginTop: 60 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
        <h2 style={{ color: '#1a2740', marginBottom: 8 }}>Invoice not found</h2>
        <p style={{ color: '#6b7fa3', fontSize: 13 }}>
          This link may be incorrect or the invoice no longer exists.
        </p>
      </div>
    </div>
  );

  const balance = parseFloat(invoice.balance_due);
  const canPay = balance > 0 && !['void', 'cancelled'].includes(invoice.status);
  const statusInfo = STATUS_LABEL[invoice.status];

  return (
    <div style={page}>
      <div style={card}>
        <div style={{ background: '#0d1b2a', padding: '28px 32px', color: 'white' }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{invoice.org_name}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginTop: 4 }}>
            {[invoice.org_address, invoice.org_phone, invoice.org_email].filter(Boolean).join(' · ')}
          </div>
        </div>

        <div style={{ padding: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1a2740' }}>{invoice.invoice_number}</div>
              <div style={{ fontSize: 12, color: '#6b7fa3', marginTop: 4 }}>
                Issued {fmtDate(invoice.invoice_date)} · Due {fmtDate(invoice.due_date)}
              </div>
            </div>
            {statusInfo && (
              <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: statusInfo.bg, color: statusInfo.color }}>
                {statusInfo.text}
              </span>
            )}
          </div>

          <div style={{ fontSize: 12, color: '#6b7fa3', marginBottom: 4 }}>Billed to</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2740', marginBottom: 24 }}>
            {invoice.customer_name || 'Customer'}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f2f5' }}>
                <th style={{ textAlign: 'left', padding: '6px 0', fontSize: 10, color: '#6b7fa3', textTransform: 'uppercase' }}>Item</th>
                <th style={{ textAlign: 'right', padding: '6px 0', fontSize: 10, color: '#6b7fa3', textTransform: 'uppercase' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '6px 0', fontSize: 10, color: '#6b7fa3', textTransform: 'uppercase' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((l, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f4f6f9' }}>
                  <td style={{ padding: '10px 0', fontSize: 13, color: '#1a2740' }}>{l.description}</td>
                  <td style={{ padding: '10px 0', fontSize: 13, textAlign: 'right', fontFamily: 'monospace' }}>{parseFloat(l.quantity)}</td>
                  <td style={{ padding: '10px 0', fontSize: 13, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                    {fmtCur(l.line_total, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: '#6b7fa3' }}>
              <span>Subtotal</span><span style={{ fontFamily: 'monospace' }}>{fmtCur(invoice.subtotal, invoice.currency)}</span>
            </div>
            {parseFloat(invoice.discount_amount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: '#6b7fa3' }}>
                <span>Discount</span><span style={{ fontFamily: 'monospace' }}>-{fmtCur(invoice.discount_amount, invoice.currency)}</span>
              </div>
            )}
            {parseFloat(invoice.tax_amount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: '#6b7fa3' }}>
                <span>Tax</span><span style={{ fontFamily: 'monospace' }}>{fmtCur(invoice.tax_amount, invoice.currency)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, paddingTop: 8, marginTop: 4, borderTop: '1px solid #e2e8f0', color: '#1a2740' }}>
              <span>Total</span><span style={{ fontFamily: 'monospace' }}>{fmtCur(invoice.total_amount, invoice.currency)}</span>
            </div>
            {parseFloat(invoice.amount_paid) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 6, color: '#16c79a' }}>
                <span>Paid</span><span style={{ fontFamily: 'monospace' }}>{fmtCur(invoice.amount_paid, invoice.currency)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, marginTop: 6, color: balance > 0 ? '#e8a04a' : '#16c79a' }}>
              <span>Balance Due</span><span style={{ fontFamily: 'monospace' }}>{fmtCur(balance, invoice.currency)}</span>
            </div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8,
              padding: '10px 14px', fontSize: 12, color: '#c04040', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {canPay ? (
            <button onClick={handlePayNow} disabled={paying}
              style={{ width: '100%', padding: '14px', border: 'none', borderRadius: 10,
                background: paying ? '#6b7fa3' : '#16c79a', color: 'white',
                fontSize: 15, fontWeight: 800, cursor: paying ? 'not-allowed' : 'pointer' }}>
              {paying ? 'Redirecting…' : `Pay ${fmtCur(balance, invoice.currency)} Now`}
            </button>
          ) : (
            <div style={{ textAlign: 'center', padding: 14, background: 'rgba(22,199,154,.08)',
              borderRadius: 10, color: '#0ea87f', fontWeight: 700, fontSize: 13 }}>
              ✓ This invoice is fully settled
            </div>
          )}

          {invoice.notes && (
            <div style={{ marginTop: 20, fontSize: 12, color: '#6b7fa3' }}>{invoice.notes}</div>
          )}
        </div>
      </div>
    </div>
  );
}
