// ============================================================
//  src/pages/invoices/InvoiceDetailPage.js
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import { invoicesAPI, orgAPI } from '../../api/services';
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

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [org,      setOrg]     = useState(null);
  const [loading,  setLoading] = useState(true);
  const [busy,     setBusy]    = useState(false);
  const [showPay,  setShowPay] = useState(false);
  const [payMethod, setPayMethod] = useState('cash');
  const [showPaystack, setShowPaystack] = useState(false);
  const [paystackAmount, setPaystackAmount] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [paymentLink, setPaymentLink] = useState(null);
  const [showShareLink, setShowShareLink] = useState(false);
  const [shareLink, setShareLink] = useState(null);
  const [generatingShareLink, setGeneratingShareLink] = useState(false);
  const [emailingInvoice, setEmailingInvoice] = useState(false);
  const [payments, setPayments] = useState([]);
  const [verifyingId, setVerifyingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      invoicesAPI.getOne(id),
      orgAPI.get().catch(() => ({ data: null })),
      invoicesAPI.payments(id).catch(() => ({ data: [] })),
    ])
      .then(([invRes, orgRes, payRes]) => {
        setInvoice(invRes.data);
        setOrg(orgRes.data);
        setPayments(payRes.data || []);
      })
      .catch(() => toast.error('Could not load invoice'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handlePost = async () => {
    setBusy(true);
    try {
      await invoicesAPI.post(id);
      toast.success('Invoice posted to General Ledger');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to post invoice');
    } finally { setBusy(false); }
  };

  const handlePay = async () => {
    setBusy(true);
    try {
      await invoicesAPI.pay(id, { paymentMethod: payMethod });
      toast.success('Payment recorded');
      setShowPay(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to record payment');
    } finally { setBusy(false); }
  };

  const handleVoid = async () => {
    if (!window.confirm('Void this invoice? This cannot be undone.')) return;
    setBusy(true);
    try {
      await invoicesAPI.voidInv(id);
      toast.success('Invoice voided');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to void invoice');
    } finally { setBusy(false); }
  };

  const openPaystackModal = () => {
    setPaystackAmount(invoice.balance_due ? parseFloat(invoice.balance_due).toFixed(2) : '');
    setPaymentLink(null);
    setShowPaystack(true);
  };

  const handleGeneratePaymentLink = async () => {
    setGeneratingLink(true);
    try {
      const res = await invoicesAPI.paymentLink(id, { amount: parseFloat(paystackAmount) || undefined });
      setPaymentLink(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to generate payment link');
    } finally { setGeneratingLink(false); }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(paymentLink.paymentUrl);
    toast.success('Payment link copied — paste it into WhatsApp or email');
  };

  // Customer-facing pay page — the customer opens this, reviews the
  // invoice, and only then hits Paystack (via the branded page in
  // PublicInvoicePage.js), rather than sharing a raw checkout URL.
  const openShareLinkModal = async () => {
    setShowShareLink(true);
    setShareLink(null);
    setGeneratingShareLink(true);
    try {
      const res = await invoicesAPI.publicLink(id);
      setShareLink(res.data.publicUrl);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to generate pay link');
    } finally { setGeneratingShareLink(false); }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success('Link copied — paste it into WhatsApp or email');
  };

  const handleEmailInvoice = async () => {
    setEmailingInvoice(true);
    try {
      const res = await invoicesAPI.sendEmail(id);
      toast.success(res.message || 'Invoice emailed');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to send email');
    } finally { setEmailingInvoice(false); }
  };

  // A pending payment sits waiting on Paystack's webhook to confirm
  // it — but if that webhook never reaches this server (unreachable
  // callback URL, or just a missed delivery), it can stay "pending"
  // forever even though the customer's charge genuinely went through
  // on Paystack's side. This checks with Paystack directly instead.
  const handleVerifyPayment = async (paymentId) => {
    setVerifyingId(paymentId);
    try {
      const res = await invoicesAPI.verifyPayment(id, paymentId);
      toast.success(res.message || 'Checked');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not check payment status');
    } finally { setVerifyingId(null); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this draft invoice? This cannot be undone.')) return;
    setBusy(true);
    try {
      await invoicesAPI.remove(id);
      toast.success('Invoice deleted');
      navigate('/invoices');
    } catch (err) {
      toast.error(err.message || 'Failed to delete invoice');
      setBusy(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!invoice) return;
    const cur = invoice.currency || 'GHS';
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const left = 40;
    let y = 50;

    doc.setFontSize(18).setFont(undefined, 'bold');
    doc.text(org?.name || 'FinSuite Pro', left, y);
    doc.setFontSize(10).setFont(undefined, 'normal');
    y += 18;
    if (org?.address) { doc.text(org.address, left, y); y += 14; }
    if (org?.phone || org?.email) { doc.text([org.phone, org.email].filter(Boolean).join('  ·  '), left, y); y += 14; }

    doc.setFontSize(22).setFont(undefined, 'bold');
    doc.text('INVOICE', 400, 50);
    doc.setFontSize(10).setFont(undefined, 'normal');
    doc.text(invoice.invoice_number, 400, 68);
    doc.text(`Date: ${fmtDate(invoice.invoice_date)}`, 400, 84);
    doc.text(`Due: ${fmtDate(invoice.due_date)}`, 400, 98);

    y += 20;
    doc.setFont(undefined, 'bold').text('Bill To', left, y);
    doc.setFont(undefined, 'normal');
    y += 14;
    doc.text(invoice.customer_name || 'Walk-in Customer', left, y); y += 14;
    if (invoice.customer_address) { doc.text(invoice.customer_address, left, y); y += 14; }
    if (invoice.customer_email)   { doc.text(invoice.customer_email, left, y);   y += 14; }

    y += 20;
    const colX = { desc: left, qty: 330, price: 390, total: 470 };
    doc.setFont(undefined, 'bold');
    doc.text('Description', colX.desc, y);
    doc.text('Qty', colX.qty, y);
    doc.text('Unit Price', colX.price, y);
    doc.text('Total', colX.total, y);
    doc.setLineWidth(0.5).line(left, y + 4, 555, y + 4);
    doc.setFont(undefined, 'normal');
    y += 20;

    (invoice.lines || []).forEach(line => {
      doc.text(line.description || line.product_name || '', colX.desc, y, { maxWidth: 270 });
      doc.text(String(parseFloat(line.quantity)), colX.qty, y);
      doc.text(fmtCur(line.unit_price, cur), colX.price, y);
      doc.text(fmtCur(line.line_total, cur), colX.total, y);
      y += 18;
    });

    y += 10;
    doc.line(350, y, 555, y);
    y += 16;
    const totalsRow = (label, value, bold) => {
      doc.setFont(undefined, bold ? 'bold' : 'normal');
      doc.text(label, 400, y);
      doc.text(value, 470, y);
      y += 16;
    };
    totalsRow('Subtotal', fmtCur(invoice.subtotal, cur));
    if (parseFloat(invoice.discount_amount) > 0) totalsRow('Discount', `-${fmtCur(invoice.discount_amount, cur)}`);
    if (parseFloat(invoice.tax_amount) > 0) totalsRow('Tax', fmtCur(invoice.tax_amount, cur));
    totalsRow('Total', fmtCur(invoice.total_amount, cur), true);
    totalsRow('Paid', fmtCur(invoice.amount_paid, cur));
    totalsRow('Balance Due', fmtCur(invoice.balance_due, cur), true);

    if (invoice.notes) {
      y += 20;
      doc.setFont(undefined, 'bold').text('Notes', left, y);
      doc.setFont(undefined, 'normal');
      y += 14;
      doc.text(invoice.notes, left, y, { maxWidth: 500 });
    }
    if (invoice.terms) {
      y += 30;
      doc.setFont(undefined, 'bold').text('Terms', left, y);
      doc.setFont(undefined, 'normal');
      y += 14;
      doc.text(invoice.terms, left, y, { maxWidth: 500 });
    }

    doc.save(`${invoice.invoice_number}.pdf`);
  };

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: '#6b7fa3' }}>Loading invoice…</div>
  );
  if (!invoice) return (
    <div style={{ padding: 60, textAlign: 'center', color: '#6b7fa3' }}>Invoice not found</div>
  );

  const statusStyle = STATUS_STYLE[invoice.status] || STATUS_STYLE.draft;
  const cur = invoice.currency || 'GHS';

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <button onClick={() => navigate('/invoices')}
            style={{ background: 'none', border: 'none', color: '#6b7fa3',
              fontSize: 12, cursor: 'pointer', marginBottom: 8, padding: 0 }}>
            ← Back to Invoices
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a2740' }}>
              {invoice.invoice_number}
            </h1>
            <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12,
              fontWeight: 600, background: statusStyle.bg, color: statusStyle.color,
              textTransform: 'capitalize' }}>
              {invoice.status}
            </span>
            {invoice.source && (
              <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11,
                fontWeight: 600, background: '#f4f6f9', color: '#6b7fa3' }}>
                {invoice.source === 'pos' ? '🛒 POS' : '📄 Wholesale'}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button onClick={handleDownloadPdf}
            style={{ padding: '9px 16px', border: '1px solid #e2e8f0', background: 'white',
              color: '#1a2740', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ⬇ Download PDF
          </button>

          {invoice.status === 'draft' && (
            <>
              <button onClick={() => navigate(`/invoices/${id}/edit`)}
                style={{ padding: '9px 16px', border: '1px solid #1e6bbd', background: 'white',
                  color: '#1e6bbd', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Edit
              </button>
              <button onClick={handlePost} disabled={busy}
                style={{ padding: '9px 16px', border: 'none', background: '#1e6bbd',
                  color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: busy ? 'not-allowed' : 'pointer' }}>
                Post to GL
              </button>
              <button onClick={handleDelete} disabled={busy}
                style={{ padding: '9px 16px', border: '1px solid #e05c5c', background: 'white',
                  color: '#e05c5c', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  cursor: busy ? 'not-allowed' : 'pointer' }}>
                Delete
              </button>
            </>
          )}

          {['sent', 'partial', 'overdue'].includes(invoice.status) && parseFloat(invoice.balance_due) > 0 && (
            <>
              <button onClick={openPaystackModal} disabled={busy}
                style={{ padding: '9px 16px', border: 'none', background: '#0ea87f',
                  color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: busy ? 'not-allowed' : 'pointer' }}>
                Pay Now
              </button>
              <button onClick={() => setShowPay(true)} disabled={busy}
                style={{ padding: '9px 16px', border: '1px solid #16c79a', background: 'white',
                  color: '#0ea87f', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: busy ? 'not-allowed' : 'pointer' }}>
                Record Manual Payment
              </button>
              <button onClick={openShareLinkModal} disabled={busy}
                style={{ padding: '9px 16px', border: '1px solid #1e6bbd', background: 'white',
                  color: '#1e6bbd', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: busy ? 'not-allowed' : 'pointer' }}>
                Share Pay Link
              </button>
              {invoice.customer_email && (
                <button onClick={handleEmailInvoice} disabled={busy || emailingInvoice}
                  style={{ padding: '9px 16px', border: '1px solid #e2e8f0', background: 'white',
                    color: '#1a2740', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    cursor: (busy || emailingInvoice) ? 'not-allowed' : 'pointer' }}>
                  {emailingInvoice ? 'Sending…' : 'Email to Customer'}
                </button>
              )}
            </>
          )}

          {['draft', 'sent'].includes(invoice.status) && (
            <button onClick={handleVoid} disabled={busy}
              style={{ padding: '9px 16px', border: '1px solid #e05c5c', background: 'white',
                color: '#e05c5c', borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: busy ? 'not-allowed' : 'pointer' }}>
              Void
            </button>
          )}
        </div>
      </div>

      {/* Draft warning — a draft invoice hasn't touched stock, the GL,
          or the customer's balance yet; only "Post to GL" below does that. */}
      {invoice.status === 'draft' && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '14px 18px', marginBottom: 20, borderRadius: 10,
          background: '#fff8e6', border: '1px solid #f0d896' }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#8a6d1a', marginBottom: 3 }}>
              This invoice is still a draft
            </div>
            <div style={{ fontSize: 12.5, color: '#8a6d1a', lineHeight: 1.5 }}>
              It hasn't affected inventory stock, the General Ledger, or the customer's
              balance yet. Click <strong>Post to GL</strong> below to deduct stock and record
              the accounting entries — until then, this invoice has no financial effect.
            </div>
          </div>
        </div>
      )}

      {/* Customer + dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7fa3',
            textTransform: 'uppercase', marginBottom: 10 }}>Bill To</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            {invoice.customer_name || 'Walk-in Customer'}
          </div>
          {invoice.customer_email && (
            <div style={{ fontSize: 12, color: '#6b7fa3' }}>{invoice.customer_email}</div>
          )}
          {invoice.customer_address && (
            <div style={{ fontSize: 12, color: '#6b7fa3', marginTop: 2 }}>{invoice.customer_address}</div>
          )}
        </div>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7fa3',
            textTransform: 'uppercase', marginBottom: 10 }}>Details</div>
          {[
            ['Invoice Date', fmtDate(invoice.invoice_date)],
            ['Due Date', fmtDate(invoice.due_date)],
            ['Currency', invoice.currency],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
              fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: '#6b7fa3' }}>{label}</span>
              <span style={{ fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Line items */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0',
        borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Description', 'Qty', 'Unit Price', 'Discount %', 'Tax', 'Line Total'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10,
                  fontWeight: 600, color: '#6b7fa3', textTransform: 'uppercase',
                  background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(invoice.lines || []).map(line => (
              <tr key={line.id} style={{ borderBottom: '1px solid #f4f6f9' }}>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>
                  {line.description}
                  {line.product_sku && (
                    <span style={{ color: '#6b7fa3', fontSize: 11 }}> ({line.product_sku})</span>
                  )}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>{parseFloat(line.quantity)}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'monospace' }}>
                  {fmtCur(line.unit_price, cur)}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>{parseFloat(line.discount_pct || 0)}%</td>
                <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'monospace' }}
                  title={line.tax_breakdown
                    ? JSON.parse(line.tax_breakdown).map(c => `${c.name}: ${fmtCur(c.amount, cur)}`).join('\n')
                    : undefined}
                >
                  {fmtCur(line.tax_amount, cur)}
                  {line.tax_breakdown && <span style={{ color: '#6b7fa3', fontSize: 10 }}> (compound)</span>}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>
                  {fmtCur(line.line_total, cur)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div style={{ background: '#f4f6f9', borderRadius: 10, padding: '16px 20px', minWidth: 280 }}>
          {[
            ['Subtotal', invoice.subtotal],
            ...(parseFloat(invoice.discount_amount) > 0 ? [['Discount', -invoice.discount_amount]] : []),
            ['Tax', invoice.tax_amount],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
              fontSize: 13, padding: '4px 0' }}>
              <span style={{ color: '#6b7fa3' }}>{label}</span>
              <span style={{ fontFamily: 'monospace' }}>{fmtCur(value, cur)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0',
            borderTop: '2px solid #1e6bbd', marginTop: 6, fontSize: 16, fontWeight: 800 }}>
            <span>Total</span>
            <span style={{ color: '#1e6bbd' }}>{fmtCur(invoice.total_amount, cur)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            fontSize: 13, padding: '8px 0 0', color: '#16c79a' }}>
            <span>Paid</span>
            <span style={{ fontFamily: 'monospace' }}>{fmtCur(invoice.amount_paid, cur)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            fontSize: 13, fontWeight: 700, color: parseFloat(invoice.balance_due) > 0 ? '#e8a04a' : '#16c79a' }}>
            <span>Balance Due</span>
            <span style={{ fontFamily: 'monospace' }}>{fmtCur(invoice.balance_due, cur)}</span>
          </div>
        </div>
      </div>

      {payments.length > 0 && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12,
          padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2740', marginBottom: 14 }}>
            Payment History
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Date', 'Method', 'Amount', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '8px 10px',
                    textAlign: h === 'Method' || h === 'Date' ? 'left' : 'right',
                    fontSize: 10, fontWeight: 600, color: '#6b7fa3',
                    textTransform: 'uppercase', letterSpacing: .5,
                    borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f4f6f9' }}>
                  <td style={{ padding: '8px 10px', fontSize: 12, color: '#6b7fa3' }}>
                    {fmtDate(p.paid_at || p.created_at)}
                  </td>
                  <td style={{ padding: '8px 10px', fontSize: 12, color: '#1a2740', textTransform: 'capitalize' }}>
                    {(p.payment_method || '').replace('_', ' ')}
                  </td>
                  <td style={{ padding: '8px 10px', fontSize: 12, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                    {fmtCur(p.amount, cur)}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                    <span title={p.status === 'overpaid' ? "Paystack confirmed this charge, but the invoice already had no balance left — needs a manual refund to the customer" : undefined}
                      style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      textTransform: 'capitalize',
                      background: p.status === 'success' ? 'rgba(22,199,154,.12)'
                        : p.status === 'failed' ? 'rgba(224,92,92,.12)'
                        : p.status === 'overpaid' ? 'rgba(232,160,74,.14)' : 'rgba(107,127,163,.12)',
                      color: p.status === 'success' ? '#0ea87f'
                        : p.status === 'failed' ? '#c04040'
                        : p.status === 'overpaid' ? '#c47a1a' : '#6b7fa3' }}>
                      {p.status === 'overpaid' ? '⚠ Needs Refund' : p.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                    {p.status === 'pending' && (
                      <button onClick={() => handleVerifyPayment(p.id)} disabled={verifyingId === p.id}
                        style={{ padding: '5px 10px', border: '1px solid #1e6bbd', background: 'white',
                          color: '#1e6bbd', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          cursor: verifyingId === p.id ? 'not-allowed' : 'pointer' }}>
                        {verifyingId === p.id ? 'Checking…' : 'Check Status'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(invoice.notes || invoice.terms) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 40 }}>
          {invoice.notes && (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7fa3',
                textTransform: 'uppercase', marginBottom: 6 }}>Notes</div>
              <div style={{ fontSize: 13, color: '#1a2740' }}>{invoice.notes}</div>
            </div>
          )}
          {invoice.terms && (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7fa3',
                textTransform: 'uppercase', marginBottom: 6 }}>Terms</div>
              <div style={{ fontSize: 13, color: '#1a2740' }}>{invoice.terms}</div>
            </div>
          )}
        </div>
      )}

      {/* Paystack payment link modal */}
      {showPaystack && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,42,.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={e => e.target === e.currentTarget && setShowPaystack(false)}>
          <div style={{ background: 'white', borderRadius: 14, width: 380, padding: 24,
            boxShadow: '0 20px 60px rgba(13,27,42,.3)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Get Payment Link</div>
            <div style={{ fontSize: 13, color: '#6b7fa3', marginBottom: 16 }}>
              Balance due: <b>{fmtCur(invoice.balance_due, cur)}</b>
            </div>

            {!paymentLink ? (
              <>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600,
                  color: '#1a2740', marginBottom: 6 }}>Amount (leave as-is for full balance)</label>
                <input type="number" min="0.01" step="0.01" value={paystackAmount}
                  onChange={e => setPaystackAmount(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0',
                    borderRadius: 8, fontSize: 14, fontFamily: 'monospace', marginBottom: 20,
                    boxSizing: 'border-box' }}/>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowPaystack(false)}
                    style={{ flex: 1, padding: 11, border: '1px solid #e2e8f0', background: 'white',
                      borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={handleGeneratePaymentLink} disabled={generatingLink}
                    style={{ flex: 2, padding: 11, border: 'none',
                      background: generatingLink ? '#6b7fa3' : '#0ea87f', color: 'white',
                      borderRadius: 8, fontSize: 13, fontWeight: 700,
                      cursor: generatingLink ? 'not-allowed' : 'pointer' }}>
                    {generatingLink ? 'Generating…' : 'Generate Link'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ background: '#f0fdf9', border: '1px solid #16c79a', borderRadius: 8,
                  padding: '12px 14px', marginBottom: 16, fontSize: 12, color: '#0ea87f',
                  wordBreak: 'break-all' }}>
                  {paymentLink.paymentUrl}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={handleCopyLink}
                    style={{ flex: 1, padding: 11, border: '1px solid #0ea87f', background: 'white',
                      color: '#0ea87f', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Copy Link
                  </button>
                  <a href={paymentLink.paymentUrl} target="_blank" rel="noreferrer"
                    style={{ flex: 1, padding: 11, border: 'none', background: '#0ea87f', color: 'white',
                      borderRadius: 8, fontSize: 13, fontWeight: 700, textAlign: 'center',
                      textDecoration: 'none', cursor: 'pointer' }}>
                    Open Checkout
                  </a>
                </div>
                <button onClick={() => setShowPaystack(false)}
                  style={{ width: '100%', marginTop: 10, padding: 9, border: '1px solid #e2e8f0',
                    background: 'white', borderRadius: 8, fontSize: 12, color: '#6b7fa3', cursor: 'pointer' }}>
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Share pay-link modal — the branded customer-facing invoice
          page (PublicInvoicePage.js), not a raw Paystack checkout URL.
          The customer reviews the invoice there and only reaches
          Paystack once they click Pay Now themselves. */}
      {showShareLink && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,42,.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={e => e.target === e.currentTarget && setShowShareLink(false)}>
          <div style={{ background: 'white', borderRadius: 14, width: 380, padding: 24,
            boxShadow: '0 20px 60px rgba(13,27,42,.3)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Share Pay Link</div>
            <div style={{ fontSize: 13, color: '#6b7fa3', marginBottom: 16 }}>
              A page the customer can open to view this invoice and pay by MoMo, card, or bank transfer.
            </div>

            {generatingShareLink ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#6b7fa3', fontSize: 13 }}>Generating…</div>
            ) : shareLink && (
              <>
                <div style={{ background: '#f0f7ff', border: '1px solid #1e6bbd', borderRadius: 8,
                  padding: '12px 14px', marginBottom: 16, fontSize: 12, color: '#1e6bbd',
                  wordBreak: 'break-all' }}>
                  {shareLink}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={handleCopyShareLink}
                    style={{ flex: 1, padding: 11, border: '1px solid #1e6bbd', background: 'white',
                      color: '#1e6bbd', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Copy Link
                  </button>
                  <a href={shareLink} target="_blank" rel="noreferrer"
                    style={{ flex: 1, padding: 11, border: 'none', background: '#1e6bbd', color: 'white',
                      borderRadius: 8, fontSize: 13, fontWeight: 700, textAlign: 'center',
                      textDecoration: 'none', cursor: 'pointer' }}>
                    Preview
                  </a>
                </div>
                <button onClick={() => setShowShareLink(false)}
                  style={{ width: '100%', marginTop: 10, padding: 9, border: '1px solid #e2e8f0',
                    background: 'white', borderRadius: 8, fontSize: 12, color: '#6b7fa3', cursor: 'pointer' }}>
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Record Payment modal */}
      {showPay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,42,.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={e => e.target === e.currentTarget && setShowPay(false)}>
          <div style={{ background: 'white', borderRadius: 14, width: 360, padding: 24,
            boxShadow: '0 20px 60px rgba(13,27,42,.3)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Record Payment</div>
            <div style={{ fontSize: 13, color: '#6b7fa3', marginBottom: 16 }}>
              Balance due: <b>{fmtCur(invoice.balance_due, cur)}</b>
            </div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600,
              color: '#1a2740', marginBottom: 6 }}>Payment Method</label>
            <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0',
                borderRadius: 8, fontSize: 13, marginBottom: 20, boxSizing: 'border-box' }}>
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="card">Card</option>
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowPay(false)}
                style={{ flex: 1, padding: 11, border: '1px solid #e2e8f0', background: 'white',
                  borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handlePay} disabled={busy}
                style={{ flex: 2, padding: 11, border: 'none',
                  background: busy ? '#6b7fa3' : '#16c79a', color: 'white',
                  borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: busy ? 'not-allowed' : 'pointer' }}>
                {busy ? 'Recording…' : `Confirm ${fmtCur(invoice.balance_due, cur)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
