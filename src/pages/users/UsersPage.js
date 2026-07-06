// ============================================================
//  src/pages/users/UsersPage.js
// ============================================================
import { useState, useEffect } from 'react';
import { usersAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';

const ROLES = ['Admin','Accountant','Manager',
  'Viewer','Data Entry'];

const ROLE_COLOR = {
  Admin:       { color:'#e05c5c', bg:'rgba(224,92,92,.1)'   },
  Accountant:  { color:'#1e6bbd', bg:'rgba(30,107,189,.1)'  },
  Manager:     { color:'#7c3aed', bg:'rgba(124,58,237,.1)'  },
  Viewer:      { color:'#6b7fa3', bg:'rgba(107,127,163,.1)' },
  'Data Entry':{ color:'#e8a04a', bg:'rgba(232,160,74,.1)'  },
};

const PERMISSIONS = [
  { key:'can_view_reports',    label:'View Reports'          },
  { key:'can_create_invoices', label:'Create Invoices'       },
  { key:'can_approve_bills',   label:'Approve Bills'         },
  { key:'can_post_journals',   label:'Post Journal Entries'  },
  { key:'can_manage_users',    label:'Manage Users'          },
  { key:'can_manage_settings', label:'Manage Settings'       },
  { key:'can_export_data',     label:'Export Data'           },
];

const ROLE_DEFAULTS = {
  Admin:        PERMISSIONS.map(p => p.key),
  Accountant:   ['can_view_reports','can_create_invoices',
    'can_approve_bills','can_post_journals','can_export_data'],
  Manager:      ['can_view_reports','can_approve_bills',
    'can_export_data'],
  Viewer:       ['can_view_reports'],
  'Data Entry': ['can_create_invoices'],
};

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0,
      background:'rgba(13,27,42,.5)', display:'flex',
      alignItems:'center', justifyContent:'center',
      zIndex:9999, padding:20 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'white', borderRadius:14,
        width:'100%', maxWidth:520, maxHeight:'90vh',
        overflow:'auto',
        boxShadow:'0 20px 60px rgba(13,27,42,.25)' }}>
        <div style={{ display:'flex', alignItems:'center',
          justifyContent:'space-between',
          padding:'18px 24px',
          borderBottom:'1px solid #e2e8f0' }}>
          <span style={{ fontSize:16, fontWeight:700 }}>
            {title}
          </span>
          <button onClick={onClose}
            style={{ background:'none', border:'none',
              fontSize:22, color:'#6b7fa3',
              cursor:'pointer', lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  // App.js's AdminRoute already redirects a non-Admin away before this
  // page ever renders — this is a second, cheap layer in case that
  // route guard is ever bypassed or this page gets embedded somewhere
  // else later. The server enforces the real boundary either way
  // (user.routes.js requires Admin), so this can't be worked around
  // by just skipping the client check.
  const { hasRole } = useAuth();
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm] = useState({
    firstName:'', lastName:'', email:'',
    password:'', role:'Accountant',
  });
  const [permissions, setPermissions] = useState(
    ROLE_DEFAULTS['Accountant']
  );

  const load = () => {
    setLoading(true);
    usersAPI.list()
      .then(res => setUsers(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const upd = (f, v) => {
    setForm(p => ({ ...p, [f]: v }));
    if (f === 'role') {
      setPermissions(ROLE_DEFAULTS[v] || []);
    }
  };

  const togglePerm = (key) => {
    setPermissions(prev =>
      prev.includes(key)
        ? prev.filter(p => p !== key)
        : [...prev, key]
    );
  };

  const handleInvite = async () => {
    if (!form.firstName)
      return alert('First name is required');
    if (!form.email)
      return alert('Email is required');
    if (!form.password || form.password.length < 8)
      return alert('Password must be at least 8 characters');
    setSaving(true);
    try {
      await usersAPI.invite({
        ...form, permissions,
      });
      load();
      setModal(false);
      setForm({ firstName:'', lastName:'',
        email:'', password:'', role:'Accountant' });
      setPermissions(ROLE_DEFAULTS['Accountant']);
      alert(`User ${form.email} has been added successfully!`);
    } catch (err) {
      alert(err.message || 'Failed to add user');
    } finally { setSaving(false); }
  };

  const handleDeactivate = async (userId) => {
    if (!window.confirm(
      'Deactivate this user? They will lose access.'))
      return;
    try {
      await usersAPI.update(userId, { isActive: false });
      load();
    } catch (err) {
      alert(err.message || 'Failed to deactivate user');
    }
  };

  // The backend's PUT /:id already supports both of these (reactivating
  // and changing role) — neither had any UI control to trigger them.
  // Once deactivated, a user had no way back in short of direct DB
  // access, and a role picked at invite time could never be revised.
  const handleReactivate = async (userId) => {
    try {
      await usersAPI.update(userId, { isActive: true });
      load();
    } catch (err) {
      alert(err.message || 'Failed to reactivate user');
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await usersAPI.update(userId, { role: newRole });
      load();
    } catch (err) {
      alert(err.message || 'Failed to update role');
    }
  };

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-GB', {
        day:'2-digit', month:'short', year:'numeric' })
    : '—';

  const inp = { width:'100%', padding:'9px 12px',
    border:'1.5px solid #e2e8f0', borderRadius:8,
    fontSize:13, fontFamily:'sans-serif',
    background:'#f9fafb', outline:'none' };
  const lbl = { display:'block', fontSize:11,
    fontWeight:600, color:'#1a2740', marginBottom:6 };
  const g2  = { display:'grid',
    gridTemplateColumns:'1fr 1fr', gap:14 };

  const activeUsers   = users.filter(u => u.is_active !== 0);
  const inactiveUsers = users.filter(u => u.is_active === 0);

  if (!hasRole('Admin')) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
        height:'65vh', fontFamily:'sans-serif', textAlign:'center' }}>
        <div>
          <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
          <h2 style={{ fontSize:18, fontWeight:700, color:'#1a2740', marginBottom:6 }}>
            Admins only
          </h2>
          <p style={{ color:'#6b7fa3', fontSize:13 }}>
            User management is restricted to Admin accounts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily:'sans-serif' }}>

      {/* Header */}
      <div style={{ display:'flex',
        justifyContent:'space-between',
        alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700,
            color:'#1a2740', marginBottom:4 }}>
            Users & Roles
          </h1>
          <p style={{ fontSize:13, color:'#6b7fa3' }}>
            Manage team access, roles and permissions
          </p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ padding:'10px 20px',
            background:'#1e6bbd', color:'white',
            border:'none', borderRadius:8, fontSize:13,
            fontWeight:700, cursor:'pointer' }}>
          + Add User
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid',
        gridTemplateColumns:'repeat(4,1fr)',
        gap:12, marginBottom:20 }}>
        {[
          { label:'Total Users',
            value:users.length, color:'#1e6bbd' },
          { label:'Active',
            value:activeUsers.length, color:'#16c79a' },
          { label:'Inactive',
            value:inactiveUsers.length, color:'#6b7fa3' },
          { label:'Roles Used',
            value:new Set(users.map(u =>
              u.role)).size, color:'#7c3aed' },
        ].map((s,i) => (
          <div key={i} style={{ background:'white',
            borderRadius:12, padding:16,
            border:'1px solid #e2e8f0',
            boxShadow:'0 2px 8px rgba(13,27,42,.04)' }}>
            <div style={{ fontSize:11, color:'#6b7fa3',
              fontWeight:500, marginBottom:6 }}>
              {s.label}
            </div>
            <div style={{ fontSize:20, fontWeight:700,
              color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Role guide */}
      <div style={{ background:'white', borderRadius:12,
        border:'1px solid #e2e8f0', padding:'14px 20px',
        marginBottom:16, display:'flex',
        alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <span style={{ fontSize:11, color:'#6b7fa3',
          fontWeight:600, textTransform:'uppercase',
          letterSpacing:.5 }}>Roles:</span>
        {ROLES.map(role => {
          const rc = ROLE_COLOR[role] || ROLE_COLOR.Viewer;
          return (
            <span key={role} style={{ padding:'3px 10px',
              borderRadius:20, fontSize:11,
              fontWeight:600, background:rc.bg,
              color:rc.color }}>
              {role}
            </span>
          );
        })}
      </div>

      {/* Users table */}
      <div style={{ background:'white', borderRadius:12,
        border:'1px solid #e2e8f0', overflow:'hidden',
        boxShadow:'0 2px 8px rgba(13,27,42,.04)' }}>
        {loading ? (
          <div style={{ textAlign:'center',
            padding:60, color:'#6b7fa3' }}>
            <div style={{ width:28, height:28,
              border:'3px solid #e2e8f0',
              borderTopColor:'#1e6bbd',
              borderRadius:'50%',
              animation:'spin .7s linear infinite',
              margin:'0 auto 12px' }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign:'center',
            padding:'60px 20px', color:'#6b7fa3' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>
              👤
            </div>
            <p style={{ fontSize:14, fontWeight:600,
              color:'#1a2740', marginBottom:6 }}>
              No other users yet
            </p>
            <p style={{ fontSize:13, marginBottom:20 }}>
              Add team members to collaborate
            </p>
            <button onClick={() => setModal(true)}
              style={{ padding:'10px 24px',
                background:'#1e6bbd', color:'white',
                border:'none', borderRadius:8,
                fontSize:13, fontWeight:600,
                cursor:'pointer' }}>
              + Add First User
            </button>
          </div>
        ) : (
          <table style={{ width:'100%',
            borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['User','Email','Role',
                  'Status','Joined','Actions'].map(h => (
                  <th key={h} style={{ padding:'10px 16px',
                    textAlign:'left', fontSize:10,
                    fontWeight:600, color:'#6b7fa3',
                    textTransform:'uppercase',
                    letterSpacing:.7,
                    background:'#f8fafc',
                    borderBottom:'1px solid #e2e8f0' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => {
                const roleName = user.role || 'Viewer';
                const rc = ROLE_COLOR[roleName]
                  || ROLE_COLOR.Viewer;
                const initials =
                  `${(user.first_name||'U')[0]}${(user.last_name||'')[0]||''}`.toUpperCase();
                return (
                  <tr key={i}
                    style={{ borderBottom:
                      '1px solid #f4f6f9',
                      opacity: user.is_active===0 ? .55 : 1 }}>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex',
                        alignItems:'center', gap:10 }}>
                        <div style={{ width:34, height:34,
                          borderRadius:9, flexShrink:0,
                          background:`hsl(${(i*53)+200},55%,50%)`,
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'center',
                          fontSize:12, fontWeight:700,
                          color:'white' }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontWeight:600,
                            fontSize:13 }}>
                            {user.first_name} {user.last_name}
                          </div>
                          {user.is_active === 0 && (
                            <div style={{ fontSize:10,
                              color:'#e05c5c' }}>
                              Deactivated
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'12px 16px',
                      color:'#6b7fa3', fontSize:13 }}>
                      {user.email}
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <select
                        value={roleName}
                        onChange={e =>
                          handleChangeRole(user.id, e.target.value)}
                        style={{ padding:'3px 8px',
                          borderRadius:20, fontSize:11,
                          fontWeight:600, border:'none',
                          background:rc.bg,
                          color:rc.color, cursor:'pointer' }}>
                        {ROLES.map(r =>
                          <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ padding:'3px 10px',
                        borderRadius:20, fontSize:11,
                        fontWeight:600,
                        background: user.is_active!==0
                          ? 'rgba(22,199,154,.12)'
                          : 'rgba(107,127,163,.12)',
                        color: user.is_active!==0
                          ? '#0ea87f' : '#6b7fa3' }}>
                        {user.is_active!==0
                          ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding:'12px 16px',
                      color:'#6b7fa3', fontSize:12 }}>
                      {fmtDate(user.created_at)}
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      {user.is_active !== 0 ? (
                        <button
                          onClick={() =>
                            handleDeactivate(user.id)}
                          style={{ padding:'5px 10px',
                            borderRadius:6,
                            border:'1px solid #e05c5c',
                            background:'none',
                            color:'#e05c5c', fontSize:11,
                            fontWeight:600,
                            cursor:'pointer' }}>
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            handleReactivate(user.id)}
                          style={{ padding:'5px 10px',
                            borderRadius:6,
                            border:'1px solid #16c79a',
                            background:'none',
                            color:'#0ea87f', fontSize:11,
                            fontWeight:600,
                            cursor:'pointer' }}>
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add User Modal */}
      <Modal open={modal}
        onClose={() => setModal(false)}
        title="Add New User">
        <div>
          <div style={g2}>
            <div>
              <label style={lbl}>First Name *</label>
              <input style={inp}
                value={form.firstName}
                onChange={e =>
                  upd('firstName', e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>Last Name</label>
              <input style={inp}
                value={form.lastName}
                onChange={e =>
                  upd('lastName', e.target.value)}/>
            </div>
          </div>
          <div style={{ marginTop:14 }}>
            <label style={lbl}>Email Address *</label>
            <input style={inp} type="email"
              placeholder="user@company.com"
              value={form.email}
              onChange={e => upd('email', e.target.value)}/>
          </div>
          <div style={{ marginTop:14 }}>
            <label style={lbl}>
              Temporary Password * (min 8 chars)
            </label>
            <input style={inp} type="password"
              value={form.password}
              onChange={e =>
                upd('password', e.target.value)}/>
            <p style={{ fontSize:11, color:'#6b7fa3',
              marginTop:4 }}>
              User should change this on first login
            </p>
          </div>
          <div style={{ marginTop:14 }}>
            <label style={lbl}>Role *</label>
            <select style={inp} value={form.role}
              onChange={e => upd('role', e.target.value)}>
              {ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Permissions */}
          <div style={{ marginTop:18 }}>
            <div style={{ fontSize:11, fontWeight:700,
              color:'#1a2740', marginBottom:10,
              textTransform:'uppercase',
              letterSpacing:.5 }}>
              Permissions
            </div>
            <div style={{ background:'#f8fafc',
              border:'1px solid #e2e8f0',
              borderRadius:8, padding:12 }}>
              {PERMISSIONS.map(perm => (
                <label key={perm.key}
                  style={{ display:'flex',
                    alignItems:'center', gap:10,
                    padding:'6px 0', cursor:'pointer',
                    fontSize:13 }}>
                  <input type="checkbox"
                    checked={permissions.includes(perm.key)}
                    onChange={() =>
                      togglePerm(perm.key)}
                    style={{ width:15, height:15,
                      accentColor:'#1e6bbd' }}/>
                  <span style={{ color:'#1a2740' }}>
                    {perm.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', gap:10,
            justifyContent:'flex-end', marginTop:24 }}>
            <button onClick={() => setModal(false)}
              style={{ padding:'10px 20px',
                borderRadius:8,
                border:'1px solid #e2e8f0',
                background:'white', color:'#6b7fa3',
                fontSize:13, fontWeight:600,
                cursor:'pointer' }}>
              Cancel
            </button>
            <button onClick={handleInvite}
              disabled={saving}
              style={{ padding:'10px 20px',
                borderRadius:8, border:'none',
                background:saving?'#6b7fa3':'#1e6bbd',
                color:'white', fontSize:13,
                fontWeight:700,
                cursor:saving?'not-allowed':'pointer' }}>
              {saving ? 'Adding...' : 'Add User'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
