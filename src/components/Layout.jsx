import { Outlet, Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useBudget } from '../data/BudgetContext';
import { Database, Search, Menu, X, BarChart2, Landmark, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

export default function Layout() {
  const { stateId } = useParams();
  const { states } = useBudget();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isStatesDropdownOpen, setIsStatesDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsStatesDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const navLinks = [
    { path: '/', label: 'Home', exact: true },
    { path: '/compare', label: 'Compare States' },
  ];

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/30 transition-shadow">
                <Landmark className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-bold text-slate-900">BudgetView</span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">Nigeria</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={clsx(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive(link.path, link.exact)
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  {link.label}
                </Link>
              ))}

              {/* States Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsStatesDropdownOpen(!isStatesDropdownOpen)}
                  className={clsx(
                    "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    stateId
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <span>Explore States</span>
                  <ChevronDown className={clsx("w-4 h-4 transition-transform", isStatesDropdownOpen && "rotate-180")} />
                </button>

                {isStatesDropdownOpen && (
                  <div className="absolute top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-900/10 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available States</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto py-1">
                      {states.map((state) => (
                        <Link
                          key={state.id}
                          to={`/state/${state.id}`}
                          onClick={() => setIsStatesDropdownOpen(false)}
                          className={clsx(
                            "flex items-center justify-between px-4 py-2.5 text-sm transition-colors",
                            stateId === state.id
                              ? "bg-emerald-50 text-emerald-700"
                              : "text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <span className="font-medium">{state.name}</span>
                          <span className="text-xs text-slate-400">{state.year}</span>
                        </Link>
                      ))}
                    </div>
                    <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
                      <Link
                        to="/compare"
                        onClick={() => setIsStatesDropdownOpen(false)}
                        className="flex items-center gap-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                        Compare All States
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </nav>

            {/* Right Side: Search & Actions */}
            <div className="flex items-center gap-3">
              {/* Global Search */}
              <div className="hidden lg:block relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search MDAs..."
                  value={globalSearch}
                  onChange={handleSearchChange}
                  className="w-48 xl:w-64 pl-9 pr-4 py-2 bg-slate-100 border border-transparent focus:bg-white focus:border-emerald-500 focus:w-56 xl:focus:w-72 rounded-xl text-sm outline-none transition-all"
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full mt-2 right-0 w-80 bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                      <span className="text-xs font-semibold text-slate-500">{searchResults.length} results found</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto py-1">
                      {searchResults.map((res, i) => (
                        <button
                          key={`${res.stateId}-${res.code}-${i}`}
                          onClick={() => {
                            navigate(`/state/${res.stateId}`);
                            setGlobalSearch('');
                            setSearchResults([]);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">{res.stateName}</span>
                          </div>
                          <p className="text-sm font-medium text-slate-900 line-clamp-1">{res.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <aside className="absolute right-0 top-0 h-full w-80 bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg flex items-center justify-center">
                  <Landmark className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-slate-900">Menu</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search MDAs..."
                  value={globalSearch}
                  onChange={handleSearchChange}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-100 border border-transparent focus:bg-white focus:border-emerald-500 rounded-xl text-sm outline-none"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto">
                  {searchResults.slice(0, 5).map((res, i) => (
                    <button
                      key={`mobile-${res.stateId}-${res.code}-${i}`}
                      onClick={() => {
                        navigate(`/state/${res.stateId}`);
                        setGlobalSearch('');
                        setSearchResults([]);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <span className="text-xs font-semibold text-emerald-600">{res.stateName}</span>
                      <p className="text-sm font-medium text-slate-900">{res.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-2">
              <div className="px-4 py-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Navigation</span>
              </div>
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                  location.pathname === '/' ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50"
                )}
              >
                Home
              </Link>
              <Link
                to="/compare"
                onClick={() => setIsMobileMenuOpen(false)}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                  location.pathname === '/compare' ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <BarChart2 className="w-4 h-4" />
                Compare States
              </Link>

              <div className="px-4 py-2 mt-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Available States</span>
              </div>
              {states.map((state) => (
                <Link
                  key={state.id}
                  to={`/state/${state.id}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={clsx(
                    "flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors",
                    stateId === state.id ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <span>{state.name}</span>
                  <span className="text-xs text-slate-400">{state.year}</span>
                </Link>
              ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <Link
                to="/admin/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-600 transition-colors"
              >
                <Database className="w-3.5 h-3.5" />
                Admin Console
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
