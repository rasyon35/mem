import { useEffect, useState, useRef } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import './TeamChat.css';

interface ChatMessage {
  id: string;
  user: { username: string; avatar?: string };
  content: string;
  timestamp: string;
  isAI?: boolean;
  referencedPages?: string[];
}

export const TeamChat = () => {
  const { currentTeam } = useWorkspace();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentTeam) return;
    loadMessages();
  }, [currentTeam]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = () => {
    // Mock data - replace with actual API call
    setMessages([
      {
        id: '1',
        user: { username: 'AI Assistant' },
        content: 'Welcome to the team chat! I can answer questions from team resources. Try asking something about your team wiki, uploads, or graph.',
        timestamp: new Date().toISOString(),
        isAI: true,
      },
    ]);
  };

  const handleSend = async () => {
    if (!input.trim() || !currentTeam) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      user: { username: 'You' },
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsAIThinking(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        user: { username: 'AI Assistant' },
        content: `Based on team resources, here's what I found regarding "${input}"... (AI response would come from team context including wiki, uploads, graph, and discussions)`,
        timestamp: new Date().toISOString(),
        isAI: true,
        referencedPages: ['page-1', 'page-2'],
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsAIThinking(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!currentTeam) return <div className="team-chat-empty">No team selected</div>;

  return (
    <div className="team-chat">
      <div className="chat-header">
        <h2>Team Chat — {currentTeam.name}</h2>
        <p className="chat-description">
          AI answers from team resources. Questions become searchable.
        </p>
      </div>

      <div className="chat-messages">
        {messages.map(message => (
          <div
            key={message.id}
            className={`message ${message.isAI ? 'ai-message' : 'user-message'}`}
          >
            <div className="message-avatar">
              {message.isAI ? '🤖' : '👤'}
            </div>
            <div className="message-content">
              <div className="message-header">
                <span className="message-author">{message.user.username}</span>
                <span className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="message-body">{message.content}</div>
              {message.referencedPages && (
                <div className="referenced-pages">
                  <span className="ref-label">Referenced:</span>
                  {message.referencedPages.map(pageId => (
                    <span key={pageId} className="ref-page">Page {pageId}</span>
                  ))}
                </div>
              )}
              {message.isAI && (
                <button className="convert-to-page-btn">
                  📄 Convert to Page
                </button>
              )}
            </div>
          </div>
        ))}
        {isAIThinking && (
          <div className="message ai-message">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="thinking-indicator">AI is thinking...</div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the team AI something... (Shift+Enter for new line)"
          rows={3}
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!input.trim() || isAIThinking}
        >
          Send
        </button>
      </div>
    </div>
  );
};