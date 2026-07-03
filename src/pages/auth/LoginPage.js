// ============================================================
//  src/pages/auth/LoginPage.js
// ============================================================
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login }      = useAuth();
  const navigate       = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill all fields');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Sora',sans-serif;background:#f4f6f9;color:#1a2740}
        .auth-wrap{display:flex;min-height:100vh}
        .auth-left{
          flex:1;background:linear-gradient(145deg,#0d1b2a 0%,#132338 50%,#1a3050 100%);
          display:flex;flex-direction:column;justify-content:center;padding:60px;
          position:relative;overflow:hidden;
        }
        .auth-left::before{
          content:'';position:absolute;top:-100px;right:-100px;
          width:400px;height:400px;border-radius:50%;
          background:radial-gradient(circle,rgba(45,132,224,.15),transparent 70%);
        }
        .auth-left::after{
          content:'';position:absolute;bottom:-80px;left:-80px;
          width:300px;height:300px;border-radius:50%;
          background:radial-gradient(circle,rgba(232,160,74,.1),transparent 70%);
        }
        .auth-brand{display:flex;align-items:center;gap:14px;margin-bottom:48px;position:relative;z-index:1}
        .auth-brand-icon{
          width:46px;height:46px;border-radius:12px;
          background:linear-gradient(135deg,#2d84e0,#3d9fff);
          display:flex;align-items:center;justify-content:center;
          font-size:20px;font-weight:800;color:white;
          box-shadow:0 0 30px rgba(45,132,224,.5);
        }
        .auth-brand h1{font-size:20px;font-weight:800;color:white}
        .auth-brand p{font-size:11px;color:rgba(255,255,255,.4);font-family:'JetBrains Mono',monospace}
        .auth-headline{position:relative;z-index:1}
        .auth-headline h2{font-size:36px;font-weight:700;color:white;line-height:1.25;margin-bottom:16px}
        .auth-headline h2 span{color:#e8a04a}
        .auth-headline p{font-size:14px;color:rgba(255,255,255,.55);line-height:1.7;max-width:400px}
        .auth-features{margin-top:48px;display:flex;flex-direction:column;gap:16px;position:relative;z-index:1}
        .feat{display:flex;align-items:center;gap:12px}
        .feat-dot{width:8px;height:8px;border-radius:50%;background:#2d84e0;flex-shrink:0}
        .feat p{font-size:13px;color:rgba(255,255,255,.6)}

        .auth-right{width:480px;display:flex;align-items:center;justify-content:center;padding:40px}
        .auth-card{width:100%;max-width:400px}
        .auth-card h3{font-size:24px;font-weight:700;margin-bottom:6px}
        .auth-card p{font-size:13px;color:#6b7fa3;margin-bottom:32px}
        .form-group{margin-bottom:18px}
        .form-label{display:block;font-size:12px;font-weight:600;color:#1a2740;margin-bottom:7px}
        .form-input{
          width:100%;padding:11px 14px;border:1.5px solid #e2e8f0;border-radius:9px;
          font-family:'Sora',sans-serif;font-size:13px;color:#1a2740;
          background:#f9fafb;outline:none;transition:border-color .2s,box-shadow .2s;
        }
        .form-input:focus{border-color:#2d84e0;background:white;box-shadow:0 0 0 3px rgba(45,132,224,.1)}
        .pw-wrap{position:relative}
        .pw-wrap .form-input{padding-right:44px}
        .pw-toggle{
          position:absolute;right:12px;top:50%;transform:translateY(-50%);
          background:none;border:none;cursor:pointer;color:#6b7fa3;font-size:12px;font-family:'Sora',sans-serif
        }
        .btn-submit{
          width:100%;padding:12px;border:none;border-radius:9px;
          background:linear-gradient(135deg,#1e6bbd,#2d84e0);color:white;
          font-family:'Sora',sans-serif;font-size:14px;font-weight:700;
          cursor:pointer;transition:all .2s;margin-top:8px;
        }
        .btn-submit:hover:not(:disabled){box-shadow:0 6px 20px rgba(30,107,189,.4);transform:translateY(-1px)}
        .btn-submit:disabled{opacity:.7;cursor:not-allowed}
        .auth-footer{text-align:center;margin-top:20px;font-size:12px;color:#6b7fa3}
        .auth-footer a{color:#1e6bbd;font-weight:600;text-decoration:none}
        .divider{display:flex;align-items:center;gap:12px;margin:20px 0}
        .divider span{font-size:11px;color:#6b7fa3;white-space:nowrap}
        .divider::before,.divider::after{content:'';flex:1;height:1px;background:#e2e8f0}
      `}</style>
      <div className="auth-wrap">
        <div className="auth-left">
          <div className="auth-brand">
            <div className="auth-brand-icon">F</div>
            <div>
              <h1>FinSuite Pro</h1>
              <p>Complete Financial Management</p>
            </div>
          </div>
          <div className="auth-headline">
            <h2>Your finances,<br/><span>intelligently</span> managed.</h2>
            <p>The complete accounting platform built for growing businesses — with IFRS compliance, multi-currency support, and real-time insights.</p>
          </div>
          <div className="auth-features">
            {["IFRS 18 compliant financial statements","Multi-currency invoicing & exchange rates","Automated tax & VAT reporting","Fixed asset depreciation (IAS 16/38)","Real-time dashboard & cash flow tracking"].map((f,i)=>(
              <div className="feat" key={i}><div className="feat-dot"/><p>{f}</p></div>
            ))}
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-card">
            <h3>Welcome back</h3>
            <p>Sign in to your organisation account</p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" placeholder="you@company.com"
                  value={form.email} onChange={e => setForm({...form, email: e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="pw-wrap">
                  <input className="form-input" type={showPw?"text":"password"} placeholder="••••••••"
                    value={form.password} onChange={e => setForm({...form, password: e.target.value})}/>
                  <button type="button" className="pw-toggle" onClick={()=>setShowPw(!showPw)}>
                    {showPw?"Hide":"Show"}
                  </button>
                </div>
              </div>
              <div style={{ textAlign:'right', marginTop:-10, marginBottom:20 }}>
                <Link to="/forgot-password" style={{ fontSize:12, color:'#1e6bbd', textDecoration:'none' }}>
                  Forgot password?
                </Link>
              </div>
              <button className="btn-submit" type="submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <div className="auth-footer">
              Don't have an account? <Link to="/register">Create one free</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
