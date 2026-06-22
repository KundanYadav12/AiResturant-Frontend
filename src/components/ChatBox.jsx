import React, { useState, useEffect, useRef } from 'react';
import VoiceInput from './VoiceInput';

const ChatBox = ({ messages, isTyping, onSendMessage, disabled }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleVoiceTranscript = (text) => {
    if (!text.trim() || disabled) return;
    onSendMessage(text.trim());
  };

  const suggestions = [
    "Add 1 Paneer Tikka with less spicy",
    "Add 2 Butter Chicken and 3 Garlic Naan",
    "Add 1 Coke",
    "What sweet options do you have?",
    "Remove Gulab Jamun"
  ];

  return (
    <div className="card shadow-lg border-0 d-flex flex-column" style={{ height: '550px', borderRadius: '20px', overflow: 'hidden' }}>
      {/* Header */}
      <div className="card-header bg-gradient bg-primary text-white p-3 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <div className="rounded-circle bg-white text-primary d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
            <i className="bi bi-robot fs-5"></i>
          </div>
          <div>
            <h6 className="mb-0 fw-bold">Spice Bistro AI</h6>
            <small className="opacity-75">Your Smart Food Assistant</small>
          </div>
        </div>
        <span className="badge bg-success rounded-pill px-2 py-1"><i className="bi bi-circle-fill me-1 small animate-pulse"></i> Online</span>
      </div>

      {/* Messages area */}
      <div className="card-body bg-light flex-grow-1 p-3 overflow-y-auto d-flex flex-column" style={{ maxHeight: '380px' }}>
        {messages.length === 0 ? (
          <div className="text-center my-auto px-4 py-5 text-muted">
            <i className="bi bi-chat-left-text-fill text-primary display-4 mb-3 opacity-50 d-block"></i>
            <h5 className="fw-semibold">Hello! I am your AI Server.</h5>
            <p className="small mb-3">You can order food using natural English, Hindi, or Hinglish!</p>
            <div className="d-flex flex-wrap gap-2 justify-content-center mt-3">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(s)}
                  className="btn btn-sm btn-outline-primary border-2 rounded-pill px-3 py-1 bg-white shadow-sm font-monospace text-start"
                  style={{ fontSize: '0.8rem' }}
                  disabled={disabled}
                >
                  "{s}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.sender === 'user';
            return (
              <div key={index} className={`d-flex ${isUser ? 'justify-content-end' : 'justify-content-start'} mb-3`}>
                {!isUser && (
                  <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2 mt-1 flex-shrink-0" style={{ width: '28px', height: '28px', fontSize: '0.8rem' }}>
                    <i className="bi bi-robot"></i>
                  </div>
                )}
                <div 
                  className={`p-3 rounded-4 shadow-sm border-0`} 
                  style={{ 
                    maxWidth: '75%', 
                    backgroundColor: isUser ? '#0d6efd' : '#ffffff',
                    color: isUser ? '#ffffff' : '#212529',
                    borderTopRightRadius: isUser ? '4px' : '16px',
                    borderTopLeftRadius: isUser ? '16px' : '4px',
                  }}
                >
                  <p className="mb-1 small text-break" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                  <span className={`text-end d-block mt-1 opacity-75`} style={{ fontSize: '0.7rem' }}>
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {isTyping && (
          <div className="d-flex justify-content-start mb-3">
            <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2 mt-1 flex-shrink-0" style={{ width: '28px', height: '28px', fontSize: '0.8rem' }}>
              <i className="bi bi-robot"></i>
            </div>
            <div className="bg-white p-3 rounded-4 shadow-sm border-0 d-flex align-items-center" style={{ borderTopLeftRadius: '4px' }}>
              <div className="typing-dots d-flex gap-1">
                <span className="dot bg-secondary rounded-circle" style={{ width: '6px', height: '6px' }}></span>
                <span className="dot bg-secondary rounded-circle" style={{ width: '6px', height: '6px' }}></span>
                <span className="dot bg-secondary rounded-circle" style={{ width: '6px', height: '6px' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="card-footer bg-white border-0 p-3">
        <form onSubmit={handleSubmit} className="d-flex align-items-center">
          <input
            type="text"
            className="form-control rounded-pill px-4 border-2 border-primary-subtle"
            style={{ height: '45px' }}
            placeholder={disabled ? "Session inactive..." : "Ask AI or order items..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={disabled}
          />
          <button 
            type="submit" 
            className="btn btn-primary rounded-circle ms-2 d-flex align-items-center justify-content-center" 
            style={{ width: '45px', height: '45px' }}
            disabled={!input.trim() || disabled}
          >
            <i className="bi bi-send-fill text-white"></i>
          </button>
          
          <VoiceInput onTranscript={handleVoiceTranscript} disabled={disabled} />
        </form>
      </div>

      <style>{`
        .typing-dots .dot {
          animation: dot-jump 1.4s infinite ease-in-out both;
        }
        .typing-dots .dot:nth-child(1) { animation-delay: -0.32s; }
        .typing-dots .dot:nth-child(2) { animation-delay: -0.16s; }
        
        @keyframes dot-jump {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }
      `}</style>
    </div>
  );
};

export default ChatBox;
