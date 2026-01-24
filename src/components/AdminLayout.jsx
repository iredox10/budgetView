import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Upload, 
  Settings, 
  LogOut, 
  FileText, 
  Database,
  Menu,
  X,
  ExternalLink
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Text } from '@tremor/react';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Simple session check
  useEffect(() => {
    const isAdmin = sessionStorage.getItem('is_admin') === 'true';
    if (!isAdmin) {
      navigate('/admin/login', { replace: true });
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('is_admin');
    navigate('/', { replace: true });
  };

  const navItems = [
    { name: 'Control Panel', path: '/admin', icon: LayoutDashboard },
    { name: 'Upload Data', path: '/admin/upload', icon: Upload },
    { name: 'Extraction Logs', path: '/admin/logs', icon: FileText },
    { name: 'System Backup', path: '/admin/backup', icon: Database },
  ];

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Admin Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-slate-900 text-white shadow-2xl">
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/50">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">AdminView</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Security Console</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group",
                location.pathname === item.path
                  ? "bg-blue-600 text-white shadow-xl shadow-blue-900/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={clsx("w-5 h-5", location.pathname === item.path ? "text-white" : "text-slate-500 group-hover:text-blue-400")} />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-bold text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            Terminate Session
          </button>
        </div>
      </aside>

      {/* Main Admin Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-20 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 text-slate-600"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest">System Operational</Text>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/" className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Public Portal
            </Link>
            <div className="h-8 w-[1px] bg-slate-200"></div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-black text-slate-900">Administrator</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Root Authority</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-white shadow-md flex items-center justify-center text-white font-bold">
                AD
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
          <Outlet />
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm lg:hidden">
          <aside className="w-72 h-full bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-8 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-blue-500" />
                <span className="font-black text-white">AdminView</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-8 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={clsx(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                    location.pathname === item.path ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}
