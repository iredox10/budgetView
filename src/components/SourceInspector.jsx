import { useState, useEffect, useRef } from 'react';
import { storage, BUCKET_ID } from '../utils/appwrite';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { Title, Text, Badge, Button } from '@tremor/react';

export default function SourceInspector({ pdfFileId, pageNumber, stateId }) {
  const [numPages, setNumPages] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const loadSeqRef = useRef(0);

  useEffect(() => {
    if (!pdfFileId && !stateId) {
      setError("No source PDF has been uploaded for this state yet.");
      setLoading(false);
      return;
    }
    loadPDF();
  }, [pdfFileId, pageNumber, stateId]);

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

      <div className="relative bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 min-h-[400px] flex items-center justify-center shadow-inner">
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
