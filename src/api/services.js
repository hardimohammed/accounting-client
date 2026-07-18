// ============================================================
//  src/api/services.js — All API Service Functions
// ============================================================
import api from './client';

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  register:       (data)  => api.post('/auth/register', data),
  login:          (data)  => api.post('/auth/login', data),
  logout:         ()      => api.post('/auth/logout'),
  getMe:          ()      => api.get('/auth/me'),
  updateProfile:  (data)  => api.put('/auth/me', data),
  refreshToken:   (token) => api.post('/auth/refresh-token', { refreshToken: token }),
  changePassword: (data)  => api.put('/auth/change-password', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword:  (data)  => api.post('/auth/reset-password', data),
};

// ── Dashboard ─────────────────────────────────────────────────
export const dashboardAPI = {
  getKPIs:           () => api.get('/dashboard/kpis'),
  getSalesTrend:     () => api.get('/dashboard/sales-trend'),
  getCashTrend:      () => api.get('/dashboard/cash-trend'),
  getRevenueExpenses:() => api.get('/dashboard/revenue-expenses'),
  getTopCustomers:   () => api.get('/dashboard/top-customers'),
  getTaxDeadlines:   () => api.get('/dashboard/tax-deadlines'),
};

// ── Organisation ──────────────────────────────────────────────
export const orgAPI = {
  get:    ()     => api.get('/organizations'),
  update: (data) => api.put('/organizations', data),
};

// ── Users ─────────────────────────────────────────────────────
// Only list/invite/update exist on the backend — there's no GET /:id
// or DELETE /:id, so no getOne/remove here (they'd just 404).
export const usersAPI = {
  list:   (params) => api.get('/users', { params }),
  invite: (data)   => api.post('/users/invite', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  resetPassword: (id, newPassword) => api.put(`/users/${id}/reset-password`, { newPassword }),
};

// ── Roles (admin-editable per-role module permissions) ────────
export const rolesAPI = {
  list:              () => api.get('/roles'),
  listModules:        () => api.get('/roles/modules'),
  updatePermissions: (roleId, modules) => api.put(`/roles/${roleId}/permissions`, { modules }),
};

// ── Chart of Accounts ─────────────────────────────────────────
export const accountsAPI = {
  list:   (params) => api.get('/accounts', { params }),
  getOne: (id)     => api.get(`/accounts/${id}`),
  create: (data)   => api.post('/accounts', data),
  update: (id, data) => api.put(`/accounts/${id}`, data),
  remove: (id)     => api.delete(`/accounts/${id}`),
};

// ── Currencies & Exchange Rates ───────────────────────────────
export const currencyAPI = {
  list:            ()     => api.get('/currencies'),
  getExchangeRates:(params)=> api.get('/currencies/rates', { params }),
  getLatestRate:   (base, target) => api.get('/currencies/rates/latest', { params: { base, target } }),
  addRate:         (data) => api.post('/currencies/rates', data),
};

// ── Bank Accounts & Reconciliation ─────────────────────────────
export const bankAPI = {
  list:   ()     => api.get('/banks'),
  getOne: (id)   => api.get(`/banks/${id}`),
  create: (data) => api.post('/banks', data),
  update: (id, data) => api.put(`/banks/${id}`, data),
  importStatementLines: (id, lines) => api.post(`/banks/${id}/statement-lines`, { lines }),
  getStatementLines:    (id, params) => api.get(`/banks/${id}/statement-lines`, { params }),
  getUnmatchedJournalLines: (id) => api.get(`/banks/${id}/unmatched-journal-lines`),
  match:   (id, lineId, journalLineId) => api.post(`/banks/${id}/statement-lines/${lineId}/match`, { journalLineId }),
  unmatch: (id, lineId) => api.post(`/banks/${id}/statement-lines/${lineId}/unmatch`),
  getReconciliationSummary: (id) => api.get(`/banks/${id}/reconciliation-summary`),
};

// ── Receipts (customer payments received) ──────────────────────
export const receiptAPI = {
  list:      (params) => api.get('/receipts', { params }),
  getOne:    (id)     => api.get(`/receipts/${id}`),
  create:    (data)   => api.post('/receipts', data),
  allocate:  (id, allocations) => api.post(`/receipts/${id}/allocate`, { allocations }),
};

// ── Payments (supplier payments sent) ───────────────────────────
export const paymentAPI = {
  list:      (params) => api.get('/payments', { params }),
  getOne:    (id)     => api.get(`/payments/${id}`),
  create:    (data)   => api.post('/payments', data),
  allocate:  (id, allocations) => api.post(`/payments/${id}/allocate`, { allocations }),
};

// ── Journal Entries ───────────────────────────────────────────
export const journalsAPI = {
  list:   (params)   => api.get('/journals', { params }),
  getOne: (id)       => api.get(`/journals/${id}`),
  create: (data)     => api.post('/journals', data),
  post:   (id)       => api.post(`/journals/${id}/post`),
  reverse:(id, data) => api.post(`/journals/${id}/reverse`, data),
};

// ── Customers ─────────────────────────────────────────────────
export const customersAPI = {
  list:      (params) => api.get('/customers', { params }),
  getOne:    (id)     => api.get(`/customers/${id}`),
  create:    (data)   => api.post('/customers', data),
  update:    (id, d)  => api.put(`/customers/${id}`, d),
  remove:    (id)     => api.delete(`/customers/${id}`),
  statement: (id, p)  => api.get(`/customers/${id}/statement`, { params: p }),
};

// ── Quotations ────────────────────────────────────────────────
export const quotationsAPI = {
  list:      (params) => api.get('/quotations', { params }),
  getOne:    (id)     => api.get(`/quotations/${id}`),
  create:    (data)   => api.post('/quotations', data),
  update:    (id, d)  => api.put(`/quotations/${id}`, d),
  remove:    (id)     => api.delete(`/quotations/${id}`),
  convert:   (id)     => api.post(`/quotations/${id}/convert`),
  send:      (id)     => api.post(`/quotations/${id}/send`),
};

// ── Invoices ──────────────────────────────────────────────────
export const invoicesAPI = {
  list:      (params) => api.get('/invoices', { params }),
  getOne:    (id)     => api.get(`/invoices/${id}`),
  create:    (data)   => api.post('/invoices', data),
  update:    (id, d)  => api.put(`/invoices/${id}`, d),
  remove:    (id)     => api.delete(`/invoices/${id}`),
  post:      (id)     => api.post(`/invoices/${id}/post`),
  pay:       (id, d)  => api.post(`/invoices/${id}/pay`, d),
  send:      (id, d)  => api.post(`/invoices/${id}/send`, d),
  voidInv:   (id)     => api.post(`/invoices/${id}/void`),
  pdf:       (id)     => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
  stats:     ()       => api.get('/invoices/stats'),
  aged:      ()       => api.get('/invoices/aged'),
  paymentLink: (id, d) => api.post(`/invoices/${id}/payment-link`, d || {}),
  publicLink:  (id)    => api.post(`/invoices/${id}/public-link`),
  sendEmail:   (id)    => api.post(`/invoices/${id}/send-email`),
  payments:    (id)    => api.get(`/invoices/${id}/payments`),
  verifyPayment: (id, paymentId) => api.post(`/invoices/${id}/payments/${paymentId}/verify`),
};

// ── Receipts ──────────────────────────────────────────────────
export const receiptsAPI = {
  list:     (params)  => api.get('/receipts', { params }),
  getOne:   (id)      => api.get(`/receipts/${id}`),
  create:   (data)    => api.post('/receipts', data),
  allocate: (id, d)   => api.post(`/receipts/${id}/allocate`, d),
};

// ── Customer Deposits ─────────────────────────────────────────
export const depositsAPI = {
  list:   (params) => api.get('/receipts/deposits', { params }),
  create: (data)   => api.post('/receipts/deposits', data),
  apply:  (id, d)  => api.post(`/receipts/deposits/${id}/apply`, d),
};

// ── Suppliers ─────────────────────────────────────────────────
export const suppliersAPI = {
  list:      (params) => api.get('/suppliers', { params }),
  getOne:    (id)     => api.get(`/suppliers/${id}`),
  create:    (data)   => api.post('/suppliers', data),
  update:    (id, d)  => api.put(`/suppliers/${id}`, d),
  remove:    (id)     => api.delete(`/suppliers/${id}`),
  statement: (id, p)  => api.get(`/suppliers/${id}/statement`, { params: p }),
};

// ── Purchase Orders ───────────────────────────────────────────
export const purchaseOrdersAPI = {
  list:    (params) => api.get('/purchase-orders', { params }),
  getOne:  (id)     => api.get(`/purchase-orders/${id}`),
  create:  (data)   => api.post('/purchase-orders', data),
  update:  (id, d)  => api.put(`/purchase-orders/${id}`, d),
  receive: (id, d)  => api.post(`/purchase-orders/${id}/receive`, d),
  cancel:  (id)     => api.post(`/purchase-orders/${id}/cancel`),
};

// ── Bills ─────────────────────────────────────────────────────
export const billsAPI = {
  list:    (params) => api.get('/bills', { params }),
  getOne:  (id)     => api.get(`/bills/${id}`),
  create:  (data)   => api.post('/bills', data),
  update:  (id, d)  => api.put(`/bills/${id}`, d),
  approve: (id)     => api.post(`/bills/${id}/approve`),
  post:    (id)     => api.post(`/bills/${id}/post`),
  cancel:  (id)     => api.post(`/bills/${id}/cancel`),
  aged:    ()       => api.get('/bills/reports/aged'),
};

// ── Payments (to suppliers) ───────────────────────────────────
export const paymentsAPI = {
  list:     (params) => api.get('/payments', { params }),
  getOne:   (id)     => api.get(`/payments/${id}`),
  create:   (data)   => api.post('/payments', data),
  allocate: (id, d)  => api.post(`/payments/${id}/allocate`, d),
};

// ── Fixed Assets ──────────────────────────────────────────────
export const assetsAPI = {
  list:             (params) => api.get('/assets', { params }),
  getOne:           (id)     => api.get(`/assets/${id}`),
  create:           (data)   => api.post('/assets', data),
  update:           (id, d)  => api.put(`/assets/${id}`, d),
  dispose:          (id, d)  => api.post(`/assets/${id}/dispose`, d),
  runDepreciation:  (data)   => api.post('/assets/run-depreciation', data),
  getSchedule:      (id)     => api.get(`/assets/${id}/schedule`),
  categories:       {
    list:   ()     => api.get('/assets/categories'),
    create: (data) => api.post('/assets/categories', data),
  },
};

// ── Inventory ─────────────────────────────────────────────────
export const inventoryAPI = {
  products: {
    list:   (params) => api.get('/inventory', { params }),
    getOne: (id)     => api.get(`/inventory/${id}`),
    create: (data)   => api.post('/inventory', data),
    update: (id, d)  => api.put(`/inventory/${id}`, d),
  },
  movements: {
    list:   (params) => api.get('/inventory/movements', { params }),
    create: (data)   => api.post('/inventory/movements', data),
  },
  requisitions: {
    list:    (params) => api.get('/inventory/requisitions', { params }),
    create:  (data)   => api.post('/inventory/requisitions', data),
    approve: (id)     => api.post(`/inventory/requisitions/${id}/approve`),
    issue:   (id)     => api.post(`/inventory/requisitions/${id}/issue`),
  },
  valuation: () => api.get('/inventory/valuation'),
};

// ── Projects ──────────────────────────────────────────────────
export const projectsAPI = {
  list:         (params) => api.get('/projects', { params }),
  getOne:       (id)     => api.get(`/projects/${id}`),
  create:       (data)   => api.post('/projects', data),
  update:       (id, d)  => api.put(`/projects/${id}`, d),
  profitability:(id)     => api.get(`/projects/${id}/profitability`),
  resources:    {
    list:   (pid)    => api.get(`/projects/${pid}/resources`),
    add:    (pid, d) => api.post(`/projects/${pid}/resources`, d),
    remove: (pid, uid) => api.delete(`/projects/${pid}/resources/${uid}`),
  },
  timesheets: {
    list:   (params) => api.get('/projects/timesheets', { params }),
    create: (data)   => api.post('/projects/timesheets', data),
  },
};

// ── Tax ───────────────────────────────────────────────────────
// Several entries here used to call endpoints that don't exist on
// the backend (tax.routes.js has no getOne for a single return, no
// withholding remit action, no capital-allowances module at all, and
// deadlines are read-only) — trimmed to match what's actually there
// rather than leave dead calls a future page could wire up and 404
// against. GET /tax/returns already returns full row detail per
// return, so no separate getOne is needed for a list-based UI.
export const taxAPI = {
  types: {
    list:   ()     => api.get('/tax/types'),
    create: (data) => api.post('/tax/types', data),
    update: (id,d) => api.put(`/tax/${id}`, d),
    remove: (id)   => api.delete(`/tax/${id}`),
  },
  returns: {
    list:   (params) => api.get('/tax/returns', { params }),
    create: (data)   => api.post('/tax/returns', data),
    file:   (id)     => api.post(`/tax/returns/${id}/file`),
  },
  wht: {
    list: (params) => api.get('/tax/withholding', { params }),
  },
  deadlines: {
    list: (params) => api.get('/tax/deadlines', { params }),
  },
};

// ── Financial Reports ─────────────────────────────────────────
export const reportsAPI = {
  trialBalance:   (params) => api.get('/reports/trial-balance', { params }),
  profitLoss:     (params) => api.get('/reports/profit-loss', { params }),
  balanceSheet:   (params) => api.get('/reports/balance-sheet', { params }),
  agedReceivables:(params) => api.get('/reports/aged-receivables', { params }),
  agedPayables:   (params) => api.get('/reports/aged-payables', { params }),
};

// ── POS shift/cash reconciliation history ───────────────────────
export const posAPI = {
  sessions:   (params) => api.get('/pos/sessions', { params }),
  sessionOne: (id)     => api.get(`/pos/sessions/${id}`),
};

// ── Sustainability ────────────────────────────────────────────
export const sustainabilityAPI = {
  metrics: {
    list:   (params) => api.get('/sustainability', { params }),
    create: (data)   => api.post('/sustainability', data),
    update: (id, d)  => api.put(`/sustainability/${id}`, d),
  },
  reports: {
    list:    ()     => api.get('/sustainability/reports'),
    create:  (data) => api.post('/sustainability/reports', data),
    publish: (id)   => api.post(`/sustainability/reports/${id}/publish`),
  },
};

// ── Bank Accounts ─────────────────────────────────────────────
export const banksAPI = {
  list:     (params) => api.get('/banks', { params }),
  getOne:   (id)     => api.get(`/banks/${id}`),
  create:   (data)   => api.post('/banks', data),
  update:   (id, d)  => api.put(`/banks/${id}`, d),
  reconcile:(id, d)  => api.post(`/banks/${id}/reconcile`, d),
  import:   (id, f)  => {
    const form = new FormData();
    form.append('file', f);
    return api.post(`/banks/${id}/import`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ── Agentic AI ────────────────────────────────────────────────
export const agentAPI = {
  tools:       ()       => api.get('/agent/tools'),
  actions:     (params) => api.get('/agent/actions', { params }),
  approve:     (id)     => api.post(`/agent/actions/${id}/approve`),
  reject:      (id)     => api.post(`/agent/actions/${id}/reject`),
  overdueInvoices:    ()     => api.post('/agent/workflows/overdue-invoices'),
  paymentDispute:     (data) => api.post('/agent/workflows/payment-dispute', data),
  payrollAnomalyCheck:(data) => api.post('/agent/workflows/payroll-anomaly-check', data),
  sdgReportDraft:     ()     => api.post('/agent/workflows/sdg-report-draft'),
  chat:        (data)   => api.post('/agent/chat', data),
};

// ── Go-Live Wizard ────────────────────────────────────────────
export const goLiveAPI = {
  preview: ()     => api.get('/golive/preview'),
  execute: (data) => api.post('/golive/execute', data),
};

// ── Period Close ──────────────────────────────────────────────
export const periodCloseAPI = {
  preview: (periodEnd) => api.get('/period-close/preview', { params: { periodEnd } }),
  execute: (data)       => api.post('/period-close', data),
  history: ()            => api.get('/period-close/history'),
};

// ── Payroll ───────────────────────────────────────────────────
export const payrollAPI = {
  employees: {
    list:    (params) => api.get('/payroll/employees', { params }),
    getOne:  (id)     => api.get(`/payroll/employees/${id}`),
    create:  (data)   => api.post('/payroll/employees', data),
    update:  (id, d)  => api.put(`/payroll/employees/${id}`, d),
    remove:  (id)     => api.delete(`/payroll/employees/${id}`),
  },
  allowances: {
    create: (empId, data) => api.post(`/payroll/employees/${empId}/allowances`, data),
    remove: (id)           => api.delete(`/payroll/allowances/${id}`),
  },
  deductions: {
    create: (empId, data) => api.post(`/payroll/employees/${empId}/deductions`, data),
    remove: (id)           => api.delete(`/payroll/deductions/${id}`),
  },
  leave: {
    list:      ()     => api.get('/payroll/leave-requests'),
    create:    (data) => api.post('/payroll/leave-requests', data),
    decide:    (id, approve) => api.post(`/payroll/leave-requests/${id}/decide`, { approve }),
    balances:  (employeeId)  => api.get(`/payroll/leave-balances/${employeeId}`),
    setBalance:(data) => api.post('/payroll/leave-balances', data),
  },
  runs: {
    list:   ()          => api.get('/payroll/runs'),
    getOne: (id)         => api.get(`/payroll/runs/${id}`),
    create: (data)       => api.post('/payroll/runs', data),
    post:   (id, data)   => api.post(`/payroll/runs/${id}/post`, data || {}),
    payeReport:  (id) => api.get(`/payroll/runs/${id}/paye-report`),
    ssnitReport: (id) => api.get(`/payroll/runs/${id}/ssnit-report`),
  },
};
