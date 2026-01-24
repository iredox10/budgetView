import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Card, Title, Text, TextInput, Button, Grid, Flex, Badge, 
  Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, 
  Callout, Divider, Tracker
} from '@tremor/react';
import { 
  CheckCircle2, AlertCircle, Save, ArrowLeft, RefreshCw, Scale, 
  MousePointer2, Hash, Link2, Info, AlertTriangle, Search
} from 'lucide-react';
import { clsx } from 'clsx';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(val || 0);
};

export default function VerificationStaging({ rawData, rawText, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    state: rawData.state,
    year: rawData.year,
    summary: { ...rawData.summary },
    summarySources: { ...rawData.summarySources },
    isOfficialError: false,
    errorExplanation: ''
  });

  const [focusedField, setFocusedField] = useState(null);
  const [selection, setSelection] = useState('');
  const [textSearch, setTextSearch] = useState('');
  const textContainerRef = useRef(null);

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

  const isValid = (balance.isRevenueBalanced && balance.isExpenditureBalanced) || formData.isOfficialError;

  return (
    <div className="fixed inset-0 bg-slate-50 z-[100] overflow-y-auto pb-20">
      <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Title className="text-2xl font-black text-slate-900">Audit & Evidence Console</Title>
                <Badge color={isValid ? "emerald" : "rose"} icon={isValid ? CheckCircle2 : AlertCircle}>
                  {isValid ? "Validated" : "Balance Required"}
                </Badge>
              </div>
              <Text className="text-xs">Verify numbers against raw document evidence.</Text>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selection && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl animate-in slide-in-from-right-4">
                <MousePointer2 className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-blue-700">Selected: {selection}</span>
              </div>
            )}
            <Button 
              icon={Save} 
              disabled={!isValid}
              onClick={() => onSave({ ...rawData, ...formData })}
              className={isValid ? "bg-slate-900 hover:bg-slate-800 border-none text-white font-black px-8 py-6 rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-95" : "bg-slate-300"}
            >
              COMMIT VERIFIED DATA
            </Button>
          </div>
        </div>

        <Grid numItemsLg={3} className="gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card className="rounded-3xl border-none shadow-xl shadow-slate-200/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-blue-600" />
                  <Title>Financial Identities</Title>
                </div>
                <Badge color="slate" icon={Hash}>Summary</Badge>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <Text className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Revenue Chain</Text>
                  {[
                  { id: 'total_revenue', label: 'Reported Total Revenue' },
                  { id: 'faac', label: 'FAAC Share' },
                  { id: 'igr', label: 'Independent Revenue (IGR)' },
                  { id: 'grants', label: 'Aid & Grants' },
                  { id: 'capital_receipts', label: 'Capital Receipts' },
                ].map(field => (
                  <div key={field.id} className="relative group">
                    <Flex className="mb-1">
                      <label className="text-xs font-bold text-slate-700">{field.label}</label>
                      <button 
                        onClick={() => assignSelection(field.id)}
                        disabled={!selection}
                        className={clsx(
                          "px-2 py-0.5 rounded text-[9px] font-black transition-all",
                          selection ? "bg-blue-600 text-white shadow-lg" : "bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100"
                        )}
                      >
                        {selection ? "ASSIGN SELECTION" : "READY TO MAP"}
                      </button>
                    </Flex>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₦</span>
                      <TextInput 
                        value={formData.summary[field.id]?.toString() || ''}
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
                          <span className="truncate max-w-[250px]">{formData.summarySources[field.id]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                </div>

                <Divider />

                <div className="space-y-4">
                <Text className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Expenditure Chain</Text>
                {[
                  { id: 'total_expenditure', label: 'Reported Total Expenditure' },
                  { id: 'personnel_cost', label: 'Personnel Cost' },
                  { id: 'other_recurrent_costs', label: 'Recurrent (Overhead)' },
                  { id: 'capital_expenditure', label: 'Capital Expenditure' },
                ].map(field => (
                  <div key={field.id} className="relative group">
                    <Flex className="mb-1">
                      <label className="text-xs font-bold text-slate-700">{field.label}</label>
                      <button 
                        onClick={() => assignSelection(field.id)}
                        disabled={!selection}
                        className={clsx(
                          "px-2 py-0.5 rounded text-[9px] font-black transition-all",
                          selection ? "bg-blue-600 text-white shadow-lg" : "bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100"
                        )}
                      >
                        {selection ? "ASSIGN SELECTION" : "READY TO MAP"}
                      </button>
                    </Flex>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₦</span>
                      <TextInput 
                        value={formData.summary[field.id]?.toString() || ''}
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

            <Card className={clsx("rounded-3xl border-2 transition-all", formData.isOfficialError ? "border-amber-500 bg-amber-50/20 shadow-lg shadow-amber-100" : "border-slate-100 shadow-sm")}>
              <Flex className="mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={clsx("w-5 h-5", formData.isOfficialError ? "text-amber-600" : "text-slate-400")} />
                  <Title className="text-lg">Confirmed Source Error</Title>
                </div>
                <input 
                  type="checkbox" 
                  checked={formData.isOfficialError}
                  onChange={(e) => setFormData({...formData, isOfficialError: e.target.checked})}
                  className="w-5 h-5 accent-amber-600"
                />
              </Flex>
              <Text className="text-xs mb-4 text-slate-500 font-medium italic">
                "I verify that these numbers are extracted correctly but do not sum up in the official government PDF."
              </Text>
              {formData.isOfficialError && (
                <textarea 
                  placeholder="Audit Note: Explain the internal mismatch (e.g., 'The sum of Personnel + Overhead + Capital is ₦1.4B less than the reported Total Expenditure on page 5')."
                  className="w-full p-4 bg-white border border-amber-200 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-amber-500/20 h-32 leading-relaxed"
                  value={formData.errorExplanation}
                  onChange={(e) => setFormData({...formData, errorExplanation: e.target.value})}
                />
              )}
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Grid numItemsMd={2} className="gap-6">
              <Card className="h-[calc(100vh-250px)] flex flex-col p-0 overflow-hidden rounded-3xl border-slate-200 shadow-xl shadow-slate-200/50">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4">
                  <Flex items-center justify-between>
                    <div>
                      <Title className="text-slate-900">Source Document</Title>
                      <Text className="text-[10px]">Highlight numbers to map them.</Text>
                    </div>
                    <Badge size="xs" color="blue">Live Audit</Badge>
                  </Flex>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Search document text..."
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
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
                        className={clsx(
                          "hover:bg-white/5 px-2 transition-colors",
                          isAssigned && "text-blue-300 border-l-2 border-blue-500/50",
                          isHighlighted && "bg-blue-500/20 text-blue-100 border-l-4 border-blue-500 font-bold",
                          isSearchMatch && "bg-yellow-500/20 text-yellow-200"
                        )}
                      >
                        {line}
                      </div>
                    );
                  })}
                </div>
              </Card>

              <div className="space-y-6 h-[calc(100vh-250px)] overflow-y-auto pr-2">
                <Card className="rounded-3xl border-none shadow-xl shadow-slate-200/50 bg-white p-6">
                  <div className="flex items-center gap-2 mb-6 text-blue-600">
                    <RefreshCw className="w-5 h-5 animate-spin-slow" />
                    <Title className="text-slate-900">Unmapped Numbers</Title>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {candidatePool.slice(0, 50).map((num, i) => (
                      <button 
                        key={i}
                        onClick={() => setSelection(num)}
                        className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-mono font-bold text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                      >
                        ₦ {num}
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className="rounded-3xl p-6 shadow-xl shadow-slate-200/50">
                  <Title className="mb-6">Forensic Checksums</Title>
                  <div className="space-y-6">
                    <div>
                      <Flex className="mb-2">
                        <Text className="text-[10px] font-bold uppercase tracking-wider">Revenue Equilibrium</Text>
                        <Badge color={balance.isRevenueBalanced ? "emerald" : "rose"} size="xs">
                          {balance.isRevenueBalanced ? "BALANCED" : "DISCREPANCY"}
                        </Badge>
                      </Flex>
                      <div className="flex items-center gap-2">
                        <Tracker data={[{ color: balance.isRevenueBalanced ? 'emerald' : 'rose' }]} className="flex-1 h-1.5" />
                        <span className="text-[10px] font-mono font-bold text-slate-500 whitespace-nowrap">{formatCurrency(balance.revenueDiff)}</span>
                      </div>
                    </div>

                    <div>
                      <Flex className="mb-2">
                        <Text className="text-[10px] font-bold uppercase tracking-wider">Expenditure Equilibrium</Text>
                        <Badge color={balance.isExpenditureBalanced ? "emerald" : "rose"} size="xs">
                          {balance.isExpenditureBalanced ? "BALANCED" : "DISCREPANCY"}
                        </Badge>
                      </Flex>
                      <div className="flex items-center gap-2">
                        <Tracker data={[{ color: balance.isExpenditureBalanced ? 'emerald' : 'rose' }]} className="flex-1 h-1.5" />
                        <span className="text-[10px] font-mono font-bold text-slate-500 whitespace-nowrap">{formatCurrency(balance.expenditureDiff)}</span>
                      </div>
                    </div>

                    <div>
                      <Flex className="mb-2">
                        <Text className="text-[10px] font-bold uppercase tracking-wider">Admin vs Summary</Text>
                        <Badge color={balance.isMdaIntegrated ? "emerald" : "rose"} size="xs">
                          {balance.isMdaIntegrated ? "MATCH" : "MISMATCH"}
                        </Badge>
                      </Flex>
                      <div className="flex items-center gap-2">
                        <Tracker data={[{ color: balance.isMdaIntegrated ? 'emerald' : 'rose' }]} className="flex-1 h-1.5" />
                        <span className="text-[10px] font-mono font-bold text-slate-500 whitespace-nowrap">{formatCurrency(balance.mdaDiff)}</span>
                      </div>
                    </div>

                    <div>
                      <Flex className="mb-2">
                        <Text className="text-[10px] font-bold uppercase tracking-wider">Functional vs Summary</Text>
                        <Badge color={Math.abs(balance.sectorDiff) < 1000 ? "emerald" : "rose"} size="xs">
                          {Math.abs(balance.sectorDiff) < 1000 ? "MATCH" : "MISMATCH"}
                        </Badge>
                      </Flex>
                      <div className="flex items-center gap-2">
                        <Tracker data={[{ color: Math.abs(balance.sectorDiff) < 1000 ? 'emerald' : 'rose' }]} className="flex-1 h-1.5" />
                        <span className="text-[10px] font-mono font-bold text-slate-500 whitespace-nowrap">{formatCurrency(balance.sectorDiff)}</span>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100">
                      <Callout title="Audit Result" color={isValid ? "emerald" : "rose"} icon={isValid ? CheckCircle2 : AlertCircle} className="text-[10px]">
                        {isValid ? "All financial identities are accounted for." : "The current selection does not balance."}
                      </Callout>
                    </div>
                  </div>
                </Card>
              </div>
            </Grid>
          </div>
        </Grid>
      </div>
    </div>
  );
}
