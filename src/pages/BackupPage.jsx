import { useBudget } from '../data/BudgetContext';
import { Card, Title, Text, Button, Flex, Grid, Badge } from '@tremor/react';
import { Database, Download, Upload, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export default function BackupPage() {
  const { states, addState } = useBudget();
  const [importStatus, setImportStatus] = useState(null);

  const handleExport = () => {
    const backup = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      states: states
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `budgetview_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target.result);
        if (!backup.states || !Array.isArray(backup.states)) {
          throw new Error("Invalid backup file format.");
        }
        
        backup.states.forEach(s => {
          addState(s.data);
        });
        
        setImportStatus({ success: true, count: backup.states.length });
        setTimeout(() => setImportStatus(null), 5000);
      } catch (err) {
        setImportStatus({ success: false, message: err.message });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="p-3 bg-blue-600 rounded-2xl">
          <Database className="w-6 h-6 text-white" />
        </div>
        <div>
          <Title className="text-2xl font-black">System Backup & Recovery</Title>
          <Text>Export or restore the entire system database.</Text>
        </div>
      </div>

      <Grid numItemsMd={2} className="gap-8">
        <Card className="p-8">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="p-4 bg-slate-100 rounded-full">
              <Download className="w-8 h-8 text-slate-600" />
            </div>
            <div>
              <Title>Export All Data</Title>
              <Text className="mt-2">Generate a portable JSON archive of all {states.length} states currently in local storage.</Text>
            </div>
            <Button 
              className="w-full bg-slate-900 hover:bg-slate-800 rounded-xl py-3 font-black"
              onClick={handleExport}
            >
              GENERATE BACKUP (.JSON)
            </Button>
          </div>
        </Card>

        <Card className="p-8">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="p-4 bg-blue-50 rounded-full">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <Title>Restore from Backup</Title>
              <Text className="mt-2">Upload a previously exported backup file to restore states and MDAs.</Text>
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
                className="block w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black cursor-pointer transition-all active:scale-[0.98]"
              >
                UPLOAD ARCHIVE
              </label>
            </div>
          </div>
        </Card>
      </Grid>

      {importStatus && (
        <div className={clsx(
          "p-6 rounded-2xl border flex items-center gap-4 animate-in slide-in-from-top-2",
          importStatus.success ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-100 text-rose-700"
        )}>
          {importStatus.success ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          <div>
            <p className="font-bold uppercase text-xs tracking-widest">
              {importStatus.success ? "Restoration Successful" : "Restoration Failed"}
            </p>
            <p className="text-sm mt-1">
              {importStatus.success 
                ? `Successfully imported ${importStatus.count} state records from the archive.` 
                : importStatus.message}
            </p>
          </div>
        </div>
      )}

      <Card decoration="left" decorationColor="blue" className="bg-slate-900 text-white border-none p-8">
        <div className="flex gap-6">
          <ShieldCheck className="w-12 h-12 text-blue-400 flex-shrink-0" />
          <div className="space-y-4">
            <Title className="text-white">Security Note</Title>
            <Text className="text-slate-400">
              Restoring a backup will merge records. If a state with the same name and year already exists, 
              it will be updated with the data from the backup file. 
              Always verify data integrity after a restoration.
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
}
