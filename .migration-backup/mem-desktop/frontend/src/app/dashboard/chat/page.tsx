'use client';

import { useWiki } from '@/context/WikiContext';
import { ChatIcon, Spinner } from '@/components/Icons';

export default function ChatPage() {
  const { 
    question, setQuestion, chatLog, chatLoading, chatEndRef, handleChat 
  } = useWiki();

  return (
    <section className="panel" id="panel-chat" style={{ height: 'calc(100vh - 48px)' }}>
      <header className="panel-header mb-0 flex-shrink-0">
        <h1 className="panel-title">Ask Your Wiki</h1>
        <p className="panel-sub">Powered by Groq — answers are grounded in your knowledge base.</p>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pt-6 pb-4 space-y-6">
        {chatLog.length === 0 && (
          <div className="empty-state h-full">
            <ChatIcon size={32} className="mb-4 text-text-muted" />
            <p>No messages yet. Ask anything!</p>
          </div>
        )}

        {chatLog.map((msg, i) => (
          <div key={i} className={`flex gap-4 ${msg.role === 'ai' ? '' : 'flex-row-reverse'}`}>
            {msg.role === 'ai' && (
              <div className="w-8 h-8 rounded bg-surface-3 border border-border-strong flex items-center justify-center flex-shrink-0 text-xs font-semibold text-text-primary">M</div>
            )}
            <div className={`px-4 py-3 rounded-lg max-w-[80%] text-[15px] leading-relaxed ${
              msg.role === 'ai' 
                ? 'bg-transparent text-text-primary border-l-2 border-border-strong rounded-l-none pl-4' 
                : 'bg-surface-3 text-text-primary border border-border-subtle'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {chatLoading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded bg-surface-3 border border-border-strong flex items-center justify-center flex-shrink-0 text-xs font-semibold text-text-primary">M</div>
            <div className="px-4 py-3 bg-transparent text-text-primary border-l-2 border-border-strong rounded-l-none pl-4">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-pulse" />
                <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-pulse animation-delay-200" />
                <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-pulse animation-delay-400" />
              </span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="flex-shrink-0 pt-4">
        <div className="flex gap-3">
          <input
            className="text-input flex-1"
            type="text"
            placeholder="What are the main concepts discussed?"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !chatLoading && handleChat()}
          />
          <button
            className="btn-primary px-6"
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
