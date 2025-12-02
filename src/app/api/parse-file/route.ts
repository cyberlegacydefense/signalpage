import { NextRequest, NextResponse } from 'next/server';
import { extractText } from 'unpdf';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileType = file.type;
    console.log('Processing file:', file.name, 'Type:', fileType, 'Size:', file.size);

    let text = '';

    if (fileType === 'text/plain') {
      text = await file.text();
    } else if (fileType === 'application/pdf') {
      try {
        const buffer = await file.arrayBuffer();
        console.log('PDF buffer size:', buffer.byteLength);
        const result = await extractText(buffer);
        // unpdf returns text as array of strings (one per page)
        text = Array.isArray(result.text) ? result.text.join('\n\n') : String(result.text);
        console.log('PDF parsed successfully, text length:', text.length);
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        return NextResponse.json(
          { error: 'Failed to parse PDF. The file may be corrupted, password-protected, or image-based. Please try copying and pasting the text.' },
          { status: 400 }
        );
      }
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
