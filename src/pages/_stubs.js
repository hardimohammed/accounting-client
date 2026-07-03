// ============================================================
//  src/pages/PageStubs.js
//  Placeholder components for all pages not yet built
// ============================================================
import { useNavigate } from 'react-router-dom';

function ComingSoon({ title, subtitle }) {
  const navigate = useNavigate();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', fontFamily: "'Sora', sans-serif",
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16, margin: '0 auto 20px',
          background: 'rgba(30,107,189,.1)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 28,
        }}>📋</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#1a2740' }}>
          {title}
        </h2>
        <p style={{ color: '#6b7fa3', fontSize: 13, marginBottom: 24, maxWidth: 320 }}>
          {subtitle || 'This page is ready and connected to the API.'}
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '10px 24px', background: '#1e6bbd', color: 'white',
            border: 'none', borderRadius: 8, fontFamily: "'Sora', sans-serif",
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

// ── Auth ──────────────────────────────────────────────────────
export { default as LoginPage }    from './auth/LoginPage';
export { default as RegisterPage } from './auth/RegisterPage';

// ── Dashboard ─────────────────────────────────────────────────
export { default as DashboardPage } from './dashboard/DashboardPage';

// ── Revenue ───────────────────────────────────────────────────
export { default as InvoiceListPage }   from './invoices/InvoiceListPage';
export { default as InvoiceFormPage }   from './invoices/InvoiceFormPage';
export { default as InvoiceDetailPage } from './invoices/InvoiceDetailPage';
export { default as QuotationListPage } from './invoices/QuotationListPage';
export { default as CustomerListPage }  from './customers/CustomerListPage';
export { default as CustomerDetailPage}from './customers/CustomerDetailPage';

// ── Expenditure ───────────────────────────────────────────────
export { default as BillListPage }      from './bills/BillListPage';
export { default as BillFormPage }      from './bills/BillFormPage';
export { default as PurchaseOrderPage } from './bills/PurchaseOrderPage';
export { default as SupplierListPage }  from './suppliers/SupplierListPage';

// ── Ledger ────────────────────────────────────────────────────
export { default as AccountListPage }   from './accounts/AccountListPage';
export { default as JournalListPage }   from './accounts/JournalListPage';
export { default as JournalFormPage }   from './accounts/JournalFormPage';

// ── Operations ────────────────────────────────────────────────
export { default as AssetListPage }     from './assets/AssetListPage';
export { default as AssetFormPage }     from './assets/AssetFormPage';
export { default as InventoryPage }     from './inventory/InventoryPage';
export { default as ProjectListPage }   from './projects/ProjectListPage';
export { default as ProjectDetailPage } from './projects/ProjectDetailPage';

// ── Compliance ────────────────────────────────────────────────
export { default as TaxDashboardPage }  from './tax/TaxDashboardPage';
export { default as TaxReturnPage }     from './tax/TaxReturnPage';
export { default as ReportsPage }       from './reports/ReportsPage';
export { default as SustainabilityPage}from './sustainability/SustainabilityPage';

// ── Admin ─────────────────────────────────────────────────────
export { default as UsersPage }         from './users/UsersPage';
export { default as SettingsPage }      from './settings/SettingsPage';

// ── Stub pages not yet built ──────────────────────────────────
export const InvoiceDetailPage    = () => <ComingSoon title="Invoice Detail"      />;
export const QuotationListPage    = () => <ComingSoon title="Quotations"          />;
export const CustomerDetailPage   = () => <ComingSoon title="Customer Detail"     />;
export const BillFormPage         = () => <ComingSoon title="Bill Form"           />;
export const PurchaseOrderPage    = () => <ComingSoon title="Purchase Orders"     />;
export const ProjectDetailPage    = () => <ComingSoon title="Project Detail"      />;
export const TaxReturnPage        = () => <ComingSoon title="Tax Return"          />;