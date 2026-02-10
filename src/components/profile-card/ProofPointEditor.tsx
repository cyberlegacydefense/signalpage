'use client';

import { Input, Textarea, Button } from '@/components/ui';
import type { ProofPoint } from '@/types';

interface ProofPointEditorProps {
  proofPoints: ProofPoint[];
  onChange: (proofPoints: ProofPoint[]) => void;
  maxPoints?: number;
}

export function ProofPointEditor({ proofPoints, onChange, maxPoints = 3 }: ProofPointEditorProps) {
  const addProofPoint = () => {
    if (proofPoints.length >= maxPoints) return;
    onChange([
      ...proofPoints,
      {
        id: crypto.randomUUID(),
        title: '',
        metric: '',
        details: '',
      },
    ]);
  };

  const updateProofPoint = (id: string, field: keyof ProofPoint, value: string) => {
    onChange(
      proofPoints.map((pp) =>
        pp.id === id ? { ...pp, [field]: value } : pp
      )
    );
  };

  const removeProofPoint = (id: string) => {
    onChange(proofPoints.filter((pp) => pp.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Proof Points ({proofPoints.length}/{maxPoints})
        </label>
        {proofPoints.length < maxPoints && (
          <button
            type="button"
            onClick={addProofPoint}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            + Add Proof Point
          </button>
        )}
      </div>

      {proofPoints.length === 0 && (
        <p className="text-sm text-gray-500 italic">
          Add specific examples that demonstrate this superpower
        </p>
      )}

      {proofPoints.map((pp, index) => (
        <div
          key={pp.id}
          className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-gray-500">
              #{index + 1}
            </span>
            <button
              type="button"
              onClick={() => removeProofPoint(pp.id)}
              className="text-gray-400 hover:text-red-500"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <Input
            label="Title"
            placeholder="e.g., Payments Platform @ Stripe"
            value={pp.title}
            onChange={(e) => updateProofPoint(pp.id, 'title', e.target.value)}
          />

          <Input
            label="Key Metric"
            placeholder="e.g., $2M ARR in first year"
            value={pp.metric}
            onChange={(e) => updateProofPoint(pp.id, 'metric', e.target.value)}
          />

          <Textarea
            label="Details (optional)"
            placeholder="Brief description of your role and impact..."
            value={pp.details || ''}
            onChange={(e) => updateProofPoint(pp.id, 'details', e.target.value)}
            className="min-h-[60px]"
          />
        </div>
      ))}
    </div>
  );
}
