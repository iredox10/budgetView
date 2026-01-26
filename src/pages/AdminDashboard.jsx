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
  ProgressBar,
  DonutChart,
  AreaChart,
  Tracker
} from '@tremor/react';
import { 
  Trash2, ShieldCheck, Database, FileText, Settings, 
  AlertTriangle, ExternalLink, CheckCircle2, AlertCircle, 
  Clock, Activity, HardDrive, Cpu, Zap, Landmark, Scale
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, Fragment, useMemo } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function AdminDashboard() {
  const { states, deleteState, uploadProgress } = useBudget();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const totalMDAs = states.reduce((acc, s) => acc + s.data.mdas.length, 0);
  const totalBudgetVolume = states.reduce((acc, s) => acc + s.data.summary.total_expenditure, 0);

  const stateDistribution = useMemo(() => {
    return states.map(s => ({
      name: s.name,
      amount: s.data.summary.total_expenditure
    }));
  }, [states]);

  // Simulated activity feed
  const recentActivities = useMemo(() => {
    return states.map((s, index) => ({
      id: s.id,
      action: 'Budget Finalized',
      user: 'Root Administrator',
      target: `${s.name} ${s.year}`,
      time: `${index + 1} day${index === 0 ? '' : 's'} ago`,
      status: 'SUCCESS'
    })).slice(0, 5);
  }, [states]);

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
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/50">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Security Level: Alpha</span>
          </div>
          <Title className="text-white text-4xl font-black tracking-tight">System Control Panel</Title>
          <p className="text-slate-400 mt-2 font-medium">Core administrative interface for national budget forensic oversight.</p>
        </div>
        <div className="flex flex-wrap gap-4 relative z-10">
          <button 
            onClick={() => navigate('/admin/upload')}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-900/40 active:scale-95 flex items-center gap-2"
          >
            <Zap className="w-4 h-4 fill-white" />
            IMPORT DATA
          </button>
          <button 
            onClick={() => navigate('/admin/backup')}
            className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black rounded-2xl transition-all active:scale-95"
          >
            DB BACKUP
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <Grid numItemsSm={1} numItemsMd={2} numItemsLg={4} className="gap-6">
        <Card decoration="top" decorationColor="blue" className="rounded-3xl border-none shadow-sm shadow-slate-200">
          <Flex className="items-start">
            <div>
              <Text className="font-bold text-slate-400 uppercase text-[10px] tracking-widest mb-1">Active States</Text>
              <Metric className="font-black text-slate-900">{states.length}</Metric>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Landmark className="w-5 h-5" />
            </div>
          </Flex>
          <div className="mt-4 flex items-center gap-2">
            <Badge color="emerald" size="xs">Live Sync</Badge>
            <Text className="text-[10px] font-medium text-slate-400">Connected to Cloud</Text>
          </div>
        </Card>

        <Card decoration="top" decorationColor="emerald" className="rounded-3xl border-none shadow-sm shadow-slate-200">
          <Flex className="items-start">
            <div>
              <Text className="font-bold text-slate-400 uppercase text-[10px] tracking-widest mb-1">MDAs Monitored</Text>
              <Metric className="font-black text-slate-900">{totalMDAs}</Metric>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
          </Flex>
          <div className="mt-4 flex items-center gap-2">
            <Badge color="blue" size="xs">Verified</Badge>
            <Text className="text-[10px] font-medium text-slate-400">Source evidence linked</Text>
          </div>
        </Card>

        <Card decoration="top" decorationColor="amber" className="lg:col-span-2 rounded-3xl border-none shadow-sm shadow-slate-200">
          <Flex className="items-start">
            <div>
              <Text className="font-bold text-slate-400 uppercase text-[10px] tracking-widest mb-1">Total Fiscal Volume</Text>
              <Metric className="font-black text-slate-900">{formatCurrency(totalBudgetVolume)}</Metric>
            </div>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
          </Flex>
          <div className="mt-4">
            <ProgressBar value={100} color="amber" className="h-1.5" />
            <Text className="text-[10px] font-medium text-slate-400 mt-2">Aggregate of all approved estimates in system storage.</Text>
          </div>
        </Card>
      </Grid>

      <Grid numItemsSm={1} numItemsLg={3} className="gap-8">
        {/* State Distribution */}
        <Card className="lg:col-span-1 rounded-[2rem] border-slate-200 shadow-sm">
          <Flex className="mb-8">
            <div>
              <Title className="font-black text-slate-900">Resource Split</Title>
              <Text className="text-xs">Volume distribution by state.</Text>
            </div>
            <Badge color="blue" icon={Scale} size="xs">Weight</Badge>
          </Flex>
          <div className="h-72">
            <DonutChart
              data={stateDistribution}
              category="amount"
              index="name"
              valueFormatter={formatCurrency}
              colors={["blue", "indigo", "violet", "emerald", "amber", "rose"]}
              className="mt-6"
            />
          </div>
        </Card>

        {/* Recent System Activity */}
        <Card className="lg:col-span-2 rounded-[2rem] border-slate-200 shadow-sm overflow-hidden p-0">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <Title className="font-black text-slate-900">Audit Trail</Title>
              <Text className="text-xs">Recent security and data events.</Text>
            </div>
            <button 
              onClick={() => navigate('/admin/logs')}
              className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest"
            >
              View Full Logs
            </button>
          </div>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell className="px-8 text-[10px] font-black uppercase text-slate-500">Event</TableHeaderCell>
                <TableHeaderCell className="text-[10px] font-black uppercase text-slate-500">Target</TableHeaderCell>
                <TableHeaderCell className="text-[10px] font-black uppercase text-slate-500">Status</TableHeaderCell>
                <TableHeaderCell className="text-right px-8 text-[10px] font-black uppercase text-slate-500">Time</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentActivities.map((act) => (
                <TableRow key={act.id} className="border-b border-slate-50 last:border-none">
                  <TableCell className="px-8">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-bold text-slate-900">{act.action}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Text className="text-xs font-medium text-slate-500">{act.target}</Text>
                  </TableCell>
                  <TableCell>
                    <Badge color="emerald" size="xs">{act.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right px-8">
                    <Text className="text-[10px] font-mono text-slate-400">{act.time}</Text>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </Grid>

      {/* System Health Monitor */}
      <Grid numItemsSm={1} numItemsMd={3} className="gap-6">
        <Card className="rounded-3xl p-6 bg-slate-50 border-slate-200">
          <Flex className="mb-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              <Text className="font-black text-slate-900 text-xs uppercase tracking-widest">Parser Engine</Text>
            </div>
            <Badge color="emerald" size="xs">OPTIMAL</Badge>
          </Flex>
          <Tracker data={[{ color: 'emerald' }, { color: 'emerald' }, { color: 'emerald' }, { color: 'emerald' }]} className="h-1.5" />
        </Card>
        <Card className="rounded-3xl p-6 bg-slate-50 border-slate-200">
          <Flex className="mb-4">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <Text className="font-black text-slate-900 text-xs uppercase tracking-widest">Cloud Storage</Text>
            </div>
            <Badge color="emerald" size="xs">98% FREE</Badge>
          </Flex>
          <Tracker data={[{ color: 'emerald' }, { color: 'emerald' }, { color: 'emerald' }, { color: 'emerald' }]} className="h-1.5" />
        </Card>
        <Card className="rounded-3xl p-6 bg-slate-50 border-slate-200">
          <Flex className="mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <Text className="font-black text-slate-900 text-xs uppercase tracking-widest">Uptime</Text>
            </div>
            <Badge color="emerald" size="xs">99.9%</Badge>
          </Flex>
          <Tracker data={[{ color: 'emerald' }, { color: 'emerald' }, { color: 'emerald' }, { color: 'emerald' }]} className="h-1.5" />
        </Card>
      </Grid>

      {/* Registered Budget Documents Table */}
      <Card className="rounded-[2.5rem] border-slate-200 shadow-sm overflow-hidden p-0 mt-8">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
          <div>
            <Title className="font-black text-slate-900">Document Registry</Title>
            <Text className="text-xs mt-1">Full inventory of high-integrity budget data.</Text>
          </div>
          <Badge color="blue" icon={FileText} className="font-bold">Cloud Source</Badge>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHead className="bg-slate-50/50">
              <TableRow>
                <TableHeaderCell className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Document Name</TableHeaderCell>
                <TableHeaderCell className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Fiscal Year</TableHeaderCell>
                <TableHeaderCell className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Integrity</TableHeaderCell>
                <TableHeaderCell className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Data Size</TableHeaderCell>
                <TableHeaderCell className="text-right px-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Control</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {states.map((s) => (
                <TableRow key={s.id} className="hover:bg-blue-50/20 transition-all border-b border-slate-50 last:border-none">
                  <TableCell className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-base">{s.name} Budget</span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">REF: {s.id}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge color="blue" size="sm" className="font-black">{s.year}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      {s.data.verified ? (
                        <div className="flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase">Forensic Pass</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-500">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase">Pending Audit</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Text className="font-mono text-xs font-bold text-slate-500">
                      {(JSON.stringify(s.data).length / 1024).toFixed(1)} KB
                    </Text>
                  </TableCell>
                  <TableCell className="text-right px-8">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => navigate(`/state/${s.id}`)}
                        className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Open Monitor"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setConfirmDelete({ id: s.id, name: s.name })}
                        className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="Wipe Data"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Safety & Encryption Note */}
      <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-white rounded-[1.5rem] shadow-xl shadow-slate-200">
            <Settings className="w-8 h-8 text-slate-400 animate-spin-slow" />
          </div>
          <div>
            <Title className="text-slate-900 font-black">System Preferences</Title>
            <Text className="text-slate-500 max-w-lg">Manage administrative keys, audit trail persistence, and cloud synchronization settings.</Text>
          </div>
        </div>
        <button className="px-8 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-300 active:scale-95">
          GO TO SETTINGS
        </button>
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
                <DialogPanel className="relative transform overflow-hidden rounded-[2.5rem] bg-white p-10 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-slate-100">
                  {confirmDelete ? (
                    <>
                      <div className="flex items-center gap-4 mb-8">
                        <div className="p-4 bg-rose-100 text-rose-600 rounded-[1.5rem]">
                          <Trash2 className="w-8 h-8" />
                        </div>
                        <div>
                          <DialogTitle as="h3" className="text-2xl font-black text-slate-900">
                            Forensic Purge
                          </DialogTitle>
                          <Text className="text-[10px] font-bold uppercase text-rose-500 tracking-widest">Irreversible Action</Text>
                        </div>
                      </div>
                      <div className="p-6 bg-rose-50 rounded-3xl mb-8 border border-rose-100 shadow-inner">
                        <Text className="text-rose-700 font-bold leading-relaxed">
                          Confirm permanent removal of <span className="font-black underline">{confirmDelete.name}</span> dataset. 
                          All cloud records will be scrubbed.
                        </Text>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all"
                          onClick={() => setConfirmDelete(null)}
                        >
                          CANCEL
                        </button>
                        <button 
                          className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-rose-200 active:scale-95"
                          onClick={handleDelete}
                        >
                          PURGE DATA
                        </button>
                      </div>
                    </>
                  ) : uploadProgress.active ? (
                    <div className="flex flex-col items-center justify-center py-6">
                      <div className="relative mb-8">
                        <div className="w-24 h-24 border-[6px] border-blue-50 rounded-full animate-spin border-t-blue-600"></div>
                        <Database className="w-10 h-10 text-blue-600 absolute inset-0 m-auto" />
                      </div>
                      <DialogTitle as="h3" className="text-2xl font-black text-slate-900 text-center">
                        Syncing Evidence
                      </DialogTitle>
                      <Text className="text-center mt-2 text-slate-500 font-medium">
                        Writing high-integrity data blocks... {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                      </Text>
                      <div className="w-full mt-8 px-4">
                        <ProgressBar value={(uploadProgress.current / uploadProgress.total) * 100} color="blue" className="h-2" />
                      </div>
                    </div>
                  ) : error ? (
                    <>
                      <div className="flex items-center gap-4 mb-8">
                        <div className="p-4 bg-rose-100 text-rose-600 rounded-[1.5rem]">
                          <AlertCircle className="w-8 h-8" />
                        </div>
                        <DialogTitle as="h3" className="text-2xl font-black text-slate-900">
                          Critical Error
                        </DialogTitle>
                      </div>
                      <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl mb-8">
                        <Text className="text-rose-700 font-bold leading-relaxed">
                          {error}
                        </Text>
                      </div>
                      <button 
                        className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl shadow-xl shadow-slate-200"
                        onClick={() => setError(null)}
                      >
                        DISMISS
                      </button>
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
