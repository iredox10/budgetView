import { useState, useMemo, useEffect } from 'react';
import { useBudget } from '../data/BudgetContext';
import { 
  Upload, FileJson, CheckCircle2, AlertCircle, Trash2, 
  ArrowRight, FileText, X, ShieldCheck,
  ChevronLeft, File, FileCheck, Loader2, Info,
  Package, Database, ListChecks, History, Scale, Wand2
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Badge } from '@tremor/react';
import { BudgetParser } from '../utils/BudgetParser';
import { BundleStandardizer } from '../utils/BundleStandardizer';
import VerificationStaging from '../components/VerificationStaging';
import { clsx } from 'clsx';

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stagedData, setStagedData] = useState(null);
  const [rawText, setRawText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [textFile, setTextFile] = useState(null);
  
  // Bundle Detection State
  const [bundleFiles, setBundleFiles] = useState({
    output: null,
    appOutput: null,
    patch: null,
    metrics: null,
    review: null,
    logs: null,
    pdf: null,
    text: null
  });

  const { addState, states, deleteState, uploadProgress } = useBudget();
  const navigate = useNavigate();

  const processBundle = async (filesMap) => {
    setIsProcessing(true);
    try {
      const bundleData = {};

      if (filesMap.output) bundleData.outputJson = JSON.parse(await filesMap.output.text());
      if (filesMap.appOutput) bundleData.appOutputJson = JSON.parse(await filesMap.appOutput.text());
      if (filesMap.patch) bundleData.metadataPatch = JSON.parse(await filesMap.patch.text());
      if (filesMap.metrics) bundleData.pageMetrics = JSON.parse(await filesMap.metrics.text());
      if (filesMap.review) bundleData.review = JSON.parse(await filesMap.review.text());
      if (filesMap.logs) bundleData.runLog = await filesMap.logs.text();
      if (filesMap.text) {
        bundleData.text = await filesMap.text.text();
        setRawText(bundleData.text);
        setTextFile(filesMap.text);
      }

      if (filesMap.pdf) setPdfFile(filesMap.pdf);

      const merged = BundleStandardizer.mergeBundle(bundleData);
      setStagedData(merged);
      setIsProcessing(false);
    } catch (err) {
      setError("Bundle Processing Error: " + err.message);
      setIsProcessing(false);
    }
  };

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    
    const fileList = Array.from(files);
    const getFile = (name) => fileList.find(f => f.name === name || f.name.endsWith('/' + name));

    const newBundle = {
      output: getFile("output.json"),
      appOutput: getFile("app_output.json"),
      patch: getFile("metadata_patch.json"),
      metrics: getFile("page_metrics.json"),
      review: getFile("review.json"),
      logs: getFile("run.log"),
      pdf: fileList.find(f => f.type === "application/pdf" || f.name === "source.pdf" || f.name.endsWith('/source.pdf')),
      text: getFile("text.txt")
    };

    setBundleFiles(newBundle);

    // If we have at least one JSON or a PDF, we can proceed
    if (newBundle.output || newBundle.appOutput || newBundle.pdf) {
      if (newBundle.output || newBundle.appOutput) {
        await processBundle(newBundle);
      } else {
        // Fallback to raw PDF extraction
        setIsProcessing(true);
        try {
          setPdfFile(newBundle.pdf);
          const textResults = await BudgetParser.extractTextFromPDF(newBundle.pdf);
          const json = BudgetParser.parseText(textResults);
          setStagedData(json);
          setRawText(textResults.map(p => p.text).join('\n'));
          setIsProcessing(false);
        } catch (err) {
          setError(err.message);
          setIsProcessing(false);
        }
      }
    } else {
      setError("No valid budget files detected in selection.");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const handleCommit = async (finalData) => {
    setIsProcessing(true);
    try {
      const payload = {
        ...finalData,
        process_logs: stagedData?.process_logs || "",
        document_metrics: stagedData?.document_metrics || {},
        summarySources: stagedData?.summarySources || finalData.summarySources || {},
        summaryPages: stagedData?.summaryPages || finalData.summaryPages || {}
      };

      await addState(payload, pdfFile, textFile);
      setStagedData(null);
      setPdfFile(null);
      setTextFile(null);
      setIsProcessing(false);
      navigate('/admin');
    } catch (err) {
      setError("Upload failed: " + err.message);
      setIsProcessing(false);
    }
  };

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

  if (stagedData) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link 
            to="/admin"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <VerificationStaging 
            rawData={stagedData} 
            rawText={rawText} 
            onSave={handleCommit} 
            onCancel={() => {
              setStagedData(null);
              setPdfFile(null);
              setTextFile(null);
              setRawText('');
            }} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <Package className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Intelligence Ingestion</h1>
              <p className="text-slate-500">Automated multi-file budget folder pipeline</p>
            </div>
          </div>
          <Link 
            to="/admin"
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all text-sm"
          >
            Admin Dashboard
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-4">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <p className="font-semibold text-rose-900">Upload Error</p>
              <p className="text-sm text-rose-700 mt-1">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="ml-auto p-2 hover:bg-rose-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-rose-400" />
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* Main Upload Dropzone */}
          <div className="lg:col-span-2">
            <div 
              className={clsx(
                "bg-white rounded-[2.5rem] border-2 border-dashed h-full min-h-[400px] flex flex-col items-center justify-center p-12 transition-all relative overflow-hidden",
                dragActive 
                  ? "border-emerald-500 bg-emerald-50/30 scale-[0.99]" 
                  : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50/50"
              )}
              onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="text-center max-w-sm mx-auto z-10">
                <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/10">
                  <Upload className="w-10 h-10 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-3">Drop State Folder</h2>
                <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                  Select or drag the entire folder (Kogi_2025, Bayelsa_budget, etc.) 
                  to activate the automated intelligence pipeline.
                </p>
                
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden" 
                  webkitdirectory="true"
                  directory="true"
                  multiple
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <label 
                  htmlFor="file-upload"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black cursor-pointer transition-all shadow-xl shadow-slate-900/20 active:scale-95"
                >
                  <FolderOpen className="w-5 h-5" />
                  SELECT FOLDER
                </label>
              </div>

              {/* Background Glow */}
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
            </div>
          </div>

          {/* Transparency Checklist */}
          <div className="space-y-6">
            <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <ListChecks className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900">Bundle Checklist</h3>
              </div>
              
              <div className="space-y-4">
                {[
                  { id: 'output', label: 'Primary Data (output.json)', desc: 'Powers verified figures' },
                  { id: 'text', label: 'Raw Text (text.txt)', desc: 'Powers universal search' },
                  { id: 'pdf', label: 'Official PDF (source.pdf)', desc: 'Verification evidence' },
                  { id: 'review', label: 'Audit Report (review.json)', desc: 'Forensic math checks' },
                  { id: 'metrics', label: 'Structural Metrics', desc: 'Document complexity data' },
                  { id: 'logs', label: 'Process Logs (run.log)', desc: 'Extraction timestamping' },
                ].map((item) => (
                  <div key={item.id} className="flex items-start gap-3 group">
                    <div className={clsx(
                      "w-5 h-5 rounded-full mt-0.5 flex items-center justify-center shrink-0 transition-colors",
                      bundleFiles[item.id] ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-300 group-hover:bg-slate-200"
                    )}>
                      {bundleFiles[item.id] ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 bg-current rounded-full" />}
                    </div>
                    <div>
                      <p className={clsx("text-xs font-bold", bundleFiles[item.id] ? "text-slate-900" : "text-slate-400")}>{item.label}</p>
                      <p className="text-[10px] text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Pipeline Note</p>
                </div>
                <p className="text-[11px] text-blue-600 leading-relaxed">
                  The system automatically prioritizes pipeline JSON files. Fresh OCR extraction only runs if no JSON is detected.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Existing States Table */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Active State Intelligence</h2>
              <p className="text-sm text-slate-500">{states.length} verified state bundles online</p>
            </div>
            <Database className="w-6 h-6 text-slate-300" />
          </div>
          
          <div className="divide-y divide-slate-100">
            {states.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-6 hover:bg-slate-50/50 transition-all group">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-slate-900 text-lg">{s.name}</p>
                      <Badge size="xs" color="emerald">{s.year}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-400 font-medium">
                      <span className="flex items-center gap-1.5"><ListChecks className="w-3 h-3" /> {s.data?.mdas?.length || 0} MDAs</span>
                      <span className="flex items-center gap-1.5"><History className="w-3 h-3" /> {s.data?.audit?.integrity_score || 100}% Integrity</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => navigate(`/state/${s.id}`)}
                    className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setConfirmDelete({ id: s.id, name: s.name })}
                    className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modern Processing Overlay */}
      {(isProcessing || uploadProgress.active) && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" />
          <div className="relative bg-white rounded-[3rem] p-12 max-w-md w-full text-center shadow-2xl">
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 border-4 border-emerald-100 rounded-full" />
              <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Database className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3">
              {uploadProgress.active ? "Syncing to Cloud" : "Processing Bundle"}
            </h3>
            <p className="text-slate-500 leading-relaxed">
              {uploadProgress.active 
                ? `Securing budget data in encrypted storage... ${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%`
                : "Analyzing state intelligence package. This may take a moment for large documents..."}
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-5 mb-8">
              <div className="w-16 h-16 bg-rose-100 rounded-3xl flex items-center justify-center shrink-0">
                <AlertCircle className="w-8 h-8 text-rose-600" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">Purge State?</h3>
                <p className="text-sm text-rose-600 font-bold uppercase tracking-tight">This action is irreversible</p>
              </div>
            </div>
            <p className="text-slate-600 mb-10 leading-relaxed">
              Are you sure you want to delete the <strong>{confirmDelete.name}</strong> intelligence bundle? 
              All MDAs, sectors, and audit logs will be permanently wiped.
            </p>
            <div className="flex gap-4">
              <button 
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all"
                onClick={() => setConfirmDelete(null)}
              >
                CANCEL
              </button>
              <button 
                className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-rose-600/20"
                onClick={handleDelete}
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Internal Folder icon since Lucide sometimes has naming variations
function FolderOpen(props) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
