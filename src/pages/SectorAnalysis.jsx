import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useBudget } from '../data/BudgetContext';
import { 
  Card, 
  Title, 
  Text, 
  DonutChart, 
  BarChart, 
  Grid, 
  Badge,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Flex
} from '@tremor/react';
import { ArrowLeft, PieChart, BarChart3, Construction, BookOpen, Heart, Landmark, Users } from 'lucide-react';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val || 0);
};

const getSectorIcon = (name) => {
  const n = name.toUpperCase();
  if (n.includes('EDUCATION')) return BookOpen;
  if (n.includes('HEALTH')) return Heart;
  if (n.includes('AGRIC')) return Users;
  if (n.includes('INFRA') || n.includes('WORKS') || n.includes('TRANSPORT')) return Construction;
  return Landmark;
};

export default function SectorAnalysis() {
  const { stateId } = useParams();
  const navigate = useNavigate();
  const { states, isInitialized } = useBudget();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (isInitialized) {
      const stateInfo = states.find(s => s.id === stateId);
      if (stateInfo) {
        setData(stateInfo.data);
      }
    }
  }, [stateId, states, isInitialized]);

  const sectorData = useMemo(() => {
    if (!data) return [];
    return data.sectors.sort((a, b) => b.amount - a.amount);
  }, [data]);

  if (!isInitialized) return <div className="p-12 text-center">Loading Analytics...</div>;
  if (!data) return <div className="p-12 text-center text-red-500">State data not found.</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <Title className="text-3xl font-black text-slate-900 tracking-tight">Sectoral Analysis</Title>
            <Text className="text-slate-500">Functional classification of the {data.state} {data.year} budget.</Text>
          </div>
        </div>
      </div>

      <Grid numItemsSm={1} numItemsLg={2} className="gap-8">
        <Card className="rounded-3xl shadow-sm border-slate-200">
          <Flex className="mb-8">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <PieChart className="w-5 h-5" />
              </div>
              <Title>Budget Distribution</Title>
            </div>
            <Badge color="blue" size="xs">Percentage %</Badge>
          </Flex>
          <div className="h-80">
            <DonutChart
              data={sectorData}
              category="amount"
              index="name"
              valueFormatter={formatCurrency}
              colors={["blue", "cyan", "indigo", "violet", "emerald", "amber", "rose", "slate"]}
              className="mt-6"
            />
          </div>
        </Card>

        <Card className="rounded-3xl shadow-sm border-slate-200">
          <Flex className="mb-8">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <BarChart3 className="w-5 h-5" />
              </div>
              <Title>Volume Comparison</Title>
            </div>
            <Badge color="emerald" size="xs">Absolute ₦</Badge>
          </Flex>
          <div className="h-80">
            <BarChart
              data={sectorData}
              index="name"
              categories={["amount"]}
              colors={["emerald"]}
              valueFormatter={formatCurrency}
              yAxisWidth={100}
              className="mt-6"
            />
          </div>
        </Card>
      </Grid>

      {/* Grid of Sector Cards */}
      <Title className="text-xl font-black text-slate-900 px-2">Detailed Sector Breakdown</Title>
      <Grid numItemsSm={1} numItemsMd={2} numItemsLg={3} className="gap-6">
        {sectorData.map((sector) => {
          const Icon = getSectorIcon(sector.name);
          const percentage = (sector.amount / data.summary.total_expenditure) * 100;
          
          return (
            <Card key={sector.code} className="rounded-3xl p-6 hover:shadow-lg transition-all border-slate-100 group">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-slate-50 group-hover:bg-blue-50 text-slate-400 group-hover:text-blue-600 rounded-2xl transition-colors">
                  <Icon className="w-6 h-6" />
                </div>
                <Badge color="blue" size="xs" className="font-black">{percentage.toFixed(1)}%</Badge>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{sector.code}</p>
              <h3 className="text-xl font-black text-slate-900 leading-tight mb-4">{sector.name}</h3>
              <div className="pt-4 border-t border-slate-50">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Allocation</p>
                <p className="text-lg font-black text-blue-600">{formatCurrency(sector.amount)}</p>
              </div>
            </Card>
          );
        })}
      </Grid>
    </div>
  );
}
