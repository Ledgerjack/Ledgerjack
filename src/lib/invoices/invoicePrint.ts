/**
 * invoicePrint — renders an invoice as clean, self-contained HTML and opens it
 * for printing. The browser's print dialog offers "Save as PDF", so we get a PDF
 * with no dependency. All user content is HTML-escaped.
 */

import type { Invoice, BusinessProfile } from "./invoices";
import { computeTotals } from "./invoices";

function esc(s: string | undefined): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function money(cents: number, symbol: string): string {
  const neg = cents < 0;
  const v = Math.abs(cents);
  return `${neg ? "-" : ""}${symbol}${Math.floor(v / 100)}.${String(v % 100).padStart(2, "0")}`;
}
function nl2br(s: string | undefined): string {
  return esc(s).replace(/\n/g, "<br>");
}

export function invoiceHtml(inv: Invoice, profile: BusinessProfile, symbol: string): string {
  const t = computeTotals(inv);
  const rows = inv.lines.map((l) => `
    <tr>
      <td>${esc(l.description)}</td>
      <td style="text-align:right">${l.quantity}</td>
      <td style="text-align:right">${money(l.unitPrice, symbol)}</td>
      <td style="text-align:right">${money(Math.round(l.quantity * l.unitPrice), symbol)}</td>
    </tr>`).join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(inv.number)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 40px; }
    h1 { font-size: 28px; margin: 0 0 4px; }
    .muted { color: #64748b; font-size: 13px; }
    .row { display: flex; justify-content: space-between; gap: 24px; }
    .box { margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 14px; }
    th { text-align: left; border-bottom: 2px solid #e2e8f0; padding: 8px 6px; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; }
    td { padding: 8px 6px; border-bottom: 1px solid #f1f5f9; }
    .totals { margin-top: 16px; margin-left: auto; width: 260px; font-size: 14px; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals .grand { border-top: 2px solid #e2e8f0; margin-top: 4px; padding-top: 8px; font-weight: 700; font-size: 16px; }
    .notes { margin-top: 28px; font-size: 13px; color: #475569; white-space: pre-wrap; }
    @media print { body { margin: 20px; } }
  </style></head><body>
    <div class="row">
      <div>
        <h1>${inv.kind === "quote" ? "Quote" : "Invoice"}</h1>
        <div class="muted">${esc(inv.number)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700">${esc(profile.name) || "Your business"}</div>
        <div class="muted">${nl2br(profile.address)}</div>
        <div class="muted">${esc(profile.email)}</div>
        <div class="muted">${esc(profile.phone)}</div>
        ${profile.taxNumber ? `<div class="muted">VAT: ${esc(profile.taxNumber)}</div>` : ""}
      </div>
    </div>

    <div class="row box">
      <div>
        <div class="muted">Bill to</div>
        <div style="font-weight:600">${esc(inv.clientName)}</div>
        <div class="muted">${nl2br(inv.clientAddress)}</div>
        <div class="muted">${esc(inv.clientEmail)}</div>
      </div>
      <div style="text-align:right">
        <div class="muted">Issued: ${esc(inv.issueDate)}</div>
        <div class="muted">Due: ${esc(inv.dueDate)}</div>
      </div>
    </div>

    <table>
      <thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div><span>Subtotal</span><span>${money(t.subtotal, symbol)}</span></div>
      ${inv.taxRatePct ? `<div><span>Tax (${inv.taxRatePct}%)</span><span>${money(t.tax, symbol)}</span></div>` : ""}
      <div class="grand"><span>Total</span><span>${money(t.total, symbol)}</span></div>
    </div>

    ${inv.notes ? `<div class="notes"><strong>Notes</strong>\n${nl2br(inv.notes)}</div>` : ""}
    ${profile.bankDetails ? `<div class="notes"><strong>Payment</strong>\n${nl2br(profile.bankDetails)}</div>` : ""}
  </body></html>`;
}

export function printInvoice(inv: Invoice, profile: BusinessProfile, symbol: string): void {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(invoiceHtml(inv, profile, symbol));
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch { /* user can print manually */ } }, 300);
}

/** A statement of account for one client: their invoices and outstanding total. */
export function statementHtml(clientName: string, invoices: Invoice[], profile: BusinessProfile, symbol: string): string {
  const rows = invoices.map((inv) => {
    const total = computeTotals(inv).total;
    const paid = inv.status === "paid";
    return `<tr>
      <td>${esc(inv.number)}</td>
      <td>${esc(inv.issueDate)}</td>
      <td>${esc(inv.dueDate)}</td>
      <td>${paid ? "Paid" : esc(inv.status)}</td>
      <td style="text-align:right">${money(total, symbol)}</td>
    </tr>`;
  }).join("");
  const outstanding = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + computeTotals(i).total, 0);

  return `<!doctype html><html><head><meta charset="utf-8"><title>Statement — ${esc(clientName)}</title>
  <style>
    body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#1e293b; margin:40px; }
    h1 { font-size:26px; margin:0 0 4px; }
    .muted { color:#64748b; font-size:13px; }
    .row { display:flex; justify-content:space-between; }
    table { width:100%; border-collapse:collapse; margin-top:24px; font-size:14px; }
    th { text-align:left; border-bottom:2px solid #e2e8f0; padding:8px 6px; font-size:12px; text-transform:uppercase; color:#64748b; }
    td { padding:8px 6px; border-bottom:1px solid #f1f5f9; }
    .out { margin-top:16px; text-align:right; font-weight:700; font-size:16px; }
    @media print { body { margin:20px; } }
  </style></head><body>
    <div class="row">
      <div><h1>Statement</h1><div class="muted">${esc(clientName)}</div></div>
      <div style="text-align:right"><div style="font-weight:700">${esc(profile.name) || "Your business"}</div><div class="muted">${esc(profile.email)}</div></div>
    </div>
    <table>
      <thead><tr><th>Number</th><th>Issued</th><th>Due</th><th>Status</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="out">Outstanding: ${money(outstanding, symbol)}</div>
  </body></html>`;
}

export function printStatement(clientName: string, invoices: Invoice[], profile: BusinessProfile, symbol: string): void {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(statementHtml(clientName, invoices, profile, symbol));
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch { /* manual */ } }, 300);
}
