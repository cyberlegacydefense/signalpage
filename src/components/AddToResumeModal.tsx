'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ExternalHyperlink } from 'docx';
import type { ParsedResume } from '@/types';

interface AddToResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  signalPageUrl: string;
  parsedResume: ParsedResume;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  userLocation?: string;
  userLinkedIn?: string;
}

type LinkLocation = 'header' | 'above_summary' | 'below_summary' | 'footer';

const LOCATION_OPTIONS: { value: LinkLocation; label: string; description: string }[] = [
  { value: 'header', label: 'Header (Contact Info)', description: 'Add alongside your contact details' },
  { value: 'above_summary', label: 'Above Summary', description: 'Prominent placement before your summary' },
  { value: 'below_summary', label: 'Below Summary', description: 'After your professional summary' },
  { value: 'footer', label: 'Footer', description: 'At the bottom of your resume' },
];

export function AddToResumeModal({
  isOpen,
  onClose,
  signalPageUrl,
  parsedResume,
  userName,
  userEmail,
  userPhone,
  userLocation,
  userLinkedIn,
}: AddToResumeModalProps) {
  const [linkLocation, setLinkLocation] = useState<LinkLocation>('header');
  const [linkTitle, setLinkTitle] = useState('Digital Portfolio');
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'docx'>('docx');

  if (!isOpen) return null;

  const generateDocx = async () => {
    const sections: Paragraph[] = [];

    // Header with name
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: userName,
            bold: true,
            size: 32,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      })
    );

    // Contact info line
    const contactParts: (TextRun | ExternalHyperlink)[] = [];
    if (userEmail) {
      contactParts.push(new TextRun({ text: userEmail, size: 20 }));
    }
    if (userPhone) {
      if (contactParts.length > 0) contactParts.push(new TextRun({ text: ' | ', size: 20 }));
      contactParts.push(new TextRun({ text: userPhone, size: 20 }));
    }
    if (userLocation) {
      if (contactParts.length > 0) contactParts.push(new TextRun({ text: ' | ', size: 20 }));
      contactParts.push(new TextRun({ text: userLocation, size: 20 }));
    }
    if (userLinkedIn) {
      if (contactParts.length > 0) contactParts.push(new TextRun({ text: ' | ', size: 20 }));
      contactParts.push(
        new ExternalHyperlink({
          children: [new TextRun({ text: 'LinkedIn', size: 20, color: '0066CC' })],
          link: userLinkedIn,
        })
      );
    }

    // Add Digital Portfolio link to header if selected
    if (linkLocation === 'header') {
      if (contactParts.length > 0) contactParts.push(new TextRun({ text: ' | ', size: 20 }));
      contactParts.push(
        new ExternalHyperlink({
          children: [new TextRun({ text: linkTitle, size: 20, color: '0066CC' })],
          link: signalPageUrl,
        })
      );
    }

    if (contactParts.length > 0) {
      sections.push(
        new Paragraph({
          children: contactParts,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      );
    }

    // Digital Portfolio section (if above summary)
    if (linkLocation === 'above_summary') {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${linkTitle}: `, bold: true, size: 22 }),
            new ExternalHyperlink({
              children: [new TextRun({ text: signalPageUrl, size: 22, color: '0066CC' })],
              link: signalPageUrl,
            }),
          ],
          spacing: { before: 200, after: 200 },
        })
      );
    }

    // Professional Summary
    if (parsedResume.summary) {
      sections.push(
        new Paragraph({
          text: 'PROFESSIONAL SUMMARY',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
        })
      );
      sections.push(
        new Paragraph({
          text: parsedResume.summary,
          spacing: { after: 200 },
        })
      );
    }

    // Digital Portfolio section (if below summary)
    if (linkLocation === 'below_summary') {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${linkTitle}: `, bold: true, size: 22 }),
            new ExternalHyperlink({
              children: [new TextRun({ text: signalPageUrl, size: 22, color: '0066CC' })],
              link: signalPageUrl,
            }),
          ],
          spacing: { before: 100, after: 200 },
        })
      );
    }

    // Experience
    if (parsedResume.experiences && parsedResume.experiences.length > 0) {
      sections.push(
        new Paragraph({
          text: 'PROFESSIONAL EXPERIENCE',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
        })
      );

      for (const exp of parsedResume.experiences) {
        // Job title and company
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: exp.title, bold: true, size: 24 }),
              new TextRun({ text: ` | ${exp.company}`, size: 24 }),
            ],
            spacing: { before: 200, after: 50 },
          })
        );

        // Dates and location
        const dateStr = `${exp.start_date} - ${exp.end_date || 'Present'}`;
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: dateStr, italics: true, size: 20 }),
              exp.location ? new TextRun({ text: ` | ${exp.location}`, italics: true, size: 20 }) : new TextRun({ text: '' }),
            ],
            spacing: { after: 100 },
          })
        );

        // Description
        if (exp.description) {
          sections.push(
            new Paragraph({
              text: exp.description,
              spacing: { after: 50 },
            })
          );
        }

        // Achievements
        for (const achievement of exp.achievements) {
          sections.push(
            new Paragraph({
              text: `• ${achievement}`,
              spacing: { after: 50 },
              indent: { left: 360 },
            })
          );
        }
      }
    }

    // Education
    if (parsedResume.education && parsedResume.education.length > 0) {
      sections.push(
        new Paragraph({
          text: 'EDUCATION',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
        })
      );

      for (const edu of parsedResume.education) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: edu.degree, bold: true, size: 24 }),
              edu.field ? new TextRun({ text: ` in ${edu.field}`, size: 24 }) : new TextRun({ text: '' }),
            ],
            spacing: { before: 100, after: 50 },
          })
        );
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: edu.institution, size: 22 }),
              edu.end_date ? new TextRun({ text: ` | ${edu.end_date}`, italics: true, size: 20 }) : new TextRun({ text: '' }),
            ],
            spacing: { after: 100 },
          })
        );
      }
    }

    // Skills
    if (parsedResume.skills && parsedResume.skills.length > 0) {
      sections.push(
        new Paragraph({
          text: 'SKILLS',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
        })
      );
      sections.push(
        new Paragraph({
          text: parsedResume.skills.join(' • '),
          spacing: { after: 200 },
        })
      );
    }

    // Certifications
    if (parsedResume.certifications && parsedResume.certifications.length > 0) {
      sections.push(
        new Paragraph({
          text: 'CERTIFICATIONS',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
        })
      );
      for (const cert of parsedResume.certifications) {
        sections.push(
          new Paragraph({
            text: `• ${cert}`,
            spacing: { after: 50 },
          })
        );
      }
    }

    // Footer with Digital Portfolio
    if (linkLocation === 'footer') {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${linkTitle}: `, bold: true, size: 20 }),
            new ExternalHyperlink({
              children: [new TextRun({ text: signalPageUrl, size: 20, color: '0066CC' })],
              link: signalPageUrl,
            }),
          ],
          spacing: { before: 400 },
          alignment: AlignmentType.CENTER,
        })
      );
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: sections,
        },
      ],
    });

    return Packer.toBlob(doc);
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      if (exportFormat === 'docx') {
        const blob = await generateDocx();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${userName.replace(/\s+/g, '_')}_Resume.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // For PDF, we'll open a new window with print dialog
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          const portfolioSection = linkLocation === 'header'
            ? `<span style="color: #0066CC;"><a href="${signalPageUrl}" target="_blank">${linkTitle}</a></span>`
            : '';

          const portfolioAboveSummary = linkLocation === 'above_summary'
            ? `<p style="margin: 16px 0;"><strong>${linkTitle}:</strong> <a href="${signalPageUrl}" target="_blank" style="color: #0066CC;">${signalPageUrl}</a></p>`
            : '';

          const portfolioBelowSummary = linkLocation === 'below_summary'
            ? `<p style="margin: 16px 0;"><strong>${linkTitle}:</strong> <a href="${signalPageUrl}" target="_blank" style="color: #0066CC;">${signalPageUrl}</a></p>`
            : '';

          const portfolioFooter = linkLocation === 'footer'
            ? `<p style="text-align: center; margin-top: 32px;"><strong>${linkTitle}:</strong> <a href="${signalPageUrl}" target="_blank" style="color: #0066CC;">${signalPageUrl}</a></p>`
            : '';

          const contactInfo = [
            userEmail,
            userPhone,
            userLocation,
            userLinkedIn ? `<a href="${userLinkedIn}" style="color: #0066CC;">LinkedIn</a>` : null,
            linkLocation === 'header' ? portfolioSection : null,
          ].filter(Boolean).join(' | ');

          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>${userName} - Resume</title>
              <style>
                body { font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.4; }
                h1 { text-align: center; margin-bottom: 8px; font-size: 24px; }
                .contact { text-align: center; margin-bottom: 24px; font-size: 12px; }
                h2 { font-size: 14px; border-bottom: 1px solid #000; padding-bottom: 4px; margin-top: 24px; margin-bottom: 12px; text-transform: uppercase; }
                .job-header { display: flex; justify-content: space-between; margin-top: 16px; }
                .job-title { font-weight: bold; }
                .job-dates { font-style: italic; font-size: 12px; }
                ul { margin: 8px 0; padding-left: 20px; }
                li { margin-bottom: 4px; }
                .skills { margin-top: 8px; }
                a { color: #0066CC; text-decoration: none; }
                @media print { body { padding: 0; } }
              </style>
            </head>
            <body>
              <h1>${userName}</h1>
              <div class="contact">${contactInfo}</div>

              ${portfolioAboveSummary}

              ${parsedResume.summary ? `<h2>Professional Summary</h2><p>${parsedResume.summary}</p>` : ''}

              ${portfolioBelowSummary}

              ${parsedResume.experiences?.length ? `
                <h2>Professional Experience</h2>
                ${parsedResume.experiences.map(exp => `
                  <div class="job-header">
                    <span class="job-title">${exp.title} | ${exp.company}</span>
                  </div>
                  <div class="job-dates">${exp.start_date} - ${exp.end_date || 'Present'}${exp.location ? ` | ${exp.location}` : ''}</div>
                  ${exp.description ? `<p>${exp.description}</p>` : ''}
                  ${exp.achievements?.length ? `<ul>${exp.achievements.map(a => `<li>${a}</li>`).join('')}</ul>` : ''}
                `).join('')}
              ` : ''}

              ${parsedResume.education?.length ? `
                <h2>Education</h2>
                ${parsedResume.education.map(edu => `
                  <div><strong>${edu.degree}${edu.field ? ` in ${edu.field}` : ''}</strong></div>
                  <div>${edu.institution}${edu.end_date ? ` | ${edu.end_date}` : ''}</div>
                `).join('<br/>')}
              ` : ''}

              ${parsedResume.skills?.length ? `
                <h2>Skills</h2>
                <div class="skills">${parsedResume.skills.join(' • ')}</div>
              ` : ''}

              ${parsedResume.certifications?.length ? `
                <h2>Certifications</h2>
                <ul>${parsedResume.certifications.map(c => `<li>${c}</li>`).join('')}</ul>
              ` : ''}

              ${portfolioFooter}
            </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        }
      }
      onClose();
    } catch (error) {
      console.error('Error generating document:', error);
      alert('Failed to generate document. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="border-b px-6 py-4">
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
            Generate a resume with your SignalPage link included
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
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

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link Placement
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
                  <div>
                    <p className="font-medium text-gray-900">{option.label}</p>
                    <p className="text-sm text-gray-500">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Export Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <div className="flex gap-3">
              <label
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                  exportFormat === 'docx'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value="docx"
                  checked={exportFormat === 'docx'}
                  onChange={() => setExportFormat('docx')}
                />
                <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 18v-6H7v6h1.5zm2 0v-4.5l1 3 1-3V18H14v-6h-1.5l-1 3-1-3H9v6h1.5z" />
                </svg>
                <span className="font-medium">DOCX</span>
              </label>
              <label
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                  exportFormat === 'pdf'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={exportFormat === 'pdf'}
                  onChange={() => setExportFormat('pdf')}
                />
                <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM7 17v-4h1.5c.83 0 1.5.67 1.5 1.5S9.33 16 8.5 16H8v1H7zm1.5-2c.28 0 .5-.22.5-.5s-.22-.5-.5-.5H8v1h.5zm3.5 2v-4h1.5c1.1 0 2 .9 2 2s-.9 2-2 2H12zm1.5-3c.55 0 1 .45 1 1s-.45 1-1 1H13v-2h.5zm3.5 3v-4h2v1h-1v1h1v1h-1v1h-1z" />
                </svg>
                <span className="font-medium">PDF</span>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Preview</p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">{linkTitle}:</span>{' '}
              <span className="text-blue-600">{signalPageUrl}</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleDownload}
            isLoading={isGenerating}
          >
            {isGenerating ? 'Generating...' : `Download ${exportFormat.toUpperCase()}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
