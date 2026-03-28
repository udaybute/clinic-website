// lib/printUtils.ts
// Browser-based print/export helpers for bills and prescriptions.
// Opens a styled print window — no external PDF library needed.

// ── Types ─────────────────────────────────────────────────────────────────────
interface PrintBillData {
  id:            string
  createdAt:     string
  status:        string
  subtotal:      number
  discount:      number
  tax:           number
  total:         number
  paid:          number
  balance:       number
  paymentMethod?: string | null
  items?:        Array<{ description: string; quantity: number; rate: number; amount: number }>
  patient?:      { name: string; phone?: string; email?: string }
  appointment?:  {
    date?: string; time?: string
    doctor?:  { name?: string }
    service?: { name?: string }
  }
}

interface PrintPrescriptionData {
  id:            string
  createdAt:     string
  diagnosis:     string
  notes?:        string
  followUpDate?: string | null
  labTests?:     string[]
  instructions?: string    // patient instructions
  medicines?:    Array<{
    name: string
    brandName?: string
    strength?: string
    dosage: string
    frequency: string
    duration: string
    foodInstruction?: string
    notes?: string
  }>
  patient?:      { name: string; phone?: string; dob?: string; gender?: string }
  doctor?:       { name: string; specialization?: string; registrationNo?: string }
  clinic?:       { name?: string; address?: string; phone?: string; email?: string }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d?: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function fmtCur(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function badgeClass(status: string) {
  if (status === "paid")    return "badge-paid"
  if (status === "pending") return "badge-pending"
  if (status === "partial") return "badge-partial"
  return "badge-default"
}

function openPrint(html: string) {
  const win = window.open("", "_blank", "width=900,height=750")
  if (!win) { alert("Please allow popups to print."); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 700)
}

// ── Shared base style ─────────────────────────────────────────────────────────
const BASE_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Source Sans 3', 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; font-size: 13px; line-height: 1.6; }
  .page { max-width: 800px; margin: 0 auto; padding: 36px 40px; }
  .clinic-name { font-family: 'EB Garamond', Georgia, serif; font-size: 26px; font-weight: 700; color: #0a1628; letter-spacing: -0.02em; }
  .clinic-sub  { font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: #0d9488; margin-top: 2px; font-weight: 600; }
  .clinic-addr { font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.4; }
  .doc-no      { text-align: right; }
  .doc-no .label { font-size: 10px; text-transform: uppercase; letter-spacing: .12em; color: #64748b; font-weight: 600; }
  .doc-no .value { font-size: 20px; font-weight: 700; color: #0a1628; font-family: 'EB Garamond', Georgia, serif; }
  .doc-no .date  { font-size: 11px; color: #94a3b8; margin-top: 3px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .info-box { background: #f8fafc; border-radius: 8px; padding: 14px 16px; border: 1px solid #e2e8f0; }
  .info-box .title { font-size: 9px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px; }
  .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; gap: 12px; }
  .info-label { color: #64748b; flex-shrink: 0; }
  .info-value { font-weight: 600; color: #0a1628; text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
  thead tr { background: #0a1628; color: #fff; }
  thead th { padding: 10px 13px; text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .1em; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody td { padding: 10px 13px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .right { text-align: right; }
  .totals { margin-left: auto; width: 260px; }
  .totals-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; }
  .totals-row.total { border-top: 2px solid #0a1628; margin-top: 8px; padding-top: 10px; font-size: 16px; font-weight: 700; font-family: 'EB Garamond', Georgia, serif; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
  .badge-paid    { background: #dcfce7; color: #15803d; }
  .badge-pending { background: #fef3c7; color: #b45309; }
  .badge-partial { background: #dbeafe; color: #1d4ed8; }
  .badge-default { background: #f1f5f9; color: #64748b; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .15em; color: #0d9488; margin: 20px 0 8px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
  .note-box { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid #0d9488; border-radius: 4px; padding: 12px 14px; font-size: 12px; color: #374151; line-height: 1.6; white-space: pre-wrap; }
  .tag { display: inline-block; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 3px 10px; font-size: 11px; margin: 2px; color: #15803d; font-weight: 500; }
  .footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; letter-spacing: .04em; }
  .rx-symbol { font-size: 52px; color: #0d9488; opacity: .08; position: absolute; top: 36px; right: 44px; font-family: Georgia, serif; font-weight: 700; }
  .med-table thead tr { background: #0d9488; }
  .sig-block { display: flex; justify-content: flex-end; margin-top: 40px; }
  .sig-inner { text-align: center; min-width: 200px; }
  .sig-line  { border-top: 1px solid #0a1628; padding-top: 6px; font-size: 11px; color: #64748b; margin-top: 48px; }
  .sig-name  { font-size: 13px; font-weight: 700; color: #0a1628; }
  .sig-reg   { font-size: 10px; color: #94a3b8; margin-top: 2px; }
  .header-bar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 3px solid #0d9488; position: relative; }
  .header-accent { position: absolute; bottom: -3px; left: 0; width: 60px; height: 3px; background: #0a1628; }
  .pill { display: inline-flex; align-items: center; gap: 4px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 20px; padding: 3px 10px; font-size: 10px; color: #0d9488; font-weight: 600; margin: 2px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .page { padding: 20px 24px; }
  }
`

// ── Print Bill ────────────────────────────────────────────────────────────────
export function printBill(bill: PrintBillData, clinicName = "DentalCare") {
  const rows = (bill.items ?? []).map(i => `
    <tr>
      <td>${i.description}</td>
      <td class="right">${i.quantity}</td>
      <td class="right">${fmtCur(i.rate)}</td>
      <td class="right">${fmtCur(i.amount)}</td>
    </tr>
  `).join("")

  const html = `
    <!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Invoice #${bill.id.slice(0, 8).toUpperCase()}</title>
      <style>${BASE_STYLE}</style>
    </head><body>
    <div class="page">
      <div class="header-bar">
        <div>
          <div class="clinic-name">🦷 ${clinicName}</div>
          <div class="clinic-sub">Clinic Management System</div>
        </div>
        <div class="doc-no">
          <div class="label">Tax Invoice</div>
          <div class="value">#${bill.id.slice(0, 8).toUpperCase()}</div>
          <div class="date">${fmtDate(bill.createdAt)}</div>
          <div style="margin-top:8px">
            <span class="badge ${badgeClass(bill.status)}">${bill.status}</span>
          </div>
        </div>
        <div class="header-accent"></div>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <div class="title">Bill To (Patient)</div>
          ${bill.patient ? `
            <div class="info-row"><span class="info-label">Name</span><span class="info-value">${bill.patient.name}</span></div>
            ${bill.patient.phone ? `<div class="info-row"><span class="info-label">Phone</span><span class="info-value">${bill.patient.phone}</span></div>` : ""}
            ${bill.patient.email ? `<div class="info-row"><span class="info-label">Email</span><span class="info-value">${bill.patient.email}</span></div>` : ""}
          ` : '<div class="info-row">—</div>'}
        </div>
        <div class="info-box">
          <div class="title">Appointment Details</div>
          ${bill.appointment ? `
            <div class="info-row"><span class="info-label">Date</span><span class="info-value">${fmtDate(bill.appointment.date)}</span></div>
            ${bill.appointment.time ? `<div class="info-row"><span class="info-label">Time</span><span class="info-value">${bill.appointment.time}</span></div>` : ""}
            ${bill.appointment.doctor?.name ? `<div class="info-row"><span class="info-label">Doctor</span><span class="info-value">Dr. ${bill.appointment.doctor.name}</span></div>` : ""}
            ${bill.appointment.service?.name ? `<div class="info-row"><span class="info-label">Service</span><span class="info-value">${bill.appointment.service.name}</span></div>` : ""}
          ` : '<div class="info-row">—</div>'}
        </div>
      </div>

      ${rows ? `
        <div class="section-title">Items & Services</div>
        <table>
          <thead><tr>
            <th>Description</th>
            <th class="right">Qty</th>
            <th class="right">Rate</th>
            <th class="right">Amount</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      ` : ""}

      <div class="totals">
        <div class="totals-row"><span>Subtotal</span><span>${fmtCur(bill.subtotal)}</span></div>
        ${bill.discount > 0 ? `<div class="totals-row" style="color:#b45309"><span>Discount</span><span>− ${fmtCur(bill.discount)}</span></div>` : ""}
        ${bill.tax > 0 ? `<div class="totals-row"><span>Tax (GST)</span><span>${fmtCur(bill.tax)}</span></div>` : ""}
        <div class="totals-row total"><span>Total Amount</span><span>${fmtCur(bill.total)}</span></div>
        ${bill.paid > 0 ? `<div class="totals-row" style="color:#15803d"><span>Amount Paid</span><span>${fmtCur(bill.paid)}</span></div>` : ""}
        ${bill.balance > 0 ? `<div class="totals-row" style="color:#dc2626;font-weight:600"><span>Balance Due</span><span>${fmtCur(bill.balance)}</span></div>` : ""}
        ${bill.paymentMethod ? `<div class="totals-row" style="font-size:11px;color:#94a3b8;margin-top:4px"><span>Payment mode</span><span style="text-transform:capitalize">${bill.paymentMethod}</span></div>` : ""}
      </div>

      <div class="footer">
        Thank you for choosing ${clinicName} &nbsp;·&nbsp; This is a computer generated invoice
        <br>Generated on ${new Date().toLocaleString("en-IN")}
      </div>
    </div>
    </body></html>
  `
  openPrint(html)
}

// ── Print Prescription (Premium Rx Letterhead) ────────────────────────────────
export function printPrescription(rx: PrintPrescriptionData, clinicName = "DentalCare") {
  const medRows = (rx.medicines ?? []).map((m, i) => `
    <tr>
      <td style="font-size:1.1em;font-weight:700;color:#0d9488;text-align:center;width:28px">${i + 1}</td>
      <td>
        <div style="font-weight:700;color:#0a1628;font-size:13px">${m.name}${m.strength ? ` <span style="font-weight:400;color:#64748b">${m.strength}</span>` : ""}</div>
        ${m.brandName ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px">Brand: ${m.brandName}</div>` : ""}
        ${m.foodInstruction ? `<div style="font-size:10px;color:#0d9488;margin-top:2px">⚡ ${m.foodInstruction}</div>` : ""}
      </td>
      <td>
        <div style="font-weight:600">${m.dosage}</div>
        <div style="font-size:11px;color:#64748b">${m.frequency}</div>
      </td>
      <td style="font-weight:600;color:#0a1628">${m.duration}</td>
      <td style="font-size:11px;color:#64748b;font-style:italic">${m.notes ?? "—"}</td>
    </tr>
  `).join("")

  const labTags = (rx.labTests ?? []).filter(Boolean).map(t => `<span class="tag">🔬 ${t}</span>`).join("")

  const age = rx.patient?.dob
    ? `${Math.floor((Date.now() - new Date(rx.patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} yrs`
    : null

  const rxNum = `RX-${rx.id.slice(0, 8).toUpperCase()}`

  const html = `
    <!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Prescription — ${rx.patient?.name ?? ""}</title>
      <style>${BASE_STYLE}</style>
    </head><body>
    <div class="page">

      <div class="rx-symbol">℞</div>

      <!-- Letterhead -->
      <div class="header-bar">
        <div>
          <div class="clinic-name">🦷 ${rx.clinic?.name ?? clinicName}</div>
          <div class="clinic-sub">Dental &amp; Oral Health Centre</div>
          ${rx.clinic?.address ? `<div class="clinic-addr">📍 ${rx.clinic.address}</div>` : ""}
          ${rx.clinic?.phone ? `<div class="clinic-addr">📞 ${rx.clinic.phone}${rx.clinic?.email ? ` &nbsp;·&nbsp; ✉ ${rx.clinic.email}` : ""}</div>` : ""}
        </div>
        <div class="doc-no">
          <div class="label">Prescription</div>
          <div class="value">${rxNum}</div>
          <div class="date">${fmtDate(rx.createdAt)}</div>
          <div style="margin-top:6px">
            <span class="pill">℞ Valid 30 days</span>
          </div>
        </div>
        <div class="header-accent"></div>
      </div>

      <!-- Patient + Doctor Info -->
      <div class="info-grid">
        <div class="info-box">
          <div class="title">Patient Details</div>
          <div class="info-row"><span class="info-label">Name</span><span class="info-value">${rx.patient?.name ?? "—"}</span></div>
          ${age ? `<div class="info-row"><span class="info-label">Age</span><span class="info-value">${age}</span></div>` : ""}
          ${rx.patient?.gender ? `<div class="info-row"><span class="info-label">Gender</span><span class="info-value" style="text-transform:capitalize">${rx.patient.gender}</span></div>` : ""}
          ${rx.patient?.phone ? `<div class="info-row"><span class="info-label">Phone</span><span class="info-value">${rx.patient.phone}</span></div>` : ""}
        </div>
        <div class="info-box">
          <div class="title">Prescribing Physician</div>
          <div class="info-row"><span class="info-label">Dr.</span><span class="info-value">${rx.doctor?.name ?? "—"}</span></div>
          ${rx.doctor?.specialization ? `<div class="info-row"><span class="info-label">Specialisation</span><span class="info-value">${rx.doctor.specialization}</span></div>` : ""}
          ${rx.doctor?.registrationNo ? `<div class="info-row"><span class="info-label">Reg. No.</span><span class="info-value">${rx.doctor.registrationNo}</span></div>` : ""}
          ${rx.followUpDate ? `<div class="info-row"><span class="info-label">Follow-up</span><span class="info-value" style="color:#0d9488">${fmtDate(rx.followUpDate)}</span></div>` : ""}
        </div>
      </div>

      <!-- Diagnosis -->
      <div class="section-title">Clinical Diagnosis</div>
      <div class="note-box">${rx.diagnosis ?? "—"}</div>

      <!-- Medications -->
      ${medRows ? `
        <div class="section-title">℞ Medications</div>
        <table class="med-table">
          <thead><tr>
            <th style="width:28px">#</th>
            <th>Medicine</th>
            <th>Dosage &amp; Frequency</th>
            <th>Duration</th>
            <th>Special Instructions</th>
          </tr></thead>
          <tbody>${medRows}</tbody>
        </table>
      ` : ""}

      <!-- Lab Tests -->
      ${labTags ? `
        <div class="section-title">Investigations Advised</div>
        <div style="margin-top:6px;margin-bottom:8px">${labTags}</div>
      ` : ""}

      <!-- Patient Instructions -->
      ${rx.instructions ? `
        <div class="section-title">Patient Instructions</div>
        <div class="note-box">${rx.instructions.replace(/\n/g, "<br>")}</div>
      ` : ""}

      <!-- Clinical Notes -->
      ${rx.notes ? `
        <div class="section-title">Clinical Notes</div>
        <div class="note-box">${rx.notes}</div>
      ` : ""}

      <!-- Signature -->
      <div class="sig-block">
        <div class="sig-inner">
          <div class="sig-name">Dr. ${rx.doctor?.name ?? ""}</div>
          ${rx.doctor?.specialization ? `<div style="font-size:11px;color:#64748b">${rx.doctor.specialization}</div>` : ""}
          ${rx.doctor?.registrationNo ? `<div class="sig-reg">Reg. No. ${rx.doctor.registrationNo}</div>` : ""}
          <div class="sig-line">Signature &amp; Stamp</div>
        </div>
      </div>

      <div class="footer">
        ${rx.clinic?.name ?? clinicName} &nbsp;·&nbsp; ${rxNum} &nbsp;·&nbsp;
        This prescription is valid for 30 days from date of issue
        <br>Generated on ${new Date().toLocaleString("en-IN")} &nbsp;|&nbsp; Computer generated — no physical signature required for digital copy
      </div>
    </div>
    </body></html>
  `
  openPrint(html)
}
