'use client';

import { useWiki } from '@/context/WikiContext';
import { ChatIcon, Spinner } from '@/components/Icons';

export default function ChatPage() {
  const { 
    question, setQuestion, chatLog, chatLoading, chatEndRef, handleChat 
  } = useWiki();

  return (
    <section className="chat-panel" id="panel-chat">
      <header className="chat-header">
        <h1 className="panel-title">Ask Your Wiki</h1>
        <p className="panel-sub">Powered by Groq — answers are grounded in your knowledge base.</p>
      </header>

      <div className="chat-container">
        {chatLog.length === 0 && (
          <div className="chat-empty">
            <ChatIcon />
            <p>No messages yet. Ask anything!</p>
          </div>
        )}

        {chatLog.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            {msg.role === 'ai' && <span className="ai-label">Mem</span>}
            <p className="bubble-text">{msg.text}</p>
          </div>
        ))}

        {chatLoading && (
          <div className="chat-bubble ai">
            <span className="ai-label">Mem</span>
            <p className="bubble-text typing-dots"><span /><span /><span /></p>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="chat-input-wrapper">
        <div className="chat-input-inner">
          <input
            className="text-input"
            type="text"
            placeholder="What are the main concepts discussed?"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !chatLoading && handleChat()}
          />
          <button
            className="btn-primary"
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
