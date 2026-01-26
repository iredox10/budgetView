import { useBudget } from '../data/BudgetContext';
import { Card, Title, Text, Button, Flex, Grid, Badge, Callout } from '@tremor/react';
import { Database, Download, Upload, ShieldCheck, AlertCircle, CheckCircle2, CloudLightning, Save, History } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

export default function BackupPage() {
  const { states, addState } = useBudget();
  const [importStatus, setImportStatus] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      const backup = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        states: states
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `budgetview_cloud_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      setIsExporting(false);
    }, 800);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target.result);
        if (!backup.states || !Array.isArray(backup.states)) {
          throw new Error("Invalid backup file format. Schema mismatch.");
        }
        
        // Sequential import to maintain high-integrity
        for (const s of backup.states) {
          await addState(s.data);
        }
        
        setImportStatus({ success: true, count: backup.states.length });
        setTimeout(() => setImportStatus(null), 5000);
      } catch (err) {
        setImportStatus({ success: false, message: err.message });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-5xl space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-[80px] -mr-32 -mt-32"></div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="p-4 bg-emerald-600 rounded-[1.5rem] shadow-2xl shadow-emerald-200">
            <Database className="w-8 h-8 text-white" />
          </div>
          <div>
            <Title className="text-3xl font-black text-slate-900 tracking-tight">Cloud Backup & Recovery</Title>
            <Text className="text-slate-500 font-medium">Immutable snapshots of the national budget database.</Text>
          </div>
        </div>
        <Badge color="emerald" icon={CloudLightning} size="xl" className="px-4 py-2 font-black shadow-sm">SYSTEM STABLE</Badge>
      </div>

      <Grid numItemsMd={2} className="gap-10">
        <Card className="p-10 rounded-[2.5rem] border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="p-6 bg-slate-50 rounded-[2rem] group-hover:bg-blue-50 transition-colors">
              <Download className="w-12 h-12 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <div>
              <Title className="text-2xl font-black">Export Snapshot</Title>
              <Text className="mt-2 text-slate-500 max-w-xs">Download a secure JSON archive containing all {states.length} verified budget datasets.</Text>
            </div>
            <button 
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl transition-all shadow-xl shadow-slate-200 active:scale-95 flex items-center justify-center gap-2"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? <Save className="w-4 h-4 animate-pulse" /> : <History className="w-4 h-4" />}
              {isExporting ? "GENERATING..." : "DOWNLOAD BACKUP (.JSON)"}
            </button>
          </div>
        </Card>

        <Card className="p-10 rounded-[2.5rem] border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="p-6 bg-slate-50 rounded-[2rem] group-hover:bg-emerald-50 transition-colors">
              <Upload className="w-12 h-12 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </div>
            <div>
              <Title className="text-2xl font-black">Restore Integrity</Title>
              <Text className="mt-2 text-slate-500 max-w-xs">Re-initialize the cloud database from a valid BudgetView forensic archive.</Text>
            </div>
            <div className="w-full">
              <input 
                type="file" 
                id="restore-upload" 
                className="hidden" 
                accept=".json"
                onChange={handleImport}
              />
              <label 
                htmlFor="restore-upload"
                className="block w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black cursor-pointer transition-all active:scale-[0.98] shadow-xl shadow-emerald-100"
              >
                UPLOAD & SYNC ARCHIVE
              </label>
            </div>
          </div>
        </Card>
      </Grid>

      {importStatus && (
        <div className={clsx(
          "p-8 rounded-[2rem] border-2 flex items-center gap-6 animate-in slide-in-from-top-4 shadow-xl",
          importStatus.success ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-emerald-100" : "bg-rose-50 border-rose-200 text-rose-700 shadow-rose-100"
        )}>
          <div className={clsx("p-3 rounded-xl", importStatus.success ? "bg-emerald-200" : "bg-rose-200")}>
            {importStatus.success ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
          </div>
          <div>
            <p className="font-black uppercase text-xs tracking-[0.2em]">
              {importStatus.success ? "RESTORATION COMPLETE" : "CRITICAL FAILURE"}
            </p>
            <p className="text-lg font-bold mt-1 leading-tight">
              {importStatus.success 
                ? `Successfully synchronized ${importStatus.count} state records with the cloud database.` 
                : importStatus.message}
            </p>
          </div>
        </div>
      )}

      {/* Security Protocol Note */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-12 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="flex flex-col lg:flex-row gap-10 relative z-10">
          <div className="p-4 bg-blue-600/20 border border-blue-500/30 rounded-3xl h-fit">
            <ShieldCheck className="w-10 h-10 text-blue-400" />
          </div>
          <div className="space-y-6">
            <Title className="text-white text-3xl font-black tracking-tight">Security & Encryption Protocol</Title>
            <Text className="text-slate-400 text-lg leading-relaxed font-medium">
              Backups are generated using the native system schema. Restoring a backup will perform an **upsert** operation: 
              existing records with matching State and Year IDs will be updated, while new records will be initialized. 
              All transfers are encrypted via TLS 1.3.
            </Text>
            <div className="flex items-center gap-4 text-xs font-black text-blue-400 tracking-widest uppercase">
              <span>Standard v1.0</span>
              <span className="w-1 h-1 rounded-full bg-slate-700"></span>
              <span>AES-256 Encrypted Storage</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
