"""Invoice 1287C — BIELLA COMPANY DI ZUGNO GIUSEPPE → SERVICIAL SUR SL."""
from weasyprint import HTML, CSS
from pathlib import Path

OUT_DIR = Path("/mnt/user-data/outputs")
OUT_DIR.mkdir(parents=True, exist_ok=True)

lines = [
    ("Electricity supply to event venues — day-ahead market",
     "Active energy delivered to sports-event facilities, PUN reference — August 2026", "45.00", "MWh", 142.50, 6412.50),
    ("Temporary power supply & distribution — outdoor sports events",
     "Provision, metering and management of temporary power for event sites — Aug 2026", "1.00", "service", 1850.00, 1850.00),
    ("Energy procurement & supply-management commission",
     "Sourcing, contract placement and supply coordination for the client — Aug 2026", "1.00", "service", 936.00, 936.00),
    ("Balancing services & imbalance settlement",
     "Real-time balancing coordination, imbalance charges pass-through — Aug 2026", "1.00", "service", 512.72, 512.72),
]

subtotal = sum(l[5] for l in lines)
vat_rate = 0.00
vat_amount = 0.00
total = subtotal + vat_amount

def eur(x):
    return f"{x:,.2f}".replace(",", " ").replace(".", ",") + " €"

rows_html = ""
for desc, sub, qty, unit, rate, amt in lines:
    rows_html += f"""
      <tr>
        <td class="desc">
          <div class="d1">{desc}</div>
          <div class="d2">{sub}</div>
        </td>
        <td class="num">{qty}</td>
        <td class="num">{unit}</td>
        <td class="num">{eur(rate)}</td>
        <td class="num total-col">{eur(amt)}</td>
      </tr>"""

html = f"""<!doctype html>
<html><head><meta charset="utf-8">
<title>Invoice 1287C</title>
<style>
  @page {{ size: A4; margin: 11mm 14mm 9mm 14mm; }}
  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif;
    color: #0e1a2b; font-size: 9.4pt; line-height: 1.35; }}

  .header {{ display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 2px solid #0e1a2b; padding-bottom: 10px; }}
  .brand .mark {{ font-size: 22pt; font-weight: 300; letter-spacing: 5px;
    color: #0e1a2b; line-height: 1; }}
  .brand .mark b {{ font-weight: 700; letter-spacing: 3px; }}
  .brand .tag {{ margin-top: 4px; font-size: 7.2pt; letter-spacing: 3.5px;
    color: #8a6d3b; text-transform: uppercase; }}
  .doc-meta {{ text-align: right; }}
  .doc-meta .kind {{ font-size: 8pt; letter-spacing: 4px; color: #8a6d3b;
    text-transform: uppercase; }}
  .doc-meta .num {{ font-size: 26pt; font-weight: 300; letter-spacing: 2px;
    color: #0e1a2b; margin-top: 2px; line-height: 1; }}
  .doc-meta .date {{ margin-top: 6px; font-size: 8.8pt; color: #333; }}

  .parties {{ display: flex; gap: 18px; margin-top: 12px; }}
  .party {{ flex: 1; border-left: 2px solid #c9a96e; padding: 2px 0 2px 10px; }}
  .party .label {{ font-size: 7pt; letter-spacing: 3.5px; color: #8a6d3b;
    text-transform: uppercase; margin-bottom: 5px; }}
  .party .name {{ font-size: 10.5pt; font-weight: 700; color: #0e1a2b;
    line-height: 1.25; margin-bottom: 3px; }}
  .party .line {{ font-size: 8.6pt; color: #333; line-height: 1.45; }}
  .party .line b {{ color: #0e1a2b; font-weight: 600; }}

  .activity {{ margin: 10px 0 2px; padding: 6px 12px; background: #f6f2ea;
    border-left: 2px solid #c9a96e; font-size: 8.6pt; color: #4a3d24; }}
  .activity b {{ letter-spacing: 2.5px; color: #8a6d3b; text-transform: uppercase;
    font-size: 7.5pt; margin-right: 6px; }}

  table.items {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
  table.items thead th {{ background: #0e1a2b; color: #f6f2ea; font-weight: 500;
    text-transform: uppercase; letter-spacing: 2px; font-size: 7.6pt;
    padding: 8px 8px; text-align: left; }}
  table.items thead th.num {{ text-align: right; }}
  table.items tbody td {{ padding: 7px 8px; border-bottom: 1px solid #eadfc8;
    vertical-align: top; font-size: 9pt; }}
  table.items tbody td.num {{ text-align: right; white-space: nowrap; }}
  table.items tbody td.desc .d1 {{ font-weight: 600; color: #0e1a2b; }}
  table.items tbody td.desc .d2 {{ font-size: 8.2pt; color: #6a5c40; margin-top: 2px; }}
  table.items tbody td.total-col {{ font-weight: 600; color: #0e1a2b; }}

  .totals-wrap {{ display: flex; justify-content: flex-end; margin-top: 10px; }}
  .totals {{ width: 58%; }}
  .totals table {{ width: 100%; border-collapse: collapse; }}
  .totals td {{ padding: 5px 8px; font-size: 9pt; }}
  .totals td.k {{ color: #555; text-transform: uppercase; letter-spacing: 2px;
    font-size: 7.6pt; }}
  .totals td.v {{ text-align: right; font-weight: 500; }}
  .totals tr.grand td {{ background: #0e1a2b; color: #f6f2ea; padding: 10px 12px;
    font-size: 11pt; }}
  .totals tr.grand td.k {{ letter-spacing: 4px; font-weight: 500; color: #c9a96e; }}
  .totals tr.grand td.v {{ font-weight: 700; letter-spacing: 1px; }}

  .rc-note {{ margin-top: 8px; padding: 8px 12px; border: 1px dashed #c9a96e;
    background: #fbf7ef; font-size: 8pt; color: #4a3d24; line-height: 1.4; }}
  .rc-note b {{ color: #0e1a2b; letter-spacing: 1.5px; text-transform: uppercase;
    font-size: 7.6pt; }}

  .lower {{ display: flex; gap: 18px; margin-top: 14px; }}
  .box {{ flex: 1; }}
  .box .label {{ font-size: 7pt; letter-spacing: 3.5px; color: #8a6d3b;
    text-transform: uppercase; margin-bottom: 5px; border-bottom: 1px solid #c9a96e;
    padding-bottom: 3px; }}
  .box .row {{ font-size: 8.6pt; color: #333; line-height: 1.55; }}
  .box .row b {{ color: #0e1a2b; font-weight: 600; }}

  .signature {{ margin-top: 14px; display: flex; justify-content: flex-end; }}
  .sig {{ width: 46%; text-align: center; }}
  .sig .line {{ border-bottom: 1px solid #0e1a2b; height: 30px; }}
  .sig .who {{ margin-top: 4px; font-size: 8.4pt; color: #0e1a2b; font-weight: 600; }}
  .sig .role {{ font-size: 7.4pt; color: #8a6d3b; letter-spacing: 2.5px;
    text-transform: uppercase; margin-top: 1px; }}

  .footer {{ margin-top: 10px; padding-top: 6px; border-top: 1px solid #eadfc8;
    display: flex; justify-content: space-between; font-size: 7.6pt; color: #7a7062; }}
  .footer .thanks {{ font-style: italic; color: #8a6d3b; letter-spacing: 1.5px; }}
</style>
</head>
<body>

  <div class="header">
    <div class="brand">
      <div class="mark">BIELLA <b>&middot;</b> COMPANY</div>
      <div class="tag">Di Zugno Giuseppe &nbsp;·&nbsp; Energy Trading &amp; Brokerage</div>
    </div>
    <div class="doc-meta">
      <div class="kind">Fattura / Invoice</div>
      <div class="num">N° 1287C</div>
      <div class="date">Biella, 27 August 2026</div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="label">Provider</div>
      <div class="name">BIELLA COMPANY<br/>DI ZUGNO GIUSEPPE</div>
      <div class="line">Via Venti Settembre 7<br/>13900 Biella (BI) — Italy</div>
      <div class="line" style="margin-top:4px"><b>P.IVA</b> IT01926790021</div>
      <div class="line"><b>Tel</b> +39 07 48 53 05 08</div>
      <div class="line"><b>Email</b> zugno.giu@proton.me</div>
    </div>
    <div class="party">
      <div class="label">Bill to</div>
      <div class="name">SERVICIAL SUR SL</div>
      <div class="line">Calle Pancho López, 8<br/>29700 Vélez-Málaga (Málaga) — Spain</div>
    </div>
  </div>

  <div class="activity">
    <b>Activity</b> Electricity trading — purchase and resale of electricity to consumers,
    energy brokerage and the management of charging stations for electric vehicles.
  </div>

  <table class="items">
    <thead>
      <tr>
        <th style="width:52%">Description</th>
        <th class="num" style="width:9%">Qty</th>
        <th class="num" style="width:10%">Unit</th>
        <th class="num" style="width:14%">Unit price</th>
        <th class="num" style="width:15%">Amount</th>
      </tr>
    </thead>
    <tbody>
      {rows_html}
    </tbody>
  </table>

  <div class="totals-wrap">
    <div class="totals">
      <table>
        <tr><td class="k">Subtotal</td><td class="v">{eur(subtotal)}</td></tr>
        <tr><td class="k">VAT — reverse charge (0%)</td><td class="v">{eur(vat_amount)}</td></tr>
        <tr class="grand"><td class="k">Total due</td><td class="v">{eur(total)}</td></tr>
      </table>
    </div>
  </div>

  <div class="rc-note">
    <b>VAT treatment</b> &nbsp; Operation not subject to Italian VAT — reverse charge
    pursuant to Art. 7-ter D.P.R. 633/1972 and Art. 196 Directive 2006/112/EC.
    VAT to be accounted for by the recipient in Spain.
  </div>

  <div class="lower">
    <div class="box">
      <div class="label">Payment details</div>
      <div class="row"><b>Beneficiary</b> &nbsp; Biella Company di Zugno Giuseppe</div>
      <div class="row"><b>Bank</b> &nbsp; VIVABANK S.A.</div>
      <div class="row" style="font-size:7.8pt;color:#555">18–20 Amarousiou Chalandriou Ave., Marousi 151 25 &nbsp;·&nbsp; VAT: EL999846755</div>
      <div class="row" style="margin-top:2px"><b>IBAN</b> &nbsp; GR56 0570 0000 0006 8459 2624 836</div>
      <div class="row"><b>BIC / SWIFT</b> &nbsp; PRXBGRAA</div>
      <div class="row"><b>Currency</b> &nbsp; EUR &nbsp;·&nbsp; <b>Reference</b> INV 1287C</div>
    </div>
    <div class="box">
      <div class="label">Terms</div>
      <div class="row"><b>Issue date</b> &nbsp; 27/08/2026</div>
      <div class="row"><b>Due date</b> &nbsp; 26/09/2026 (30 days)</div>
      <div class="row"><b>Late-payment interest</b> &nbsp; per D. Lgs. 231/2002</div>
      <div class="row" style="margin-top:4px; font-size:8pt; color:#555">
        Please quote invoice number on all correspondence and remittance.
        Payment in EUR only; bank charges at sender's cost.
      </div>
    </div>
  </div>

  <div class="signature">
    <div class="sig">
      <div class="line"></div>
      <div class="who">ZUGNO Giuseppe</div>
      <div class="role">Director / Titolare</div>
    </div>
  </div>

  <div class="footer">
    <div>BIELLA COMPANY DI ZUGNO GIUSEPPE &nbsp;·&nbsp; P.IVA IT01926790021 &nbsp;·&nbsp; Biella, Italy</div>
    <div class="thanks">Thank you for your business</div>
  </div>

</body></html>"""

html_path = OUT_DIR / "Invoice_1287C_BiellaCompany.html"
html_path.write_text(html, encoding="utf-8")

pdf_path = OUT_DIR / "Invoice_1287C_BiellaCompany.pdf"
HTML(string=html, base_url=str(OUT_DIR)).write_pdf(str(pdf_path))
print("WROTE:", pdf_path)
print("SIZE:", pdf_path.stat().st_size, "bytes")
