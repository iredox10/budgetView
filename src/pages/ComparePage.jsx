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
  TableCell,
  ProgressBar
} from '@tremor/react';
import { Scale, ArrowRight, TrendingUp, AlertCircle, Sword, Trophy, Zap, Landmark, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val || 0);
};

const BattleCard = ({ title, stateA, stateB, valueA, valueB, format = "currency", invert = false }) => {
  const isWinnerA = invert ? valueA < valueB : valueA > valueB;
  const isWinnerB = invert ? valueB < valueA : valueB > valueA;
  const diff = Math.abs(valueA - valueB);
  
  const displayValA = format === "currency" ? formatCurrency(valueA) : `${valueA.toFixed(1)}%`;
  const displayValB = format === "currency" ? formatCurrency(valueB) : `${valueB.toFixed(1)}%`;

  return (
    <Card className="rounded-[2rem] p-8 relative overflow-hidden border-slate-100 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
          <Zap className="w-4 h-4" />
        </div>
        <Title className="text-sm font-black uppercase tracking-widest text-slate-500">{title}</Title>
      </div>

      <div className="grid grid-cols-2 gap-8 relative z-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Text className="font-bold text-slate-900 truncate">{stateA}</Text>
            {isWinnerA && <Trophy className="w-4 h-4 text-amber-500 fill-amber-500" />}
          </div>
          <p className={clsx("text-2xl font-black tracking-tight", isWinnerA ? "text-emerald-600" : "text-slate-400")}>
            {displayValA}
          </p>
        </div>

        <div className="space-y-2 text-right border-l border-slate-100 pl-8">
          <div className="flex items-center justify-end gap-2">
            {isWinnerB && <Trophy className="w-4 h-4 text-amber-500 fill-amber-500" />}
            <Text className="font-bold text-slate-900 truncate">{stateB}</Text>
          </div>
          <p className={clsx("text-2xl font-black tracking-tight", isWinnerB ? "text-emerald-600" : "text-slate-400")}>
            {displayValB}
          </p>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-50">
        <Flex className="mb-2">
          <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance Variance</Text>
          <Badge color={diff === 0 ? "slate" : "blue"} size="xs">
            {format === "currency" ? formatCurrency(diff) : `${diff.toFixed(1)}%`} GAP
          </Badge>
        </Flex>
        <ProgressBar value={isWinnerA ? 100 : (valueA / (valueA + valueB)) * 100} color={isWinnerA ? "emerald" : "slate"} className="h-1.5" />
      </div>
    </Card>
  );
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
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-[80px] -mr-32 -mt-32"></div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="p-4 bg-slate-900 rounded-[1.5rem] shadow-2xl shadow-slate-200">
            <Sword className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <Title className="text-4xl font-black text-slate-900 tracking-tighter">Budget Battle</Title>
            <Text className="text-slate-500 font-medium">Head-to-head state fiscal benchmarking.</Text>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
          <div className="space-y-1 w-full sm:w-auto">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Warrior A</label>
            <select 
              value={stateAId}
              onChange={(e) => setStateAId(e.target.value)}
              className="w-full sm:w-56 px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none"
            >
              {states.map(s => <option key={s.id} value={s.id}>{s.name} {s.year}</option>)}
            </select>
          </div>
          <div className="flex items-end justify-center py-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">VS</div>
          </div>
          <div className="space-y-1 w-full sm:w-auto">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Warrior B</label>
            <select 
              value={stateBId}
              onChange={(e) => setStateBId(e.target.value)}
              className="w-full sm:w-56 px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none"
            >
              <option value="">Select Combatant...</option>
              {states.map(s => <option key={s.id} value={s.id}>{s.name} {s.year}</option>)}
            </select>
          </div>
        </div>
      </div>

      {!stateB ? (
        <Card className="py-32 text-center flex flex-col items-center bg-slate-50 border-dashed border-2 border-slate-200 rounded-[3rem]">
          <div className="p-6 bg-white rounded-full shadow-xl mb-8">
            <Landmark className="w-12 h-12 text-slate-200" />
          </div>
          <Title className="text-slate-400 font-black">Select a second state to initialize battle mode</Title>
          <Text className="mt-2 text-slate-400 max-w-sm">Compare spending power, revenue generation, and development priorities side-by-side.</Text>
        </Card>
      ) : (
        <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-1000">
          {/* Battle Mode Winners */}
          <section className="space-y-6">
            <Title className="text-2xl font-black text-slate-900 px-4">Performance Highlights</Title>
            <Grid numItemsSm={1} numItemsMd={2} className="gap-8">
              <BattleCard 
                title="Capital Intensity Ratio" 
                stateA={stateA.state} 
                stateB={stateB.state}
                valueA={(stateA.summary.capital_expenditure / stateA.summary.total_expenditure) * 100}
                valueB={(stateB.summary.capital_expenditure / stateB.summary.total_expenditure) * 100}
                format="percent"
              />
              <BattleCard 
                title="IGR Independence" 
                stateA={stateA.state} 
                stateB={stateB.state}
                valueA={(stateA.summary.igr / stateA.summary.recurrent_revenue) * 100}
                valueB={(stateB.summary.igr / stateB.summary.recurrent_revenue) * 100}
                format="percent"
              />
              <BattleCard 
                title="Personnel Efficiency" 
                stateA={stateA.state} 
                stateB={stateB.state}
                valueA={(stateA.summary.personnel_cost / stateA.summary.total_expenditure) * 100}
                valueB={(stateB.summary.personnel_cost / stateB.summary.total_expenditure) * 100}
                format="percent"
                invert={true}
              />
              <BattleCard 
                title="Revenue Per Capita" 
                stateA={stateA.state} 
                stateB={stateB.state}
                valueA={stateA.summary.total_revenue / 10000000} // Estimate for comparison
                valueB={stateB.summary.total_revenue / 10000000}
              />
            </Grid>
          </section>

          <Grid numItemsSm={1} numItemsLg={2} className="gap-12">
            <Card className="rounded-[2.5rem]">
              <Title className="font-black mb-2">Macro-Economic Comparison</Title>
              <Text className="mb-8">Total volume across core financial identities.</Text>
              <BarChart
                data={comparisonData}
                index="metric"
                categories={[stateA.state, stateB.state]}
                colors={["blue", "indigo"]}
                valueFormatter={formatCurrency}
                yAxisWidth={100}
                className="h-96 mt-6"
              />
            </Card>

            <Card className="rounded-[2.5rem]">
              <Title className="font-black mb-2">Sectoral Dominance</Title>
              <Text className="mb-8">Head-to-head allocation in priority sectors.</Text>
              <BarChart
                data={sectorComparison}
                index="name"
                categories={[stateA.state, stateB.state]}
                colors={["blue", "indigo"]}
                valueFormatter={formatCurrency}
                yAxisWidth={100}
                className="h-96 mt-6"
              />
            </Card>
          </Grid>

          {/* Full Statistics Table */}
          <Card className="rounded-[2.5rem] border-slate-200 shadow-sm overflow-hidden p-0">
            <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex items-center gap-4">
               <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-600 border border-slate-100">
                  <Landmark className="w-6 h-6" />
               </div>
               <div>
                 <Title className="font-black">Detailed Scorecard</Title>
                 <Text className="text-xs">Raw statistical breakdown of both combatants.</Text>
               </div>
            </div>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Identity Metric</TableHeaderCell>
                  <TableHeaderCell className="text-right text-[10px] font-black uppercase tracking-widest">{stateA.state}</TableHeaderCell>
                  <TableHeaderCell className="text-right text-[10px] font-black uppercase tracking-widest">{stateB.state}</TableHeaderCell>
                  <TableHeaderCell className="text-right px-8 text-[10px] font-black uppercase tracking-widest">Variance</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell className="px-8 py-5">
                    <Text className="font-bold text-slate-900">Total Budget Capacity</Text>
                  </TableCell>
                  <TableCell className="text-right text-sm font-bold">{formatCurrency(stateA.summary.total_expenditure)}</TableCell>
                  <TableCell className="text-right text-sm font-bold">{formatCurrency(stateB.summary.total_expenditure)}</TableCell>
                  <TableCell className="text-right px-8">
                    <Badge color="slate" size="xs">
                      {((Math.abs(stateA.summary.total_expenditure - stateB.summary.total_expenditure) / Math.max(stateA.summary.total_expenditure, stateB.summary.total_expenditure)) * 100).toFixed(1)}% Gap
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="px-8 py-5">
                    <Text className="font-bold text-slate-900">Personnel Weight</Text>
                  </TableCell>
                  <TableCell className="text-right text-sm font-bold">{((stateA.summary.personnel_cost / stateA.summary.total_expenditure) * 100).toFixed(1)}%</TableCell>
                  <TableCell className="text-right text-sm font-bold">{((stateB.summary.personnel_cost / stateB.summary.total_expenditure) * 100).toFixed(1)}%</TableCell>
                  <TableCell className="text-right px-8">
                    <Badge color="slate" size="xs">
                      {Math.abs(((stateA.summary.personnel_cost / stateA.summary.total_expenditure) * 100) - ((stateB.summary.personnel_cost / stateB.summary.total_expenditure) * 100)).toFixed(1)}% Gap
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
