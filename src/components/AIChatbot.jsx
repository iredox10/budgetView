import { useState, useRef, useEffect } from 'react';
import { Card, Text, Title, TextInput, Button, Flex, Badge } from '@tremor/react';
import { MessageSquare, X, Send, Bot, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export default function AIChatbot({ budgetData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    { role: 'bot', text: `Hi! I'm the Budget Assistant. Ask me anything about the ${budgetData.state} ${budgetData.year} budget!` }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = { role: 'user', text: query };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setIsTyping(true);

    // Simulate AI logic based on current budget context
    setTimeout(() => {
      let response = "";
      const q = query.toLowerCase();
      
      if (q.includes('total') || q.includes('how much')) {
        response = `The total expenditure for ${budgetData.state} in ${budgetData.year} is ${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(budgetData.summary.total_expenditure)}.`;
      } else if (q.includes('education')) {
        const edu = budgetData.sectors.find(s => s.name.toUpperCase().includes('EDUCATION'));
        response = edu 
          ? `Education has been allocated ${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(edu.amount)}, which is about ${((edu.amount/budgetData.summary.total_expenditure)*100).toFixed(1)}% of the total budget.`
          : "I couldn't find a specific allocation for Education in the functional classification.";
      } else if (q.includes('health')) {
        const health = budgetData.sectors.find(s => s.name.toUpperCase().includes('HEALTH'));
        response = health 
          ? `Health hospital services and public health are allocated ${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(health.amount)}.`
          : "Health sector data isn't explicitly listed in the top sectors.";
      } else if (q.includes('capital')) {
        response = `The state is spending ${((budgetData.summary.capital_expenditure/budgetData.summary.total_expenditure)*100).toFixed(1)}% of its budget on Capital projects (₦${(budgetData.summary.capital_expenditure/1e9).toFixed(1)}B).`;
      } else {
        response = "I can tell you about total spending, sector allocations (Education, Health), or the capital vs recurrent split. Try asking 'How much for education?'";
      }

      setMessages(prev => [...prev, { role: 'bot', text: response }]);
      setIsTyping(false);
    }, 1000);
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
                      <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Intelligence</Text>
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
                  <div key={i} className={clsx("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    <div className={clsx(
                      "max-w-[85%] p-4 rounded-[1.5rem]",
                      msg.role === 'user' 
                        ? "bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-200" 
                        : "bg-white text-slate-700 rounded-tl-none border border-slate-100 shadow-sm"
                    )}>
                      <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                    </div>
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
