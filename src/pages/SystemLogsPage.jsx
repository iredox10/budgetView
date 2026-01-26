import { Card, Title, Text, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Badge, Flex, Grid, ProgressBar } from '@tremor/react';
import { FileText, CheckCircle2, AlertCircle, Clock, Search, Terminal, Filter, RefreshCcw, Wifi, Shield } from 'lucide-react';
import { useState, useMemo } from 'react';
import clsx from 'clsx';

const initialLogs = [
  { id: 1, type: 'SUCCESS', action: 'Cloud Sync', details: 'Kano State 2024 - 579 documents successfully committed to Appwrite.', time: '5 mins ago', user: 'Admin' },
  { id: 2, type: 'INFO', action: 'Auth Event', details: 'New secure console session initialized from IP 192.168.1.1.', time: '12 mins ago', user: 'System' },
  { id: 3, type: 'WARNING', action: 'Audit Alert', details: 'Math discrepancy of ₦1.2B flagged in Lagos Budget (Official Source Error).', time: '1 hour ago', user: 'Admin' },
  { id: 4, type: 'SUCCESS', action: 'PDF Analysis', details: 'High-accuracy anchor strategy applied to Bauchi_Final_Estimates.pdf.', time: '3 hours ago', user: 'System' },
  { id: 5, type: 'ERROR', action: 'Network Timeout', details: 'Cloud execution failed for Ogun State (Retry triggered automatically).', time: '5 hours ago', user: 'System' },
  { id: 6, type: 'SUCCESS', action: 'Backup', details: 'Full system archive (3.2MB) generated and downloaded.', time: '1 day ago', user: 'Admin' },
  { id: 7, type: 'INFO', action: 'Schema Update', details: 'Appwrite collection indexes recalculated for optimized searching.', time: '2 days ago', user: 'Root' },
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 rounded-2xl shadow-xl shadow-slate-200">
            <Terminal className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <Title className="text-3xl font-black text-slate-900 tracking-tight">System Events</Title>
            <Text className="text-slate-500">Live operational audit trail and extraction performance.</Text>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100">
          <Wifi className="w-3 h-3 text-emerald-600 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Realtime Feed Active</span>
        </div>
      </div>

      {/* Control Panel */}
      <Grid numItemsSm={1} numItemsLg={3} className="gap-8">
        <Card className="lg:col-span-2 rounded-3xl">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search logs by keyword..." 
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {['ALL', 'SUCCESS', 'WARNING', 'ERROR'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={clsx(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    filterType === type 
                      ? "bg-slate-900 text-white shadow-lg" 
                      : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-50">
            <Table>
              <TableHead className="bg-slate-50/50">
                <TableRow>
                  <TableHeaderCell className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</TableHeaderCell>
                  <TableHeaderCell className="text-[10px] font-black uppercase tracking-widest text-slate-500">Operation</TableHeaderCell>
                  <TableHeaderCell className="text-[10px] font-black uppercase tracking-widest text-slate-500">Details</TableHeaderCell>
                  <TableHeaderCell className="text-right px-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Age</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-blue-50/20 transition-colors border-b border-slate-50 last:border-none">
                    <TableCell className="px-6 py-4">
                      <Badge 
                        color={log.type === 'SUCCESS' ? 'emerald' : log.type === 'ERROR' ? 'rose' : log.type === 'WARNING' ? 'amber' : 'blue'}
                        size="xs"
                        className="font-black"
                      >
                        {log.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Text className="font-bold text-slate-900">{log.action}</Text>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">BY {log.user}</p>
                    </TableCell>
                    <TableCell>
                      <Text className="text-xs text-slate-600 leading-relaxed max-w-md">{log.details}</Text>
                    </TableCell>
                    <TableCell className="text-right px-6 py-4">
                      <div className="flex flex-col items-end">
                        <Text className="text-[10px] font-bold text-slate-400">{log.time}</Text>
                        <Clock className="w-3 h-3 text-slate-200 mt-1" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <div className="space-y-8">
          {/* Security Pulse */}
          <Card className="rounded-[2.5rem] p-8 border-none bg-slate-900 text-white shadow-2xl">
            <Flex className="mb-6">
              <div className="p-2 bg-blue-600 rounded-xl">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <Badge color="blue">Secure</Badge>
            </Flex>
            <Title className="text-white font-black mb-2">Firewall Status</Title>
            <Text className="text-slate-400 text-xs mb-6">Traffic filtered by Appwrite Security Layer.</Text>
            <div className="space-y-4">
              <div>
                <Flex className="mb-1 text-[10px] font-black text-slate-500">
                  <span>SSL HANDSHAKE</span>
                  <span className="text-blue-400">ENCRYPTED</span>
                </Flex>
                <ProgressBar value={100} color="blue" className="h-1" />
              </div>
              <div>
                <Flex className="mb-1 text-[10px] font-black text-slate-500">
                  <span>API LATENCY</span>
                  <span className="text-emerald-400">142ms</span>
                </Flex>
                <ProgressBar value={85} color="emerald" className="h-1" />
              </div>
            </div>
          </Card>

          {/* Engine Metrics */}
          <Card className="rounded-[2.5rem] p-8">
            <Title className="font-black mb-6">Extraction Metrics</Title>
            <div className="grid grid-cols-2 gap-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Success Rate</p>
                <p className="text-2xl font-black text-slate-900">99.4%</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">OCR Drift</p>
                <p className="text-2xl font-black text-rose-500">&lt; 0.1%</p>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100">
              <button className="w-full py-3 bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center justify-center gap-2">
                <RefreshCcw className="w-3 h-3" />
                RECALIBRATE ENGINE
              </button>
            </div>
          </Card>
        </div>
      </Grid>
    </div>
  );
}
