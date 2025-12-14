'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';

interface EmailGeneratorProps {
  jobId: string;
  hasAccess: boolean;
}

type EmailType = 'cover_letter' | 'thank_you' | 'follow_up' | 'offer_discussion';
type InterviewType = 'recruiter' | 'hiring_manager' | 'technical' | 'panel' | 'executive' | 'hr_culture' | 'other';

interface EmailRecord {
  id: string;
  job_id: string;
  user_id: string;
  email_type: EmailType;
  interview_round: number | null;
  interview_type: InterviewType | null;
  subject: string | null;
  body: string;
  include_signalpage_link: boolean;
  created_at: string;
  updated_at: string;
}

const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
  cover_letter: 'Cover Letter',
  thank_you: 'Thank You Email',
  follow_up: 'Follow-up Email',
  offer_discussion: 'Offer Discussion',
};

const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  recruiter: 'Recruiter Screen',
  hiring_manager: 'Hiring Manager',
  technical: 'Technical Interview',
  panel: 'Panel Interview',
  executive: 'Executive/Leadership',
  hr_culture: 'HR/Culture Fit',
  other: 'Other',
};

export function EmailGenerator({ jobId, hasAccess }: EmailGeneratorProps) {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [emailType, setEmailType] = useState<EmailType>('cover_letter');
  const [interviewRound, setInterviewRound] = useState<number>(1);
  const [interviewType, setInterviewType] = useState<InterviewType>('recruiter');
  const [includeSignalpageLink, setIncludeSignalpageLink] = useState(true);

  // Editing state
  const [editingEmail, setEditingEmail] = useState<EmailRecord | null>(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Expanded emails for viewing
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    try {
      const response = await fetch(`/api/generate-email?jobId=${jobId}`);
      if (!response.ok) {
        if (response.status === 401) return;
        throw new Error('Failed to fetch emails');
      }
      const data = await response.json();
      setEmails(data.emails || []);
    } catch (err) {
      console.error('Failed to fetch emails:', err);
    }
  }, [jobId]);

  useEffect(() => {
    if (hasAccess) {
      setLoading(true);
      fetchEmails().finally(() => setLoading(false));
    }
  }, [jobId, hasAccess, fetchEmails]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          emailType,
          interviewRound: emailType !== 'cover_letter' && emailType !== 'offer_discussion' ? interviewRound : undefined,
          interviewType: emailType !== 'cover_letter' && emailType !== 'offer_discussion' ? interviewType : undefined,
          includeSignalpageLink,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate email');
      }

      // Add or update the email in the list
      setEmails(prev => {
        const existingIndex = prev.findIndex(e => e.id === data.email.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = data.email;
          return updated;
        }
        return [data.email, ...prev];
      });

      // Expand the newly generated email
      setExpandedEmailId(data.email.id);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate email');
    } finally {
      setGenerating(false);
    }
  };

  const handleEdit = (email: EmailRecord) => {
    setEditingEmail(email);
    setEditedSubject(email.subject || '');
    setEditedBody(email.body);
  };

  const handleSave = async () => {
    if (!editingEmail) return;

    setIsSaving(true);

    try {
      const response = await fetch('/api/generate-email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: editingEmail.id,
          subject: editedSubject,
          body: editedBody,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save email');
      }

      // Update the email in the list
      setEmails(prev => prev.map(e => e.id === data.email.id ? data.email : e));
      setEditingEmail(null);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save email');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (emailId: string) => {
    if (!confirm('Are you sure you want to delete this email?')) return;

    try {
      const response = await fetch(`/api/generate-email?emailId=${emailId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete email');
      }

      setEmails(prev => prev.filter(e => e.id !== emailId));
      if (expandedEmailId === emailId) {
        setExpandedEmailId(null);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete email');
    }
  };

  const handleCopy = async (email: EmailRecord) => {
    const text = `Subject: ${email.subject || ''}\n\n${email.body}`;
    await navigator.clipboard.writeText(text);
  };

  const handleDownloadDocx = async (email: EmailRecord) => {
    const paragraphs: Paragraph[] = [];

    // Add each line as a paragraph, preserving formatting
    const lines = email.body.split('\n');
    for (const line of lines) {
      if (line.trim() === '') {
        paragraphs.push(new Paragraph({ text: '' }));
      } else {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: line, size: 24 })],
            spacing: { after: 120 },
          })
        );
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          children: paragraphs,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${EMAIL_TYPE_LABELS[email.email_type].replace(/\s+/g, '_')}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = (email: EmailRecord) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const bodyHtml = email.body
        .split('\n')
        .map(line => line.trim() === '' ? '<br/>' : `<p style="margin: 0 0 8px 0;">${line}</p>`)
        .join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${EMAIL_TYPE_LABELS[email.email_type]}</title>
          <style>
            @page { margin: 1in; }
            body {
              font-family: 'Times New Roman', serif;
              font-size: 12pt;
              line-height: 1.5;
              max-width: 7in;
              margin: 0 auto;
            }
            p { margin: 0 0 8px 0; }
          </style>
        </head>
        <body>
          ${bodyHtml}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getEmailLabel = (email: EmailRecord): string => {
    if (email.email_type === 'cover_letter') {
      return 'Cover Letter';
    }
    if (email.email_type === 'offer_discussion') {
      return 'Offer Discussion';
    }
    const roundLabel = `Round ${email.interview_round}`;
    const typeLabel = email.interview_type ? INTERVIEW_TYPE_LABELS[email.interview_type] : '';
    return `${EMAIL_TYPE_LABELS[email.email_type]} - ${roundLabel} (${typeLabel})`;
  };

  if (!hasAccess) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Email Generator
          </h3>
          <p className="mb-6 text-gray-600">
            Generate personalized cover letters and interview follow-up emails tailored to this role.
          </p>
          <a href="/pricing">
            <Button variant="primary" className="bg-gradient-to-r from-blue-600 to-indigo-600">
              Upgrade to Pro
            </Button>
          </a>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading emails...</p>
        </CardContent>
      </Card>
    );
  }

  // Editing view
  if (editingEmail) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Edit Email</CardTitle>
            <button
              onClick={() => setEditingEmail(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
              <input
                type="text"
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Body</label>
              <textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={15}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingEmail(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
                Save Changes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Generator Form */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Email</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Email Type */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email Type</label>
              <select
                value={emailType}
                onChange={(e) => setEmailType(e.target.value as EmailType)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {Object.entries(EMAIL_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Interview Round & Type (for thank_you and follow_up) */}
            {(emailType === 'thank_you' || emailType === 'follow_up') && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Interview Round</label>
                  <select
                    value={interviewRound}
                    onChange={(e) => setInterviewRound(Number(e.target.value))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {[1, 2, 3, 4, 5].map(round => (
                      <option key={round} value={round}>Round {round}{round === 5 ? '+' : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Interview Type</label>
                  <select
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value as InterviewType)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {Object.entries(INTERVIEW_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* SignalPage Link Toggle */}
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Include SignalPage Link</p>
                <p className="text-xs text-gray-500">Add a P.S. with your personalized page link</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={includeSignalpageLink}
                onClick={() => setIncludeSignalpageLink(!includeSignalpageLink)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  includeSignalpageLink ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    includeSignalpageLink ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              variant="primary"
              onClick={handleGenerate}
              isLoading={generating}
              disabled={generating}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              {generating ? 'Generating...' : 'Generate Email'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Emails List */}
      {emails.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Emails ({emails.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {emails.map((email) => {
                const isExpanded = expandedEmailId === email.id;

                return (
                  <div
                    key={email.id}
                    className="rounded-lg border border-gray-200 overflow-hidden"
                  >
                    {/* Header - Always visible */}
                    <button
                      onClick={() => setExpandedEmailId(isExpanded ? null : email.id)}
                      className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            email.email_type === 'cover_letter'
                              ? 'bg-blue-100 text-blue-800'
                              : email.email_type === 'thank_you'
                              ? 'bg-green-100 text-green-800'
                              : email.email_type === 'follow_up'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {getEmailLabel(email)}
                          </span>
                          {email.subject && (
                            <p className="mt-1 text-sm font-medium text-gray-900">{email.subject}</p>
                          )}
                        </div>
                        <svg
                          className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4">
                        <div className="mb-4 rounded-lg bg-white p-4 border border-gray-200">
                          <p className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                            {email.body}
                          </p>
                        </div>

                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">
                              Generated {new Date(email.created_at).toLocaleDateString()}
                              {email.include_signalpage_link && (
                                <span className="ml-2 text-blue-600">• Includes SignalPage link</span>
                              )}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(email)}
                              >
                                <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(email.id)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </Button>
                            </div>
                          </div>
                          {/* Download/Copy buttons */}
                          <div className="flex gap-2 border-t border-gray-200 pt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopy(email)}
                              className="flex-1"
                            >
                              <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                              Copy
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadDocx(email)}
                              className="flex-1"
                            >
                              <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              DOCX
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadPdf(email)}
                              className="flex-1"
                            >
                              <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              PDF
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {emails.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <svg className="mx-auto mb-4 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500">
              No emails generated yet. Use the form above to create your first email.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
