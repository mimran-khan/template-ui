import { useState, useCallback, type FormEvent, type KeyboardEvent } from 'react';
import { Send, CheckCircle } from 'lucide-react';

interface BtwBarProps {
  readonly threadId: string;
  readonly isStreaming: boolean;
}

export function BtwBar({ threadId, isStreaming }: BtwBarProps) {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      if (e) e.preventDefault();
      const trimmed = message.trim();
      if (!trimmed || !threadId) return;

      setStatus('sending');
      try {
        const resp = await fetch('/api/proxy/agent/btw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ thread_id: threadId, message: trimmed }),
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        setMessage('');
        setStatus('sent');
        setTimeout(() => setStatus('idle'), 2000);
      } catch {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    },
    [message, threadId],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isStreaming) return null;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 px-3 py-2 mx-4 mb-2 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/30"
    >
      <span className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400 shrink-0">
        /btw
      </span>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Send context to the running agent..."
        disabled={status === 'sending'}
        className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground/60"
        aria-label="Send context to agent"
      />
      {status === 'sent' ? (
        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
      ) : (
        <button
          type="submit"
          disabled={!message.trim() || status === 'sending'}
          className="p-1 rounded text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          aria-label="Send /btw message"
        >
          <Send className="w-4 h-4" />
        </button>
      )}
      {status === 'error' && (
        <span className="text-xs text-red-500">Failed</span>
      )}
    </form>
  );
}
