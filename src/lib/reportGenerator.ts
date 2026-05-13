import jsPDF from "jspdf";
import type { AnalysisResult } from "@/components/ResultsView";

// ─────────────────────────────────────────────────────────────
// COLORS
// ─────────────────────────────────────────────────────────────

const MAROON = [0, 82, 155] as const;
const GOLD = [185, 145, 75] as const;
const CREAM = [252, 248, 240] as const;
const DARK = [35, 35, 35] as const;
const MUTED = [110, 110, 110] as const;
const WHITE = [255, 255, 255] as const;

const GREEN = [25, 135, 84] as const;
const RED = [200, 60, 60] as const;
const BLUE = [60, 90, 170] as const;
const AMBER = [210, 140, 30] as const;

// ─────────────────────────────────────────────────────────────

export function generateReport(
  result: AnalysisResult,
  fileName: string,
  userName?: string
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const MX = 18;

  // ─────────────────────────────────────────────────────────
  // PAGE BACKGROUND
  // ─────────────────────────────────────────────────────────

  drawPageBackground(doc, W, H);

  // ─────────────────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────────────────

  doc.setFillColor(...MAROON);
  doc.rect(0, 0, W, 50, "F");

  doc.setFillColor(...GOLD);
  doc.rect(0, 50, W, 1.5, "F");

  // Title
  doc.setFont("times", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...WHITE);

  doc.text("STELLA COLLEGE", W / 2, 22, {
    align: "center",
  });

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(235, 215, 190);



  // Decorative line
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);

  doc.line(MX + 25, 36, W - MX - 25, 36);

  // Certificate title
  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...GOLD);

  doc.text(
    "CERTIFICATE OF AI CONTENT ANALYSIS",
    W / 2,
    45,
    {
      align: "center",
    }
  );

  // ─────────────────────────────────────────────────────────
  // REFERENCE INFO
  // ─────────────────────────────────────────────────────────

  let y = 64;

  const refNo = `SC-${Date.now()
    .toString(36)
    .toUpperCase()
    .slice(-8)}`;

  const dateStr = new Date().toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);

  doc.text(`Reference No: ${refNo}`, MX, y);

  doc.text(`Issued: ${dateStr}`, W - MX, y, {
    align: "right",
  });

  // ─────────────────────────────────────────────────────────
  // INTRODUCTION
  // ─────────────────────────────────────────────────────────

  y += 18;

  doc.setFont("times", "italic");
  doc.setFontSize(13);
  doc.setTextColor(...DARK);

  doc.text(
    "This certificate confirms that the following",
    W / 2,
    y,
    {
      align: "center",
    }
  );

  y += 7;

  doc.text(
    "academic submission has been analysed for",
    W / 2,
    y,
    {
      align: "center",
    }
  );

  y += 7;

  doc.text(
    "AI-generated content and originality verification.",
    W / 2,
    y,
    {
      align: "center",
    }
  );

  // ─────────────────────────────────────────────────────────
  // USER NAME
  // ─────────────────────────────────────────────────────────

  y += 18;

  if (userName) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);

    doc.text("SUBMITTED BY", W / 2, y, {
      align: "center",
    });

    y += 8;

    doc.setFont("times", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...MAROON);

    doc.text(userName, W / 2, y, {
      align: "center",
    });

    y += 5;

    const nameWidth = doc.getTextWidth(userName);

    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.7);

    doc.line(
      W / 2 - nameWidth / 2,
      y,
      W / 2 + nameWidth / 2,
      y
    );

    y += 15;
  }

  // ─────────────────────────────────────────────────────────
  // DOCUMENT BOX
  // ─────────────────────────────────────────────────────────

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);

  doc.text("DOCUMENT ANALYSED", W / 2, y, {
    align: "center",
  });

  y += 8;

  const boxX = MX + 8;
  const boxW = W - (MX + 8) * 2;

  const fileLines = doc.splitTextToSize(
    fileName,
    boxW - 14
  );

  const boxH = fileLines.length * 6 + 12;

  // Shadow
  doc.setFillColor(220, 220, 220);

  doc.roundedRect(
    boxX + 1,
    y + 1,
    boxW,
    boxH,
    3,
    3,
    "F"
  );

  // Main box
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);

  doc.roundedRect(
    boxX,
    y,
    boxW,
    boxH,
    3,
    3,
    "FD"
  );

  // Top accent
  doc.setFillColor(...MAROON);

  doc.roundedRect(
    boxX,
    y,
    boxW,
    3,
    2,
    2,
    "F"
  );

  // File name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);

  doc.text(fileLines, W / 2, y + 10, {
    align: "center",
    maxWidth: boxW - 10,
  });

  y += boxH + 16;

  // ─────────────────────────────────────────────────────────
  // DIVIDER
  // ─────────────────────────────────────────────────────────

  drawDivider(doc, W, y, MX);

  y += 14;

  // ─────────────────────────────────────────────────────────
  // SCORE CARDS
  // ─────────────────────────────────────────────────────────

  const scores = [
    {
      label: "AI Generated",
      value: result.aiPercentage,
      color: RED,
    },
    {
      label: "Human Written",
      value: result.humanPercentage,
      color: GREEN,
    },
    {
      label: "Internet Match",
      value: result.internetPercentage,
      color: AMBER,
    },
    {
      label: "Confidence",
      value: result.confidence,
      color: BLUE,
    },
  ];

  const gap = 4;

  const cardW = (W - MX * 2 - gap * 3) / 4;
  const cardH = 34;

  scores.forEach((item, index) => {
    const x = MX + index * (cardW + gap);

    // Shadow
    doc.setFillColor(220, 220, 220);

    doc.roundedRect(
      x + 1,
      y + 1,
      cardW,
      cardH,
      3,
      3,
      "F"
    );

    // Card
    doc.setFillColor(
      item.color[0],
      item.color[1],
      item.color[2]
    );

    doc.roundedRect(
      x,
      y,
      cardW,
      cardH,
      3,
      3,
      "F"
    );

    // Top gold line
    doc.setFillColor(...GOLD);

    doc.roundedRect(
      x,
      y,
      cardW,
      2.5,
      2,
      2,
      "F"
    );

    // Percentage
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...WHITE);

    doc.text(
      `${item.value}%`,
      x + cardW / 2,
      y + 16,
      {
        align: "center",
      }
    );

    // Label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    doc.text(
      item.label.toUpperCase(),
      x + cardW / 2,
      y + 25,
      {
        align: "center",
      }
    );
  });

  y += cardH + 18;

  // ─────────────────────────────────────────────────────────
  // VERDICT
  // ─────────────────────────────────────────────────────────

  const verdict =
    result.aiPercentage >= 60
      ? "HIGH AI CONTENT DETECTED"
      : result.aiPercentage >= 30
        ? "MODERATE AI CONTENT DETECTED"
        : "LIKELY HUMAN AUTHORED";

  const verdictColor =
    result.aiPercentage >= 60
      ? RED
      : result.aiPercentage >= 30
        ? AMBER
        : GREEN;

  const verdictW = 118;
  const verdictX = (W - verdictW) / 2;

  doc.setFillColor(
    verdictColor[0],
    verdictColor[1],
    verdictColor[2]
  );

  doc.roundedRect(
    verdictX,
    y,
    verdictW,
    12,
    3,
    3,
    "F"
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...WHITE);

  doc.text(
    `VERDICT: ${verdict}`,
    W / 2,
    y + 7.5,
    {
      align: "center",
    }
  );

  y += 24;

  // ─────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────
  const summaryLines = doc.splitTextToSize(result.summary, W - MX * 2);
  const summaryH = summaryLines.length * 6;
  const sigBlockH = 60; // approx height needed for signature + footer gap
  const remaining = H - 20 - y;          // 20 = footer clearance

  if (remaining < summaryH + sigBlockH) {
    doc.addPage();
    drawPageBackground(doc, W, H);
    y = 28;                               // top margin on new page
  }
  y = drawSectionHeading(
    doc,
    "SUMMARY",
    y,
    W,
    MX
  );

  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...DARK);

  // const summaryLines = doc.splitTextToSize(
  //   result.summary,
  //   W - MX * 2
  // );

  doc.text(summaryLines, MX, y);

  y += summaryLines.length * 6 + 16;

  // ─────────────────────────────────────────────────────────
  // SIGNATURE
  // ─────────────────────────────────────────────────────────

  drawDivider(doc, W, y, MX);

  y += 18;

  // Signature line
  doc.setDrawColor(...MAROON);
  doc.setLineWidth(0.6);

  // doc.line(MX, y + 18, MX + 65, y + 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MAROON);
  // After signature text is placed, ensure it never overlaps the footer
  const SIG_Y = Math.min(y, H - 55);   // at most 55 mm above page bottom

  // then use SIG_Y instead of y for all signature drawing calls
  doc.line(MX, SIG_Y + 18, MX + 65, SIG_Y + 18);
  doc.text("Academic Integrity Officer", MX, SIG_Y + 24);
  // ...etc

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);

  // doc.text(
  //   "Stella College - AI Assessment Division",
  //   MX,
  //   y + 30
  // );
  doc.text("Stella College - AI Assessment Division", MX, SIG_Y + 30);
  // Seal
  const sealX = W - 50;

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);

  // doc.circle(sealX, y + 12, 16);

  doc.setLineWidth(0.5);

  // doc.circle(sealX, y + 12, 13);

  doc.setFillColor(...MAROON);

  // doc.circle(sealX, y + 12, 10, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(...GOLD);

  doc.text("STELLA", sealX, y + 9, {
    align: "center",
  });

  doc.text("COLLEGE", sealX, y + 13, {
    align: "center",
  });

  doc.text("OFFICIAL", sealX, y + 17, {
    align: "center",
  });

  // ─────────────────────────────────────────────────────────
  // FOOTER
  // ─────────────────────────────────────────────────────────

  drawFooter(doc, W, H, MX);

  // ─────────────────────────────────────────────────────────
  // SAVE
  // ─────────────────────────────────────────────────────────

  const cleanName = fileName.replace(/\.[^.]+$/, "");

  doc.save(`AI_Certificate_${cleanName}.pdf`);
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function drawPageBackground(
  doc: jsPDF,
  W: number,
  H: number
) {
  doc.setFillColor(...CREAM);
  doc.rect(0, 0, W, H, "F");

  // Outer border
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.2);

  doc.rect(8, 8, W - 16, H - 16);

  // Inner border
  doc.setLineWidth(0.4);

  doc.rect(11, 11, W - 22, H - 22);

  // Decorative corners
  const corners = [
    [15, 15],
    [W - 15, 15],
    [15, H - 15],
    [W - 15, H - 15],
  ];

  corners.forEach(([x, y]) => {
    doc.setFillColor(...GOLD);
    doc.circle(x, y, 2.5, "F");
  });
}

function drawDivider(
  doc: jsPDF,
  W: number,
  y: number,
  MX: number
) {
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);

  doc.line(MX, y, W / 2 - 5, y);

  doc.line(W / 2 + 5, y, W - MX, y);

  doc.setFillColor(...GOLD);

  doc.circle(W / 2, y, 1.5, "F");
}

function drawSectionHeading(
  doc: jsPDF,
  title: string,
  y: number,
  W: number,
  MX: number
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...MAROON);

  doc.text(title, MX, y);

  const textWidth = doc.getTextWidth(title);

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);

  doc.line(
    MX + textWidth + 3,
    y - 1,
    W - MX,
    y - 1
  );

  return y + 8;
}

function drawFooter(
  doc: jsPDF,
  W: number,
  H: number,
  MX: number
) {
  doc.setFillColor(...MAROON);

  doc.rect(0, H - 14, W, 14, "F");

  doc.setFillColor(...GOLD);

  doc.rect(0, H - 15, W, 1, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(220, 205, 185);

  doc.text(
    "This certificate is system-generated by Stella College AI Checker.",
    W / 2,
    H - 8,
    {
      align: "center",
    }
  );

  doc.text(
    "https://www.stellacollege.edu.au/",
    W - MX,
    H - 8,
    {
      align: "right",
    }
  );
}