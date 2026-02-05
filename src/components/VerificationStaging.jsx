import { useState, useMemo, useEffect, useRef } from 'react';
import { useBudget } from '../data/BudgetContext';
import { 
  Card, Title, Text, TextInput, Button, Grid, Flex, Badge, 
  Divider, Tracker
} from '@tremor/react';
import { 
  CheckCircle2, AlertCircle, Save, ArrowLeft, Scale, 
  MousePointer2, Hash, Link2, Info, AlertTriangle, Search, Sparkles, X, Wand2,
  Layout, ListChecks, Map, Zap, FileText
} from 'lucide-react';
import clsx from 'clsx';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(val || 0);
};

export default function VerificationStaging({ rawData, rawText, onSave, onCancel, isProcessing }) {
  const { uploadProgress } = useBudget();
  const [showHelp, setShowHelp] = useState(false);
  const [heuristicMode, setHeuristicFix] = useState(false);
  const [formData, setFormData] = useState({
    state: rawData.state,
    year: rawData.year,
    summary: { ...rawData.summary },
    summarySources: { ...rawData.summarySources },
    isOfficialError: false,
    errorExplanation: '',
    audit: { ...rawData.audit }
  });

  const [focusedField, setFocusedField] = useState(null);
  const [selection, setSelection] = useState('');
  const [textSearch, setTextSearch] = useState('');
  const [jumpToPage, setJumpToPage] = useState('');
  const textContainerRef = useRef(null);

  // Apply Heuristic Fixes
  useEffect(() => {
    if (heuristicMode) {
      const s = { ...formData.summary };
      const revTotal = (s.faac || 0) + (s.igr || 0) + (s.grants || 0) + (s.capital_receipts || 0);
      
      if (Math.abs(s.total_revenue - revTotal) > 1 && revTotal > 0) {
        setFormData(prev => ({
          ...prev,
          summary: { ...prev.summary, total_revenue: revTotal },
          errorExplanation: (prev.errorExplanation || "") + "\nNote: Total Revenue adjusted by Audit Engine to match sum of components."
        }));
      }
    }
  }, [heuristicMode]);

  const candidatePool = useMemo(() => {
    const numbers = rawText.match(/[\d,]+\.\d{2}/g) || [];
    const uniqueNumbers = [...new Set(numbers)];
    const assignedValues = Object.values(formData.summary).map(v => v?.toFixed?.(2) || "0.00");
    return uniqueNumbers.filter(n => !assignedValues.includes(n.replace(/,/g, '')));
  }, [rawText, formData.summary]);

  const balance = useMemo(() => {
    const s = formData.summary;
    const revTotal = (s.faac || 0) + (s.igr || 0) + (s.grants || 0) + (s.capital_receipts || 0);
    const expTotal = (s.personnel_cost || 0) + (s.other_recurrent_costs || 0) + (s.capital_expenditure || 0);
    
    const mdaSum = rawData.mdas
      .filter(m => !m.code.endsWith('00000000'))
      .reduce((acc, curr) => acc + curr.total, 0);

    const sectorSum = rawData.sectors.reduce((acc, curr) => acc + curr.amount, 0);

    return {
      revenueDiff: (s.total_revenue || 0) - revTotal,
      expenditureDiff: (s.total_expenditure || 0) - expTotal,
      mdaDiff: (s.total_expenditure || 0) - mdaSum,
      sectorDiff: (s.total_expenditure || 0) - sectorSum,
      isRevenueBalanced: Math.abs((s.total_revenue || 0) - revTotal) < 1,
      isExpenditureBalanced: Math.abs((s.total_expenditure || 0) - expTotal) < 1,
      isMdaIntegrated: Math.abs((s.total_expenditure || 0) - mdaSum) < 1000
    };
  }, [formData, rawData.mdas, rawData.sectors]);

  const handleSummaryChange = (field, value) => {
    const num = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
    setFormData(prev => ({
      ...prev,
      summary: { ...prev.summary, [field]: num }
    }));
  };

  const handleTextSelection = () => {
    const selected = window.getSelection().toString().trim();
    if (selected) {
      setSelection(selected);
    }
  };

  const assignSelection = (field) => {
    if (!selection) return;
    const num = parseFloat(selection.replace(/[^0-9.]/g, '')) || 0;
    const lines = rawText.split('\n');
    const sourceLine = lines.find(l => l.includes(selection)) || selection;

    setFormData(prev => ({
      ...prev,
      summary: { ...prev.summary, [field]: num },
      summarySources: { ...prev.summarySources, [field]: sourceLine }
    }));
    setSelection('');
  };

  const jumpToText = (text) => {
    setTextSearch(text);
    // Find the element and scroll to it
    setTimeout(() => {
      const el = document.querySelector('[data-search-match="true"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleJumpToPage = (p) => {
    const pageNum = parseInt(p);
    if (isNaN(pageNum)) return;
    const marker = `Page ${pageNum}`;
    jumpToText(marker);
  };

  const isValid = (balance.isRevenueBalanced && balance.isExpenditureBalanced) || formData.isOfficialError;

  return (
    <div className="fixed inset-0 bg-slate-50 z-[100] overflow-y-auto pb-20">
      <div className="space-y-8 animate-in fade-in duration-500 max-w-[1800px] mx-auto p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Title className="text-2xl font-black text-slate-900 tracking-tight">Audit Forge v2.0</Title>
              <Badge color={isValid ? "emerald" : "rose"} icon={isValid ? CheckCircle2 : AlertCircle}>
                {isValid ? "Audit Balanced" : "Issues Detected"}
              </Badge>
            </div>
            <Text className="text-xs">Advanced structural reconciliation and source mapping console.</Text>
          </div>
        </div>
          <div className="flex items-center gap-3">
            {selection && !uploadProgress.active && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl animate-in slide-in-from-right-4">
                <MousePointer2 className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-blue-700">Selection: {selection}</span>
              </div>
            )}
            <button 
              onClick={() => setShowHelp(true)}
              className="p-3 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-all"
              title="Audit Guide"
            >
              <Info className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setHeuristicFix(!heuristicMode)}
              className={clsx(
                "px-4 py-3 rounded-xl transition-all flex items-center gap-2 font-black text-xs shadow-sm border",
                heuristicMode ? "bg-emerald-600 border-emerald-700 text-white shadow-emerald-200" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              )}
            >
              <Wand2 className="w-4 h-4" />
              {heuristicMode ? "SMART-FIX ACTIVE" : "ENABLE SMART-FIX"}
            </button>
            <Button 
              icon={Save} 
              disabled={!isValid || uploadProgress.active}
              onClick={() => onSave({ ...rawData, ...formData })}
              className={isValid ? "bg-slate-900 hover:bg-slate-800 border-none text-white font-black px-8 py-6 rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-95" : "bg-slate-300"}
            >
              {uploadProgress.active 
                ? `COMMITTING: ${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%` 
                : "SYNC VERIFIED BUNDLE"}
            </Button>
          </div>
      </div>

        <Grid numItemsLg={4} className="gap-8">
          {/* LEFT: Financial Identities */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="rounded-3xl border-none shadow-xl shadow-slate-200/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-blue-600" />
                  <Title>Metric Mapping</Title>
                </div>
                <Badge color="slate" icon={Hash}>Core Summary</Badge>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <Text className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Inflow Chain</Text>
                  {[
                  { id: 'total_revenue', label: 'Reported Total Revenue' },
                  { id: 'faac', label: 'FAAC Share' },
                  { id: 'igr', label: 'Independent Revenue (IGR)' },
                  { id: 'grants', label: 'Aid & Grants' },
                  { id: 'capital_receipts', label: 'Capital Receipts' },
                ].map(field => (
                  <div key={field.id} className="relative group">
                    <Flex className="mb-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{field.label}</label>
                      <button 
                        onClick={() => assignSelection(field.id)}
                        disabled={!selection}
                        className={clsx(
                          "px-2 py-0.5 rounded text-[9px] font-black transition-all",
                          selection ? "bg-blue-600 text-white shadow-lg scale-110" : "bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100"
                        )}
                      >
                        {selection ? "MAP SELECTION" : "READY"}
                      </button>
                    </Flex>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₦</span>
                      <TextInput 
                        value={formData.summary[field.id]?.toLocaleString('en-NG', { minimumFractionDigits: 2 }) || ''}
                        onChange={(e) => handleSummaryChange(field.id, e.target.value)}
                        onFocus={() => setFocusedField(field.id)}
                        className="font-mono font-bold pl-8"
                      />
                    </div>
                    <div className="mt-1 px-1 flex justify-between items-center">
                      <Text className="text-[10px] font-bold text-blue-600">
                        {formatCurrency(formData.summary[field.id])}
                      </Text>
                      {formData.summarySources[field.id] && (
                        <div className="flex items-center gap-1 text-[9px] text-slate-400 italic">
                          <Link2 className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[150px]">{formData.summarySources[field.id]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                </div>

                <Divider />

                <div className="space-y-4">
                <Text className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Outflow Chain</Text>
                {[
                  { id: 'total_expenditure', label: 'Reported Total Expenditure' },
                  { id: 'personnel_cost', label: 'Personnel Cost' },
                  { id: 'other_recurrent_costs', label: 'Recurrent (Overhead)' },
                  { id: 'capital_expenditure', label: 'Capital Expenditure' },
                ].map(field => (
                  <div key={field.id} className="relative group">
                    <Flex className="mb-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{field.label}</label>
                      <button 
                        onClick={() => assignSelection(field.id)}
                        disabled={!selection}
                        className={clsx(
                          "px-2 py-0.5 rounded text-[9px] font-black transition-all",
                          selection ? "bg-blue-600 text-white shadow-lg scale-110" : "bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100"
                        )}
                      >
                        {selection ? "MAP SELECTION" : "READY"}
                      </button>
                    </Flex>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₦</span>
                      <TextInput 
                        value={formData.summary[field.id]?.toLocaleString('en-NG', { minimumFractionDigits: 2 }) || ''}
                        onChange={(e) => handleSummaryChange(field.id, e.target.value)}
                        onFocus={() => setFocusedField(field.id)}
                        className="font-mono font-bold pl-8"
                      />
                    </div>
                    <div className="mt-1 px-1">
                      <Text className="text-[10px] font-bold text-blue-600">
                        {formatCurrency(formData.summary[field.id])}
                      </Text>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            </Card>
          </div>

          {/* MIDDLE: Source View & Heatmap */}
          <div className="lg:col-span-2 flex gap-6">
            {/* Table Density Heatmap Strip */}
            <div className="w-12 bg-white rounded-3xl border border-slate-200 flex flex-col items-center py-4 gap-1 overflow-hidden shadow-sm shrink-0">
              <Map className="w-4 h-4 text-slate-400 mb-2" />
              <div className="flex-1 w-full overflow-y-auto px-2 space-y-0.5 scrollbar-hide">
                {rawData.heatmap?.map((p, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleJumpToPage(p.page)}
                    className={clsx(
                      "w-full h-2 rounded-sm transition-all hover:scale-125",
                      p.hasTable ? "bg-blue-500 shadow-sm" : "bg-slate-100"
                    )}
                    title={p.label}
                    style={{ opacity: 0.2 + (p.density / 50) }}
                  />
                ))}
              </div>
            </div>

            <Card className="h-[calc(100vh-250px)] flex flex-1 flex-col p-0 overflow-hidden rounded-[2.5rem] border-slate-200 shadow-2xl shadow-slate-200/50 bg-white">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4">
                <Flex className="items-center justify-between">
                  <div>
                    <Title className="text-slate-900 tracking-tight flex items-center gap-2">
                      <FileText className="w-5 h-5 text-slate-400" />
                      Document Intel
                    </Title>
                    <Text className="text-[10px] font-bold uppercase text-slate-400">Page Navigator & Text Engine</Text>
                  </div>
                  <div className="flex items-center gap-2">
                    <select 
                      onChange={(e) => handleJumpToPage(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option>Jump to Page...</option>
                      {rawData.heatmap?.filter(p => p.hasTable).map(p => (
                        <option key={p.page} value={p.page}>Page {p.page} ({Math.round(p.density)}% density)</option>
                      ))}
                    </select>
                    <Badge size="xs" color="blue" icon={Sparkles}>OCR Engine ACTIVE</Badge>
                  </div>
                </Flex>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Quick search document content..."
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                    value={textSearch}
                    onChange={(e) => setTextSearch(e.target.value)}
                  />
                </div>
              </div>
              <div 
                ref={textContainerRef}
                onMouseUp={handleTextSelection}
                className="flex-1 overflow-y-auto p-8 font-mono text-[11px] leading-relaxed bg-slate-900 text-slate-400 whitespace-pre scroll-smooth"
              >
                {rawText.split('\n').map((line, idx) => {
                  const isAssigned = Object.values(formData.summarySources).some(s => s === line.trim());
                  const isHighlighted = focusedField && formData.summarySources[focusedField] === line.trim();
                  const isSearchMatch = textSearch && line.toUpperCase().includes(textSearch.toUpperCase());
                  
                  return (
                    <div 
                      key={idx} 
                      data-search-match={isSearchMatch}
                      className={clsx(
                        "px-2 transition-colors border-l-4",
                        isAssigned ? "text-emerald-300 border-emerald-500/50 bg-emerald-500/5" : "border-transparent hover:bg-white/5",
                        isHighlighted && "bg-blue-500/20 text-blue-100 border-blue-500 font-bold",
                        isSearchMatch && "bg-yellow-500/30 text-yellow-200 border-yellow-500"
                      )}
                    >
                      {line}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* RIGHT: Audit Assistant Sidebar */}
          <div className="lg:col-span-1 space-y-6 overflow-y-auto h-[calc(100vh-250px)] pr-2">
            <Card className="rounded-3xl border-none shadow-xl bg-slate-900 text-white p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-tight">Audit Assistant</h3>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Forensic Reconciliation</p>
                </div>
              </div>

              <div className="space-y-4">
                {formData.audit?.tasks?.map(task => (
                  <div key={task.id} className={clsx(
                    "p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02]",
                    task.status === 'open' ? "bg-white/5 border-white/10" : "bg-emerald-500/10 border-emerald-500/20"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <Badge color={task.severity === 'high' ? "rose" : "amber"} size="xs">{task.type.replace(/_/g, ' ')}</Badge>
                      <ListChecks className="w-3 h-3 text-slate-500" />
                    </div>
                    <p className="text-xs text-slate-300 mb-3 leading-relaxed">{task.message}</p>
                    
                    {task.suggestedFix && (
                      <button 
                        onClick={() => {
                          if (task.type === 'global_revenue_mismatch') handleSummaryChange('total_revenue', task.suggestedFix.to.toString());
                          if (task.type === 'global_expenditure_mismatch') handleSummaryChange('total_expenditure', task.suggestedFix.to.toString());
                        }}
                        className="w-full py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black flex items-center justify-center gap-2 hover:bg-blue-500 transition-colors"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        APPLY FIX: ₦{formatCompact(task.suggestedFix.to)}
                      </button>
                    )}
                  </div>
                ))}

                {(!formData.audit?.tasks || formData.audit.tasks.length === 0) && (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3 opacity-50" />
                    <p className="text-xs text-slate-500">No open reconciliation tasks.</p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="rounded-3xl border-none shadow-xl bg-white p-6">
              <div className="flex items-center gap-3 mb-6">
                <Layout className="w-5 h-5 text-slate-400" />
                <Title className="text-sm">Patch Preview</Title>
              </div>
              <div className="space-y-3">
                {Object.entries(formData.summarySources).map(([key, val]) => (
                  <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{key.replace(/_/g, ' ')}</p>
                    <p className="text-[10px] font-bold text-slate-700 truncate">{val}</p>
                  </div>
                ))}
                {Object.keys(formData.summarySources).length === 0 && (
                  <Text className="text-center py-4 italic text-[10px]">No manual overrides applied.</Text>
                )}
              </div>
            </Card>

            <Card className={clsx("rounded-3xl border-2 transition-all", formData.isOfficialError ? "border-amber-500 bg-amber-50/20 shadow-lg shadow-amber-100" : "border-slate-100 shadow-sm")}>
              <Flex className="mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={clsx("w-5 h-5", formData.isOfficialError ? "text-amber-600" : "text-slate-400")} />
                  <Title className="text-sm">Flag Document Error</Title>
                </div>
                <input 
                  type="checkbox" 
                  checked={formData.isOfficialError}
                  onChange={(e) => setFormData({...formData, isOfficialError: e.target.checked})}
                  className="w-5 h-5 accent-amber-600 rounded-lg"
                />
              </Flex>
              <Text className="text-[10px] mb-4 text-slate-500 font-medium italic">
                "Verified as extracted correctly but mathematically inconsistent in official PDF."
              </Text>
              {formData.isOfficialError && (
                <textarea 
                  placeholder="Explain the internal mismatch..."
                  className="w-full p-4 bg-white border border-amber-200 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-amber-500/20 h-32 leading-relaxed"
                  value={formData.errorExplanation}
                  onChange={(e) => setFormData({...formData, errorExplanation: e.target.value})}
                />
              )}
            </Card>
          </div>
        </Grid>
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowHelp(false)} />
          <div className="relative bg-white rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <Sparkles className="w-6 h-6" />
                </div>
                <Title className="text-2xl font-black">Audit Methodology</Title>
              </div>
              <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-sm shrink-0">1</div>
                <div>
                  <p className="font-bold text-slate-900">Heatmap Navigation</p>
                  <p className="text-sm text-slate-500">Use the blue heatmap strip to find pages with high table density where missing totals likely reside.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-sm shrink-0">2</div>
                <div>
                  <p className="font-bold text-slate-900">Audit Assistant</p>
                  <p className="text-sm text-slate-500">Click "APPLY FIX" on task cards to automatically resolve discrepancies using calculated values from sub-tables.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-sm shrink-0">3</div>
                <div>
                  <p className="font-bold text-slate-900">Source Mapping</p>
                  <p className="text-sm text-slate-500">
                    Highlight a number in the Document Intel panel and click "MAP SELECTION" to create an immutable link between the dashboard figure and the official text.
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowHelp(false)}
              className="w-full mt-10 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
            >
              GOT IT, START AUDIT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatCompact(val) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(val);
}
