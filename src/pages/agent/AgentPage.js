// ============================================================
//  src/pages/agent/AgentPage.js
//  Agentic AI — fixed workflows (work without an LLM key) plus
//  the human-in-the-loop approval queue for financial actions.
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { agentAPI, payrollAPI } from '../../api/services';
import toast from 'react-hot-toast';

const fmtDate = (d) => d ? new Date(d).toLocaleString('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) : '—';

const TABS = [
  { id: 'workflows', label: 'Workflows' },
  { id: 'queue',     label: 'Approval Queue' },
  { id: 'chat',      label: 'Chat' },
];

const card = {
  background: 'white', borderRadius: 12, border: '1px solid #e2e8f0',
  boxShadow: '0 2px 8px rgba(13,27,42,.04)', marginBottom: 16, padding: 20,
};
const btn = {
  padding: '9px 18px', borderRadius: 8, border: 'none', background: '#1e6bbd',
  color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer',
};
const resultBox = {
  marginTop: 14, padding: 14, background: '#f8fafc', borderRadius: 8,
  fontSize: 11, fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 300, overflowY: 'auto',
};

export default function AgentPage() {
  const [tab, setTab] = useState('workflows');
  const [actions, setActions] = useState([]);
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});
  const [disputeRef, setDisputeRef] = useState('');
  const [disputeInvoiceId, setDisputeInvoiceId] = useState('');
  const [anomalyRunId, setAnomalyRunId] = useState('');

  const loadQueue = useCallback(() => {
    agentAPI.actions().then(res => setActions(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    loadQueue();
    payrollAPI.runs.list().then(res => setPayrollRuns(res.data || [])).catch(() => {});
  }, [loadQueue]);

  const runWorkflow = async (key, fn) => {
    setLoading(true);
    try {
      const res = await fn();
      setResults(r => ({ ...r, [key]: res.data }));
      toast.success(res.message || 'Workflow completed');
      loadQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Workflow failed');
    } finally { setLoading(false); }
  };

  const handleDecide = async (id, approve) => {
    try {
      await (approve ? agentAPI.approve(id) : agentAPI.reject(id));
      toast.success(approve ? 'Action approved' : 'Action rejected');
      loadQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decide');
    }
  };

  const pending = actions.filter(a => a.status === 'pending_approval');

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a2740', marginBottom: 4 }}>Agent</h1>
        <p style={{ fontSize: 13, color: '#6b7fa3' }}>
          Deterministic workflows that investigate, draft and flag — financial changes wait for your approval.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: tab === t.id ? '#1e6bbd' : 'white', color: tab === t.id ? 'white' : '#6b7fa3',
              boxShadow: tab === t.id ? '0 4px 12px rgba(30,107,189,.3)' : '0 1px 4px rgba(0,0,0,.06)' }}>
            {t.label}{t.id === 'queue' && pending.length > 0 ? ` (${pending.length})` : ''}
          </button>
        ))}
      </div>

      {tab === 'workflows' && (
        <>
          <div style={card}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Overdue Invoice Sweep</div>
            <div style={{ fontSize: 12, color: '#6b7fa3', marginBottom: 12 }}>
              Detects overdue invoices → checks customer history → drafts &amp; logs a reminder → escalates to a support ticket past 30 days.
            </div>
            <button style={btn} disabled={loading}
              onClick={() => runWorkflow('overdue', agentAPI.overdueInvoices)}>
              Run Sweep
            </button>
            {results.overdue && <div style={resultBox}>{JSON.stringify(results.overdue, null, 1)}</div>}
          </div>

          <div style={card}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Payment Dispute Investigation</div>
            <div style={{ fontSize: 12, color: '#6b7fa3', marginBottom: 12 }}>
              Checks the real Paystack transaction status → classifies it → queues an invoice fix for approval if paid, or opens a ticket if not.
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input placeholder="Paystack reference" value={disputeRef} onChange={e => setDisputeRef(e.target.value)}
                style={{ flex: 2, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}/>
              <input placeholder="Invoice ID (optional)" type="number" value={disputeInvoiceId} onChange={e => setDisputeInvoiceId(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}/>
            </div>
            <button style={btn} disabled={loading || !disputeRef}
              onClick={() => runWorkflow('dispute', () => agentAPI.paymentDispute({ reference: disputeRef, invoiceId: disputeInvoiceId ? parseInt(disputeInvoiceId) : undefined }))}>
              Investigate
            </button>
            {results.dispute && <div style={resultBox}>{JSON.stringify(results.dispute, null, 1)}</div>}
          </div>

          <div style={card}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Payroll Anomaly Check</div>
            <div style={{ fontSize: 12, color: '#6b7fa3', marginBottom: 12 }}>
              Compares a payroll run's gross pay per employee against the previous run — flags anything more than 20% different before you post it.
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <select value={anomalyRunId} onChange={e => setAnomalyRunId(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}>
                <option value="">Select a payroll run…</option>
                {payrollRuns.map(r => (
                  <option key={r.id} value={r.id}>{r.month}/{r.year} — {r.status}</option>
                ))}
              </select>
            </div>
            <button style={btn} disabled={loading || !anomalyRunId}
              onClick={() => runWorkflow('anomaly', () => agentAPI.payrollAnomalyCheck({ payrollRunId: parseInt(anomalyRunId) }))}>
              Check for Anomalies
            </button>
            {results.anomaly && <div style={resultBox}>{JSON.stringify(results.anomaly, null, 1)}</div>}
          </div>

          <div style={card}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>SDG Report Draft</div>
            <div style={{ fontSize: 12, color: '#6b7fa3', marginBottom: 12 }}>
              Pulls recorded ESG metrics → identifies pillar gaps → suggests SDG tags for uncovered categories → drafts a narrative.
            </div>
            <button style={btn} disabled={loading}
              onClick={() => runWorkflow('sdg', agentAPI.sdgReportDraft)}>
              Draft Report
            </button>
            {results.sdg && <div style={resultBox}>{JSON.stringify(results.sdg, null, 1)}</div>}
          </div>
        </>
      )}

      {tab === 'queue' && (
        <div style={card}>
          {actions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7fa3', fontSize: 13 }}>
              No agent activity yet — run a workflow to populate this log.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['When', 'Workflow', 'Tool', 'Risk', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700,
                      color: '#6b7fa3', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {actions.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f0f2f5' }}>
                    <td style={{ padding: '8px 10px', fontSize: 11, color: '#6b7fa3' }}>{fmtDate(a.created_at)}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12 }}>{a.workflow}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12, fontFamily: 'monospace' }}>{a.tool_name}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                        background: a.risk_level === 'financial' ? 'rgba(224,92,92,.1)' : 'rgba(107,127,163,.1)',
                        color: a.risk_level === 'financial' ? '#e05c5c' : '#6b7fa3' }}>{a.risk_level}</span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                        background: a.status === 'pending_approval' ? 'rgba(232,160,74,.14)'
                          : a.status === 'failed' ? 'rgba(224,92,92,.1)' : 'rgba(22,199,154,.1)',
                        color: a.status === 'pending_approval' ? '#c47a1a'
                          : a.status === 'failed' ? '#e05c5c' : '#0ea87f' }}>{a.status}</span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      {a.status === 'pending_approval' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => handleDecide(a.id, true)} style={{ padding: '4px 10px', borderRadius: 6,
                            border: '1px solid #16c79a', background: 'white', color: '#0ea87f', fontSize: 11, cursor: 'pointer' }}>Approve</button>
                          <button onClick={() => handleDecide(a.id, false)} style={{ padding: '4px 10px', borderRadius: 6,
                            border: '1px solid #e05c5c', background: 'white', color: '#e05c5c', fontSize: 11, cursor: 'pointer' }}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'chat' && (
        <div style={card}>
          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8,
            padding: 14, fontSize: 13, color: '#92400e' }}>
            Freeform chat requires an <code>ANTHROPIC_API_KEY</code> to be configured on the server —
            it isn't yet, so the agent can't reason about open-ended questions here. The four workflows
            above use the exact same tools and work today without one, since their tool sequence is fixed
            rather than decided live by a model.
          </div>
        </div>
      )}
    </div>
  );
}
