import { useState, useMemo } from 'react';
import { useBudget } from '../data/BudgetContext';
import { Card, Title, Text, Button, Flex, Badge, Grid, ProgressBar } from '@tremor/react';
import { Upload, FileJson, CheckCircle2, AlertCircle, Trash2, ArrowRight, FileText, File, Database, X, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BudgetParser } from '../utils/BudgetParser';
import VerificationStaging from '../components/VerificationStaging';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { Fragment } from 'react';
import { storage, BUCKET_ID, ID } from '../utils/appwrite';

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
            setError("Invalid JSON format. Please ensure you are using a verified budget schema.");
            setIsProcessing(false);
          }
        };
        reader.readAsText(file);
      } else if (file.type === "application/pdf") {
        setPdfFile(file);
        // 1. Extract text locally using high-accuracy anchor strategy
        const text = await BudgetParser.extractTextFromPDF(file);
        const json = BudgetParser.parseText(text);
        
        if (!json.mdas || !json.mdas.length) {
          throw new Error("Automated structure detection failed. This document might use a non-standard layout.");
        }

        setStagedData(json);
        setRawText(text);
        setIsProcessing(false);
      } else if (file.type === "text/plain") {
        const text = await file.text();
        const json = BudgetParser.parseText(text);
        if (!json.mdas.length) throw new Error("Could not identify budget entities in the provided text file.");
        setStagedData(json);
        setRawText(text);
        setIsProcessing(false);
      } else {
        throw new Error("Incompatible file type. Please provide a Budget PDF, JSON, or TXT file.");
      }
    } catch (err) {
      console.error("Upload process error:", err);
      setError(err.message || "An unexpected error occurred during processing.");
      setIsProcessing(false);
    }
  };

  const handleCommit = async (finalData) => {
    setIsProcessing(true);
    try {
      const result = await addState(finalData, pdfFile);
      setStagedData(null);
      setPdfFile(null);
      setIsProcessing(false);
      
      if (result === "success-redirect") {
        // Find the newly created state ID from the updated context
        const stateId = finalData.state.toLowerCase().replace(/\s+/g, '-');
        // Let fetchStates finish and then navigate
        setTimeout(() => navigate(`/`), 1000);
      }
    } catch (err) {
      setError("Cloud Sync Failed: " + err.message);
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

  const isModalOpen = isProcessing || uploadProgress.active || !!error || !!confirmDelete;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {stagedData ? (
        <VerificationStaging 
          rawData={stagedData} 
          rawText={rawText} 
          onSave={handleCommit} 
          onCancel={() => setStagedData(null)} 
        />
      ) : (
        <>
          <div className="text-center space-y-2">
            <Title className="text-4xl font-black text-slate-900 tracking-tight">Upload State Budget</Title>
            <Text className="text-slate-500 font-medium">Initialize forensic analysis by providing an official document.</Text>
          </div>

          <Card 
            className={`border-2 border-dashed transition-all duration-300 py-16 rounded-3xl overflow-hidden relative group ${
              dragActive ? "border-blue-500 bg-blue-50/30 ring-4 ring-blue-500/10" : "border-slate-200 bg-white hover:border-slate-300 shadow-sm"
            }`}
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
            }}
          >
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="p-6 bg-blue-100 text-blue-600 rounded-3xl group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-100">
                <Upload className="w-10 h-10" />
              </div>
              <div className="text-center">
                <Text className="text-xl font-bold text-slate-900">Drag & Drop Documents</Text>
                <Text className="text-sm text-slate-400 mt-1 italic">PDF, JSON or Text formats supported</Text>
              </div>
              <input 
                type="file" 
                className="hidden" 
                id="file-upload" 
                accept=".json,.pdf,.txt"
                onChange={(e) => handleFile(e.target.files[0])}
              />
              <label 
                htmlFor="file-upload"
                className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black cursor-pointer hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
              >
                SELECT FILE
              </label>
            </div>
          </Card>

          <div className="space-y-4">
            <Title className="text-xl font-black text-slate-900 px-2">Recently Monitored</Title>
            <Grid numItemsMd={2} className="gap-4">
              {states.map((s) => (
                <Card key={s.id} className="p-5 hover:border-blue-200 transition-all group rounded-2xl shadow-sm border-slate-100">
                  <Flex className="items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                        <FileJson className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                      </div>
                      <div>
                        <Text className="font-bold text-slate-900">{s.name}</Text>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge size="xs" color="blue" className="font-bold">{s.year}</Badge>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.data.mdas.length} MDAs</Text>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => navigate(`/state/${s.id}`)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setConfirmDelete({ id: s.id, name: s.name })}
                        className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Flex>
                </Card>
              ))}
            </Grid>
          </div>

          <div className="p-8 bg-slate-900 rounded-3xl text-white">
            <Flex className="mb-6">
              <Title className="text-white font-black">Smart Analysis Guide</Title>
              <Badge color="blue" size="xs">High Accuracy Mode</Badge>
            </Flex>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">1</div>
                  <div>
                    <Text className="text-white font-bold">Use the Python Toolkit</Text>
                    <Text className="text-slate-400 text-xs leading-relaxed">For 100% forensic accuracy, run the local <code>budget_extractor.py</code> tool found in the <code>tools/</code> directory.</Text>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">2</div>
                  <div>
                    <Text className="text-white font-bold">Upload Generated JSON</Text>
                    <Text className="text-slate-400 text-xs leading-relaxed">Drop the resulting <code>_extracted.json</code> file above. It contains high-fidelity table mappings.</Text>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10 flex flex-col justify-between">
                <div>
                  <Text className="text-blue-400 font-black text-[10px] uppercase tracking-widest mb-2">New: Desktop GUI</Text>
                  <Text className="text-white text-sm font-medium leading-tight">Non-technical users can now run <code>streamlit run gui.py</code> for a simple drag-and-drop desktop experience.</Text>
                </div>
                <div className="mt-4 flex items-center gap-2 text-slate-500 italic text-[10px]">
                  <ShieldCheck className="w-3 h-3" />
                  Local processing • Zero cloud lag
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Status & Error Modals */}
      <Transition show={isModalOpen} as={Fragment}>
        <Dialog 
          open={isModalOpen} 
          onClose={() => !isProcessing && !uploadProgress.active && !confirmDelete && setError(null)} 
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
                  ) : isProcessing || uploadProgress.active ? (
                    <div className="flex flex-col items-center justify-center py-6">
                      <div className="relative mb-6">
                        <div className="w-20 h-20 border-4 border-blue-50 rounded-full animate-spin border-t-blue-600"></div>
                        <Database className="w-8 h-8 text-blue-600 absolute inset-0 m-auto" />
                      </div>
                      <DialogTitle as="h3" className="text-xl font-black text-slate-900 text-center">
                        {uploadProgress.active ? "Synchronizing Cloud Data" : "Analyzing Document"}
                      </DialogTitle>
                      <Text className="text-center mt-2 text-slate-500">
                        {uploadProgress.active 
                          ? `Processing high-integrity operations... ${Math.round((uploadProgress.current / uploadProgress.total) * 100)}% complete.`
                          : "Identifying budget sections and parsing financial identities. This may take a few moments."}
                      </Text>
                      {uploadProgress.active && (
                        <div className="w-full mt-6 px-4">
                          <ProgressBar value={(uploadProgress.current / uploadProgress.total) * 100} color="blue" />
                        </div>
                      )}
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
                        DISMISS & RETRY
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
