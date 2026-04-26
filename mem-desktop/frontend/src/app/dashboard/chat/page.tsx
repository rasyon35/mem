'use client';

import { useWiki } from '@/context/WikiContext';
import { ChatIcon, Spinner } from '@/components/Icons';

export default function ChatPage() {
  const { 
    question, setQuestion, chatLog, chatLoading, chatEndRef, handleChat 
  } = useWiki();

  return (
    <section className="chat-panel flex flex-col h-full bg-gradient-to-b from-surface-2 to-surface-3 rounded-2xl overflow-hidden shadow-lg" id="panel-chat">
      <header className="chat-header border-b border-border-subtle bg-gradient-to-r from-accent/10 to-transparent px-8 py-6">
        <h1 className="panel-title text-2xl font-black text-text-primary mb-2">Ask Your Wiki</h1>
        <p className="panel-sub text-sm text-text-secondary">Powered by Groq — answers are grounded in your knowledge base.</p>
      </header>

      <div className="chat-container flex-1 overflow-y-auto custom-scrollbar px-8 py-6 space-y-4">
        {chatLog.length === 0 && (
          <div className="chat-empty flex flex-col items-center justify-center h-full text-center gap-4 opacity-40">
            <ChatIcon className="w-16 h-16" />
            <p className="text-lg font-semibold">No messages yet. Ask anything!</p>
          </div>
        )}

        {chatLog.map((msg, i) => (
          <div key={i} className={`chat-bubble animate-slide-in ${msg.role === 'ai' ? 'ai-message' : 'user-message'} flex gap-3 mb-4`}>
            {msg.role === 'ai' && <span className="ai-label shrink-0 px-3 py-1 rounded-lg bg-accent/20 text-accent text-xs font-bold uppercase tracking-wider">Mem</span>}
            <p className={`bubble-text px-4 py-3 rounded-xl max-w-xl ${msg.role === 'ai' ? 'bg-surface-3 text-text-primary border border-border-subtle' : 'bg-gradient-to-r from-accent to-accent-dark text-white'}`}>{msg.text}</p>
          </div>
        ))}

        {chatLoading && (
          <div className="chat-bubble ai-message flex gap-3 mb-4 animate-fade-in">
            <span className="ai-label shrink-0 px-3 py-1 rounded-lg bg-accent/20 text-accent text-xs font-bold uppercase tracking-wider">Mem</span>
            <p className="bubble-text px-4 py-3 rounded-xl bg-surface-3 text-text-primary border border-border-subtle"><span className="typing-indicator inline-flex gap-1"><span className="w-2 h-2 bg-accent rounded-full animate-pulse" /><span className="w-2 h-2 bg-accent rounded-full animate-pulse animation-delay-200" /><span className="w-2 h-2 bg-accent rounded-full animate-pulse animation-delay-400" /></span></p>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="chat-input-wrapper border-t border-border-subtle bg-surface-2 px-8 py-6">
        <div className="chat-input-inner flex gap-3">
          <input
            className="text-input flex-1 px-4 py-3 rounded-xl bg-surface-3 border border-border-subtle focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all text-text-primary placeholder-text-secondary/50"
            type="text"
            placeholder="What are the main concepts discussed?"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !chatLoading && handleChat()}
          />
          <button
            className="btn-primary px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-accent-dark text-white font-bold hover:shadow-lg hover:shadow-accent/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handleChat()}
            disabled={chatLoading || !question.trim()}
          >
            {chatLoading ? <Spinner /> : 'Ask'}
          </button>
        </div>
      </div>
    </section>
  );
}
