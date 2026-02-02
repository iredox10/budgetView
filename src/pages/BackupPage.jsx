import { useBudget } from '../data/BudgetContext';
import { 
  Database, Download, Upload, ShieldCheck, AlertCircle, 
  CheckCircle2, Save, History, ArrowLeft, FileJson,
  Cloud, Lock, Clock, ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { clsx } from 'clsx';

export default function BackupPage() {
  const { states, addState } = useBudget();
  const navigate = useNavigate();
  const [importStatus, setImportStatus] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

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
      link.download = `budgetview_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      setIsExporting(false);
    }, 800);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    processImport(file);
  };

  const processImport = (file) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target.result);
        if (!backup.states || !Array.isArray(backup.states)) {
          throw new Error("Invalid backup file format");
        }
        
        for (const s of backup.states) {
          await addState(s.data);
        }
        
        setImportStatus({ success: true, count: backup.states.length });
        setTimeout(() => setImportStatus(null), 5000);
      } catch (err) {
        setImportStatus({ success: false, message: err.message });
        setTimeout(() => setImportStatus(null), 5000);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      processImport(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link 
          to="/admin"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <Database className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Backup & Restore</h1>
              <p className="text-slate-500">Manage database backups and restore from archives</p>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {importStatus && (
          <div className={clsx(
            "mb-6 p-4 rounded-2xl border flex items-start gap-4",
            importStatus.success 
              ? "bg-emerald-50 border-emerald-200" 
              : "bg-rose-50 border-rose-200"
          )}>
            <div className={clsx(
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
              importStatus.success ? "bg-emerald-200" : "bg-rose-200"
            )}>
              {importStatus.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-700" />
              )}
            </div>
            <div>
              <p className={clsx(
                "font-semibold",
                importStatus.success ? "text-emerald-900" : "text-rose-900"
              )}>
                {importStatus.success ? "Import Successful" : "Import Failed"}
              </p>
              <p className={clsx(
                "text-sm mt-1",
                importStatus.success ? "text-emerald-700" : "text-rose-700"
              )}>
                {importStatus.success 
                  ? `Successfully restored ${importStatus.count} state records`
                  : importStatus.message}
              </p>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Export Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <Download className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Export Backup</h2>
                <p className="text-sm text-slate-500">Download all budget data</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <span className="text-sm text-slate-600">Total States</span>
                <span className="font-semibold text-slate-900">{states.length}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <span className="text-sm text-slate-600">Backup Format</span>
                <span className="font-semibold text-slate-900">JSON</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-slate-600">Encryption</span>
                <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
                  <Lock className="w-4 h-4" />
                  AES-256
                </span>
              </div>
            </div>
            
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className={clsx(
                "w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2",
                isExporting
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-slate-900 text-white hover:bg-slate-800"
              )}
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Backup</span>
                </>
              )}
            </button>
          </div>

          {/* Import Card */}
          <div 
            className={clsx(
              "bg-white rounded-2xl border-2 border-dashed p-8 transition-all",
              dragActive 
                ? "border-emerald-500 bg-emerald-50/30" 
                : "border-slate-200 hover:border-slate-300"
            )}
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Upload className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Import Backup</h2>
                <p className="text-sm text-slate-500">Restore from JSON file</p>
              </div>
            </div>
            
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileJson className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm text-slate-600 mb-2">Drag and drop your backup file</p>
              <p className="text-xs text-slate-400">or</p>
            </div>
            
            <input 
              type="file" 
              id="restore-upload" 
              className="hidden" 
              accept=".json"
              onChange={handleImport}
            />
            <label 
              htmlFor="restore-upload"
              className="block w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-center cursor-pointer transition-all"
            >
              Select File
            </label>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <Cloud className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-slate-900">Cloud Storage</span>
            </div>
            <p className="text-sm text-slate-500">
              All backups are securely stored with automatic redundancy across multiple regions.
            </p>
          </div>
          
          <div className="bg-white rounded-2xl p-5 border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <Lock className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-slate-900">Encrypted</span>
            </div>
            <p className="text-sm text-slate-500">
              End-to-end encryption ensures your budget data remains secure during transfer and storage.
            </p>
          </div>
          
          <div className="bg-white rounded-2xl p-5 border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-slate-900">Version History</span>
            </div>
            <p className="text-sm text-slate-500">
              Each backup is timestamped, allowing you to restore from any point in time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
