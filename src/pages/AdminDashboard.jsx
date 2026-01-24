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
  Metric,
  ProgressBar
} from '@tremor/react';
import { Trash2, ShieldCheck, Database, FileText, Settings, AlertTriangle, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, Fragment } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';

export default function AdminDashboard() {
  const { states, deleteState, uploadProgress } = useBudget();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const totalMDAs = states.reduce((acc, s) => acc + s.data.mdas.length, 0);
  const totalBudgetVolume = states.reduce((acc, s) => acc + s.data.summary.total_expenditure, 0);

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

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const isModalOpen = uploadProgress.active || !!error || !!confirmDelete;

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
                          onClick={() => setConfirmDelete({ id: s.id, name: s.name })}
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

      {/* Status & Error Modals */}
      <Transition show={isModalOpen} as={Fragment}>
        <Dialog 
          open={isModalOpen} 
          onClose={() => !uploadProgress.active && !confirmDelete && setError(null)} 
          className="relative z-[300]"
        >
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
          </TransitionChild>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <DialogPanel className="relative transform overflow-hidden rounded-3xl bg-white p-8 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-slate-100">
                  {confirmDelete ? (
                    <>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                          <Trash2 className="w-6 h-6" />
                        </div>
                        <DialogTitle as="h3" className="text-xl font-black text-slate-900">
                          Confirm Data Purge
                        </DialogTitle>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl mb-8 border border-slate-100">
                        <Text className="text-slate-600 font-medium leading-relaxed text-sm">
                          Are you sure you want to permanently delete the <span className="font-bold text-slate-900">{confirmDelete.name}</span> budget? This action will remove all associated MDA and sector records from the cloud.
                        </Text>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Button 
                          className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl border-none"
                          onClick={() => setConfirmDelete(null)}
                        >
                          CANCEL
                        </Button>
                        <Button 
                          className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl border-none shadow-lg shadow-rose-200"
                          onClick={handleDelete}
                        >
                          PURGE DATA
                        </Button>
                      </div>
                    </>
                  ) : uploadProgress.active ? (
                    <div className="flex flex-col items-center justify-center py-6">
                      <div className="relative mb-6">
                        <div className="w-20 h-20 border-4 border-blue-50 rounded-full animate-spin border-t-blue-600"></div>
                        <Database className="w-8 h-8 text-blue-600 absolute inset-0 m-auto" />
                      </div>
                      <DialogTitle as="h3" className="text-xl font-black text-slate-900 text-center">
                        Synchronizing Cloud Data
                      </DialogTitle>
                      <Text className="text-center mt-2 text-slate-500">
                        Processing high-integrity operations... {Math.round((uploadProgress.current / uploadProgress.total) * 100)}% complete.
                      </Text>
                      <div className="w-full mt-6 px-4">
                        <ProgressBar value={(uploadProgress.current / uploadProgress.total) * 100} color="blue" />
                      </div>
                    </div>
                  ) : error ? (
                    <>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                          <AlertCircle className="w-6 h-6" />
                        </div>
                        <DialogTitle as="h3" className="text-xl font-black text-slate-900">
                          Operation Failed
                        </DialogTitle>
                      </div>
                      <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl mb-8">
                        <Text className="text-rose-700 font-bold leading-relaxed text-sm">
                          {error}
                        </Text>
                      </div>
                      <Button 
                        className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl border-none shadow-lg shadow-slate-200"
                        onClick={() => setError(null)}
                      >
                        DISMISS
                      </Button>
                    </>
                  ) : null}
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
