import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useMemo, Fragment, useRef } from 'react';
import { useBudget } from '../data/BudgetContext';
import { 
  AlertCircle, TrendingUp, Users, Database, CheckCircle2, X, ArrowRight, 
  AlertTriangle, Coins, TrendingDown, Search, Download, 
  FileText, PieChart, Building2, ChevronRight, Landmark, Share2,
  Target, Wallet, Receipt, ShieldCheck, Scale, FileSearch, Sparkles,
  History, Eye, FileJson, Loader2, ChevronLeft, Leaf, Wheat
} from 'lucide-react';
import { clsx } from 'clsx';
import AIChatbot from '../components/AIChatbot';
import ShareButton from '../components/ShareButton';
import SourceInspector from '../components/SourceInspector';
import { Badge, Title, Text, Card } from '@tremor/react';
import { storage, BUCKET_ID } from '../utils/appwrite';
import { cacheGet, cacheSet } from '../data/cache';

const formatCurrency = (val) => {
  if (val === null || val === undefined) return '—';
  if (val === 0) return '₦0.00';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
};

const formatCompact = (val) => {
  if (val === null || val === undefined) return '—';
  if (val === 0) return '₦0';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(val);
};

// Animated counter component
const AnimatedValue = ({ value, formatter = formatCurrency, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === null || value === undefined) {
      setDisplayValue(null);
      return;
    }
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

// Audit Trail Modal Component
const AuditReportBody = ({ audit, stateName }) => (
  <>
    <div className="grid grid-cols-3 gap-4">
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Soundness score</p>
        <p className="text-3xl font-black mb-1" style={{ color: (audit.integrity_score || (audit.reconciled ? 100 : 0)) > 90 ? '#059669' : '#e11d48' }}>
          {audit.integrity_score || (audit.reconciled ? 100 : 0)}/100
        </p>
        <p className="text-[11px] text-slate-500">How reliably every figure adds up. 100 means nothing is off.</p>
      </div>
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Issues found</p>
        <p className="text-3xl font-black text-slate-900 mb-1">{audit.errors?.length || 0}</p>
        <p className="text-[11px] text-slate-500">Problems the check uncovered in this document.</p>
      </div>
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
        <div className="mt-1 mb-1">
          <Badge color={audit.reconciled ? "emerald" : "rose"} size="xl">
            {audit.reconciled ? "CLEARED" : "NEEDS REVIEW"}
          </Badge>
        </div>
        <p className="text-[11px] text-slate-500">Cleared means all totals add up correctly.</p>
      </div>
    </div>

    <div className="space-y-4">
      <Title className="text-lg">What our check found</Title>
      {audit.errors && audit.errors.length > 0 ? (
        audit.errors.map((err, idx) => (
          <div key={idx} className="p-4 rounded-2xl border border-rose-100 bg-rose-50/30 flex gap-4">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-900 uppercase tracking-tight">{ISSUE_LABELS[err.code] || err.code.replace(/_/g, ' ')}</p>
              <p className="text-sm text-rose-700 mt-1 font-mono leading-relaxed">{err.message}</p>
            </div>
          </div>
        ))
      ) : (
        <div className="p-12 text-center bg-emerald-50/30 rounded-[2rem] border-2 border-dashed border-emerald-100">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <p className="font-bold text-emerald-900">No problems found</p>
          <p className="text-sm text-emerald-600 mt-1 max-w-xs mx-auto">Every total in this document correctly adds up to the sum of its parts. The figures are internally consistent.</p>
        </div>
      )}
    </div>
  </>
);

const AuditTrailModal = ({ audit, isOpen, onClose, stateName }) => {
  if (!isOpen || !audit) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className={clsx(
              "w-12 h-12 rounded-2xl flex items-center justify-center",
              audit.reconciled ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
            )}>
              <FileSearch className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">Document Check: {stateName}</h3>
              <p className="text-sm text-slate-500 font-medium">Automatic mathematical verification report</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <AuditReportBody audit={audit} stateName={stateName} />
        </div>

        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <p className="text-xs font-bold uppercase tracking-widest">Automatically checked — figures never altered</p>
          </div>
          <p className="text-[10px] text-slate-400">Checked on: {new Date(audit.extraction_date).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
};

// Anomaly Center — surfaces document-internal inconsistencies found by the engine
const ISSUE_LABELS = {
  scope_inconsistent: 'A total does not match the sum of its parts',
  hierarchy_break: 'A section total does not match the units inside it',
  cross_table_disagreement: 'The same item appears twice with different figures',
  dedup_conflict: 'A row appears twice with different figures',
  missing_figure: 'A figure was not published in the document',
  missing_functional_description: 'An item has no name printed in the document',
  economic_reconciliation_failed: 'A total does not match the sum of its parts',
  economic_conflicting_code: 'The same item has two different figures',
  economic_amount_missing: 'A row has no amount printed',
  programme_amount_missing: 'A row has no amount printed',
  pdfinfo_failed: 'The document could not be read',
  text_extraction_failed: 'No pages could be read from the document',
};

const AnomalySeverityBadge = ({ severity }) => {
  const labels = { high: 'MAJOR', medium: 'MODERATE', info: 'MINOR' };
  const styles = {
    high: 'bg-rose-100 text-rose-700 border-rose-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    info: 'bg-sky-100 text-sky-700 border-sky-200'
  };
  return (
    <span className={clsx("px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border", styles[severity] || styles.info)}>
      {labels[severity] || 'MINOR'}
    </span>
  );
};

const AnomalyCard = ({ anomaly, onViewPage }) => {
  const hasAmounts = anomaly.expected !== null && anomaly.expected !== undefined;
  const delta = hasAmounts ? Math.abs(anomaly.expected - anomaly.actual) : null;
  const [copied, setCopied] = useState(false);

  const copyReport = () => {
    const lines = (anomaly.lines || []).join('\n');
    const report = [
      `ISSUE — ${ISSUE_LABELS[anomaly.code] || anomaly.code}`,
      `How serious: ${({ high: 'Major', medium: 'Moderate', info: 'Minor' })[anomaly.severity] || 'Minor'}`,
      `Pages in the document: ${(anomaly.pages || []).join(', ') || 'n/a'}`,
      `Row codes: ${(anomaly.codes || []).join(', ') || 'n/a'}`,
      `What we found: ${anomaly.message}`,
      ...(hasAmounts ? [
        `Total shown in the document: ${anomaly.expected}`,
        `Sum of the rows underneath: ${anomaly.actual}`,
        `Difference: ${delta}`
      ] : []),
      ...(lines ? ['Exact lines from the document:', lines] : [])
    ].join('\n');
    navigator.clipboard?.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-black text-amber-900 uppercase tracking-tight">{ISSUE_LABELS[anomaly.code] || anomaly.code.replace(/_/g, ' ')}</p>
            <AnomalySeverityBadge severity={anomaly.severity} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-[10px] font-black text-amber-700 hover:bg-amber-50 transition-colors"
          >
            <FileJson className="w-3 h-3" />
            {copied ? 'COPIED' : 'COPY THIS ISSUE'}
          </button>
          {anomaly.pages && anomaly.pages.length > 0 && (
            <button
              onClick={() => onViewPage(anomaly)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-[10px] font-black text-amber-700 hover:bg-amber-50 transition-colors"
            >
              <Eye className="w-3 h-3" />
              SEE IT IN THE PDF (PAGE {anomaly.pages[0]})
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-amber-800 font-medium leading-relaxed">{anomaly.message}</p>
      {hasAmounts && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2 py-1 bg-white/70 rounded-lg border border-amber-100 font-mono text-amber-900">
            Total shown in the document: {formatCurrency(anomaly.expected)}
          </span>
          <span className="px-2 py-1 bg-white/70 rounded-lg border border-amber-100 font-mono text-amber-900">
            Sum of the rows underneath: {formatCurrency(anomaly.actual)}
          </span>
          <span className="px-2 py-1 bg-rose-50 rounded-lg border border-rose-200 font-mono font-black text-rose-700">
            Difference: {formatCurrency(delta)}
          </span>
        </div>
      )}
      {anomaly.codes && anomaly.codes.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Related rows (their codes in the document)</p>
          <div className="flex flex-wrap gap-1.5">
            {anomaly.codes.map(code => (
              <span key={code} className="px-2 py-0.5 bg-white rounded-md text-[10px] font-mono text-slate-500 border border-slate-100">
                {code}
              </span>
            ))}
          </div>
        </div>
      )}
      {anomaly.lines && anomaly.lines.length > 0 && (
        <div className="rounded-xl bg-white/80 border border-amber-100 p-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Exact lines from the document — check for yourself</p>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {anomaly.lines.map((line, idx) => (
              <p key={idx} className="font-mono text-[11px] text-slate-600 leading-snug whitespace-pre-wrap break-all">{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AnomalyCenter = ({ anomalies, onViewPage }) => {
  if (!anomalies || anomalies.length === 0) return null;
  const bySeverity = { high: 0, medium: 0, info: 0 };
  anomalies.forEach(a => { bySeverity[a.severity || 'info'] = (bySeverity[a.severity || 'info'] || 0) + 1; });
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900">Issues found in the document</h3>
          <p className="text-sm text-slate-500">Our automatic check compares every total with the sum of its parts. Nothing is hidden or corrected — what you see below is exactly what the official document says.</p>
        </div>
      </div>
      <div className="flex gap-3">
        <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-black border border-rose-100">{bySeverity.high || 0} MAJOR</span>
        <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-black border border-amber-100">{bySeverity.medium || 0} MODERATE</span>
        <span className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 text-xs font-black border border-sky-100">{bySeverity.info || 0} MINOR</span>
      </div>
      {anomalies.map((anomaly, idx) => (
        <AnomalyCard key={idx} anomaly={anomaly} onViewPage={onViewPage} />
      ))}
    </div>
  );
};

// MDA Row with expansion for sub-units
const UnitRow = ({ unit, depth, onSelect, onOpenSource, formatCompact, selectedCode, defaultExpanded }) => {
  const [isExpanded, setIsExpanded] = useState(Boolean(defaultExpanded) || depth === 0);
  const children = unit.children || [];
  const hasChildren = children.length > 0;
  const childrenTotal = children.reduce((sum, c) => sum + (c.total || 0), 0);
  const hasSum = unit.total !== null && unit.total !== undefined;
  const sumOk = hasSum && hasChildren && Math.abs(unit.total - childrenTotal) <= 1;
  const sumMismatch = hasSum && hasChildren && !sumOk;
  const isSelected = selectedCode != null && String(selectedCode) === String(unit.code);

  return (
    <div className={clsx(depth > 0 && "ml-8 border-l-2 border-slate-100 pl-4")}>
      <div className={clsx(
        "flex items-center justify-between group/unit py-2 rounded-xl cursor-pointer",
        depth === 0 ? "px-3 hover:bg-slate-50" : "hover:bg-slate-50/60",
        isSelected && "bg-blue-50 ring-1 ring-blue-100"
      )}
        onClick={() => onSelect && onSelect({ ...unit, pageNumber: unit.provenance?.page })}
      >
        <div className="flex items-center gap-2 min-w-0">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
            >
              <ChevronRight className={clsx("w-3.5 h-3.5 text-slate-400 transition-transform", isExpanded && "rotate-90")} />
            </button>
          ) : (
            <span className="w-[22px] shrink-0" />
          )}
          <div className="min-w-0">
            <p className={clsx("truncate", depth === 0 ? "text-sm font-semibold text-slate-800" : "text-sm font-medium text-slate-600", isSelected && "text-blue-700")}>
              {unit.name || <span className="text-slate-400 italic">Unnamed unit</span>}
            </p>
            <p className="text-[10px] text-slate-400 font-mono">{unit.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {hasChildren && (
            sumOk ? (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-md border border-emerald-100">
                <CheckCircle2 className="w-3 h-3" /> ADDS UP
              </span>
            ) : (
              sumMismatch && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-black rounded-md border border-amber-100" title={`Total ${unit.total} vs children sum ${childrenTotal}`}>
                  <AlertTriangle className="w-3 h-3" /> DOESN'T ADD UP (₦{formatCompact(Math.abs(unit.total - childrenTotal))} OFF)
                </span>
              )
            )
          )}
          <span className="text-xs font-bold text-slate-700">{formatCompact(unit.total)}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect && onSelect({ ...unit, pageNumber: unit.provenance?.page });
              onOpenSource && onOpenSource(unit);
            }}
            className="opacity-0 group-hover/unit:opacity-100 text-[10px] font-bold text-blue-600 hover:underline"
          >
            VIEW SOURCE
          </button>
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div className="space-y-1 mt-1 mb-2">
          {children.map((child, idx) => (
            <UnitRow key={child.code || idx} unit={child} depth={depth + 1} onSelect={onSelect} onOpenSource={onOpenSource} formatCompact={formatCompact} selectedCode={selectedCode} defaultExpanded={defaultExpanded} />
          ))}
        </div>
      )}
    </div>
  );
};

const MDARow = ({ mda, onSelect, formatCompact, errors = [], anomalies = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasUnits = mda.units && mda.units.length > 0;

  // Find errors for this specific MDA
  const mdaError = errors.find(e => e.message?.includes(mda.code));
  const mdaAnomaly = anomalies.find(a =>
    (a.codes || []).includes(mda.code) ||
    a.message?.toLowerCase().includes(String(mda.name || '').toLowerCase())
  );

  return (
    <>
      <tr 
        className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
        onClick={() => onSelect(mda)}
      >
        <td data-label="Agency" className="px-6 py-4">
          <div className="flex items-center gap-3">
            {hasUnits && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <ChevronRight className={clsx("w-4 h-4 text-slate-400 transition-transform", isExpanded && "rotate-90")} />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900">{mda.name}</p>
                {mdaError && (
                  <div className="p-1 bg-rose-100 text-rose-600 rounded-md" title="Reconciliation Error">
                    <AlertTriangle className="w-3 h-3" />
                  </div>
                )}
                {mdaAnomaly && (
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded border border-amber-200" title={mdaAnomaly.message}>
                    HAS AN ISSUE
                  </span>
                )}
                {mda.provenance?.page && (
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded border border-emerald-100">
                    VERIFIED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono">{mda.code}</p>
            </div>
          </div>
        </td>
        <td data-label="Personnel" className="px-6 py-4 text-right text-sm text-slate-600">{formatCompact(mda.personnel)}</td>
        <td data-label="Overhead" className="px-6 py-4 text-right text-sm text-slate-600">{formatCompact(mda.overhead)}</td>
        <td data-label="Capital" className="px-6 py-4 text-right text-sm text-slate-600">{formatCompact(mda.capital)}</td>
        <td data-label="Total" className="px-6 py-4 text-right">
          <span className={clsx(
            "px-3 py-1 text-sm font-bold rounded-lg",
            mdaError ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-blue-50 text-blue-700"
          )}>
            {formatCompact(mda.total)}
          </span>
        </td>
      </tr>
      {isExpanded && hasUnits && (
        <tr className="bg-slate-50/30">
          <td colSpan="5" className="px-12 py-4">
            <div className="space-y-3 border-l-2 border-slate-200 pl-6">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Administrative Units</p>
                <span className="text-[10px] text-slate-400 font-mono">
                  {(() => { let n = 0; const walk = (list) => list.forEach(u => { n++; walk(u.children || []); }); walk(mda.units); return n; })()} units · tree from official document
                </span>
              </div>
              {mda.units.map((unit, idx) => (
                <UnitRow key={unit.code || idx} unit={unit} depth={0} onSelect={onSelect} formatCompact={formatCompact} />
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const COFOG_SECTORS = {
  '701': 'GENERAL PUBLIC SERVICES',
  '703': 'PUBLIC ORDER AND SAFETY',
  '704': 'ECONOMIC AFFAIRS',
  '705': 'ENVIRONMENTAL PROTECTION',
  '706': 'HOUSING AND COMMUNITY AMMENITIES',
  '707': 'HEALTH',
  '708': 'RECREATION, CULTURE AND RELIGION',
  '709': 'EDUCATION',
  '710': 'SOCIAL PROTECTION'
};
const AMOUNT_COLUMNS = [
  ['2024_full_year_actuals', '2024 Actuals'],
  ['2025_revised_budget', '2025 Revised'],
  ['2025_performance', '2025 Performance'],
  ['2026_approved_budget', '2026 Approved']
];
const TAG_COLUMNS = [
  ['climate', 'Climate', (a) => (a?.['2026_climate_change_mitigation'] || 0) + (a?.['2026_climate_change_adaptation'] || 0)],
  ['nutrition', 'Food/Nutrition', (a) => (a?.['2026_food_nutrition_tagging'] || 0)],
  ['social', 'Social Protection', (a) => (a?.['2026_social_protection'] || 0)]
];

const groupProjects = (list) => {
  const groups = new Map();
  for (const p of list) {
    const key = String(p.mda_name || '').trim() || 'Unattributed';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  return Array.from(groups.entries())
    .map(([name, rows]) => ({
      name,
      rows,
      total: rows.reduce((s, r) => s + (r.amount || 0), 0)
    }))
    .sort((a, b) => b.total - a.total);
};

const MinistryProfile = ({ data, ministries, selectedMinistry, onSelect, onOpenSource, onOpenSector, revenueRows, projectsRows, isLoading, formatCurrency, formatCompact }) => {
  const [treeQuery, setTreeQuery] = useState('');
  const [gridQuery, setGridQuery] = useState('');
  const [projectQuery, setProjectQuery] = useState('');
  const [showTrend, setShowTrend] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [treeSignal, setTreeSignal] = useState(null);
  const profileRef = useRef(null);
  const prevCode = useRef(null);

  const mda = selectedMinistry;

  // Revenue rows key on the full 12-digit code (ministry rollup = code itself,
  // department rollups share the first 6 digits). Project rows carry full
  // department-level mda_codes, so they are grouped by the 4-char sector+org
  // prefix (NCOA admin segment: Sector(2) + Org(2) + zeros for a ministry).
  const prefix6 = String((mda && mda.code) || '').slice(0, 6);
  const orgPrefix = String((mda && mda.code) || '').slice(0, 4);
  const isTopLevel = String((mda && mda.code) || '').endsWith('000000');
  const parentMinistry = ministries.find(m => String(m.code || '').slice(0, 4) === String((mda && mda.code) || '').slice(0, 4));
  const totalBudget = data?.summary?.total_expenditure;
  const totalRevenue = data?.summary?.total_revenue;

  const revenue = useMemo(() => {
    if (!revenueRows || !mda) return null;
    const exact = revenueRows.find(r => r.mda_code === mda.code);
    if (exact) return exact;
    return revenueRows.find(r => r.mda_code.startsWith(prefix6) && r.mda_code !== mda.code && String(r.mda_code).endsWith('000000'));
  }, [revenueRows, mda, prefix6]);

  const projects = useMemo(() => {
    if (!projectsRows || !mda) return [];
    return projectsRows
      .filter(p => (isTopLevel
        ? String(p.mda_code || '').startsWith(orgPrefix)
        : String(p.mda_code || '') === String(mda.code || '')))
      .sort((a, b) => (b.amount || 0) - (a.amount || 0));
  }, [projectsRows, orgPrefix, mda, isTopLevel]);

  const projectGroups = useMemo(() => groupProjects(projects), [projects]);

  const filteredProjects = useMemo(() => {
    const q = projectQuery.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(p =>
      String(p.project_name || '').toLowerCase().includes(q) ||
      String(p.mda_name || '').toLowerCase().includes(q) ||
      String(p.location_description || '').toLowerCase().includes(q) ||
      String(p.economic_description || '').toLowerCase().includes(q) ||
      String(p.programme_code || '').includes(q)
    );
  }, [projects, projectQuery]);

  const filteredGroups = useMemo(() => groupProjects(filteredProjects), [filteredProjects]);

  const PER_GROUP_LIMIT = 10;
  const visibleGroups = useMemo(() => {
    if (showAllProjects || filteredGroups.length === 0) return filteredGroups;
    return filteredGroups.map(g => ({
      ...g,
      rows: g.rows.slice(0, PER_GROUP_LIMIT),
      hidden: Math.max(0, g.rows.length - PER_GROUP_LIMIT),
    }));
  }, [filteredGroups, showAllProjects]);

  const gridQ = gridQuery.trim().toLowerCase();
  const filteredMinistries = useMemo(() => {
    const q = gridQ;
    const list = q
      ? ministries.filter(m => String(m.name || '').toLowerCase().includes(q) || String(m.code || '').includes(q))
      : ministries;
    return [...list].sort((a, b) => (b.total || 0) - (a.total || 0));
  }, [ministries, gridQ]);

  const sector = useMemo(() => {
    const counts = {};
    for (const p of projects) {
      const f = String(p.function_code || '').slice(0, 3);
      if (COFOG_SECTORS[f]) counts[f] = (counts[f] || 0) + 1;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!top) return null;
    const name = COFOG_SECTORS[top[0]];
    const match = (data?.sectors || []).find(s => String(s.name).toUpperCase() === name);
    return { code: top[0], name, amount: match ? match.amount : null };
  }, [projects, data]);

  const tagSums = useMemo(() => {
    const out = { climate: 0, nutrition: 0, social: 0 };
    for (const p of projects) {
      out.climate += TAG_COLUMNS[0][2](p.amounts);
      out.nutrition += TAG_COLUMNS[1][2](p.amounts);
      out.social += TAG_COLUMNS[2][2](p.amounts);
    }
    return out;
  }, [projects]);

  const yoy = useMemo(() => {
    let a24 = 0, a25 = 0, a26 = 0;
    for (const p of projects) {
      a24 += p.amounts?.['2024_full_year_actuals'] || 0;
      a25 += p.amounts?.['2025_revised_budget'] || 0;
      a26 += p.amounts?.['2026_approved_budget'] || 0;
    }
    return { a24, a25, a26 };
  }, [projects]);

  useEffect(() => {
    if (!mda) return;
    if (prevCode.current !== null && prevCode.current !== String(mda.code)) {
      profileRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    prevCode.current = String(mda.code);
  }, [mda]);

  if (!mda) return null;

  const projectsTotal = projects.reduce((s, p) => s + (p.amount || 0), 0);
  const projectsAgencyCount = projectGroups.length;
  const pct = (part, whole) => (whole ? (100 * part) / whole : 0);
  const total = mda.total || 0;

  const share = totalBudget ? pct(total, totalBudget) : null;
  const revenueShare = totalRevenue && revenue ? pct(revenue.total_revenue || 0, totalRevenue) : null;

  const splitParts = [
    { label: 'Personnel', value: mda.personnel || 0, color: 'bg-blue-500' },
    { label: 'Overhead', value: mda.overhead || 0, color: 'bg-indigo-400' },
    { label: 'Capital', value: mda.capital || 0, color: 'bg-emerald-500' }
  ];
  const splitTotal = splitParts.reduce((s, x) => s + x.value, 0);

  const summaryLines = [
    `${mda.name} is allocated ${formatCurrency(total)} in the ${data?.year || ''} ${data?.state || ''} budget — ${share !== null ? share.toFixed(2) + '%' : '—'} of the state total of ${formatCurrency(totalBudget)}.`,
    `Personnel costs account for ${formatCurrency(mda.personnel)} (${pct(mda.personnel || 0, total).toFixed(1)}%), overhead ${formatCurrency(mda.overhead)} (${pct(mda.overhead || 0, total).toFixed(1)}%), and capital expenditure ${formatCurrency(mda.capital)} (${pct(mda.capital || 0, total).toFixed(1)}%).`,
  ];
  if (revenue) {
    summaryLines.push(
      `Expected revenue: ${formatCurrency(revenue.total_revenue)} — FAAC ${formatCurrency(revenue.faac)}, IGR ${formatCurrency(revenue.igr)}, aids and grants ${formatCurrency(revenue.aids_grants)}, capital receipts ${formatCurrency(revenue.capital_receipts)}${revenueShare !== null ? ' (' + revenueShare.toFixed(2) + '% of state revenue)' : ''}.`
    );
  } else {
    summaryLines.push('No separate revenue line is published for this ministry in the revenue-by-MDA table.');
  }
  if (projects.length) {
    summaryLines.push(`${projects.length} capital project${projects.length === 1 ? '' : 's'} totalling ${formatCurrency(projectsTotal)} are listed${projectsAgencyCount > 1 ? ` across ${projectsAgencyCount} agenc${projectsAgencyCount === 1 ? 'y' : 'ies'}` : ''}, led by ${projects[0].project_name || 'an unnamed project'} at ${formatCurrency(projects[0].amount)}.`);
    if (yoy.a24 || yoy.a25 || yoy.a26) {
      summaryLines.push(`Capital projects under this scope moved from ${formatCurrency(yoy.a24)} (2024 actuals) to ${formatCurrency(yoy.a25)} (2025 revised) and ${formatCurrency(yoy.a26)} (2026 approved).`);
    }
  } else {
    summaryLines.push('No capital projects are listed under this ministry in the programme pages.');
  }

  const unitCount = (list) => list.reduce((s, u) => s + 1 + (u.children ? unitCount(u.children) : 0), 0);
  const overseesCount = mda.units ? unitCount(mda.units) : 0;

  const filterTree = (list, q) => {
    if (!q) return list;
    return list.map(u => {
      const kids = filterTree(u.children || [], q);
      const self = String(u.name || '').toLowerCase().includes(q.toLowerCase()) || String(u.code || '').includes(q);
      return { ...u, children: self ? (u.children || []) : kids };
    }).filter(u => u.children.length || String(u.name || '').toLowerCase().includes(q.toLowerCase()) || String(u.code || '').includes(q));
  };
  const filteredTree = filterTree(mda.units || [], treeQuery);

  const exportProjectsCSV = () => {
    if (!filteredProjects.length) return;
    const headers = ['Agency', 'Project', 'Programme Code', 'Economic', 'Function', 'Location', 'Page', ...AMOUNT_COLUMNS.map(([, l]) => l), ...TAG_COLUMNS.map(([, l]) => l)];
    const rows = filteredProjects.map(p => [
      p.mda_name || '', p.project_name || '', p.programme_code || '', p.economic_description || '', p.function_description || '', p.location_description || '', p.page,
      ...AMOUNT_COLUMNS.map(([k]) => (p.amounts ? (p.amounts[k] ?? '') : '')),
      ...TAG_COLUMNS.map(([k]) => TAG_COLUMNS.find(t => t[0] === k)[2](p.amounts))
    ]);
    const csvContent = [headers, ...rows].map(e => e.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${data?.state || 'state'}_${data?.year || ''}_${mda.name || 'ministry'}_projects.csv`.replace(/[^a-z0-9._-]+/gi, '_'));
    link.click();
  };

  return (
    <div className="space-y-6" ref={profileRef}>
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-100 bg-slate-50/30">
          <h3 className="text-xl font-bold text-slate-900">Ministry Profile</h3>
          <p className="text-sm text-slate-500">Select a ministry to see its funding, revenue, agencies, and capital projects</p>
        </div>
        <div className="p-6">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search ministries... (sorted by allocation)"
              value={gridQuery}
              onChange={(e) => setGridQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all w-full"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {filteredMinistries.map((m) => (
              <button
                key={m.code}
                onClick={() => onSelect(m)}
                className={clsx(
                  "text-left px-4 py-3 rounded-xl border text-sm font-semibold transition-all",
                  selectedMinistry?.code === m.code
                    ? "bg-slate-900 text-white border-slate-900 shadow-lg"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                )}
              >
                <span className="block truncate">{m.name}</span>
                <span className={clsx("block text-[11px] font-mono mt-0.5", selectedMinistry?.code === m.code ? "text-slate-300" : "text-slate-400")}>
                  {formatCompact(m.total)} · {m.code}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            {!isTopLevel && (
              <button
                onClick={() => parentMinistry && onSelect(parentMinistry)}
                className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back to {parentMinistry ? parentMinistry.name : 'Ministry'}
              </button>
            )}
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider font-mono">{mda.code}</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{mda.name}</h3>
            <p className="text-sm text-slate-500 mt-1">
              {isTopLevel
                ? `Oversees ${overseesCount} agenc${overseesCount === 1 ? 'y' : 'ies'}/${overseesCount === 1 ? 'department' : 'departments'} · ${formatCurrency(total)} total allocation`
                : `${formatCurrency(total)} total allocation · part of ${parentMinistry ? parentMinistry.name : 'a ministry'}`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-xs font-black px-3 py-1.5 rounded-full bg-slate-900 text-white">
              {share !== null ? share.toFixed(2) : '—'}% of budget
            </span>
            {sector && (
              <button
                onClick={onOpenSector}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors"
                title={sector.amount != null ? `Sector total ${formatCurrency(sector.amount)}` : 'View sector analysis'}
              >
                <PieChart className="w-3.5 h-3.5 text-slate-400" />
                {sector.name}
                {sector.amount != null && <span className="font-mono text-slate-500">{formatCompact(sector.amount)}</span>}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <MetricCard title="Personnel" value={mda.personnel} subtitle={`${pct(mda.personnel || 0, total).toFixed(1)}% of ministry`} icon={Users} color="blue" />
          <MetricCard title="Overhead" value={mda.overhead} subtitle={`${pct(mda.overhead || 0, total).toFixed(1)}% of ministry`} icon={Coins} color="indigo" />
          <MetricCard title="Recurrent" value={mda.recurrent} subtitle="personnel + overhead" icon={Receipt} color="amber" />
          <MetricCard title="Capital" value={mda.capital} subtitle="projects & assets" icon={Wallet} color="emerald" />
          <MetricCard title="Total" value={total} subtitle={`of ${formatCurrency(totalBudget)} state budget`} icon={TrendingUp} color="rose" />
        </div>

        {splitTotal > 0 && (
          <div className="mb-6">
            <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100">
              {splitParts.map((part) => (
                <div
                  key={part.label}
                  className={part.color}
                  style={{ width: `${(part.value / splitTotal) * 100}%` }}
                  title={`${part.label}: ${formatCurrency(part.value)}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2">
              {splitParts.map((part) => (
                <span key={part.label} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                  <span className={`w-2.5 h-2.5 rounded-full ${part.color}`} />
                  {part.label} · <span className="font-bold">{formatCurrency(part.value)}</span>
                  <span className="text-slate-400">({pct(part.value, splitTotal).toFixed(1)}%)</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Budget Summary
          </p>
          <div className="space-y-2">
            {summaryLines.map((line, i) => (
              <p key={i} className="text-sm text-slate-700 leading-relaxed">{line}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Oversees</h3>
            <p className="text-sm text-slate-500">Departments and agencies under this ministry</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTreeSignal({ type: 'expand', n: (treeSignal?.n || 0) + 1 })}
              className="px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Expand all
            </button>
            <button
              onClick={() => setTreeSignal({ type: 'collapse', n: (treeSignal?.n || 0) + 1 })}
              className="px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Collapse all
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filter agencies..."
                value={treeQuery}
                onChange={(e) => setTreeQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all w-full sm:w-64"
              />
            </div>
          </div>
        </div>
        <div className="p-6">
          {filteredTree.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-6 text-center">No agencies listed under this ministry in the document.</p>
          ) : (
            <div className="space-y-1" key={treeSignal ? treeSignal.n : 0}>
              {filteredTree.map((unit, idx) => (
                <UnitRow key={unit.code || idx} unit={unit} depth={0} onSelect={onSelect} onOpenSource={onOpenSource} formatCompact={formatCompact} selectedCode={mda.code} defaultExpanded={treeSignal?.type === 'expand'} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-100 bg-slate-50/30">
          <h3 className="text-xl font-bold text-slate-900">Revenue</h3>
          <p className="text-sm text-slate-500">Revenue by MDA as published in the document</p>
        </div>
        {isLoading && !revenueRows ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : revenue ? (
          <div className="overflow-x-auto">
            <table className="tbl-responsive">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-8 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Source</th>
                  <th className="px-8 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">FAAC</th>
                  <th className="px-8 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">IGR</th>
                  <th className="px-8 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total Recurrent</th>
                  <th className="px-8 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Aids & Grants</th>
                  <th className="px-8 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Capital Receipts</th>
                  <th className="px-8 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td data-label="Source" className="px-8 py-4 text-sm font-semibold text-slate-800">{revenue.mda_name}</td>
                  <td data-label="FAAC" className="px-8 py-4 text-right text-sm text-slate-600">{formatCurrency(revenue.faac)}</td>
                  <td data-label="IGR" className="px-8 py-4 text-right text-sm text-slate-600">{formatCurrency(revenue.igr)}</td>
                  <td data-label="Total Recurrent" className="px-8 py-4 text-right text-sm text-slate-600">{formatCurrency(revenue.total_recurrent)}</td>
                  <td data-label="Aids & Grants" className="px-8 py-4 text-right text-sm text-slate-600">{formatCurrency(revenue.aids_grants)}</td>
                  <td data-label="Capital Receipts" className="px-8 py-4 text-right text-sm text-slate-600">{formatCurrency(revenue.capital_receipts)}</td>
                  <td data-label="Total Revenue" className="px-8 py-4 text-right text-sm font-bold text-slate-900">{formatCurrency(revenue.total_revenue)}</td>
                </tr>
                {revenue.mda_code !== mda.code && (
                  <tr>
                    <td className="px-8 py-3 text-[11px] text-slate-400 italic" colSpan={7}>
                      Shown from the matching revenue line {revenue.mda_code} — no exact line is published for {mda.code}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic py-10 text-center">No revenue line is published for this ministry.</p>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-50/30">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Capital Projects</h3>
            <p className="text-sm text-slate-500">
              {isTopLevel
                ? `All agencies under ${mda.name} · ${projectsAgencyCount} agenc${projectsAgencyCount === 1 ? 'y' : 'ies'} · ${projects.length} projects · ${formatCurrency(projectsTotal)} total (2026 approved)`
                : `${mda.name} · ${projects.length} project${projects.length === 1 ? '' : 's'} · ${formatCurrency(projectsTotal)} total (2026 approved)`}
            </p>
            {!showTrend && (tagSums.climate > 0 || tagSums.nutrition > 0 || tagSums.social > 0) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tagSums.climate > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full border border-emerald-100">
                    <Leaf className="w-3.5 h-3.5" /> Climate {formatCompact(tagSums.climate)}
                  </span>
                )}
                {tagSums.nutrition > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-full border border-amber-100">
                    <Wheat className="w-3.5 h-3.5" /> Food/Nutrition {formatCompact(tagSums.nutrition)}
                  </span>
                )}
                {tagSums.social > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-[11px] font-bold rounded-full border border-blue-100">
                    <ShieldCheck className="w-3.5 h-3.5" /> Social Protection {formatCompact(tagSums.social)}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={projectQuery}
                onChange={(e) => { setProjectQuery(e.target.value); setShowAllProjects(false); }}
                className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all w-full sm:w-56"
              />
            </div>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
              <button
                onClick={() => setShowTrend(false)}
                className={clsx("px-3 py-1.5 text-xs font-bold rounded-lg transition-colors", !showTrend ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100")}
              >
                2026 Approved
              </button>
              <button
                onClick={() => setShowTrend(true)}
                className={clsx("px-3 py-1.5 text-xs font-bold rounded-lg transition-colors", showTrend ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100")}
              >
                Trend
              </button>
            </div>
            <button
              onClick={exportProjectsCSV}
              disabled={!filteredProjects.length}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
        </div>
        {isLoading && !projectsRows ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <p className="text-sm text-slate-400 italic py-10 text-center">No capital projects are listed under this ministry.</p>
        ) : filteredProjects.length === 0 ? (
          <p className="text-sm text-slate-400 italic py-10 text-center">No projects match "{projectQuery}".</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="tbl-responsive">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-8 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Agency / Institution</th>
                    <th className="px-8 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Project</th>
                    <th className="px-8 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Economic</th>
                    <th className="px-8 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                    {showTrend
                      ? AMOUNT_COLUMNS.map(([, label]) => (
                          <th key={label} className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</th>
                        ))
                      : (
                          <th className="px-8 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">2026 Approved</th>
                        )}
                    <th className="px-8 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Page</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleGroups.map((group) => (
                    <Fragment key={group.name}>
                      <tr className="bg-slate-900">
                        <td colSpan={showTrend ? 9 : 6} className="px-8 py-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                            <div className="flex items-center gap-2 min-w-0">
                              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                              <p className="text-sm font-bold text-white break-words">{group.name}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[11px] font-mono text-slate-300">
                                {group.rows.length}{group.hidden > 0 ? ` +${group.hidden} more` : ''} project{group.rows.length === 1 ? '' : 's'}
                              </span>
                              <span className="text-sm font-bold text-emerald-300">{formatCurrency(group.total)}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                      {group.rows.map((p, i) => (
                        <tr key={p.programme_code + '-' + group.name + '-' + i} className="hover:bg-slate-50/50">
                          <td data-label="Agency" className="px-8 py-4 text-sm font-semibold text-slate-600">{p.mda_name || '—'}</td>
                          <td data-label="Project" className="px-8 py-4 text-sm font-semibold text-slate-800 max-w-md">
                            <span className="block break-words" title={p.project_name}>{p.project_name}</span>
                            <span className="block text-[11px] text-slate-400 font-mono mt-0.5">{p.programme_code}</span>
                          </td>
                          <td data-label="Economic" className="px-8 py-4 text-sm text-slate-600">{p.economic_description || '—'}</td>
                          <td data-label="Location" className="px-8 py-4 text-sm text-slate-600">{p.location_description || '—'}</td>
                          {showTrend
                            ? AMOUNT_COLUMNS.map(([k, label]) => (
                                <td key={k} data-label={label} className="px-6 py-4 text-right text-sm text-slate-600">{p.amounts ? formatCurrency(p.amounts[k]) : '—'}</td>
                              ))
                            : (
                                <td data-label="2026 Approved" className="px-8 py-4 text-right text-sm font-bold text-slate-900">{formatCurrency(p.amount)}</td>
                              )}
                          <td data-label="Page" className="px-8 py-4 text-right text-xs font-mono text-slate-400">{p.page}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {!showAllProjects && visibleGroups.some(g => g.hidden > 0) && (
              <div className="p-4 border-t border-slate-100 text-center">
                <button
                  onClick={() => setShowAllProjects(true)}
                  className="px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-colors"
                >
                  Show all {filteredProjects.length} projects
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const findUnit = (root, code) => {
  for (const u of root.units || []) {
    if (String(u.code) === code) return u;
    const found = findUnit(u, code);
    if (found) return found;
  }
  return null;
};

export default function StateDashboard() {
  const { stateId } = useParams();
  const { states, isInitialized } = useBudget();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMDA, setSelectedMDA] = useState(null);
  const [summaryEvidence, setSummaryEvidence] = useState(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'mdas', 'search', 'audit', 'pedigree'
  const [fullText, setFullText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [verificationMode, setVerificationMode] = useState('pdf'); // 'pdf', 'raw', 'process'
  const [selectedMinistry, setSelectedMinistry] = useState(null);
  const [revenueRows, setRevenueRows] = useState(null);
  const [projectsRows, setProjectsRows] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [sections, setSections] = useState(null);

  // Static table-of-contents for the source PDF (when the pipeline shipped one)
  useEffect(() => {
    if (!stateId) return;
    setSections(null);
    fetch(`/data/${stateId}.sections.json`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => setSections(Array.isArray(j?.sections) ? j.sections : null))
      .catch(() => setSections(null));
  }, [stateId]);

  // Lazy-fetch revenue-by-MDA and programme projects for the Ministry Profile tab
  useEffect(() => {
    if (activeTab !== 'ministries' || !data) return;
    const retryFetch = async (fileId) => {
      for (let i = 0; i < 4; i++) {
        try {
          const url = storage.getFileDownload(BUCKET_ID, fileId);
          const res = await fetch(url);
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return await res.json();
        } catch (err) {
          if (i === 3) throw err;
          await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
        }
      }
    };
    const fetchJson = async (fileId, kind, setter) => {
      if (!fileId) return;
      const cacheKey = `file:${stateId}:${kind}:${fileId}`;
      const cached = await cacheGet(cacheKey);
      if (cached && cached.payload) {
        setter(cached.payload);
        return;
      }
      try {
        // Same-origin static copy first (fast, no Appwrite round-trip), then storage fallback.
        const staticRes = await fetch(`/data/${stateId}.${kind}.json`);
        const rows = staticRes.ok ? await staticRes.json() : await retryFetch(fileId);
        setter(rows);
        await cacheSet(cacheKey, { savedAt: Date.now(), payload: rows });
      } catch (err) {
        console.error('Ministry profile file fetch failed', err);
      }
    };
    setIsProfileLoading(true);
    Promise.all([
      fetchJson(data.revenue_file_id, 'revenue', setRevenueRows),
      fetchJson(data.projects_file_id, 'projects', setProjectsRows)
    ]).finally(() => setIsProfileLoading(false));
  }, [activeTab, data, stateId]);

  const ministries = useMemo(() => (data?.mdas || []).filter(m => String(m.code || '').endsWith('000000')), [data]);

  const selectTarget = (target) => {
    if (!target) return;
    setSelectedMinistry(target);
    const isTop = String(target.code || '').endsWith('000000');
    const next = { m: target.code };
    if (!isTop) {
      const parent = ministries.find(m => String(m.code || '').slice(0, 4) === String(target.code || '').slice(0, 4));
      if (parent) next.m = parent.code;
      next.u = target.code;
    }
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (!data || !ministries.length) return;
    const mCode = searchParams.get('m');
    const uCode = searchParams.get('u');
    if (mCode) {
      const ministry = ministries.find(m => String(m.code) === mCode);
      if (ministry) {
        if (uCode) {
          const unit = findUnit(ministry, uCode);
          if (unit && String(selectedMinistry?.code) !== uCode) {
            setSelectedMinistry({ ...unit, pageNumber: unit.provenance?.page });
          }
          return;
        }
        if (String(selectedMinistry?.code) !== mCode) setSelectedMinistry(ministry);
        return;
      }
    }
    if (!selectedMinistry) {
      const largest = [...ministries].sort((a, b) => (b.total || 0) - (a.total || 0))[0];
      setSelectedMinistry(largest);
    }
  }, [data, ministries, searchParams, selectedMinistry]);

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

  // Fetch full text for universal search (static copy first, storage fallback)
  useEffect(() => {
    if (activeTab !== 'search' && verificationMode !== 'raw') return;
    if (fullText) return;
    if (!stateId && !data?.text_file_id) return;
    setIsSearching(true);
    const candidates = [];
    if (stateId) candidates.push(`/data/${stateId}.txt`);
    if (data?.text_file_id) candidates.push(storage.getFileView(BUCKET_ID, data.text_file_id));
    (async () => {
      for (const url of candidates) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const text = await res.text();
          if (text) setFullText(text);
          return;
        } catch (e) {
          // try next candidate
        }
      }
    })().catch(() => {}).finally(() => setIsSearching(false));
  }, [activeTab, verificationMode, data?.text_file_id, stateId, fullText]);

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
    const headers = ["Code", "Name", "Type", "Personnel", "Overhead", "Capital", "Total"];
    const rows = [];
    data.mdas.forEach(m => {
      rows.push([`"${m.code}"`, `"${m.name}"`, "MDA", m.personnel, m.overhead, m.capital, m.total]);
      const walk = (units, depth) => units.forEach(u => {
        rows.push([`"${u.code}"`, `"${u.name}"`, depth === 0 ? "Department" : "Unit", u.personnel, u.overhead, u.capital, u.total]);
        walk(u.children || [], depth + 1);
      });
      walk(m.units || [], 0);
    });
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${data.state}_budget_${data.year}.csv`);
    link.click();
  };

  const viewAnomalyPage = (anomaly) => {
    setActiveTab('overview');
    setSelectedMDA({
      name: `${ISSUE_LABELS[anomaly.code] || anomaly.code.replace(/_/g, ' ')} — Page ${anomaly.pages[0]}`,
      pageNumber: anomaly.pages[0],
      provenance: { line_text: anomaly.lines?.[0] || anomaly.message }
    });
  };

  const anomalies = data?.anomalies || [];

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
      
      <AuditTrailModal 
        audit={data.audit} 
        stateName={data.state} 
        isOpen={isAuditModalOpen} 
        onClose={() => setIsAuditModalOpen(false)} 
      />

      {/* Source Evidence Sidebar */}
      {(summaryEvidence || selectedMDA) && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[520px] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Intelligence Sidebar</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Multi-Mode Verification</p>
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

          {/* Mode Switcher */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {[
              { id: 'pdf', label: 'OFFICIAL PDF', icon: FileText },
              { id: 'raw', label: 'RAW OCR TEXT', icon: Search },
              { id: 'process', label: 'PROCESS LOG', icon: History }
            ].map(mode => (
              <button 
                key={mode.id}
                onClick={() => setVerificationMode(mode.id)}
                className={clsx(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all whitespace-nowrap",
                  verificationMode === mode.id ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-100"
                )}
              >
                <mode.icon className="w-3 h-3" />
                {mode.label}
              </button>
            ))}
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="p-4 bg-slate-900 rounded-2xl text-white">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Context</p>
              <p className="text-lg font-bold">{(summaryEvidence || selectedMDA).name || summaryEvidence?.label}</p>
              <p className="text-sm font-mono text-slate-400">{(summaryEvidence || selectedMDA).code || ""}</p>
              {(summaryEvidence || selectedMDA).provenance?.line_text && (
                <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/10 italic text-xs text-slate-300">
                  "{ (summaryEvidence || selectedMDA).provenance.line_text }"
                </div>
              )}
            </div>

            <div className="h-[500px] rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 relative">
              {verificationMode === 'pdf' && (
                <SourceInspector 
                  pdfFileId={data.pdf_file_id || null}
                  stateId={stateId}
                  sections={sections}
                  figures={selectedMDA}
                  highlight={selectedMDA?.sourceLine || selectedMDA?.provenance?.line_text}
                  pageNumber={parseInt(searchParams.get('page'), 10) || summaryEvidence?.pageNumber || selectedMDA?.pageNumber || selectedMDA?.provenance?.page || 1} 
                />
              )}

              {verificationMode === 'raw' && (
                <div className="h-full flex flex-col">
                  {isSearching ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4">
                      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                      <p className="text-xs text-slate-500 font-bold">Loading Raw Text...</p>
                    </div>
                  ) : (
                    <div className="flex-1 p-6 font-mono text-[11px] leading-relaxed bg-slate-900 text-slate-400 overflow-y-auto whitespace-pre-wrap">
                      {fullText || "No raw text extract available."}
                    </div>
                  )}
                </div>
              )}

              {verificationMode === 'process' && (
                <div className="h-full p-6 font-mono text-[11px] leading-relaxed bg-slate-50 text-slate-600 overflow-y-auto">
                  <Title className="text-xs mb-4">Pipeline Execution Log</Title>
                  <pre className="whitespace-pre-wrap">{data.process_logs || "No logs available."}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Intelligence Tab Switcher */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'overview', label: 'Overview', icon: PieChart },
            { id: 'mdas', label: 'MDA Breakdown', icon: Building2 },
            { id: 'ministries', label: 'Ministry Profile', icon: Landmark },
            { id: 'search', label: 'Universal Search', icon: Search },
            { id: 'audit', label: 'Document Check', icon: ShieldCheck },
            { id: 'pedigree', label: 'Data Pedigree', icon: History }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20"
                  : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'overview' && (
            <>
              {/* Data Integrity / Transparency Score Banner */}
              {data.audit && (
                <div className={clsx(
                  "mb-8 rounded-2xl p-6 border flex items-center justify-between transition-all hover:shadow-lg cursor-pointer",
                  data.audit.reconciled ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"
                )} onClick={() => setActiveTab('audit')}>
                  <div className="flex items-center gap-4">
                    <div className={clsx(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      data.audit.reconciled ? "bg-emerald-100" : "bg-rose-100"
                    )}>
                      {data.audit.reconciled ? <ShieldCheck className="w-6 h-6 text-emerald-600" /> : <AlertTriangle className="w-6 h-6 text-rose-600" />}
                    </div>
                    <div>
                      <h3 className={clsx("text-lg font-bold", data.audit.reconciled ? "text-emerald-900" : "text-rose-900")}>
                        {data.audit.reconciled ? "High Integrity Budget" : "Data Reconciliation Alert"}
                      </h3>
                      <p className={clsx("text-sm", data.audit.reconciled ? "text-emerald-700" : "text-rose-700")}>
                        {data.audit.reconciled 
                          ? "Every figure in this dashboard matches the sub-totals in the official document." 
                          : `Discrepancy detected: ${data.audit.errors?.[0]?.message || "Unreconciled figures found in source."}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Integrity Score</p>
                    <div className="flex items-center gap-2 justify-end">
                      <span className={clsx("text-2xl font-black", data.audit.reconciled ? "text-emerald-600" : "text-rose-600")}>
                        {data.audit.integrity_score || (data.audit.reconciled ? 100 : 0)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Document Anomalies Banner */}
              {anomalies.length > 0 && (
                <div className="mb-8 rounded-2xl p-6 border border-amber-200 bg-amber-50 flex items-center justify-between transition-all hover:shadow-lg cursor-pointer"
                  onClick={() => setActiveTab('audit')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-100">
                      <AlertTriangle className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-amber-900">
                        {anomalies.length} issue{anomalies.length === 1 ? '' : 's'} found in this document
                      </h3>
                      <p className="text-sm text-amber-700">
                        In {anomalies.length} place{anomalies.length === 1 ? '' : 's'}, a figure in the official document does not add up. We show the figures exactly as published — nothing was changed.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <AnomalySeverityBadge severity="high" />
                    <span className="text-sm font-bold text-amber-700 whitespace-nowrap">See the issues →</span>
                  </div>
                </div>
              )}

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  subtitle={`${((summary.igr || 0) / (summary.recurrent_revenue || 1)) * 100 === 0 ? 'n/a' : ((summary.igr / (summary.recurrent_revenue || 1)) * 100).toFixed(1) + '% of revenue base'}`}
                  icon={Coins}
                  color="amber"
                  onClick={() => handleSummaryClick('igr', 'Internal Revenue (IGR)')}
                />
              </div>

              {/* Main Content Grid */}
              <div className="grid lg:grid-cols-3 gap-8">
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
                          key={sector.name}
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
                  <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-2xl shadow-slate-900/20">
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
                        <span className={clsx("text-sm font-bold", data.audit?.reconciled ? "text-emerald-400" : "text-amber-400")}>
                          {data.audit?.reconciled ? "Platinum" : "Reconciling"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-white/10">
                        <span className="text-sm text-slate-300">Balance Check</span>
                        <span className="text-sm font-bold text-emerald-400">
                          {Math.abs(summary.total_expenditure - summary.total_revenue) < 1000 ? 'Balanced' : 'Mismatch'}
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
                        onClick={() => setActiveTab('mdas')}
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
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'mdas' && (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">All Funding MDAs</h3>
                  <p className="text-sm text-slate-500">Every ministry, department, and agency allocation</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search ministries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all w-full sm:w-80"
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="tbl-responsive">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Agency</th>
                      <th className="px-8 py-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Personnel</th>
                      <th className="px-8 py-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Overhead</th>
                      <th className="px-8 py-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Capital</th>
                      <th className="px-8 py-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMDAs.map((mda) => (
                      <MDARow 
                        key={mda.code} 
                        mda={mda} 
                        onSelect={setSelectedMDA} 
                        formatCompact={formatCompact} 
                        errors={data.audit?.errors}
                        anomalies={anomalies}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'ministries' && (
            <MinistryProfile
              data={data}
              ministries={ministries}
              selectedMinistry={selectedMinistry}
              onSelect={selectTarget}
              onOpenSource={(unit) => {
                selectTarget(unit);
                setSelectedMDA({ ...unit, pageNumber: unit.provenance?.page });
              }}
              onOpenSector={() => navigate(`/state/${stateId}/sectors`)}
              revenueRows={revenueRows}
              projectsRows={projectsRows}
              isLoading={isProfileLoading}
              formatCurrency={formatCurrency}
              formatCompact={formatCompact}
            />
          )}

          {activeTab === 'search' && (
            <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/50 min-h-[600px] flex flex-col p-0 overflow-hidden">
              <div className="p-8 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                    <Search className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Universal Document Search</h2>
                    <p className="text-sm text-slate-500">Query all 800+ pages of raw extracted text from the official document.</p>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search for specific projects, items or keywords (e.g. 'Borehole', 'Toyota', 'School Construction')..."
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-lg font-medium outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all shadow-inner"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-900 p-8 font-mono text-sm leading-relaxed text-slate-400">
                {isSearching ? (
                  <div className="flex flex-col items-center justify-center h-full py-20 space-y-4">
                    <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                    <p className="text-slate-500">Syncing raw document text...</p>
                  </div>
                ) : !fullText ? (
                  <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-4">
                    <FileSearch className="w-16 h-16 text-slate-800" />
                    <p className="text-slate-600 max-w-xs">No text extract found for this state. Ensure 'text.txt' was uploaded.</p>
                  </div>
                ) : searchQuery.length < 3 ? (
                  <div className="flex flex-col items-center justify-center h-full py-20 text-center opacity-50">
                    <Sparkles className="w-12 h-12 mb-4" />
                    <p>Enter at least 3 characters to search the raw document...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fullText.split('\n').filter(line => line.toLowerCase().includes(searchQuery.toLowerCase())).map((line, idx) => {
                      const parts = line.split(new RegExp(`(${searchQuery})`, 'gi'));
                      return (
                        <div key={idx} className="p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors group cursor-pointer" onClick={() => {
                          // Find page number if mentioned in line or nearby
                          const pageMatch = line.match(/Page\s+(\d+)/i);
                          setSelectedMDA({ name: 'Search Match', pageNumber: pageMatch ? parseInt(pageMatch[1]) : 1, provenance: { line_text: line } });
                        }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-500">MATCH {idx + 1}</span>
                            <span className="text-[10px] text-slate-600 opacity-0 group-hover:opacity-100">CLICK TO JUMP IN PDF</span>
                          </div>
                          <p className="text-slate-300">
                            {parts.map((part, i) => (
                              <span key={i} className={part.toLowerCase() === searchQuery.toLowerCase() ? "bg-emerald-500/30 text-emerald-400 font-bold" : ""}>
                                {part}
                              </span>
                            ))}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-8">
              <div className="p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Document Check: {data.state}</h3>
                    <p className="text-sm text-slate-500 font-medium">Our automatic check of how well every figure adds up</p>
                  </div>
                  <AnomalySeverityBadge severity={anomalies.length > 0 ? 'high' : 'info'} />
                </div>
                <AuditReportBody audit={data.audit} stateName={data.state} />
              </div>
              <AnomalyCenter anomalies={anomalies} onViewPage={viewAnomalyPage} />
            </div>
          )}

          {activeTab === 'pedigree' && (
            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="rounded-[2rem] border-none shadow-xl bg-white p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black">Process Logs</h3>
                    <p className="text-sm text-slate-500">Pipeline execution history</p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-6 font-mono text-xs leading-relaxed h-[400px] overflow-y-auto text-slate-600 border border-slate-100">
                  <pre className="whitespace-pre-wrap">{data.process_logs || "No process logs recorded."}</pre>
                </div>
              </Card>

              <Card className="rounded-[2rem] border-none shadow-xl bg-white p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                    <Scale className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black">Document Metrics</h3>
                    <p className="text-sm text-slate-500">Structural complexity analysis</p>
                  </div>
                </div>
                <div className="space-y-6">
                  {data.document_metrics && Object.keys(data.document_metrics).length > 0 ? Object.entries(data.document_metrics).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">{key.replace(/_/g, ' ')}</span>
                      <span className="text-lg font-black text-slate-900">{typeof val === 'object' ? JSON.stringify(val) : val}</span>
                    </div>
                  )) : <p className="text-slate-400">No document metrics available.</p>}
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Trust Footer (Condensed) */}
        <div className="mt-16 pt-16 border-t border-slate-200">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg border border-slate-100">
                  <Database className="w-6 h-6 text-slate-900" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-900">Verified & Traceable Data Bundle</span>
              </div>
              <h2 className="text-3xl font-black mb-6 leading-tight text-slate-900">
                Every figure is traceable to the original source.
              </h2>
              <p className="text-slate-500 leading-relaxed mb-8">
                Our system uses layout-aware neural parsing to extract data from the official {data.year} {data.state} State Budget. 
                Triple-identity checksums ensure the figures match what was signed into law.
              </p>
              <div className="flex flex-wrap gap-3">
                {data.pdf_file_id && (
                  <button 
                    onClick={() => {
                      const url = storage.getFileDownload(BUCKET_ID, data.pdf_file_id);
                      window.open(url, '_blank');
                    }}
                    className="px-8 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xl shadow-slate-900/20"
                  >
                    <Download className="w-4 h-4" />
                    SOURCE PDF
                  </button>
                )}
                <button 
                  onClick={() => setIsAuditModalOpen(true)}
                  className="px-8 py-4 bg-white border border-slate-200 text-slate-900 font-black rounded-2xl hover:bg-slate-50 transition-all"
                >
                  DOCUMENT CHECK
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'MDA Count', val: data.mdas.length },
                { label: 'Sectors', val: data.sectors.length },
                { label: 'Integrity', val: `${data.audit?.integrity_score || 100}%`, color: 'text-emerald-600' },
                { label: 'Fiscal Year', val: data.year }
              ].map((stat, i) => (
                <div key={i} className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className={clsx("text-3xl font-black", stat.color || "text-slate-900")}>{stat.val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
