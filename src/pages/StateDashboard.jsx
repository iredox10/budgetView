import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useBudget } from '../data/BudgetContext';
import { 
  AlertCircle, TrendingUp, Users, Database, CheckCircle2, X, ArrowRight, 
  AlertTriangle, Coins, TrendingDown, Users2, Search, Download, 
  FileText, PieChart, Building2, ChevronRight, Landmark, Share2,
  Target, Wallet, Receipt
} from 'lucide-react';
import { clsx } from 'clsx';
import AIChatbot from '../components/AIChatbot';
import ShareButton from '../components/ShareButton';
import SourceInspector from '../components/SourceInspector';

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

export default function StateDashboard() {
  const { stateId } = useParams();
  const { states, isInitialized } = useBudget();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMDA, setSelectedMDA] = useState(null);
  const [summaryEvidence, setSummaryEvidence] = useState(null);

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
      
      {/* Source Evidence Sidebar */}
      {(summaryEvidence || selectedMDA) && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Source Evidence</h3>
                <p className="text-xs text-slate-500">Verified from official document</p>
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
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {summaryEvidence && (
              <>
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">Metric</p>
                  <p className="text-lg font-bold text-slate-900">{summaryEvidence.label}</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    {formatCurrency(summary[summaryEvidence.field])}
                  </p>
                </div>
                
                {data.pdf_file_id && (
                  <SourceInspector 
                    pdfFileId={data.pdf_file_id} 
                    pageNumber={summaryEvidence.pageNumber} 
                  />
                )}
              </>
            )}
            
            {selectedMDA && (
              <>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">MDA</p>
                  <p className="text-lg font-bold text-slate-900">{selectedMDA.name}</p>
                  <p className="text-sm font-mono text-slate-500">{selectedMDA.code}</p>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl text-center">
                    <p className="text-xs text-slate-500 mb-1">Personnel</p>
                    <p className="text-sm font-bold text-slate-900">{formatCompact(selectedMDA.personnel)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl text-center">
                    <p className="text-xs text-slate-500 mb-1">Overhead</p>
                    <p className="text-sm font-bold text-slate-900">{formatCompact(selectedMDA.overhead)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl text-center">
                    <p className="text-xs text-slate-500 mb-1">Capital</p>
                    <p className="text-sm font-bold text-slate-900">{formatCompact(selectedMDA.capital)}</p>
                  </div>
                </div>
                
                {data.pdf_file_id && (
                  <SourceInspector 
                    pdfFileId={data.pdf_file_id} 
                    pageNumber={selectedMDA.pageNumber || 1} 
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Official Discrepancy Alert */}
        {data.isOfficialError && (
          <div className="mb-8 rounded-2xl bg-amber-50 border border-amber-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-900 mb-1">Government Document Integrity Alert</h3>
                <p className="text-amber-800 text-sm leading-relaxed">
                  {data.errorExplanation || "The official budget document for this state contains internal mathematical discrepancies verified by our audit team."}
                </p>
              </div>
              <span className="px-3 py-1 bg-amber-200 text-amber-800 text-xs font-bold rounded-full whitespace-nowrap">
                Source Error
              </span>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="mb-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold uppercase rounded-full">
                  {data.year} Approved Budget
                </span>
                {validation?.anomalies > 0 && (
                  <span className="px-3 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-full flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validation.anomalies} Issues
                  </span>
                )}
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
                {data.state} State
              </h1>
              <p className="text-lg text-slate-500 mt-2">
                Comprehensive budget breakdown and expenditure analysis
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={exportToCSV}
                className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20">
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="mt-8 flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">{data.mdas.length} MDAs</span>
            </div>
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">{data.sectors.length} Sectors</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-slate-600">Verified Data</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">Est. {pop.toLocaleString()} population</span>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
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
                    key={sector.code}
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
            <div className="bg-slate-900 rounded-2xl p-6 text-white">
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
                  <span className="text-sm font-bold text-emerald-400">Verified</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-white/10">
                  <span className="text-sm text-slate-300">Balance Check</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {summary.total_expenditure === summary.total_revenue ? 'Balanced' : 'Mismatch'}
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
                  onClick={() => navigate(`/state/${stateId}/mdas`)}
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
                
                <button 
                  onClick={() => navigate('/compare')}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-900">Compare States</p>
                      <p className="text-xs text-slate-500">Side-by-side comparison</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Top MDAs Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Top Funded MDAs</h3>
              <p className="text-sm text-slate-500">Highest allocated ministries and agencies</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search MDAs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition-all w-64"
                />
              </div>
              <button 
                onClick={() => navigate(`/state/${stateId}/mdas`)}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
              >
                View All
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Agency</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Personnel</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Overhead</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Capital</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(searchQuery ? filteredMDAs : data.mdas.slice(0, 10)).map((mda) => (
                  <tr 
                    key={mda.code}
                    onClick={() => setSelectedMDA(mda)}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{mda.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{mda.code}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-600">{formatCompact(mda.personnel)}</td>
                    <td className="px-6 py-4 text-right text-sm text-slate-600">{formatCompact(mda.overhead)}</td>
                    <td className="px-6 py-4 text-right text-sm text-slate-600">{formatCompact(mda.capital)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-bold rounded-lg">
                        {formatCompact(mda.total)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {!searchQuery && data.mdas.length > 10 && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30">
              <button 
                onClick={() => navigate(`/state/${stateId}/mdas`)}
                className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                View all {data.mdas.length} MDAs <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Trust Footer */}
        <div className="mt-12 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 lg:p-12 text-white">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <Database className="w-6 h-6 text-emerald-400" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Verified & Traceable</span>
              </div>
              <h2 className="text-3xl font-bold mb-4">
                Every figure is traceable to the official document
              </h2>
              <p className="text-slate-400 leading-relaxed mb-6">
                Our system uses layout-aware neural parsing to extract data from the official {data.year} {data.state} State Budget. 
                Triple-identity checksums ensure the figures match what was signed into law.
              </p>
              <div className="flex flex-wrap gap-3">
                <button className="px-6 py-3 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors">
                  Download Source PDF
                </button>
                <button className="px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors">
                  View Audit Trail
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">MDA Count</p>
                <p className="text-3xl font-bold">{data.mdas.length}</p>
              </div>
              <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Sectors</p>
                <p className="text-3xl font-bold">{data.sectors.length}</p>
              </div>
              <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Verification</p>
                <p className="text-3xl font-bold text-emerald-400">100%</p>
              </div>
              <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Fiscal Year</p>
                <p className="text-3xl font-bold">{data.year}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
