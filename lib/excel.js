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

// ---------------------------------------------------------------------------
// HKD logo (public/HKD_LOGO.png). File name is case-sensitive on Linux/Vercel.
// Returns an ExcelJS image id, or null if the file cannot be read.
// ---------------------------------------------------------------------------
const LOGO_FILE = 'HKD_LOGO.png';
function loadLogo(wb) {
  try {
    return wb.addImage({
      buffer: fs.readFileSync(path.join(process.cwd(), 'public', LOGO_FILE)),
      extension: 'png',
    });
  } catch (e) {
    return null;
  }
}

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
  // ---- Heading: only 3 rows (30 + 18 + 14 = 62pt) ----
  const NAVY = 'FF1F3864';
  // style is set BEFORE merging so the merged range keeps fill + border
  const heading = (text, rowNo, { size, color, bg, align = 'center', italic = false, height, underline = false }) => {
    const r = ws.addRow([text]);
    r.height = height;
    const c = r.getCell(1);
    c.font = { bold: !italic, italic, size, color: { argb: color } };
    c.alignment = { horizontal: align, vertical: 'middle', indent: align === 'right' ? 1 : 0 };
    if (bg) c.fill = fill(bg);
    if (underline) c.border = { bottom: { style: 'medium', color: { argb: NAVY } } };
    ws.mergeCells(rowNo, 1, rowNo, lastCol);
  };
  heading('HKD Outdoor Innovations Limited', 1, { size: 16, color: NAVY, bg: 'FFDCE6F1', height: 30 });
  heading(
    `Historical Record of "IT Expenses" - ${highlight ? 'IT Accessories, ' + monthLabel(highlight).replace(' ', '_') : L.fy}`,
    2, { size: 11, color: 'FF000000', bg: 'FFEEF3F9', height: 18 },
  );
  heading('All Figure in BDT', 3, { size: 9, color: 'FF595959', align: 'right', italic: true, height: 14, underline: true });

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
  // logo: centered together with the company name (left of the name, in heading row 1)
  const logo = loadLogo(wb);
  if (logo !== null) {
    const colPx = (c) => Math.round((ws.getColumn(c).width || 8.43) * 7 + 5);
    const totalPx = Array.from({ length: lastCol }, (_, i) => colPx(i + 1)).reduce((a, b) => a + b, 0);
    const LOGO_W = 36; const LOGO_H = 37; const NAME_W = 350; // approx. width of the 16pt company name
    let x = Math.max(0, totalPx / 2 - NAME_W / 2 - 10 - LOGO_W); // px from the left edge
    let col = 0;
    while (col < lastCol - 1 && x >= colPx(col + 1)) { x -= colPx(col + 1); col += 1; }
    ws.addImage(logo, { tl: { col: col + x / colPx(col + 1), row: 0.04 }, ext: { width: LOGO_W, height: LOGO_H } });
  }
  // same font as the original IT Accessories sheet
  ws.eachRow((r) => r.eachCell({ includeEmpty: true }, (c) => { c.font = { ...(c.font || {}), name: 'Times New Roman', size: (c.font && c.font.size) || 11 }; }));
  return wb;
}

// ---------------------------------------------------------------------------
// One bill -> the "REQUEST FOR PAYMENT" sheet (same layout as the printed paper form)
//
// Rows 14.. are the item rows (min 9, grows with comment rows / extra rows) + AIT/VAT/TAX.
// Everything below the table is positioned with R(n), where n is the row number of the
// ORIGINAL 9-row layout and R() shifts it down when the table is longer.
// Comment rows (r.c): Particulars -> last column merged, multi-line text, no unit/qty/price/amount.
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
    c.value = value; c.font = F(o.font);
    if (o.align || o.wrap) c.alignment = { vertical: 'middle', wrapText: !!o.wrap, ...(o.align || {}) };
    if (o.border) c.border = o.border; if (o.fill) c.fill = fill(o.fill); if (o.fmt) c.numFmt = o.fmt;
    return c;
  };
  const merge = (a, b) => ws.mergeCells(`${a}:${b}`);
  const box = (r1, c1, r2, c2) => { for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) ws.getCell(r, c).border = BORDER; };
  const dotted = (ref) => { const c = ws.getCell(ref); c.border = { ...(c.border || {}), bottom: dashed }; };

  const logo = loadLogo(wb);
  const addLogo = (row) => { if (logo !== null) ws.addImage(logo, { tl: { col: 0.1, row }, ext: { width: 34, height: 35 } }); };

  // header
  ws.getRow(1).height = 22; ws.getRow(2).height = 18;
  addLogo(0); merge('B1', 'F1'); put('B1', 'HKD OUTDOOR INNOVATIONS LTD', { font: { size: 18 }, align: { vertical: 'middle' } });
  merge('B2', 'F2'); put('B2', 'Plot #45-50, Sec#02, Karnaphuli EPZ, Chittagong.', { font: { size: 11 } });
  put('H1', 'No:', { align: { horizontal: 'right' } }); put('I1', `MIS- ${d.billNo}`, { font: { color: { argb: BLUE } }, align: { horizontal: 'center' } }); dotted('I1');

  // title + approval grid
  put('A4', 'REQUEST FOR PAYMENT', { font: { size: 13 } }); merge('A4', 'B4');
  ['IC', 'AMGR/MGR', 'AGM', 'GM', 'DIR', 'MD', 'COO'].forEach((h, i) => put(ws.getCell(4, 3 + i).address, h, { font: { size: 8 }, align: { horizontal: 'center', vertical: 'middle' }, border: BORDER }));
  ws.getRow(5).height = 36; ws.getRow(6).height = 36; box(5, 3, 6, 9);
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
    if (r.c) {
      // comment row: B..I merged, multi-line text
      const lines = String(r.p || '').split('\n').reduce((s, l) => s + Math.max(1, Math.ceil(l.length / 100)), 0);
      ws.getRow(row).height = Math.max(22, lines * 13.5 + 4);
      ws.getCell(`A${row}`).alignment = { vertical: 'top', horizontal: 'center' };
      merge(`B${row}`, `I${row}`);
      put(`B${row}`, r.p || null, { font: { size: 10, color: { argb: BLUE } }, align: { vertical: 'top', horizontal: 'left' }, wrap: true });
      box(row, 1, row, 9);
      return;
    }
    put(`B${row}`, r.p || null, { font: { size: 10, color: { argb: BLUE } }, wrap: true });
    put(`C${row}`, r.unit || null, { font: { color: { argb: BLUE } }, align: { horizontal: 'center' } });
    put(`D${row}`, r.a ? r.a.q : null, { font: { color: { argb: BLUE } }, align: { horizontal: 'right' } });
    money(`E${row}`, r.a ? r.a.u : null); ws.getCell(`E${row}`).font = F({ color: { argb: BLUE } });
    money(`F${row}`, r.a ? r.a.t : null);
    put(`G${row}`, r.r ? r.r.q : null, { font: { color: { argb: BLUE } }, align: { horizontal: 'right' } });
    money(`H${row}`, r.r ? r.r.u : null); ws.getCell(`H${row}`).font = F({ color: { argb: BLUE } });
    money(`I${row}`, r.r ? r.r.t : null);
    box(row, 1, row, 9);
  });

  // totals: first row after the table. Original layout = row 26 (12 rows of items/AIT/VAT/TAX).
  const t1 = 14 + d.rows.length;
  const off = t1 - 26;
  const R = (n) => n + off; // original row number -> actual row number
  ws.getRow(t1).height = 20; ws.getRow(t1 + 1).height = 20;
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
  merge(`A${R(29)}`, `D${R(29)}`); put(`A${R(29)}`, `Payment Needed  :  Date :  ${dmy(d.paymentDate)}   by Cash/Cheque`, { font: { size: 10, color: { argb: BLUE } } });
  merge(`F${R(29)}`, `I${R(29)}`); put(`F${R(29)}`, `Settle by the date of :  ${dmy(d.settleDate)}`, { font: { size: 10, color: { argb: BLUE } } });
  merge(`A${R(30)}`, `D${R(30)}`); put(`A${R(30)}`, `Budget Control  :  A/C Name :  ${d.budgetAccount || ''}`, { font: { size: 10, color: { argb: BLUE } } });
  merge(`F${R(30)}`, `I${R(30)}`); put(`F${R(30)}`, `Budget Remaining :  USD/BDT   ${d.budgetRemaining || 0}`, { font: { size: 10, color: { argb: BLUE } } });
  put(`A${R(32)}`, 'Remarks:', {});
  const rem = String(d.remarks || '').slice(0, 700);
  const remSize = rem.length > 450 ? 7 : rem.length > 300 ? 8 : rem.length > 160 ? 9 : 10;
  ws.getRow(R(33)).height = 30; ws.getRow(R(34)).height = 30; // fixed height, never grows
  merge(`A${R(33)}`, `I${R(34)}`);
  put(`A${R(33)}`, rem, { font: { size: remSize, bold: false, color: { argb: BLUE } }, align: { vertical: 'top' }, wrap: true });
  box(R(33), 1, R(34), 9);
  addLogo(R(35)); put(`B${R(36)}`, 'HKD Group', { align: { vertical: 'middle' } }); ws.getRow(R(36)).height = 22;

  // cut line + cashier copy
  for (let c = 1; c <= 9; c++) ws.getCell(R(38), c).border = { top: dashed };
  merge(`A${R(39)}`, `F${R(39)}`); put(`A${R(39)}`, 'REQUEST FOR PAYMENT (for Cashier)', { font: { size: 11 } });
  put(`H${R(39)}`, 'No:', { align: { horizontal: 'right' } }); put(`I${R(39)}`, `MIS- ${d.billNo}`, { font: { color: { argb: BLUE } }, align: { horizontal: 'center' } }); dotted(`I${R(39)}`);
  merge(`A${R(41)}`, `D${R(41)}`); put(`A${R(41)}`, 'Payment Received in ADVANCE:', { font: { size: 10 } });
  merge(`F${R(41)}`, `I${R(41)}`); put(`F${R(41)}`, `Expected settle Date:  ${dmy(d.settleDate)}`, { font: { size: 10 } });
  put(`B${R(42)}`, 'Amount', { font: { size: 10 } }); merge(`C${R(42)}`, `D${R(42)}`); put(`C${R(42)}`, 'USD/BDT', { font: { size: 10 } });
  merge(`E${R(42)}`, `F${R(42)}`); put(`E${R(42)}`, `BDT ${Number(d.aTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, { font: { color: { argb: BLUE } }, align: { horizontal: 'right' } }); dotted(`E${R(42)}`); dotted(`F${R(42)}`);
  put(`B${R(43)}`, 'Date', { font: { size: 10 } }); merge(`E${R(43)}`, `F${R(43)}`); dotted(`E${R(43)}`); dotted(`F${R(43)}`);
  put(`B${R(45)}`, 'Recipient Signature', { font: { size: 10 } }); merge(`E${R(45)}`, `F${R(45)}`); dotted(`E${R(45)}`); dotted(`F${R(45)}`);
  put(`B${R(46)}`, 'Recipient Name', { font: { size: 10 } }); merge(`E${R(46)}`, `F${R(46)}`); put(`E${R(46)}`, d.applicantName || '', { font: { size: 10, color: { argb: BLUE } } }); dotted(`E${R(46)}`); dotted(`F${R(46)}`);
  addLogo(R(47)); put(`B${R(48)}`, 'HKD Group', { align: { vertical: 'middle' } }); ws.getRow(R(48)).height = 22;
  ws.pageSetup.printArea = `A1:I${R(49)}`;
  return wb;
}