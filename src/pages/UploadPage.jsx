import { useState, useMemo } from 'react';
import { useBudget } from '../data/BudgetContext';
import { 
  Upload, FileJson, CheckCircle2, AlertCircle, Trash2, 
  ArrowRight, FileText, Database, X, ShieldCheck,
  ChevronLeft, File, FileCheck, Loader2
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { BudgetParser } from '../utils/BudgetParser';
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
  
  const { addState, states, deleteState, uploadProgress } = useBudget();
  const navigate = useNavigate();

  const handleFile = async (file) => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      if (file.type === "application/json") {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const json = JSON.parse(e.target.result);
            setStagedData(json);
            setRawText(JSON.stringify(json, null, 2));
            setIsProcessing(false);
          } catch (err) {
            setError("Invalid JSON format");
            setIsProcessing(false);
          }
        };
        reader.readAsText(file);
      } else if (file.type === "application/pdf") {
        setPdfFile(file);
        const text = await BudgetParser.extractTextFromPDF(file);
        const json = BudgetParser.parseText(text);
        
        if (!json.mdas || !json.mdas.length) {
          throw new Error("Could not parse PDF structure");
        }

        setStagedData(json);
        setRawText(text);
        setIsProcessing(false);
      } else if (file.type === "text/plain") {
        const text = await file.text();
        const json = BudgetParser.parseText(text);
        if (!json.mdas.length) throw new Error("Could not identify budget data");
        setStagedData(json);
        setRawText(text);
        setIsProcessing(false);
      } else {
        throw new Error("Unsupported file type");
      }
    } catch (err) {
      setError(err.message || "Processing error");
      setIsProcessing(false);
    }
  };

  const handleCommit = async (finalData) => {
    setIsProcessing(true);
    try {
      await addState(finalData, pdfFile);
      setStagedData(null);
      setPdfFile(null);
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

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
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
            onCancel={() => setStagedData(null)} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <Upload className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Upload Budget Data</h1>
              <p className="text-slate-500">Import state budget documents for analysis</p>
            </div>
          </div>
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

        {/* Upload Area */}
        <div 
          className={clsx(
            "bg-white rounded-2xl border-2 border-dashed p-12 mb-8 transition-all",
            dragActive 
              ? "border-emerald-500 bg-emerald-50/30" 
              : "border-slate-200 hover:border-slate-300"
          )}
          onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Drag & Drop Files</h2>
            <p className="text-sm text-slate-500 mb-6">
              Support for PDF, JSON, and TXT budget documents
            </p>
            <input 
              type="file" 
              id="file-upload" 
              className="hidden" 
              accept=".json,.pdf,.txt"
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <label 
              htmlFor="file-upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold cursor-pointer transition-all"
            >
              <FileText className="w-4 h-4" />
              Select File
            </label>
          </div>
        </div>

        {/* Supported Formats */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">PDF Documents</p>
              <p className="text-xs text-slate-500 mt-1">Official budget PDFs</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileJson className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">JSON Files</p>
              <p className="text-xs text-slate-500 mt-1">Structured data files</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <File className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Text Files</p>
              <p className="text-xs text-slate-500 mt-1">Plain text extracts</p>
            </div>
          </div>
        </div>

        {/* Existing States */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Existing State Budgets</h2>
            <p className="text-sm text-slate-500 mt-1">{states.length} states currently in database</p>
          </div>
          
          <div className="divide-y divide-slate-100">
            {states.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <FileCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.year} • {s.data?.mdas?.length || 0} MDAs</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => navigate(`/state/${s.id}`)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setConfirmDelete({ id: s.id, name: s.name })}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {states.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-slate-500">No state budgets uploaded yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Processing Modal */}
      {(isProcessing || uploadProgress.active) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {uploadProgress.active ? "Uploading Data" : "Processing File"}
            </h3>
            <p className="text-slate-500">
              {uploadProgress.active 
                ? `Uploading to cloud... ${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%`
                : "Extracting budget data from document..."}
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-3xl p-8 max-w-md w-full">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Delete Budget</h3>
                <p className="text-sm text-rose-600">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete <strong>{confirmDelete.name}</strong> budget data? 
              All MDA and sector information will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button 
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button 
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl transition-all"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
