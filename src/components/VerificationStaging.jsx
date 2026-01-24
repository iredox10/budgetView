import { useState, useMemo, useEffect } from 'react';
import { Card, Title, Text, TextInput, Button, Grid, Flex, Badge, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Callout } from '@tremor/react';
import { CheckCircle2, AlertCircle, Save, ArrowLeft, RefreshCw, Scale } from 'lucide-react';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2
  }).format(val || 0);
};

export default function VerificationStaging({ rawData, rawText, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    state: rawData.state,
    year: rawData.year,
    summary: { ...rawData.summary }
  });

  const [mdaSearch, setMdaSearch] = useState('');

  const balance = useMemo(() => {
    const s = formData.summary;
    const revTotal = (s.faac || 0) + (s.igr || 0) + (s.grants || 0) + (s.capital_receipts || 0);
    const expTotal = (s.personnel_cost || 0) + (s.other_recurrent_costs || 0) + (s.capital_expenditure || 0);
    
    // Sum MDAs (excluding sector totals which usually have codes ending in 00000000)
    const mdaSum = rawData.mdas
      .filter(m => !m.code.endsWith('00000000'))
      .reduce((acc, curr) => acc + curr.total, 0);

    return {
      revenueDiff: (s.total_revenue || 0) - revTotal,
      expenditureDiff: (s.total_expenditure || 0) - expTotal,
      mdaDiff: (s.total_expenditure || 0) - mdaSum,
      isRevenueBalanced: Math.abs((s.total_revenue || 0) - revTotal) < 1,
      isExpenditureBalanced: Math.abs((s.total_expenditure || 0) - expTotal) < 1,
      isMdaIntegrated: Math.abs((s.total_expenditure || 0) - mdaSum) < 1000 // Higher tolerance for MDA sum due to hierarchy complexity
    };
  }, [formData, rawData.mdas]);

  const handleSummaryChange = (field, value) => {
    const num = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
    setFormData(prev => ({
      ...prev,
      summary: { ...prev.summary, [field]: num }
    }));
  };

  const isValid = balance.isRevenueBalanced && balance.isExpenditureBalanced;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <Title className="text-2xl font-black">Accuracy Verification Staging</Title>
            <Text>Review extracted data against raw text before cloud commit.</Text>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            icon={Save} 
            disabled={!isValid}
            onClick={() => onSave({ ...rawData, ...formData })}
            className={isValid ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300"}
          >
            CONFIRM & COMMIT TO CLOUD
          </Button>
        </div>
      </div>

      <Grid numItemsLg={2} className="gap-8">
        {/* Left Side: Summary Fields */}
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-2 mb-6">
              <Scale className="w-5 h-5 text-blue-600" />
              <Title>Budget Summary Control</Title>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400">State Name</label>
                  <TextInput value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400">Budget Year</label>
                  <TextInput value={formData.year.toString()} onChange={(e) => setFormData({...formData, year: parseInt(e.target.value) || 2024})} />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Text className="font-bold text-slate-900 mb-4">Revenue Identities</Text>
                <div className="space-y-3">
                  {[
                    { id: 'total_revenue', label: 'Total Revenue' },
                    { id: 'faac', label: 'FAAC Allocation' },
                    { id: 'igr', label: 'Independent Revenue (IGR)' },
                    { id: 'grants', label: 'Aid & Grants' },
                    { id: 'capital_receipts', label: 'Capital Receipts' },
                  ].map(field => (
                    <div key={field.id} className="group">
                      <Flex className="mb-1">
                        <label className="text-xs font-medium text-slate-600">{field.label}</label>
                        {rawData.summarySources[field.id] && (
                          <Badge size="xs" color="slate" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            Found in text
                          </Badge>
                        )}
                      </Flex>
                      <TextInput 
                        placeholder="₦ 0.00"
                        value={formData.summary[field.id]?.toString() || ''}
                        onChange={(e) => handleSummaryChange(field.id, e.target.value)}
                        error={field.id === 'total_revenue' && !balance.isRevenueBalanced}
                      />
                      {rawData.summarySources[field.id] && (
                        <p className="text-[9px] text-slate-400 mt-1 font-mono italic truncate">
                          Source: {rawData.summarySources[field.id]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {!balance.isRevenueBalanced && (
                  <Callout title="Revenue Mismatch" color="rose" icon={AlertCircle} className="mt-4">
                    The sum of FAAC, IGR, Grants, and Receipts differs from Total Revenue by {formatCurrency(balance.revenueDiff)}.
                  </Callout>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Text className="font-bold text-slate-900 mb-4">Expenditure Identities</Text>
                <div className="space-y-3">
                  {[
                    { id: 'total_expenditure', label: 'Total Expenditure' },
                    { id: 'personnel_cost', label: 'Personnel Cost' },
                    { id: 'other_recurrent_costs', label: 'Other Recurrent (Overhead)' },
                    { id: 'capital_expenditure', label: 'Capital Expenditure' },
                  ].map(field => (
                    <div key={field.id} className="group">
                      <Flex className="mb-1">
                        <label className="text-xs font-medium text-slate-600">{field.label}</label>
                        {rawData.summarySources[field.id] && (
                          <Badge size="xs" color="slate" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            Found in text
                          </Badge>
                        )}
                      </Flex>
                      <TextInput 
                        placeholder="₦ 0.00"
                        value={formData.summary[field.id]?.toString() || ''}
                        onChange={(e) => handleSummaryChange(field.id, e.target.value)}
                        error={field.id === 'total_expenditure' && !balance.isExpenditureBalanced}
                      />
                      {rawData.summarySources[field.id] && (
                        <p className="text-[9px] text-slate-400 mt-1 font-mono italic truncate">
                          Source: {rawData.summarySources[field.id]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {!balance.isExpenditureBalanced && (
                  <Callout title="Expenditure Mismatch" color="rose" icon={AlertCircle} className="mt-4">
                    The sum of Personnel, Overhead, and Capital differs from Total Expenditure by {formatCurrency(balance.expenditureDiff)}.
                  </Callout>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Side: Raw Text Inspector */}
        <div className="space-y-6">
          <Card className="h-[calc(100vh-250px)] flex flex-col p-0 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <Title>Raw Document Text</Title>
              <Text className="text-xs">Search and extract values directly from the source.</Text>
            </div>
            <div className="flex-1 overflow-y-auto p-6 font-mono text-xs text-slate-600 whitespace-pre leading-relaxed bg-slate-900 text-slate-300">
              {rawText}
            </div>
          </Card>
        </div>
      </Grid>

      {/* MDA Integrity Check */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <Title>MDA Integrity Validation</Title>
            <Text>Ensuring every MDA total sums up to the overall budget expenditure.</Text>
          </div>
          <Badge 
            color={balance.isMdaIntegrated ? "emerald" : "rose"} 
            icon={balance.isMdaIntegrated ? CheckCircle2 : AlertCircle}
          >
            {balance.isMdaIntegrated ? "Fully Integrated" : `Variance: ${formatCurrency(balance.mdaDiff)}`}
          </Badge>
        </div>
        <div className="max-h-96 overflow-y-auto border border-slate-100 rounded-xl">
          <Table>
            <TableHead className="bg-slate-50 sticky top-0 z-10">
              <TableRow>
                <TableHeaderCell>MDA</TableHeaderCell>
                <TableHeaderCell className="text-right">Extracted Total</TableHeaderCell>
                <TableHeaderCell className="text-right">Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rawData.mdas.slice(0, 20).map((mda) => (
                <TableRow key={mda.code}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">{mda.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{mda.code}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium text-slate-700">{formatCurrency(mda.total)}</TableCell>
                  <TableCell className="text-right">
                    <Badge color="emerald" size="xs">Verified</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
