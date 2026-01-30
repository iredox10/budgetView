import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useBudget } from '../data/BudgetContext';
import { 
  ArrowLeft, PieChart, Building2, BookOpen, Heart, Landmark, Users, 
  Construction, Shield, TreePine, Home, Car, Cpu, Sprout, Briefcase,
  ChevronRight, TrendingUp, Target, Wallet, Info, FileText,
  ArrowUpRight, ArrowDownRight
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

// Get appropriate icon for each sector
const getSectorIcon = (name) => {
  const n = name.toUpperCase();
  if (n.includes('EDUCATION') || n.includes('SCHOOL')) return BookOpen;
  if (n.includes('HEALTH') || n.includes('HOSPITAL') || n.includes('MEDICAL')) return Heart;
  if (n.includes('AGRIC') || n.includes('FARM')) return Sprout;
  if (n.includes('INFRA') || n.includes('WORKS') || n.includes('TRANSPORT')) return Construction;
  if (n.includes('SECURITY') || n.includes('POLICE') || n.includes('DEFENCE')) return Shield;
  if (n.includes('ENVIRONMENT') || n.includes('WATER')) return TreePine;
  if (n.includes('HOUSING') || n.includes('COMMUNITY')) return Home;
  if (n.includes('ECONOMIC') || n.includes('TRADE')) return Briefcase;
  if (n.includes('ENERGY') || n.includes('POWER')) return Cpu;
  if (n.includes('TOURISM') || n.includes('CULTURE') || n.includes('RECREATION')) return Car;
  return Landmark;
};

// Get color for sector based on rank/priority
const getSectorColor = (index) => {
  const colors = [
    { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', icon: 'text-emerald-600', progress: 'bg-emerald-500' },
    { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', icon: 'text-blue-600', progress: 'bg-blue-500' },
    { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600', icon: 'text-indigo-600', progress: 'bg-indigo-500' },
    { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-600', icon: 'text-violet-600', progress: 'bg-violet-500' },
    { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', icon: 'text-amber-600', progress: 'bg-amber-500' },
    { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-600', icon: 'text-rose-600', progress: 'bg-rose-500' },
    { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-600', icon: 'text-cyan-600', progress: 'bg-cyan-500' },
    { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', icon: 'text-slate-600', progress: 'bg-slate-500' },
  ];
  return colors[index % colors.length];
};

// Custom Donut Chart Component
const SectorDonutChart = ({ data, total }) => {
  const colors = ['#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4', '#64748b'];
  
  // Calculate paths
  const paths = data.slice(0, 8).reduce((acc, item, index) => {
    const prevAngle = acc.currentAngle;
    const percentage = (item.amount / total) * 100;
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
    
    acc.paths.push({ 
      pathData, 
      color: colors[index % colors.length],
      name: item.name,
      amount: item.amount,
      percentage: percentage.toFixed(1)
    });
    acc.currentAngle = prevAngle + angle;
    return acc;
  }, { paths: [], currentAngle: 0 });
  
  return (
    <div className="flex flex-col lg:flex-row items-center gap-8">
      <div className="relative w-64 h-64 flex-shrink-0">
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
          <circle cx="50" cy="50" r="30" fill="white" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-slate-400 mb-1">Total Budget</span>
          <span className="text-xl font-bold text-slate-900">{formatCompact(total)}</span>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex-1 w-full">
        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
          {paths.paths.map((path, index) => (
            <div key={index} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: path.color }}
                />
                <span className="text-sm font-medium text-slate-700 line-clamp-1">{path.name}</span>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-sm font-bold text-slate-900">{path.percentage}%</span>
                <span className="text-xs text-slate-400 ml-2">{formatCompact(path.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Horizontal Bar Chart Component
const SectorBarChart = ({ data, total }) => {
  const maxAmount = Math.max(...data.map(d => d.amount));
  
  return (
    <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
      {data.map((sector, index) => {
        const colors = getSectorColor(index);
        const percentage = ((sector.amount / maxAmount) * 100).toFixed(1);
        const budgetPercentage = ((sector.amount / total) * 100).toFixed(1);
        
        return (
          <div key={sector.code} className="group">
            <div className="flex items-center gap-3 mb-2">
              <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center", colors.bg)}>
                {renderSectorIcon(sector.name, clsx("w-4 h-4", colors.icon))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{sector.name}</p>
                <p className="text-xs text-slate-500">{formatCompact(sector.amount)}</p>
              </div>
              <span className={clsx("text-sm font-bold", colors.text)}>{budgetPercentage}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={clsx("h-full rounded-full transition-all duration-700 ease-out", colors.progress)}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Render icon component
const renderSectorIcon = (sectorName, className) => {
  const Icon = getSectorIcon(sectorName);
  return <Icon className={className} />;
};

// Sector Card Component
const SectorCard = ({ sector, index, totalBudget }) => {
  const colors = getSectorColor(index);
  const percentage = ((sector.amount / totalBudget) * 100).toFixed(1);
  const rank = index + 1;
  
  return (
    <div className={clsx(
      "group bg-white rounded-2xl p-6 border transition-all duration-300 hover:shadow-lg cursor-pointer",
      colors.border,
      "hover:shadow-" + colors.progress.replace('bg-', '') + "/10"
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center transition-colors", colors.bg)}>
          {renderSectorIcon(sector.name, clsx("w-6 h-6", colors.icon))}
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx("text-xs font-bold px-2 py-1 rounded-full", colors.bg, colors.text)}>
            #{rank}
          </span>
          <span className={clsx("text-sm font-bold", colors.text)}>{percentage}%</span>
        </div>
      </div>
      
      <div className="space-y-2">
        <p className="text-xs font-mono text-slate-400">{sector.code}</p>
        <h3 className="text-lg font-bold text-slate-900 leading-tight line-clamp-2 min-h-[3.5rem]">
          {sector.name}
        </h3>
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-500 mb-1">Total Allocation</p>
        <p className={clsx("text-xl font-bold", colors.text)}>{formatCurrency(sector.amount)}</p>
        
        {/* Progress bar showing relative to total */}
        <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={clsx("h-full rounded-full transition-all duration-500", colors.progress)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default function SectorAnalysis() {
  const { stateId } = useParams();
  const navigate = useNavigate();
  const { states, isInitialized } = useBudget();
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Get data directly from context
  const data = useMemo(() => {
    if (!isInitialized) return null;
    const stateInfo = states.find(s => s.id === stateId);
    return stateInfo ? stateInfo.data : null;
  }, [stateId, states, isInitialized]);

  // Sort sectors by amount
  const sortedSectors = useMemo(() => {
    if (!data) return [];
    return [...data.sectors].sort((a, b) => b.amount - a.amount);
  }, [data]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!data) return {};
    const sectors = sortedSectors;
    const totalExpenditure = data.summary?.total_expenditure || 0;
    
    return {
      totalSectors: sectors.length,
      totalBudget: totalExpenditure,
      topSector: sectors[0],
      averageAllocation: sectors.length > 0 ? sectors.reduce((acc, s) => acc + s.amount, 0) / sectors.length : 0,
      topSectorPercentage: sectors.length > 0 && totalExpenditure > 0 ? 
        ((sectors[0].amount / totalExpenditure) * 100).toFixed(1) : 0
    };
  }, [data, sortedSectors]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
          <span>Loading Sector Analysis...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center bg-white rounded-3xl shadow-sm border border-slate-200 p-12 max-w-xl mx-auto">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <PieChart className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Sector Data Not Found</h2>
          <p className="text-slate-500 mb-6">The sector analysis for this state is not available.</p>
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb & Back */}
        <div className="flex items-center gap-2 mb-6">
          <button 
            onClick={() => navigate(`/state/${stateId}`)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {data.state} Overview</span>
          </button>
        </div>

        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                  <PieChart className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">
                    Sector Analysis
                  </h1>
                  <p className="text-slate-500">
                    {data.state} State {data.year} Budget by Functional Classification
                  </p>
                </div>
              </div>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={clsx(
                  "px-4 py-2 text-sm font-semibold rounded-lg transition-colors",
                  viewMode === 'grid' 
                    ? "bg-emerald-100 text-emerald-700" 
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                Grid View
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={clsx(
                  "px-4 py-2 text-sm font-semibold rounded-lg transition-colors",
                  viewMode === 'list' 
                    ? "bg-emerald-100 text-emerald-700" 
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                List View
              </button>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sectors</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.totalSectors}</p>
          </div>
          
          <div className="bg-white rounded-2xl p-5 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Budget</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCompact(stats.totalBudget || 0)}</p>
          </div>
          
          <div className="bg-white rounded-2xl p-5 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Sector</p>
            </div>
            <p className="text-lg font-bold text-slate-900 truncate">{stats.topSector?.name || 'N/A'}</p>
            <p className="text-sm text-amber-600 font-semibold">{stats.topSectorPercentage}% of budget</p>
          </div>
          
          <div className="bg-white rounded-2xl p-5 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCompact(stats.averageAllocation || 0)}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Donut Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <PieChart className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Budget Distribution</h3>
                  <p className="text-sm text-slate-500">Percentage breakdown by sector</p>
                </div>
              </div>
            </div>
            <SectorDonutChart data={sortedSectors} total={stats.totalBudget || 1} />
          </div>
          
          {/* Bar Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Volume Comparison</h3>
                  <p className="text-sm text-slate-500">Relative allocation sizes</p>
                </div>
              </div>
            </div>
            <SectorBarChart data={sortedSectors} total={stats.totalBudget || 1} />
          </div>
        </div>

        {/* Sector Breakdown */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Detailed Sector Breakdown</h2>
            <p className="text-sm text-slate-500">{sortedSectors.length} sectors analyzed</p>
          </div>
          
          {viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedSectors.map((sector, index) => (
                <SectorCard 
                  key={sector.code}
                  sector={sector}
                  index={index}
                  totalBudget={stats.totalBudget || 1}
                />
              ))}
            </div>
          ) : (
            /* List View */
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Rank</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Sector</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Allocation</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">% of Budget</th>
                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Visual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedSectors.map((sector, index) => {
                    const colors = getSectorColor(index);
                    const percentage = ((sector.amount / (stats.totalBudget || 1)) * 100).toFixed(1);
                    
                    return (
                      <tr key={sector.code} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className={clsx(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                            colors.bg, colors.text
                          )}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", colors.bg)}>
                              {renderSectorIcon(sector.name, clsx("w-5 h-5", colors.icon))}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{sector.name}</p>
                              <p className="text-xs text-slate-500 font-mono">{sector.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="font-bold text-slate-900">{formatCurrency(sector.amount)}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={clsx("text-sm font-bold", colors.text)}>{percentage}%</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden mx-auto">
                            <div 
                              className={clsx("h-full rounded-full", colors.progress)}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="mt-12 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Info className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">Understanding Sector Classification</h3>
                <p className="text-slate-300 text-sm leading-relaxed max-w-2xl">
                  Sectors are classified according to the International Monetary Fund's Government Finance Statistics framework. 
                  Each sector represents a functional category of government expenditure, helping citizens understand 
                  budget priorities across education, health, infrastructure, and other critical areas.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link
                to={`/state/${stateId}/mdas`}
                className="px-6 py-3 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors"
              >
                View MDAs
              </Link>
              <Link
                to={`/state/${stateId}`}
                className="px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors"
              >
                Overview
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
