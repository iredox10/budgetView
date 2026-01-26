import { toPng } from 'html-to-image';
import { Share2, Download } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@tremor/react';

export default function ShareButton({ targetId, fileName = "budget-stat" }) {
  const [isCapturing, setIsCapturing] = useState(false);

  const handleShare = async () => {
    const node = document.getElementById(targetId);
    if (!node) return;

    setIsCapturing(true);
    try {
      // Add a class to node for styling during capture if needed
      const dataUrl = await toPng(node, {
        cacheBust: true,
        backgroundColor: '#f8fafc', // match slate-50
        style: {
          borderRadius: '0', // ensure crisp capture
        }
      });
      
      const link = document.createElement('a');
      link.download = `${fileName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Snapshot failed', err);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={isCapturing}
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-blue-100"
    >
      <Share2 className={`w-3.5 h-3.5 ${isCapturing ? 'animate-pulse' : ''}`} />
      {isCapturing ? 'Capturing...' : 'Share Receipt'}
    </button>
  );
}
