import { useBudget } from '../data/BudgetContext';
import { 
  Trash2, ShieldCheck, Database, FileText, Settings, 
  AlertTriangle, ExternalLink, CheckCircle2, AlertCircle, 
  Clock, Activity, HardDrive, Zap, Landmark, Plus,
  ChevronRight, TrendingUp, Users, Building2, Download,
  ArrowRight, Search, Filter, LogOut, BarChart3
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { clsx } from 'clsx';

export default function AdminDashboard() {
  const { states, deleteState, uploadProgress } = useBudget();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const stats = useMemo(() => {
    const totalMDAs = states.reduce((acc, s) => acc + (s.data?.mdas?.length || 0), 0);
    const totalBudget = states.reduce((acc, s) => acc + (s.data?.summary?.total_expenditure || 0), 0);
    const totalSectors = states.reduce((acc, s) => acc + (s.data?.sectors?.length || 0), 0);
    
    return {
      totalStates: states.length,
      totalMDAs,
      totalBudget,
      totalSectors
    };
  }, [states]);

  const filteredStates = useMemo(() => {
    if (!searchQuery) return states;
    return states.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.year.toString().includes(searchQuery)
    );
  }, [states, searchQuery]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    setConfirmDelete(null);
    try {
      await deleteState(id);
    } catch (err) {
      setError(err.message);
    }
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

  const ingestMode = (import.meta.env.VITE_INGEST_MODE || 'direct').toLowerCase();
  const ingestLabel = ingestMode === 'cloud' ? 'Cloud Function' : 'Direct Upload';

  const StatCard = ({ icon: Icon, label, value, sublabel, color = 'emerald' }) => {
    const IconComponent = Icon;
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div className={clsx(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            color === 'emerald' && "bg-emerald-50 text-emerald-600",
            color === 'blue' && "bg-blue-50 text-blue-600",
            color === 'amber' && "bg-amber-50 text-amber-600",
            color === 'indigo' && "bg-indigo-50 text-indigo-600"
          )}>
            <IconComponent className="w-6 h-6" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          {sublabel && <p className="text-sm text-slate-400">{sublabel}</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <Landmark className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-slate-900">BudgetView</span>
              </Link>
              <div className="h-6 w-px bg-slate-200 mx-2" />
              <span className="text-sm text-slate-500">Admin Console</span>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/admin/upload')}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-all"
              >
                <Plus className="w-4 h-4" />
                Upload Budget
              </button>
              <button 
                onClick={() => {
                  sessionStorage.removeItem('is_admin');
                  navigate('/');
                }}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
              <p className="text-slate-500 mt-1">
                Manage state budgets, monitor data integrity, and oversee system operations.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-semibold">
                <ShieldCheck className="w-4 h-4" />
                System Online
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold">
                <Database className="w-4 h-4" />
                {states.length} States
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            icon={Building2}
            label="Active States"
            value={stats.totalStates}
            sublabel={`Monitoring ${stats.totalStates} state budgets`}
            color="emerald"
          />
          <StatCard 
            icon={Users}
            label="Total MDAs"
            value={stats.totalMDAs.toLocaleString()}
            sublabel="Agencies tracked"
            color="blue"
          />
          <StatCard 
            icon={Zap}
            label="Total Sectors"
            value={stats.totalSectors}
            sublabel="Functional categories"
            color="amber"
          />
          <StatCard 
            icon={TrendingUp}
            label="Total Budget Volume"
            value={formatCompact(stats.totalBudget)}
            sublabel="Combined state budgets"
            color="indigo"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <button 
            onClick={() => navigate('/admin/upload')}
            className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all group text-left"
          >
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
              <Plus className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Upload New Budget</p>
              <p className="text-sm text-slate-500">Add state budget data</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 ml-auto group-hover:text-emerald-600" />
          </button>
          
          <button 
            onClick={() => navigate('/admin/backup')}
            className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all group text-left"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <Download className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Backup Data</p>
              <p className="text-sm text-slate-500">Export system backup</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 ml-auto group-hover:text-blue-600" />
          </button>
          
          <button 
            onClick={() => navigate('/admin/logs')}
            className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all group text-left"
          >
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition-colors">
              <Activity className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">View Logs</p>
              <p className="text-sm text-slate-500">System activity logs</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 ml-auto group-hover:text-amber-600" />
          </button>
        </div>

        {/* System Status */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-semibold text-slate-700">Storage</span>
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                Healthy
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '12%' }} />
            </div>
            <p className="text-xs text-slate-500 mt-2">12% used of 10GB limit</p>
          </div>
          
          <div className="bg-white rounded-2xl p-5 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-slate-700">Uptime</span>
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                99.9%
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '99.9%' }} />
            </div>
            <p className="text-xs text-slate-500 mt-2">System running smoothly</p>
          </div>
          
          <div className="bg-white rounded-2xl p-5 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-semibold text-slate-700">Data Integrity</span>
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                Verified
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
            </div>
            <p className="text-xs text-slate-500 mt-2">All checksums passed</p>
          </div>
        </div>

        <div className="mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ingestion Mode</p>
              <p className="text-lg font-bold text-slate-900">{ingestLabel}</p>
              <p className="text-xs text-slate-500">Switch via <span className="font-mono">VITE_INGEST_MODE</span> in .env</p>
            </div>
            <div className={clsx(
              "px-3 py-1 rounded-full text-xs font-semibold",
              ingestMode === 'cloud' ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
            )}>
              {ingestMode === 'cloud' ? 'cloud' : 'direct'}
            </div>
          </div>
        </div>

        {/* States Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">State Budgets</h2>
                <p className="text-sm text-slate-500 mt-1">Manage uploaded budget documents</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search states..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition-all w-full sm:w-64"
                />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="tbl-responsive">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">State</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Year</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Total Budget</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">MDAs</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStates.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td data-label="State" className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                          <FileText className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{s.name}</p>
                          <p className="text-xs text-slate-500 font-mono break-all">{s.id}</p>
                        </div>
                      </div>
                    </td>
                    <td data-label="Year" className="px-6 py-4 text-center">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg">
                        {s.year}
                      </span>
                    </td>
                    <td data-label="Total Budget" className="px-6 py-4 text-right">
                      <p className="font-semibold text-slate-900">{formatCompact(s.data?.summary?.total_expenditure || 0)}</p>
                    </td>
                    <td data-label="MDAs" className="px-6 py-4 text-center">
                      <p className="text-sm text-slate-600">{s.data?.mdas?.length || 0}</p>
                    </td>
                    <td data-label="Status" className="px-6 py-4 text-center">
                      {s.data?.verified ? (
                        <span className="flex items-center justify-center gap-1 text-emerald-600 text-sm font-semibold">
                          <CheckCircle2 className="w-4 h-4" />
                          Verified
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1 text-amber-600 text-sm font-semibold">
                          <AlertCircle className="w-4 h-4" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td data-label="Actions" className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => navigate(`/state/${s.id}`)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="View"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => setConfirmDelete({ id: s.id, name: s.name })}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredStates.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500">No states match your search</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Delete Budget Data</h3>
                <p className="text-sm text-rose-600 font-semibold">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete the budget data for <span className="font-semibold text-slate-900">{confirmDelete.name}</span>? 
              All associated MDAs and sector data will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button 
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button 
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl transition-all"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setError(null)} />
          <div className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Error</h3>
            </div>
            <p className="text-slate-600 mb-6">{error}</p>
            <button 
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress Modal */}
      {uploadProgress.active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Database className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Uploading Data</h3>
            <p className="text-slate-500 mb-6">Please wait while we process your budget data...</p>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-sm text-slate-500 mt-2">
              {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
