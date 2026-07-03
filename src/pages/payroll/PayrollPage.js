// ============================================================
//  src/pages/payroll/PayrollPage.js
//  Ghana-compliant payroll: employees, payroll runs, leave.
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import { payrollAPI, orgAPI } from '../../api/services';
import toast from 'react-hot-toast';

const fmtCur = (n) => `GHS ${Number(n || 0).toLocaleString('en-GH', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric',
}) : '—';
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const TABS = [
  { id: 'employees', label: 'Employees' },
  { id: 'runs',      label: 'Payroll Runs' },
  { id: 'leave',     label: 'Leave' },
];

const inp = {
  width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0',
  borderRadius: 8, fontSize: 13, fontFamily: 'sans-serif',
  background: '#f9fafb', outline: 'none', boxSizing: 'border-box',
};
const lbl = { display: 'block', fontSize: 11, fontWeight: 600, color: '#1a2740', marginBottom: 6 };
const card = {
  background: 'white', borderRadius: 12, border: '1px solid #e2e8f0',
  boxShadow: '0 2px 8px rgba(13,27,42,.04)', marginBottom: 16, overflow: 'hidden',
};

function Modal({ open, onClose, title, children, width = 520 }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,42,.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'white', borderRadius: 14, width: '100%', maxWidth: width,
        maxHeight: '92vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(13,27,42,.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none',
            fontSize: 22, color: '#6b7fa3', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

export default function PayrollPage() {
  const [tab, setTab] = useState('employees');
  const [org, setOrg] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [runs, setRuns] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showEmpModal, setShowEmpModal] = useState(false);
  const [empForm, setEmpForm] = useState({});
  const [savingEmp, setSavingEmp] = useState(false);

  const [showEmpDetail, setShowEmpDetail] = useState(null); // employee id
  const [empDetail, setEmpDetail] = useState(null);
  const [allowForm, setAllowForm] = useState({ allowanceType: 'transport', amount: '', startDate: new Date().toISOString().slice(0,10) });
  const [deductForm, setDeductForm] = useState({ deductionType: 'loan', totalAmount: '', monthlyDeduction: '', startDate: new Date().toISOString().slice(0,10) });

  const [showRunModal, setShowRunModal] = useState(false);
  const [runMonth, setRunMonth] = useState(new Date().getMonth() + 1);
  const [runYear, setRunYear] = useState(new Date().getFullYear());
  const [runningPayroll, setRunningPayroll] = useState(false);

  const [showRunDetail, setShowRunDetail] = useState(null);
  const [runDetail, setRunDetail] = useState(null);
  const [posting, setPosting] = useState(false);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ employeeId: '', leaveType: 'annual', startDate: '', endDate: '', days: '', reason: '' });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      payrollAPI.employees.list({ limit: 200 }),
      payrollAPI.runs.list(),
      payrollAPI.leave.list(),
      orgAPI.get().catch(() => ({ data: null })),
    ]).then(([e, r, l, o]) => {
      setEmployees(e.data || []);
      setRuns(r.data || []);
      setLeaveRequests(l.data || []);
      setOrg(o.data);
    }).catch(() => toast.error('Could not load payroll data'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Employees ──────────────────────────────────────────────
  const openEmpModal = () => {
    setEmpForm({ employmentType: 'full_time', startDate: new Date().toISOString().slice(0,10) });
    setShowEmpModal(true);
  };

  const handleSaveEmp = async () => {
    if (!empForm.firstName || !empForm.lastName) return toast.error('First and last name are required');
    if (!empForm.startDate) return toast.error('Start date is required');
    setSavingEmp(true);
    try {
      await payrollAPI.employees.create(empForm);
      toast.success('Employee added');
      setShowEmpModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to add employee');
    } finally { setSavingEmp(false); }
  };

  const openEmpDetail = async (id) => {
    setShowEmpDetail(id);
    try {
      const res = await payrollAPI.employees.getOne(id);
      setEmpDetail(res.data);
    } catch { toast.error('Could not load employee'); }
  };

  const handleAddAllowance = async () => {
    if (!(parseFloat(allowForm.amount) > 0)) return toast.error('Enter a valid amount');
    try {
      await payrollAPI.allowances.create(showEmpDetail, allowForm);
      toast.success('Allowance added');
      setAllowForm({ allowanceType: 'transport', amount: '', startDate: new Date().toISOString().slice(0,10) });
      openEmpDetail(showEmpDetail);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add allowance'); }
  };

  const handleAddDeduction = async () => {
    if (!(parseFloat(deductForm.totalAmount) > 0) || !(parseFloat(deductForm.monthlyDeduction) > 0))
      return toast.error('Enter valid amounts');
    try {
      await payrollAPI.deductions.create(showEmpDetail, deductForm);
      toast.success('Deduction added');
      setDeductForm({ deductionType: 'loan', totalAmount: '', monthlyDeduction: '', startDate: new Date().toISOString().slice(0,10) });
      openEmpDetail(showEmpDetail);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add deduction'); }
  };

  // ── Payroll runs ───────────────────────────────────────────
  const handleRunPayroll = async () => {
    setRunningPayroll(true);
    try {
      const res = await payrollAPI.runs.create({ month: runMonth, year: runYear });
      toast.success('Payroll calculated');
      setShowRunModal(false);
      load();
      openRunDetail(res.data.id);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to run payroll');
    } finally { setRunningPayroll(false); }
  };

  const openRunDetail = async (id) => {
    setShowRunDetail(id);
    try {
      const res = await payrollAPI.runs.getOne(id);
      setRunDetail(res.data);
    } catch { toast.error('Could not load payroll run'); }
  };

  const handlePostRun = async () => {
    setPosting(true);
    try {
      await payrollAPI.runs.post(showRunDetail);
      toast.success('Posted to General Ledger');
      openRunDetail(showRunDetail);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to post payroll');
    } finally { setPosting(false); }
  };

  const handlePayslipPdf = (item) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const left = 40, right = 555;
    let y = 50;

    doc.setFontSize(18).setFont(undefined, 'bold');
    doc.text(org?.name || 'FinSuite Pro', left, y);
    y += 22;
    doc.setFontSize(16).setFont(undefined, 'bold');
    doc.text('Payslip', left, y);
    doc.setFontSize(10).setFont(undefined, 'normal');
    doc.text(`${MONTHS[runDetail.month]} ${runDetail.year}`, 400, 50);

    y += 30;
    doc.setFontSize(11).setFont(undefined, 'bold');
    doc.text(`${item.first_name} ${item.last_name}`, left, y);
    y += 16;
    doc.setFontSize(9).setFont(undefined, 'normal');
    doc.text(`${item.employee_code}  ·  ${item.department || ''} ${item.position ? '· ' + item.position : ''}`, left, y);
    y += 30;

    const row = (label, value, bold) => {
      doc.setFontSize(11).setFont(undefined, bold ? 'bold' : 'normal');
      doc.text(label, left, y);
      doc.text(value, right, y, { align: 'right' });
      y += 18;
    };

    row('Basic Salary', fmtCur(item.basic_salary));
    if (parseFloat(item.allowances_total) > 0) row('Allowances', fmtCur(item.allowances_total));
    if (parseFloat(item.overtime_total) > 0) row('Overtime', fmtCur(item.overtime_total));
    row('Gross Pay', fmtCur(item.gross_pay), true);
    y += 8;
    doc.setDrawColor(220).line(left, y, right, y);
    y += 20;
    row('SSNIT (Employee 5.5%)', `-${fmtCur(item.ssnit_employee)}`);
    row('Tier 2 Pension (5%)', `-${fmtCur(item.tier2_employee)}`);
    row('PAYE Tax', `-${fmtCur(item.paye)}`);
    if (parseFloat(item.loan_deductions) > 0) row('Loan/Advance Repayment', `-${fmtCur(item.loan_deductions)}`);
    y += 8;
    doc.setDrawColor(220).line(left, y, right, y);
    y += 20;
    row('NET PAY', fmtCur(item.net_pay), true);

    y += 30;
    doc.setFontSize(8).setFont(undefined, 'normal').setTextColor(130);
    doc.text('This payslip is computer-generated and does not require a signature.', left, y);
    doc.setTextColor(0);

    doc.save(`payslip-${item.employee_code}-${runDetail.month}-${runDetail.year}.pdf`);
  };

  const handlePayeReportPdf = async () => {
    try {
      const res = await payrollAPI.runs.payeReport(showRunDetail);
      const { run, items } = res.data;
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const left = 40, right = 555;
      let y = 50;
      doc.setFontSize(16).setFont(undefined, 'bold');
      doc.text('PAYE Report', left, y);
      doc.setFontSize(10).setFont(undefined, 'normal');
      doc.text(`${MONTHS[run.month]} ${run.year} — ${org?.name || ''}`, left, y + 18);
      y += 44;

      const colX = { name: left, tin: 260, gross: 360, ssnit: 430, paye: 500 };
      doc.setFontSize(9).setFont(undefined, 'bold');
      doc.text('Employee', colX.name, y);
      doc.text('TIN', colX.tin, y);
      doc.text('Gross', colX.gross, y);
      doc.text('SSNIT+T2', colX.ssnit, y);
      doc.text('PAYE', colX.paye, y);
      doc.setDrawColor(220).line(left, y + 4, right, y + 4);
      y += 18;
      doc.setFont(undefined, 'normal');
      items.forEach(it => {
        doc.text(`${it.first_name} ${it.last_name}`, colX.name, y, { maxWidth: 200 });
        doc.text(it.tin_number || '—', colX.tin, y);
        doc.text(Number(it.gross_pay).toFixed(2), colX.gross, y);
        doc.text((Number(it.ssnit_employee) + Number(it.tier2_employee)).toFixed(2), colX.ssnit, y);
        doc.text(Number(it.paye).toFixed(2), colX.paye, y);
        y += 16;
      });
      y += 8;
      doc.setDrawColor(220).line(left, y, right, y);
      y += 16;
      doc.setFont(undefined, 'bold');
      doc.text('Total PAYE Due to GRA', left, y);
      doc.text(fmtCur(res.data.totalPaye), right, y, { align: 'right' });

      doc.save(`paye-report-${run.month}-${run.year}.pdf`);
    } catch { toast.error('Could not generate PAYE report'); }
  };

  const handleSsnitReportPdf = async () => {
    try {
      const res = await payrollAPI.runs.ssnitReport(showRunDetail);
      const { run, items } = res.data;
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const left = 40, right = 555;
      let y = 50;
      doc.setFontSize(16).setFont(undefined, 'bold');
      doc.text('SSNIT Contribution Report', left, y);
      doc.setFontSize(10).setFont(undefined, 'normal');
      doc.text(`${MONTHS[run.month]} ${run.year} — ${org?.name || ''}`, left, y + 18);
      y += 44;

      const colX = { name: left, ssnitNo: 230, basic: 340, emp: 410, empr: 480 };
      doc.setFontSize(9).setFont(undefined, 'bold');
      doc.text('Employee', colX.name, y);
      doc.text('SSNIT No.', colX.ssnitNo, y);
      doc.text('Basic', colX.basic, y);
      doc.text('Employee', colX.emp, y);
      doc.text('Employer', colX.empr, y);
      doc.setDrawColor(220).line(left, y + 4, right, y + 4);
      y += 18;
      doc.setFont(undefined, 'normal');
      items.forEach(it => {
        doc.text(`${it.first_name} ${it.last_name}`, colX.name, y, { maxWidth: 170 });
        doc.text(it.ssnit_number || '—', colX.ssnitNo, y);
        doc.text(Number(it.basic_salary).toFixed(2), colX.basic, y);
        doc.text(Number(it.ssnit_employee).toFixed(2), colX.emp, y);
        doc.text(Number(it.ssnit_employer).toFixed(2), colX.empr, y);
        y += 16;
      });
      y += 8;
      doc.setDrawColor(220).line(left, y, right, y);
      y += 16;
      doc.setFont(undefined, 'bold');
      doc.text('Total SSNIT Due (Employee + Employer)', left, y);
      doc.text(fmtCur(res.data.totalSSNIT), right, y, { align: 'right' });
      y += 16;
      doc.text('Total Tier 2 Due', left, y);
      doc.text(fmtCur(res.data.totalTier2), right, y, { align: 'right' });

      doc.save(`ssnit-report-${run.month}-${run.year}.pdf`);
    } catch { toast.error('Could not generate SSNIT report'); }
  };

  // ── Leave ──────────────────────────────────────────────────
  const handleSubmitLeave = async () => {
    if (!leaveForm.employeeId) return toast.error('Select an employee');
    if (!leaveForm.startDate || !leaveForm.endDate) return toast.error('Enter start and end dates');
    if (!(parseFloat(leaveForm.days) > 0)) return toast.error('Enter number of days');
    try {
      await payrollAPI.leave.create(leaveForm);
      toast.success('Leave request submitted');
      setShowLeaveModal(false);
      setLeaveForm({ employeeId: '', leaveType: 'annual', startDate: '', endDate: '', days: '', reason: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to submit leave request'); }
  };

  const handleDecideLeave = async (id, approve) => {
    try {
      await payrollAPI.leave.decide(id, approve);
      toast.success(approve ? 'Leave approved' : 'Leave rejected');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to decide'); }
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#6b7fa3' }}>Loading…</div>;

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a2740', marginBottom: 4 }}>Payroll</h1>
          <p style={{ fontSize: 13, color: '#6b7fa3' }}>Ghana-compliant payroll — PAYE, SSNIT, Tier 2, payslips</p>
        </div>
        {tab === 'employees' && (
          <button onClick={openEmpModal} style={{ padding: '10px 20px', background: '#1e6bbd', color: 'white',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Add Employee</button>
        )}
        {tab === 'runs' && (
          <button onClick={() => setShowRunModal(true)} style={{ padding: '10px 20px', background: '#1e6bbd', color: 'white',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Run Payroll</button>
        )}
        {tab === 'leave' && (
          <button onClick={() => setShowLeaveModal(true)} style={{ padding: '10px 20px', background: '#1e6bbd', color: 'white',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Request Leave</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: tab === t.id ? '#1e6bbd' : 'white', color: tab === t.id ? 'white' : '#6b7fa3',
              boxShadow: tab === t.id ? '0 4px 12px rgba(30,107,189,.3)' : '0 1px 4px rgba(0,0,0,.06)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Employees tab */}
      {tab === 'employees' && (
        <div style={card}>
          {employees.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#6b7fa3' }}>No employees yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Code', 'Name', 'Department', 'Position', 'Basic Salary', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600,
                      color: '#6b7fa3', textTransform: 'uppercase', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f4f6f9' }}>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12, color: '#1e6bbd' }}>{e.employee_code}</td>
                    <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>{e.first_name} {e.last_name}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#6b7fa3' }}>{e.department || '—'}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#6b7fa3' }}>{e.position || '—'}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, fontFamily: 'monospace' }}>{fmtCur(e.basic_salary)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: e.status === 'active' ? 'rgba(22,199,154,.1)' : 'rgba(224,92,92,.1)',
                        color: e.status === 'active' ? '#0ea87f' : '#e05c5c' }}>{e.status}</span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <button onClick={() => openEmpDetail(e.id)} style={{ padding: '5px 12px', borderRadius: 6,
                        border: '1px solid #e2e8f0', background: 'white', fontSize: 11, cursor: 'pointer' }}>Manage</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Payroll Runs tab */}
      {tab === 'runs' && (
        <div style={card}>
          {runs.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#6b7fa3' }}>No payroll runs yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Period', 'Gross', 'PAYE', 'SSNIT', 'Net Pay', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600,
                      color: '#6b7fa3', textTransform: 'uppercase', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f4f6f9' }}>
                    <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>{MONTHS[r.month]} {r.year}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, fontFamily: 'monospace' }}>{fmtCur(r.total_gross)}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, fontFamily: 'monospace' }}>{fmtCur(r.total_paye)}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, fontFamily: 'monospace' }}>{fmtCur(parseFloat(r.total_ssnit) + parseFloat(r.total_employer_ssnit))}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}>{fmtCur(r.total_net_pay)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: r.status === 'posted' ? 'rgba(22,199,154,.1)' : 'rgba(232,160,74,.14)',
                        color: r.status === 'posted' ? '#0ea87f' : '#c47a1a' }}>{r.status}</span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <button onClick={() => openRunDetail(r.id)} style={{ padding: '5px 12px', borderRadius: 6,
                        border: '1px solid #e2e8f0', background: 'white', fontSize: 11, cursor: 'pointer' }}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Leave tab */}
      {tab === 'leave' && (
        <div style={card}>
          {leaveRequests.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#6b7fa3' }}>No leave requests yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Employee', 'Type', 'Dates', 'Days', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600,
                      color: '#6b7fa3', textTransform: 'uppercase', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map(l => (
                  <tr key={l.id} style={{ borderBottom: '1px solid #f4f6f9' }}>
                    <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>{l.employee_name}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, textTransform: 'capitalize' }}>{l.leave_type}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#6b7fa3' }}>{fmtDate(l.start_date)} – {fmtDate(l.end_date)}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, fontFamily: 'monospace' }}>{l.days}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: l.status === 'approved' ? 'rgba(22,199,154,.1)' : l.status === 'rejected' ? 'rgba(224,92,92,.1)' : 'rgba(232,160,74,.14)',
                        color: l.status === 'approved' ? '#0ea87f' : l.status === 'rejected' ? '#e05c5c' : '#c47a1a' }}>{l.status}</span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {l.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => handleDecideLeave(l.id, true)} style={{ padding: '5px 10px', borderRadius: 6,
                            border: '1px solid #16c79a', background: 'white', color: '#0ea87f', fontSize: 11, cursor: 'pointer' }}>Approve</button>
                          <button onClick={() => handleDecideLeave(l.id, false)} style={{ padding: '5px 10px', borderRadius: 6,
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

      {/* ── Add Employee Modal ── */}
      <Modal open={showEmpModal} onClose={() => setShowEmpModal(false)} title="Add Employee">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div><label style={lbl}>First Name *</label>
            <input style={inp} value={empForm.firstName || ''} onChange={e => setEmpForm(f => ({ ...f, firstName: e.target.value }))}/></div>
          <div><label style={lbl}>Last Name *</label>
            <input style={inp} value={empForm.lastName || ''} onChange={e => setEmpForm(f => ({ ...f, lastName: e.target.value }))}/></div>
          <div><label style={lbl}>Email</label>
            <input style={inp} type="email" value={empForm.email || ''} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))}/></div>
          <div><label style={lbl}>Phone</label>
            <input style={inp} value={empForm.phone || ''} onChange={e => setEmpForm(f => ({ ...f, phone: e.target.value }))}/></div>
          <div><label style={lbl}>Department</label>
            <input style={inp} value={empForm.department || ''} onChange={e => setEmpForm(f => ({ ...f, department: e.target.value }))}/></div>
          <div><label style={lbl}>Position</label>
            <input style={inp} value={empForm.position || ''} onChange={e => setEmpForm(f => ({ ...f, position: e.target.value }))}/></div>
          <div><label style={lbl}>Employment Type</label>
            <select style={inp} value={empForm.employmentType || 'full_time'} onChange={e => setEmpForm(f => ({ ...f, employmentType: e.target.value }))}>
              {['full_time','part_time','contract','casual'].map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
            </select></div>
          <div><label style={lbl}>Start Date *</label>
            <input style={inp} type="date" value={empForm.startDate || ''} onChange={e => setEmpForm(f => ({ ...f, startDate: e.target.value }))}/></div>
          <div><label style={lbl}>Basic Salary (GHS/month) *</label>
            <input style={inp} type="number" min="0" step="0.01" value={empForm.basicSalary || ''} onChange={e => setEmpForm(f => ({ ...f, basicSalary: e.target.value }))}/></div>
          <div><label style={lbl}>Hourly Rate (optional, for overtime)</label>
            <input style={inp} type="number" min="0" step="0.01" value={empForm.hourlyRate || ''} onChange={e => setEmpForm(f => ({ ...f, hourlyRate: e.target.value }))}/></div>
          <div><label style={lbl}>SSNIT Number</label>
            <input style={inp} value={empForm.ssnitNumber || ''} onChange={e => setEmpForm(f => ({ ...f, ssnitNumber: e.target.value }))}/></div>
          <div><label style={lbl}>TIN Number</label>
            <input style={inp} value={empForm.tinNumber || ''} onChange={e => setEmpForm(f => ({ ...f, tinNumber: e.target.value }))}/></div>
          <div><label style={lbl}>Bank Account</label>
            <input style={inp} value={empForm.bankAccount || ''} onChange={e => setEmpForm(f => ({ ...f, bankAccount: e.target.value }))}/></div>
          <div><label style={lbl}>Mobile Money Number</label>
            <input style={inp} value={empForm.mobileMoneyNumber || ''} onChange={e => setEmpForm(f => ({ ...f, mobileMoneyNumber: e.target.value }))}/></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button onClick={() => setShowEmpModal(false)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0',
            background: 'white', color: '#6b7fa3', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSaveEmp} disabled={savingEmp} style={{ padding: '10px 20px', borderRadius: 8, border: 'none',
            background: savingEmp ? '#6b7fa3' : '#1e6bbd', color: 'white', fontSize: 13, fontWeight: 700,
            cursor: savingEmp ? 'not-allowed' : 'pointer' }}>{savingEmp ? 'Saving…' : 'Add Employee'}</button>
        </div>
      </Modal>

      {/* ── Employee Detail / Manage Modal ── */}
      <Modal open={!!showEmpDetail} onClose={() => { setShowEmpDetail(null); setEmpDetail(null); }} title="Manage Employee" width={640}>
        {empDetail && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{empDetail.first_name} {empDetail.last_name}</div>
              <div style={{ fontSize: 12, color: '#6b7fa3' }}>{empDetail.employee_code} · {fmtCur(empDetail.basic_salary)}/month</div>
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Allowances</div>
            {empDetail.allowances.length === 0 ? (
              <div style={{ fontSize: 12, color: '#6b7fa3', marginBottom: 14 }}>None</div>
            ) : empDetail.allowances.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12 }}>
                <span style={{ textTransform: 'capitalize' }}>{a.allowance_type} {a.description ? `(${a.description})` : ''}</span>
                <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace' }}>{fmtCur(a.amount)}</span>
                  <button onClick={async () => { await payrollAPI.allowances.remove(a.id); openEmpDetail(showEmpDetail); }}
                    style={{ background: 'none', border: 'none', color: '#e05c5c', cursor: 'pointer', fontSize: 11 }}>Remove</button>
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, marginBottom: 20 }}>
              <select style={{ ...inp, flex: '0 0 120px' }} value={allowForm.allowanceType}
                onChange={e => setAllowForm(f => ({ ...f, allowanceType: e.target.value }))}>
                {['transport','housing','feeding','other'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input style={inp} type="number" placeholder="Amount" value={allowForm.amount}
                onChange={e => setAllowForm(f => ({ ...f, amount: e.target.value }))}/>
              <input style={{ ...inp, flex: '0 0 140px' }} type="date" value={allowForm.startDate}
                onChange={e => setAllowForm(f => ({ ...f, startDate: e.target.value }))}/>
              <button onClick={handleAddAllowance} style={{ padding: '0 16px', borderRadius: 8, border: 'none',
                background: '#1e6bbd', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Add</button>
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Loans / Advances</div>
            {empDetail.deductions.length === 0 ? (
              <div style={{ fontSize: 12, color: '#6b7fa3', marginBottom: 14 }}>None</div>
            ) : empDetail.deductions.map(d => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12 }}>
                <span style={{ textTransform: 'capitalize' }}>{d.deduction_type} — {fmtCur(d.monthly_deduction)}/mo</span>
                <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace' }}>{fmtCur(d.remaining_balance)} left</span>
                  <button onClick={async () => { await payrollAPI.deductions.remove(d.id); openEmpDetail(showEmpDetail); }}
                    style={{ background: 'none', border: 'none', color: '#e05c5c', cursor: 'pointer', fontSize: 11 }}>Cancel</button>
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <select style={{ ...inp, flex: '0 0 110px' }} value={deductForm.deductionType}
                onChange={e => setDeductForm(f => ({ ...f, deductionType: e.target.value }))}>
                {['loan','advance','other'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input style={inp} type="number" placeholder="Total" value={deductForm.totalAmount}
                onChange={e => setDeductForm(f => ({ ...f, totalAmount: e.target.value }))}/>
              <input style={inp} type="number" placeholder="Monthly" value={deductForm.monthlyDeduction}
                onChange={e => setDeductForm(f => ({ ...f, monthlyDeduction: e.target.value }))}/>
              <button onClick={handleAddDeduction} style={{ padding: '0 16px', borderRadius: 8, border: 'none',
                background: '#1e6bbd', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Add</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Run Payroll Modal ── */}
      <Modal open={showRunModal} onClose={() => setShowRunModal(false)} title="Run Payroll" width={400}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
          <div><label style={lbl}>Month</label>
            <select style={inp} value={runMonth} onChange={e => setRunMonth(parseInt(e.target.value))}>
              {MONTHS.slice(1).map((m, i) => <option key={m} value={i+1}>{m}</option>)}
            </select></div>
          <div><label style={lbl}>Year</label>
            <input style={inp} type="number" value={runYear} onChange={e => setRunYear(parseInt(e.target.value))}/></div>
        </div>
        <p style={{ fontSize: 12, color: '#6b7fa3', marginBottom: 16 }}>
          Calculates PAYE, SSNIT and Tier 2 for every active employee based on their basic salary,
          active allowances and outstanding loan deductions.
        </p>
        <button onClick={handleRunPayroll} disabled={runningPayroll} style={{ width: '100%', padding: 12, borderRadius: 8,
          border: 'none', background: runningPayroll ? '#6b7fa3' : '#1e6bbd', color: 'white', fontSize: 14, fontWeight: 700,
          cursor: runningPayroll ? 'not-allowed' : 'pointer' }}>
          {runningPayroll ? 'Calculating…' : 'Calculate Payroll'}
        </button>
      </Modal>

      {/* ── Payroll Run Detail Modal ── */}
      <Modal open={!!showRunDetail} onClose={() => { setShowRunDetail(null); setRunDetail(null); }} title="Payroll Run" width={760}>
        {runDetail && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{MONTHS[runDetail.month]} {runDetail.year}</div>
                <div style={{ fontSize: 12, color: '#6b7fa3' }}>
                  Gross {fmtCur(runDetail.total_gross)} · Net {fmtCur(runDetail.total_net_pay)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handlePayeReportPdf} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #1e6bbd',
                  background: 'white', color: '#1e6bbd', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>PAYE Report</button>
                <button onClick={handleSsnitReportPdf} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #1e6bbd',
                  background: 'white', color: '#1e6bbd', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>SSNIT Report</button>
                {runDetail.status === 'draft' && (
                  <button onClick={handlePostRun} disabled={posting} style={{ padding: '8px 14px', borderRadius: 8, border: 'none',
                    background: posting ? '#6b7fa3' : '#16c79a', color: 'white', fontSize: 11, fontWeight: 700,
                    cursor: posting ? 'not-allowed' : 'pointer' }}>{posting ? 'Posting…' : 'Post to GL'}</button>
                )}
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Employee', 'Gross', 'PAYE', 'SSNIT', 'Net Pay', ''].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700,
                      color: '#6b7fa3', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runDetail.items.map(it => (
                  <tr key={it.id} style={{ borderBottom: '1px solid #f0f2f5' }}>
                    <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 600 }}>{it.first_name} {it.last_name}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12, fontFamily: 'monospace' }}>{fmtCur(it.gross_pay)}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12, fontFamily: 'monospace' }}>{fmtCur(it.paye)}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12, fontFamily: 'monospace' }}>{fmtCur(parseFloat(it.ssnit_employee) + parseFloat(it.tier2_employee))}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}>{fmtCur(it.net_pay)}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <button onClick={() => handlePayslipPdf(it)} style={{ padding: '4px 10px', borderRadius: 6,
                        border: '1px solid #e2e8f0', background: 'white', fontSize: 11, cursor: 'pointer' }}>Payslip</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* ── Leave Request Modal ── */}
      <Modal open={showLeaveModal} onClose={() => setShowLeaveModal(false)} title="Request Leave" width={440}>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Employee *</label>
          <select style={inp} value={leaveForm.employeeId} onChange={e => setLeaveForm(f => ({ ...f, employeeId: e.target.value }))}>
            <option value="">Select employee…</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div><label style={lbl}>Leave Type</label>
            <select style={inp} value={leaveForm.leaveType} onChange={e => setLeaveForm(f => ({ ...f, leaveType: e.target.value }))}>
              {['annual','sick','maternity','paternity','unpaid','other'].map(t => <option key={t} value={t}>{t}</option>)}
            </select></div>
          <div><label style={lbl}>Days *</label>
            <input style={inp} type="number" min="0.5" step="0.5" value={leaveForm.days}
              onChange={e => setLeaveForm(f => ({ ...f, days: e.target.value }))}/></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div><label style={lbl}>Start Date *</label>
            <input style={inp} type="date" value={leaveForm.startDate} onChange={e => setLeaveForm(f => ({ ...f, startDate: e.target.value }))}/></div>
          <div><label style={lbl}>End Date *</label>
            <input style={inp} type="date" value={leaveForm.endDate} onChange={e => setLeaveForm(f => ({ ...f, endDate: e.target.value }))}/></div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Reason</label>
          <textarea style={{ ...inp, height: 60, resize: 'vertical' }} value={leaveForm.reason}
            onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))}/>
        </div>
        <button onClick={handleSubmitLeave} style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none',
          background: '#1e6bbd', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Submit Request</button>
      </Modal>
    </div>
  );
}
