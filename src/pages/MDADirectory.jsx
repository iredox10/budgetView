import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useBudget } from '../data/BudgetContext';
import { 
  Card, 
  Title, 
  Text, 
  Table, 
  TableHead, 
  TableRow, 
  TableHeaderCell, 
  TableBody, 
  TableCell, 
  Badge, 
  TextInput,
  Flex,
  Button
} from '@tremor/react';
import { Search, ArrowLeft, Filter, Download, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { clsx } from 'clsx';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val || 0);
};

export default function MDADirectory() {
  const { stateId } = useParams();
  const navigate = useNavigate();
  const { states, isInitialized } = useBudget();
  const [data, setData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMDA, setSelectedMDA] = useState(null);

  useEffect(() => {
    if (isInitialized) {
      const stateInfo = states.find(s => s.id === stateId);
      if (stateInfo) {
        setData(stateInfo.data);
      }
    }
  }, [stateId, states, isInitialized]);

  const filteredMDAs = useMemo(() => {
    if (!data) return [];
    return data.mdas.filter(mda => 
      mda.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mda.code.includes(searchQuery)
    );
  }, [data, searchQuery]);

  if (!isInitialized) return <div className="p-12 text-center">Loading Database...</div>;
  if (!data) return <div className="p-12 text-center text-red-500">State data not found.</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Sidebar Inspector */}
      {selectedMDA && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-slate-200 z-50 p-8 animate-in slide-in-from-right duration-300">
          <div className="flex justify-between items-center mb-8">
            <Title>MDA Allocation Details</Title>
            <button onClick={() => setSelectedMDA(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>
          
          <div className="space-y-8">
            <div>
              <Text className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Agency Name</Text>
              <p className="font-black text-slate-900 text-xl leading-tight">{selectedMDA.name}</p>
              <p className="text-xs font-mono text-slate-500 mt-1">Classification Code: {selectedMDA.code}</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <Text className="text-[10px] font-bold uppercase text-slate-400">Personnel Cost</Text>
                <p className="text-lg font-black text-slate-900">{formatCurrency(selectedMDA.personnel)}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <Text className="text-[10px] font-bold uppercase text-slate-400">Overhead Cost</Text>
                <p className="text-lg font-black text-slate-900">{formatCurrency(selectedMDA.overhead)}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <Text className="text-[10px] font-bold uppercase text-slate-400">Capital Expenditure</Text>
                <p className="text-lg font-black text-slate-900">{formatCurrency(selectedMDA.capital)}</p>
              </div>
              <div className="p-6 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 text-white">
                <Text className="text-[10px] font-bold uppercase text-blue-100">Total Allocation</Text>
                <p className="text-2xl font-black">{formatCurrency(selectedMDA.total)}</p>
              </div>
            </div>

            <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800">
              <Text className="text-[10px] font-bold uppercase text-blue-400 mb-3 tracking-widest">Forensic Source Line</Text>
              <div className="text-[11px] font-mono text-blue-100 whitespace-pre-wrap leading-relaxed italic">
                "{selectedMDA.sourceLine || "Source line data not available."}"
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <Title className="text-3xl font-black text-slate-900 tracking-tight">MDA Directory</Title>
            <Text className="text-slate-500">Comprehensive list of all {data.mdas.length} agencies in {data.state} {data.year}.</Text>
          </div>
        </div>
        <div className="flex gap-3">
          <Button icon={Download} variant="secondary" onClick={() => window.print()}>Print Directory</Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="rounded-3xl">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by MDA name, keyword, or classification code..."
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button icon={Filter} variant="light">Advanced Filters</Button>
        </div>
      </Card>

      {/* Main Table */}
      <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHead className="bg-slate-50/50">
              <TableRow>
                <TableHeaderCell className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Classification & Agency</TableHeaderCell>
                <TableHeaderCell className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Personnel</TableHeaderCell>
                <TableHeaderCell className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Overhead</TableHeaderCell>
                <TableHeaderCell className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Capital</TableHeaderCell>
                <TableHeaderCell className="text-right px-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Total Allocation</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMDAs.map((item) => (
                <TableRow 
                  key={item.code} 
                  className="hover:bg-blue-50/30 cursor-pointer transition-colors group border-b border-slate-50 last:border-none"
                  onClick={() => setSelectedMDA(item)}
                >
                  <TableCell className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{item.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono tracking-tighter mt-1">{item.code}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm text-slate-600 font-medium">{formatCurrency(item.personnel)}</TableCell>
                  <TableCell className="text-right text-sm text-slate-600 font-medium">{formatCurrency(item.overhead)}</TableCell>
                  <TableCell className="text-right text-sm text-slate-600 font-medium">{formatCurrency(item.capital)}</TableCell>
                  <TableCell className="text-right px-8 py-5">
                    <div className="flex items-center justify-end gap-3">
                      <span className="text-sm font-black text-slate-900">{formatCurrency(item.total)}</span>
                      <ArrowRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filteredMDAs.length === 0 && (
          <div className="p-20 text-center">
            <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <Text className="text-slate-400 font-medium">No MDAs matching your search criteria were found.</Text>
          </div>
        )}
      </Card>
    </div>
  );
}
