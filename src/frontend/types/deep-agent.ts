export type SubAgentStatus = 'delegating' | 'complete' | 'error';

export interface SubAgentInfo {
  name: string;
  toolCallId: string;
  status: SubAgentStatus;
  startedAt: number;
}

export interface ToolCallWithContent {
  name: string;
  args: Record<string, unknown>;
  id: string;
  content?: unknown;
}

export interface InterruptInfo {
  value: string;
  resumable: boolean;
}

export type InterruptType = 'tool_approval' | 'plan_review' | 'text';

export interface ActionRequest {
  tool_name: string;
  tool_args: Record<string, unknown>;
}

export interface ReviewConfig {
  allowed_decisions: string[];
  description?: string;
}

export interface ToolApprovalInterrupt {
  interrupt_type: 'tool_approval';
  action_requests: ActionRequest[];
  review_configs: ReviewConfig[];
  supports_approve_all: boolean;
  resumable: boolean;
}

export interface PlanStep {
  step: number;
  description: string;
  tool: string | null;
}

export interface PlanReviewInterrupt {
  interrupt_type: 'plan_review';
  plan_steps: PlanStep[];
  resumable: boolean;
}

export type StructuredInterrupt = ToolApprovalInterrupt | PlanReviewInterrupt;

export interface AddedStep {
  description: string;
  insert_after: number;
}

export interface PlanDecision {
  type: 'plan_decision';
  approved_steps: number[];
  rejected_steps: number[];
  added_steps: AddedStep[];
  feedback?: string;
}

export interface HITLResponse {
  decisions: Array<{ type: 'approve' | 'reject' }>;
}

export function isStructuredInterrupt(
  content: unknown,
): content is StructuredInterrupt {
  if (!content || typeof content !== 'object') return false;
  const c = content as Record<string, unknown>;
  return c.interrupt_type === 'tool_approval' || c.interrupt_type === 'plan_review';
}

export interface TaskStep {
  id: string;
  name: string;
  status: 'running' | 'complete' | 'error';
  startedAt: number;
  completedAt?: number;
  result?: string;
}

const KNOWN_SUBAGENT_NAMES = new Set(['analyst', 'publisher']);

export function isSubAgentToolCall(toolCall: { name: string; args?: Record<string, unknown> }): boolean {
  if (toolCall.name === 'task' && toolCall.args?.subagent_type) return true;
  return KNOWN_SUBAGENT_NAMES.has(toolCall.name);
}

export function extractSubAgentName(toolCall: { name: string; args?: Record<string, unknown> }): string {
  if (toolCall.name === 'task' && typeof toolCall.args?.subagent_type === 'string') {
    return toolCall.args.subagent_type;
  }
  return toolCall.name;
}

export interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export function extractTodosFromMessages(messages: { type: string; tool_calls?: { name: string; args?: Record<string, unknown> }[] }[]): TodoItem[] {
  let latest: TodoItem[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.type !== 'ai') continue;
    const toolCalls = msg.tool_calls;
    if (!Array.isArray(toolCalls)) continue;
    for (const tc of toolCalls) {
      if (tc.name !== 'write_todos') continue;
      const raw = tc.args?.todos;
      if (!Array.isArray(raw)) continue;
      latest = raw
        .filter((t): t is { content: string; status: string } =>
          t != null && typeof t === 'object' && typeof (t as Record<string, unknown>).content === 'string',
        )
        .map((t) => ({
          content: t.content,
          status: (['pending', 'in_progress', 'completed'].includes(t.status) ? t.status : 'pending') as TodoItem['status'],
        }));
      return latest;
    }
  }
  return latest;
}

const CODE_FENCE_RE = /```[\s\S]*?```/;
const JSON_START_RE = /^\s*[{\[]/;

export type ArtifactKind = 'code' | 'json' | 'markdown' | 'text';

export function detectArtifactKind(content: string): ArtifactKind {
  if (CODE_FENCE_RE.test(content)) return 'code';
  if (JSON_START_RE.test(content)) {
    try { JSON.parse(content); return 'json'; } catch { /* not valid json */ }
  }
  if (content.includes('# ') || content.includes('**') || content.includes('- ')) return 'markdown';
  return 'text';
}
