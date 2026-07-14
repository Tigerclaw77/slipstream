import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { LocalVisibilityReport } from "../src/productTypes.js";
import { config } from "./config.js";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const colors = {
  ink: rgb(0.09, 0.12, 0.15),
  soft: rgb(0.34, 0.39, 0.42),
  teal: rgb(0.02, 0.38, 0.36),
  mint: rgb(0.82, 0.93, 0.89),
  coral: rgb(0.85, 0.29, 0.22),
  amber: rgb(0.91, 0.63, 0.16),
  cream: rgb(0.97, 0.96, 0.92),
  line: rgb(0.83, 0.84, 0.81),
  white: rgb(1, 1, 1),
};

function safeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7E\n]/g, "");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const paragraphs = safeText(text).split("\n");
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    if (!paragraph && paragraphs.length > 1) lines.push("");
  }
  return lines;
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  options: {
    x: number;
    y: number;
    width: number;
    font: PDFFont;
    size: number;
    color?: ReturnType<typeof rgb>;
    lineHeight?: number;
  },
) {
  const lines = wrapText(text, options.font, options.size, options.width);
  const lineHeight = options.lineHeight ?? options.size * 1.42;
  lines.forEach((line, index) => {
    page.drawText(line, {
      x: options.x,
      y: options.y - index * lineHeight,
      size: options.size,
      font: options.font,
      color: options.color ?? colors.ink,
    });
  });
  return options.y - lines.length * lineHeight;
}

function drawFooter(page: PDFPage, pageNumber: number, regular: PDFFont) {
  page.drawLine({
    start: { x: MARGIN, y: 35 },
    end: { x: PAGE_WIDTH - MARGIN, y: 35 },
    thickness: 0.7,
    color: colors.line,
  });
  page.drawText("SLIPSTREAM SEO  /  LOCAL VISIBILITY REPORT", {
    x: MARGIN,
    y: 20,
    size: 7,
    font: regular,
    color: colors.soft,
  });
  page.drawText(String(pageNumber).padStart(2, "0"), {
    x: PAGE_WIDTH - MARGIN - 10,
    y: 20,
    size: 8,
    font: regular,
    color: colors.soft,
  });
}

function drawPageHeading(page: PDFPage, kicker: string, title: string, regular: PDFFont, bold: PDFFont) {
  page.drawText(kicker.toUpperCase(), { x: MARGIN, y: 730, size: 8, font: bold, color: colors.teal });
  page.drawText(safeText(title), { x: MARGIN, y: 694, size: 25, font: bold, color: colors.ink });
  page.drawLine({
    start: { x: MARGIN, y: 676 },
    end: { x: PAGE_WIDTH - MARGIN, y: 676 },
    thickness: 1,
    color: colors.line,
  });
}

function drawScore(page: PDFPage, score: number, x: number, y: number, label: string, regular: PDFFont, bold: PDFFont) {
  page.drawCircle({ x, y, size: 54, color: colors.teal });
  const scoreText = String(score);
  page.drawText(scoreText, {
    x: x - bold.widthOfTextAtSize(scoreText, 29) / 2,
    y: y - 3,
    size: 29,
    font: bold,
    color: colors.white,
  });
  page.drawText("/ 100", { x: x - 16, y: y - 20, size: 8, font: regular, color: colors.mint });
  const safeLabel = safeText(label).toUpperCase();
  page.drawText(safeLabel, {
    x: x - bold.widthOfTextAtSize(safeLabel, 7) / 2,
    y: y - 76,
    size: 7,
    font: bold,
    color: colors.soft,
  });
}

function drawBulletList(
  page: PDFPage,
  items: string[],
  y: number,
  regular: PDFFont,
  options: { x?: number; width?: number; color?: ReturnType<typeof rgb>; gap?: number } = {},
) {
  const x = options.x ?? MARGIN;
  const width = options.width ?? CONTENT_WIDTH;
  let cursor = y;
  for (const item of items) {
    page.drawCircle({ x: x + 4, y: cursor + 3, size: 2.5, color: options.color ?? colors.teal });
    cursor = drawWrappedText(page, item, {
      x: x + 16,
      y: cursor + 8,
      width: width - 16,
      font: regular,
      size: 10.5,
      lineHeight: 15,
      color: colors.ink,
    }) - (options.gap ?? 8);
  }
  return cursor;
}

async function fetchMapImage(report: LocalVisibilityReport) {
  const url = new URL("https://staticmap.openstreetmap.de/staticmap.php");
  url.searchParams.set("center", `${report.business.latitude},${report.business.longitude}`);
  url.searchParams.set("zoom", "13");
  url.searchParams.set("size", "1000x500");
  url.searchParams.set("maptype", "mapnik");
  const markers = [
    `${report.business.latitude},${report.business.longitude},red-pushpin`,
    ...report.competitors.slice(0, 10).map((item) => `${item.latitude},${item.longitude},lightblue1`),
  ];
  url.searchParams.set("markers", markers.join("|"));
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { "user-agent": config.osmUserAgent },
  });
  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("image")) return null;
  return { bytes: new Uint8Array(await response.arrayBuffer()), contentType };
}

function drawMapUnavailable(page: PDFPage, x: number, y: number, width: number, height: number, regular: PDFFont, bold: PDFFont) {
  page.drawRectangle({ x, y, width, height, color: colors.cream, borderColor: colors.line, borderWidth: 1 });
  page.drawText("MAP UNAVAILABLE", { x: x + 28, y: y + height / 2 + 22, size: 10, font: bold, color: colors.coral });
  drawWrappedText(page, "The geographic basemap service did not respond while this report was generated. No substitute diagram is shown because it could imply geographic detail that was not verified. Competitor names and measured distances remain available on the next page.", {
    x: x + 28,
    y: y + height / 2 - 8,
    width: width - 56,
    font: regular,
    size: 11,
    lineHeight: 17,
    color: colors.ink,
  });
}

export async function createReportPdf(report: LocalVisibilityReport, requestId: string) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${report.business.name} Local Visibility Report`);
  pdf.setAuthor("Slipstream SEO");
  pdf.setSubject("Local visibility opportunity and action plan");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages: PDFPage[] = [];
  const addPage = () => {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: colors.white });
    return page;
  };

  // Cover and executive summary
  let page = addPage();
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: colors.cream });
  page.drawRectangle({ x: 0, y: 0, width: 18, height: PAGE_HEIGHT, color: colors.teal });
  page.drawText("SLIPSTREAM SEO", { x: MARGIN, y: 720, size: 10, font: bold, color: colors.teal });
  page.drawText("LOCAL VISIBILITY REPORT", { x: MARGIN, y: 682, size: 8, font: bold, color: colors.soft });
  let coverY = drawWrappedText(page, report.business.name, {
    x: MARGIN,
    y: 625,
    width: 345,
    font: bold,
    size: 31,
    lineHeight: 36,
    color: colors.ink,
  });
  coverY = drawWrappedText(page, report.business.address, {
    x: MARGIN,
    y: coverY - 12,
    width: 350,
    font: regular,
    size: 11,
    color: colors.soft,
  });
  drawScore(page, report.opportunityScore, 493, 583, "Opportunity score", regular, bold);
  page.drawRectangle({ x: MARGIN, y: 190, width: CONTENT_WIDTH, height: 235, color: colors.white, borderColor: colors.line, borderWidth: 1 });
  page.drawText("EXECUTIVE SUMMARY", { x: MARGIN + 24, y: 387, size: 8, font: bold, color: colors.teal });
  drawWrappedText(page, report.executiveSummary, {
    x: MARGIN + 24,
    y: 355,
    width: CONTENT_WIDTH - 48,
    font: regular,
    size: 13,
    lineHeight: 19,
    color: colors.ink,
  });
  page.drawText(`Prepared ${new Date(report.generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, {
    x: MARGIN,
    y: 77,
    size: 9,
    font: regular,
    color: colors.soft,
  });

  // Market snapshot
  page = addPage();
  drawPageHeading(page, "Market snapshot", "Territory strength and competition", regular, bold);
  drawScore(page, report.territoryStrength, 125, 583, "Territory strength", regular, bold);
  page.drawText("COMPETITION DENSITY", { x: 225, y: 627, size: 8, font: bold, color: colors.teal });
  page.drawText(report.competitionDensity.label, { x: 225, y: 592, size: 27, font: bold, color: colors.ink });
  page.drawText(`${report.competitionDensity.withinThreeMiles} competitors within 3 miles`, { x: 225, y: 568, size: 10, font: regular, color: colors.soft });
  const densityRows = [
    ["1 mile", report.competitionDensity.withinOneMile],
    ["3 miles", report.competitionDensity.withinThreeMiles],
    ["5 miles", report.competitionDensity.withinFiveMiles],
    ["10 miles", report.competitionDensity.withinTenMiles],
  ] as const;
  densityRows.forEach(([label, count], index) => {
    const y = 478 - index * 58;
    page.drawText(label, { x: MARGIN, y: y + 12, size: 10, font: bold, color: colors.ink });
    page.drawRectangle({ x: 130, y: y + 7, width: 330, height: 12, color: colors.cream });
    page.drawRectangle({ x: 130, y: y + 7, width: Math.min(330, 18 + count * 24), height: 12, color: index < 2 ? colors.coral : colors.teal });
    page.drawText(String(count), { x: 480, y: y + 10, size: 11, font: bold, color: colors.ink });
  });
  page.drawRectangle({ x: MARGIN, y: 112, width: CONTENT_WIDTH, height: 102, color: colors.mint });
  page.drawText("TERRITORY RECOMMENDATION", { x: MARGIN + 20, y: 184, size: 8, font: bold, color: colors.teal });
  page.drawText(`${report.territory.recommendedRadiusMiles}-mile primary focus`, { x: MARGIN + 20, y: 150, size: 20, font: bold, color: colors.ink });
  page.drawText(`${report.territory.reviewRadiusMiles}-mile informational review area`, { x: MARGIN + 20, y: 127, size: 9, font: regular, color: colors.soft });

  // Local map
  page = addPage();
  drawPageHeading(page, "Local market", "Where nearby competition sits", regular, bold);
  const map = await fetchMapImage(report).catch(() => null);
  if (map) {
    const embedded = map.contentType.includes("jpeg") || map.contentType.includes("jpg")
      ? await pdf.embedJpg(map.bytes)
      : await pdf.embedPng(map.bytes);
    page.drawImage(embedded, { x: MARGIN, y: 355, width: CONTENT_WIDTH, height: 265 });
  } else {
    drawMapUnavailable(page, MARGIN, 355, CONTENT_WIDTH, 265, regular, bold);
  }
  if (map) {
    page.drawCircle({ x: MARGIN + 5, y: 320, size: 5, color: colors.coral });
    page.drawText("Your practice", { x: MARGIN + 17, y: 316, size: 9, font: regular, color: colors.soft });
    page.drawCircle({ x: MARGIN + 120, y: 320, size: 4, color: colors.amber });
    page.drawText("Nearby competitor", { x: MARGIN + 132, y: 316, size: 9, font: regular, color: colors.soft });
  }
  drawWrappedText(page, map
    ? `The closest ${Math.min(report.competitors.length, 12)} mapped competitors are shown. Use the primary ${report.territory.recommendedRadiusMiles}-mile area to focus local profile accuracy, patient proof, and the services most likely to drive appointments.`
    : `Use the competitor names and measured distances on the next page to review the local market. The informational ${report.territory.recommendedRadiusMiles}-mile focus area remains based on those measured distances, not on the unavailable basemap.`, {
    x: MARGIN,
    y: 266,
    width: CONTENT_WIDTH,
    font: regular,
    size: 11,
    lineHeight: 17,
    color: colors.ink,
  });
  page.drawText("Map data (c) OpenStreetMap contributors", { x: MARGIN, y: 80, size: 7, font: regular, color: colors.soft });

  // Competitor breakdown
  page = addPage();
  drawPageHeading(page, "Competitive set", "Closest mapped practices", regular, bold);
  let rowY = 638;
  page.drawText("PRACTICE", { x: MARGIN, y: rowY, size: 8, font: bold, color: colors.soft });
  page.drawText("DISTANCE", { x: 475, y: rowY, size: 8, font: bold, color: colors.soft });
  rowY -= 26;
  if (report.competitors.length === 0) {
    drawWrappedText(page, "No nearby competitors were present in the public map data used for this report. Verify the market manually before making exclusivity or expansion decisions.", {
      x: MARGIN, y: rowY, width: CONTENT_WIDTH, font: regular, size: 11, color: colors.ink,
    });
  } else {
    report.competitors.slice(0, 11).forEach((competitor, index) => {
      if (index % 2 === 0) page.drawRectangle({ x: MARGIN, y: rowY - 34, width: CONTENT_WIDTH, height: 46, color: colors.cream });
      page.drawText(safeText(competitor.name).slice(0, 58), { x: MARGIN + 10, y: rowY - 4, size: 10, font: bold, color: colors.ink });
      page.drawText(safeText(competitor.address).slice(0, 74), { x: MARGIN + 10, y: rowY - 20, size: 7.5, font: regular, color: colors.soft });
      page.drawText(`${competitor.distanceMiles.toFixed(1)} mi`, { x: 480, y: rowY - 4, size: 9, font: bold, color: colors.teal });
      rowY -= 49;
    });
  }

  // Authority findings
  page = addPage();
  drawPageHeading(page, "Owned visibility", "Authority and website findings", regular, bold);
  let findingY = 628;
  report.visibilityFindings.forEach((finding) => {
    const statusColor = finding.status === "strong" ? colors.teal : finding.status === "missing" ? colors.coral : colors.amber;
    page.drawRectangle({ x: MARGIN, y: findingY - 60, width: CONTENT_WIDTH, height: 72, color: colors.cream });
    page.drawCircle({ x: MARGIN + 20, y: findingY - 23, size: 6, color: statusColor });
    page.drawText(safeText(finding.label), { x: MARGIN + 39, y: findingY - 12, size: 11, font: bold, color: colors.ink });
    drawWrappedText(page, finding.detail, { x: MARGIN + 39, y: findingY - 31, width: CONTENT_WIDTH - 58, font: regular, size: 9, lineHeight: 12, color: colors.soft });
    findingY -= 86;
  });
  page.drawText("WHAT THIS MEANS", { x: MARGIN, y: 212, size: 8, font: bold, color: colors.teal });
  drawWrappedText(page, "Search visibility starts with a clear local identity and a website that helps both patients and search engines understand what the practice does, where it serves, and what action to take next.", {
    x: MARGIN, y: 180, width: CONTENT_WIDTH, font: regular, size: 12, lineHeight: 18, color: colors.ink,
  });

  // Wins and priorities
  page = addPage();
  drawPageHeading(page, "Decisions", "Biggest wins and highest priorities", regular, bold);
  page.drawText("BIGGEST WINS", { x: MARGIN, y: 628, size: 8, font: bold, color: colors.teal });
  let sectionY = drawBulletList(page, report.biggestWins, 594, regular, { color: colors.teal, gap: 12 });
  page.drawLine({ start: { x: MARGIN, y: sectionY + 2 }, end: { x: PAGE_WIDTH - MARGIN, y: sectionY + 2 }, color: colors.line, thickness: 1 });
  page.drawText("HIGHEST PRIORITY RECOMMENDATIONS", { x: MARGIN, y: sectionY - 29, size: 8, font: bold, color: colors.coral });
  const prioritiesY = drawBulletList(page, report.priorityRecommendations, sectionY - 64, regular, { color: colors.coral, gap: 10 });
  page.drawRectangle({ x: MARGIN, y: 113, width: CONTENT_WIDTH, height: Math.max(100, Math.min(150, prioritiesY - 133)), color: colors.mint });
  page.drawText("THE DISCIPLINE THAT MATTERS", { x: MARGIN + 20, y: 218, size: 8, font: bold, color: colors.teal });
  drawWrappedText(page, "Complete the foundational corrections before adding more pages or campaigns. The first measure of success is not a ranking chart; it is a practice that is consistently represented, easy to understand, and easy to contact everywhere a local patient looks.", {
    x: MARGIN + 20, y: 190, width: CONTENT_WIDTH - 40, font: regular, size: 10.5, lineHeight: 15, color: colors.ink,
  });

  // Roadmap
  page = addPage();
  drawPageHeading(page, "Action roadmap", "A practical order of operations", regular, bold);
  const columns = [
    { title: "DO FIRST", subtitle: "Next 30 days", items: report.roadmap.doFirst, color: colors.coral },
    { title: "DO NEXT", subtitle: "Days 31-60", items: report.roadmap.doNext, color: colors.amber },
    { title: "DO LATER", subtitle: "Days 61-90", items: report.roadmap.doLater, color: colors.teal },
  ];
  columns.forEach((column, index) => {
    const x = MARGIN + index * 174;
    page.drawRectangle({ x, y: 175, width: 156, height: 455, color: colors.cream, borderColor: colors.line, borderWidth: 1 });
    page.drawRectangle({ x, y: 600, width: 156, height: 30, color: column.color });
    page.drawText(column.title, { x: x + 14, y: 611, size: 9, font: bold, color: colors.white });
    page.drawText(column.subtitle, { x: x + 14, y: 574, size: 8, font: bold, color: colors.soft });
    drawBulletList(page, column.items, 536, regular, { x: x + 12, width: 132, color: column.color, gap: 13 });
  });
  drawWrappedText(page, report.dataNote, { x: MARGIN, y: 127, width: CONTENT_WIDTH, font: regular, size: 7.5, lineHeight: 11, color: colors.soft });

  pages.forEach((currentPage, index) => drawFooter(currentPage, index + 1, regular));
  const bytes = await pdf.save();
  await fs.mkdir(config.reportOutputDir, { recursive: true });
  const pdfPath = path.join(config.reportOutputDir, `${requestId}.pdf`);
  await fs.writeFile(pdfPath, bytes);
  return pdfPath;
}
