import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  ArrowRight, 
  Database, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Landmark,
  ChevronLeft,
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import { clsx } from 'clsx';

export default function AdminLoginPage() {
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(false);
    
    // Simulate loading for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Simple static passcode for the separate admin section
    if (passcode === 'admin123') {
      sessionStorage.setItem('is_admin', 'true');
      navigate('/admin', { replace: true });
    } else {
      setError(true);
      setAttemptCount(prev => prev + 1);
      setIsLoading(false);
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px]" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Landmark className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">BudgetView Nigeria</span>
          </div>
          
          {/* Main Message */}
          <div className="max-w-md">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">
              Admin Console
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              Secure access to the BudgetView state transparency engine. 
              Manage data uploads, system logs, and audit trails.
            </p>
            
            {/* Features List */}
            <div className="mt-8 space-y-3">
              {[
                'Upload & verify state budget data',
                'Monitor system performance',
                'Manage audit logs',
                'Export comprehensive reports'
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-slate-300">{feature}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span>Secure Connection</span>
            </div>
            <div className="w-px h-4 bg-slate-700" />
            <span>v1.0.4</span>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <Landmark className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">BudgetView</span>
          </div>
          
          {/* Back Link */}
          <Link 
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-8"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Public Site
          </Link>

          {/* Login Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Administrator Access</h1>
              <p className="text-slate-500 mt-2 text-sm">
                Enter your secure passcode to continue
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Passcode
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter access code"
                    autoFocus
                    className={clsx(
                      "w-full pl-12 pr-12 py-4 bg-slate-50 border rounded-xl text-slate-900 font-medium outline-none transition-all",
                      error 
                        ? "border-rose-300 bg-rose-50 focus:border-rose-500 focus:bg-white" 
                        : "border-slate-200 focus:border-emerald-500 focus:bg-white focus:shadow-lg focus:shadow-emerald-500/10"
                    )}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-slate-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                </div>
                
                {/* Error Message */}
                {error && (
                  <div className="mt-3 flex items-center gap-2 text-rose-600 bg-rose-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">
                      Invalid passcode. Please try again.
                    </span>
                  </div>
                )}
                
                {/* Attempt Warning */}
                {attemptCount > 2 && !error && (
                  <div className="mt-3 flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">
                      Multiple failed attempts detected.
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !passcode}
                className={clsx(
                  "w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2",
                  isLoading || !passcode
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30"
                )}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Access Console</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Help Text */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-500 text-center leading-relaxed">
                This is a secure area. Unauthorized access attempts are logged and monitored.
                Contact the system administrator if you need access.
              </p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              Need help?{' '}
              <Link to="/" className="text-emerald-600 font-semibold hover:text-emerald-700">
                Contact Support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
