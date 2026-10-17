set -u
B=${B:-http://localhost:3100}
C=/tmp/mis_smoke_cookies.txt
rm -f $C
pass=0; fail=0
chk(){ if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS  $1"; else fail=$((fail+1)); echo "FAIL  $1 (expected [$2] got [$3])"; fi; }
val(){ node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log($1)" 2>/dev/null || echo "JSONERR"; }

# --- auth ---
chk "middleware: api without cookie -> 401" 401 "$(curl -s -o /dev/null -w '%{http_code}' $B/api/bills)"
chk "login wrong password -> 401" 401 "$(curl -s -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' -d '{"username":"admin","password":"nope"}' $B/api/login)"
chk "login seeded admin -> 200" 200 "$(curl -s -o /tmp/sm_login.json -w '%{http_code}' -c $C -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' $B/api/login)"
chk "login returns name Admin" Admin "$(val 'j.name' < /tmp/sm_login.json)"

# --- settings ---
s=$(curl -sb $C $B/api/settings)
chk "settings seeded startingBillNo=1" 1 "$(echo "$s" | val 'j.startingBillNo')"
chk "settings seeded mode=subtotal" subtotal "$(echo "$s" | val 'j.ledgerAmountMode')"
chk "settings invalid startingBillNo -> 400" 400 "$(curl -s -o /dev/null -w '%{http_code}' -b $C -X PUT -H 'Content-Type: application/json' -d '{"startingBillNo":0}' $B/api/settings)"
s=$(curl -sb $C -X PUT -H 'Content-Type: application/json' -d '{"startingBillNo":2182,"ledgerAmountMode":"total"}' $B/api/settings)
chk "settings PUT applied" 2182 "$(echo "$s" | val 'j.settings.startingBillNo')"
chk "next bill no honours startingBillNo (empty db)" 2182 "$(curl -sb $C $B/api/bills/next | val 'j.nextBillNo')"
chk "settings PUT invalid mode -> 400" 400 "$(curl -s -o /dev/null -w '%{http_code}' -b $C -X PUT -H 'Content-Type: application/json' -d '{"ledgerAmountMode":"bogus"}' $B/api/settings)"
curl -sb $C -X PUT -H 'Content-Type: application/json' -d '{"startingBillNo":1,"ledgerAmountMode":"subtotal"}' $B/api/settings > /dev/null

# --- categories ---
cats=$(curl -sb $C $B/api/categories)
chk "categories seeded = 6" 6 "$(echo "$cats" | val 'j.length')"
chk "category empty name -> 400" 400 "$(curl -s -o /dev/null -w '%{http_code}' -b $C -H 'Content-Type: application/json' -d '{"name":""}' $B/api/categories)"
curl -sb $C -H 'Content-Type: application/json' -d '{"name":"Temp Cat"}' $B/api/categories > /dev/null
chk "category created = 7" 7 "$(curl -sb $C $B/api/categories | val 'j.length')"
TMPID=$(curl -sb $C $B/api/categories | val "j.find(x=>x.name==='Temp Cat')._id")
curl -sb $C -X PUT -H 'Content-Type: application/json' -d "{\"_id\":\"$TMPID\",\"name\":\"Temp Cat 2\",\"sortOrder\":9}" $B/api/categories > /dev/null
chk "category renamed" "Temp Cat 2" "$(curl -sb $C $B/api/categories | val "j.find(x=>x._id==='$TMPID').name")"
curl -sb $C -X DELETE "$B/api/categories?id=$TMPID" > /dev/null
chk "category deleted = 6" 6 "$(curl -sb $C $B/api/categories | val 'j.length')"
CAT=$(echo "$cats" | val 'j.find(x=>x.name==="IT Accessories")._id')
chk "found IT Accessories category id" 24 "$(echo -n "$CAT" | wc -c | tr -d ' ')"

# --- suppliers ---
sup=$(curl -sb $C -H 'Content-Type: application/json' -d '{"name":"Smoke Supplier","phone":"017","address":"DHK"}' $B/api/suppliers)
SID=$(echo "$sup" | val 'j.supplier._id')
chk "supplier created has 24-char id" 24 "$(echo -n "$SID" | wc -c | tr -d ' ')"
chk "duplicate supplier (case-insensitive) -> 400" 400 "$(curl -s -o /dev/null -w '%{http_code}' -b $C -H 'Content-Type: application/json' -d '{"name":"smoke supplier"}' $B/api/suppliers)"
chk "suppliers list = 1" 1 "$(curl -sb $C $B/api/suppliers | val 'j.length')"
SUPID=$(curl -sb $C $B/api/suppliers | val 'j[0]._id')
curl -sb $C -X PUT -H 'Content-Type: application/json' -d "{\"_id\":\"$SUPID\",\"name\":\"Smoke Supplier\",\"phone\":\"018\",\"address\":\"CTG\"}" $B/api/suppliers > /dev/null
chk "supplier updated phone" 018 "$(curl -sb $C $B/api/suppliers | val 'j[0].phone')"

# --- next bill no + first bill ---
chk "next bill no (fresh db) = 1" 1 "$(curl -sb $C $B/api/bills/next | val 'j.nextBillNo')"

mk_payload() { # $1 = JSON config {fileName,kind,item,qty,price,month,sid,cat}
  node -e "
    const c = JSON.parse(process.argv[1]);
    const p = {kind: c.kind,
      head: {fileName: c.fileName, supplierId: c.sid, applicantName:'Tester', sectorLine:'MIS/K2',
        date:'2025-07-15', dateLabel:'', department:'MIS',
        ledgerMonth: c.month, categoryId: c.cat, nrb:{n:'Y',r:'Y',b:'Y'}},
      doc: {items:[{particulars: c.item, unit:'pcs', qty: c.qty, unitPrice: c.price}],
        ait:{on:true}, vat:{on:false}, tax:{on:false}, remarks:'smoke'},
      pay: {advancePaid:'', paymentDate:'2025-07-16', settleDate:'', budgetAccount:'', budgetRemaining:''}};
    process.stdout.write(JSON.stringify(p));
  " "$1"
}

APP=$(mk_payload "{\"fileName\":\"Smoke File\",\"kind\":\"application\",\"item\":\"UPS Battery\",\"qty\":1,\"price\":30900,\"month\":\"2025-07\",\"sid\":\"$SID\",\"cat\":\"$CAT\"}")
r=$(curl -sb $C -H 'Content-Type: application/json' -d "$APP" $B/api/bills)
chk "bill 1 saved" 1 "$(echo "$r" | val 'j.bill.billNo')"
chk "bill 1 subtotal 30900" 30900 "$(echo "$r" | val 'j.bill.application.subtotal')"
chk "bill 1 AIT = ROUND(30900*5%/0.95) = 1626" 1626 "$(echo "$r" | val 'j.bill.application.ait.amount')"
chk "bill 1 total 32526" 32526 "$(echo "$r" | val 'j.bill.application.total')"
chk "bill 1 advancePaid = total" 32526 "$(echo "$r" | val 'j.bill.application.advancePaid')"
chk "bill 1 netPayable 0" 0 "$(echo "$r" | val 'j.bill.application.netPayable')"
chk "bill 1 stage Application" Application "$(echo "$r" | val 'j.bill.stage')"
chk "bill 1 supplierName copy" "Smoke Supplier" "$(echo "$r" | val 'j.bill.supplierName')"
chk "bill 1 title" "1 Smoke File" "$(echo "$r" | val 'j.bill.title')"
chk "bill 1 itemDescription" "UPS Battery" "$(echo "$r" | val 'j.bill.itemDescription')"
chk "bill 1 paymentStatus Due" Due "$(echo "$r" | val 'j.bill.paymentStatus')"
chk "bill 1 summaryAmount = subtotal mode" 30900 "$(echo "$r" | val 'j.bill.summaryAmount')"

# --- validation / errors ---
chk "invalid bill kind -> 400" 400 "$(curl -s -o /dev/null -w '%{http_code}' -b $C -H 'Content-Type: application/json' -d "$(echo "$APP" | sed 's/"kind":"application"/"kind":"nope"/')" $B/api/bills)"
chk "unknown supplier -> 400" 400 "$(curl -s -o /dev/null -w '%{http_code}' -b $C -H 'Content-Type: application/json' -d "$(echo "$APP" | sed "s/$SID/64b000000000000000000000/")" $B/api/bills)"
chk "no items -> 400" 400 "$(curl -s -o /dev/null -w '%{http_code}' -b $C -H 'Content-Type: application/json' -d "$(echo "$APP" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);j.doc.items=[];process.stdout.write(JSON.stringify(j))})")" $B/api/bills)"
chk "missing ledger month -> 400" 400 "$(curl -s -o /dev/null -w '%{http_code}' -b $C -H 'Content-Type: application/json' -d "$(echo "$APP" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);j.head.ledgerMonth='';j.head.categoryId='';process.stdout.write(JSON.stringify(j))})")" $B/api/bills)"
chk "unknown bill -> 404" 404 "$(curl -s -o /dev/null -w '%{http_code}' -b $C $B/api/bills/999)"
chk "bills list = 1" 1 "$(curl -sb $C $B/api/bills | val 'j.length')"

APP2=$(mk_payload "{\"fileName\":\"Second\",\"kind\":\"application\",\"item\":\"Toner\",\"qty\":2,\"price\":500,\"month\":\"2025-08\",\"sid\":\"$SID\",\"cat\":\"$CAT\"}")
r2=$(curl -sb $C -H 'Content-Type: application/json' -d "$APP2" $B/api/bills)
chk "bill 2 auto billNo = 2" 2 "$(echo "$r2" | val 'j.bill.billNo')"
chk "bill 2 sl = 2" 2 "$(echo "$r2" | val 'j.bill.sl')"
chk "bills list = 2" 2 "$(curl -sb $C $B/api/bills | val 'j.length')"

# --- resolution A on bill 1 (31500 + ait = 33158) ---
RES=$(node -e "
  const p = {kind:'resolutionA', parentBillNo:1,
    head:{ledgerMonth:'2025-07', categoryId: process.argv[1]},
    doc:{items:[{particulars:'UPS Battery', unit:'', qty:1, unitPrice:31500}], ait:{on:true}, vat:{on:false}, tax:{on:false}, remarks:'resolved'},
    pay:{paymentDate:'2025-07-20', settleDate:'2025-07-25', budgetAccount:'BA-1', budgetRemaining:'100'}};
  process.stdout.write(JSON.stringify(p));
" "$CAT")
r=$(curl -sb $C -H 'Content-Type: application/json' -d "$RES" $B/api/bills)
chk "resolution stage Resulation" Resulation "$(echo "$r" | val 'j.bill.stage')"
chk "resolution total 33158" 33158 "$(echo "$r" | val 'j.bill.resolution.total')"
chk "resolution netPayable = 32526-33158" -632 "$(echo "$r" | val 'j.bill.resolution.netPayable')"
chk "resolution copied application advancePaid" 32526 "$(echo "$r" | val 'j.bill.resolution.advancePaid')"
chk "application preserved" 32526 "$(echo "$r" | val 'j.bill.application.total')"
chk "resolution remarks" resolved "$(echo "$r" | val 'j.bill.resolution.remarks')"
chk "resolutionA copies application pay fields" 2025-07-16 "$(echo "$r" | val 'j.bill.resolution.paymentDate')"
chk "resolutionA ignores payload pay fields (uses application's)" "" "$(echo "$r" | val 'j.bill.resolution.budgetAccount')"

# --- PATCH ---
r=$(curl -sb $C -X PATCH -H 'Content-Type: application/json' -d '{"paymentStatus":"Paid","dateLabel":"15-Jul-2025"}' $B/api/bills/1)
chk "PATCH paymentStatus Paid" Paid "$(echo "$r" | val 'j.bill.paymentStatus')"
chk "PATCH paidDate set (10 chars)" 10 "$(echo "$r" | val 'j.bill.paidDate.length')"
chk "PATCH dateLabel" "15-Jul-2025" "$(echo "$r" | val 'j.bill.dateLabel')"
r=$(curl -sb $C -X PATCH -H 'Content-Type: application/json' -d '{"summaryAmountExpr":"450+950"}' $B/api/bills/1)
chk "PATCH manual expression = 1400" 1400 "$(echo "$r" | val 'j.bill.summaryAmount')"
chk "PATCH summaryManual true" true "$(echo "$r" | val 'j.bill.summaryManual')"
r=$(curl -sb $C -X PATCH -H 'Content-Type: application/json' -d '{"summaryAmountExpr":""}' $B/api/bills/1)
chk "PATCH reset expression -> effective 31500" 31500 "$(echo "$r" | val 'j.bill.summaryAmount')"
chk "PATCH reset summaryManual false" false "$(echo "$r" | val 'j.bill.summaryManual')"
chk "PATCH bad paymentStatus -> 400" 400 "$(curl -s -o /dev/null -w '%{http_code}' -b $C -X PATCH -H 'Content-Type: application/json' -d '{"paymentStatus":"Maybe"}' $B/api/bills/1)"
chk "PATCH bad expression -> 400" 400 "$(curl -s -o /dev/null -w '%{http_code}' -b $C -X PATCH -H 'Content-Type: application/json' -d '{"summaryAmountExpr":"2+2a"}' $B/api/bills/1)"
chk "PATCH unknown bill -> 404" 404 "$(curl -s -o /dev/null -w '%{http_code}' -b $C -X PATCH -H 'Content-Type: application/json' -d '{"status":"x"}' $B/api/bills/999)"

# --- upload / file ---
printf '%%PDF-1.4 smoke test file' > mis-app/smoke-tmp.pdf
up=$(curl -sb $C -F "file=@mis-app/smoke-tmp.pdf;type=application/pdf" "$B/api/upload?bill=1&category=application")
chk "upload ok" true "$(echo "$up" | val 'j.ok')"
FN=$(echo "$up" | val 'j.files[0].savedName')
chk "file served with content-type" "200 application/pdf" "$(curl -s -o /tmp/sm_file.pdf -w '%{http_code} %{content_type}' -b $C "$B/api/file?bill=1&name=$FN")"
chk "file body intact" "%PDF-1.4 smoke test file" "$(cat /tmp/sm_file.pdf)"
chk "delete file -> 200" 200 "$(curl -s -o /dev/null -w '%{http_code}' -b $C -X DELETE "$B/api/file?bill=1&name=$FN")"
chk "files array empty after delete" 0 "$(curl -sb $C $B/api/bills/1 | val 'j.files.length')"
chk "missing file -> 404" 404 "$(curl -s -o /dev/null -w '%{http_code}' -b $C "$B/api/file?bill=1&name=gone.pdf")"
chk "bad upload category -> 400" 400 "$(curl -s -o /dev/null -w '%{http_code}' -b $C -F "file=@mis-app/smoke-tmp.pdf;type=application/pdf" "$B/api/upload?bill=1&category=bogus")"
chk "upload to unknown bill -> 404" 404 "$(curl -s -o /dev/null -w '%{http_code}' -b $C -F "file=@mis-app/smoke-tmp.pdf;type=application/pdf" "$B/api/upload?bill=999&category=application")"
rm -f mis-app/smoke-tmp.pdf

# --- ledger ---
L=$(curl -sb $C "$B/api/ledger?month=2025-07")
chk "ledger fiscal year" 2025-2026 "$(echo "$L" | val 'j.fy')"
chk "ledger qty (resolution replaces application)" 1 "$(echo "$L" | val "j.rows.find(r=>r.id==='$CAT').cells['2025-07'].qty")"
chk "ledger amount = effective subtotal" 31500 "$(echo "$L" | val "j.rows.find(r=>r.id==='$CAT').cells['2025-07'].amount")"
chk "ledger cell lists bill 1" 1 "$(echo "$L" | val "j.rows.find(r=>r.id==='$CAT').cells['2025-07'].bills[0]")"
chk "ledger month total" 31500 "$(echo "$L" | val "j.totals['2025-07'].amount")"
chk "ledger fy list (test FY + current FY)" 2 "$(echo "$L" | val 'j.fiscalYears.length')"
# ledger amounts are stored per bill; the mode is applied on (re)saving.
# Switching settings must flow into the next recalculation:
curl -sb $C -X PUT -H 'Content-Type: application/json' -d '{"ledgerAmountMode":"total"}' $B/api/settings > /dev/null
r=$(curl -sb $C -X PATCH -H 'Content-Type: application/json' -d '{"summaryAmountExpr":""}' $B/api/bills/1)
chk "recompute in mode=total uses resolution total (33158)" 33158 "$(echo "$r" | val 'j.bill.summaryAmount')"
curl -sb $C -X PUT -H 'Content-Type: application/json' -d '{"ledgerAmountMode":"subtotal"}' $B/api/settings > /dev/null
chk "delete category used by bill -> 400" 400 "$(curl -s -o /dev/null -w '%{http_code}' -b $C -X DELETE "$B/api/categories?id=$CAT")"

# --- excel exports ---
chk "export summary xlsx" "200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" "$(curl -s -o /tmp/sm_sum.xlsx -w '%{http_code} %{content_type}' -b $C $B/api/export/summary)"
chk "export summary is zip/xlsx" "504b0304" "$(head -c4 /tmp/sm_sum.xlsx | xxd -p)"
chk "export ledger xlsx" "200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" "$(curl -s -o /tmp/sm_led.xlsx -w '%{http_code} %{content_type}' -b $C "$B/api/export/ledger?month=2025-07")"
chk "export ledger is zip/xlsx" "504b0304" "$(head -c4 /tmp/sm_led.xlsx | xxd -p)"

# --- pages render ---
for p in /login /new /ledger /summary /settings /suppliers /bill/1 /bill/2 /print/1; do
  chk "page $p -> 200" 200 "$(curl -s -o /dev/null -w '%{http_code}' -b $C $B$p)"
done

# --- deletes ---
chk "delete bill 2 -> 200" 200 "$(curl -s -o /dev/null -w '%{http_code}' -b $C -X DELETE $B/api/bills/2)"
chk "delete bill 2 again -> 404" 404 "$(curl -s -o /dev/null -w '%{http_code}' -b $C -X DELETE $B/api/bills/2)"
curl -sb $C -X DELETE $B/api/bills/1 > /dev/null
chk "bills empty after deletes" 0 "$(curl -sb $C $B/api/bills | val 'j.length')"
chk "ledger empty after bill delete" 0 "$(curl -sb $C "$B/api/ledger?month=2025-07" | val "j.rows.find(r=>r.id==='$CAT').totalQty")"
chk "logout -> 302" 302 "$(curl -s -o /dev/null -w '%{http_code}' -b $C $B/api/logout)"

echo "----------------------------------"
echo "PASS=$pass FAIL=$fail"
[ "$fail" -eq 0 ]
