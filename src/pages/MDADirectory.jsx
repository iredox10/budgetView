import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useBudget } from '../data/BudgetContext';
import { 
  Search, ArrowLeft, Download, ArrowRight, CheckCircle2, X, 
  Building2, Filter, ChevronDown, ChevronUp, FileText,
  TrendingUp, Users, Wallet, Target, Eye, Printer, Share2,
  ChevronLeft, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { clsx } from 'clsx';
import SourceInspector from '../components/SourceInspector';
import ShareButton from '../components/ShareButton';

const formatCurrency = (val) => {
  if (!val || val === 0) return '₦0.00';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
};

const formatCompact = (val) => {
  if (!val || val === 0) return '₦0';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(val);
};

// Stat card component
const StatCard = ({ icon, label, value, color = 'emerald' }) => {
  const IconComponent = icon;
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100'
  };
  
  return (
    <div className={clsx("flex items-center gap-3 px-4 py-3 rounded-xl border min-w-0", colors[color])}>
      <IconComponent className="w-5 h-5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{label}</p>
        <p className="text-base sm:text-lg font-bold break-words leading-tight">{value}</p>
      </div>
    </div>
  );
};

// Progress bar for visual comparison
const BudgetBar = ({ value, max, color = 'emerald' }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const colors = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500'
  };
  
  return (
    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div 
        className={clsx("h-full rounded-full transition-all duration-500", colors[color])}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export default function MDADirectory() {
  const { stateId } = useParams();
  const navigate = useNavigate();
  const { states, isInitialized } = useBudget();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMDA, setSelectedMDA] = useState(null);
  const [sortField, setSortField] = useState('total');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState('all');
  const itemsPerPage = 25;

  // Get data directly from context
  const data = useMemo(() => {
    if (!isInitialized) return null;
    const stateInfo = states.find(s => s.id === stateId);
    return stateInfo ? stateInfo.data : null;
  }, [stateId, states, isInitialized]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!data) return {};
    const mdas = data.mdas;
    return {
      totalMDAs: mdas.length,
      totalBudget: mdas.reduce((acc, m) => acc + m.total, 0),
      totalPersonnel: mdas.reduce((acc, m) => acc + m.personnel, 0),
      totalCapital: mdas.reduce((acc, m) => acc + m.capital, 0),
      avgAllocation: mdas.reduce((acc, m) => acc + m.total, 0) / mdas.length,
      topMDA: [...mdas].sort((a, b) => b.total - a.total)[0]
    };
  }, [data]);

  // Filter and sort MDAs
  const filteredAndSortedMDAs = useMemo(() => {
    if (!data) return [];
    
    let result = data.mdas.filter(mda => {
      const matchesSearch = mda.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           mda.code.includes(searchQuery);
      
      if (filterType === 'all') return matchesSearch;
      if (filterType === 'high') return matchesSearch && mda.total > 1000000000; // > 1B
      if (filterType === 'medium') return matchesSearch && mda.total > 100000000 && mda.total <= 1000000000;
      if (filterType === 'low') return matchesSearch && mda.total <= 100000000;
      return matchesSearch;
    });
    
    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    return result;
  }, [data, searchQuery, sortField, sortDirection, filterType]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedMDAs.length / itemsPerPage);
  const paginatedMDAs = filteredAndSortedMDAs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const exportToCSV = () => {
    if (!data) return;
    const headers = ["Code", "MDA Name", "Personnel", "Overhead", "Capital", "Total"];
    const rows = filteredAndSortedMDAs.map(m => [
      `"${m.code}"`,
      `"${m.name}"`,
      m.personnel,
      m.overhead,
      m.capital,
      m.total
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${data.state}_mda_directory_${data.year}.csv`);
    link.click();
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
          <span>Loading MDA Directory...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center bg-white rounded-3xl shadow-sm border border-slate-200 p-12 max-w-xl mx-auto">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">MDA Data Not Found</h2>
          <p className="text-slate-500 mb-6">The MDA directory for this state is not available.</p>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* MDA Detail Sidebar */}
      {selectedMDA && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">MDA Details</h3>
                <p className="text-xs text-slate-500">Allocation breakdown</p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedMDA(null)}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* MDA Header */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Agency Name</p>
              <h4 className="text-xl font-bold text-slate-900 leading-tight">{selectedMDA.name}</h4>
              <p className="text-sm font-mono text-slate-500 mt-2">{selectedMDA.code}</p>
            </div>
            
            {/* Allocation Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 bg-emerald-50 rounded-xl text-center border border-emerald-100">
                <Users className="w-5 h-5 text-emerald-600 mx-auto mb-2" />
                <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Personnel</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{formatCompact(selectedMDA.personnel)}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl text-center border border-blue-100">
                <Wallet className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                <p className="text-xs text-blue-700 font-semibold uppercase tracking-wider">Overhead</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{formatCompact(selectedMDA.overhead)}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl text-center border border-amber-100">
                <Target className="w-5 h-5 text-amber-600 mx-auto mb-2" />
                <p className="text-xs text-amber-700 font-semibold uppercase tracking-wider">Capital</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{formatCompact(selectedMDA.capital)}</p>
              </div>
            </div>
            
            {/* Total */}
            <div className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
              <p className="text-sm font-semibold text-emerald-100 uppercase tracking-wider mb-1">Total Allocation</p>
              <p className="text-3xl font-bold">{formatCurrency(selectedMDA.total)}</p>
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-sm text-emerald-100">
                  {((selectedMDA.total / (stats.totalBudget || 1)) * 100).toFixed(2)}% of state budget
                </p>
              </div>
            </div>
            
            {/* Source Inspector */}
            {data.pdf_file_id && (
              <SourceInspector 
                pdfFileId={data.pdf_file_id} 
                pageNumber={selectedMDA.pageNumber || 1} 
              />
            )}
            
            {/* Source Line */}
            {selectedMDA.sourceLine && (
              <div className="p-4 bg-slate-900 rounded-xl">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Source Line</p>
                <p className="text-xs font-mono text-slate-300 leading-relaxed">
                  {selectedMDA.sourceLine}
                </p>
              </div>
            )}
          </div>
          
          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Verified from official budget document</span>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb & Back */}
        <div className="flex items-center gap-2 mb-6">
          <button 
            onClick={() => navigate(`/state/${stateId}`)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {data.state} Overview</span>
          </button>
        </div>

        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">
                    MDA Directory
                  </h1>
                  <p className="text-slate-500">
                    {data.state} State {data.year} Budget
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <ShareButton 
                targetId="mda-directory"
                fileName={`${data.state}-mda-directory`}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          <StatCard 
            icon={Building2} 
            label="Total MDAs" 
            value={stats.totalMDAs?.toLocaleString() || 0}
            color="emerald"
          />
          <StatCard 
            icon={Wallet} 
            label="Total Budget" 
            value={formatCompact(stats.totalBudget || 0)}
            color="blue"
          />
          <StatCard 
            icon={Users} 
            label="Personnel Costs" 
            value={formatCompact(stats.totalPersonnel || 0)}
            color="amber"
          />
          <StatCard 
            icon={Target} 
            label="Capital Expenditure" 
            value={formatCompact(stats.totalCapital || 0)}
            color="indigo"
          />
          <StatCard 
            icon={TrendingUp} 
            label="Average Allocation" 
            value={formatCompact(stats.avgAllocation || 0)}
            color="emerald"
          />
        </div>

        {/* Top MDA Spotlight */}
        {stats.topMDA && !searchQuery && (
          <div className="mb-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-100 uppercase tracking-wider mb-1">
                  Highest Funded Agency
                </p>
                <h3 className="text-2xl font-bold">{stats.topMDA.name}</h3>
                <p className="text-emerald-100 mt-1">{stats.topMDA.code}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{formatCurrency(stats.topMDA.total)}</p>
                <p className="text-sm text-emerald-100 mt-1">
                  {((stats.topMDA.total / (stats.totalBudget || 1)) * 100).toFixed(2)}% of total budget
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by agency name or code..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
            
            {/* Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-500 mr-2">Filter:</span>
              {[
                { key: 'all', label: 'All' },
                { key: 'high', label: 'High (>₦1B)' },
                { key: 'medium', label: 'Medium' },
                { key: 'low', label: 'Low (<₦100M)' }
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => {
                    setFilterType(filter.key);
                    setCurrentPage(1);
                  }}
                  className={clsx(
                    "px-4 py-2 text-sm font-medium rounded-xl transition-all",
                    filterType === filter.key
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Results count */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-900">{filteredAndSortedMDAs.length}</span> of{' '}
              <span className="font-semibold text-slate-900">{data.mdas.length}</span> MDAs
            </p>
            {searchQuery && (
              <p className="text-sm text-emerald-600">
                Search: "{searchQuery}"
              </p>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div id="mda-directory" className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="tbl-responsive">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  {[
                    { key: 'name', label: 'Agency', align: 'left' },
                    { key: 'personnel', label: 'Personnel', align: 'right' },
                    { key: 'overhead', label: 'Overhead', align: 'right' },
                    { key: 'capital', label: 'Capital', align: 'right' },
                    { key: 'total', label: 'Total', align: 'right' },
                    { key: 'chart', label: 'Visual', align: 'center' }
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() => col.key !== 'chart' && handleSort(col.key)}
                      className={clsx(
                        "px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500",
                        col.align === 'left' ? 'text-left' : col.align === 'right' ? 'text-right' : 'text-center',
                        col.key !== 'chart' && "cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      )}
                    >
                      <div className={clsx("flex items-center gap-1", col.align === 'right' && "justify-end")}>
                        {col.label}
                        {sortField === col.key && (
                          sortDirection === 'asc' ? 
                            <ChevronUp className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedMDAs.map((mda) => (
                  <tr
                    key={mda.code}
                    onClick={() => setSelectedMDA(mda)}
                    className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td data-label="Agency" className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
                          <Building2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {mda.name}
                          </p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{mda.code}</p>
                        </div>
                      </div>
                    </td>
                    <td data-label="Personnel" className="px-6 py-4 text-right">
                      <p className="text-sm font-medium text-slate-700">{formatCompact(mda.personnel)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {((mda.personnel / (mda.total || 1)) * 100).toFixed(0)}%
                      </p>
                    </td>
                    <td data-label="Overhead" className="px-6 py-4 text-right">
                      <p className="text-sm font-medium text-slate-700">{formatCompact(mda.overhead)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {((mda.overhead / (mda.total || 1)) * 100).toFixed(0)}%
                      </p>
                    </td>
                    <td data-label="Capital" className="px-6 py-4 text-right">
                      <p className="text-sm font-medium text-slate-700">{formatCompact(mda.capital)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {((mda.capital / (mda.total || 1)) * 100).toFixed(0)}%
                      </p>
                    </td>
                    <td data-label="Total" className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-slate-900">{formatCompact(mda.total)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {((mda.total / (stats.totalBudget || 1)) * 100).toFixed(2)}% of budget
                      </p>
                    </td>
                    <td data-label="Visual" className="px-6 py-4 text-center">
                      <BudgetBar 
                        value={mda.total} 
                        max={stats.topMDA?.total || 1}
                        color={mda.total > 1000000000 ? 'emerald' : mda.total > 100000000 ? 'blue' : 'amber'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Empty State */}
          {paginatedMDAs.length === 0 && (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No MDAs Found</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                No agencies match your current search or filter criteria. Try adjusting your search terms or filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('all');
                  setCurrentPage(1);
                }}
                className="mt-4 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page <span className="font-semibold text-slate-900">{currentPage}</span> of{' '}
              <span className="font-semibold text-slate-900">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={clsx(
                  "p-2 rounded-xl transition-colors",
                  currentPage === 1 
                    ? "text-slate-300 cursor-not-allowed" 
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={clsx(
                      "w-10 h-10 rounded-xl text-sm font-semibold transition-colors",
                      currentPage === pageNum
                        ? "bg-emerald-600 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={clsx(
                  "p-2 rounded-xl transition-colors",
                  currentPage === totalPages 
                    ? "text-slate-300 cursor-not-allowed" 
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-12 bg-slate-900 rounded-2xl p-8 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Source Documents</h3>
                <p className="text-sm text-slate-400">All data extracted from official budget documents</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-6 py-3 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors">
                View Original PDF
              </button>
              <button 
                onClick={() => navigate('/compare')}
                className="px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors"
              >
                Compare States
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
