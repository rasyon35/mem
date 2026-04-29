'use client';

import React, { useState } from 'react';
import { useWiki } from '@/context/WikiContext';
import { Send, X, Sparkles, RefreshCw, Trash2 } from 'lucide-react';
import { ChatCitationCard } from '@/components/ChatCitationCard';

export function ZenChat() {
  const { 
    getChatState, setQuestionForSurface, ask, clearConversation, setZenMode
  } = useWiki();
  
  const { question, chatLog, chatLoading, chatEndRef } = getChatState('synthesis');

  const handleAsk = () => {
    if (!question.trim() || chatLoading) return;
    // Synthesis mode defaults to global context to understand relationships
    ask('synthesis', question, { mode: 'global' });
  };

  return (
    <div className="zen-chat-panel">
      <div className="zen-chat-header">
        <div className="zen-chat-title">
          <Sparkles className="w-5 h-5 text-[var(--accent)]" />
          Synthesis Assistant
        </div>
        <button 
          onClick={() => setZenMode(false)}
          className="p-1 hover:bg-[var(--surface-3)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="zen-chat-content custom-scrollbar">
        {chatLog.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-[var(--accent)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Wiki Synthesis</h3>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Ask me to explain relationships between topics, summarize your knowledge base, or synthesize new insights from existing notes.
            </p>
          </div>
        )}

        {chatLog.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'zen-msg-user' : 'zen-msg-ai'}>
            {msg.role === 'user' ? (
              <div className="zen-msg-user-bubble">{msg.text}</div>
            ) : (
              <>
                <div className="whitespace-pre-wrap">{msg.text}</div>
                {msg.meta?.citations && msg.meta.citations.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 gap-2">
                    {msg.meta.citations.slice(0, 3).map((citation: any, idx: number) => (
                      <ChatCitationCard
                        key={`${citation.page_title}-${idx}`}
                        citation={citation}
                        confidence={msg.meta?.confidence}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        {chatLoading && (
          <div className="zen-msg-ai flex items-center gap-3">
            <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent)]" />
            Synthesizing insights...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="zen-chat-footer">
        <div className="relative">
          <textarea
            className="w-full pl-4 pr-12 py-3 bg-[var(--surface-3)] border border-[var(--border-strong)] rounded-xl outline-none focus:border-[var(--accent)] transition-all text-sm resize-none custom-scrollbar text-[var(--text-primary)] placeholder-[var(--text-muted)]"
            placeholder="Explore relationships or synthesize info..."
            rows={2}
            value={question}
            onChange={(e) => setQuestionForSurface('synthesis', e.target.value)}
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
            className="absolute right-3 bottom-3 p-2 bg-[var(--accent)] text-white rounded-lg disabled:opacity-30 hover:shadow-lg transition-all active:scale-95"
          >
            {chatLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-3 px-1">
           <button 
             onClick={() => clearConversation('synthesis')}
             className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center gap-1.5 transition-colors"
           >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Conversation
           </button>
           <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-bold">Zen Synthesis Mode</span>
        </div>
      </div>
    </div>
  );
}
