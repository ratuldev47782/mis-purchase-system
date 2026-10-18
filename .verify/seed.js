const mongoose = require('mongoose');

const CATS = ['Printer/Printer Servicing Accessories/Gear', 'Mother board Service Bill',
  'Monthly Internet bill', 'Installation charge of Internet', 'IT Accessories', 'UPS Battery'];

const item = (particulars, unit, qty, unitPrice) =>
  ({ particulars, unit, qty, unitPrice, amount: qty * unitPrice });

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017', { dbName: 'MIS_Parchase_DB' });
  const col = (n) => mongoose.connection.collection(n);
  await col('users').deleteMany({});
  await col('settings').deleteMany({});
  await col('categories').deleteMany({});
  await col('suppliers').deleteMany({});
  await col('bills').deleteMany({});
  await col('ledgerEntries').deleteMany({});

  await col('users').insertOne({ username: 'admin', password: 'admin123', name: 'Admin' });
  await col('settings').insertOne({ _id: 'main', startingBillNo: 1, ledgerAmountMode: 'subtotal' });
  const cats = CATS.map((name, i) => ({ _id: new mongoose.Types.ObjectId(), name, sortOrder: i + 1 }));
  await col('categories').insertMany(cats);
  const acc = cats.find((c) => c.name === 'IT Accessories');

  const sups = [
    { _id: new mongoose.Types.ObjectId(), name: 'Delta Computer', phone: '01711', address: 'Chittagong' },
    { _id: new mongoose.Types.ObjectId(), name: 'Nova Network Ltd', phone: '01822', address: 'Dhaka' },
  ];
  await col('suppliers').insertMany(sups);

  const doc = (items, remarks, adv) => {
    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    const ait = { on: true, amount: Math.round((subtotal * 0.05) / 0.95) };
    const total = subtotal + ait.amount;
    return {
      items, subtotal, ait, vat: { on: false, mode: 'amount', value: 0, amount: 0 },
      tax: { on: false, mode: 'amount', value: 0, amount: 0 }, total, remarks,
      advancePaid: adv, netPayable: adv - total, paymentDate: '', settleDate: '',
      budgetAccount: '', budgetRemaining: '',
    };
  };

  const A1 = doc([item('Processor Motherboard for CAD', 'PCS', 2, 14500),
    item('UPS Battery 12V', 'PCS', 3, 2200)],
  'Requested by CAD department, price verified from 3 quotations.', 35539);
  const R1 = doc([item('Processor Motherboard for CAD', 'PCS', 2, 14500),
    item('UPS Battery 12V', 'PCS', 3, 2200)],
  'Approved by GM. Pay from IT Accessories budget - full settlement, no balance carried.', 0);
  const A2 = doc([item('Cat-6 LAN Cable 305m', 'Roll', 2, 4800)],
  'Urgent: floor-3 network cable replacement.', 10095);
  const R2 = doc([item('Laser Printer Toner', 'PCS', 5, 1900)],
  'Resolution cleared, 5% AIT deducted at source.', 0);
  const A3 = doc([item('Network Switch 24 Port', 'PCS', 1, 12500)],
  'For the new studio room.', 13255);
  const A4 = doc([item('Desktop RAM 8GB DDR4', 'PCS', 6, 2150)],
  '', 13547);
  const A5 = doc([item('Monitor 22 inch', 'PCS', 4, 11800)],
  'Replaced two faulty monitors ofAccounts.', 50000);

  const mk = (billNo, sl, fileName, sup, date, dateLabel, extra) => ({
    billNo, sl, title: `${billNo} ${fileName}`, fileName,
    supplierId: sup._id, supplierName: sup.name, applicantName: 'Rahim Uddin',
    sectorLine: 'MIS/K2', date, dateLabel,
    nrb: { n: 'Y', r: 'Y', b: 'Y' }, department: 'CAD(PC-1)',
    ledgerMonth: date.slice(0, 7), categoryId: String(acc._id),
    files: [], paymentStatus: 'Due', paidDate: '',
    status: 'Pending ( File Not Given to AC Yet )',
    summaryAmountExpr: '', summaryManual: false, descManual: false,
    createdAt: new Date(date), updatedAt: new Date(date),
    ...extra,
  });

  await col('bills').insertMany([
    mk(1, 1, 'Processor Motherboard', sups[0], '2026-07-15', '15-July-2026', {
      stage: 'Resolution', application: A1, resolution: R1,
      summaryAmount: R1.subtotal, itemDescription: A1.items.map((i) => i.particulars).join(', '),
      paymentStatus: 'Paid', paidDate: '2026-07-28', status: 'Done',
    }),
    mk(2, 2, 'LAN Cable for Floor 3', sups[1], '2026-08-05', '', {
      stage: 'Application', application: A2, resolution: null,
      summaryAmount: A2.subtotal, itemDescription: A2.items.map((i) => i.particulars).join(', '),
      status: 'Application Scan File Uploaded',
    }),
    mk(3, 3, 'Printer Toner (direct resolution)', sups[1], '2026-09-10', '', {
      stage: 'Resolution', application: null, resolution: R2,
      summaryAmount: R2.subtotal, itemDescription: R2.items.map((i) => i.particulars).join(', '),
      status: 'File Sent to A/C',
    }),
    mk(4, 4, 'Studio Switch', sups[1], '2026-10-02', '', {
      stage: 'Resolution', application: A3,
      resolution: { ...A3, remarks: 'Studio switch approved against quotation #A-991.' },
      summaryAmount: A3.subtotal, itemDescription: A3.items.map((i) => i.particulars).join(', '),
      status: 'Pending',
    }),
    mk(5, 5, 'RAM for CAD workstations', sups[0], '2026-10-08', '', {
      stage: 'Application', application: A4, resolution: null,
      summaryAmount: A4.subtotal, itemDescription: A4.items.map((i) => i.particulars).join(', '),
      paymentStatus: 'Paid', paidDate: '2026-10-10',
    }),
    mk(6, 6, 'Monitors for Accounts', sups[0], '2026-12-03', '3-December-2026(For December)', {
      stage: 'Application', application: A5, resolution: null,
      summaryAmount: A5.subtotal, itemDescription: A5.items.map((i) => i.particulars).join(', '),
      status: 'Resolution Scan File Uploaded',
    }),
  ]);

  const fy = '2026-2027';
  const entries = [
    { month: '2026-07', qty: 5, amount: 37600, billNo: 1 },
    { month: '2026-08', qty: 2, amount: 9600, billNo: 2 },
    { month: '2026-09', qty: 5, amount: 9500, billNo: 3 },
    { month: '2026-10', qty: 7, amount: 25400, billNo: 4 },
    { month: '2026-11', qty: 1, amount: 12500, billNo: 7 },
    { month: '2026-12', qty: 4, amount: 47200, billNo: 6 },
    { month: '2027-01', qty: 3, amount: 6600, billNo: 8 },
  ];
  await col('ledgerEntries').insertMany(entries.map((e, i) => ({
    fiscalYear: fy, month: e.month, categoryId: String(acc._id), billNo: e.billNo, qty: e.qty, amount: e.amount,
    _id: new mongoose.Types.ObjectId(), __v: 0,
  })));
  // one row for a second category so the grid has more than one line
  const ups = cats.find((c) => c.name === 'UPS Battery');
  await col('ledgerEntries').insertMany([
    { fiscalYear: fy, month: '2026-10', categoryId: String(ups._id), billNo: 9, qty: 2, amount: 5400, __v: 0 },
    { fiscalYear: '2025-2026', month: '2026-03', categoryId: String(acc._id), billNo: 99, qty: 2, amount: 8800, __v: 0 },
  ]);

  console.log('SEEDED');
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });