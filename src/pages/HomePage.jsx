import { useNavigate } from 'react-router-dom';
import { useBudget } from '../data/BudgetContext';
import { Card, Title, Text, Grid, Metric, Flex, Badge } from '@tremor/react';
import { Map as MapIcon, ArrowRight, TrendingUp, ShieldCheck, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(val || 0);
};

export default function HomePage() {
  const { states, isInitialized } = useBudget();
  const navigate = useNavigate();

  const totalBudgetAcrossStates = states.reduce((acc, s) => acc + (s.data?.summary?.total_expenditure || 0), 0);

  return (
    <div className="space-y-12 pb-20 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-12 lg:p-20 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="currentColor" />
          </svg>
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="space-y-8 max-w-2xl text-center lg:text-left">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-full text-blue-400"
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Nigeria Transparency Engine</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl lg:text-7xl font-black tracking-tight leading-[1.1]"
            >
              Forensic insight into <span className="text-blue-500">State Spending.</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-slate-400 text-lg lg:text-xl font-medium leading-relaxed"
            >
              Explore, compare, and verify approved budget estimates across Nigeria. 
              Built for accuracy, driven by data evidence.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-4"
            >
              <button 
                onClick={() => navigate('/compare')}
                className="px-8 py-4 bg-white text-slate-900 font-black rounded-2xl hover:bg-slate-100 transition-all active:scale-95 shadow-xl shadow-blue-900/20"
              >
                COMPARE STATES
              </button>
              <button 
                onClick={() => navigate('/state/kano')}
                className="px-8 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-500 transition-all active:scale-95"
              >
                EXPLORE KANO
              </button>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className="lg:w-1/3 w-full"
          >
            <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-[2.5rem] p-8">
              <div className="space-y-8">
                <div>
                  <Text className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-2">Total Monitored Value</Text>
                  <p className="text-4xl font-black text-white">{formatCurrency(totalBudgetAcrossStates)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">States</p>
                    <p className="text-2xl font-black text-white">{states.length}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Integrity</p>
                    <p className="text-2xl font-black text-emerald-400">100%</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* States Map Section */}
      <section className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-4">
          <div>
            <Title className="text-3xl font-black text-slate-900 tracking-tight">Geospatial Explorer</Title>
            <Text className="text-slate-500">Select a state from the map to view detailed forensic dashboards.</Text>
          </div>
          <Badge color="blue" icon={MapIcon} size="xl" className="font-bold">
            Interactive Heatmap
          </Badge>
        </div>

        <Grid numItemsSm={1} numItemsLg={3} className="gap-8">
          <Card className="lg:col-span-2 bg-white rounded-[2.5rem] border-slate-200 shadow-sm p-0 overflow-hidden min-h-[500px] flex items-center justify-center bg-slate-50">
            {/* Nigeria SVG Map Component */}
            <div className="relative w-full h-full flex items-center justify-center p-8">
               <div className="text-center space-y-4">
                  <MapIcon className="w-20 h-20 text-slate-200 mx-auto" />
                  <Title className="text-slate-400 font-black">Interactive Nigeria Map</Title>
                  <Text className="text-slate-400 max-w-xs mx-auto">
                    Map visualization is loading... Currently supports 
                    {states.map(s => s.name).join(', ')} data.
                  </Text>
                  <div className="flex justify-center gap-2 mt-8">
                    {states.map(s => (
                      <button 
                        key={s.id}
                        onClick={() => navigate(`/state/${s.id}`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
                      >
                        VIEW {s.name.toUpperCase()}
                      </button>
                    ))}
                  </div>
               </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Title className="text-xl font-black text-slate-900 px-2">Featured Insights</Title>
            {states.map((state) => (
              <motion.div 
                key={state.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate(`/state/${state.id}`)}
                className="cursor-pointer"
              >
                <Card className="rounded-[2rem] p-6 hover:border-blue-200 border-transparent transition-all shadow-sm">
                  <Flex className="mb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <Badge color="emerald">VERIFIED</Badge>
                  </Flex>
                  <h3 className="text-xl font-black text-slate-900">{state.name} State</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{state.year} Approved Estimates</p>
                  
                  <div className="space-y-3 pt-4 border-t border-slate-50">
                    <Flex>
                      <Text className="text-xs font-bold text-slate-500">Total Budget</Text>
                      <Text className="text-xs font-black text-slate-900">{formatCurrency(state.data?.summary?.total_expenditure)}</Text>
                    </Flex>
                    <Flex>
                      <Text className="text-xs font-bold text-slate-500">Capital Ratio</Text>
                      <Text className="text-xs font-black text-blue-600">
                        {((state.data?.summary?.capital_expenditure / state.data?.summary?.total_expenditure) * 100).toFixed(1)}%
                      </Text>
                    </Flex>
                  </div>
                </Card>
              </motion.div>
            ))}
            
            <Card className="rounded-[2rem] bg-slate-50 border-dashed border-2 border-slate-200 p-8 flex flex-col items-center text-center">
              <Users className="w-10 h-10 text-slate-300 mb-4" />
              <Title className="text-slate-400">Request a State</Title>
              <Text className="text-slate-400 text-xs mt-2">Don't see your state? Our team is working on extracting data for all 36 states.</Text>
            </Card>
          </div>
        </Grid>
      </section>
    </div>
  );
}
