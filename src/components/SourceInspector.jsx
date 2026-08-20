import { useState, useEffect, useRef } from 'react';
import { storage, BUCKET_ID } from '../utils/appwrite';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { Title, Text, Badge, Button } from '@tremor/react';

export default function SourceInspector({ pdfFileId, pageNumber, stateId, highlight }) {
  const [numPages, setNumPages] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
  }, [pdfFileId, pageNumber, stateId, highlight]);

  const locateAndHighlight = async (page, viewport) => {
    if (!highlight) return;
    const text = await page.getTextContent();
    const code = String(highlight).match(/\d{6,12}/)?.[0];
    const nameTokens = String(highlight)
      .split(/\s+/)
      .filter(w => w.length > 3 && !/\d/.test(w))
      .slice(0, 3)
      .map(w => w.toLowerCase());
    const codePrefix = code ? code.slice(0, 4) : null;

    const hits = (text.items || []).filter(it => {
      const s = (it.str || '').trim();
      if (!s) return false;
      if (code && s.includes(code)) return true;
      if (codePrefix && s.startsWith(codePrefix) && /\d{4}/.test(s)) return true;
      return nameTokens.length > 0 && nameTokens.some(t => s.toLowerCase().includes(t));
    });
    if (!hits.length) return;

    // Merge overlapping/adjacent items into row bands (by shared baseline).
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
      ctx.fillStyle = 'rgba(253, 224, 71, 0.4)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(202, 138, 4, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      if (y < firstY) firstY = y;
    }

    // Scroll the highlighted row into view (canvas may be CSS-scaled by max-w-full).
    if (boxRef.current && Number.isFinite(firstY)) {
      const scale = canvasRef.current.clientWidth / canvasRef.current.width;
      const cssY = firstY * scale;
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

      // Prefer the statically-served copy (same-origin, fast); fall back to
      // Appwrite storage for states without a static file.
      const candidates = [];
      if (stateId) candidates.push(`/data/${stateId}.pdf`);
      if (pdfFileId) candidates.push(storage.getFileView(BUCKET_ID, pdfFileId));

      // Static copies are a single fast probe; storage gets the retry loop.
      let response = null;
      for (const url of candidates) {
        const isStatic = url.startsWith('/data/');
        const attempts = isStatic ? 1 : 4;
        for (let attempt = 1; attempt <= attempts; attempt++) {
          try {
            response = await fetch(url, isStatic ? {} : { headers: { Range: 'bytes=0-' } });
            if (response.ok) break;
          } catch (e) {
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

      const page = await pdf.getPage(pageNumber || 1);
      if (seq !== loadSeqRef.current) return;
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Cancel previous render task if it exists
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;
      if (seq !== loadSeqRef.current) return;
      await locateAndHighlight(page, viewport);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge color="blue" size="xs">PAGE {pageNumber}</Badge>
          <Text className="text-[10px] font-bold uppercase text-slate-400">Original Document Snippet</Text>
        </div>
        {(pdfFileId || stateId) && (
          <button 
            onClick={() => window.open(stateId ? `/data/${stateId}.pdf` : storage.getFileView(BUCKET_ID, pdfFileId), '_blank')}
            className="text-blue-600 hover:text-blue-700 transition-colors p-1"
            title="Open full PDF"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
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
            {pdfFileId && (
              <Button size="xs" color="red" onClick={loadPDF}>TRY AGAIN</Button>
            )}
          </div>
        ) : (
          <canvas ref={canvasRef} className="max-w-full h-auto shadow-2xl" />
        )}
      </div>
      
      <p className="text-[9px] text-slate-400 italic text-center px-4 leading-tight">
        High-integrity visual link to official 2024 Approved Budget estimates.
      </p>
    </div>
  );
}
