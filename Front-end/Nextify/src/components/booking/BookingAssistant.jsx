/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { sendChatMessageAPI } from '../../Services/allAPI';
import { useLanguage } from '../../i18n/LanguageContext';
import { CloseIcon } from '../icons';

const BookingAssistantContext = createContext(null);

// Context provider and hook share this module so booking pages can open the existing assistant.

const THANK_YOU = 'Thank you for your inquiry. Our team will review your route and vehicle requirements and provide a personalized quotation.';

export function useBookingAssistant() {
  return useContext(BookingAssistantContext);
}

export function BookingAssistantProvider({ children }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  const scrollToEnd = () => {
    window.requestAnimationFrame(() => {
      const node = listRef.current;
      if (node) node.scrollTop = node.scrollHeight;
    });
  };

  const sendMessage = useCallback(async (text, { showThankYou = false, displayText } = {}) => {
    const message = String(text || '').trim();
    if (!message) return { ok: false };
    setSending(true);
    setError('');
    setMessages((current) => [...current, { role: 'user', content: displayText || message }]);
    if (showThankYou) {
      setMessages((current) => [...current, { role: 'assistant', content: THANK_YOU }]);
    }
    scrollToEnd();

    const res = await sendChatMessageAPI({ message, sessionId: sessionId || undefined });
    setSending(false);

    if (res?.status === 200 && res.data?.reply) {
      if (res.data.sessionId) setSessionId(res.data.sessionId);
      setMessages((current) => [...current, { role: 'assistant', content: res.data.reply }]);
      scrollToEnd();
      return { ok: true };
    }

    const fallback = res?.error || t('booking.chatUnavailable');
    setError(fallback);
    setMessages((current) => [
      ...current,
      { role: 'assistant', content: `${THANK_YOU}\n\n${fallback}` },
    ]);
    scrollToEnd();
    return { ok: true, offline: true };
  }, [sessionId, t]);

  const openWithInquiry = useCallback(async (inquiryText, displayText) => {
    setOpen(true);
    setError('');
    await sendMessage(inquiryText, { showThankYou: true, displayText });
  }, [sendMessage]);

  const value = useMemo(
    () => ({ open, setOpen, openWithInquiry }),
    [open, openWithInquiry],
  );

  const submitDraft = async (event) => {
    event.preventDefault();
    const text = draft;
    setDraft('');
    await sendMessage(text);
  };

  return (
    <BookingAssistantContext.Provider value={value}>
      {children}
      {open && (
        <div className="book-assistant" role="dialog" aria-label={t('booking.chatTitle')}>
          <div className="book-assistant-head">
            <div>
              <p className="book-kicker mb-1">{t('booking.chatKicker')}</p>
              <h3>{t('booking.chatTitle')}</h3>
            </div>
            <button type="button" className="book-assistant-close" onClick={() => setOpen(false)} aria-label={t('booking.closeChat')}>
              <CloseIcon size={18} />
            </button>
          </div>
          <div className="book-assistant-list" ref={listRef}>
            {messages.length === 0 && (
              <p className="book-assistant-empty">{t('booking.chatEmpty')}</p>
            )}
            {messages.map((item, index) => (
              <div key={`${item.role}-${index}`} className={`book-assistant-msg is-${item.role}`}>
                {item.content}
              </div>
            ))}
            {sending && <div className="book-assistant-msg is-assistant">{t('booking.chatThinking')}</div>}
          </div>
          {error && <p className="book-assistant-error">{error}</p>}
          <form className="book-assistant-form" onSubmit={submitDraft}>
            <input
              className="form-control book-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t('booking.chatPh')}
              disabled={sending}
            />
            <button type="submit" className="lux-btn" disabled={sending || !draft.trim()}>
              {t('booking.chatSend')}
            </button>
          </form>
        </div>
      )}
    </BookingAssistantContext.Provider>
  );
}
