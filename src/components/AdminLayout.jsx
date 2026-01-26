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
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Text, Badge } from '@tremor/react';

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
    { name: 'Control Panel', path: '/admin', icon: LayoutDashboard, description: 'System overview' },
    { name: 'Upload Data', path: '/admin/upload', icon: Upload, description: 'Forensic extraction' },
    { name: 'Extraction Logs', path: '/admin/logs', icon: FileText, description: 'Audit trail feed' },
    { name: 'System Backup', path: '/admin/backup', icon: Database, description: 'Cloud snapshots' },
  ];

  const currentPathName = navItems.find(item => item.path === location.pathname)?.name || 'Admin Console';

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Admin Sidebar */}
      <aside className="hidden lg:flex flex-col w-80 bg-slate-900 text-white shadow-2xl z-50">
        <div className="p-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-900/50">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none">AdminView</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mt-1">Core Access</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-2 overflow-y-auto">
          <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Main Navigation</p>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                "flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-bold transition-all group relative overflow-hidden",
                location.pathname === item.path
                  ? "bg-blue-600 text-white shadow-2xl shadow-blue-900/40"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={clsx("w-5 h-5 relative z-10", location.pathname === item.path ? "text-white" : "text-slate-500 group-hover:text-blue-400")} />
              <div className="relative z-10">
                <p className="leading-none">{item.name}</p>
                <p className={clsx("text-[10px] mt-1 font-medium", location.pathname === item.path ? "text-blue-100" : "text-slate-600 group-hover:text-slate-400")}>
                  {item.description}
                </p>
              </div>
              {location.pathname === item.path && (
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-300"></div>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-8 border-t border-white/5 bg-slate-950/50">
          <button 
            onClick={handleLogout}
            className="flex items-center justify-between w-full px-6 py-4 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-2xl font-black text-xs transition-all group active:scale-95 shadow-inner"
          >
            <span className="tracking-widest">LOGOUT SESSION</span>
            <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </aside>

      {/* Main Admin Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="sticky top-0 h-24 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-10 z-40 shadow-sm">
          <div className="flex items-center gap-6">
            <button 
              className="lg:hidden p-3 bg-slate-100 rounded-xl text-slate-600"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <span>Root</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-blue-600">{currentPathName}</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1">{currentPathName}</h2>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <Link to="/" className="text-xs font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest flex items-center gap-2 transition-colors">
              <ExternalLink className="w-4 h-4" />
              Public Portal
            </Link>
            <div className="h-10 w-[1px] bg-slate-100 hidden sm:block"></div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-900">Administrator</p>
                <Badge color="emerald" size="xs">ACTIVE SESSION</Badge>
              </div>
              <div className="w-12 h-12 rounded-[1.25rem] bg-slate-900 shadow-2xl shadow-slate-200 flex items-center justify-center text-white font-black border-2 border-white ring-4 ring-slate-50 transition-transform hover:scale-105 cursor-pointer">
                AD
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 lg:p-16">
          <div className="max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm lg:hidden">
          <aside className="w-80 h-full bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-8 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-blue-500" />
                <span className="font-black text-white text-xl">AdminView</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 px-6 py-8 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={clsx(
                    "flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold transition-all",
                    location.pathname === item.path ? "bg-blue-600 text-white shadow-xl" : "text-slate-400 hover:bg-white/5"
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
