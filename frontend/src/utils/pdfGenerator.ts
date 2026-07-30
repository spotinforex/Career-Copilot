import jsPDF from 'jspdf';
import { UploadResponse } from '../types';

/**
 * Cleanly renders text / markdown / resume content into a PDF document and downloads it.
 */
export function downloadPdfFromText(
  text: string,
  filename: string = 'Tailored_Resume.pdf',
  title: string = 'Tailored Resume'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxLineWidth = pageWidth - margin * 2;

  let cursorY = 20;

  // Header banner / title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(title, margin, cursorY);
  cursorY += 8;

  // Horizontal line
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.5);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 10;

  // Clean markdown lines processing
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85); // slate-700

  const lines = text.split('\n');

  lines.forEach((rawLine) => {
    let line = rawLine.trimEnd();

    // Check page overrun
    if (cursorY > pageHeight - margin) {
      doc.addPage();
      cursorY = 20;
    }

    if (line.startsWith('# ')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      const cleanHeading = line.replace(/^#\s+/, '');
      const wrapped = doc.splitTextToSize(cleanHeading, maxLineWidth);
      doc.text(wrapped, margin, cursorY);
      cursorY += wrapped.length * 7 + 2;
    } else if (line.startsWith('## ')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(79, 70, 229); // indigo-600
      const cleanHeading = line.replace(/^##\s+/, '');
      const wrapped = doc.splitTextToSize(cleanHeading, maxLineWidth);
      doc.text(wrapped, margin, cursorY + 2);
      cursorY += wrapped.length * 6 + 3;
    } else if (line.startsWith('### ')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(51, 65, 85);
      const cleanHeading = line.replace(/^###\s+/, '');
      const wrapped = doc.splitTextToSize(cleanHeading, maxLineWidth);
      doc.text(wrapped, margin, cursorY);
      cursorY += wrapped.length * 5 + 2;
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const bulletText = line.replace(/^[-*]\s+/, '');
      const wrapped = doc.splitTextToSize(`• ${bulletText.replace(/\*\*/g, '')}`, maxLineWidth - 5);
      doc.text(wrapped, margin + 4, cursorY);
      cursorY += wrapped.length * 4.8 + 1;
    } else if (line === '') {
      cursorY += 3;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const cleanText = line.replace(/\*\*/g, '');
      const wrapped = doc.splitTextToSize(cleanText, maxLineWidth);
      doc.text(wrapped, margin, cursorY);
      cursorY += wrapped.length * 4.8 + 1.5;
    }
  });

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

/**
 * Export parsed UploadResponse data directly into a PDF.
 */
export function downloadPdfFromResumeData(
  resumeData: UploadResponse,
  roleTag: string = 'Software Engineer'
) {
  const content = resumeData.content;
  if (!content) return;

  const bioList = content['Bio Info'] || [];
  let name = 'Candidate Profile';
  let email = '';
  let phone = '';

  bioList.forEach((item) => {
    if (item.toLowerCase().startsWith('name:')) name = item.split(': ')[1] || name;
    if (item.toLowerCase().startsWith('email:')) email = item.split(': ')[1] || '';
    if (item.toLowerCase().startsWith('phone:')) phone = item.split(': ')[1] || '';
  });

  let mdText = `# ${name}\n`;
  mdText += `**Target Role:** ${roleTag}\n`;
  if (email || phone) mdText += `**Contact:** ${[email, phone].filter(Boolean).join(' | ')}\n\n`;

  if (content.skills && content.skills.length > 0) {
    mdText += `## Key Skills & Technologies\n`;
    mdText += content.skills.map((s) => `- ${s}`).join('\n') + '\n\n';
  }

  if (content.experience && content.experience.length > 0) {
    mdText += `## Work Experience\n`;
    content.experience.forEach((exp) => {
      if (exp.title) mdText += `### ${exp.title}\n`;
      if (exp.description) mdText += `${exp.description}\n`;
      mdText += `\n`;
    });
  }

  if (content.education && content.education.length > 0) {
    mdText += `## Education & Certifications\n`;
    content.education.forEach((edu) => {
      mdText += `- **${edu.degree || 'Degree'}** ${edu.institution ? `at ${edu.institution}` : ''} ${edu.years ? `(${edu.years})` : ''}\n`;
      if (edu.relevant_coursework && edu.relevant_coursework.length > 0) {
        mdText += `  Coursework: ${edu.relevant_coursework.join(', ')}\n`;
      }
    });
  }

  const safeName = name.replace(/[^a-zA-Z0-9]/g, '_');
  downloadPdfFromText(mdText, `${safeName}_Resume.pdf`, `${name} - ${roleTag} Resume`);
}
