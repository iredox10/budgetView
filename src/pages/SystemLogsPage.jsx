import { Card, Title, Text, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Badge } from '@tremor/react';
import { FileText, CheckCircle2, AlertCircle, Clock, Search } from 'lucide-react';

const logs = [
  { id: 1, type: 'SUCCESS', action: 'PDF Extraction', details: 'Kano State 2024 - 142 MDAs parsed', time: '20 mins ago' },
  { id: 2, type: 'INFO', action: 'Auth Login', details: 'Admin session initialized', time: '45 mins ago' },
  { id: 3, type: 'WARNING', action: 'Data Anomaly', details: 'Lagos State 2024 - 3 math discrepancies flagged', time: '2 hours ago' },
  { id: 4, type: 'SUCCESS', action: 'Backup Generated', details: 'Local system archive created', time: '5 hours ago' },
  { id: 5, type: 'SUCCESS', action: 'PDF Extraction', details: 'Kaduna State 2024 - 98 MDAs parsed', time: '1 day ago' },
];

export default function SystemLogsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <Title className="text-3xl font-black">System Logs</Title>
          <Text>Real-time extraction performance and audit trail.</Text>
        </div>
        <Badge color="blue" icon={Clock}>Live Feed</Badge>
      </div>

      <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden p-0">
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filter logs by action..." 
              className="bg-transparent text-sm font-medium outline-none w-64"
            />
          </div>
          <Text className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Showing 5 most recent events</Text>
        </div>
        
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell className="px-6 py-4">Status</TableHeaderCell>
              <TableHeaderCell>Action</TableHeaderCell>
              <TableHeaderCell>Details</TableHeaderCell>
              <TableHeaderCell className="text-right">Timestamp</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors">
                <TableCell className="px-6 py-4">
                  <Badge 
                    color={log.type === 'SUCCESS' ? 'emerald' : log.type === 'WARNING' ? 'rose' : 'blue'}
                    icon={log.type === 'SUCCESS' ? CheckCircle2 : log.type === 'WARNING' ? AlertCircle : FileText}
                    size="xs"
                  >
                    {log.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Text className="font-bold text-slate-900">{log.action}</Text>
                </TableCell>
                <TableCell>
                  <Text className="text-sm text-slate-500">{log.details}</Text>
                </TableCell>
                <TableCell className="text-right px-6 py-4">
                  <Text className="text-xs text-slate-400 font-mono italic">{log.time}</Text>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-8 border-none bg-blue-600 text-white">
          <Title className="text-white">Parsing Engine Stats</Title>
          <div className="mt-6 flex justify-between items-end">
            <div>
              <p className="text-[10px] uppercase font-bold text-blue-200">Average Speed</p>
              <p className="text-4xl font-black">1.4s</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-blue-200">Confidence Score</p>
              <p className="text-4xl font-black">98.2%</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-8 border-slate-200">
          <Title>Storage Usage</Title>
          <div className="mt-6 space-y-4">
            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>LOCAL STORAGE (5MB)</span>
              <span>12% USED</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 w-[12%] rounded-full"></div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
