import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileType = file.type;
    let text = '';

    if (fileType === 'text/plain') {
      text = await file.text();
    } else if (fileType === 'application/pdf') {
      // Use require for CommonJS compatibility with pdf-parse
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfData = await pdfParse(buffer);
      text = pdfData.text;
    } else if (
      fileType === 'application/msword' ||
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      // For DOC/DOCX files, we'd need mammoth or similar library
      // For now, return an error suggesting PDF or TXT
      return NextResponse.json(
        { error: 'DOC/DOCX files are not yet supported. Please convert to PDF or copy/paste the text.' },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PDF or TXT file.' },
        { status: 400 }
      );
    }

    // Clean up the extracted text
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return NextResponse.json({ text });
  } catch (error) {
    console.error('File parsing error:', error);
    return NextResponse.json(
      { error: 'Failed to parse file. Please try copying and pasting the text instead.' },
      { status: 500 }
    );
  }
}

// Ensure this route uses Node.js runtime for pdf-parse compatibility
export const runtime = 'nodejs';
