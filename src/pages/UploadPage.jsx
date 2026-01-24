import { useState } from 'react';
import { useBudget } from '../data/BudgetContext';
import { Card, Title, Text, Button, Flex, Badge, Grid, ProgressBar } from '@tremor/react';
import { Upload, FileJson, CheckCircle2, AlertCircle, Trash2, ArrowRight, FileText, File, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BudgetParser } from '../utils/BudgetParser';

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { addState, states, deleteState } = useBudget();
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
            const id = await addState(json);
            navigate(`/state/${id}`);
          } catch (err) {
            setError("Invalid JSON format or upload failed.");
            setIsProcessing(false);
          }
        };
        reader.readAsText(file);
      } else if (file.type === "application/pdf") {
        const text = await BudgetParser.extractTextFromPDF(file);
        const json = BudgetParser.parseText(text);
        if (!json.mdas.length) {
          console.error("Extraction failure. Text sample:", text.substring(0, 1000));
          throw new Error("No budget data detected in PDF. This could be due to a non-standard layout or an encrypted file.");
        }
        const id = await addState(json);
        setTimeout(() => {
          navigate(`/state/${id}`, { replace: true });
        }, 100);
      } else if (file.type === "text/plain") {
        const text = await file.text();
        const json = BudgetParser.parseText(text);
        if (!json.mdas.length) throw new Error("No budget data detected in text file.");
        const id = await addState(json);
        navigate(`/state/${id}`);
      } else {
        throw new Error("Unsupported file type. Please upload JSON, PDF, or TXT.");
      }
    } catch (err) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <Title className="text-3xl font-black text-slate-900">Upload State Budget</Title>
        <Text className="text-slate-500">Convert PDF to JSON using our Python tool, then drop it here.</Text>
      </div>

      <Card 
        className={`border-2 border-dashed transition-all duration-200 py-12 ${
          dragActive ? "border-blue-500 bg-blue-50/50" : "border-slate-200 bg-white"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-blue-100 text-blue-600 rounded-2xl">
            {isProcessing ? <Database className="w-8 h-8 animate-pulse" /> : <Upload className="w-8 h-8" />}
          </div>
          <div className="text-center">
            <Text className="text-lg font-bold text-slate-900">
              {isProcessing ? "Analyzing Budget Structures..." : "Drag & Drop Budget PDF or JSON"}
            </Text>
            <Text className="text-sm text-slate-400">
              {isProcessing ? "Identifying MDAs and sectoral allocations" : "or click to browse files"}
            </Text>
          </div>
          {!isProcessing && (
            <>
              <input 
                type="file" 
                className="hidden" 
                id="file-upload" 
                accept=".json,.pdf,.txt"
                onChange={(e) => handleFile(e.target.files[0])}
              />
              <label 
                htmlFor="file-upload"
                className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold cursor-pointer hover:bg-slate-800 transition-all active:scale-95"
              >
                Select File
              </label>
            </>
          )}
          {isProcessing && (
            <div className="w-64">
              <ProgressBar value={75} color="blue" className="mt-2" />
            </div>
          )}
        </div>
      </Card>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600">
          <AlertCircle className="w-5 h-5" />
          <Text className="text-red-600 font-medium">{error}</Text>
        </div>
      )}

      <div className="space-y-4">
        <Title className="text-xl font-bold text-slate-900">Managed States</Title>
        <Grid numItemsMd={2} className="gap-4">
          {states.map((s) => (
            <Card key={s.id} className="p-4 hover:border-blue-200 transition-colors group">
              <Flex>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <FileJson className="w-5 h-5 text-slate-500 group-hover:text-blue-600" />
                  </div>
                  <div>
                    <Text className="font-bold text-slate-900">{s.name}</Text>
                    <Text className="text-[10px] uppercase font-bold text-slate-400">{s.year} Estimates</Text>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => navigate(`/state/${s.id}`)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  {s.id !== 'kano' && (
                    <button 
                      onClick={() => deleteState(s.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </Flex>
            </Card>
          ))}
        </Grid>
      </div>

      <div className="p-8 bg-slate-900 rounded-3xl text-white">
        <Title className="text-white font-bold">Smart Analysis Guide</Title>
        <div className="mt-6 space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">1</div>
            <div>
              <Text className="text-white font-bold">Upload PDF Directly</Text>
              <Text className="text-slate-400 text-sm">Drop the official Budget Estimates PDF. Our AI-driven parser will identify sections automatically.</Text>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">2</div>
            <div>
              <Text className="text-white font-bold">Verify Traceability</Text>
              <Text className="text-slate-400 text-sm">Click on any number in the dashboard to see the exact line of text from the PDF it was extracted from.</Text>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">3</div>
            <div>
              <Text className="text-white font-bold">Audit Anomalies</Text>
              <Text className="text-slate-400 text-sm">The system will flag rows where government totals don't match sub-component sums.</Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
