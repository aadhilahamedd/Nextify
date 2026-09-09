import React, { useState } from 'react';
import { sendChatMessageAPI } from '../Services/allAPI';

function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am the Nextify assistant. Ask about chauffeur services, airport transfers, fleet, or pricing.' },
  ]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: userMsg }]);
    setLoading(true);
    const res = await sendChatMessageAPI({ message: userMsg, sessionId });
    setLoading(false);
    if (res?.status === 200) {
      const data = res.data?.data || res.data;
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
    } else {
      setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, I could not respond right now. Please contact us on WhatsApp for assistance.' }]);
    }
  };

  return (
    <>
      <button
        type="button"
        className="chatbot-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open chat assistant"
        style={{
          position: 'fixed',
          bottom: 90,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: 'none',
          background: '#25d366',
          color: '#fff',
          zIndex: 1200,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}
      >
        <i className={`bi ${open ? 'bi-x-lg' : 'bi-chat-dots-fill'}`} />
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 160,
            right: 24,
            width: 340,
            maxWidth: 'calc(100vw - 48px)',
            height: 420,
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            zIndex: 1200,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div className="px-3 py-2 text-white" style={{ background: '#0a0a0a' }}>
            <strong>Nextify Assistant</strong>
            <div className="small opacity-75">Demo mode · FAQ & fleet help</div>
          </div>
          <div className="flex-grow-1 p-3 overflow-auto" style={{ flex: 1 }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`mb-2 small p-2 rounded-3 ${msg.role === 'user' ? 'ms-4' : 'me-4'}`}
                style={{
                  background: msg.role === 'user' ? '#333' : '#f0f0f0',
                  color: msg.role === 'user' ? '#fff' : '#333',
                  marginLeft: msg.role === 'user' ? '2rem' : 0,
                  marginRight: msg.role === 'assistant' ? '2rem' : 0,
                }}
              >
                {msg.content}
              </div>
            ))}
            {loading && <div className="small text-muted">Typing...</div>}
          </div>
          <div className="p-2 border-top d-flex gap-2">
            <input
              className="form-control form-control-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask a question..."
            />
            <button type="button" className="btn btn-dark btn-sm" onClick={send} disabled={loading}>
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatBot;
