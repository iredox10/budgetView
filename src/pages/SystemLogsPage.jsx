import { 
  FileText, CheckCircle2, AlertCircle, Clock, Search, 
  Terminal, Filter, RefreshCcw, Shield, ChevronLeft,
  AlertTriangle, Info, Download
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { databases, Query, DB_ID, COLLECTIONS } from '../utils/appwrite';

function timeAgo(iso) {
  if (!iso) return '—';
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)} min${secs >= 120 ? 's' : ''} ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} hour${secs >= 7200 ? 's' : ''} ago`;
  if (secs < 604800) return `${Math.floor(secs / 86400)} day${secs >= 172800 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString();
}

export default function SystemLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await databases.listDocuments(DB_ID, COLLECTIONS.AUDIT_LOGS, [
        Query.orderDesc('$createdAt'),
        Query.limit(100)
      ]);
      setLogs(res.documents);
    } catch (e) {
      setError(e.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const details = (log.details || '') + ' ' + (log.state_name || '') + ' ' + (log.action || '');
      const matchesSearch = details.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'ALL' || log.status === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [logs, searchTerm, filterType]);

  const exportCsv = () => {
    const header = ['Status', 'Action', 'Details', 'State', 'Year', 'Total Expenditure', 'MDAs', 'Sectors', 'User', 'Time'];
    const rows = filteredLogs.map(log => [
      log.status, log.action, `"${(log.details || '').replace(/"/g, '""')}"`,
      log.state_name || '', log.year || '', log.total_expenditure || '',
      log.mdas_count ?? '', log.sectors_count ?? '', log.user || 'System',
      new Date(log.$createdAt).toISOString()
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'budgetview-audit-log.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'ERROR': return <AlertCircle className="w-4 h-4 text-rose-600" />;
      case 'WARNING': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      default: return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'SUCCESS': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ERROR': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'WARNING': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link 
          to="/admin"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
              <Terminal className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">System Logs</h1>
              <p className="text-slate-500">Audit trail of ingestion and admin events</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search logs..." 
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {['ALL', 'SUCCESS', 'INFO', 'WARNING', 'ERROR'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={clsx(
                    "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                    filterType === type 
                      ? "bg-slate-900 text-white" 
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-all disabled:opacity-50"
            >
              <RefreshCcw className={clsx("w-4 h-4", loading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {error && (
            <div className="p-4 bg-rose-50 border-b border-rose-200 text-sm text-rose-700">
              Failed to load logs: {error}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="tbl-responsive">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Action</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Details</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">User</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">Loading audit trail...</td>
                  </tr>
                ) : filteredLogs.map((log) => (
                  <tr key={log.$id} className="hover:bg-slate-50/50 transition-colors">
                    <td data-label="Status" className="px-6 py-4">
                      <span className={clsx(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border",
                        getLogColor(log.status)
                      )}>
                        {getLogIcon(log.status)}
                        {log.status}
                      </span>
                    </td>
                    <td data-label="Action" className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{log.action}</p>
                    </td>
                    <td data-label="Details" className="px-6 py-4">
                      <p className="text-sm text-slate-600 break-words">{log.details}</p>
                    </td>
                    <td data-label="User" className="px-6 py-4">
                      <span className="text-sm text-slate-500">{log.user || 'System'}</span>
                    </td>
                    <td data-label="Time" className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-sm text-slate-500">
                        <Clock className="w-4 h-4" />
                        {timeAgo(log.$createdAt)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {!loading && filteredLogs.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500">{logs.length === 0 ? 'No audit events recorded yet' : 'No logs match your search criteria'}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {filteredLogs.length} of {logs.length} log entries
          </p>
          <button
            onClick={exportCsv}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all text-sm font-medium disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export Logs (CSV)
          </button>
        </div>
      </div>
    </div>
  );
}