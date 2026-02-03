import { useNavigate } from 'react-router-dom';
import { useBudget } from '../data/BudgetContext';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  ShieldCheck, 
  TrendingUp, 
  BarChart3, 
  FileText,
  CheckCircle2,
  ChevronRight,
  Database,
  Download,
  Lock,
  Eye,
  Landmark,
  Users,
  Receipt,
  PieChart,
  ExternalLink,
  Search,
  Sparkles
} from 'lucide-react';
import { useState, useEffect } from 'react';

const formatCurrency = (val) => {
  if (!val) return '₦0';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(val);
};

// Animated counter component
const AnimatedCounter = ({ value, prefix = '', suffix = '', duration = 2000 }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value, duration]);
  
  return (
    <span className="tabular-nums">{prefix}{new Intl.NumberFormat('en-NG').format(count)}{suffix}</span>
  );
};

// Mini chart component for preview
const MiniBarChart = ({ data, color = "#008751" }) => {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((val, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          whileInView={{ height: `${(val / max) * 100}%` }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1, duration: 0.5 }}
          className="flex-1 rounded-t-sm"
          style={{ backgroundColor: color, opacity: 0.6 + (i * 0.1) }}
        />
      ))}
    </div>
  );
};

// Trust badge component
const TrustBadge = ({ icon, label, value }) => {
  const IconComponent = icon;
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200">
      <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
        <IconComponent className="w-5 h-5 text-emerald-600" />
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
};

export default function HomePage() {
  const { states } = useBudget();
  const navigate = useNavigate();
  const [globalSearch, setGlobalSearch] = useState('');
  const [showGlobalResults, setShowGlobalResults] = useState(false);

  const totalBudgetAcrossStates = states.reduce((acc, s) => acc + (s.data?.summary?.total_expenditure || 0), 0);
  const totalMDAs = states.reduce((acc, s) => acc + (s.data?.mdas?.length || 0), 0);
  const totalSectors = states.reduce((acc, s) => acc + (s.data?.sectors?.length || 0), 0);

  const searchResults = useMemo(() => {
    if (!globalSearch || globalSearch.length < 3) return { states: [], mdas: [] };
    
    const term = globalSearch.toLowerCase();
    const foundStates = states.filter(s => s.name.toLowerCase().includes(term));
    const foundMDAs = [];
    
    states.forEach(s => {
      s.data?.mdas?.forEach(m => {
        if (m.name.toLowerCase().includes(term)) {
          foundMDAs.push({ ...m, stateName: s.name, stateId: s.id });
        }
      });
    });

    return { states: foundStates, mdas: foundMDAs.slice(0, 10) };
  }, [globalSearch, states]);

  // Sample chart data for visual preview
  const chartData = [65, 45, 80, 55, 70, 90, 60, 75, 85, 50];

  const features = [
    {
      icon: ShieldCheck,
      title: '100% Verified Data',
      description: 'Every naira traced to official budget documents with mathematical checksums ensuring accuracy.',
      stat: 'Zero Errors'
    },
    {
      icon: Search,
      title: 'Forensic Discovery',
      description: 'Deep search across all MDAs, sectors, and budget line items with instant filtering.',
      stat: `${totalMDAs}+ MDAs`
    },
    {
      icon: BarChart3,
      title: 'Interactive Analytics',
      description: 'Visual breakdowns of revenue sources, expenditure patterns, and sector allocations.',
      stat: 'Live Charts'
    },
    {
      icon: FileText,
      title: 'Source Documents',
      description: 'Direct access to original PDFs with side-by-side accuracy verification views.',
      stat: 'Original PDFs'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Bar - Clean & Minimal */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Landmark className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">BudgetView</span>
              <span className="hidden sm:inline text-xs text-slate-500 ml-2 font-medium">Nigeria</span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-1">
            <button 
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
            >
              Home
            </button>
            <button 
              onClick={() => navigate('/compare')}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
            >
              Compare
            </button>
            <button 
              onClick={() => navigate('/state/kano')}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
            >
              Explore
            </button>
          </div>
          
          <button 
            onClick={() => navigate('/state/kano')}
            className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
          >
            View Data
          </button>
        </div>
      </nav>

      {/* Hero Section - Editorial Style */}
      <section className="relative pt-28 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        {/* Gradient orbs */}
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-emerald-200/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-200/20 rounded-full blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center"
          >
            {/* Left Content */}
            <div className="order-2 lg:order-1">
              {/* Trust Badge */}
              <motion.div 
                variants={itemVariants}
                className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-emerald-50 border border-emerald-200 rounded-full"
              >
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-emerald-800">Official Government Data</span>
              </motion.div>

              {/* Main Headline */}
              <motion.h1 
                variants={itemVariants}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-[1.1] mb-6"
              >
                See How Your State{' '}
                <span className="text-emerald-700">
                  Spends Public Money
                </span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p 
                variants={itemVariants}
                className="text-lg text-slate-600 max-w-xl mb-8 leading-relaxed"
              >
                Transparent access to verified state budgets across Nigeria. Every figure sourced from official documents, validated for accuracy, and made accessible to every citizen.
              </motion.p>

                {/* Global Search Bar */}
                <motion.div variants={itemVariants} className="relative z-30 mb-8 max-w-xl">
                  <div className="relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Search for any project, agency or keyword..."
                      className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-[1.5rem] text-lg font-medium outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-xl shadow-slate-200/50"
                      value={globalSearch}
                      onChange={(e) => {
                        setGlobalSearch(e.target.value);
                        setShowGlobalResults(true);
                      }}
                      onBlur={() => setTimeout(() => setShowGlobalResults(false), 200)}
                    />
                  </div>

                  {showGlobalResults && (searchResults.states.length > 0 || searchResults.mdas.length > 0) && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[2rem] border border-slate-200 shadow-2xl overflow-hidden p-2"
                    >
                      {searchResults.states.length > 0 && (
                        <div className="p-4 border-b border-slate-50">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">States</p>
                          {searchResults.states.map(s => (
                            <button 
                              key={s.id} 
                              onClick={() => navigate(`/state/${s.id}`)}
                              className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all group"
                            >
                              <span className="font-bold text-slate-900">{s.name}</span>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-all" />
                            </button>
                          ))}
                        </div>
                      )}
                      {searchResults.mdas.length > 0 && (
                        <div className="p-4">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Agencies & MDAs</p>
                          {searchResults.mdas.map((m, i) => (
                            <button 
                              key={i} 
                              onClick={() => navigate(`/state/${m.stateId}`)}
                              className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all group text-left"
                            >
                              <div>
                                <p className="font-bold text-slate-900 text-sm">{m.name}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{m.stateName} State • {m.code}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-all" />
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="p-4 bg-slate-900 rounded-[1.5rem] m-2">
                        <div className="flex items-center gap-3">
                          <Sparkles className="w-5 h-5 text-emerald-400" />
                          <p className="text-xs text-slate-300">
                            Deep search enabled. We're searching <strong>{totalMDAs}</strong> agencies and <strong>{states.length}</strong> official PDFs.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>

                {/* CTA Buttons */}
              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start gap-4 mb-10">
                <button 
                  onClick={() => navigate('/compare')}
                  className="group px-8 py-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center gap-2"
                >
                  Compare State Budgets
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={() => navigate('/state/kano')}
                  className="px-8 py-4 bg-white text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all border border-slate-300 flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Explore Kano 2024
                </button>
              </motion.div>

              {/* Trust Row */}
              <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4">
                <TrustBadge icon={Lock} label="Data Security" value="Verified" />
                <TrustBadge icon={CheckCircle2} label="Accuracy" value="100%" />
                <TrustBadge icon={FileText} label="Sources" value="Official PDFs" />
              </motion.div>
            </div>

            {/* Right Content - Preview Card */}
            <motion.div 
              variants={itemVariants}
              className="order-1 lg:order-2"
            >
              <div className="relative">
                {/* Main preview card */}
                <div className="relative bg-white rounded-3xl shadow-2xl shadow-slate-900/10 border border-slate-200 overflow-hidden">
                  {/* Card Header */}
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-amber-400" />
                      <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-xs font-medium text-slate-400">Kano State 2024 Budget Preview</span>
                  </div>
                  
                  {/* Card Content */}
                  <div className="p-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Budget</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {formatCurrency(states[0]?.data?.summary?.total_expenditure).replace('₦', '₦')}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">MDAs</p>
                        <p className="text-2xl font-bold text-slate-900">{states[0]?.data?.mdas?.length || 0}</p>
                      </div>
                    </div>
                    
                    {/* Mini Chart */}
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Expenditure Trend</p>
                      <MiniBarChart data={chartData} />
                    </div>
                    
                    {/* Quick Stats */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <Receipt className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Revenue</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {formatCurrency(states[0]?.data?.summary?.total_revenue).replace('₦', '₦')}
                          </p>
                        </div>
                      </div>
                      <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                        View Details <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Floating badges */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                  className="absolute -right-4 top-1/4 bg-white rounded-xl shadow-xl border border-slate-200 p-3 hidden lg:block"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">Verified</p>
                      <p className="text-[10px] text-slate-500">Against official PDF</p>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  className="absolute -bottom-4 left-1/4 bg-white rounded-xl shadow-xl border border-slate-200 p-3 hidden lg:block"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{totalMDAs}+ MDAs</p>
                      <p className="text-[10px] text-slate-500">Ministries & Agencies</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="py-12 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-white mb-2">
                {formatCurrency(totalBudgetAcrossStates).replace('₦', '₦')}
              </p>
              <p className="text-sm font-medium text-slate-400">Total Monitored</p>
            </div>
            <div className="text-center border-l border-slate-700">
              <p className="text-3xl md:text-4xl font-bold text-emerald-400 mb-2">
                <AnimatedCounter value={states.length} />
              </p>
              <p className="text-sm font-medium text-slate-400">States Covered</p>
            </div>
            <div className="text-center border-l border-slate-700">
              <p className="text-3xl md:text-4xl font-bold text-blue-400 mb-2">
                <AnimatedCounter value={totalMDAs} suffix="+" />
              </p>
              <p className="text-sm font-medium text-slate-400">MDAs Tracked</p>
            </div>
            <div className="text-center border-l border-slate-700">
              <p className="text-3xl md:text-4xl font-bold text-amber-400 mb-2">
                <AnimatedCounter value={totalSectors} suffix="+" />
              </p>
              <p className="text-sm font-medium text-slate-400">Sectors Analyzed</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* States Section - Horizontal Cards */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end justify-between mb-12"
          >
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Available State Budgets</h2>
              <p className="text-slate-600 max-w-xl">Explore detailed budget breakdowns for Nigerian states. Each dataset is extracted from official government publications and verified for accuracy.</p>
            </div>
            <button 
              onClick={() => navigate('/compare')}
              className="mt-4 md:mt-0 text-emerald-600 font-semibold flex items-center gap-2 hover:gap-3 transition-all"
            >
              Compare All States <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {states.map((state, index) => (
              <motion.div
                key={state.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => navigate(`/state/${state.id}`)}
                className="group cursor-pointer"
              >
                <div className="relative p-6 bg-slate-50 border border-slate-200 rounded-2xl hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-emerald-500/20">
                        {state.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{state.name}</h3>
                        <p className="text-sm text-slate-500">{state.year} Approved Budget</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1 bg-emerald-100 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span className="text-xs font-semibold text-emerald-700">Verified</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-slate-200">
                      <span className="text-sm text-slate-600">Total Budget</span>
                      <span className="text-lg font-bold text-slate-900">{formatCurrency(state.data?.summary?.total_expenditure)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-200">
                      <span className="text-sm text-slate-600">Total Revenue</span>
                      <span className="text-sm font-semibold text-slate-700">{formatCurrency(state.data?.summary?.total_revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-slate-600">Departments</span>
                      <span className="text-sm font-semibold text-slate-700">{state.data?.mdas?.length || 0} MDAs</span>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-500">{state.data?.sectors?.length || 0} Sectors</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm group-hover:gap-3 transition-all">
                      Explore <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Coming Soon Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: states.length * 0.1 }}
              className="p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-center min-h-[280px]"
            >
              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-600 mb-2">More States Coming</h3>
              <p className="text-sm text-slate-500 max-w-xs">We're actively working to add all 36 Nigerian states to the platform.</p>
              <button className="mt-4 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Request a State
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Built for Transparency</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Every feature designed to make public finance accessible, verifiable, and understandable for every Nigerian citizen.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group p-8 bg-white border border-slate-200 rounded-2xl hover:shadow-xl hover:shadow-slate-900/5 hover:border-emerald-200 transition-all duration-300"
              >
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
                    <feature.icon className="w-7 h-7 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold text-slate-900">{feature.title}</h3>
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full">
                        {feature.stat}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Timeline Style */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">From PDF to Insight</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Our rigorous process ensures every figure you see is accurate and traceable to its official source.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-16 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-200" />
            
            {[
              { 
                step: '01', 
                icon: Download,
                title: 'Extract', 
                description: 'Advanced OCR and parsing algorithms extract every figure from official state budget PDFs with precision.'
              },
              { 
                step: '02', 
                icon: ShieldCheck,
                title: 'Verify', 
                description: 'Mathematical checksums validate that all figures balance. Revenue equals expenditure. No discrepancies.'
              },
              { 
                step: '03', 
                icon: BarChart3,
                title: 'Visualize', 
                description: 'Interactive dashboards transform complex spreadsheets into clear, actionable insights for every citizen.'
              }
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative text-center"
              >
                <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-600/20 relative z-10">
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-sm font-bold text-emerald-600 mb-2">STEP {item.step}</div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-12 md:p-16"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,white_1px,transparent_1px)] bg-[size:32px_32px]" />
            </div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]" />
            
            <div className="relative text-center">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Start Exploring Today</h2>
              <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10">
                Transparent access to state budgets is your right as a citizen. Understand where public funds go and hold government accountable.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={() => navigate('/state/kano')}
                  className="px-8 py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/25"
                >
                  Explore Kano Budget
                </button>
                <button 
                  onClick={() => navigate('/compare')}
                  className="px-8 py-4 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-600 transition-all border border-slate-600"
                >
                  Compare States
                </button>
              </div>
              
              {/* Trust note */}
              <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-400">
                <Lock className="w-4 h-4" />
                <span>All data verified against official state budget documents</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center">
                  <Landmark className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">BudgetView Nigeria</span>
              </div>
              <p className="text-slate-400 max-w-sm mb-6">
                Making state budgets transparent and accessible to every Nigerian citizen. Track public spending, understand allocations, and demand accountability.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-all">
                  <ExternalLink className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-all">
                  <Database className="w-5 h-5" />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Platform</h4>
              <ul className="space-y-3">
                <li><button onClick={() => navigate('/')} className="text-slate-400 hover:text-white transition-colors text-sm">Home</button></li>
                <li><button onClick={() => navigate('/compare')} className="text-slate-400 hover:text-white transition-colors text-sm">Compare States</button></li>
                <li><button onClick={() => navigate('/state/kano')} className="text-slate-400 hover:text-white transition-colors text-sm">Explore Data</button></li>
                <li><button onClick={() => navigate('/admin/login')} className="text-slate-400 hover:text-white transition-colors text-sm">Admin Console</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Resources</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">Documentation</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">API Access</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">Data Sources</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              © 2024 BudgetView Nigeria. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <button className="text-sm text-slate-500 hover:text-white transition-colors">Privacy Policy</button>
              <button className="text-sm text-slate-500 hover:text-white transition-colors">Terms of Use</button>
              <button className="text-sm text-slate-500 hover:text-white transition-colors">Data Accuracy</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
