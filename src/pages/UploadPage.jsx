import { useState } from 'react';
import { useBudget } from '../data/BudgetContext';
import { Card, Title, Text, Button, Flex, Badge, Grid } from '@tremor/react';
import { Upload, FileJson, CheckCircle2, AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const { addState, states, deleteState } = useBudget();
  const navigate = useNavigate();

  const handleFile = (file) => {
    if (file && file.type === "application/json") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          // Basic validation of schema
          if (!json.state || !json.summary || !json.mdas) {
            throw new Error("Invalid budget schema. Please use the official extraction tool.");
          }
          const id = addState(json);
          setError(null);
          navigate(`/state/${id}`);
        } catch (err) {
          setError(err.message);
        }
      };
      reader.readAsText(file);
    } else {
      setError("Please upload a valid JSON file.");
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
            <Upload className="w-8 h-8" />
          </div>
          <div className="text-center">
            <Text className="text-lg font-bold text-slate-900">Drag & Drop JSON Budget File</Text>
            <Text className="text-sm text-slate-400">or click to browse files</Text>
          </div>
          <input 
            type="file" 
            className="hidden" 
            id="file-upload" 
            accept=".json"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          <label 
            htmlFor="file-upload"
            className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold cursor-pointer hover:bg-slate-800 transition-all active:scale-95"
          >
            Select File
          </label>
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
        <Title className="text-white font-bold">Quick Start Guide</Title>
        <div className="mt-6 space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">1</div>
            <div>
              <Text className="text-white font-bold">Run Extraction Tool</Text>
              <Text className="text-slate-400 text-sm">Use <code>python parse_budget.py budget.txt &gt; budget.json</code> to process the PDF text.</Text>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">2</div>
            <div>
              <Text className="text-white font-bold">Upload JSON</Text>
              <Text className="text-slate-400 text-sm">Drag the generated JSON file into the upload area above.</Text>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">3</div>
            <div>
              <Text className="text-white font-bold">Instant Dashboard</Text>
              <Text className="text-slate-400 text-sm">The system will automatically generate all visualizations and MDA lists.</Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
