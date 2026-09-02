const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, VerticalAlign, Footer,
  PageOrientation, TableLayoutType,
} = require('docx');

const INK = '14150F', MUTED = '8C8A82', RULE = 'C9C6BC', PAPER = 'EFEDE8', SOFT = '6E6C64';
const FONT = 'Inter';
const NONE = { style: BorderStyle.NONE, size: 0, color: 'auto' };
const NOB = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
const W = 9184; // content width in twips

const r = (text, o = {}) => new TextRun({
  text, font: FONT, size: o.size || 16, bold: !!o.bold,
  color: o.color || INK, characterSpacing: o.spacing, break: o.break,
});
const p = (runs, o = {}) => new Paragraph({
  children: Array.isArray(runs) ? runs : [runs],
  alignment: o.align,
  spacing: { before: o.before || 0, after: o.after === undefined ? 0 : o.after, line: o.line || 280, lineRule: 'auto' },
  border: o.border,
});
const gap = (h) => new Paragraph({
  children: [new TextRun({ text: '', font: FONT, size: 2 })],
  spacing: { before: 0, after: h, line: 20, lineRule: 'exact' },
});
const cell = (children, w, right = 0) => new TableCell({
  children, width: { size: w, type: WidthType.DXA }, borders: NOB,
  margins: { top: 0, bottom: 0, left: 0, right }, verticalAlign: VerticalAlign.TOP,
});
const tbl = (rows, widths, o = {}) => new Table({
  rows, columnWidths: widths, layout: TableLayoutType.FIXED,
  width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
  borders: NOB, alignment: o.align,
});
const rule = () => new Paragraph({
  children: [new TextRun({ text: '', font: FONT, size: 2 })],
  spacing: { before: 0, after: 0, line: 20, lineRule: 'exact' },
  border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: RULE, space: 1 } },
});
const eyebrow = (t, align) => p(r(t.toUpperCase(), { size: 12, bold: true, color: MUTED, spacing: 34 }), { after: 120, align });

const kv = (k, lines) => tbl([new TableRow({
  children: [cell([p(r(k, { color: MUTED }))], 820), cell(lines.map((l) => p(r(l))), 1880)],
})], [820, 1880]);

const items = [
  ['Browser advertising campaign setup and audience targeting', '0.50 h  ·  €80.00 / h', '€40.00'],
  ['Email advertising campaign preparation and distribution', '0.75 h  ·  €60.00 / h', '€45.00'],
  ['Ad copy adaptation and campaign performance review', '0.25 h  ·  €100.00 / h', '€25.00'],
];

const totRow = (l, v, o = {}) => new TableRow({
  children: [
    cell([p(r(l, { bold: o.bold }))], 2300, 120),
    cell([p(r(v, { bold: o.bold, color: o.vcolor || INK }), { align: AlignmentType.RIGHT })], 1900),
  ],
});

const doc = new Document({
  background: { color: PAPER },
  styles: { default: { document: { run: { font: FONT, size: 16, color: INK } } } },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT },
        margin: { top: 1474, bottom: 1191, left: 1361, right: 1361, footer: 567 },
      },
    },
    children: [
      tbl([new TableRow({
        children: [
          cell([p([r('Jose Luis', { size: 29 }), r('Serrano Anson', { size: 29, break: 1 })], { line: 300 })], 4592),
          cell([p(r('INVOICE', { size: 66, spacing: -20 }), { align: AlignmentType.RIGHT, line: 240 })], 4592),
        ],
      })], [4592, 4592]),

      gap(900),

      tbl([new TableRow({
        children: [
          cell([
            eyebrow('From'),
            p(r('Jose Luis Serrano Anson', { bold: true }), { after: 80 }),
            kv('Address', ['Calle de Majo 16', '28014 Barcelona', 'Spain']),
          ], 3100, 400),
          cell([
            eyebrow('Bill to'),
            p(r('ZBK PRO', { bold: true }), { after: 80 }),
            kv('Address', ['28 Rue Julien Gracq', '37100 Tours', 'France']),
          ], 3100, 400),
          cell([
            eyebrow('Invoice', AlignmentType.RIGHT),
            p(r('#2026-08-01', { size: 25, bold: true }), { align: AlignmentType.RIGHT, after: 160 }),
            p([r('Issued', { color: MUTED }), r('     31 August 2026')], { align: AlignmentType.RIGHT }),
            p([r('Service date', { color: MUTED }), r('     31 August 2026')], { align: AlignmentType.RIGHT }),
            p([r('Currency', { color: MUTED }), r('     EUR')], { align: AlignmentType.RIGHT }),
          ], 2984),
        ],
      })], [3100, 3100, 2984]),

      gap(1100),
      p(r('Description', { size: 30, spacing: -8 }), { after: 360, line: 320 }),

      tbl(items.map(([d, s, a]) => new TableRow({
        children: [
          cell([p(r(d), { after: 30 }), p(r(s, { size: 14, color: MUTED }), { after: 330 })], 6800, 300),
          cell([p(r(a), { align: AlignmentType.RIGHT })], 2384),
        ],
      })), [6800, 2384]),

      rule(),
      gap(330),

      tbl([
        totRow('Subtotal', '€110.00'),
        totRow('VAT', 'Not applicable', { vcolor: MUTED }),
        totRow('Total due', '€110.00', { bold: true }),
        new TableRow({ children: [cell([gap(90), rule(), gap(90)], 2300), cell([gap(90), rule(), gap(90)], 1900)] }),
        totRow('Due date', '15 September 2026'),
      ], [2300, 1900], { align: AlignmentType.RIGHT }),

      gap(2000),

      tbl([new TableRow({
        children: [
          cell([
            p(r('Payment', { size: 23, spacing: -6 }), { after: 200, line: 300 }),
            p(r('Payment by bank transfer in euro to the account of Jose Luis Serrano Anson.'), { after: 150 }),
            p(r('Bank details are provided to the client separately. Please quote invoice #2026-08-01 as the payment reference.', { color: SOFT })),
          ], 4592, 600),
          cell([
            p(r('Terms', { size: 23, spacing: -6 }), { after: 200, line: 300 }),
            p(r('Payment is due within 15 days of the invoice date. The services above were supplied on 31 August 2026 and are billed in full.'), { after: 150 }),
            p(r('VAT is not applicable: the services are supplied by a private individual who is not registered as a taxable person for VAT purposes, so no VAT is charged and no reverse charge applies.', { color: SOFT })),
          ], 4592),
        ],
      })], [4592, 4592]),
    ],
    footers: {
      default: new Footer({
        children: [
          rule(),
          gap(70),
          tbl([new TableRow({
            children: [
              cell([p(r('JOSE LUIS SERRANO ANSON  ·  BARCELONA, SPAIN', { size: 12, color: '97958D', spacing: 20 }))], 4592),
              cell([p(r('INVOICE #2026-08-01  ·  PAGE 1 OF 1', { size: 12, color: '97958D', spacing: 20 }), { align: AlignmentType.RIGHT })], 4592),
            ],
          })], [4592, 4592]),
        ],
      }),
    },
  }],
});

Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync('Invoice_2026-08-01_Serrano_Anson.docx', b);
  console.log('docx written', b.length);
});
