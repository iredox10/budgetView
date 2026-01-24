import { useState, useMemo } from 'react';
import { useBudget } from '../data/BudgetContext';
import { 
  Card, 
  Title, 
  Text, 
  Grid, 
  BarChart, 
  Flex, 
  Badge,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell
} from '@tremor/react';
import { Scale, ArrowRight, TrendingUp, AlertCircle } from 'lucide-react';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val || 0);
};

export default function ComparePage() {
  const { states } = useBudget();
  const [stateAId, setStateAId] = useState(states[0]?.id || '');
  const [stateBId, setStateBId] = useState('');

  const stateA = states.find(s => s.id === stateAId)?.data;
  const stateB = states.find(s => s.id === stateBId)?.data;

  const comparisonData = useMemo(() => {
    if (!stateA || !stateB) return [];
    
    return [
      {
        metric: 'Total Budget',
        [stateA.state]: stateA.summary.total_expenditure,
        [stateB.state]: stateB.summary.total_expenditure,
      },
      {
        metric: 'Capital Spend',
        [stateA.state]: stateA.summary.capital_expenditure,
        [stateB.state]: stateB.summary.capital_expenditure,
      },
      {
        metric: 'Personnel Cost',
        [stateA.state]: stateA.summary.personnel_cost,
        [stateB.state]: stateB.summary.personnel_cost,
      },
      {
        metric: 'Internal Revenue (IGR)',
        [stateA.state]: stateA.summary.igr,
        [stateB.state]: stateB.summary.igr,
      }
    ];
  }, [stateA, stateB]);

  const sectorComparison = useMemo(() => {
    if (!stateA || !stateB) return [];
    
    const allSectors = Array.from(new Set([
      ...stateA.sectors.map(s => s.name),
      ...stateB.sectors.map(s => s.name)
    ]));

    return allSectors.map(name => {
      const valA = stateA.sectors.find(s => s.name === name)?.amount || 0;
      const valB = stateB.sectors.find(s => s.name === name)?.amount || 0;
      return {
        name,
        [stateA.state]: valA,
        [stateB.state]: valB
      };
    }).sort((a, b) => (b[stateA.state] + b[stateB.state]) - (a[stateA.state] + a[stateB.state]))
      .slice(0, 8);
  }, [stateA, stateB]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <div>
            <Title className="text-3xl font-black text-slate-900 tracking-tight">Compare Budgets</Title>
            <Text className="text-slate-500">Benchmarking Nigeria's State performance</Text>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Baseline State</label>
            <select 
              value={stateAId}
              onChange={(e) => setStateAId(e.target.value)}
              className="w-full sm:w-48 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
              {states.map(s => <option key={s.id} value={s.id}>{s.name} {s.year}</option>)}
            </select>
          </div>
          <div className="flex items-end justify-center py-2">
            <ArrowRight className="w-5 h-5 text-slate-300 hidden sm:block" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Comparison State</label>
            <select 
              value={stateBId}
              onChange={(e) => setStateBId(e.target.value)}
              className="w-full sm:w-48 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
              <option value="">Select a state...</option>
              {states.map(s => <option key={s.id} value={s.id}>{s.name} {s.year}</option>)}
            </select>
          </div>
        </div>
      </div>

      {!stateB ? (
        <Card className="py-20 text-center flex flex-col items-center">
          <TrendingUp className="w-12 h-12 text-slate-200 mb-4" />
          <Title className="text-slate-400">Please select a second state to begin comparison</Title>
          <Text className="mt-2 text-slate-400">Compare sectoral spending and revenue dependency instantly.</Text>
        </Card>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
          <Grid numItemsSm={1} numItemsLg={2} className="gap-8">
            <Card>
              <Title>Macro-Economic Comparison</Title>
              <Text className="mb-6 italic">High-level financial benchmarks</Text>
              <BarChart
                data={comparisonData}
                index="metric"
                categories={[stateA.state, stateB.state]}
                colors={["blue", "cyan"]}
                valueFormatter={formatCurrency}
                yAxisWidth={100}
                className="h-80 mt-6"
              />
            </Card>

            <Card>
              <Title>Top Sector Allocations</Title>
              <Text className="mb-6 italic">Direct comparison of priority sectors</Text>
              <BarChart
                data={sectorComparison}
                index="name"
                categories={[stateA.state, stateB.state]}
                colors={["blue", "cyan"]}
                valueFormatter={formatCurrency}
                yAxisWidth={100}
                className="h-80 mt-6"
              />
            </Card>
          </Grid>

          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden p-0">
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
               <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <Scale className="w-5 h-5" />
               </div>
               <Title>Side-by-Side Statistics</Title>
            </div>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell className="px-6 py-4">Metric</TableHeaderCell>
                  <TableHeaderCell className="text-right">{stateA.state}</TableHeaderCell>
                  <TableHeaderCell className="text-right">{stateB.state}</TableHeaderCell>
                  <TableHeaderCell className="text-right">Variance</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell className="px-6 py-4 font-bold text-slate-900 text-sm italic">IGR Independence Ratio</TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {((stateA.summary.igr / stateA.summary.total_revenue) * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {((stateB.summary.igr / stateB.summary.total_revenue) * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge color="slate">
                      {Math.abs(((stateA.summary.igr / stateA.summary.total_revenue) * 100) - ((stateB.summary.igr / stateB.summary.total_revenue) * 100)).toFixed(1)}% Gap
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="px-6 py-4 font-bold text-slate-900 text-sm italic">Capital Allocation %</TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {((stateA.summary.capital_expenditure / stateA.summary.total_expenditure) * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {((stateB.summary.capital_expenditure / stateB.summary.total_expenditure) * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge color="slate">
                      {Math.abs(((stateA.summary.capital_expenditure / stateA.summary.total_expenditure) * 100) - ((stateB.summary.capital_expenditure / stateB.summary.total_expenditure) * 100)).toFixed(1)}% Gap
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}
