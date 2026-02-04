'use client';

import { useState } from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';
import type { ApplicationStatus, InterviewRound, InterviewType, InterviewOutcome } from '@/types';

interface ApplicationTrackerProps {
  jobId: string;
  initialStatus: ApplicationStatus;
  initialRounds: InterviewRound[];
  appliedAt?: string | null;
  onUpdate?: (status: ApplicationStatus, rounds: InterviewRound[]) => void;
}

const STATUS_OPTIONS: { value: ApplicationStatus; label: string; color: string }[] = [
  { value: 'not_applied', label: 'Not Applied', color: 'bg-gray-100 text-gray-700' },
  { value: 'applied', label: 'Applied', color: 'bg-blue-100 text-blue-700' },
  { value: 'interview_scheduled', label: 'Interview Scheduled', color: 'bg-purple-100 text-purple-700' },
  { value: 'interviewing', label: 'Interviewing', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'offer_received', label: 'Offer Received', color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'bg-orange-100 text-orange-700' },
  { value: 'accepted', label: 'Accepted', color: 'bg-emerald-100 text-emerald-700' },
];

const INTERVIEW_TYPES: { value: InterviewType; label: string }[] = [
  { value: 'recruiter', label: 'Recruiter Screen' },
  { value: 'hiring_manager', label: 'Hiring Manager' },
  { value: 'technical', label: 'Technical' },
  { value: 'panel', label: 'Panel' },
  { value: 'executive', label: 'Executive' },
  { value: 'hr_culture', label: 'HR/Culture' },
  { value: 'other', label: 'Other' },
];

const OUTCOME_OPTIONS: { value: InterviewOutcome; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'passed', label: 'Passed', color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
];

export function ApplicationTracker({
  jobId,
  initialStatus,
  initialRounds,
  appliedAt,
  onUpdate,
}: ApplicationTrackerProps) {
  const [status, setStatus] = useState<ApplicationStatus>(initialStatus);
  const [rounds, setRounds] = useState<InterviewRound[]>(initialRounds || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingRound, setIsAddingRound] = useState(false);
  const [editingRoundIndex, setEditingRoundIndex] = useState<number | null>(null);
  const [newRound, setNewRound] = useState<Partial<InterviewRound>>({
    type: 'recruiter',
    outcome: 'pending',
  });

  const saveToServer = async (newStatus: ApplicationStatus, newRounds: InterviewRound[]) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/jobs/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          applicationStatus: newStatus,
          interviewRounds: newRounds,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      onUpdate?.(newStatus, newRounds);
    } catch (err) {
      console.error('Error saving application status:', err);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    setStatus(newStatus);
    await saveToServer(newStatus, rounds);
  };

  const handleAddRound = async () => {
    const roundNumber = rounds.length + 1;
    const round: InterviewRound = {
      round: roundNumber,
      type: (newRound.type || 'recruiter') as InterviewType,
      scheduled_at: newRound.scheduled_at,
      notes: newRound.notes,
      outcome: 'pending',
    };

    const newRounds = [...rounds, round];
    setRounds(newRounds);
    setIsAddingRound(false);
    setNewRound({ type: 'recruiter', outcome: 'pending' });
    await saveToServer(status, newRounds);
  };

  const handleUpdateRound = async (index: number, updates: Partial<InterviewRound>) => {
    const newRounds = [...rounds];
    newRounds[index] = { ...newRounds[index], ...updates };
    setRounds(newRounds);
    setEditingRoundIndex(null);
    await saveToServer(status, newRounds);
  };

  const handleDeleteRound = async (index: number) => {
    if (!confirm('Are you sure you want to delete this interview round?')) return;

    const newRounds = rounds.filter((_, i) => i !== index).map((r, i) => ({ ...r, round: i + 1 }));
    setRounds(newRounds);
    await saveToServer(status, newRounds);
  };

  const getStatusColor = (s: ApplicationStatus) => {
    return STATUS_OPTIONS.find(opt => opt.value === s)?.color || 'bg-gray-100 text-gray-700';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Tracking</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusChange(option.value)}
                disabled={isSaving}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  status === option.value
                    ? `${option.color} ring-2 ring-offset-1 ring-gray-400`
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {appliedAt && status !== 'not_applied' && (
            <p className="mt-2 text-xs text-gray-500">
              Applied {formatDistanceToNow(new Date(appliedAt), { addSuffix: true })}
            </p>
          )}
        </div>

        {/* Interview Rounds */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Interview Rounds ({rounds.length})
            </label>
            {!isAddingRound && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingRound(true)}
                disabled={isSaving}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Round
              </Button>
            )}
          </div>

          {/* Existing Rounds */}
          <div className="space-y-3">
            {rounds.map((round, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                {editingRoundIndex === index ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                        <select
                          value={round.type}
                          onChange={(e) => {
                            const newRounds = [...rounds];
                            newRounds[index] = { ...round, type: e.target.value as InterviewType };
                            setRounds(newRounds);
                          }}
                          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                        >
                          {INTERVIEW_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Outcome</label>
                        <select
                          value={round.outcome || 'pending'}
                          onChange={(e) => {
                            const newRounds = [...rounds];
                            newRounds[index] = { ...round, outcome: e.target.value as InterviewOutcome };
                            setRounds(newRounds);
                          }}
                          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                        >
                          {OUTCOME_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Scheduled Date</label>
                      <input
                        type="datetime-local"
                        value={round.scheduled_at ? new Date(round.scheduled_at).toISOString().slice(0, 16) : ''}
                        onChange={(e) => {
                          const newRounds = [...rounds];
                          newRounds[index] = { ...round, scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : undefined };
                          setRounds(newRounds);
                        }}
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                      <textarea
                        value={round.notes || ''}
                        onChange={(e) => {
                          const newRounds = [...rounds];
                          newRounds[index] = { ...round, notes: e.target.value };
                          setRounds(newRounds);
                        }}
                        rows={3}
                        placeholder="Interview notes, questions asked, feedback..."
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="flex justify-between pt-2">
                      <button
                        onClick={() => handleDeleteRound(index)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRounds(initialRounds || []);
                            setEditingRoundIndex(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUpdateRound(index, rounds[index])}
                          isLoading={isSaving}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setEditingRoundIndex(index)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          Round {round.round}: {INTERVIEW_TYPES.find(t => t.value === round.type)?.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          OUTCOME_OPTIONS.find(o => o.value === round.outcome)?.color || 'bg-gray-100 text-gray-700'
                        }`}>
                          {OUTCOME_OPTIONS.find(o => o.value === round.outcome)?.label || 'Pending'}
                        </span>
                      </div>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                    {round.scheduled_at && (
                      <p className="text-xs text-gray-500 mb-1">
                        {new Date(round.scheduled_at).toLocaleDateString()} at {new Date(round.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    {round.notes && (
                      <p className="text-sm text-gray-600 line-clamp-2">{round.notes}</p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Add New Round Form */}
            {isAddingRound && (
              <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Add Interview Round</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                      <select
                        value={newRound.type || 'recruiter'}
                        onChange={(e) => setNewRound({ ...newRound, type: e.target.value as InterviewType })}
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      >
                        {INTERVIEW_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Scheduled Date</label>
                      <input
                        type="datetime-local"
                        value={newRound.scheduled_at || ''}
                        onChange={(e) => setNewRound({ ...newRound, scheduled_at: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                    <textarea
                      value={newRound.notes || ''}
                      onChange={(e) => setNewRound({ ...newRound, notes: e.target.value })}
                      rows={2}
                      placeholder="Any notes about this interview..."
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsAddingRound(false);
                        setNewRound({ type: 'recruiter', outcome: 'pending' });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAddRound}
                      isLoading={isSaving}
                    >
                      Add Round
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {rounds.length === 0 && !isAddingRound && (
              <p className="text-sm text-gray-500 text-center py-4">
                No interview rounds logged yet. Click &quot;Add Round&quot; to track your interviews.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact badge version for dashboard cards
export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const option = STATUS_OPTIONS.find(opt => opt.value === status);
  if (!option || status === 'not_applied') return null;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${option.color}`}>
      {option.label}
    </span>
  );
}
