import { Outlet, Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useBudget } from '../data/BudgetContext';
import { 
  Database, Search, Menu, X, BarChart2, Landmark, ChevronDown,
  Home, Scale, Building2, PieChart, ChevronRight, Sparkles, User
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

export default function Layout() {
  const { stateId } = useParams();
  const { states } = useBudget();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isStatesDropdownOpen, setIsStatesDropdownOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsStatesDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchResults([]);
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
    { path: '/', label: 'Home', icon: Home, exact: true },
    { path: '/compare', label: 'Compare', icon: Scale },
  ];

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const getCurrentPageTitle = () => {
    if (location.pathname === '/') return 'Home';
    if (location.pathname === '/compare') return 'Compare States';
    if (location.pathname.startsWith('/state/')) {
      const state = states.find(s => s.id === stateId);
      return state ? `${state.name} State` : 'State Details';
    }
    return 'BudgetView';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/30 transition-all group-hover:scale-105">
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
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                    isActive(link.path, link.exact)
                      ? "bg-emerald-50 text-emerald-700 shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}

              {/* States Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsStatesDropdownOpen(!isStatesDropdownOpen)}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                    stateId || isStatesDropdownOpen
                      ? "bg-emerald-50 text-emerald-700 shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Building2 className="w-4 h-4" />
                  <span>States</span>
                  <ChevronDown className={clsx("w-4 h-4 transition-transform duration-200", isStatesDropdownOpen && "rotate-180")} />
                </button>

                {isStatesDropdownOpen && (
                  <div className="absolute top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/10 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available States</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto py-1">
                      {states.map((state) => (
                        <Link
                          key={state.id}
                          to={`/state/${state.id}`}
                          onClick={() => setIsStatesDropdownOpen(false)}
                          className={clsx(
                            "flex items-center justify-between px-4 py-3 text-sm transition-colors border-b border-slate-50 last:border-0",
                            stateId === state.id
                              ? "bg-emerald-50 text-emerald-700"
                              : "text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-sm font-bold text-slate-600">
                              {state.name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-medium block">{state.name}</span>
                              <span className="text-xs text-slate-400">{state.year} Budget</span>
                            </div>
                          </div>
                          {stateId === state.id && (
                            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                          )}
                        </Link>
                      ))}
                    </div>
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
                      <Link
                        to="/compare"
                        onClick={() => setIsStatesDropdownOpen(false)}
                        className="flex items-center justify-between text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                      >
                        <span className="flex items-center gap-2">
                          <BarChart2 className="w-4 h-4" />
                          Compare All States
                        </span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </nav>

            {/* Right Side: Search & Actions */}
            <div className="flex items-center gap-3">
              {/* Global Search */}
              <div className="hidden lg:block relative" ref={searchRef}>
                <div className={clsx(
                  "relative transition-all duration-300",
                  isSearchFocused ? "w-80" : "w-56"
                )}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search MDAs across all states..."
                    value={globalSearch}
                    onChange={handleSearchChange}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-sm outline-none transition-all"
                  />
                </div>
                
                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute top-full mt-2 right-0 w-96 bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">{searchResults.length} results</span>
                      <span className="text-xs text-slate-400">Press ESC to close</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto py-1">
                      {searchResults.map((res, i) => (
                        <button
                          key={`${res.stateId}-${res.code}-${i}`}
                          onClick={() => {
                            navigate(`/state/${res.stateId}`);
                            setGlobalSearch('');
                            setSearchResults([]);
                            setIsSearchFocused(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group"
                        >
                          <div className="flex items-start justify-between mb-1">
                            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide bg-emerald-50 px-2 py-0.5 rounded">
                              {res.stateName}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {res.name}
                          </p>
                          <p className="text-xs text-slate-400 mt-1 font-mono">{res.code}</p>
                        </button>
                      ))}
                    </div>
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                      <span className="text-xs text-slate-400">
                        Showing top {Math.min(searchResults.length, 10)} results
                      </span>
                    </div>
                  </div>
                )}
                
                {globalSearch.length > 0 && searchResults.length === 0 && globalSearch.length > 2 && (
                  <div className="absolute top-full mt-2 right-0 w-80 bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Search className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500">No MDAs found matching "{globalSearch}"</p>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Breadcrumb Bar */}
        <div className="border-t border-slate-100 bg-slate-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-10 text-sm">
              <Link to="/" className="text-slate-500 hover:text-emerald-600 transition-colors flex items-center gap-1">
                <Home className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Home</span>
              </Link>
              
              {location.pathname !== '/' && (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-300 mx-2" />
                  <span className="text-slate-700 font-medium">{getCurrentPageTitle()}</span>
                </>
              )}
              
              {stateId && (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-300 mx-2" />
                  <div className="flex items-center gap-2">
                    {location.pathname.includes('/mdas') && (
                      <span className="text-slate-700">MDA Directory</span>
                    )}
                    {location.pathname.includes('/sectors') && (
                      <span className="text-slate-700">Sector Analysis</span>
                    )}
                    {!location.pathname.includes('/mdas') && !location.pathname.includes('/sectors') && (
                      <span className="text-slate-700">Overview</span>
                    )}
                  </div>
                </>
              )}
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
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          <aside className="absolute right-0 top-0 h-full w-80 bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg flex items-center justify-center">
                  <Landmark className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 text-sm">Menu</span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 hover:bg-white rounded-lg transition-colors"
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
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-100 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl text-sm outline-none transition-all"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto bg-white rounded-xl border border-slate-200">
                  {searchResults.slice(0, 5).map((res, i) => (
                    <button
                      key={`mobile-${res.stateId}-${res.code}-${i}`}
                      onClick={() => {
                        navigate(`/state/${res.stateId}`);
                        setGlobalSearch('');
                        setSearchResults([]);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
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
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors mx-2 rounded-xl",
                  location.pathname === '/' ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <Home className="w-4 h-4" />
                Home
              </Link>
              
              <Link
                to="/compare"
                onClick={() => setIsMobileMenuOpen(false)}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors mx-2 rounded-xl",
                  location.pathname === '/compare' ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <Scale className="w-4 h-4" />
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
                    "flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors mx-2 rounded-xl",
                    stateId === state.id ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-sm font-bold">
                      {state.name.charAt(0)}
                    </div>
                    <span>{state.name}</span>
                  </div>
                  <span className="text-xs text-slate-400">{state.year}</span>
                </Link>
              ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Public Access</p>
                  <p className="text-xs text-slate-500">View budget data</p>
                </div>
              </div>
              
              <Link
                to="/admin/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors"
              >
                <Database className="w-4 h-4" />
                Admin Console
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
