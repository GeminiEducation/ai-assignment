import jsPDF from 'jspdf';
import type { AnalysisResult } from '@/components/ResultsView';

// ── Colour palette ─────────────────────────────────────────────────────────────
const MAROON  = [100, 20,  40]  as const;
const GOLD    = [180, 140, 60]  as const;
const CREAM   = [253, 250, 242] as const;
const DARK    = [30,  30,  30]  as const;
const MUTED   = [110, 110, 110] as const;
const WHITE   = [255, 255, 255] as const;
const GREEN   = [16,  130, 90]  as const;
const RED     = [190, 50,  50]  as const;
const BLUE    = [60,  80,  160] as const;
const AMBER   = [190, 120, 20]  as const;

export function generateReport(
  result: AnalysisResult,
  fileName: string,
  userName?: string,
) {
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W     = doc.internal.pageSize.getWidth();   // 210
  const H     = doc.internal.pageSize.getHeight();  // 297
  const MX    = 18; // horizontal margin

  // ── 1. Cream background ───────────────────────────────────────────────────
  doc.setFillColor(...CREAM);
  doc.rect(0, 0, W, H, 'F');

  // ── 2. Outer decorative border ────────────────────────────────────────────
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.2);
  doc.rect(8, 8, W - 16, H - 16);          // outer gold line
  doc.setLineWidth(0.4);
  doc.rect(11, 11, W - 22, H - 22);        // inner thin line

  // ── 3. Corner ornaments ───────────────────────────────────────────────────
  const corner = (cx: number, cy: number) => {
    doc.setFillColor(...GOLD);
    doc.circle(cx, cy, 2.5, 'F');
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.6);
    // small L-shaped ticks
    const d = 5;
    doc.line(cx - d, cy, cx - d + 2, cy);
    doc.line(cx, cy - d, cx, cy - d + 2);
    doc.line(cx + d - 2, cy, cx + d, cy);
    doc.line(cx, cy + d - 2, cx, cy + d);
  };
  corner(15, 15);
  corner(W - 15, 15);
  corner(15, H - 15);
  corner(W - 15, H - 15);

  // ── 4. Header band ────────────────────────────────────────────────────────
  doc.setFillColor(...MAROON);
  doc.rect(0, 0, W, 48, 'F');

  // thin gold stripe below header
  doc.setFillColor(...GOLD);
  doc.rect(0, 48, W, 1.5, 'F');

  // Institution name
  doc.setFontSize(22);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text('STELLA COLLEGE', W / 2, 22, { align: 'center' });

  // Sub-title
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(230, 200, 170);
  doc.text('Academic Integrity & Assessment Division', W / 2, 30, { align: 'center' });

  // Gold rule under sub-title
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(MX + 30, 34, W - MX - 30, 34);

  // Document type label
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL AI CONTENT ANALYSIS CERTIFICATE', W / 2, 43, { align: 'center' });

  // ── 5. Reference block (top-right, below header) ─────────────────────────
  let y = 58;
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  const refNo = `REF: SC-${Date.now().toString(36).toUpperCase().slice(-8)}`;
  const dateStr = new Date().toLocaleDateString('en-AU', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  doc.text(`${refNo}   |   Date Issued: ${dateStr}`, W - MX, y, { align: 'right' });

  // ── 6. "This is to certify" block ─────────────────────────────────────────
  y = 72;
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'italic');
  doc.text('This is to certify that the following submission has been analysed', W / 2, y, { align: 'center' });
  y += 6;
  doc.text('for AI-generated content and academic integrity.', W / 2, y, { align: 'center' });

  // ── 7. Student / file name ────────────────────────────────────────────────
  y += 12;
  if (userName) {
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text('SUBMITTED BY', W / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(17);
    doc.setTextColor(...MAROON);
    doc.setFont('helvetica', 'bold');
    doc.text(userName, W / 2, y, { align: 'center' });
    y += 5;
    // underline
    const nameW = doc.getTextWidth(userName);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.6);
    doc.line(W / 2 - nameW / 2, y, W / 2 + nameW / 2, y);
    y += 8;
  }

  // File label
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.text('DOCUMENT', W / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  const trimmedName = fileName.length > 70 ? fileName.slice(0, 67) + '…' : fileName;
  doc.text(trimmedName, W / 2, y, { align: 'center' });
  y += 10;

  // ── 8. Gold divider with diamond ─────────────────────────────────────────
  const diamondDivider = (dy: number) => {
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.5);
    doc.line(MX, dy, W / 2 - 5, dy);
    doc.line(W / 2 + 5, dy, W - MX, dy);
    // diamond
    doc.setFillColor(...GOLD);
    doc.circle(W / 2, dy, 1.5, 'F');
  };
  diamondDivider(y);
  y += 10;

  // ── 9. Score cards ────────────────────────────────────────────────────────
  const scores = [
    { label: 'AI Generated',   value: result.aiPercentage,       color: RED   },
    { label: 'Human Written',  value: result.humanPercentage,    color: GREEN },
    { label: 'Internet Match', value: result.internetPercentage, color: AMBER },
    { label: 'Confidence',     value: result.confidence,         color: BLUE  },
  ] as const;

  const cardW   = (W - MX * 2 - 9) / 4;
  const cardH   = 26;
  const cardGap = 3;

  scores.forEach((s, i) => {
    const cx = MX + i * (cardW + cardGap);

    // card shadow (offset rect)
    doc.setFillColor(200, 195, 185);
    doc.roundedRect(cx + 1, y + 1, cardW, cardH, 2, 2, 'F');

    // card body
    doc.setFillColor(s.color[0], s.color[1], s.color[2]);
    doc.roundedRect(cx, y, cardW, cardH, 2, 2, 'F');

    // thin gold top edge
    doc.setFillColor(...GOLD);
    doc.roundedRect(cx, y, cardW, 2, 1, 1, 'F');

    // percentage
    doc.setFontSize(18);
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text(`${s.value}%`, cx + cardW / 2, y + 14, { align: 'center' });

    // label
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(s.label.toUpperCase(), cx + cardW / 2, y + 21, { align: 'center' });
  });
  y += cardH + 12;

  // ── 10. Verdict badge ─────────────────────────────────────────────────────
  const verdict     = result.aiPercentage >= 60 ? 'HIGH AI USAGE DETECTED'
                    : result.aiPercentage >= 30 ? 'MODERATE AI USAGE DETECTED'
                    : 'LIKELY HUMAN AUTHORED';
  const verdictColor: readonly [number, number, number] = result.aiPercentage >= 60 ? RED
                     : result.aiPercentage >= 30 ? AMBER
                     : GREEN;

  const vBadgeW = 110;
  const vBadgeX = (W - vBadgeW) / 2;
  doc.setFillColor(...verdictColor);
  doc.roundedRect(vBadgeX, y, vBadgeW, 10, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text(`VERDICT: ${verdict}`, W / 2, y + 6.8, { align: 'center' });
  y += 16;

  // ── 11. Summary ───────────────────────────────────────────────────────────
  // section heading
  const sectionHead = (title: string, dy: number): number => {
    doc.setFontSize(9);
    doc.setTextColor(...MAROON);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), MX, dy);
    const tw = doc.getTextWidth(title.toUpperCase());
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.4);
    doc.line(MX + tw + 2, dy - 1, W - MX, dy - 1);
    return dy + 6;
  };

  y = sectionHead('Summary', y);
  doc.setFontSize(9.5);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'normal');
  const summaryLines = doc.splitTextToSize(result.summary, W - MX * 2);
  doc.text(summaryLines, MX, y);
  y += summaryLines.length * 5 + 8;

  // ── 12. Flagged sections ──────────────────────────────────────────────────
  if (result.flaggedSections.length > 0) {
    if (y > 240) { doc.addPage(); applyPageBackground(doc, W, H, MX, CREAM, GOLD); y = 24; }
    y = sectionHead('Flagged Sections', y);
    result.flaggedSections.forEach((s, i) => {
      if (y > 270) { doc.addPage(); applyPageBackground(doc, W, H, MX, CREAM, GOLD); y = 24; }
      // light red tinted row
      doc.setFillColor(255, 240, 240);
      const lines = doc.splitTextToSize(`${i + 1}.  ${s}`, W - MX * 2 - 6);
      doc.rect(MX, y - 4, W - MX * 2, lines.length * 5 + 3, 'F');
      doc.setFontSize(9);
      doc.setTextColor(...DARK);
      doc.setFont('helvetica', 'normal');
      doc.text(lines, MX + 3, y);
      y += lines.length * 5 + 5;
    });
    y += 3;
  }

  // ── 13. Recommendations ───────────────────────────────────────────────────
  if (result.recommendations.length > 0) {
    if (y > 240) { doc.addPage(); applyPageBackground(doc, W, H, MX, CREAM, GOLD); y = 24; }
    y = sectionHead('Recommendations', y);
    result.recommendations.forEach((r, i) => {
      if (y > 270) { doc.addPage(); applyPageBackground(doc, W, H, MX, CREAM, GOLD); y = 24; }
      doc.setFillColor(240, 248, 242);
      const lines = doc.splitTextToSize(`${i + 1}.  ${r}`, W - MX * 2 - 6);
      doc.rect(MX, y - 4, W - MX * 2, lines.length * 5 + 3, 'F');
      doc.setFontSize(9);
      doc.setTextColor(...DARK);
      doc.setFont('helvetica', 'normal');
      doc.text(lines, MX + 3, y);
      y += lines.length * 5 + 5;
    });
    y += 3;
  }

  // ── 14. Q&A section ───────────────────────────────────────────────────────
  if (result.isQnA && result.questionsAnalysis?.length > 0) {
    if (y > 220) { doc.addPage(); applyPageBackground(doc, W, H, MX, CREAM, GOLD); y = 24; }
    y = sectionHead('Question & Answer Evaluation', y);

    result.questionsAnalysis.forEach((q: any, i: number) => {
      if (y > 250) { doc.addPage(); applyPageBackground(doc, W, H, MX, CREAM, GOLD); y = 24; }

      // Q header row
      const isCorrect = q.verdict === 'Correct';
      const statusColor = (isCorrect ? GREEN : RED) as [number, number, number];
      doc.setFillColor(...statusColor);
      doc.rect(MX, y - 3, W - MX * 2, 7, 'F');
      doc.setFontSize(8.5);
      doc.setTextColor(...WHITE);
      doc.setFont('helvetica', 'bold');
      const qHead = doc.splitTextToSize(`Q${i + 1}. ${q.question}`, W - MX * 2 - 20);
      doc.text(qHead, MX + 2, y + 1);
      doc.text(`[${q.verdict}]`, W - MX - 2, y + 1, { align: 'right' });
      y += qHead.length * 4.5 + 5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK);
      doc.setFontSize(8.5);

      if (q.studentAnswer) {
        const sLines = doc.splitTextToSize(`Student: ${q.studentAnswer}`, W - MX * 2 - 5);
        doc.text(sLines, MX + 4, y);
        y += sLines.length * 4.5 + 2;
      }
      if (q.explanation) {
        doc.setTextColor(...MUTED);
        const eLines = doc.splitTextToSize(`Note: ${q.explanation}`, W - MX * 2 - 5);
        doc.text(eLines, MX + 4, y);
        y += eLines.length * 4.5 + 2;
      }
      if (!isCorrect && q.correctAnswer) {
        doc.setTextColor(...GREEN);
        const cLines = doc.splitTextToSize(`Correct Answer: ${q.correctAnswer}`, W - MX * 2 - 5);
        doc.text(cLines, MX + 4, y);
        y += cLines.length * 4.5 + 2;
      }
      y += 5;
    });
  }

  // ── 15. Signature / seal block ────────────────────────────────────────────
  // Ensure it fits; if not, new page
  if (y > 240) { doc.addPage(); applyPageBackground(doc, W, H, MX, CREAM, GOLD); y = 30; }

  y += 6;
  diamondDivider(y);
  y += 12;

  // Two columns: signature left, seal right
  const sigX = MX;
  const sealX = W - MX - 44;

  // Signature lines
  doc.setDrawColor(...MAROON);
  doc.setLineWidth(0.5);
  doc.line(sigX, y + 14, sigX + 60, y + 14);
  doc.setFontSize(8);
  doc.setTextColor(...MAROON);
  doc.setFont('helvetica', 'bold');
  doc.text('Academic Integrity Officer', sigX, y + 19);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.setFontSize(7.5);
  doc.text('Stella College — AI Assessment Division', sigX, y + 24);

  // Seal circle
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.circle(sealX + 22, y + 13, 16);
  doc.setLineWidth(0.4);
  doc.circle(sealX + 22, y + 13, 14);
  doc.setFillColor(...MAROON);
  doc.circle(sealX + 22, y + 13, 11, 'F');
  doc.setFontSize(5.5);
  doc.setTextColor(...GOLD);
  doc.setFont('helvetica', 'bold');
  doc.text('STELLA', sealX + 22, y + 11, { align: 'center' });
  doc.text('COLLEGE', sealX + 22, y + 15, { align: 'center' });
  doc.setFontSize(5);
  doc.text('OFFICIAL', sealX + 22, y + 19, { align: 'center' });

  // ── 16. Footer on every page ──────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);

    // footer band
    doc.setFillColor(...MAROON);
    doc.rect(0, H - 14, W, 14, 'F');
    doc.setFillColor(...GOLD);
    doc.rect(0, H - 15, W, 1, 'F');

    doc.setFontSize(7);
    doc.setTextColor(210, 190, 160);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'This certificate is system-generated by Stella College AI Checker. For queries contact: integrity@stellacollege.edu.au',
      W / 2, H - 8, { align: 'center' }
    );
    doc.text(`Page ${p} of ${pageCount}`, W - MX, H - 8, { align: 'right' });
  }

  doc.save(`AI_Certificate_${fileName.replace(/\.[^.]+$/, '')}.pdf`);
}

// ── Helper: re-apply decorative background on extra pages ─────────────────────
function applyPageBackground(
  doc: jsPDF,
  W: number,
  H: number,
  MX: number,
  cream: readonly [number, number, number],
  gold: readonly [number, number, number],
) {
  doc.setFillColor(...cream);
  doc.rect(0, 0, W, H, 'F');
  doc.setDrawColor(...gold);
  doc.setLineWidth(1.2);
  doc.rect(8, 8, W - 16, H - 16);
  doc.setLineWidth(0.4);
  doc.rect(11, 11, W - 22, H - 22);
}