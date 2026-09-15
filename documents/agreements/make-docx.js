const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Footer,
  WidthType, BorderStyle, AlignmentType, VerticalAlign, ShadingType,
  PageNumber, convertMillimetersToTwip,
} = require("docx");

const INK="16171A", SOFT="3C3E44", MUTE="6E7076", PAPER="E7E3DA", LINE="B6B1A5", HAIR="CFCABE";
const F = "Inter";
const NONE = { style: BorderStyle.NONE, size: 0, color: "auto" };
const noBorders = { top: NONE, bottom: NONE, left: NONE, right: NONE };
const b = (color, sz) => ({ style: BorderStyle.SINGLE, size: sz, color });
const shade = { type: ShadingType.CLEAR, color: "auto", fill: PAPER };
const CONTENT_MM = 178; // 210 - 2*16

function run(t, o = {}) {
  return new TextRun({ text: t, font: F, size: o.size || 16, bold: !!o.bold,
    italics: !!o.italic, color: o.color || INK, characterSpacing: o.ls || 0, allCaps: !!o.caps });
}
// rich text: array of [text, opts]
function rich(parts, base = {}) { return parts.map(([t, o]) => run(t, { ...base, ...(o || {}) })); }
function p(children, o = {}) {
  return new Paragraph({
    children: Array.isArray(children) ? children : [children],
    alignment: o.align, indent: o.indent, pageBreakBefore: o.pageBreakBefore,
    keepNext: o.keepNext, border: o.border,
    spacing: { before: o.before || 0, after: o.after === undefined ? 0 : o.after,
               line: o.line || 250, lineRule: o.lineRule },
  });
}
const empty = (h) => new Paragraph({ children: [new TextRun({ text: "", size: 2, font: F })],
  spacing: { after: h, line: 20, lineRule: "exact" } });
const ruleP = (color = LINE, sz = 6, before = 0, after = 0) =>
  new Paragraph({ children: [new TextRun({ text: "", size: 2, font: F })],
    border: { bottom: b(color, sz) }, spacing: { before, after, line: 20, lineRule: "exact" } });

function cell(children, o = {}) {
  return new TableCell({ children, borders: o.borders || noBorders, shading: shade,
    ...(o.w === undefined ? {} : { width: { size: o.w, type: o.wt || WidthType.DXA } }),
    margins: { top: o.mt || 0, bottom: o.mb || 0, left: o.ml || 0, right: o.mr || 0 },
    verticalAlign: o.va });
}
function grid(cols, rows, o = {}) {   // cols in mm
  const widths = cols.map(convertMillimetersToTwip);
  return new Table({ rows, layout: "fixed", borders: noBorders,
    width: { size: widths.reduce((a, c) => a + c, 0), type: WidthType.DXA }, columnWidths: widths, ...o });
}

/* ---------- building blocks ---------- */
const LBL = (t) => p(run(t, { size: 12, bold: true, ls: 34, caps: true }), { after: 60 });
const TXT = (parts, o = {}) => p(rich(parts, { size: 16, color: SOFT }),
  { align: AlignmentType.JUSTIFIED, after: o.after === undefined ? 80 : o.after, line: 260, indent: o.indent });

function h2(n, title) {
  return [
    ruleP(HAIR, 4, 200, 0),
    p([run(n + " ", { size: 15, bold: true, ls: 28, color: MUTE }), run(title, { size: 15, bold: true, ls: 28, caps: true })],
      { before: 120, after: 90, keepNext: true }),
  ];
}
// numbered clause: hanging indent with manual number
function clause(num, parts) {
  return new Paragraph({
    children: [run(num + "\t", { size: 16, bold: true }), ...rich(parts, { size: 16, color: SOFT })],
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: convertMillimetersToTwip(9), hanging: convertMillimetersToTwip(9) },
    tabStops: [{ type: "left", position: convertMillimetersToTwip(9) }],
    spacing: { after: 80, line: 260 },
  });
}
function dash(text) {
  return new Paragraph({
    children: [run("—\t", { size: 16, color: MUTE }), run(text, { size: 16, color: SOFT })],
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: convertMillimetersToTwip(13.5), hanging: convertMillimetersToTwip(4.5) },
    tabStops: [{ type: "left", position: convertMillimetersToTwip(13.5) }],
    spacing: { after: 50, line: 250 },
  });
}
function catTable(rows, o = {}) {
  const cols = o.cols || [52, 80, 46];
  const head = new TableRow({ tableHeader: true, cantSplit: true, children:
    (o.head || ["Service", "Scope", "Indicative rate"]).map((t, i) =>
      cell([p(run(t, { size: 12, bold: true, ls: 26, caps: true }),
        { align: i === cols.length - 1 ? AlignmentType.RIGHT : AlignmentType.LEFT })],
        { mt: 110, mb: 110, ml: 120, mr: 120, borders: { top: b(LINE, 6), bottom: b(LINE, 6), left: NONE, right: NONE } })) });
  const body = rows.map(r => new TableRow({ cantSplit: true, children: r.map((t, i) =>
    cell([p(run(t, { size: 15, bold: i === 0, color: i === 0 ? INK : SOFT }),
      { align: i === cols.length - 1 ? AlignmentType.RIGHT : AlignmentType.LEFT, line: 250 })],
      { mt: 120, mb: 120, ml: 120, mr: 120, borders: { top: NONE, bottom: b(HAIR, 4), left: NONE, right: NONE } })) }));
  return grid(cols, [head, ...body]);
}
function signBlock() {
  const col = (label, name, role) => cell([
    LBL(label), empty(40),
    ruleP(LINE, 6, 700, 80),
    p(run(name, { size: 13, bold: true, ls: 30, caps: true }), { after: 30 }),
    p(run(role, { size: 13, color: MUTE, ls: 12 })),
  ], { w: convertMillimetersToTwip(82), mr: 400, va: VerticalAlign.BOTTOM });
  return grid([86, 86], [new TableRow({ cantSplit: true, children: [
    col("For the Provider", "Sergey Sergeev", "Director, Fourtress Commerce Ltd · Varna, 22.08.2026"),
    col("The Client", "Michel Morin", "Saint-Vigor-le-Grand, 22.08.2026"),
  ]})]);
}

/* ---------- header / parties ---------- */
const brandRow = grid([100, 78], [new TableRow({ children: [
  cell([p(run("Fourtress Commerce Ltd", { size: 12, bold: true, ls: 44, caps: true, color: SOFT }))], { w: convertMillimetersToTwip(100) }),
  cell([p(run("Varna · Bulgaria", { size: 12, bold: true, ls: 44, caps: true, color: SOFT }), { align: AlignmentType.RIGHT })], { w: convertMillimetersToTwip(78) }),
]})]);

const wordmark = p(run("AGREEMENT", { size: 150, bold: true, ls: -78 }), { before: 220, after: 60, line: 1280, lineRule: "exact" });
const subword = p(run("Services Framework Agreement", { size: 16, bold: true, ls: 40, caps: true, color: SOFT }), { after: 60 });

const refRow = (k, v) => grid([30, 37], [new TableRow({ children: [
  cell([p(run(k, { size: 15, color: SOFT }), { align: AlignmentType.RIGHT })], { w: convertMillimetersToTwip(30), mr: 120 }),
  cell([p(run(v, { size: 15, bold: true }), { align: AlignmentType.RIGHT })], { w: convertMillimetersToTwip(37) }),
]})]);

const parties = grid([60, 50, 68], [new TableRow({ children: [
  cell([LBL("Provider"), p(run("Fourtress Commerce Ltd", { size: 17, bold: true }), { after: 40 }),
    ...["Company No. 204154873", "5, Parizhka Komuna Str., Office 3,", "Ground Floor, Varna 9000, Bulgaria",
        "Represented by Sergey Sergeev, Director", "fortreskltd@gmail.com · +359 877 173 509"]
      .map(t => p(run(t, { size: 15, color: SOFT }), { line: 250 }))],
    { w: convertMillimetersToTwip(60), mr: 300 }),
  cell([LBL("Client"), p(run("Michel Morin", { size: 17, bold: true }), { after: 40 }),
    ...["4 Résidence Beausoleil", "14400 Saint-Vigor-le-Grand", "France"]
      .map(t => p(run(t, { size: 15, color: SOFT }), { line: 250 }))],
    { w: convertMillimetersToTwip(50), mr: 300 }),
  cell([p(run("Agreement", { size: 12, bold: true, ls: 34, caps: true }), { after: 60, align: AlignmentType.RIGHT }),
    p(run("No. FC-2026/112", { size: 22, bold: true }), { after: 70, align: AlignmentType.RIGHT }),
    refRow("Date of execution", "22.08.2026"), refRow("Place", "Varna, Bulgaria"),
    refRow("Initial term", "22.08.2026 – 21.08.2027"), refRow("Currency", "EUR (€)"), refRow("Language", "English")],
    { w: convertMillimetersToTwip(68) }),
]})]);

/* ---------- body content ---------- */
const body = [];
const push = (...x) => x.forEach(i => body.push(i));

push(brandRow, wordmark, subword, ruleP(LINE, 6, 160, 0), empty(220), parties, empty(140), ruleP(LINE, 6, 0, 0));

push(...h2("", "Preamble"));
push(TXT([["This Services Framework Agreement (the "], ["“Agreement”", { bold: true, color: INK }],
  [") is made on "], ["22 August 2026", { bold: true, color: INK }], [" in Varna, Bulgaria, between "],
  ["Fourtress Commerce Ltd", { bold: true, color: INK }],
  [", a limited liability company incorporated and existing under the laws of the Republic of Bulgaria, registered under company number 204154873, with its seat and registered address at 5, Parizhka Komuna Str., Office 3, Ground Floor, Varna 9000, Bulgaria, represented by its Director Sergey Sergeev (the "],
  ["“Provider”", { bold: true, color: INK }], ["), and "], ["Michel Morin", { bold: true, color: INK }],
  [", an individual residing at 4 Résidence Beausoleil, 14400 Saint-Vigor-le-Grand, France (the "],
  ["“Client”", { bold: true, color: INK }], ["), each a "], ["“Party”", { bold: true, color: INK }],
  [" and together the "], ["“Parties”", { bold: true, color: INK }], ["."]]));
push(TXT([["Whereas the Provider carries on, as its registered economic activity, the business of web development, information technology services, e-commerce, digital marketing and online advertising, and possesses the personnel, technical means and professional capacity required to perform the services described in this Agreement; and whereas the Client wishes to commission such services from the Provider from time to time on a non-exclusive basis; the Parties have agreed as follows."]]));

const B = (t) => [t, { bold: true, color: INK }];

push(...h2("1.", "Definitions and interpretation"));
push(clause("1.", [B("“Services”"), [" means any of the services listed in Annex 1, as ordered by the Client and accepted by the Provider under clause 4."]]));
push(clause("2.", [B("“Service Order”"), [" means a specific order for Services placed under this Agreement, in any form permitted by clause 4, including scope, deliverables, fees and delivery dates."]]));
push(clause("3.", [B("“Deliverables”"), [" means the results of the Services, including designs, source code, configurations, texts, images and documentation delivered to the Client."]]));
push(clause("4.", [B("“Project”"), [" means a group of Services ordered and delivered as one indivisible engagement and invoiced as a single item."]]));
push(clause("5.", [["Headings are for convenience only and do not affect interpretation. The singular includes the plural. References to a clause or annex are references to a clause of, or annex to, this Agreement."]]));

push(...h2("2.", "Subject matter and framework nature"));
push(clause("1.", [["This Agreement sets out the general terms on which the Provider supplies Services to the Client. It qualifies as a contract for work and services ("], ["договор за изработка и за услуга", { italic: true }], [") under Articles 258 et seq. and Articles 280 et seq. of the Bulgarian Obligations and Contracts Act."]]));
push(clause("2.", [["This Agreement creates "], B("no minimum volume obligation"), [" for either Party. The Client is under no obligation to order any Services, and the Provider is under no obligation to accept any particular Service Order."]]));
push(clause("3.", [["The Provider performs the Services as an independent contractor. Nothing in this Agreement creates an employment relationship, partnership, joint venture or agency between the Parties."]]));
push(clause("4.", [["The Parties confirm that any invoice issued by the Provider to the Client on or after the date of this Agreement for Services falling within Annex 1 is deemed issued under, and governed by, this Agreement, whether or not it refers to it expressly."]]));

push(...h2("3.", "Connection between the Provider’s registered activity and the Services"));
push(clause("1.", [["The Provider’s registered scope of business comprises digital marketing, online advertising, e-commerce, information technology services and web development."]]));
push(clause("2.", [["Each category of Services set out in Annex 1 falls directly within that registered scope of business, as follows:"]]));
push(dash("Annex 1, Section A (Web design and development) — corresponds to the Provider’s registered activity of web development and information technology services."));
push(dash("Annex 1, Section B (E-commerce) — corresponds to the Provider’s registered activity of e-commerce and web development."));
push(dash("Annex 1, Section C (Digital marketing and online advertising) — corresponds to the Provider’s registered activity of digital marketing and online advertising."));
push(dash("Annex 1, Section D (IT services, hosting and support) — corresponds to the Provider’s registered activity of information technology services."));
push(empty(40));
push(clause("3.", [["The Provider warrants that it performs no Services under this Agreement outside its registered scope of business, and that it holds all registrations required under Bulgarian law for the performance of the Services."]]));

push(...h2("4.", "Ordering procedure"));
push(clause("1.", [["The Client may place a Service Order in writing, by e-mail, or through any other durable medium agreed between the Parties. A Service Order shall state the Services requested and, where relevant, the desired delivery date."]]));
push(clause("2.", [["A Service Order becomes binding when the Provider confirms it in writing or by e-mail, or when the Provider commences performance of the Services with the Client’s knowledge."]]));
push(clause("3.", [["Where Services are ordered as one Project, they form a single indivisible engagement: the Deliverables are accepted, invoiced and paid as a whole, and individual items within the Project are not separately acceptable or separately terminable."]]));
push(clause("4.", [["Any change to the scope of an accepted Service Order requires the written agreement of both Parties and may result in an adjustment of fees and delivery dates."]]));

push(...h2("5.", "Term"));
push(clause("1.", [["This Agreement enters into force on "], B("22 August 2026"), [" and is concluded for an initial term of twelve (12) months, expiring on "], B("21 August 2027"), ["."]]));
push(clause("2.", [["Upon expiry of the initial term the Agreement is automatically renewed for successive periods of twelve (12) months, unless either Party gives written notice of non-renewal no later than thirty (30) days before the end of the then-current term."]]));
push(clause("3.", [["Expiry or termination of this Agreement does not affect any Service Order already accepted, which shall be completed and paid for under the terms of this Agreement."]]));

push(...h2("6.", "Fees, invoicing and payment"));
push(clause("1.", [["Fees are agreed per Service Order, either on a time basis at the hourly rates indicated in Annex 1, or as a fixed Project fee. All fees are stated in euro (EUR)."]]));
push(clause("2.", [["The Provider invoices the Client upon delivery of the Services or of an agreed stage of a Project. Invoices are payable within "], B("fifteen (15) calendar days"), [" of the invoice date."]]));
push(clause("3.", [["Payment is made by bank transfer to the Provider’s account: "], B("VIVABANK S.A."), [", 18–20 Amarousiou Chalandriou Ave., Marousi 151 25, Greece, "], B("IBAN GR39 0570 0000 0007 9018 6298 335"), [", "], B("SWIFT/BIC PRXBGRAA"), [", currency EUR. All bank charges on the sender’s side are borne by the Client."]]));
push(clause("4.", [["Where a discount is granted, it is applied to the VAT-inclusive amount of the relevant invoice and is shown as a separate line on that invoice."]]));
push(clause("5.", [["In case of late payment the Provider may charge statutory default interest under Bulgarian law from the day following the due date until payment in full."]]));
push(clause("6.", [["The following invoice is issued under this Agreement and forms part of it:"]]));
push(empty(40));
push(catTable([["112", "01.09.2026", "Full-cycle development and launch of the Client’s website, supplied as a single Project", "Section A", "€5,000.00"]],
  { cols: [24, 26, 66, 26, 36], head: ["Invoice No.", "Date", "Subject", "Annex 1 section", "Amount incl. VAT"] }));
push(empty(120));

push(...h2("7.", "Obligations of the Provider"));
push(clause("1.", [["To perform the Services with the professional care, skill and diligence reasonably expected of a provider of comparable services, and in accordance with the accepted Service Order."]]));
push(clause("2.", [["To use personnel with the qualifications required for the Services, and to remain responsible for any subcontractor it engages as for its own acts."]]));
push(clause("3.", [["To inform the Client without undue delay of any circumstance that may prevent or delay delivery."]]));
push(clause("4.", [["To hand over the Deliverables together with the access credentials and documentation reasonably required for their use."]]));

push(...h2("8.", "Obligations of the Client"));
push(clause("1.", [["To provide, in good time, the content, materials, access rights and decisions necessary for the Provider to perform the Services."]]));
push(clause("2.", [["To warrant that any material supplied to the Provider does not infringe third-party rights, and to hold the Provider harmless against claims arising from such material."]]));
push(clause("3.", [["To review Deliverables submitted for acceptance and to respond within the period set in clause 9."]]));
push(clause("4.", [["To pay the agreed fees in accordance with clause 6."]]));

push(...h2("9.", "Delivery and acceptance"));
push(clause("1.", [["The Provider submits the Deliverables to the Client by e-mail, by handover of access to a staging or production environment, or by any other agreed means."]]));
push(clause("2.", [["The Client shall examine the Deliverables and notify the Provider of any defect within "], B("ten (10) calendar days"), [" of submission. Deliverables not objected to within that period are deemed accepted."]]));
push(clause("3.", [["Defects duly notified within that period shall be remedied by the Provider free of charge within a reasonable time. Requests that go beyond the agreed scope constitute a new Service Order."]]));
push(clause("4.", [["Putting a Deliverable into live commercial use constitutes acceptance of that Deliverable."]]));

push(...h2("10.", "Intellectual property"));
push(clause("1.", [["Upon receipt by the Provider of payment in full for the relevant Services, all transferable intellectual property rights in the Deliverables pass to the Client, for an unlimited term and without territorial restriction."]]));
push(clause("2.", [["Until payment in full, the Provider retains all rights in the Deliverables, and the Client has no right to use them commercially."]]));
push(clause("3.", [["Pre-existing know-how, tools, libraries, frameworks and reusable components of the Provider remain its property; the Client receives a non-exclusive, perpetual, royalty-free licence to use them to the extent they are incorporated in the Deliverables."]]));
push(clause("4.", [["Third-party components (including open-source software, fonts and stock media) remain subject to their own licence terms, which the Provider shall identify on request."]]));
push(clause("5.", [["The Provider may name the Client and show the Deliverables in its portfolio and reference lists, unless the Client objects in writing."]]));

push(...h2("11.", "Confidentiality"));
push(clause("1.", [["Each Party shall keep confidential all non-public information obtained from the other Party in connection with this Agreement, and shall use it solely for the purpose of performing this Agreement."]]));
push(clause("2.", [["This obligation does not apply to information that is or becomes public without breach of this Agreement, that was lawfully known before disclosure, or whose disclosure is required by law or by a competent authority."]]));
push(clause("3.", [["The confidentiality obligation survives the termination of this Agreement for a period of three (3) years."]]));

push(...h2("12.", "Data protection"));
push(clause("1.", [["Each Party shall comply with Regulation (EU) 2016/679 (GDPR) and, as applicable, the Bulgarian Personal Data Protection Act and the French Act No. 78-17 of 6 January 1978 as amended."]]));
push(clause("2.", [["Where the Provider processes personal data on behalf of the Client in the course of the Services, it acts as a processor, processes such data only on the Client’s documented instructions, applies appropriate technical and organisational measures, and imposes equivalent obligations on any sub-processor."]]));
push(clause("3.", [["Personal data of the Parties’ representatives is processed for the purposes of concluding and performing this Agreement and for compliance with statutory accounting and tax retention obligations."]]));

push(...h2("13.", "VAT treatment"));
push(clause("1.", [["The Client is a non-taxable person established in France. Accordingly, the place of supply of the Services is the place where the Provider has established its business, pursuant to Article 45 of Council Directive 2006/112/EC and Article 21(1) of the Bulgarian Value Added Tax Act."]]));
push(clause("2.", [["The Services are therefore subject to Bulgarian value added tax at the standard rate of "], B("20%"), [", which the Provider charges and accounts for in Bulgaria. Invoices state the taxable amount and the VAT separately."]]));
push(clause("3.", [["The Services are supplied by the Provider’s personnel and are not electronically supplied services within the meaning of Article 58 of Directive 2006/112/EC and Article 7(3) of Implementing Regulation (EU) No 282/2011."]]));
push(clause("4.", [["Should the Client at any time acquire the status of a taxable person identified for VAT purposes in another Member State, and notify the Provider of a valid VAT identification number, the Parties shall apply the reverse charge mechanism under Article 196 of Directive 2006/112/EC to supplies made after that notification."]]));

push(...h2("14.", "Warranties and liability"));
push(clause("1.", [["The Provider warrants that the Deliverables will materially conform to the accepted Service Order for a period of three (3) months from acceptance, and shall remedy non-conformities notified within that period free of charge."]]));
push(clause("2.", [["The Provider gives no warranty that the Deliverables will achieve any particular commercial result, search-engine position or level of traffic."]]));
push(clause("3.", [["Save in cases of intent or gross negligence, the aggregate liability of the Provider under or in connection with a Service Order is limited to the amount actually paid by the Client for that Service Order."]]));
push(clause("4.", [["The Provider is not liable for indirect or consequential loss, loss of profit, loss of data or loss of business opportunity, save in cases of intent or gross negligence."]]));
push(clause("5.", [["Nothing in this clause limits or excludes any liability that cannot be limited or excluded under applicable mandatory law, including any mandatory consumer protection rules applicable to the Client."]]));

push(...h2("15.", "Force majeure"));
push(clause("1.", [["Neither Party is liable for a failure to perform caused by an event beyond its reasonable control, including natural disaster, war, civil unrest, act of a public authority, general strike, epidemic, or failure of telecommunications or electricity networks not attributable to that Party."]]));
push(clause("2.", [["The affected Party shall notify the other Party without undue delay. If the event continues for more than sixty (60) days, either Party may terminate the affected Service Order by written notice, and the Client shall pay for the Services performed up to that date."]]));

push(...h2("16.", "Termination"));
push(clause("1.", [["Either Party may terminate this Agreement for convenience by giving thirty (30) days’ written notice, without affecting Service Orders already accepted."]]));
push(clause("2.", [["Either Party may terminate this Agreement or any Service Order with immediate effect if the other Party commits a material breach and fails to remedy it within fifteen (15) days of a written request to do so."]]));
push(clause("3.", [["The Provider may suspend performance if an undisputed invoice remains unpaid for more than thirty (30) days after its due date."]]));
push(clause("4.", [["On termination, the Client shall pay for all Services performed up to the effective date of termination, and the Provider shall hand over the Deliverables paid for."]]));

push(...h2("17.", "Notices"));
push(clause("1.", [["Notices under this Agreement are given in writing to the addresses stated on the first page, or by e-mail to the address of the relevant Party notified for that purpose."]]));
push(clause("2.", [["A notice sent by e-mail is deemed received on the next business day following dispatch, unless the sender receives a delivery failure notification."]]));

push(...h2("18.", "Governing law and jurisdiction"));
push(clause("1.", [["This Agreement is governed by the substantive law of the Republic of Bulgaria."]]));
push(clause("2.", [["The Parties shall attempt to settle any dispute amicably. Failing agreement, the dispute shall be referred to the competent court in Varna, Bulgaria."]]));
push(clause("3.", [["Clause 18.2 does not deprive the Client, where acting as a consumer, of the protection afforded by the mandatory provisions of the law of their country of habitual residence, nor of the right to bring proceedings before the courts of that country, in accordance with Regulation (EU) No 1215/2012."]]));

push(...h2("19.", "Final provisions"));
push(clause("1.", [["This Agreement, together with Annex 1 and the accepted Service Orders, constitutes the entire agreement between the Parties on its subject matter."]]));
push(clause("2.", [["Annex 1 forms an integral part of this Agreement. In case of conflict, the body of this Agreement prevails, except as to prices and technical specifications, where Annex 1 prevails."]]));
push(clause("3.", [["Amendments are valid only if made in writing and signed by both Parties. An exchange of signed scanned documents by e-mail satisfies this requirement."]]));
push(clause("4.", [["If any provision is or becomes invalid, the remainder of the Agreement remains in force, and the Parties shall replace the invalid provision with a valid one of equivalent economic effect."]]));
push(clause("5.", [["Neither Party may assign this Agreement without the prior written consent of the other Party."]]));
push(clause("6.", [["This Agreement is executed in English, in two originals of equal legal force, one for each Party."]]));

push(empty(200), signBlock());

/* ---------- Annex 1 ---------- */
push(new Paragraph({ children: [new TextRun({ text: "", size: 2, font: F })], pageBreakBefore: true, spacing: { after: 0, line: 20, lineRule: "exact" } }));
push(grid([100, 78], [new TableRow({ children: [
  cell([p(run("Fourtress Commerce Ltd", { size: 12, bold: true, ls: 44, caps: true, color: SOFT }))], { w: convertMillimetersToTwip(100) }),
  cell([p(run("Agreement No. FC-2026/112 · 22.08.2026", { size: 12, bold: true, ls: 44, caps: true, color: SOFT }), { align: AlignmentType.RIGHT })], { w: convertMillimetersToTwip(78) }),
]})]));
push(p(run("Annex 1", { size: 52, bold: true, ls: -30, caps: true }), { before: 260, after: 70, line: 620, lineRule: "exact" }));
push(p(run("Catalogue of Services and indicative rates", { size: 15, bold: true, ls: 36, caps: true, color: SOFT }), { after: 60 }));
push(ruleP(LINE, 6, 140, 0), empty(140));
push(TXT([["This catalogue is "], B("non-exhaustive"), [" and indicative. The scope of any item may be extended, reduced or combined at the Client’s request. Rates are shown net of VAT and serve as a basis for quotation; the fee for each Service Order is the fee confirmed under clause 4. Annex 1 forms an integral part of the Agreement dated 22 August 2026."]], { after: 120 }));

const h3 = (n, t) => p([run(n + "  ", { size: 14, bold: true, ls: 26, color: MUTE }), run(t, { size: 14, bold: true, ls: 26, caps: true })], { before: 220, after: 80, keepNext: true });

push(h3("A.", "Web design and development"));
push(catTable([
  ["Discovery and specification", "Requirements workshop, technical specification, sitemap, information architecture", "€55–80 / h"],
  ["UX architecture", "User flows, wireframes, prototypes, responsive page structure", "€60–90 / h"],
  ["UI design system", "Visual identity for the interface, component library, page layouts", "€65–100 / h"],
  ["Front-end development", "HTML, CSS and JavaScript build, responsive implementation, animation, cross-browser testing", "€55–85 / h"],
  ["Back-end development", "Server-side logic, databases, authentication, business rules", "€70–110 / h"],
  ["CMS implementation", "Setup and configuration of a content management system, editorial templates, user roles", "€60–95 / h"],
  ["Integrations", "Third-party APIs, payment providers, CRM, analytics, mailing platforms", "€70–110 / h"],
  ["Launch and handover", "Hosting setup, domain and certificate configuration, deployment, documentation, training", "€50–80 / h"],
  ["Full-cycle website project", "All of the above combined and delivered as one indivisible Project", "from €2,500 / project"],
]));

push(h3("B.", "E-commerce"));
push(catTable([
  ["Online store build", "Catalogue, cart, checkout, shipping and tax rules, order management", "€65–105 / h"],
  ["Payment integration", "Connection and testing of payment service providers and payment methods", "€70–110 / h"],
  ["Product data", "Catalogue structuring, imports, feeds, product content templates", "€45–75 / h"],
  ["Marketplace connections", "Synchronisation of stock, prices and orders with external marketplaces", "€65–100 / h"],
  ["Conversion optimisation", "Funnel analysis, A/B testing, checkout and landing-page improvements", "€60–95 / h"],
]));

push(h3("C.", "Digital marketing and online advertising"));
push(catTable([
  ["Search engine optimisation", "Technical audit, on-page optimisation, structured data, content recommendations", "€50–85 / h"],
  ["Paid search and display", "Campaign setup, keyword and audience research, creatives, ongoing management", "€55–90 / h"],
  ["Social media advertising", "Campaign strategy, audience targeting, creative production, reporting", "€55–90 / h"],
  ["Analytics and reporting", "Measurement plan, tag and event setup, dashboards, periodic reporting", "€55–90 / h"],
  ["Content and copywriting", "Page copy, landing pages, product descriptions, editorial calendars", "€40–75 / h"],
  ["E-mail marketing", "Template design, automation flows, list management, campaign delivery", "€45–80 / h"],
]));

push(h3("D.", "IT services, hosting and support"));
push(catTable([
  ["Hosting and infrastructure", "Server provisioning, environments, backups, monitoring, certificates", "€55–95 / h"],
  ["Technical maintenance", "Updates, security patching, performance tuning, uptime supervision", "€50–85 / h"],
  ["Support and incident handling", "Response to malfunctions, restoration of service, corrective work", "€50–85 / h"],
  ["Migration", "Transfer of a site, store or data set between platforms or providers", "€60–100 / h"],
  ["Consulting", "Technical advice, platform selection, architecture review, audits", "€70–120 / h"],
  ["Retained support", "An agreed monthly volume of maintenance and support hours", "from €250 / month"],
]));

push(empty(120));
push(TXT([["Time is recorded and billed in whole or quarter hours. Where a Service Order is agreed as a fixed-fee Project, the hourly rates above serve only as a basis for calculating that fee. Travel, third-party licences, stock media, paid advertising budgets and similar out-of-pocket costs are not included in the rates and are recharged at cost where agreed in advance."]], { after: 0 }));
push(empty(260), signBlock());

/* ---------- footer ---------- */
const footer = new Footer({ children: [
  ruleP(HAIR, 4, 0, 80),
  grid([118, 60], [new TableRow({ children: [
    cell([p(run("Services Framework Agreement No. FC-2026/112 · 22.08.2026", { size: 12, bold: true, ls: 18, caps: true, color: MUTE }))], { w: convertMillimetersToTwip(118) }),
    cell([new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { line: 250 }, children: [
      new TextRun({ children: [PageNumber.CURRENT], font: F, size: 12, bold: true, color: SOFT, characterSpacing: 18 }),
      new TextRun({ text: " / ", font: F, size: 12, bold: true, color: SOFT }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], font: F, size: 12, bold: true, color: SOFT, characterSpacing: 18 }),
    ]})], { w: convertMillimetersToTwip(60) }),
  ]})]),
]});

const doc = new Document({
  background: { color: PAPER },
  styles: { default: { document: { run: { font: F, size: 16, color: INK } } } },
  sections: [{
    properties: { page: {
      size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) },
      margin: { top: convertMillimetersToTwip(16), bottom: convertMillimetersToTwip(15),
                left: convertMillimetersToTwip(16), right: convertMillimetersToTwip(16),
                footer: convertMillimetersToTwip(8) },
    }},
    footers: { default: footer },
    children: body,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("Agreement_FC-2026-112_Fourtress_Morin.docx", buf);
  console.log("docx written", buf.length);
});
