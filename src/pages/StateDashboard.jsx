import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useBudget } from '../data/BudgetContext';
import { 
  AlertCircle, TrendingUp, Users, Database, CheckCircle2, X, ArrowRight, 
  AlertTriangle, Coins, TrendingDown, Users2, Search, Download, 
  FileText, PieChart, Building2, ChevronRight, Landmark, Share2,
  Target, Wallet, Receipt, ShieldCheck, Scale, FileSearch, Sparkles,
  History, Eye, FileJson, Loader2
} from 'lucide-react';
import { clsx } from 'clsx';
import AIChatbot from '../components/AIChatbot';
import ShareButton from '../components/ShareButton';
import SourceInspector from '../components/SourceInspector';
import { Badge, Title, Text, Card } from '@tremor/react';
import { storage, BUCKET_ID } from '../utils/appwrite';

const formatCurrency = (val) => {
  if (!val || val === 0) return '₦0.00';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
};

const formatCompact = (val) => {
  if (!val || val === 0) return '₦0';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(val);
};

// Heuristic population estimate for per-capita calculations
const getEstimatedPopulation = (state) => {
  const populations = {
    'Kano': 15000000,
    'Lagos': 17000000,
    'Kaduna': 10000000,
    'Rivers': 8000000
  };
  return populations[state] || 5000000;
};

// Animated counter component
const AnimatedValue = ({ value, formatter = formatCurrency, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 1500;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    let step = 0;
    
    const timer = setInterval(() => {
      step++;
      current += increment;
      if (step >= steps) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <span className={className}>{formatter(displayValue)}</span>;
};

// Progress bar component
const ProgressBar = ({ value, max, color = 'emerald', label, sublabel }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const colorClasses = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    indigo: 'bg-indigo-500'
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">{sublabel}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={clsx("h-full rounded-full transition-all duration-1000 ease-out", colorClasses[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Metric card component
const MetricCard = ({ title, value, subtitle, icon, color = 'emerald', onClick, trend, id }) => {
  const IconComponent = icon;
  const colorClasses = {
    emerald: 'from-emerald-500 to-emerald-600',
    blue: 'from-blue-500 to-blue-600',
    amber: 'from-amber-500 to-amber-600',
    indigo: 'from-indigo-500 to-indigo-600',
    rose: 'from-rose-500 to-rose-600'
  };
  
  return (
    <div 
      id={id}
      onClick={onClick}
      className={clsx(
        "group bg-white rounded-2xl p-6 border border-slate-200 transition-all duration-300",
        onClick && "cursor-pointer hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/5"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={clsx(
          "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
          colorClasses[color]
        )}>
          <IconComponent className="w-6 h-6 text-white" />
        </div>
        {id && (
          <ShareButton 
            targetId={id} 
            fileName={`${title.toLowerCase().replace(/\s+/g, '-')}`}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          />
        )}
      </div>
      
      <div className="space-y-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        <p className="text-lg sm:text-xl font-bold text-slate-900 break-words leading-snug">
          <AnimatedValue value={value} formatter={formatCurrency} />
        </p>
        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
      
      {trend && (
        <div className="mt-4 flex items-center gap-1.5 text-sm">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span className="text-emerald-600 font-medium">{trend}</span>
        </div>
      )}
    </div>
  );
};

// Donut chart using SVG
const SimpleDonutChart = ({ data, colors }) => {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  
  // Calculate all paths beforehand without mutation
  const paths = data.reduce((acc, item, index) => {
    const prevAngle = acc.currentAngle;
    const percentage = (item.value / total) * 100;
    const angle = (percentage / 100) * 360;
    const x1 = 50 + 40 * Math.cos((prevAngle * Math.PI) / 180);
    const y1 = 50 + 40 * Math.sin((prevAngle * Math.PI) / 180);
    const x2 = 50 + 40 * Math.cos(((prevAngle + angle) * Math.PI) / 180);
    const y2 = 50 + 40 * Math.sin(((prevAngle + angle) * Math.PI) / 180);
    const largeArc = angle > 180 ? 1 : 0;
    
    const pathData = [
      `M 50 50`,
      `L ${x1} ${y1}`,
      `A 40 40 0 ${largeArc} 1 ${x2} ${y2}`,
      `Z`
    ].join(' ');
    
    acc.paths.push({ pathData, color: colors[index % colors.length] });
    acc.currentAngle = prevAngle + angle;
    return acc;
  }, { paths: [], currentAngle: 0 });
  
  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
        {paths.paths.map((path, index) => (
          <path
            key={index}
            d={path.pathData}
            fill={path.color}
            stroke="white"
            strokeWidth="2"
            className="hover:opacity-80 transition-opacity cursor-pointer"
          />
        ))}
        <circle cx="50" cy="50" r="25" fill="white" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-slate-500">Total</span>
        <span className="text-lg font-bold text-slate-900">{formatCompact(total)}</span>
      </div>
    </div>
  );
};

// Audit Trail Modal Component
const AuditTrailModal = ({ audit, isOpen, onClose, stateName }) => {
  if (!isOpen || !audit) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className={clsx(
              "w-12 h-12 rounded-2xl flex items-center justify-center",
              audit.reconciled ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
            )}>
              <FileSearch className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">Audit Trail: {stateName}</h3>
              <p className="text-sm text-slate-500 font-medium">Automatic mathematical verification report</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Integrity Score</p>
              <p className={clsx("text-3xl font-black", audit.integrity_score > 90 ? "text-emerald-600" : "text-rose-600")}>
                {audit.integrity_score || (audit.reconciled ? 100 : 0)}/100
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Issues Found</p>
              <p className="text-3xl font-black text-slate-900">{audit.errors?.length || 0}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
              <div className="mt-1">
                <Badge color={audit.reconciled ? "emerald" : "rose"} size="xl">
                  {audit.reconciled ? "PLATINUM" : "RECONCILING"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Title className="text-lg">Detailed Discrepancies</Title>
            {audit.errors && audit.errors.length > 0 ? (
              audit.errors.map((err, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-rose-100 bg-rose-50/30 flex gap-4">
                  <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
                    <Scale className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-rose-900 uppercase tracking-tight">{err.code.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-rose-700 mt-1 font-mono leading-relaxed">{err.message}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center bg-emerald-50/30 rounded-[2rem] border-2 border-dashed border-emerald-100">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <p className="font-bold text-emerald-900">Zero Mathematical Errors</p>
                <p className="text-sm text-emerald-600 mt-1 max-w-xs mx-auto">This document is mathematically sound. All parent totals match the sum of their constituent parts.</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <p className="text-xs font-bold uppercase tracking-widest">Independent Audit Engine v2.0</p>
          </div>
          <p className="text-[10px] text-slate-400">Extracted: {new Date(audit.extraction_date).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
};

// MDA Row with expansion for sub-units
const MDARow = ({ mda, onSelect, formatCompact, errors = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasUnits = mda.units && mda.units.length > 0;
  
  // Find errors for this specific MDA
  const mdaError = errors.find(e => e.message?.includes(mda.code));

  return (
    <>
      <tr 
        className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
        onClick={() => onSelect(mda)}
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            {hasUnits && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <ChevronRight className={clsx("w-4 h-4 text-slate-400 transition-transform", isExpanded && "rotate-90")} />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900">{mda.name}</p>
                {mdaError && (
                  <div className="p-1 bg-rose-100 text-rose-600 rounded-md" title="Reconciliation Error">
                    <AlertTriangle className="w-3 h-3" />
                  </div>
                )}
                {mda.provenance?.page && (
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded border border-emerald-100">
                    VERIFIED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono">{mda.code}</p>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 text-right text-sm text-slate-600">{formatCompact(mda.personnel)}</td>
        <td className="px-6 py-4 text-right text-sm text-slate-600">{formatCompact(mda.overhead)}</td>
        <td className="px-6 py-4 text-right text-sm text-slate-600">{formatCompact(mda.capital)}</td>
        <td className="px-6 py-4 text-right">
          <span className={clsx(
            "px-3 py-1 text-sm font-bold rounded-lg",
            mdaError ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-blue-50 text-blue-700"
          )}>
            {formatCompact(mda.total)}
          </span>
        </td>
      </tr>
      {isExpanded && hasUnits && (
        <tr className="bg-slate-50/30">
          <td colSpan="5" className="px-12 py-4">
            <div className="space-y-3 border-l-2 border-slate-200 pl-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Administrative Units</p>
              {mda.units.map((unit, idx) => (
                <div key={idx} className="flex items-center justify-between group/unit">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{unit.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{unit.code}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-slate-600">{formatCompact(unit.total)}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect({ ...unit, pageNumber: unit.provenance?.page });
                      }}
                      className="opacity-0 group-hover/unit:opacity-100 text-[10px] font-bold text-blue-600 hover:underline"
                    >
                      VIEW SOURCE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default function StateDashboard() {
  const { stateId } = useParams();
  const { states, isInitialized } = useBudget();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMDA, setSelectedMDA] = useState(null);
  const [summaryEvidence, setSummaryEvidence] = useState(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'mdas', 'search', 'audit', 'pedigree'
  const [fullText, setFullText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [verificationMode, setVerificationMode] = useState('pdf'); // 'pdf', 'raw', 'process'

  useEffect(() => {
    if (isInitialized) {
      const stateInfo = states.find(s => s.id === stateId);
      if (stateInfo) {
        setData(stateInfo.data);
      } else {
        setData(null);
      }
    }
  }, [stateId, states, isInitialized]);

  // Fetch full text for universal search
  useEffect(() => {
    if ((activeTab === 'search' || verificationMode === 'raw') && data?.text_file_id && !fullText) {
      setIsSearching(true);
      const url = storage.getFileDownload(BUCKET_ID, data.text_file_id);
      fetch(url)
        .then(res => res.text())
        .then(text => {
          setFullText(text);
          setIsSearching(false);
        })
        .catch(err => {
          console.error("Text fetch failed", err);
          setIsSearching(false);
        });
    }
  }, [activeTab, verificationMode, data?.text_file_id, fullText]);

  useEffect(() => {
    if (activeTab !== 'search') return;
    if (!data?.text_file_id) return;
    if (fullText) return;
    setIsSearching(true);
    const url = storage.getFileView(BUCKET_ID, data.text_file_id);
    fetch(url)
      .then(res => res.text())
      .then(text => {
        setFullText(text);
        setIsSearching(false);
      })
      .catch(err => {
        console.error("Text view fetch failed", err);
        setIsSearching(false);
      });
  }, [activeTab, data?.text_file_id, fullText]);

  const summaryPages = useMemo(() => {
    if (!data?.summaryPages) return {};
    try {
      return typeof data.summaryPages === 'string' ? JSON.parse(data.summaryPages) : data.summaryPages;
    } catch (e) {
      return {};
    }
  }, [data]);

  const handleSummaryClick = (field, label) => {
    const page = summaryPages[field];
    if (page) {
      setSummaryEvidence({ field, label, pageNumber: page });
      setSelectedMDA(null);
    }
  };

  const filteredMDAs = useMemo(() => {
    if (!data) return [];
    return data.mdas.filter(mda => 
      mda.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mda.code.includes(searchQuery)
    );
  }, [data, searchQuery]);

  const exportToCSV = () => {
    if (!data) return;
    const headers = ["Code", "MDA Name", "Personnel", "Overhead", "Capital", "Total"];
    const rows = data.mdas.map(m => [
      `"${m.code}"`,
      `"${m.name}"`,
      m.personnel,
      m.overhead,
      m.capital,
      m.total
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${data.state}_budget_${data.year}.csv`);
    link.click();
  };

  const validation = useMemo(() => {
    if (!data) return null;
    const anomalyMDAs = data.mdas.filter(m => {
      const sum = m.personnel + m.overhead + m.capital;
      return Math.abs(sum - m.total) > 100 && sum > 0;
    });
    return {
      anomalies: anomalyMDAs.length,
      anomalyList: anomalyMDAs
    };
  }, [data]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
          <span>Loading budget data...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center bg-white rounded-3xl shadow-sm border border-slate-200 p-12 max-w-xl mx-auto">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">State Data Not Found</h2>
          <p className="text-slate-500 mb-6">The state budget you are looking for has not been uploaded yet or is still being processed.</p>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const capitalRatio = summary.total_expenditure > 0 
    ? (summary.capital_expenditure / summary.total_expenditure) * 100 
    : 0;
  
  const pop = getEstimatedPopulation(data.state);
  const perCapita = summary.total_expenditure / pop;

  const revenueData = [
    { name: 'FAAC', value: summary.faac || 0, color: '#10b981' },
    { name: 'IGR', value: summary.igr || 0, color: '#3b82f6' },
    { name: 'Grants', value: summary.grants || 0, color: '#f59e0b' },
    { name: 'Capital', value: summary.capital_receipts || 0, color: '#ef4444' }
  ].filter(d => d.value > 0);

  const topSectors = data.sectors
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const totalSectorAmount = topSectors.reduce((acc, s) => acc + s.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <AIChatbot budgetData={data} />
      
      <AuditTrailModal 
        audit={data.audit} 
        stateName={data.state} 
        isOpen={isAuditModalOpen} 
        onClose={() => setIsAuditModalOpen(false)} 
      />

      {/* Source Evidence Sidebar */}
      {(summaryEvidence || selectedMDA) && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[520px] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Intelligence Sidebar</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Multi-Mode Verification</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setSummaryEvidence(null);
                setSelectedMDA(null);
              }}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {[
              { id: 'pdf', label: 'OFFICIAL PDF', icon: FileText },
              { id: 'raw', label: 'RAW OCR TEXT', icon: Search },
              { id: 'process', label: 'PROCESS LOG', icon: History }
            ].map(mode => (
              <button 
                key={mode.id}
                onClick={() => setVerificationMode(mode.id)}
                className={clsx(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all whitespace-nowrap",
                  verificationMode === mode.id ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-100"
                )}
              >
                <mode.icon className="w-3 h-3" />
                {mode.label}
              </button>
            ))}
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="p-4 bg-slate-900 rounded-2xl text-white">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Context</p>
              <p className="text-lg font-bold">{(summaryEvidence || selectedMDA).name || summaryEvidence?.label}</p>
              <p className="text-sm font-mono text-slate-400">{(summaryEvidence || selectedMDA).code || ""}</p>
              {(summaryEvidence || selectedMDA).provenance?.line_text && (
                <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/10 italic text-xs text-slate-300">
                  "{ (summaryEvidence || selectedMDA).provenance.line_text }"
                </div>
              )}
            </div>

            <div className="h-[500px] rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 relative">
              {verificationMode === 'pdf' && data.pdf_file_id && (
                <SourceInspector 
                  pdfFileId={data.pdf_file_id} 
                  pageNumber={summaryEvidence?.pageNumber || selectedMDA?.pageNumber || selectedMDA?.provenance?.page || 1} 
                />
              )}

              {verificationMode === 'raw' && (
                <div className="h-full flex flex-col">
                  {isSearching ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4">
                      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                      <p className="text-xs text-slate-500 font-bold">Loading Raw Text...</p>
                    </div>
                  ) : (
                    <div className="flex-1 p-6 font-mono text-[11px] leading-relaxed bg-slate-900 text-slate-400 overflow-y-auto whitespace-pre-wrap">
                      {fullText || "No raw text extract available."}
                    </div>
                  )}
                </div>
              )}

              {verificationMode === 'process' && (
                <div className="h-full p-6 font-mono text-[11px] leading-relaxed bg-slate-50 text-slate-600 overflow-y-auto">
                  <Title className="text-xs mb-4">Pipeline Execution Log</Title>
                  <pre className="whitespace-pre-wrap">{data.process_logs || "No logs available."}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Intelligence Tab Switcher */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'overview', label: 'Overview', icon: PieChart },
            { id: 'mdas', label: 'MDA Breakdown', icon: Building2 },
            { id: 'search', label: 'Universal Search', icon: Search },
            { id: 'audit', label: 'Audit Trail', icon: ShieldCheck },
            { id: 'pedigree', label: 'Data Pedigree', icon: History }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20"
                  : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'overview' && (
            <>
              {/* Data Integrity / Transparency Score Banner */}
              {data.audit && (
                <div className={clsx(
                  "mb-8 rounded-2xl p-6 border flex items-center justify-between transition-all hover:shadow-lg cursor-pointer",
                  data.audit.reconciled ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"
                )} onClick={() => setActiveTab('audit')}>
                  <div className="flex items-center gap-4">
                    <div className={clsx(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      data.audit.reconciled ? "bg-emerald-100" : "bg-rose-100"
                    )}>
                      {data.audit.reconciled ? <ShieldCheck className="w-6 h-6 text-emerald-600" /> : <AlertTriangle className="w-6 h-6 text-rose-600" />}
                    </div>
                    <div>
                      <h3 className={clsx("text-lg font-bold", data.audit.reconciled ? "text-emerald-900" : "text-rose-900")}>
                        {data.audit.reconciled ? "High Integrity Budget" : "Data Reconciliation Alert"}
                      </h3>
                      <p className={clsx("text-sm", data.audit.reconciled ? "text-emerald-700" : "text-rose-700")}>
                        {data.audit.reconciled 
                          ? "Every figure in this dashboard matches the sub-totals in the official document." 
                          : `Discrepancy detected: ${data.audit.errors?.[0]?.message || "Unreconciled figures found in source."}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Integrity Score</p>
                    <div className="flex items-center gap-2 justify-end">
                      <span className={clsx("text-2xl font-black", data.audit.reconciled ? "text-emerald-600" : "text-rose-600")}>
                        {data.audit.integrity_score || (data.audit.reconciled ? 100 : 0)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  id="metric-total"
                  title="Total Budget"
                  value={summary.total_expenditure}
                  subtitle="Approved expenditure"
                  icon={Wallet}
                  color="emerald"
                  trend="Balanced"
                  onClick={() => handleSummaryClick('total_expenditure', 'Total Expenditure')}
                />
                <MetricCard
                  id="metric-revenue"
                  title="Total Revenue"
                  value={summary.total_revenue}
                  subtitle="Projected income"
                  icon={Receipt}
                  color="blue"
                  onClick={() => handleSummaryClick('total_revenue', 'Total Revenue')}
                />
                <MetricCard
                  id="metric-igr"
                  title="Internal Revenue"
                  value={summary.igr}
                  subtitle={`${((summary.igr / (summary.recurrent_revenue || 1)) * 100).toFixed(1)}% of revenue base`}
                  icon={Coins}
                  color="amber"
                  onClick={() => handleSummaryClick('igr', 'Internal Revenue (IGR)')}
                />
                <MetricCard
                  title="Per Capita"
                  value={perCapita}
                  subtitle="Budget per citizen"
                  icon={Users2}
                  color="indigo"
                />
              </div>

              {/* Main Content Grid */}
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column - Charts */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Revenue Breakdown */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">Revenue Sources</h3>
                          <p className="text-sm text-slate-500">Where the money comes from</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                        Inflows
                      </span>
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-6">
                      <SimpleDonutChart 
                        data={revenueData} 
                        colors={['#10b981', '#3b82f6', '#f59e0b', '#ef4444']}
                      />
                      <div className="space-y-4">
                        {revenueData.map((item, index) => (
                          <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-sm font-medium text-slate-700">{item.name}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-slate-900">{formatCurrency(item.value)}</p>
                              <p className="text-xs text-slate-500">
                                {((item.value / (summary.total_revenue || 1)) * 100).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Expenditure by Sector */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                          <Target className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">Top Expenditure Sectors</h3>
                          <p className="text-sm text-slate-500">Where the money goes</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => navigate(`/state/${stateId}/sectors`)}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        View All <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {topSectors.map((sector, index) => (
                        <ProgressBar
                          key={sector.name}
                          value={sector.amount}
                          max={totalSectorAmount}
                          color={['emerald', 'blue', 'indigo', 'amber', 'rose'][index]}
                          label={sector.name}
                          sublabel={formatCompact(sector.amount)}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column - Quick Actions & Summary */}
                <div className="space-y-6">
                  {/* Budget Health */}
                  <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-2xl shadow-slate-900/20">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="font-bold">Budget Health</h3>
                        <p className="text-sm text-slate-400">Verification status</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-3 border-b border-white/10">
                        <span className="text-sm text-slate-300">Data Integrity</span>
                        <span className={clsx("text-sm font-bold", data.audit?.reconciled ? "text-emerald-400" : "text-amber-400")}>
                          {data.audit?.reconciled ? "Platinum" : "Reconciling"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-white/10">
                        <span className="text-sm text-slate-300">Balance Check</span>
                        <span className="text-sm font-bold text-emerald-400">
                          {Math.abs(summary.total_expenditure - summary.total_revenue) < 1000 ? 'Balanced' : 'Mismatch'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-white/10">
                        <span className="text-sm text-slate-300">Capital Ratio</span>
                        <span className="text-sm font-bold text-blue-400">{capitalRatio.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <span className="text-sm text-slate-300">Total MDAs</span>
                        <span className="text-sm font-bold text-white">{data.mdas.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Navigation */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <h3 className="font-bold text-slate-900 mb-4">Quick Links</h3>
                    <div className="space-y-2">
                      <button 
                        onClick={() => setActiveTab('mdas')}
                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-slate-900">MDA Directory</p>
                            <p className="text-xs text-slate-500">All ministries & agencies</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                      </button>
                      
                      <button 
                        onClick={() => navigate(`/state/${stateId}/sectors`)}
                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                            <PieChart className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-slate-900">Sector Analysis</p>
                            <p className="text-xs text-slate-500">Detailed breakdown by sector</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'mdas' && (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">All Funding MDAs</h3>
                  <p className="text-sm text-slate-500">Every ministry, department, and agency allocation</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search ministries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all w-full sm:w-80"
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Agency</th>
                      <th className="px-8 py-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Personnel</th>
                      <th className="px-8 py-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Overhead</th>
                      <th className="px-8 py-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Capital</th>
                      <th className="px-8 py-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMDAs.map((mda) => (
                      <MDARow 
                        key={mda.code} 
                        mda={mda} 
                        onSelect={setSelectedMDA} 
                        formatCompact={formatCompact} 
                        errors={data.audit?.errors}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/50 min-h-[600px] flex flex-col p-0 overflow-hidden">
              <div className="p-8 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                    <Search className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Universal Document Search</h2>
                    <p className="text-sm text-slate-500">Query all 800+ pages of raw extracted text from the official document.</p>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search for specific projects, items or keywords (e.g. 'Borehole', 'Toyota', 'School Construction')..."
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-lg font-medium outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all shadow-inner"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-900 p-8 font-mono text-sm leading-relaxed text-slate-400">
                {isSearching ? (
                  <div className="flex flex-col items-center justify-center h-full py-20 space-y-4">
                    <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                    <p className="text-slate-500">Syncing raw document text...</p>
                  </div>
                ) : !fullText ? (
                  <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-4">
                    <FileSearch className="w-16 h-16 text-slate-800" />
                    <p className="text-slate-600 max-w-xs">No text extract found for this state. Ensure 'text.txt' was uploaded.</p>
                  </div>
                ) : searchQuery.length < 3 ? (
                  <div className="flex flex-col items-center justify-center h-full py-20 text-center opacity-50">
                    <Sparkles className="w-12 h-12 mb-4" />
                    <p>Enter at least 3 characters to search the raw document...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fullText.split('\n').filter(line => line.toLowerCase().includes(searchQuery.toLowerCase())).map((line, idx) => {
                      const parts = line.split(new RegExp(`(${searchQuery})`, 'gi'));
                      return (
                        <div key={idx} className="p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors group cursor-pointer" onClick={() => {
                          // Find page number if mentioned in line or nearby
                          const pageMatch = line.match(/Page\s+(\d+)/i);
                          setSelectedMDA({ name: 'Search Match', pageNumber: pageMatch ? parseInt(pageMatch[1]) : 1, provenance: { line_text: line } });
                        }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-500">MATCH {idx + 1}</span>
                            <span className="text-[10px] text-slate-600 opacity-0 group-hover:opacity-100">CLICK TO JUMP IN PDF</span>
                          </div>
                          <p className="text-slate-300">
                            {parts.map((part, i) => (
                              <span key={i} className={part.toLowerCase() === searchQuery.toLowerCase() ? "bg-emerald-500/30 text-emerald-400 font-bold" : ""}>
                                {part}
                              </span>
                            ))}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-6">
              <AuditTrailModal 
                audit={data.audit} 
                stateName={data.state} 
                isOpen={true} 
                onClose={() => setActiveTab('overview')} 
              />
            </div>
          )}

          {activeTab === 'pedigree' && (
            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="rounded-[2rem] border-none shadow-xl bg-white p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black">Process Logs</h3>
                    <p className="text-sm text-slate-500">Pipeline execution history</p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-6 font-mono text-xs leading-relaxed h-[400px] overflow-y-auto text-slate-600 border border-slate-100">
                  <pre className="whitespace-pre-wrap">{data.process_logs || "No process logs recorded."}</pre>
                </div>
              </Card>

              <Card className="rounded-[2rem] border-none shadow-xl bg-white p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                    <Scale className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black">Document Metrics</h3>
                    <p className="text-sm text-slate-500">Structural complexity analysis</p>
                  </div>
                </div>
                <div className="space-y-6">
                  {data.document_metrics && Object.keys(data.document_metrics).length > 0 ? Object.entries(data.document_metrics).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">{key.replace(/_/g, ' ')}</span>
                      <span className="text-lg font-black text-slate-900">{typeof val === 'object' ? JSON.stringify(val) : val}</span>
                    </div>
                  )) : <p className="text-slate-400">No document metrics available.</p>}
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Trust Footer (Condensed) */}
        <div className="mt-16 pt-16 border-t border-slate-200">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg border border-slate-100">
                  <Database className="w-6 h-6 text-slate-900" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-900">Verified & Traceable Data Bundle</span>
              </div>
              <h2 className="text-3xl font-black mb-6 leading-tight text-slate-900">
                Every figure is traceable to the original source.
              </h2>
              <p className="text-slate-500 leading-relaxed mb-8">
                Our system uses layout-aware neural parsing to extract data from the official {data.year} {data.state} State Budget. 
                Triple-identity checksums ensure the figures match what was signed into law.
              </p>
              <div className="flex flex-wrap gap-3">
                {data.pdf_file_id && (
                  <button 
                    onClick={() => {
                      const url = storage.getFileDownload(BUCKET_ID, data.pdf_file_id);
                      window.open(url, '_blank');
                    }}
                    className="px-8 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xl shadow-slate-900/20"
                  >
                    <Download className="w-4 h-4" />
                    SOURCE PDF
                  </button>
                )}
                <button 
                  onClick={() => setIsAuditModalOpen(true)}
                  className="px-8 py-4 bg-white border border-slate-200 text-slate-900 font-black rounded-2xl hover:bg-slate-50 transition-all"
                >
                  AUDIT TRAIL
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'MDA Count', val: data.mdas.length },
                { label: 'Sectors', val: data.sectors.length },
                { label: 'Integrity', val: `${data.audit?.integrity_score || 100}%`, color: 'text-emerald-600' },
                { label: 'Fiscal Year', val: data.year }
              ].map((stat, i) => (
                <div key={i} className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className={clsx("text-3xl font-black", stat.color || "text-slate-900")}>{stat.val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
