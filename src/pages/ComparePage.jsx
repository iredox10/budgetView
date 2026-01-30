import { useState, useMemo } from 'react';
import { useBudget } from '../data/BudgetContext';
import { 
  Scale, ArrowRight, TrendingUp, TrendingDown, Building2, Users,
  Wallet, Target, PieChart, ChevronDown, Download, Share2,
  ArrowUpRight, ArrowDownRight, Minus, Info, BarChart3,
  Landmark, CheckCircle2, AlertCircle
} from 'lucide-react';
import { clsx } from 'clsx';

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

// Comparison Metric Card
const ComparisonCard = ({ 
  title, 
  stateA, 
  stateB, 
  valueA, 
  valueB, 
  format = "currency",
  description,
  invert = false 
}) => {
  const isHigherBetter = !invert;
  const isAWinner = isHigherBetter ? valueA > valueB : valueA < valueB;
  const isBWinner = isHigherBetter ? valueB > valueA : valueB < valueA;
  const isEqual = valueA === valueB;
  
  const displayValA = format === "currency" ? formatCurrency(valueA) : `${valueA.toFixed(1)}%`;
  const displayValB = format === "currency" ? formatCurrency(valueB) : `${valueB.toFixed(1)}%`;
  
  const diff = Math.abs(valueA - valueB);
  const diffPercent = ((diff / Math.max(valueA, valueB, 1)) * 100).toFixed(1);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-900">{title}</h3>
          {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
        </div>
        {!isEqual && (
          <div className={clsx(
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold",
            isAWinner ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
          )}>
            {isAWinner ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {diffPercent}% diff
          </div>
        )}
      </div>

      <div className="space-y-3">
        {/* State A */}
        <div className={clsx(
          "p-4 rounded-xl border-2 transition-colors",
          isAWinner ? "border-emerald-500 bg-emerald-50/50" : "border-slate-200 bg-slate-50"
        )}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stateA}</p>
            {isAWinner && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Higher
              </span>
            )}
          </div>
          <p className={clsx(
            "text-lg font-bold break-words leading-tight",
            isAWinner ? "text-emerald-700" : "text-slate-700"
          )}>
            {displayValA}
          </p>
        </div>

        {/* State B */}
        <div className={clsx(
          "p-4 rounded-xl border-2 transition-colors",
          isBWinner ? "border-blue-500 bg-blue-50/50" : "border-slate-200 bg-slate-50"
        )}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stateB}</p>
            {isBWinner && (
              <span className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Higher
              </span>
            )}
          </div>
          <p className={clsx(
            "text-lg font-bold break-words leading-tight",
            isBWinner ? "text-blue-700" : "text-slate-700"
          )}>
            {displayValB}
          </p>
        </div>
      </div>
    </div>
  );
};

// Progress bar comparison
const ComparisonBar = ({ label, valueA, valueB, max, colorA = "emerald", colorB = "blue" }) => {
  const percentA = Math.min((valueA / max) * 100, 100);
  const percentB = Math.min((valueB / max) * 100, 100);
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-4 text-sm">
          <span className="font-semibold text-emerald-600">{formatCompact(valueA)}</span>
          <span className="text-slate-300">|</span>
          <span className="font-semibold text-blue-600">{formatCompact(valueB)}</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={clsx("h-full rounded-full transition-all duration-700", `bg-${colorA}-500`)}
            style={{ width: `${percentA}%` }}
          />
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={clsx("h-full rounded-full transition-all duration-700", `bg-${colorB}-500`)}
            style={{ width: `${percentB}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// Custom bar chart
const ComparisonBarChart = ({ data, stateAName, stateBName }) => {
  const maxValue = Math.max(...data.flatMap(d => [d.valueA, d.valueB]));
  
  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">{item.label}</span>
          </div>
          <div className="space-y-1.5">
            {/* State A Bar */}
            <div className="flex items-center gap-3">
              <div className="w-24 text-xs font-semibold text-emerald-600 text-right">{stateAName}</div>
              <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-lg flex items-center justify-end px-2 transition-all duration-500"
                  style={{ width: `${Math.min((item.valueA / maxValue) * 100, 100)}%` }}
                >
                  <span className="text-xs font-bold text-white">{formatCompact(item.valueA)}</span>
                </div>
              </div>
            </div>
            {/* State B Bar */}
            <div className="flex items-center gap-3">
              <div className="w-24 text-xs font-semibold text-blue-600 text-right">{stateBName}</div>
              <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-lg flex items-center justify-end px-2 transition-all duration-500"
                  style={{ width: `${Math.min((item.valueB / maxValue) * 100, 100)}%` }}
                >
                  <span className="text-xs font-bold text-white">{formatCompact(item.valueB)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function ComparePage() {
  const { states } = useBudget();
  const [stateAId, setStateAId] = useState(states[0]?.id || '');
  const [stateBId, setStateBId] = useState(states[1]?.id || '');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'sectors', 'details'

  const stateA = states.find(s => s.id === stateAId);
  const stateB = states.find(s => s.id === stateBId);
  
  const dataA = stateA?.data;
  const dataB = stateB?.data;

  // Comparison metrics
  const metrics = useMemo(() => {
    if (!dataA || !dataB) return [];
    
    return [
      {
        title: 'Total Budget',
        description: 'Approved expenditure for fiscal year',
        valueA: dataA.summary.total_expenditure,
        valueB: dataB.summary.total_expenditure,
        format: 'currency'
      },
      {
        title: 'Total Revenue',
        description: 'Projected income from all sources',
        valueA: dataA.summary.total_revenue,
        valueB: dataB.summary.total_revenue,
        format: 'currency'
      },
      {
        title: 'Capital Expenditure',
        description: 'Investment in infrastructure & assets',
        valueA: dataA.summary.capital_expenditure,
        valueB: dataB.summary.capital_expenditure,
        format: 'currency'
      },
      {
        title: 'Personnel Costs',
        description: 'Salary and wage allocations',
        valueA: dataA.summary.personnel_cost,
        valueB: dataB.summary.personnel_cost,
        format: 'currency'
      },
      {
        title: 'Internal Revenue (IGR)',
        description: 'State-generated revenue',
        valueA: dataA.summary.igr,
        valueB: dataB.summary.igr,
        format: 'currency'
      },
      {
        title: 'FAAC Allocation',
        description: 'Federal allocation share',
        valueA: dataA.summary.faac,
        valueB: dataB.summary.faac,
        format: 'currency'
      }
    ];
  }, [dataA, dataB]);

  // Sector comparison data
  const sectorComparison = useMemo(() => {
    if (!dataA || !dataB) return [];
    
    const allSectors = Array.from(new Set([
      ...dataA.sectors.map(s => s.name),
      ...dataB.sectors.map(s => s.name)
    ]));

    return allSectors.map(name => {
      const sectorA = dataA.sectors.find(s => s.name === name);
      const sectorB = dataB.sectors.find(s => s.name === name);
      return {
        label: name,
        valueA: sectorA?.amount || 0,
        valueB: sectorB?.amount || 0,
        code: sectorA?.code || sectorB?.code
      };
    }).sort((a, b) => (b.valueA + b.valueB) - (a.valueA + a.valueB));
  }, [dataA, dataB]);

  // Key ratios
  const ratios = useMemo(() => {
    if (!dataA || !dataB) return [];
    
    return [
      {
        title: 'Capital Intensity',
        description: 'Capital spend as % of total budget',
        valueA: (dataA.summary.capital_expenditure / dataA.summary.total_expenditure) * 100,
        valueB: (dataB.summary.capital_expenditure / dataB.summary.total_expenditure) * 100,
        format: 'percent',
        higherIsBetter: true
      },
      {
        title: 'IGR Dependency',
        description: 'Self-generated revenue %',
        valueA: (dataA.summary.igr / dataA.summary.total_revenue) * 100,
        valueB: (dataB.summary.igr / dataB.summary.total_revenue) * 100,
        format: 'percent',
        higherIsBetter: true
      },
      {
        title: 'Personnel Ratio',
        description: 'Personnel costs as % of budget',
        valueA: (dataA.summary.personnel_cost / dataA.summary.total_expenditure) * 100,
        valueB: (dataB.summary.personnel_cost / dataB.summary.total_expenditure) * 100,
        format: 'percent',
        higherIsBetter: false
      },
      {
        title: 'Revenue Balance',
        description: 'Revenue vs expenditure ratio',
        valueA: (dataA.summary.total_revenue / dataA.summary.total_expenditure) * 100,
        valueB: (dataB.summary.total_revenue / dataB.summary.total_expenditure) * 100,
        format: 'percent',
        higherIsBetter: true
      }
    ];
  }, [dataA, dataB]);

  if (states.length < 2) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-3xl shadow-sm border border-slate-200 p-12 max-w-md">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Need More Data</h2>
          <p className="text-slate-500">
            At least two state budgets are required for comparison. Please add more states to the database.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                  <Scale className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">
                    State Comparison
                  </h1>
                  <p className="text-slate-500">
                    Side-by-side budget analysis across Nigerian states
                  </p>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all">
                <Download className="w-4 h-4" />
                Export Report
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all">
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        </div>

        {/* State Selectors */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
          <div className="grid md:grid-cols-3 gap-6 items-center">
            {/* State A Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                State A
              </label>
              <div className="relative">
                <select
                  value={stateAId}
                  onChange={(e) => setStateAId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  {states.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.year})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* VS Badge */}
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-black text-slate-400">VS</span>
              </div>
            </div>

            {/* State B Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                State B
              </label>
              <div className="relative">
                <select
                  value={stateBId}
                  onChange={(e) => setStateBId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  {states.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.year})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          {dataA && dataB && (
            <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Total MDAs</p>
                  <p className="text-sm font-bold text-slate-900">
                    {dataA.mdas.length} vs {dataB.mdas.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <PieChart className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Sectors</p>
                  <p className="text-sm font-bold text-slate-900">
                    {dataA.sectors.length} vs {dataB.sectors.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Fiscal Year</p>
                  <p className="text-sm font-bold text-slate-900">
                    {dataA.year} vs {dataB.year}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="text-sm font-bold text-slate-900">Verified Data</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        {dataA && dataB && (
          <div className="flex items-center gap-2 mb-8">
            {[
              { key: 'overview', label: 'Overview', icon: BarChart3 },
              { key: 'sectors', label: 'Sector Analysis', icon: PieChart },
              { key: 'details', label: 'Detailed Metrics', icon: Info }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  activeTab === tab.key
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Content Based on Tab */}
        {dataA && dataB && (
          <div className="space-y-8">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <>
                {/* Key Metrics Grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  {metrics.map((metric, index) => (
                    <ComparisonCard
                      key={index}
                      title={metric.title}
                      description={metric.description}
                      stateA={dataA.state}
                      stateB={dataB.state}
                      valueA={metric.valueA}
                      valueB={metric.valueB}
                      format={metric.format}
                    />
                  ))}
                </div>

                {/* Key Ratios */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Key Performance Ratios</h3>
                      <p className="text-sm text-slate-500">Comparative efficiency metrics</p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {ratios.map((ratio, index) => (
                      <ComparisonCard
                        key={index}
                        title={ratio.title}
                        description={ratio.description}
                        stateA={dataA.state}
                        stateB={dataB.state}
                        valueA={ratio.valueA}
                        valueB={ratio.valueB}
                        format={ratio.format}
                        invert={!ratio.higherIsBetter}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* SECTORS TAB */}
            {activeTab === 'sectors' && (
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Sector Comparison Chart */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                      <PieChart className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Sector Comparison</h3>
                      <p className="text-sm text-slate-500">Allocation by functional classification</p>
                    </div>
                  </div>
                  
                  <ComparisonBarChart 
                    data={sectorComparison.slice(0, 8)} 
                    stateAName={dataA.state}
                    stateBName={dataB.state}
                  />
                </div>

                {/* Top Sectors Table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                        <Landmark className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">Top Sectors</h3>
                        <p className="text-sm text-slate-500">Highest allocations by sector</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Sector</th>
                          <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">{dataA.state}</th>
                          <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">{dataB.state}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sectorComparison.slice(0, 10).map((sector, index) => (
                          <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-3">
                              <p className="font-medium text-slate-900">{sector.label}</p>
                              <p className="text-xs text-slate-500">{sector.code}</p>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <p className="font-semibold text-emerald-600">{formatCompact(sector.valueA)}</p>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <p className="font-semibold text-blue-600">{formatCompact(sector.valueB)}</p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* DETAILS TAB */}
            {activeTab === 'details' && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                      <Info className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Detailed Breakdown</h3>
                      <p className="text-sm text-slate-500">Complete fiscal comparison</p>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Metric</th>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-emerald-600">{dataA.state}</th>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-blue-600">{dataB.state}</th>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Difference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { label: 'Total Budget', field: 'total_expenditure' },
                        { label: 'Total Revenue', field: 'total_revenue' },
                        { label: 'Recurrent Revenue', field: 'recurrent_revenue' },
                        { label: 'FAAC Share', field: 'faac' },
                        { label: 'Internal Revenue (IGR)', field: 'igr' },
                        { label: 'Grants & Aids', field: 'grants' },
                        { label: 'Capital Receipts', field: 'capital_receipts' },
                        { label: 'Capital Expenditure', field: 'capital_expenditure' },
                        { label: 'Personnel Costs', field: 'personnel_cost' }
                      ].map((metric, index) => {
                        const valA = dataA.summary[metric.field] || 0;
                        const valB = dataB.summary[metric.field] || 0;
                        const diff = valA - valB;
                        const diffPercent = ((Math.abs(diff) / Math.max(valA, valB, 1)) * 100).toFixed(1);
                        
                        return (
                          <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900">{metric.label}</td>
                            <td className="px-6 py-4 text-right font-semibold text-slate-700">
                              {formatCurrency(valA)}
                            </td>
                            <td className="px-6 py-4 text-right font-semibold text-slate-700">
                              {formatCurrency(valB)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={clsx(
                                "text-sm font-semibold",
                                diff > 0 ? "text-emerald-600" : diff < 0 ? "text-blue-600" : "text-slate-400"
                              )}>
                                {diff > 0 ? '+' : ''}{formatCompact(Math.abs(diff))}
                                <span className="text-xs text-slate-400 ml-1">({diffPercent}%)</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-12 bg-slate-900 rounded-2xl p-8 text-white">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Info className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">About This Comparison</h3>
                <p className="text-slate-300 text-sm leading-relaxed max-w-2xl">
                  All figures are extracted from official state budget documents and verified for accuracy. 
                  Comparisons are based on approved budget estimates. Currency is in Nigerian Naira (₦).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button className="px-6 py-3 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors">
                View Methodology
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
