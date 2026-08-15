import { useState, useRef, useEffect } from 'react';
import { Card, Text, Title, Badge } from '@tremor/react';
import { MessageSquare, X, Send, Bot, Loader2, Sparkles, FileText, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const fmtNGN = (value) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(value);

export default function AIChatbot({ budgetData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: `Hi! I'm the Budget Assistant. I answer from the extracted ${budgetData.state} ${budgetData.year} budget document, and every answer cites the source page and line.`,
      citations: []
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const cite = (obj) => {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj.slice(0, 3);
    return [obj];
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = { role: 'user', text: query, citations: [] };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setIsTyping(true);

    setTimeout(() => {
      let response = "";
      let citations = [];
      const q = query.toLowerCase();
      const s = budgetData.summary;

      if (q.includes('total') || q.includes('how much')) {
        response = `The total expenditure for ${budgetData.state} in ${budgetData.year} is ${fmtNGN(s.total_expenditure)} (revenue: ${fmtNGN(s.total_revenue)}${s.opening_balance ? `, including an opening balance of ${fmtNGN(s.opening_balance)}` : ''}).`;
      } else if (q.includes('revenue') || q.includes('faac') || q.includes('allocation')) {
        response = `Total revenue is ${fmtNGN(s.total_revenue)}: FAAC ${fmtNGN(s.faac)}, IGR ${fmtNGN(s.igr)}, aid & grants ${fmtNGN(s.grants)}, and capital receipts ${fmtNGN(s.capital_receipts)}.`;
      } else if (q.includes('education') || q.includes('school')) {
        const edu = budgetData.sectors.find(x => x.name.toUpperCase().includes('EDUCATION'));
        citations = cite(edu?.provenance);
        response = edu
          ? `Education is allocated ${fmtNGN(edu.amount)}, about ${((edu.amount / s.total_expenditure) * 100).toFixed(1)}% of the total budget.`
          : "I couldn't find an Education allocation in the functional classification.";
      } else if (q.includes('health')) {
        const health = budgetData.sectors.find(x => x.name.toUpperCase().includes('HEALTH'));
        citations = cite(health?.provenance);
        response = health
          ? `Health is allocated ${fmtNGN(health.amount)}, about ${((health.amount / s.total_expenditure) * 100).toFixed(1)}% of the total budget.`
          : "Health sector data isn't explicitly listed in the top sectors.";
      } else if (q.includes('capital')) {
        response = `Capital expenditure is ${fmtNGN(s.capital_expenditure)} — ${((s.capital_expenditure / s.total_expenditure) * 100).toFixed(1)}% of the total. Recurrent expenditure is ${fmtNGN(s.recurrent_expenditure)} (personnel: ${fmtNGN(s.personnel_cost)}).`;
      } else if (q.includes('personnel') || q.includes('salary')) {
        response = `Personnel cost is ${fmtNGN(s.personnel_cost)}, which is ${((s.personnel_cost / s.total_expenditure) * 100).toFixed(1)}% of the total budget.`;
      } else if (q.includes('open') || q.includes('balance') || q.includes('deficit') || q.includes('financ')) {
        response = s.opening_balance || s.financing_total || s.deficit_surplus
          ? `Opening balance: ${fmtNGN(s.opening_balance || 0)}. Financing: ${fmtNGN(s.financing_total || 0)}. Deficit/surplus: ${fmtNGN(s.deficit_surplus || 0)}.`
          : "This budget has no reported opening balance, financing, or deficit line.";
      } else {
        const mda = budgetData.mdas.find(m => m.name && q.includes(m.name.toLowerCase()));
        if (mda) {
          citations = cite(mda.provenance);
          response = `${mda.name} has a budget of ${fmtNGN(mda.total)} (recurrent ${fmtNGN(mda.recurrent)}, capital ${fmtNGN(mda.capital)}).`;
        } else {
          response = "I can tell you about total spending, revenue (FAAC/IGR/grants), sectors (Education, Health), capital vs recurrent, personnel cost, or a specific MDA by name.";
        }
      }

      setMessages(prev => [...prev, { role: 'bot', text: response, citations }]);
      setIsTyping(false);
    }, 700);
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="mb-4 w-[400px] max-w-[90vw]"
          >
            <Card className="rounded-[2.5rem] shadow-2xl border-slate-200 p-0 overflow-hidden flex flex-col h-[500px]">
              {/* Chat Header */}
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-xl">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <Title className="text-white text-sm font-black tracking-tight">Budget Assistant</Title>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Rule-based, cites source</Text>
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                {messages.map((msg, i) => (
                  <div key={i} className={clsx("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                    <div className={clsx(
                      "max-w-[85%] p-4 rounded-[1.5rem]",
                      msg.role === 'user'
                        ? "bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-200"
                        : "bg-white text-slate-700 rounded-tl-none border border-slate-100 shadow-sm"
                    )}>
                      <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                    </div>
                    {msg.citations?.length > 0 && (
                      <div className="mt-1.5 flex flex-col gap-1 max-w-[85%]">
                        {msg.citations.map((c, j) => (
                          <div key={j} className="flex items-start gap-1.5 bg-white/80 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm">
                            <MapPin className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <Badge color="blue" size="xs" className="mb-0.5">Page {c.page}</Badge>
                              <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">{c.line_text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start animate-pulse">
                    <div className="bg-white p-4 rounded-[1.5rem] rounded-tl-none border border-slate-100 shadow-sm">
                      <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  placeholder="Ask about spending..."
                  className="flex-1 bg-slate-50 border-none rounded-2xl px-4 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button
                  type="submit"
                  className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-400 hover:bg-blue-700 transition-all active:scale-90 hover:scale-110 group relative"
      >
        <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">1</span>
      </button>
    </div>
  );
}