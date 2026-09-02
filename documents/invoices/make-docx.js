const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, VerticalAlign, ShadingType, convertMillimetersToTwip
} = require("docx");

const INK = "16171A", SOFT = "3C3E44", MUTE = "6E7076", PAPER = "E7E3DA", LINE = "B6B1A5", HAIR = "CFCABE";
const F = "Inter";

const NONE = { style: BorderStyle.NONE, size: 0, color: "auto" };
const noBorders = { top: NONE, bottom: NONE, left: NONE, right: NONE };
const b = (color, sz) => ({ style: BorderStyle.SINGLE, size: sz, color });

const shade = { type: ShadingType.CLEAR, color: "auto", fill: PAPER };

function run(text, o = {}) {
  return new TextRun({
    text, font: F,
    size: o.size || 15,           // half-points
    bold: !!o.bold,
    color: o.color || INK,
    characterSpacing: o.ls || 0,  // twentieths of a point
    allCaps: !!o.caps,
    break: o.break || 0,
  });
}
function p(children, o = {}) {
  return new Paragraph({
    children: Array.isArray(children) ? children : [children],
    alignment: o.align,
    spacing: { before: o.before || 0, after: o.after === undefined ? 0 : o.after, line: o.line || 240, lineRule: o.lineRule },
    border: o.border,
  });
}
const label = (t) => p(run(t, { size: 12, bold: true, ls: 32, caps: true }), { after: 60 });
const body = (t, o = {}) => p(run(t, { size: 14, color: SOFT, ...o }), { after: o.after === undefined ? 0 : o.after, line: 250 });
const empty = (h) => new Paragraph({ children: [new TextRun({ text: "", size: 2, font: F })], spacing: { after: h, line: 20, lineRule: "exact" } });

function cell(children, o = {}) {
  return new TableCell({
    children,
    width: { size: o.w, type: WidthType.PERCENTAGE },
    borders: o.borders || noBorders,
    shading: shade,
    margins: { top: o.mt === undefined ? 0 : o.mt, bottom: o.mb === undefined ? 0 : o.mb, left: o.ml === undefined ? 0 : o.ml, right: o.mr === undefined ? 0 : o.mr },
    verticalAlign: o.va,
    columnSpan: o.span,
  });
}
const table = (rows, o = {}) => new Table({
  rows,
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: noBorders,
  layout: "fixed",
  ...o,
});

/* ---------- header line ---------- */
const brandRow = table([new TableRow({ children: [
  cell([p(run("Fourtress Commerce Ltd", { size: 12, bold: true, ls: 44, caps: true, color: SOFT }))], { w: 55 }),
  cell([p(run("Varna · Bulgaria", { size: 12, bold: true, ls: 44, caps: true, color: SOFT }), { align: AlignmentType.RIGHT })], { w: 45 }),
]})]);

const wordmark = p(run("INVOICE", { size: 168, bold: true, ls: -80 }), { before: 240, after: 60, line: 1400, lineRule: "exact" });

const ruleP = (color = LINE, sz = 6, before = 0, after = 0) =>
  new Paragraph({ children: [new TextRun({ text: "", size: 2, font: F })],
    border: { bottom: b(color, sz) }, spacing: { before, after, line: 20, lineRule: "exact" } });

/* ---------- parties ---------- */
function metaRow(k, v) {
  return table([new TableRow({ children: [
    cell([p(run(k, { size: 14, color: SOFT }), { align: AlignmentType.RIGHT })], { w: 58, mr: 100 }),
    cell([p(run(v, { size: 14, bold: true }), { align: AlignmentType.RIGHT })], { w: 42 }),
  ]})]);
}

const parties = table([new TableRow({ children: [
  cell([
    label("From"),
    p(run("Fourtress Commerce Ltd", { size: 17, bold: true }), { after: 30 }),
    body("Company No. 204154873"),
    body("5, Parizhka Komuna Str., Office 3,"),
    body("Ground Floor, Varna 9000, Bulgaria"),
    body("fortreskltd@gmail.com"),
    body("+359 877 173 509"),
  ], { w: 35, mr: 300 }),
  cell([
    label("Bill to"),
    p(run("Guerrero Sanz Jose Eugenio", { size: 17, bold: true }), { after: 30 }),
    body("C. Sirio 38, DR P04 C"),
    body("Madrid, Spain"),
  ], { w: 34, mr: 300 }),
  cell([
    p(run("Invoice", { size: 12, bold: true, ls: 32, caps: true }), { after: 60, align: AlignmentType.RIGHT }),
    p(run("#109", { size: 24, bold: true }), { after: 60, align: AlignmentType.RIGHT }),
    metaRow("Invoice date", "31.08.2026"),
    metaRow("Due date", "15.09.2026"),
    metaRow("Currency", "EUR (€)"),
  ], { w: 31 }),
]})]);

/* ---------- items table ---------- */
const COLS = [30, 38, 9, 10, 13];
const th = (t, align) => cell(
  [p(run(t, { size: 12, bold: true, ls: 30, caps: true }), { align })],
  { w: 0, mt: 130, mb: 130, ml: 140, mr: 140, borders: { top: b(LINE, 6), bottom: b(LINE, 6), left: NONE, right: NONE } }
);
const headRow = new TableRow({ children: [
  th("Item / Service", AlignmentType.LEFT),
  th("Description", AlignmentType.LEFT),
  th("Qty (h)", AlignmentType.CENTER),
  th("Rate", AlignmentType.RIGHT),
  th("Total", AlignmentType.RIGHT),
], tableHeader: true });

const items = [
  ["Discovery & Specification", "Requirements workshop, technical specification, sitemap and information architecture", "6", "€65.00", "€390.00"],
  ["UI / UX Design", "Visual design system, wireframes and responsive page layouts for desktop, tablet and mobile", "10", "€70.00", "€700.00"],
  ["Front-End Development", "Semantic HTML / CSS / JavaScript build, responsive implementation and cross-browser testing", "12", "€60.00", "€720.00"],
  ["Back-End & CMS Integration", "Server-side logic, CMS setup, contact forms, data layer and third-party API connections", "6", "€75.00", "€450.00"],
  ["Launch & Optimisation", "On-page SEO, performance tuning, quality assurance, hosting setup and production deployment", "4", "€60.00", "€240.00"],
];
const cellPad = { mt: 165, mb: 165, ml: 140, mr: 140 };
const bodyBorders = { top: NONE, bottom: b(HAIR, 4), left: NONE, right: NONE };
const itemRows = items.map(([name, desc, qty, rate, tot]) => new TableRow({
  cantSplit: true,
  children: [
    cell([p(run(name, { size: 15, bold: true }), { line: 250 })], { ...cellPad, borders: bodyBorders, w: 0 }),
    cell([p(run(desc, { size: 14, color: SOFT }), { line: 250 })], { ...cellPad, borders: bodyBorders, w: 0 }),
    cell([p(run(qty, { size: 15, color: SOFT }), { align: AlignmentType.CENTER, line: 250 })], { ...cellPad, borders: bodyBorders, w: 0 }),
    cell([p(run(rate, { size: 15, color: SOFT }), { align: AlignmentType.RIGHT, line: 250 })], { ...cellPad, borders: bodyBorders, w: 0 }),
    cell([p(run(tot, { size: 15, bold: true }), { align: AlignmentType.RIGHT, line: 250 })], { ...cellPad, borders: bodyBorders, w: 0 }),
  ],
}));
const itemsTable = new Table({
  rows: [headRow, ...itemRows],
  width: { size: 100, type: WidthType.PERCENTAGE },
  columnWidths: COLS.map(c => Math.round(convertMillimetersToTwip(182) * c / 100)),
  layout: "fixed",
  borders: noBorders,
});

/* ---------- summary + totals ---------- */
function totLine(k, v, o = {}) {
  return table([new TableRow({ children: [
    cell([p(run(k, { size: 13, bold: true, ls: 26, caps: true, color: o.strong ? INK : INK }))], { w: 50, mt: 70, mb: 70 }),
    cell([p(run(v, { size: o.big ? 30 : 15, bold: !!o.big, color: SOFT }), { align: AlignmentType.RIGHT })], { w: 50, mt: 70, mb: 70 }),
  ]})]);
}
const grand = table([new TableRow({ children: [
  cell([p(run("Total due", { size: 16, bold: true, ls: 26, caps: true }))], { w: 46, mt: 150, mb: 40, va: VerticalAlign.BOTTOM, borders: { top: b(LINE, 6), bottom: NONE, left: NONE, right: NONE } }),
  cell([p(run("€3,000.00", { size: 30, bold: true }), { align: AlignmentType.RIGHT })], { w: 54, mt: 150, mb: 40, va: VerticalAlign.BOTTOM, borders: { top: b(LINE, 6), bottom: NONE, left: NONE, right: NONE } }),
]})]);

const summary = table([new TableRow({ children: [
  cell([
    p([
      run("Single project. ", { size: 13, bold: true, color: SOFT }),
      run("All items above form one indivisible engagement — the full-cycle development and launch of the Client's website — and are billed together as a single deliverable. Total 38 hours.", { size: 13, color: MUTE }),
    ], { line: 250 }),
  ], { w: 55, mr: 500, mt: 200 }),
  cell([totLine("Subtotal", "€2,500.00"), totLine("VAT 20%", "€500.00"), grand], { w: 45, mt: 160 }),
]})]);

/* ---------- lower ---------- */
function kv(k, vLines) {
  return new Table({
    rows: [new TableRow({ children: [
      new TableCell({ children: [p(run(k, { size: 12, bold: true, ls: 20, caps: true, color: MUTE }))],
        borders: noBorders, shading: shade, margins: { top: 20, bottom: 20, left: 0, right: 0 },
        width: { size: convertMillimetersToTwip(17), type: WidthType.DXA } }),
      new TableCell({ children: vLines.map(t => body(t)),
        borders: noBorders, shading: shade, margins: { top: 20, bottom: 20, left: 0, right: 0 },
        width: { size: convertMillimetersToTwip(83), type: WidthType.DXA } }),
    ]})],
    width: { size: convertMillimetersToTwip(100), type: WidthType.DXA },
    columnWidths: [convertMillimetersToTwip(17), convertMillimetersToTwip(83)],
    layout: "fixed",
    borders: noBorders,
  });
}
const lower = table([new TableRow({ children: [
  cell([
    label("Bank details"),
    kv("Bank", ["VIVABANK S.A.", "18–20 Amarousiou Chalandriou Ave.,", "Marousi 151 25, Greece"]),
    kv("IBAN", ["GR39 0570 0000 0007 9018 6298 335"]),
    kv("SWIFT", ["PRXBGRAA"]),
    kv("Currency", ["EUR"]),
    kv("Benef.", ["Fourtress Commerce Ltd"]),
  ], { w: 58, mr: 300 }),
  cell([
    label("Terms & conditions"),
    p(run("Payment is due within 15 calendar days of the invoice date by bank transfer to the account stated. All bank charges on the sender's side are borne by the Client. Intellectual property in the delivered work transfers to the Client upon receipt of payment in full. Services are invoiced as one project; partial acceptance of individual items does not apply.", { size: 14, color: SOFT }), { line: 260 }),
  ], { w: 42 }),
]})]);

/* ---------- signature ---------- */
const signBlock = table([new TableRow({ children: [
  cell([
    p(run("For any questions, please contact", { size: 13, bold: true, ls: 18, caps: true }), { line: 260 }),
    p(run("fortreskltd@gmail.com  or  +359 877 173 509", { size: 13, bold: true, ls: 18, caps: true }), { line: 260, after: 80 }),
    p(run("Thank you for your business.", { size: 14, color: SOFT })),
  ], { w: 55, mr: 500, va: VerticalAlign.BOTTOM }),
  cell([
    empty(0),
    empty(0),
    ruleP(LINE, 6, 340, 60),
    table([new TableRow({ children: [
      cell([p(run("Sergey Sergeev", { size: 13, bold: true, ls: 30, caps: true }))], { w: 60 }),
      cell([p(run("Director", { size: 13, bold: true, ls: 30, caps: true, color: MUTE }), { align: AlignmentType.RIGHT })], { w: 40 }),
    ]})]),
  ], { w: 45, va: VerticalAlign.BOTTOM }),
]})]);

const doc = new Document({
  background: { color: PAPER },
  styles: { default: { document: { run: { font: F, size: 15, color: INK } } } },
  sections: [{
    properties: {
      page: {
        size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) },
        margin: {
          top: convertMillimetersToTwip(12), bottom: convertMillimetersToTwip(10),
          left: convertMillimetersToTwip(14), right: convertMillimetersToTwip(14),
        },
      },
    },
    children: [
      brandRow,
      wordmark,
      ruleP(LINE, 6, 60, 0),
      empty(220),
      parties,
      empty(260),
      itemsTable,
      summary,
      empty(180),
      ruleP(LINE, 6, 0, 0),
      empty(220),
      lower,
      empty(360),
      ruleP(HAIR, 4, 0, 0),
      empty(180),
      signBlock,
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("Invoice_109_Fourtress_Commerce_Ltd.docx", buf);
  console.log("docx written", buf.length);
});
