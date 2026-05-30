import { useState, useCallback } from 'react';
import { CheckCircle, XCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@patternfly/react-core';
import type { ToolApprovalInterrupt, HITLResponse } from '../types/deep-agent';

interface ToolApprovalCardProps {
  readonly interrupt: ToolApprovalInterrupt;
  readonly threadId: string;
  readonly onResume: (response: HITLResponse) => void;
  readonly onDismiss: () => void;
}

export function ToolApprovalCard({
  interrupt,
  threadId,
  onResume,
  onDismiss,
}: ToolApprovalCardProps) {
  const [isApproving, setIsApproving] = useState(false);

  const handleApprove = useCallback(() => {
    onResume({ decisions: interrupt.action_requests.map(() => ({ type: 'approve' })) });
  }, [interrupt.action_requests, onResume]);

  const handleReject = useCallback(() => {
    onResume({ decisions: interrupt.action_requests.map(() => ({ type: 'reject' })) });
  }, [interrupt.action_requests, onResume]);

  const handleApproveAll = useCallback(async () => {
    setIsApproving(true);
    try {
      await fetch('/api/proxy/agent/trust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ thread_id: threadId, action: 'approve_all' }),
      });
    } catch {
      // Trust set failed but we still approve this one
    }
    setIsApproving(false);
    handleApprove();
  }, [threadId, handleApprove]);

  return (
    <div className="mx-4 mb-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 overflow-hidden">
      <div className="px-4 py-2 bg-amber-100 dark:bg-amber-900/50 border-b border-amber-200 dark:border-amber-800">
        <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
          Action Approval Required
        </span>
      </div>

      <div className="p-4 space-y-3">
        {interrupt.action_requests.map((req, i) => {
          const config = interrupt.review_configs[i];
          return (
            <div
              key={`${req.tool_name}-${i}`}
              className="rounded border border-border bg-card p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <code className="text-sm font-mono font-semibold text-primary">
                  {req.tool_name}
                </code>
                {config?.description && (
                  <span className="text-xs text-muted-foreground">
                    — {config.description}
                  </span>
                )}
              </div>
              {Object.keys(req.tool_args).length > 0 && (
                <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto max-h-32">
                  {JSON.stringify(req.tool_args, null, 2)}
                </pre>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-amber-200 dark:border-amber-800 flex items-center gap-2 flex-wrap">
        <Button
          variant="primary"
          size="sm"
          icon={<CheckCircle className="w-3.5 h-3.5" />}
          onClick={handleApprove}
        >
          Approve
        </Button>
        <Button
          variant="danger"
          size="sm"
          icon={<XCircle className="w-3.5 h-3.5" />}
          onClick={handleReject}
        >
          Reject
        </Button>
        {interrupt.supports_approve_all && (
          <Button
            variant="secondary"
            size="sm"
            icon={<ShieldCheck className="w-3.5 h-3.5" />}
            onClick={handleApproveAll}
            isLoading={isApproving}
          >
            Approve All for Session
          </Button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
