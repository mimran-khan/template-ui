import { useState, useCallback } from 'react';
import { CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react';
import { Button, TextInput } from '@patternfly/react-core';
import type {
  PlanReviewInterrupt,
  PlanStep,
  PlanDecision,
  AddedStep,
} from '../types/deep-agent';

interface PlanReviewPanelProps {
  readonly interrupt: PlanReviewInterrupt;
  readonly onResume: (decision: PlanDecision) => void;
  readonly onDismiss: () => void;
}

type StepState = 'approved' | 'skipped';

export function PlanReviewPanel({
  interrupt,
  onResume,
  onDismiss,
}: PlanReviewPanelProps) {
  const [stepStates, setStepStates] = useState<Record<number, StepState>>(
    () => {
      const initial: Record<number, StepState> = {};
      for (const s of interrupt.plan_steps) {
        initial[s.step] = 'approved';
      }
      return initial;
    },
  );
  const [addedSteps, setAddedSteps] = useState<AddedStep[]>([]);
  const [newStepDesc, setNewStepDesc] = useState('');
  const [newStepAfter, setNewStepAfter] = useState<number>(
    interrupt.plan_steps.length,
  );
  const [feedback, setFeedback] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const toggleStep = useCallback((step: number) => {
    setStepStates((prev) => ({
      ...prev,
      [step]: prev[step] === 'approved' ? 'skipped' : 'approved',
    }));
  }, []);

  const handleAddStep = useCallback(() => {
    if (!newStepDesc.trim()) return;
    setAddedSteps((prev) => [
      ...prev,
      { description: newStepDesc.trim(), insert_after: newStepAfter },
    ]);
    setNewStepDesc('');
    setShowAddForm(false);
  }, [newStepDesc, newStepAfter]);

  const removeAddedStep = useCallback((index: number) => {
    setAddedSteps((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const buildDecision = useCallback(
    (overrideAllApproved = false): PlanDecision => {
      const approved: number[] = [];
      const rejected: number[] = [];
      for (const [step, state] of Object.entries(stepStates)) {
        if (overrideAllApproved || state === 'approved') {
          approved.push(Number(step));
        } else {
          rejected.push(Number(step));
        }
      }
      return {
        type: 'plan_decision',
        approved_steps: approved.sort((a, b) => a - b),
        rejected_steps: overrideAllApproved
          ? []
          : rejected.sort((a, b) => a - b),
        added_steps: addedSteps,
        ...(feedback.trim() ? { feedback: feedback.trim() } : {}),
      };
    },
    [stepStates, addedSteps, feedback],
  );

  const handleApproveAll = () => onResume(buildDecision(true));
  const handleApproveSelected = () => onResume(buildDecision(false));
  const handleReject = () =>
    onResume({
      type: 'plan_decision',
      approved_steps: [],
      rejected_steps: interrupt.plan_steps.map((s) => s.step),
      added_steps: [],
      feedback: feedback.trim() || 'Plan rejected by user.',
    });

  const insertOptions = [
    { value: 0, label: 'Before step 1' },
    ...interrupt.plan_steps.map((s) => ({
      value: s.step,
      label: `After step ${s.step}`,
    })),
  ];

  return (
    <div className="mx-4 mb-3 rounded-lg border border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/40 overflow-hidden">
      <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900/50 border-b border-blue-200 dark:border-blue-800">
        <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
          Plan Review
        </span>
        <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
          Agent proposes this plan:
        </span>
      </div>

      <div className="p-4 space-y-1">
        {interrupt.plan_steps.map((step: PlanStep) => (
          <StepRow
            key={step.step}
            step={step}
            state={stepStates[step.step]}
            onToggle={() => toggleStep(step.step)}
          />
        ))}

        {addedSteps.map((added, i) => (
          <div
            key={`added-${i}`}
            className="flex items-center gap-2 py-1.5 px-2 rounded bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
          >
            <Plus className="w-3.5 h-3.5 text-green-600 shrink-0" />
            <span className="text-sm flex-1">{added.description}</span>
            <span className="text-[10px] font-mono text-green-600 dark:text-green-400 shrink-0">
              after {added.insert_after === 0 ? 'start' : `#${added.insert_after}`}
            </span>
            <span className="text-[10px] bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full shrink-0">
              user-added
            </span>
            <button
              type="button"
              onClick={() => removeAddedStep(i)}
              className="p-0.5 text-red-400 hover:text-red-600"
              aria-label="Remove added step"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}

        {showAddForm ? (
          <div className="mt-2 p-3 rounded border border-dashed border-blue-300 dark:border-blue-700 bg-card space-y-2">
            <TextInput
              value={newStepDesc}
              onChange={(_e, val) => setNewStepDesc(val)}
              placeholder="Describe the step to add..."
              aria-label="New step description"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground shrink-0">
                Insert:
              </label>
              <select
                value={newStepAfter}
                onChange={(e) => setNewStepAfter(Number(e.target.value))}
                className="text-xs border border-border rounded px-2 py-1 bg-card"
                aria-label="Insert position"
              >
                {insertOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                size="sm"
                isDisabled={!newStepDesc.trim()}
                onClick={handleAddStep}
              >
                Add
              </Button>
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setNewStepDesc('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
          >
            <Plus className="w-3 h-3" /> Add Step
          </button>
        )}
      </div>

      <div className="px-4 py-2 border-t border-blue-200 dark:border-blue-800">
        <TextInput
          value={feedback}
          onChange={(_e, val) => setFeedback(val)}
          placeholder="Optional feedback..."
          aria-label="Plan feedback"
          className="text-sm"
        />
      </div>

      <div className="px-4 py-3 border-t border-blue-200 dark:border-blue-800 flex items-center gap-2 flex-wrap">
        <Button
          variant="primary"
          size="sm"
          icon={<CheckCircle className="w-3.5 h-3.5" />}
          onClick={handleApproveAll}
        >
          Approve All
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleApproveSelected}
        >
          Approve Selected
        </Button>
        <Button
          variant="danger"
          size="sm"
          icon={<XCircle className="w-3.5 h-3.5" />}
          onClick={handleReject}
        >
          Reject Plan
        </Button>
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

function StepRow({
  step,
  state,
  onToggle,
}: {
  step: PlanStep;
  state: StepState;
  onToggle: () => void;
}) {
  const isApproved = state === 'approved';
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-blue-100/50 dark:hover:bg-blue-900/30">
      <button
        type="button"
        onClick={onToggle}
        className={`w-5 h-5 shrink-0 rounded flex items-center justify-center text-xs border ${
          isApproved
            ? 'border-green-400 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 dark:border-green-600'
            : 'border-red-300 bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400 dark:border-red-700'
        }`}
        aria-label={`${isApproved ? 'Skip' : 'Approve'} step ${step.step}`}
      >
        {isApproved ? '✓' : '✗'}
      </button>
      <span className="text-xs font-mono text-muted-foreground shrink-0">
        {step.step}.
      </span>
      <span className={`text-sm flex-1 ${!isApproved ? 'line-through text-muted-foreground' : ''}`}>
        {step.description}
      </span>
      {step.tool && (
        <code className="text-[10px] font-mono bg-muted/50 px-1.5 py-0.5 rounded shrink-0">
          {step.tool}
        </code>
      )}
    </div>
  );
}
