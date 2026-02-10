'use client';

import { useState } from 'react';
import { Input, Textarea, Select, Button } from '@/components/ui';
import { ProofPointEditor } from './ProofPointEditor';
import type { Superpower, Testimonial } from '@/types';
import { SUPERPOWER_ICONS } from '@/types';

interface SuperpowerEditorProps {
  superpowers: Superpower[];
  onChange: (superpowers: Superpower[]) => void;
  maxSuperpowers?: number;
}

export function SuperpowerEditor({ superpowers, onChange, maxSuperpowers = 3 }: SuperpowerEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addSuperpower = () => {
    if (superpowers.length >= maxSuperpowers) return;
    const newSuperpower: Superpower = {
      id: crypto.randomUUID(),
      title: '',
      one_liner: '',
      icon: 'rocket',
      pattern: '',
      proof_points: [],
      testimonial: undefined,
    };
    onChange([...superpowers, newSuperpower]);
    setExpandedId(newSuperpower.id);
  };

  const updateSuperpower = (id: string, updates: Partial<Superpower>) => {
    onChange(
      superpowers.map((sp) =>
        sp.id === id ? { ...sp, ...updates } : sp
      )
    );
  };

  const removeSuperpower = (id: string) => {
    onChange(superpowers.filter((sp) => sp.id !== id));
    if (expandedId === id) {
      setExpandedId(null);
    }
  };

  const updateTestimonial = (id: string, testimonial: Testimonial | undefined) => {
    updateSuperpower(id, { testimonial });
  };

  const getIconEmoji = (iconValue: string) => {
    return SUPERPOWER_ICONS.find((i) => i.value === iconValue)?.emoji || '🚀';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Superpowers ({superpowers.length}/{maxSuperpowers})
        </label>
        {superpowers.length < maxSuperpowers && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSuperpower}
          >
            + Add Superpower
          </Button>
        )}
      </div>

      {superpowers.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-500">
            Add your top superpowers - the unique abilities that set you apart
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSuperpower}
            className="mt-3"
          >
            Add Your First Superpower
          </Button>
        </div>
      )}

      {superpowers.map((sp, index) => (
        <div
          key={sp.id}
          className="rounded-xl border border-gray-200 bg-white overflow-hidden"
        >
          {/* Collapsed Header */}
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
            onClick={() => setExpandedId(expandedId === sp.id ? null : sp.id)}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getIconEmoji(sp.icon || 'rocket')}</span>
              <div>
                <h4 className="font-medium text-gray-900">
                  {sp.title || `Superpower #${index + 1}`}
                </h4>
                {sp.one_liner && (
                  <p className="text-sm text-gray-500">{sp.one_liner}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeSuperpower(sp.id);
                }}
                className="p-1 text-gray-400 hover:text-red-500"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <svg
                className={`h-5 w-5 text-gray-400 transition-transform ${
                  expandedId === sp.id ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Expanded Content */}
          {expandedId === sp.id && (
            <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Title"
                  placeholder="e.g., 0→1 Product Launches"
                  value={sp.title}
                  onChange={(e) => updateSuperpower(sp.id, { title: e.target.value })}
                />

                <Select
                  label="Icon"
                  value={sp.icon || 'rocket'}
                  onChange={(e) => updateSuperpower(sp.id, { icon: e.target.value })}
                  options={SUPERPOWER_ICONS.map((i) => ({
                    value: i.value,
                    label: `${i.emoji} ${i.label}`,
                  }))}
                />
              </div>

              <Input
                label="One-liner"
                placeholder="e.g., Shipped 4 products from zero"
                value={sp.one_liner}
                onChange={(e) => updateSuperpower(sp.id, { one_liner: e.target.value })}
                helperText="A brief summary shown on the card"
              />

              <Textarea
                label="Your Pattern (optional)"
                placeholder="How I approach this: Start with customer pain, validate with data, iterate fast..."
                value={sp.pattern || ''}
                onChange={(e) => updateSuperpower(sp.id, { pattern: e.target.value })}
                className="min-h-[80px]"
              />

              <ProofPointEditor
                proofPoints={sp.proof_points}
                onChange={(proof_points) => updateSuperpower(sp.id, { proof_points })}
              />

              {/* Testimonial Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Testimonial (optional)
                  </label>
                  {!sp.testimonial && (
                    <button
                      type="button"
                      onClick={() =>
                        updateTestimonial(sp.id, {
                          quote: '',
                          author: '',
                          author_title: '',
                        })
                      }
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Testimonial
                    </button>
                  )}
                </div>

                {sp.testimonial && (
                  <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => updateTestimonial(sp.id, undefined)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <Textarea
                      label="Quote"
                      placeholder="Alex has an uncanny ability to..."
                      value={sp.testimonial.quote}
                      onChange={(e) =>
                        updateTestimonial(sp.id, {
                          ...sp.testimonial!,
                          quote: e.target.value,
                        })
                      }
                      className="min-h-[60px]"
                    />

                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        label="Author Name"
                        placeholder="Jane Smith"
                        value={sp.testimonial.author}
                        onChange={(e) =>
                          updateTestimonial(sp.id, {
                            ...sp.testimonial!,
                            author: e.target.value,
                          })
                        }
                      />
                      <Input
                        label="Author Title"
                        placeholder="CTO @ Company"
                        value={sp.testimonial.author_title || ''}
                        onChange={(e) =>
                          updateTestimonial(sp.id, {
                            ...sp.testimonial!,
                            author_title: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
