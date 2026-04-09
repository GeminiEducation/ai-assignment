import jsPDF from 'jspdf';
import type { AnalysisResult } from '@/components/ResultsView';

export function generateReport(
  result: AnalysisResult,
  fileName: string,
  userName?: string,
) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

  // Title
  doc.setFontSize(22);
  doc.setTextColor(0, 180, 216);
  doc.text('AI Assignment Check Report', w / 2, y, { align: 'center' });
  y += 14;

  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated: ${new Date().toLocaleString()}`, w / 2, y, { align: 'center' });
  y += 6;
  if (userName) {
    doc.text(`User: ${userName}`, w / 2, y, { align: 'center' });
    y += 6;
  }
  doc.text(`File: ${fileName}`, w / 2, y, { align: 'center' });
  y += 14;

  // Scores
  doc.setDrawColor(200);
  doc.line(14, y, w - 14, y);
  y += 10;

  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Detection Scores', 14, y);
  y += 8;

  doc.setFontSize(11);
  doc.text(`AI Generated: ${result.aiPercentage}%`, 14, y);
  y += 7;
  doc.text(`Human Written: ${result.humanPercentage}%`, 14, y);
  y += 7;
  doc.text(`Confidence: ${result.confidence}%`, 14, y);
  y += 12;

  // Summary
  doc.setFontSize(14);
  doc.text('Summary', 14, y);
  y += 8;
  doc.setFontSize(10);
  const summaryLines = doc.splitTextToSize(result.summary, w - 28);
  doc.text(summaryLines, 14, y);
  y += summaryLines.length * 5 + 8;

  // Flagged
  if (result.flaggedSections.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Flagged Sections', 14, y);
    y += 8;
    doc.setFontSize(10);
    result.flaggedSections.forEach((s) => {
      if (y > 270) { doc.addPage(); y = 20; }
      const lines = doc.splitTextToSize(`• ${s}`, w - 28);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 3;
    });
    y += 5;
  }

  // Recommendations
  if (result.recommendations.length > 0) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.text('Recommendations', 14, y);
    y += 8;
    doc.setFontSize(10);
    result.recommendations.forEach((r) => {
      if (y > 270) { doc.addPage(); y = 20; }
      const lines = doc.splitTextToSize(`✓ ${r}`, w - 28);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 3;
    });
  }

  doc.save(`AI_Check_Report_${fileName.replace(/\.[^.]+$/, '')}.pdf`);
}
