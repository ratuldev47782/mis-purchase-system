// lib/excel.js

import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { formatDate, monthKeyOf, monthName, monthLabel, numberToWords } from './calc';
import { stageOf } from './stage';
import { paperFromBill, dmy } from './paper';

const thin = { style: 'thin', color: { argb: 'FF000000' } };
const dashed = { style: 'dashed', color: { argb: 'FF000000' } };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };
const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const YELLOW = 'FFFFFF00'; const RED = 'FFFF0000'; const DARK = 'FF1F3864';
const BLUE = 'FF0000FF';

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
  const ws = wb.addWorksheet('IT Accessories', { pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
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
  // same font as the original IT Accessories sheet
  ws.eachRow((r) => r.eachCell({ includeEmpty: true }, (c) => { c.font = { ...(c.font || {}), name: 'Times New Roman', size: (c.font && c.font.size) || 11 }; }));
  return wb;
}

// ---------------------------------------------------------------------------
// One bill -> the "REQUEST FOR PAYMENT" sheet (same layout as the printed paper form)
// ---------------------------------------------------------------------------
export async function billWorkbook(bill) {
  const d = paperFromBill(bill);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Payment Request-TK', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1, margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } },
    views: [{ showGridLines: false }],
  });
  [5, 40, 7, 8, 12, 14, 8, 12, 14].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  const F = (o = {}) => ({ name: 'Times New Roman', size: 11, bold: true, ...o });
  const put = (ref, value, o = {}) => {
    const c = ws.getCell(ref);
    c.value = value; c.font = F(o.font); if (o.align) c.alignment = { vertical: 'middle', wrapText: !!o.wrap, ...o.align };
    if (o.border) c.border = o.border; if (o.fill) c.fill = fill(o.fill); if (o.fmt) c.numFmt = o.fmt;
    return c;
  };
  const merge = (a, b) => ws.mergeCells(`${a}:${b}`);
  const box = (r1, c1, r2, c2) => { for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) ws.getCell(r, c).border = BORDER; };
  const dotted = (ref) => { const c = ws.getCell(ref); c.border = { ...(c.border || {}), bottom: dashed }; };

  let logo = null;
  try { logo = wb.addImage({ buffer: fs.readFileSync(path.join(process.cwd(), 'public', 'hkd-logo.png')), extension: 'png' }); } catch (e) { logo = null; }
  const addLogo = (row) => { if (logo !== null) ws.addImage(logo, { tl: { col: 0.1, row }, ext: { width: 34, height: 35 } }); };

  // header
  ws.getRow(1).height = 22; ws.getRow(2).height = 18;
  addLogo(0); merge('B1', 'F1'); put('B1', 'HKD OUTDOOR INNOVATIONS LTD', { font: { size: 18 }, align: { vertical: 'middle' } });
  merge('B2', 'F2'); put('B2', 'Plot #45-50, Sec#02, Karnaphuli EPZ, Chittagong.', { font: { size: 11 } });
  put('H1', 'No:', { align: { horizontal: 'right' } }); put('I1', `MIS- ${d.billNo}`, { font: { color: { argb: BLUE } }, align: { horizontal: 'center' } }); dotted('I1');

  // title + approval grid
  put('A4', 'REQUEST FOR PAYMENT', { font: { size: 13 } }); merge('A4', 'B4');
  ['IC', 'AMGR/MGR', 'AGM', 'GM', 'DIR', 'MD', 'COO'].forEach((h, i) => put(ws.getCell(4, 3 + i).address, h, { font: { size: 8 }, align: { horizontal: 'center', vertical: 'middle' }, border: BORDER }));
  ws.getRow(5).height = 26; ws.getRow(6).height = 26; box(5, 3, 6, 9);
  merge('A5', 'B5'); put('A5', `Date            :  ${dmy(d.date)}`, { font: { color: { argb: BLUE } } });
  merge('A6', 'B6'); put('A6', `Applicant Name :  ${d.applicantName || ''}`, { font: { color: { argb: BLUE } } });
  merge('A7', 'B7'); put('A7', `Sector/Line      :  ${d.sectorLine || ''}`, { font: { color: { argb: BLUE } } });
  ws.getRow(8).height = 8;
  merge('A9', 'B9'); put('A9', `N (Necessary?)    [ ${d.nrb.n} ]`, { font: { size: 10 } });
  merge('C9', 'F9'); put('C9', `R (Right Time & Right Q'ty?)    [ ${d.nrb.r} ]`, { font: { size: 10 } });
  merge('G9', 'I9'); put('G9', `B (Best Price?)    [ ${d.nrb.b} ]`, { font: { size: 10 } });
  merge('A10', 'F10'); put('A10', `Total Amount  :  BDT ${Number(d.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, { font: { size: 12 } });
  for (let c = 1; c <= 9; c++) ws.getCell(10, c).border = { bottom: { style: 'medium', color: { argb: 'FF000000' } } };

  merge('A11', 'I11'); put('A11', `(${numberToWords(d.total || 0)})`, { font: { size: 10, italic: true, bold: false } });

  // table
  merge('A12', 'F12'); put('A12', 'APPLICATION - ADVANCE PAYMENT', { align: { horizontal: 'center' }, fill: 'FFF2F2F2' });
  merge('G12', 'I12'); put('G12', 'RESOLUTION', { align: { horizontal: 'center' }, fill: 'FFF2F2F2' });
  ['No.', 'Particulars - Goods/Services', 'Unit', "Q'ty", 'U/P', 'Amount (BDT)', "Q'ty", 'U/P', 'Amount (BDT)'].forEach((h, i) =>
    put(ws.getCell(13, i + 1).address, h, { font: { size: 10 }, align: { horizontal: 'center' }, fill: 'FFF2F2F2' }));
  box(12, 1, 13, 9);
  d.rows.forEach((r, i) => {
    const row = 14 + i; ws.getRow(row).height = 22;
    const money = (ref, v) => put(ref, v == null ? null : Number(v), { align: { horizontal: 'right' }, fmt: '#,##0.00' });
    put(`A${row}`, i + 1, { align: { horizontal: 'center' } });
    put(`B${row}`, r.p || null, { font: { size: 10, color: { argb: BLUE } }, align: { wrap: true } });
    put(`C${row}`, r.unit || null, { font: { color: { argb: BLUE } }, align: { horizontal: 'center' } });
    put(`D${row}`, r.a ? r.a.q : null, { font: { color: { argb: BLUE } }, align: { horizontal: 'right' } });
    money(`E${row}`, r.a ? r.a.u : null); ws.getCell(`E${row}`).font = F({ color: { argb: BLUE } });
    money(`F${row}`, r.a ? r.a.t : null);
    put(`G${row}`, r.r ? r.r.q : null, { font: { color: { argb: BLUE } }, align: { horizontal: 'right' } });
    money(`H${row}`, r.r ? r.r.u : null); ws.getCell(`H${row}`).font = F({ color: { argb: BLUE } });
    money(`I${row}`, r.r ? r.r.t : null);
    box(row, 1, row, 9);
  });
  const t1 = 26; ws.getRow(t1).height = 20; ws.getRow(t1 + 1).height = 20;
  merge(`A${t1}`, `E${t1}`); put(`A${t1}`, '(A) Total amount paid in advance :        BDT:', { font: { size: 10 }, align: { horizontal: 'left' } });
  put(`F${t1}`, Number(d.aTotal || 0), { align: { horizontal: 'right' }, fmt: '#,##0.00' });
  merge(`G${t1}`, `H${t1}`); put(`G${t1}`, '(B) Total Resolution BDT:', { font: { size: 9 } });
  put(`I${t1}`, Number(d.rTotal || 0), { align: { horizontal: 'right' }, fmt: '#,##0.00' });
  merge(`A${t1 + 1}`, `E${t1 + 1}`); put(`A${t1 + 1}`, 'Net Payable/(refundable) after advance deduction', { font: { size: 10 } });
  put(`F${t1 + 1}`, d.netApp == null ? null : Number(d.netApp), { align: { horizontal: 'right' }, fmt: '#,##0.00' });
  put(`G${t1 + 1}`, '(A-B)', { font: { size: 10 }, align: { horizontal: 'right' } }); put(`H${t1 + 1}`, 'BDT:', { font: { size: 9 }, align: { horizontal: 'right' } });
  put(`I${t1 + 1}`, Number(d.netRes || 0), { align: { horizontal: 'right' }, fmt: '#,##0.00' });
  box(t1, 1, t1 + 1, 9);
  for (let c = 1; c <= 9; c++) ws.getCell(t1, c).border = { ...BORDER, top: { style: 'medium', color: { argb: 'FF000000' } } };

  // payment / budget
  merge('A29', 'D29'); put('A29', `Payment Needed  :  Date :  ${dmy(d.paymentDate)}   by Cash/Cheque`, { font: { size: 10, color: { argb: BLUE } } });
  merge('F29', 'I29'); put('F29', `Settle by the date of :  ${dmy(d.settleDate)}`, { font: { size: 10, color: { argb: BLUE } } });
  merge('A30', 'D30'); put('A30', `Budget Control  :  A/C Name :  ${d.budgetAccount || ''}`, { font: { size: 10, color: { argb: BLUE } } });
  merge('F30', 'I30'); put('F30', `Budget Remaining :  USD/BDT   ${d.budgetRemaining || 0}`, { font: { size: 10, color: { argb: BLUE } } });
  put('A32', 'Remarks:', {});
const rem = String(d.remarks || '').slice(0, 700);
const remSize = rem.length > 450 ? 7 : rem.length > 300 ? 8 : rem.length > 160 ? 9 : 10;
ws.getRow(33).height = 30; ws.getRow(34).height = 30; // fixed height, never grows
merge('A33', 'I34');
put('A33', rem, { font: { size: remSize, bold: false, color: { argb: BLUE } }, align: { vertical: 'top', wrap: true } });
box(33, 1, 34, 9);
  addLogo(35); put('B36', 'HKD Group', { align: { vertical: 'middle' } }); ws.getRow(36).height = 22;

  // cut line + cashier copy
  for (let c = 1; c <= 9; c++) ws.getCell(38, c).border = { top: dashed };
  merge('A39', 'F39'); put('A39', 'REQUEST FOR PAYMENT (for Cashier)', { font: { size: 11 } });
  put('H39', 'No:', { align: { horizontal: 'right' } }); put('I39', `MIS- ${d.billNo}`, { font: { color: { argb: BLUE } }, align: { horizontal: 'center' } }); dotted('I39');
  merge('A41', 'D41'); put('A41', 'Payment Received in ADVANCE:', { font: { size: 10 } });
  merge('F41', 'I41'); put('F41', `Expected settle Date:  ${dmy(d.settleDate)}`, { font: { size: 10 } });
  put('B42', 'Amount', { font: { size: 10 } }); merge('C42', 'D42'); put('C42', 'USD/BDT', { font: { size: 10 } });
  merge('E42', 'F42'); put('E42', `BDT ${Number(d.aTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, { font: { color: { argb: BLUE } }, align: { horizontal: 'right' } }); dotted('E42'); dotted('F42');
  put('B43', 'Date', { font: { size: 10 } }); merge('E43', 'F43'); dotted('E43'); dotted('F43');
  put('B45', 'Recipient Signature', { font: { size: 10 } }); merge('E45', 'F45'); dotted('E45'); dotted('F45');
  put('B46', 'Recipient Name', { font: { size: 10 } }); merge('E46', 'F46'); put('E46', d.applicantName || '', { font: { size: 10, color: { argb: BLUE } } }); dotted('E46'); dotted('F46');
  addLogo(47); put('B48', 'HKD Group', { align: { vertical: 'middle' } }); ws.getRow(48).height = 22;
  ws.pageSetup.printArea = 'A1:I49';
  return wb;
}