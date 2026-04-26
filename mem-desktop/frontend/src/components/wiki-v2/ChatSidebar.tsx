'use client';

import { useEffect, useRef } from 'react';
import { useWiki } from '@/context/WikiContext';
import { Send, RefreshCw, Trash2, HelpCircle } from 'lucide-react';
import { ChatCitationCard } from '@/components/ChatCitationCard';
import { Spinner } from '@/components/Icons';

interface ChatSidebarProps {
  pageTitle: string;
}

export function ChatSidebar({ pageTitle }: ChatSidebarProps) {
  const { 
    getChatState, setQuestionForSurface, ask, retry, clearConversation, trackMetricEvent, setContext
  } = useWiki();
  
  // Use 'wiki' surface for the editor-specific chat
  const { question, chatLog, chatLoading, chatEndRef } = getChatState('wiki');

  useEffect(() => {
    // Set context to the current wiki page
    setContext('wiki', 'wiki_page', { pageTitle });
  }, [pageTitle]);

  const handleAsk = () => {
    if (!question.trim() || chatLoading) return;
    ask('wiki', question, { mode: 'wiki_page', context: { pageTitle } });
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar flex flex-col gap-4">
        {chatLog.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-20 gap-4">
             <HelpCircle className="w-12 h-12" />
             <p className="text-xs font-bold uppercase tracking-[0.2em]">How can I help with this node?</p>
             <div className="flex flex-col gap-2 w-full mt-4">
               <button 
                 onClick={() => ask('wiki', `Explain the core concepts of [[${pageTitle}]]`)}
                 className="w-full py-2 border rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
               >
                 Explain concepts
               </button>
               <button 
                 onClick={() => ask('wiki', `Identify potential gaps or contradictions in [[${pageTitle}]]`)}
                 className="w-full py-2 border rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
               >
                 Find gaps
               </button>
             </div>
          </div>
        )}

        {chatLog.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role === 'user' ? 'user' : 'ai'} w-full max-w-[95%]`}>
            {msg.role === 'ai' && <span className="ai-label">Neural Link</span>}
            <div className="bubble-text">
              {msg.text}
            </div>
            
            {msg.role === 'ai' && msg.meta && (
              <div className="w-full space-y-2 mt-2">
                {(msg.meta.citations || []).slice(0, 2).map((citation: any, idx: number) => (
                  <ChatCitationCard
                    key={`${citation.page_title}-${idx}`}
                    citation={citation}
                    confidence={msg.meta?.confidence}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {chatLoading && (
          <div className="chat-bubble ai">
            <span className="ai-label">Neural Link</span>
            <div className="bubble-text typing-dots flex items-center justify-center p-3">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 border-t shrink-0 flex flex-col gap-3" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'var(--bg-800)' }}>
        {/* Quick Context Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button onClick={() => ask('wiki', 'Summarize this page')} className="shrink-0 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-[10px] font-bold tracking-wide border border-white/5 transition-all text-[var(--text-secondary)]">Summarize</button>
          <button onClick={() => ask('wiki', 'What are the main contradictions?')} className="shrink-0 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-[10px] font-bold tracking-wide border border-white/5 transition-all text-[var(--text-secondary)]">Find Contradictions</button>
          <button onClick={() => ask('wiki', 'Suggest next research topics')} className="shrink-0 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-[10px] font-bold tracking-wide border border-white/5 transition-all text-[var(--text-secondary)]">Next Topics</button>
        </div>

        <div className="relative group">
          <textarea
            className="w-full pl-4 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-[var(--accent)]/50 focus:bg-white/[0.08] transition-all text-sm resize-none custom-scrollbar"
            placeholder="Ask anything..."
            rows={2}
            value={question}
            onChange={(e) => setQuestionForSurface('wiki', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAsk();
              }
            }}
          />
          <button 
            onClick={handleAsk}
            disabled={!question.trim() || chatLoading}
            className="absolute right-3 bottom-3 p-2 rounded-lg bg-[var(--accent)] text-white shadow-lg disabled:opacity-30 transition-all hover:scale-105 active:scale-95"
          >
            {chatLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-3 px-1">
           <button 
             onClick={() => clearConversation('wiki')}
             className="text-[9px] font-black uppercase tracking-widest opacity-20 hover:opacity-100 flex items-center gap-1 transition-all"
           >
              <Trash2 className="w-3 h-3" />
              Reset Chain
           </button>
           <span className="text-[9px] font-black uppercase tracking-widest opacity-10">
              Neural Link v4.9
           </span>
        </div>
      </div>
    </div>
  );
}
