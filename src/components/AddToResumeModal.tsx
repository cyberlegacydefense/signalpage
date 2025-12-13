'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';

interface AddToResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  signalPageUrl: string;
}

type LinkLocation = 'header' | 'above_summary' | 'below_summary' | 'footer';

const LOCATION_OPTIONS: { value: LinkLocation; label: string; description: string; example: string }[] = [
  {
    value: 'header',
    label: 'Header (Contact Info)',
    description: 'Add alongside your contact details',
    example: 'email@example.com | (555) 123-4567 | Digital Portfolio: {url}'
  },
  {
    value: 'above_summary',
    label: 'Above Summary',
    description: 'Prominent placement before your summary',
    example: 'Digital Portfolio: {url}\n\nPROFESSIONAL SUMMARY\n...'
  },
  {
    value: 'below_summary',
    label: 'Below Summary',
    description: 'After your professional summary',
    example: 'PROFESSIONAL SUMMARY\n...\n\nDigital Portfolio: {url}'
  },
  {
    value: 'footer',
    label: 'Footer',
    description: 'At the bottom of your resume',
    example: '...\nDigital Portfolio: {url}'
  },
];

export function AddToResumeModal({
  isOpen,
  onClose,
  signalPageUrl,
}: AddToResumeModalProps) {
  const [linkLocation, setLinkLocation] = useState<LinkLocation>('header');
  const [linkTitle, setLinkTitle] = useState('Digital Portfolio');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const formattedLink = `${linkTitle}: ${signalPageUrl}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formattedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedLocation = LOCATION_OPTIONS.find(o => o.value === linkLocation);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl flex flex-col max-h-[90vh]">
        {/* Header - Fixed */}
        <div className="border-b px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Add SignalPage to Resume</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Copy your SignalPage link to add to your existing resume
          </p>
        </div>

        {/* Content - Scrollable */}
        <div className="px-6 py-4 space-y-5 overflow-y-auto flex-1">
          {/* Link Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link Title
            </label>
            <input
              type="text"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Digital Portfolio"
            />
          </div>

          {/* Location Recommendation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recommended Placement
            </label>
            <div className="space-y-2">
              {LOCATION_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    linkLocation === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="location"
                    value={option.value}
                    checked={linkLocation === option.value}
                    onChange={() => setLinkLocation(option.value)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{option.label}</p>
                    <p className="text-sm text-gray-500">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Copy Section */}
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Your Link (click to copy)</p>
            <button
              onClick={handleCopy}
              className="w-full text-left p-3 rounded-md bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-gray-900 break-all">
                  <span className="font-medium">{linkTitle}:</span>{' '}
                  <span className="text-blue-600">{signalPageUrl}</span>
                </p>
                <div className="flex-shrink-0">
                  {copied ? (
                    <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
            {copied && (
              <p className="mt-2 text-xs text-green-600 text-center">Copied to clipboard!</p>
            )}
          </div>

          {/* Example */}
          {selectedLocation && (
            <div className="rounded-lg border border-dashed border-gray-300 p-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Example: {selectedLocation.label}</p>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 p-2 rounded">
                {selectedLocation.example.replace('{url}', signalPageUrl)}
              </pre>
            </div>
          )}

          {/* Tips */}
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
            <p className="text-xs font-medium text-blue-800 mb-2">Tips for adding to your resume:</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Open your resume in Word, Google Docs, or your preferred editor</li>
              <li>• Paste the link in your chosen location</li>
              <li>• Make the URL a clickable hyperlink if submitting digitally</li>
              <li>• Consider using a shorter format for printed resumes</li>
            </ul>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="border-t px-6 py-4 flex justify-end gap-3 flex-shrink-0 bg-white">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy Link
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
