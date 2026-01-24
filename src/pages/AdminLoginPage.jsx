import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Title, Text, TextInput, Button } from '@tremor/react';
import { ShieldCheck, Lock, ArrowRight, Database } from 'lucide-react';

export default function AdminLoginPage() {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Simple static passcode for the separate admin section
    if (passcode === 'admin123') {
      sessionStorage.setItem('is_admin', 'true');
      navigate('/admin', { replace: true });
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[120px] opacity-20 -mr-48 -mt-48"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600 rounded-full blur-[120px] opacity-20 -ml-48 -mb-48"></div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-blue-600 rounded-3xl shadow-2xl shadow-blue-900/50 mb-4">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">System Access</h1>
          <p className="text-slate-400 text-sm mt-2">BudgetView State Transparency Engine</p>
        </div>

        <Card className="rounded-3xl border-white/5 bg-white/10 backdrop-blur-xl shadow-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 ml-1">Secure Passcode</label>
              <div className="mt-2 relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="password"
                  placeholder="••••••••"
                  autoFocus
                  className={`w-full pl-12 pr-4 py-4 bg-slate-900/50 border ${error ? 'border-rose-500 shadow-rose-500/20' : 'border-white/10'} focus:border-blue-500 rounded-2xl text-white outline-none transition-all shadow-xl`}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                />
              </div>
              {error && <p className="text-rose-500 text-[10px] font-bold mt-2 ml-1">INVALID ACCESS CODE</p>}
            </div>

            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20"
            >
              INITIALIZE CONSOLE
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </Card>

        <div className="mt-8 flex justify-center items-center gap-6 text-slate-500">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Encrypted Local Storage</span>
          </div>
          <div className="w-[1px] h-3 bg-white/10"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest">v1.0.4-Stable</span>
        </div>
      </div>
    </div>
  );
}
