import { useBudget } from '../data/BudgetContext';
import { 
  Card, 
  Title, 
  Text, 
  Table, 
  TableHead, 
  TableRow, 
  TableHeaderCell, 
  TableBody, 
  TableCell, 
  Badge, 
  Button,
  Flex,
  Grid,
  Metric
} from '@tremor/react';
import { Trash2, ShieldCheck, Database, FileText, Settings, AlertTriangle, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const { states, deleteState } = useBudget();
  const navigate = useNavigate();

  const totalMDAs = states.reduce((acc, s) => acc + s.data.mdas.length, 0);
  const totalBudgetVolume = states.reduce((acc, s) => acc + s.data.summary.total_expenditure, 0);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 p-8 rounded-3xl text-white shadow-xl shadow-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">System Administrator</span>
          </div>
          <Title className="text-white text-3xl font-black">Data Management Console</Title>
          <Text className="text-slate-400 mt-1">Audit and control all state budget data sources.</Text>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="secondary" 
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            onClick={() => navigate('/upload')}
          >
            Add New Data
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <Grid numItemsSm={1} numItemsMd={3} className="gap-6">
        <Card decoration="top" decorationColor="blue">
          <Text className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Active States</Text>
          <Metric className="font-black text-slate-900">{states.length}</Metric>
        </Card>
        <Card decoration="top" decorationColor="emerald">
          <Text className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Total Entities Tracked</Text>
          <Metric className="font-black text-slate-900">{totalMDAs}</Metric>
        </Card>
        <Card decoration="top" decorationColor="amber">
          <Text className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Cumulative Volume</Text>
          <Metric className="font-black text-slate-900 text-xl md:text-2xl mt-2">{formatCurrency(totalBudgetVolume)}</Metric>
        </Card>
      </Grid>

      {/* States Management Table */}
      <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden p-0">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <Title className="font-bold text-slate-900">Registered Budget Documents</Title>
            <Text className="text-xs mt-1">Manage local storage persistence and data integrity.</Text>
          </div>
          <Badge color="blue" icon={Settings}>System Storage</Badge>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest">State Identifier</TableHeaderCell>
                <TableHeaderCell className="font-bold text-slate-500 text-[10px] uppercase tracking-widest">Year</TableHeaderCell>
                <TableHeaderCell className="font-bold text-slate-500 text-[10px] uppercase tracking-widest">MDA Count</TableHeaderCell>
                <TableHeaderCell className="text-right font-bold text-slate-500 text-[10px] uppercase tracking-widest">Data Size</TableHeaderCell>
                <TableHeaderCell className="text-right font-bold text-slate-500 text-[10px] uppercase tracking-widest">Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {states.map((s) => (
                <TableRow key={s.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{s.name}</span>
                          {s.data.verified && <CheckCircle2 className="w-3 h-3 text-emerald-500" title="Verified Integrity" />}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">ID: {s.id}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge color="slate" size="xs" className="font-bold">{s.year}</Badge>
                  </TableCell>
                  <TableCell>
                    <Text className="font-medium text-slate-600">{s.data.mdas.length} Agencies</Text>
                  </TableCell>
                  <TableCell className="text-right">
                    <Text className="font-mono text-[10px] text-slate-400">
                      {(JSON.stringify(s.data).length / 1024).toFixed(1)} KB
                    </Text>
                  </TableCell>
                  <TableCell className="text-right px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => navigate(`/state/${s.id}`)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="View Dashboard"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      {s.id !== 'kano' ? (
                        <button 
                          onClick={() => {
                            if(window.confirm(`Are you sure you want to delete the ${s.name} budget?`)) {
                              deleteState(s.id);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete Data"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="p-2 text-slate-200 cursor-not-allowed" title="System Default (Protected)">
                          <Trash2 className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Safety Warning */}
      <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <Title className="text-amber-900 text-lg font-bold">Data Privacy & Storage</Title>
          <Text className="text-amber-700">
            All data is currently stored locally in your browser's persistent memory. 
            Clearing your browser cache or switching devices will remove these states. 
            Ensure you have the original PDFs backed up.
          </Text>
        </div>
        <Button 
          variant="secondary" 
          color="amber" 
          className="whitespace-nowrap"
          onClick={() => navigate('/upload')}
        >
          Backup Data
        </Button>
      </div>
    </div>
  );
}
