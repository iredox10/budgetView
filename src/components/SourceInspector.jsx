import { useState, useEffect, useRef } from 'react';
import { storage, BUCKET_ID } from '../utils/appwrite';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, Maximize2, ZoomIn, ZoomOut, ListTree, Copy, Check, Download, RotateCcw } from 'lucide-react';
import { Title, Text, Badge, Button } from '@tremor/react';

const parseAmounts = (line) => {
  if (!line) return null;
  const nums = String(line).match(/[\d,]+\.\d{2}/g);
  if (!nums || nums.length < 1) return null;
  const n = nums.map(x => parseFloat(x.replace(/,/g, '')));
  if (n.some(x => !Number.isFinite(x))) return null;
  return n;
};

export default function SourceInspector({ pdfFileId, pageNumber, stateId, highlight, figures, sections }) {
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.5);
  const [page, setPage] = useState(pageNumber || 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const canvasRef = useRef(null);
  const boxRef = useRef(null);
  const renderTaskRef = useRef(null);
  const loadSeqRef = useRef(0);

  useEffect(() => {
    if (!pdfFileId && !stateId) {
      setError("No source PDF has been uploaded for this state yet.");
      setLoading(false);
      return;
    }
    loadPDF();
  }, [pdfFileId, pageNumber, stateId, highlight, page, scale]);

  useEffect(() => {
    setPage(pageNumber || 1);
  }, [pageNumber]);

  const jumpTo = (p) => {
    if (!numPages || p < 1 || p > numPages) return;
    setPage(p);
  };

  const jumpToRef = useRef(jumpTo);
  jumpToRef.current = jumpTo;

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') jumpToRef.current(page - 1);
      if (e.key === 'ArrowRight') jumpToRef.current(page + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [page]);

  const locateAndHighlight = async (pg, viewport) => {
    if (!highlight) return;
    const text = await pg.getTextContent();
    const code = String(highlight).match(/\d{6,12}/)?.[0];
    const nameTokens = String(highlight)
      .split(/\s+/)
      .filter(w => w.length > 3 && !/\d/.test(w))
      .slice(0, 3)
      .map(w => w.toLowerCase());
    const codePrefix = code ? code.slice(0, 4) : null;
    const amountTokens = String(highlight)
      .match(/[\d,]+\.\d{2}/g)
      ?.slice(0, 2)
      .map(x => x.replace(/[^\d]/g, ''));

    const hits = (text.items || []).filter(it => {
      const s = (it.str || '').trim();
      if (!s) return false;
      const sDigits = s.replace(/[^\d]/g, '');
      if (code && s.includes(code)) return true;
      if (codePrefix && s.startsWith(codePrefix) && /\d{4}/.test(s)) return true;
      if (amountTokens?.some(a => a.length >= 7 && sDigits.includes(a))) return true;
      return nameTokens.length > 0 && nameTokens.some(t => s.toLowerCase().includes(t));
    });
    if (!hits.length) return;

    const rows = [];
    for (const it of hits) {
      const x0 = it.transform[4];
      const top = it.transform[5] - (it.height || 0);
      const right = x0 + (it.width || 0);
      const bottom = it.transform[5];
      let row = rows.find(r => Math.abs(r.bottom - bottom) < 3);
      if (!row) {
        rows.push({ left: x0, top, right, bottom });
      } else {
        row.left = Math.min(row.left, x0);
        row.top = Math.min(row.top, top);
        row.right = Math.max(row.right, right);
        row.bottom = Math.max(row.bottom, bottom);
      }
    }

    const ctx = canvasRef.current.getContext('2d');
    let firstY = Infinity;
    for (const r of rows) {
      const tl = viewport.convertToViewportPoint(r.left, r.top);
      const br = viewport.convertToViewportPoint(r.right, r.bottom);
      const x = tl[0], y = tl[1], w = br[0] - tl[0], h = br[1] - tl[1];
      ctx.fillStyle = 'rgba(253, 224, 71, 0.8)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(202, 138, 4, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      if (y < firstY) firstY = y;
    }

    if (boxRef.current && Number.isFinite(firstY)) {
      const scaleFactor = canvasRef.current.clientWidth / canvasRef.current.width;
      const cssY = firstY * scaleFactor;
      boxRef.current.scrollTop = Math.max(0, cssY - boxRef.current.clientHeight / 2);
    }
  };

  const loadPDF = async () => {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setError(null);
    try {
      if (!window.pdfjsLib) {
        throw new Error("PDF engine not initialized. Please refresh.");
      }

      const candidates = [];
      if (stateId) candidates.push(`/data/${stateId}.pdf`);
      if (pdfFileId) candidates.push(storage.getFileView(BUCKET_ID, pdfFileId));

      let response = null;
      for (const url of candidates) {
        const isStatic = url.startsWith('/data/');
        const attempts = isStatic ? 1 : 4;
        for (let attempt = 1; attempt <= attempts; attempt++) {
          try {
            response = await fetch(url, isStatic ? {} : { headers: { Range: 'bytes=0-' } });
            if (response.ok) break;
          } catch {
            // keep trying
          }
          response = null;
          if (attempt < attempts) await new Promise(r => setTimeout(r, attempt * 2000));
        }
        if (response?.ok) break;
      }
      if (!response || !response.ok) {
        throw new Error(`download failed (${response?.status || 'no response'})`);
      }
      const pdfBytes = await response.arrayBuffer();

      const loadingTask = window.pdfjsLib.getDocument({ data: pdfBytes });
      const pdf = await loadingTask.promise;
      if (seq !== loadSeqRef.current) return;
      setNumPages(pdf.numPages);

      const target = Math.min(Math.max(page || 1, 1), pdf.numPages);
      const pdfPage = await pdf.getPage(target);
      if (seq !== loadSeqRef.current) return;
      const viewport = pdfPage.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      renderTaskRef.current = pdfPage.render({ canvasContext: context, viewport });
      await renderTaskRef.current.promise;
      if (seq !== loadSeqRef.current) return;
      await locateAndHighlight(pdfPage, viewport);
      if (seq !== loadSeqRef.current) return;
      setLoading(false);
    } catch (err) {
      if (seq !== loadSeqRef.current) return;
      if (/cancelled/i.test(String(err?.message || err?.name || ''))) return;
      console.error("PDF rendering error:", err);
      setError("Unable to render source page. The file may be restricted or missing.");
      setLoading(false);
    }
  };

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.width) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${stateId || 'source'}-page${page}.png`;
    a.click();
  };

  const copyLine = async () => {
    if (!highlight) return;
    try {
      await navigator.clipboard.writeText(String(highlight));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };

  const fitWidth = () => {
    if (!boxRef.current || !canvasRef.current) return;
    const w = boxRef.current.clientWidth - 24;
    const base = canvasRef.current.width / scale;
    setScale(Math.max(0.4, Math.min(3, w / base)));
  };

  const amounts = parseAmounts(highlight);
  const figureKeys = ['personnel', 'overhead', 'recurrent', 'capital', 'total'];
  const checks = figures && amounts
    ? figureKeys.map(k => {
        const appVal = figures[k];
        if (appVal == null || !Number.isFinite(appVal)) return null;
        const pdfVal = amounts.find(a => Math.abs(a - appVal) < 0.01);
        if (pdfVal == null) return { label: k, appVal, pdfVal: null, match: null, absent: true };
        return { label: k, appVal, pdfVal, match: Math.abs(appVal - pdfVal) < 0.01 };
      }).filter(Boolean)
    : [];

  const fmt = (v) => '₦' + (v ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge color="blue" size="xs">PAGE {page}</Badge>
          {numPages && <Text className="text-[10px] font-bold text-slate-400">/ {numPages}</Text>}
          <Text className="text-[10px] font-bold uppercase text-slate-400">Original Document Snippet</Text>
        </div>
        <div className="flex items-center gap-1">
          {sections && sections.length > 0 && (
            <button
              onClick={() => setShowToc(!showToc)}
              className={`p-1.5 rounded-lg transition-colors ${showToc ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
              title="Table of contents"
            >
              <ListTree className="w-4 h-4" />
            </button>
          )}
          <button onClick={copyLine} disabled={!highlight} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-30" title="Copy extracted line">
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
          <button onClick={downloadPng} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors" title="Download page as PNG">
            <Download className="w-4 h-4" />
          </button>
          {(pdfFileId || stateId) && (
            <button
              onClick={() => window.open(stateId ? `/data/${stateId}.pdf` : storage.getFileView(BUCKET_ID, pdfFileId), '_blank')}
              className="text-blue-600 hover:text-blue-700 transition-colors p-1.5"
              title="Open full PDF"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showToc && sections && sections.length > 0 && (
        <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg p-2 space-y-0.5">
          {sections.map((s, i) => (
            <button
              key={i}
              onClick={() => { jumpTo(s.page); setShowToc(false); }}
              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50 text-xs flex items-center justify-between gap-3"
            >
              <span className="truncate text-slate-700">{s.title}</span>
              <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">p{s.page}</span>
            </button>
          ))}
        </div>
      )}

      {/* Navigation / zoom toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => jumpTo(page - 1)} disabled={!numPages || page <= 1} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors" title="Previous page (←)">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="number"
            min={1}
            max={numPages || 1}
            value={page}
            onChange={(e) => jumpTo(parseInt(e.target.value, 10))}
            className="w-14 text-center text-xs font-bold text-slate-700 bg-slate-100 rounded-lg px-1 py-1 outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button onClick={() => jumpTo(page + 1)} disabled={!numPages || page >= numPages} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors" title="Next page (→)">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setScale(s => Math.max(0.4, +(s - 0.25).toFixed(2)))} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors" title="Zoom out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={fitWidth} className="px-2 py-1 text-[10px] font-black text-slate-500 rounded-lg hover:bg-slate-100 transition-colors" title="Fit width">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setScale(s => Math.min(3, +(s + 0.25).toFixed(2)))} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors" title="Zoom in">
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-mono font-bold text-slate-400 w-9 text-right">{Math.round(scale * 100)}%</span>
        </div>
      </div>

      <div ref={boxRef} className="relative bg-slate-100 rounded-2xl overflow-auto border border-slate-200 min-h-[400px] max-h-[70vh] flex items-start justify-center shadow-inner">
        {loading && (
          <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <Text className="text-xs font-bold text-slate-500 animate-pulse">RENDERING EVIDENCE...</Text>
          </div>
        )}

        {error ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <Text className="text-xs font-medium text-slate-500">{error}</Text>
            {(pdfFileId || stateId) && (
              <Button size="xs" color="red" onClick={loadPDF}>TRY AGAIN</Button>
            )}
          </div>
        ) : (
          <canvas ref={canvasRef} className="max-w-full h-auto shadow-2xl" style={{ margin: 'auto' }} />
        )}
      </div>

      {highlight && !error && (
        <div className="flex items-center justify-between gap-3 px-2">
          <p className="text-[9px] text-slate-400 italic leading-tight">
            Yellow band = the exact row extracted from the official PDF.
          </p>
          <button
            onClick={copyLine}
            className="text-[10px] font-bold text-blue-600 hover:underline shrink-0 flex items-center gap-1"
          >
            <Copy className="w-3 h-3" /> Copy line
          </button>
        </div>
      )}

      {checks.length > 0 && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-3 py-2 bg-slate-900 text-white flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Evidence Cross-Check</p>
            <span className="text-[9px] font-bold text-slate-400">app value vs official PDF row</span>
          </div>
          <div className="divide-y divide-slate-100">
            {checks.map(c => (
              <div key={c.label} className="flex items-center justify-between px-3 py-1.5 bg-white">
                <span className="text-xs font-bold text-slate-600 w-20 capitalize">{c.label}</span>
                <span className="text-xs font-mono text-slate-500 flex-1 text-right mr-3">{fmt(c.appVal)}</span>
                <span className="text-xs font-mono text-slate-500 flex-1">{c.absent ? '—' : fmt(c.pdfVal)}</span>
                {c.absent ? (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-400 text-[9px] font-black border border-slate-200">NOT IN ROW</span>
                ) : c.match ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[9px] font-black border border-emerald-100">MATCH</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 text-[9px] font-black border border-rose-100">MISMATCH</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[9px] text-slate-400 italic text-center px-4 leading-tight">
        High-integrity visual link to official 2024 Approved Budget estimates.
      </p>
    </div>
  );
}