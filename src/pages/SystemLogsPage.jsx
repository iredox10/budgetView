import { 
  FileText, CheckCircle2, AlertCircle, Clock, Search, 
  Terminal, Filter, RefreshCcw, Shield, ChevronLeft,
  AlertTriangle, Info, Download
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

const initialLogs = [
  { id: 1, type: 'SUCCESS', action: 'Data Sync', details: 'Kano State 2024 budget data synchronized successfully', time: '5 mins ago', user: 'System' },
  { id: 2, type: 'INFO', action: 'User Login', details: 'Admin console accessed from IP 192.168.1.1', time: '12 mins ago', user: 'Admin' },
  { id: 3, type: 'WARNING', action: 'Data Validation', details: 'Minor discrepancy detected in Lagos budget calculations', time: '1 hour ago', user: 'System' },
  { id: 4, type: 'SUCCESS', action: 'PDF Upload', details: 'Bauchi State budget PDF processed and indexed', time: '3 hours ago', user: 'System' },
  { id: 5, type: 'ERROR', action: 'Network Error', details: 'Connection timeout during Ogun State data upload', time: '5 hours ago', user: 'System' },
  { id: 6, type: 'SUCCESS', action: 'Backup Complete', details: 'Full system backup (3.2MB) generated successfully', time: '1 day ago', user: 'Admin' },
  { id: 7, type: 'INFO', action: 'Database Update', details: 'Search indexes rebuilt for optimized queries', time: '2 days ago', user: 'System' },
];

export default function SystemLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const filteredLogs = useMemo(() => {
    return initialLogs.filter(log => {
      const matchesSearch = log.details.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           log.action.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'ALL' || log.type === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [searchTerm, filterType]);

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
              <p className="text-slate-500">Monitor system events and audit trail</p>
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
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
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
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border",
                        getLogColor(log.type)
                      )}>
                        {getLogIcon(log.type)}
                        {log.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{log.action}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">{log.details}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-500">{log.user}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-sm text-slate-500">
                        <Clock className="w-4 h-4" />
                        {log.time}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredLogs.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500">No logs match your search criteria</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {filteredLogs.length} of {initialLogs.length} log entries
          </p>
          <button className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all text-sm font-medium">
            <Download className="w-4 h-4" />
            Export Logs
          </button>
        </div>
      </div>
    </div>
  );
}
