// lib/excel.js

import ExcelJS from 'exceljs';
import { formatDate, monthKeyOf, monthName, monthLabel } from './calc';
import { stageOf } from './stage';

const thin = { style: 'thin', color: { argb: 'FF000000' } };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };
const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const YELLOW = 'FFFFFF00'; const RED = 'FFFF0000'; const DARK = 'FF1F3864';

function registerSheet(wb, name, bills) {
  const ws = wb.addWorksheet(name.slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] });
  const headers = ['SL', 'Purchase Date', 'Supplier Name', 'Item Description', 'Amount', 'Department', '', 'Status', 'Purchese No', 'Due / Paid'];
  ws.columns = [6, 22, 26, 45, 14, 28, 18, 30, 12, 12].map((width) => ({ width }));
  const h = ws.addRow(headers);
  h.eachCell((c, i) => {
    c.border = BORDER; c.font = { bold: true, color: { argb: [1, 5, 7].includes(i) ? 'FF000000' : 'FFFFFFFF' } };
    c.fill = fill([1, 5, 7].includes(i) ? YELLOW : DARK); c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  h.getCell(7).value = 'Application / Resolution';
  let cur = '';
  bills.forEach((b) => {
    const mk = monthKeyOf(b.date);
    if (mk !== cur) {
      cur = mk;
      const r = ws.addRow([monthName(mk).toUpperCase()]);
      ws.mergeCells(r.number, 1, r.number, 10);
      r.getCell(1).font = { bold: true }; r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(1).border = BORDER;
    }
    const r = ws.addRow([b.sl, b.dateLabel || formatDate(b.date), b.supplierName, b.itemDescription, b.summaryAmount, b.department, stageOf(b), b.status, b.billNo, b.paymentStatus]);
    r.eachCell({ includeEmpty: true }, (c) => { c.border = BORDER; c.alignment = { vertical: 'top', wrapText: true }; });
    r.getCell(1).fill = fill(YELLOW); r.getCell(5).fill = fill(YELLOW); r.getCell(7).fill = fill(YELLOW);
    r.getCell(5).numFmt = '#,##0';
    const pc = r.getCell(10);
    if (b.paymentStatus === 'Paid') { pc.fill = fill(YELLOW); pc.font = { bold: true }; }
    else { pc.fill = fill(RED); pc.font = { color: { argb: 'FFFFFFFF' }, bold: true }; }
  });
  return ws;
}

export async function summaryWorkbook(bills) {
  const wb = new ExcelJS.Workbook();
  registerSheet(wb, 'Purchase Register', bills);
  const suppliers = [...new Set(bills.map((b) => b.supplierName).filter(Boolean))];
  suppliers.forEach((s) => registerSheet(wb, s, bills.filter((b) => b.supplierName === s)));
  return wb;
}

export async function ledgerWorkbook(L, highlight) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('IT Accessories');
  const lastCol = 2 + L.months.length * 2 + 2;
  const title = (t, n, bold) => { const r = ws.addRow([t]); ws.mergeCells(n, 1, n, lastCol); r.getCell(1).alignment = { horizontal: 'center' }; r.getCell(1).font = { bold: true, size: bold }; };
  title('HKD Outdoor Innovations Limited', 1, 14);
  title(`Historical Record of "IT Expenses" - ${highlight ? 'IT Accessories, ' + monthLabel(highlight).replace(' ', '_') : L.fy}`, 2, 12);
  title('All Figure in BDT', 3, 10);
  const h1 = ['Sl. No.', "Item's Name"]; const h2 = ['', ''];
  L.months.forEach((m) => { h1.push(monthLabel(m), ''); h2.push('Qty', 'Amount'); });
  h1.push('Year-Total', ''); h2.push('Qty', 'Amount');
  const r1 = ws.addRow(h1); const r2 = ws.addRow(h2);
  ws.mergeCells(4, 1, 5, 1); ws.mergeCells(4, 2, 5, 2);
  for (let i = 0; i <= L.months.length; i++) ws.mergeCells(4, 3 + i * 2, 4, 4 + i * 2);
  [r1, r2].forEach((r) => r.eachCell((c) => { c.font = { bold: true }; c.border = BORDER; c.alignment = { horizontal: 'center', vertical: 'middle' }; c.fill = fill('FFD9D9D9'); }));
  L.rows.forEach((row, i) => {
    const vals = [i + 1, row.name];
    L.months.forEach((m) => vals.push(row.cells[m].qty || null, row.cells[m].amount || null));
    vals.push(row.totalQty || null, row.totalAmount || null);
    const r = ws.addRow(vals);
    r.eachCell({ includeEmpty: true }, (c) => { c.border = BORDER; if (row.highlight) c.fill = fill(YELLOW); });
  });
  const tv = ['', 'Total'];
  L.months.forEach((m) => tv.push(L.totals[m].qty || null, L.totals[m].amount || null));
  tv.push(L.totalQty || null, L.totalAmount || null);
  const tr = ws.addRow(tv);
  tr.eachCell({ includeEmpty: true }, (c) => { c.font = { bold: true }; c.border = BORDER; });
  ws.getColumn(1).width = 7; ws.getColumn(2).width = 42;
  for (let c = 3; c <= lastCol; c++) { ws.getColumn(c).width = c % 2 === 1 ? 7 : 13; ws.getColumn(c).numFmt = '#,##0'; }
  return wb;
}