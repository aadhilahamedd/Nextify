import React, { useCallback, useEffect, useState } from 'react';
import { deleteContactMessageAPI, getContactMessagesAPI, markMessageReadAPI } from '../../Services/allAPI';
import {
  getLocalContactMessages,
  markLocalContactMessageRead,
  removeLocalContactMessage,
} from '../../utils/contactMessagesStorage';
import { formatDate, refreshBtnStyle, sectionCardStyle } from './adminShared';

export default function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedMessageId, setExpandedMessageId] = useState(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError('');

    const response = await getContactMessagesAPI();
    const localMessages = getLocalContactMessages();

    if (response?.status === 200) {
      const serverMessages = response.data || [];
      const localOnly = localMessages.filter(
        (local) => !serverMessages.some((server) => server._id === local._id)
      );
      setMessages([...serverMessages, ...localOnly]);
      setError('');
    } else if (localMessages.length > 0) {
      setMessages(localMessages);
      setError(
        response?.status === 404
          ? 'Server API not deployed yet. Showing messages saved from this browser until the backend is updated on Render.'
          : response?.error || 'Could not reach server. Showing locally saved messages.'
      );
    } else {
      setMessages([]);
      setError(
        response?.error ||
          (response?.status === 404
            ? 'Messages API not found. Deploy the latest Backend folder to Render (includes /api/messages).'
            : 'Failed to load messages.')
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleToggleMessage = async (msg) => {
    const isExpanded = expandedMessageId === msg._id;
    setExpandedMessageId(isExpanded ? null : msg._id);

    if (!isExpanded && msg.status === 'new') {
      if (String(msg._id).startsWith('local_')) {
        markLocalContactMessageRead(msg._id);
        setMessages((prev) =>
          prev.map((item) => (item._id === msg._id ? { ...item, status: 'read' } : item))
        );
      } else {
        const response = await markMessageReadAPI(msg._id);
        if (response?.status === 200) {
          setMessages((prev) =>
            prev.map((item) => (item._id === msg._id ? { ...item, status: 'read' } : item))
          );
        }
      }
    }
  };

  const handleDeleteMessage = async (id) => {
    if (!window.confirm('Delete this message?')) return;

    if (String(id).startsWith('local_')) {
      removeLocalContactMessage(id);
      setMessages((prev) => prev.filter((item) => item._id !== id));
      if (expandedMessageId === id) setExpandedMessageId(null);
      return;
    }

    const response = await deleteContactMessageAPI(id);
    if (response?.status === 200) {
      setMessages((prev) => prev.filter((item) => item._id !== id));
      if (expandedMessageId === id) setExpandedMessageId(null);
    } else {
      alert(response?.error || 'Failed to delete message.');
    }
  };

  const newCount = messages.filter((m) => m.status === 'new').length;

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Messages</h1>
          <p>Contact form submissions from the Help section{newCount ? ` • ${newCount} new` : ''}</p>
        </div>
        <button type="button" onClick={fetchMessages} style={refreshBtnStyle}>
          Refresh
        </button>
      </div>

      <div style={sectionCardStyle}>
        {loading && (
          <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', margin: '24px 0' }}>
            Loading messages...
          </p>
        )}

        {error && (
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '10px',
              background: 'rgba(245, 87, 108, 0.12)',
              border: '1px solid rgba(245, 87, 108, 0.35)',
              color: '#8e8e8e',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.4)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
            <p style={{ margin: 0 }}>No messages yet. Submissions from the contact page will appear here.</p>
          </div>
        )}

        {!loading && messages.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg) => {
              const isExpanded = expandedMessageId === msg._id;
              return (
                <div
                  key={msg._id}
                  style={{
                    background: 'rgba(0,0,0,0.25)',
                    border: `1px solid ${msg.status === 'new' ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '12px',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleMessage(msg)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '16px',
                      padding: '18px 20px',
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '700', fontSize: '15px' }}>{msg.name}</span>
                        {msg.status === 'new' && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              padding: '3px 8px',
                              borderRadius: '20px',
                              background: 'rgba(255, 255, 255, 0.2)',
                              color: '#ffffff',
                            }}
                          >
                            New
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px' }}>{msg.subject}</div>
                      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '4px' }}>
                        {formatDate(msg.createdAt)}
                      </div>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '18px' }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </button>

                  {isExpanded && (
                    <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '12px',
                          marginTop: '16px',
                          marginBottom: '16px',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>Email</div>
                          <div style={{ fontSize: '14px', wordBreak: 'break-all' }}>{msg.email}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>Phone</div>
                          <div style={{ fontSize: '14px' }}>{msg.phone || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>Subject</div>
                          <div style={{ fontSize: '14px' }}>{msg.subject}</div>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '8px' }}>Message</div>
                        <p
                          style={{
                            margin: 0,
                            padding: '14px',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.04)',
                            color: 'rgba(255,255,255,0.85)',
                            lineHeight: '1.7',
                            whiteSpace: 'pre-wrap',
                            fontSize: '14px',
                          }}
                        >
                          {msg.message}
                        </p>
                      </div>
                      <div style={{ marginTop: '16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg._id)}
                          style={{
                            padding: '8px 16px',
                            background: 'rgba(245, 87, 108, 0.12)',
                            border: '1px solid rgba(245, 87, 108, 0.35)',
                            borderRadius: '8px',
                            color: '#8e8e8e',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
