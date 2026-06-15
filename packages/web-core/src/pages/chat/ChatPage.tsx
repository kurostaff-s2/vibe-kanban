import { useState, useCallback, useRef, useEffect } from 'react';
import { useCouncilChat, useModelSwap, type ChatMessage } from '@/shared/hooks/council';
import { Button } from '@vibe/ui/components/Button';
import { Textarea } from '@vibe/ui/components/Textarea';
import { Badge } from '@vibe/ui/components/Badge';
import { ModelSelector } from '@/shared/components/ModelSelector';
import { SlotIndicator } from '@/shared/components/SlotIndicator';
import { LogPanel } from '@/shared/components/LogPanel';
import {
  ArrowUpIcon,
  BrainIcon,
  TrashIcon,
  WarningIcon,
  SpinnerIcon,
  UserIcon,
  ListIcon,
} from '@phosphor-icons/react';

function ChatMessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center">
          <BrainIcon className="h-4 w-4 text-purple-400" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2.5 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-secondary text-normal border border-border'
        }`}
      >
        <div className="text-sm whitespace-pre-wrap break-words">
          {msg.content}
        </div>
        <div className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-low'}`}>
          {new Date(msg.timestamp).toLocaleTimeString()}
        </div>
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center">
          <UserIcon className="h-4 w-4 text-blue-400" />
        </div>
      )}
    </div>
  );
}

function ChatPage() {
  const { messages, isLoading, error, status, sendMessage, resetChat } = useCouncilChat();
  const { currentModel, swapModel } = useModelSwap();
  const [input, setInput] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    await sendMessage(text);
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isLlmReady = status?.llm_reachable ?? false;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <BrainIcon className="h-5 w-5 text-purple-400" weight="fill" />
          <h1 className="text-lg font-semibold text-high">ARC Assistant</h1>
          <Badge variant={isLlmReady ? 'default' : 'destructive'}>
            {isLlmReady ? 'Online' : 'Offline'}
          </Badge>
          <ModelSelector value={currentModel} onChange={swapModel} />
          <SlotIndicator />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLogs(!showLogs)}
            className={showLogs ? 'text-blue-400' : ''}
          >
            <ListIcon className="h-4 w-4" />
            Logs
          </Button>
          <Button variant="ghost" size="sm" onClick={resetChat} disabled={messages.length === 0}>
            <TrashIcon className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2 text-sm text-red-400">
          <WarningIcon className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isLlmReady && (
          <div className="flex items-center justify-center h-full text-low">
            <div className="text-center max-w-sm">
              <BrainIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">ARC is offline</p>
              <p className="text-sm">
                The LLM server at {status?.server_url ?? 'localhost:8091'} is not reachable.
                Make sure the LLM service is running.
              </p>
            </div>
          </div>
        )}

        {messages.length === 0 && isLlmReady && (
          <div className="flex items-center justify-center h-full text-low">
            <div className="text-center max-w-sm">
              <BrainIcon className="h-16 w-16 mx-auto mb-4 opacity-30" weight="fill" />
              <p className="text-lg font-medium mb-2">Ask ARC anything</p>
              <p className="text-sm">
                I can help with task planning, code review, debugging, architecture decisions, and project management.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessageBubble key={i} msg={msg} />
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center">
              <BrainIcon className="h-4 w-4 text-purple-400" />
            </div>
            <div className="bg-secondary text-low border border-border rounded-lg px-4 py-2.5 flex items-center gap-2">
              <SpinnerIcon className="h-4 w-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Log Panel (collapsible) */}
      {showLogs && (
        <div className="border-t border-border px-4 py-2 flex-shrink-0">
          <LogPanel height="h-40" />
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask ARC... (Enter to send, Shift+Enter for newline)"
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
            disabled={isLoading || !isLlmReady}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !isLlmReady}
            className="self-end"
          >
            <ArrowUpIcon className="h-5 w-5" />
          </Button>
        </div>
        <div className="text-xs text-low mt-1">
          {status?.model ?? 'qwen3.6-27b'} · Press Enter to send, Shift+Enter for newline
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
