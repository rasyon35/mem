'use client';

import { useEffect } from 'react';
import { useWiki } from '@/context/WikiContext';
import { Send, RefreshCw, Trash2, HelpCircle } from 'lucide-react';
import { ChatCitationCard } from '@/components/ChatCitationCard';

interface ChatSidebarProps {
  pageTitle: string;
}

export function ChatSidebar({ pageTitle }: ChatSidebarProps) {
  const { 
    getChatState, setQuestionForSurface, ask, clearConversation, setContext
  } = useWiki();
  
  const { question, chatLog, chatLoading, chatEndRef } = getChatState('wiki');

  useEffect(() => {
    setContext('wiki', 'wiki_page', { pageTitle });
  }, [pageTitle]);

  const handleAsk = () => {
    if (!question.trim() || chatLoading) return;
    ask('wiki', question, { mode: 'wiki_page', context: { pageTitle } });
  };

  return (
    <div className="flex flex-col h-full bg-[var(--surface-1)]">
      <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar flex flex-col gap-4">
        {chatLog.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
             <HelpCircle className="w-8 h-8 text-[var(--text-muted)] mb-3" />
             <p className="text-sm font-medium text-[var(--text-primary)] mb-4">How can I help with this note?</p>
             <div className="flex flex-col gap-2 w-full">
               <button 
                 onClick={() => ask('wiki', `Summarize the contents of [[${pageTitle}]]`)}
                 className="w-full py-1.5 px-3 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-colors text-left"
               >
                 Summarize contents
               </button>
               <button 
                 onClick={() => ask('wiki', `Suggest related topics for [[${pageTitle}]]`)}
                 className="w-full py-1.5 px-3 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-colors text-left"
               >
                 Suggest related topics
               </button>
             </div>
          </div>
        )}

        {chatLog.map((msg, i) => (
          <div key={i} className={`flex flex-col gap-1 w-full max-w-[95%] ${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
            {msg.role === 'ai' && <span className="text-xs font-semibold text-[var(--text-primary)]">Assistant</span>}
            <div className={`text-sm px-3 py-2 rounded-lg ${
              msg.role === 'user' 
                ? 'bg-[var(--surface-3)] text-[var(--text-primary)] self-end' 
                : 'text-[var(--text-secondary)] self-start'
            }`}>
              {msg.text}
            </div>
            
            {msg.role === 'ai' && msg.meta && (
              <div className="w-full space-y-2 mt-1 pl-1">
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
          <div className="flex flex-col gap-1 self-start w-full">
            <span className="text-xs font-semibold text-[var(--text-primary)]">Assistant</span>
            <div className="text-[var(--text-muted)] text-sm px-3 py-2">
              Thinking...
            </div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-1)]">
        <div className="relative">
          <textarea
            className="w-full pl-3 pr-10 py-2 bg-[var(--surface-2)] border border-[var(--border-strong)] rounded-md outline-none focus:border-[var(--accent)] transition-colors text-sm resize-none custom-scrollbar text-[var(--text-primary)] placeholder-[var(--text-muted)]"
            placeholder="Ask a question..."
            rows={1}
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
            className="absolute right-2 bottom-2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
          >
            {chatLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-2 px-1">
           <button 
             onClick={() => clearConversation('wiki')}
             className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center gap-1 transition-colors"
           >
              <Trash2 className="w-3 h-3" />
              Clear
           </button>
        </div>
      </div>
    </div>
  );
}
