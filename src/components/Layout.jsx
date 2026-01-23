import { Outlet, Link, useParams, useNavigate } from 'react-router-dom';
import { useBudget } from '../data/BudgetContext';
import { LayoutDashboard, Database, Search, Menu, X, Upload, BarChart2 } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';

export default function Layout() {
  const { stateId } = useParams();
  const { states } = useBudget();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setGlobalSearch(query);
    
    if (query.length > 2) {
      const results = [];
      states.forEach(state => {
        const matches = state.data.mdas.filter(mda => 
          mda.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 3);
        
        matches.forEach(m => {
          results.push({ ...m, stateName: state.name, stateId: state.id });
        });
      });
      setSearchResults(results.slice(0, 10));
    } else {
      setSearchResults([]);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shadow-sm">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 bg-blue-600 rounded-lg group-hover:bg-blue-700 transition-colors">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                BudgetView
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                Nigeria States
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-6 overflow-y-auto pt-2">
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Navigation
            </div>
            <div className="space-y-1">
              <Link
                to="/upload"
                className={clsx(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  window.location.pathname === '/upload'
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Upload className="w-4 h-4" />
                Upload Budget
              </Link>
              <Link
                to="/compare"
                className={clsx(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  window.location.pathname === '/compare'
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <BarChart2 className="w-4 h-4" />
                Compare States
              </Link>
            </div>
          </div>

          <div>
            <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Monitored States
            </div>
            <div className="space-y-1">
              {states.map((state) => (
                <Link
                  key={state.id}
                  to={`/state/${state.id}`}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                    stateId === state.id
                      ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <LayoutDashboard className={clsx("w-4 h-4", stateId === state.id ? "text-blue-100" : "text-slate-400 group-hover:text-slate-600")} />
                  <span className="truncate">{state.name} {state.year}</span>
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              Data is verified against official state gazettes and approved estimates.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-30">
          <button 
            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex-1 max-w-xl mx-4 relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search across all states..." 
              value={globalSearch}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-sm outline-none transition-all shadow-sm"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-white border border-slate-200 shadow-2xl rounded-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                {searchResults.map((res, i) => (
                  <button
                    key={`${res.stateId}-${res.code}-${i}`}
                    onClick={() => {
                      navigate(`/state/${res.stateId}`);
                      setGlobalSearch('');
                      setSearchResults([]);
                    }}
                    className="w-full text-left p-3 hover:bg-slate-50 rounded-xl flex justify-between items-center group transition-all"
                  >
                    <div>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">{res.stateName}</p>
                      <p className="text-sm font-bold text-slate-900 line-clamp-1">{res.name}</p>
                    </div>
                    <Badge size="xs" color="blue" className="opacity-0 group-hover:opacity-100 transition-opacity">View Details</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900 leading-none">Official Estimates</p>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight mt-1">Verified Audit Trail</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shadow-inner shadow-blue-200">
              NG
            </div>
          </div>
        </header>


        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
          <Outlet />
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm md:hidden">
          <aside className="w-72 h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-6 flex items-center justify-between border-b border-slate-100">
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-6 h-6 text-blue-600" />
                BudgetView
              </h1>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-6">
               <div className="space-y-1">
                  <Link
                    to="/upload"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Budget
                  </Link>
                  <Link
                    to="/compare"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <BarChart2 className="w-4 h-4" />
                    Compare States
                  </Link>
               </div>
               
               <div className="space-y-1">
                  <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    States
                  </div>
                  {states.map((state) => (
                    <Link
                      key={state.id}
                      to={`/state/${state.id}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={clsx(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        stateId === state.id
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      {state.name} {state.year}
                    </Link>
                  ))}
               </div>
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}

