import { useState, useCallback, useRef, useEffect } from 'react';
import { makeCouncilRequest } from '@/shared/lib/councilApiTransport';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatStatus {
  llm_reachable: boolean;
  server_url: string;
  model: string;
}

const STORAGE_KEY = 'council_chat_session_id';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = localStorage.getItem(STORAGE_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, sid);
  }
  return sid;
}

export function useCouncilChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ChatStatus | null>(null);
  const [sessionId, setSessionId] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  // Initialize session
  useEffect(() => {
    const sid = getSessionId();
    setSessionId(sid);

    // Load history
    makeCouncilRequest(`/v1/chat/history?session_id=${sid}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.messages) {
          setMessages(data.messages);
        }
      })
      .catch(() => {});

    // Check status
    makeCouncilRequest('/v1/chat/status')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) setStatus(data);
      })
      .catch(() => {});
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !sessionId) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const userMsg: ChatMessage = { role: 'user', content: content.trim(), timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const res = await makeCouncilRequest('/v1/chat/send', {
        method: 'POST',
        body: JSON.stringify({
          message: content.trim(),
          session_id: sessionId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Chat failed: ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat failed');
      // Remove user message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const resetChat = useCallback(async () => {
    if (!sessionId) return;
    try {
      await makeCouncilRequest(`/v1/chat/reset?session_id=${sessionId}`, {
        method: 'POST',
      });
      setMessages([]);
      // Generate new session
      const newSid = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, newSid);
      setSessionId(newSid);
    } catch (err) {
      console.error('Failed to reset chat:', err);
    }
  }, [sessionId]);

  return {
    messages,
    isLoading,
    error,
    status,
    sessionId,
    sendMessage,
    resetChat,
  };
}
