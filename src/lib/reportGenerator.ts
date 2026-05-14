import jsPDF from "jspdf";
import type { AnalysisResult, FileEntry } from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// PALETTE
// ─────────────────────────────────────────────────────────────
type RGB = readonly [number, number, number];
const MAROON: RGB = [0, 82, 155];
const GOLD: RGB = [185, 145, 75];
const CREAM: RGB = [252, 248, 240];
const DARK: RGB = [35, 35, 35];
const MUTED: RGB = [110, 110, 110];
const WHITE: RGB = [255, 255, 255];
const GREEN: RGB = [25, 135, 84];
const RED: RGB = [200, 60, 60];
const BLUE: RGB = [60, 90, 170];
const AMBER: RGB = [210, 140, 30];
const LIGHT_BG: RGB = [245, 242, 235];

// ─────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────

/**
 * Generate a single PDF that shows full analysis details for EVERY file.
 *
 * Layout:
 *   Page 1    – Cover / title page
 *   Page 2    – Aggregate summary (all files side-by-side)
 *   Page 3..N – One full-detail section per file
 */
export function generateMultiReport(
  entries: FileEntry[],
  userName?: string
) {
  const finished = entries.filter((e) => e.result);
  if (finished.length === 0) return;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const MX = 18;

  const refNo = `SC-${Date.now().toString(36).toUpperCase().slice(-8)}`;
  const dateStr = new Date().toLocaleDateString("en-AU", {
    day: "2-digit", month: "long", year: "numeric",
  });

  // ── PAGE 1: Cover ────────────────────────────────────────────
  drawPageBackground(doc, W, H);
  drawCoverPage(doc, W, H, MX, finished, userName, refNo, dateStr);

  // ── PAGE 2: Aggregate summary ─────────────────────────────────
  doc.addPage();
  drawPageBackground(doc, W, H);
  drawAggregatePage(doc, W, H, MX, finished, dateStr);

  // ── PAGE 3..N: One page (or more) per file ────────────────────
  for (let i = 0; i < finished.length; i++) {
    doc.addPage();
    drawPageBackground(doc, W, H);
    drawFilePage(doc, W, H, MX, finished[i], i + 1, finished.length, refNo);
  }

  // ── Save ──────────────────────────────────────────────────────
  const label = finished.length === 1
    ? finished[0].file.name.replace(/\.[^.]+$/, "")
    : `${finished.length}_files_batch`;
  doc.save(`AI_Report_${label}.pdf`);
}

// ─────────────────────────────────────────────────────────────
// COVER PAGE
// ─────────────────────────────────────────────────────────────
function drawCoverPage(
  doc: jsPDF,
  W: number, H: number, MX: number,
  entries: FileEntry[],
  userName: string | undefined,
  refNo: string,
  dateStr: string
) {
  // Header band
  doc.setFillColor(...MAROON);
  doc.rect(0, 0, W, 56, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 56, W, 1.8, "F");

  doc.setFont("times", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...WHITE);
  doc.text("STELLA COLLEGE", W / 2, 24, { align: "center" });

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(MX + 20, 34, W - MX - 20, 34);

  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...GOLD);
  doc.text("CERTIFICATE OF AI CONTENT ANALYSIS", W / 2, 48, { align: "center" });

  // Ref / date
  let y = 70;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Reference No: ${refNo}`, MX, y);
  doc.text(`Issued: ${dateStr}`, W - MX, y, { align: "right" });

  // Intro text
  y += 16;
  doc.setFont("times", "italic");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  const introLines = [
    "This certificate confirms that the following academic",
    "submissions have been analysed for AI-generated content",
    "and originality verification.",
  ];
  introLines.forEach((line) => {
    doc.text(line, W / 2, y, { align: "center" });
    y += 7;
  });

  // Submitter
  if (userName) {
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("SUBMITTED BY", W / 2, y, { align: "center" });
    y += 9;
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...MAROON);
    doc.text(userName, W / 2, y, { align: "center" });
    y += 4;
    const nw = doc.getTextWidth(userName);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.7);
    doc.line(W / 2 - nw / 2, y, W / 2 + nw / 2, y);
    y += 12;
  }

  // File list box
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`DOCUMENTS ANALYSED (${entries.length})`, W / 2, y, { align: "center" });
  y += 8;

  const boxX = MX + 6;
  const boxW = W - (MX + 6) * 2;

  entries.forEach((entry, idx) => {
    const lines = doc.splitTextToSize(`${idx + 1}. ${entry.file.name}`, boxW - 14);
    const bh = lines.length * 5.5 + 10;

    // Shadow
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(boxX + 1, y + 1, boxW, bh, 2, 2, "F");
    // Box
    doc.setFillColor(...WHITE);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.5);
    doc.roundedRect(boxX, y, boxW, bh, 2, 2, "FD");
    // Left accent bar
    const verdict = entry.result!.aiPercentage;
    const barColor = verdict >= 60 ? RED : verdict >= 30 ? AMBER : GREEN;
    doc.setFillColor(...barColor);
    doc.roundedRect(boxX, y, 3.5, bh, 1.5, 1.5, "F");

    // Filename
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(lines, boxX + 8, y + 6, { maxWidth: boxW - 14 });

    // Quick stats on the right
    const stats = [
      { label: "AI", val: entry.result!.aiPercentage, color: RED },
      { label: "Human", val: entry.result!.humanPercentage, color: GREEN },
      { label: "Web", val: entry.result!.internetPercentage, color: AMBER },
    ];
    let sx = W - MX - 6;
    stats.reverse().forEach(({ label, val, color }) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...color);
      doc.text(`${val}%`, sx, y + 6, { align: "right" });
      doc.setFontSize(6.5);
      doc.setTextColor(...MUTED);
      doc.text(label, sx, y + 11, { align: "right" });
      sx -= 22;
    });

    y += bh + 4;

    // page overflow guard
    if (y > H - 40 && idx < entries.length - 1) {
      // just stop listing – aggregate page will show everything
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(`…and ${entries.length - idx - 1} more files. See following pages.`, W / 2, y + 4, { align: "center" });
      return;
    }
  });

  drawFooter(doc, W, H, MX);
}

// ─────────────────────────────────────────────────────────────
// AGGREGATE SUMMARY PAGE
// ─────────────────────────────────────────────────────────────
function drawAggregatePage(
  doc: jsPDF,
  W: number, H: number, MX: number,
  entries: FileEntry[],
  dateStr: string
) {
  // Header band
  doc.setFillColor(...MAROON);
  doc.rect(0, 0, W, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...WHITE);
  doc.text("BATCH ANALYSIS SUMMARY", W / 2, 14, { align: "center" });
  doc.setFillColor(...GOLD);
  doc.rect(0, 22, W, 1, "F");

  let y = 32;

  // Aggregate metric cards
  const avg = (key: keyof AnalysisResult) =>
    Math.round(entries.reduce((s, e) => s + ((e.result![key] as number) ?? 0), 0) / entries.length);

  const aggMetrics = [
    { label: "Avg AI Generated", value: avg("aiPercentage"), color: RED },
    { label: "Avg Human Written", value: avg("humanPercentage"), color: GREEN },
    { label: "Avg Internet Match", value: avg("internetPercentage"), color: AMBER },
    { label: "Avg Confidence", value: avg("confidence"), color: BLUE },
  ];

  const gap = 4;
  const cardW = (W - MX * 2 - gap * 3) / 4;
  const cardH = 36;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`OVERALL AVERAGES ACROSS ${entries.length} FILES`, MX, y);
  y += 8;

  aggMetrics.forEach(({ label, value, color }, i) => {
    const x = MX + i * (cardW + gap);
    doc.setFillColor(215, 215, 215);
    doc.roundedRect(x + 1, y + 1, cardW, cardH, 3, 3, "F");
    doc.setFillColor(...color);
    doc.roundedRect(x, y, cardW, cardH, 3, 3, "F");
    doc.setFillColor(...GOLD);
    doc.roundedRect(x, y, cardW, 2.5, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...WHITE);
    doc.text(`${value}%`, x + cardW / 2, y + 18, { align: "center" });
    doc.setFontSize(7);
    doc.text(label.toUpperCase(), x + cardW / 2, y + 27, { align: "center" });
  });

  y += cardH + 16;
  drawDivider(doc, W, y, MX);
  y += 14;

  // Per-file comparison table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("PER-FILE BREAKDOWN", MX, y);
  y += 8;

  // Table header
  const cols = { file: MX, ai: 104, human: 126, web: 148, conf: 170, verdict: 192 };
  const rowH = 8;

  doc.setFillColor(...MAROON);
  doc.rect(MX, y, W - MX * 2, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text("FILE NAME", cols.file + 2, y + 5.5);
  doc.text("AI%", cols.ai, y + 5.5, { align: "center" });
  doc.text("HUMAN%", cols.human, y + 5.5, { align: "center" });
  doc.text("WEB%", cols.web, y + 5.5, { align: "center" });
  doc.text("CONF%", cols.conf, y + 5.5, { align: "center" });
  doc.text("VERDICT", cols.verdict, y + 5.5, { align: "center" });
  y += rowH;

  entries.forEach((entry, idx) => {
    const r = entry.result!;
    const bg: readonly [number, number, number] = idx % 2 === 0 ? WHITE : LIGHT_BG;

    doc.setFillColor(...bg);
    doc.rect(MX, y, W - MX * 2, rowH, "F");

    // Thin left accent
    const barCol = r.aiPercentage >= 60 ? RED : r.aiPercentage >= 30 ? AMBER : GREEN;
    doc.setFillColor(...barCol);
    doc.rect(MX, y, 2, rowH, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK);

    const shortName = entry.file.name.length > 30
      ? entry.file.name.slice(0, 28) + "…"
      : entry.file.name;
    doc.text(shortName, cols.file + 4, y + 5.5);

    doc.setTextColor(...RED);
    doc.text(`${r.aiPercentage}%`, cols.ai, y + 5.5, { align: "center" });
    doc.setTextColor(...GREEN);
    doc.text(`${r.humanPercentage}%`, cols.human, y + 5.5, { align: "center" });
    doc.setTextColor(...AMBER);
    doc.text(`${r.internetPercentage}%`, cols.web, y + 5.5, { align: "center" });
    doc.setTextColor(...BLUE);
    doc.text(`${r.confidence}%`, cols.conf, y + 5.5, { align: "center" });

    const verdict = r.aiPercentage >= 60 ? "HIGH AI"
      : r.aiPercentage >= 30 ? "MODERATE"
        : "HUMAN";
    doc.setTextColor(...barCol);
    doc.setFont("helvetica", "bold");
    doc.text(verdict, cols.verdict, y + 5.5, { align: "center" });

    y += rowH;

    // Page overflow guard
    if (y > H - 30 && idx < entries.length - 1) {
      doc.addPage();
      drawPageBackground(doc, W, H);
      // repeat mini-header
      doc.setFillColor(...MAROON);
      doc.rect(0, 0, W, 16, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...WHITE);
      doc.text("BATCH SUMMARY (continued)", W / 2, 11, { align: "center" });
      doc.setFillColor(...GOLD);
      doc.rect(0, 16, W, 0.8, "F");
      y = 26;
      // repeat column headers
      doc.setFillColor(...MAROON);
      doc.rect(MX, y, W - MX * 2, rowH, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...WHITE);
      doc.text("FILE NAME", cols.file + 2, y + 5.5);
      doc.text("AI%", cols.ai, y + 5.5, { align: "center" });
      doc.text("HUMAN%", cols.human, y + 5.5, { align: "center" });
      doc.text("WEB%", cols.web, y + 5.5, { align: "center" });
      doc.text("CONF%", cols.conf, y + 5.5, { align: "center" });
      doc.text("VERDICT", cols.verdict, y + 5.5, { align: "center" });
      y += rowH;
    }
  });

  // Bottom table border
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(MX, y, W - MX, y);

  drawFooter(doc, W, H, MX);
}

// ─────────────────────────────────────────────────────────────
// PER-FILE DETAIL PAGE
// ─────────────────────────────────────────────────────────────
function drawFilePage(
  doc: jsPDF,
  W: number, H: number, MX: number,
  entry: FileEntry,
  fileIndex: number,
  totalFiles: number,
  refNo: string
) {
  const r = entry.result!;

  // Header band
  doc.setFillColor(...MAROON);
  doc.rect(0, 0, W, 28, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 28, W, 1.2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text(`FILE ${fileIndex} OF ${totalFiles}`, MX, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(220, 215, 200);
  doc.text(`Ref: ${refNo}`, W - MX, 12, { align: "right" });

  // File name (possibly long)
  const nameLines = doc.splitTextToSize(entry.file.name, W - MX * 2 - 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.text(nameLines, W / 2, 20, { align: "center" });

  let y = 38;

  // ── Score cards ────────────────────────────────────────────
  const scores = [
    { label: "AI Generated", value: r.aiPercentage, color: RED },
    { label: "Human Written", value: r.humanPercentage, color: GREEN },
    { label: "Internet Match", value: r.internetPercentage, color: AMBER },
    { label: "Confidence", value: r.confidence, color: BLUE },
  ];

  const gap = 4;
  const cardW = (W - MX * 2 - gap * 3) / 4;
  const cardH = 34;

  scores.forEach(({ label, value, color }, i) => {
    const x = MX + i * (cardW + gap);
    doc.setFillColor(215, 215, 215);
    doc.roundedRect(x + 1, y + 1, cardW, cardH, 3, 3, "F");
    doc.setFillColor(...color);
    doc.roundedRect(x, y, cardW, cardH, 3, 3, "F");
    doc.setFillColor(...GOLD);
    doc.roundedRect(x, y, cardW, 2.5, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...WHITE);
    doc.text(`${value}%`, x + cardW / 2, y + 16, { align: "center" });
    doc.setFontSize(7);
    doc.text(label.toUpperCase(), x + cardW / 2, y + 25, { align: "center" });
  });

  y += cardH + 10;

  // ── Verdict banner ─────────────────────────────────────────
  const verdict = r.aiPercentage >= 60 ? "HIGH AI CONTENT DETECTED"
    : r.aiPercentage >= 30 ? "MODERATE AI CONTENT DETECTED"
      : "LIKELY HUMAN AUTHORED";
  const verdictColor = r.aiPercentage >= 60 ? RED : r.aiPercentage >= 30 ? AMBER : GREEN;
  const vw = 130;
  doc.setFillColor(...verdictColor);
  doc.roundedRect((W - vw) / 2, y, vw, 12, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...WHITE);
  doc.text(`VERDICT: ${verdict}`, W / 2, y + 7.5, { align: "center" });

  y += 20;
  drawDivider(doc, W, y, MX);
  y += 12;

  // ── Progress bars ──────────────────────────────────────────
  y = drawSectionHeading(doc, "SCORE BREAKDOWN", y, W, MX);

  const bars = [
    { label: "AI Generated", value: r.aiPercentage, color: RED },
    { label: "Human Written", value: r.humanPercentage, color: GREEN },
    { label: "Internet Match", value: r.internetPercentage, color: AMBER },
    { label: "Confidence", value: r.confidence, color: BLUE },
  ];
  const barTrackW = W - MX * 2 - 36;

  bars.forEach(({ label, value, color }) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text(label, MX, y + 4);

    // Track
    doc.setFillColor(230, 225, 215);
    doc.roundedRect(MX + 34, y, barTrackW, 5, 2, 2, "F");
    // Fill
    const fillW = Math.max(0, (value / 100) * barTrackW);
    if (fillW > 0) {
      doc.setFillColor(...color);
      doc.roundedRect(MX + 34, y, fillW, 5, 2, 2, "F");
    }
    // Percentage label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text(`${value}%`, W - MX, y + 4, { align: "right" });

    y += 9;
  });

  y += 6;

  // ── Summary ────────────────────────────────────────────────
  y = checkPageBreak(doc, W, H, MX, y, 40);
  y = drawSectionHeading(doc, "ANALYSIS SUMMARY", y, W, MX);

  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  const summaryLines = doc.splitTextToSize(r.summary, W - MX * 2);
  doc.text(summaryLines, MX, y);
  y += summaryLines.length * 5.5 + 10;

  // ── Flagged sections ───────────────────────────────────────
  if (r.flaggedSections.length > 0) {
    y = checkPageBreak(doc, W, H, MX, y, 30);
    y = drawSectionHeading(doc, "FLAGGED SECTIONS", y, W, MX);

    r.flaggedSections.forEach((section, i) => {
      y = checkPageBreak(doc, W, H, MX, y, 18);

      // Zebra rows
      const bg: readonly [number, number, number] = i % 2 === 0 ? WHITE : LIGHT_BG;
      const sLines = doc.splitTextToSize(`${i + 1}. ${section}`, W - MX * 2 - 10);
      const rh = sLines.length * 5 + 8;

      doc.setFillColor(...bg);
      doc.rect(MX, y, W - MX * 2, rh, "F");
      // Left accent
      doc.setFillColor(...RED);
      doc.rect(MX, y, 2.5, rh, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      doc.text(sLines, MX + 6, y + 5.5);

      y += rh + 2;
    });
    y += 6;
  }

  // ── Internet content note ──────────────────────────────────
  if (r.internetPercentage > 0) {
    y = checkPageBreak(doc, W, H, MX, y, 26);
    y = drawSectionHeading(doc, "INTERNET CONTENT DETECTED", y, W, MX);

    doc.setFillColor(255, 248, 230);
    doc.setDrawColor(...AMBER);
    doc.setLineWidth(0.5);
    const noteLines = doc.splitTextToSize(
      `Approximately ${r.internetPercentage}% of this submission appears to match content found on the internet. This may indicate copied or closely paraphrased material from online sources.`,
      W - MX * 2 - 10
    );
    const noteH = noteLines.length * 5.5 + 10;
    doc.roundedRect(MX, y, W - MX * 2, noteH, 3, 3, "FD");
    doc.setFillColor(...AMBER);
    doc.roundedRect(MX, y, 3, noteH, 1.5, 1.5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    doc.text(noteLines, MX + 6, y + 6);
    y += noteH + 10;
  }

  // ── Q&A analysis ───────────────────────────────────────────
  if (r.isQnA && r.questionsAnalysis && r.questionsAnalysis.length > 0) {
    y = checkPageBreak(doc, W, H, MX, y, 40);
    y = drawSectionHeading(doc, "QUESTION & ANSWER EVALUATION", y, W, MX);

    r.questionsAnalysis.forEach((q, i) => {
      const isCorrect = q.verdict === "Correct";
      const isPartial = q.verdict === "Partially Correct";
      const qColor = isCorrect ? GREEN : isPartial ? AMBER : RED;

      const allLines = [
        `Q${i + 1}: ${q.question}`,
        `Verdict: ${q.verdict}`,
        q.studentAnswer ? `Student Answer: ${q.studentAnswer}` : null,
        q.explanation ? `Explanation: ${q.explanation}` : null,
        !isCorrect && q.correctAnswer ? `Correct Answer: ${q.correctAnswer}` : null,
      ].filter(Boolean) as string[];

      let maxH = 0;
      allLines.forEach((line) => {
        const ls = doc.splitTextToSize(line, W - MX * 2 - 10);
        maxH += ls.length * 5 + 1;
      });
      const qH = maxH + 12;

      y = checkPageBreak(doc, W, H, MX, y, qH + 4);

      doc.setFillColor(i % 2 === 0 ? 248 : 242, i % 2 === 0 ? 248 : 240, i % 2 === 0 ? 248 : 234);
      doc.roundedRect(MX, y, W - MX * 2, qH, 2, 2, "F");
      doc.setFillColor(...qColor);
      doc.roundedRect(MX, y, 3, qH, 1.5, 1.5, "F");

      let qy = y + 6;
      allLines.forEach((line, li) => {
        const ls = doc.splitTextToSize(line, W - MX * 2 - 10);
        doc.setFont("helvetica", li === 0 ? "bold" : "normal");
        doc.setFontSize(8);
        doc.setTextColor(li === 1 ? qColor[0] : DARK[0], li === 1 ? qColor[1] : DARK[1], li === 1 ? qColor[2] : DARK[2]);
        doc.text(ls, MX + 6, qy);
        qy += ls.length * 5 + 1;
      });

      y += qH + 4;
    });
    y += 4;
  }

  // ── Recommendations ────────────────────────────────────────
  if (r.recommendations.length > 0) {
    y = checkPageBreak(doc, W, H, MX, y, 30);
    y = drawSectionHeading(doc, "RECOMMENDATIONS", y, W, MX);

    r.recommendations.forEach((rec, i) => {
      y = checkPageBreak(doc, W, H, MX, y, 14);

      const recLines = doc.splitTextToSize(`${i + 1}. ${rec}`, W - MX * 2 - 8);
      const rh = recLines.length * 5 + 8;

      doc.setFillColor(i % 2 === 0 ? 245 : 240, i % 2 === 0 ? 248 : 244, i % 2 === 0 ? 240 : 235);
      doc.rect(MX, y, W - MX * 2, rh, "F");
      doc.setFillColor(...GREEN);
      doc.rect(MX, y, 2.5, rh, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      doc.text(recLines, MX + 6, y + 5.5);
      y += rh + 2;
    });
    y += 6;
  }

  // ── Cache note ─────────────────────────────────────────────
  if (r.cached) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("⚡ Result served from cache.", MX, y);
    y += 8;
  }

  drawFooter(doc, W, H, MX);
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Add a new page if remaining space is less than `needed` mm */
function checkPageBreak(
  doc: jsPDF,
  W: number, H: number, MX: number,
  y: number,
  needed: number
): number {
  if (y + needed > H - 22) {
    doc.addPage();
    drawPageBackground(doc, W, H);
    // Thin continuation header
    doc.setFillColor(...MAROON);
    doc.rect(0, 0, W, 14, "F");
    doc.setFillColor(...GOLD);
    doc.rect(0, 14, W, 0.8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text("(continued)", W / 2, 10, { align: "center" });
    drawFooter(doc, W, H, MX);
    return 22;
  }
  return y;
}

function drawPageBackground(doc: jsPDF, W: number, H: number) {
  doc.setFillColor(...CREAM);
  doc.rect(0, 0, W, H, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.2);
  doc.rect(8, 8, W - 16, H - 16);
  doc.setLineWidth(0.4);
  doc.rect(11, 11, W - 22, H - 22);
  [[15, 15], [W - 15, 15], [15, H - 15], [W - 15, H - 15]].forEach(([x, y]) => {
    doc.setFillColor(...GOLD);
    doc.circle(x, y, 2.5, "F");
  });
}

function drawDivider(doc: jsPDF, W: number, y: number, MX: number) {
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(MX, y, W / 2 - 5, y);
  doc.line(W / 2 + 5, y, W - MX, y);
  doc.setFillColor(...GOLD);
  doc.circle(W / 2, y, 1.5, "F");
}

function drawSectionHeading(doc: jsPDF, title: string, y: number, W: number, MX: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MAROON);
  doc.text(title, MX, y);
  const tw = doc.getTextWidth(title);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(MX + tw + 3, y - 1, W - MX, y - 1);
  return y + 8;
}

function drawFooter(doc: jsPDF, W: number, H: number, MX: number) {
  doc.setFillColor(...MAROON);
  doc.rect(0, H - 14, W, 14, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, H - 15, W, 1, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(220, 205, 185);
  doc.text("This certificate is system-generated by Stella College AI Checker.", W / 2, H - 8, { align: "center" });
  doc.text("https://www.stellacollege.edu.au/", W - MX, H - 8, { align: "right" });
}