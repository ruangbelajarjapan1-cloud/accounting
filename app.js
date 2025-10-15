// ===== ENDPOINT TERTANAM =====
const DEFAULT_GAS = 'https://script.google.com/macros/s/AKfycbxvyEzH2EXVr4tQ2rcrN5qxo9KkMS9Nqz0UPkokatszxbeCZqrU18K5xhVf6ERXzmT7RA/exec';
if (!localStorage.getItem('rbmj_gas')) localStorage.setItem('rbmj_gas', DEFAULT_GAS);
function setGasUrl(url){ localStorage.setItem('rbmj_gas', url); }
function uiToggleCfg(){ document.getElementById('cfg-bar').classList.toggle('hidden'); }
function uiSetEndpoint(){ const v=document.getElementById('endpoint-input')?.value?.trim(); if(!v) return alert('Isi URL /exec'); setGasUrl(v); alert('Tersimpan'); location.reload(); }
(function(){ const el=document.getElementById('endpoint-show'); if(el) el.textContent='Endpoint: '+(localStorage.getItem('rbmj_gas')||'—'); })();

// ===== LOGO UI =====
function setLogoUrl(url){ localStorage.setItem('rbmj_logo', url); loadLogo(); }
function loadLogo(){ const url=localStorage.getItem('rbmj_logo'); const img=document.getElementById('ui-logo'); if(img) img.src=url||'https://via.placeholder.com/80x80.png?text=RBMJ'; }
loadLogo();

// ===== NAV =====
function qs(id){ return document.getElementById(id); }
function show(page){ document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden')); qs('page-'+page).classList.remove('hidden'); }
document.querySelectorAll('.nav').forEach(b=> b.onclick = ()=> show(b.dataset.page));

// ===== HTTP helper (tanpa preflight) =====
async function api(action, payload={}){
  const base = localStorage.getItem('rbmj_gas');
  const res = await fetch(base+'?action='+encodeURIComponent(action),{
    method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify(payload)
  });
  if(!res.ok) throw new Error('HTTP '+res.status+' '+(await res.text()));
  return res.json();
}
async function ping(){ try{ alert('OK: '+JSON.stringify(await api('stats'))); }catch(e){ alert(e.message); } }

// ===== Cache =====
let CACHE = { students:[], teachers:[], classes:[], enrollments:[] };
const mapById = a=>{const m={}; a.forEach(x=>m[String(x.id)]=x); return m;};
const nameOfStudent = id => (CACHE._s||{})[String(id)]?.full_name || id || '—';
const nameOfClass   = id => (CACHE._c||{})[String(id)]?.class_name || id || '—';
const nameOfTeacher = id => (CACHE._t||{})[String(id)]?.full_name || id || '—';

async function refreshCache(){
  const [s,t,c,e] = await Promise.all([api('students.list'), api('teachers.list'), api('classes.list'), api('enrollments.list')]);
  CACHE.students=s; CACHE.teachers=t; CACHE.classes=c; CACHE.enrollments=e;
  CACHE._s = mapById(s); CACHE._t = mapById(t); CACHE._c = mapById(c);
}

refreshCache().then(()=>{ loadDashboard(); loadStudents(); loadTeachers(); loadClasses(); loadEnrollments(); loadAttendance(); loadPayments(); loadInvoices(); });

// ===== Dashboard =====
async function loadDashboard(){
  try{
    const s = await api('stats');
    qs('stat-students').textContent = s.students;
    qs('stat-classes').textContent  = s.classes;
    qs('stat-payments').textContent = new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY'}).format(s.paymentsThisMonth||0);
  }catch(e){ console.warn(e.message); }
}

// ===== Siswa =====
function openStudentForm(row={}){
  const full = prompt('Nama lengkap', row.full_name||''); if(full===null) return;
  const family = prompt('Family key (KK/Telp ortu)', row.family_key||'');
  const parent = prompt('Nama ortu', row.parent_name||'');
  const phone  = prompt('Telp ortu', row.parent_phone||'');
  const email  = prompt('Email', row.email||'');
  const status = prompt('Status (Active/Inactive)', row.status||'Active');
  api('students.upsert',{row:{id:row.id||'', full_name:full, family_key:family, parent_name:parent, parent_phone:phone, email, note:'', status}})
    .then(refreshCache).then(loadStudents).catch(e=>alert(e.message));
}
function loadStudents(){
  const data=CACHE.students, q=(qs('search-students')?.value||'').toLowerCase();
  const rows=data.filter(r => JSON.stringify(r).toLowerCase().includes(q));
  const h=[`<table class="min-w-full text-sm"><thead><tr class="text-left">
    <th class="p-2">ID</th><th class="p-2">Nama</th><th class="p-2">Family</th><th class="p-2">Ortu</th><th class="p-2">Kontak</th><th class="p-2">Status</th><th class="p-2"></th></tr></thead><tbody>`,
    ...rows.map(r=>`<tr class="border-t">
      <td class="p-2">${r.id}</td><td class="p-2">${r.full_name}</td><td class="p-2">${r.family_key||''}</td>
      <td class="p-2">${r.parent_name||''}</td><td class="p-2">${r.parent_phone||''}<br>${r.email||''}</td>
      <td class="p-2">${r.status||''}</td>
      <td class="p-2"><button class="text-sky-700" onclick='openStudentForm(${JSON.stringify(r)})'>Edit</button></td>
    </tr>`), `</tbody></table>`];
  qs('students-table').innerHTML=h.join('');
}
qs('search-students')?.addEventListener('input', loadStudents);

// ===== Guru =====
function openTeacherForm(row={}){
  const full=prompt('Nama lengkap', row.full_name||''); if(full===null) return;
  const phone=prompt('Telp', row.phone||''); const email=prompt('Email', row.email||''); const status=prompt('Status', row.status||'Active');
  api('teachers.upsert',{row:{id:row.id||'', full_name:full, phone, email, note:'', status}})
    .then(refreshCache).then(loadTeachers).catch(e=>alert(e.message));
}
function loadTeachers(){
  const data=CACHE.teachers;
  const h=[`<table class="min-w-full text-sm"><thead><tr class="text-left">
    <th class="p-2">ID</th><th class="p-2">Nama</th><th class="p-2">Kontak</th><th class="p-2">Status</th><th class="p-2"></th></tr></thead><tbody>`,
    ...data.map(r=>`<tr class="border-t"><td class="p-2">${r.id}</td><td class="p-2">${r.full_name}</td>
      <td class="p-2">${r.phone||''}<br>${r.email||''}</td><td class="p-2">${r.status||''}</td>
      <td class="p-2"><button class="text-sky-700" onclick='openTeacherForm(${JSON.stringify(r)})'>Edit</button></td></tr>`),
    `</tbody></table>`];
  qs('teachers-table').innerHTML=h.join('');
}

// ===== Kelas =====
function openClassForm(row={}){
  const name=prompt('Nama kelas', row.class_name||''); if(name===null) return;
  const teacher_id=prompt('ID Guru', row.teacher_id||''); const fee=prompt('SPP/bulan (JPY)', row.monthly_fee_jpy||'');
  const dow=prompt('Hari (Mon..Sun)', row.day_of_week||''); const time=prompt('Jam (HH:MM)', row.time||''); const status=prompt('Status', row.status||'Active');
  api('classes.upsert',{row:{id:row.id||'', class_name:name, teacher_id, monthly_fee_jpy:fee, day_of_week:dow, time, note:'', status}})
    .then(refreshCache).then(loadClasses).catch(e=>alert(e.message));
}
function loadClasses(){
  const data=CACHE.classes;
  const h=[`<table class="min-w-full text-sm"><thead><tr class="text-left">
    <th class="p-2">ID</th><th class="p-2">Nama</th><th class="p-2">Guru</th><th class="p-2">SPP</th><th class="p-2">Jadwal</th><th class="p-2">Status</th><th class="p-2"></th></tr></thead><tbody>`,
    ...data.map(r=>`<tr class="border-t">
      <td class="p-2">${r.id}</td><td class="p-2">${r.class_name}</td>
      <td class="p-2">${nameOfTeacher(r.teacher_id)}</td><td class="p-2">¥${r.monthly_fee_jpy}</td>
      <td class="p-2">${r.day_of_week} ${r.time||''}</td><td class="p-2">${r.status||''}</td>
      <td class="p-2"><button class="text-sky-700" onclick='openClassForm(${JSON.stringify(r)})'>Edit</button></td>
    </tr>`), `</tbody></table>`];
  qs('classes-table').innerHTML=h.join('');
}

// ===== Enrollments =====
function openEnrollForm(row={}){
  const student_id=prompt('ID Siswa', row.student_id||''); if(student_id===null) return;
  const class_id=prompt('ID Kelas', row.class_id||''); const start=prompt('Mulai (YYYY-MM)', row.start_month||''); const end=prompt('Akhir (YYYY-MM atau kosong)', row.end_month||'');
  api('enrollments.upsert',{row:{id:row.id||'', student_id, class_id, start_month:start, end_month:end}}).then(refreshCache).then(loadEnrollments).catch(e=>alert(e.message));
}
function loadEnrollments(){
  const data=CACHE.enrollments;
  const h=[`<table class="min-w-full text-sm"><thead><tr class="text-left">
    <th class="p-2">ID</th><th class="p-2">Siswa</th><th class="p-2">Kelas</th><th class="p-2">Start</th><th class="p-2">End</th><th class="p-2"></th></tr></thead><tbody>`,
    ...data.map(r=>`<tr class="border-t">
      <td class="p-2">${r.id}</td><td class="p-2">${nameOfStudent(r.student_id)}</td><td class="p-2">${nameOfClass(r.class_id)}</td>
      <td class="p-2">${r.start_month||''}</td><td class="p-2">${r.end_month||''}</td>
      <td class="p-2"><button class="text-sky-700" onclick='openEnrollForm(${JSON.stringify(r)})'>Edit</button></td>
    </tr>`), `</tbody></table>`];
  qs('enrollments-table').innerHTML=h.join('');
}

// ===== Absensi =====
function openAttendanceForm(){
  const class_id=prompt('ID Kelas',''); if(class_id===null) return;
  const student_id=prompt('ID Siswa',''); const date=prompt('Tanggal (YYYY-MM-DD)',''); const status=prompt('Status (Present/Absent/Late/Excused)','Present');
  api('attendance.add',{row:{class_id, student_id, date, status, note:''}}).then(loadAttendance).catch(e=>alert(e.message));
}
async function loadAttendance(){
  const data=await api('attendance.list');
  const h=[`<table class="min-w-full text-sm"><thead><tr class="text-left">
    <th class="p-2">Kelas</th><th class="p-2">Siswa</th><th class="p-2">Tanggal</th><th class="p-2">Status</th></tr></thead><tbody>`,
    ...data.map(r=>`<tr class="border-t"><td class="p-2">${nameOfClass(r.class_id)}</td><td class="p-2">${nameOfStudent(r.student_id)}</td><td class="p-2">${r.date}</td><td class="p-2">${r.status}</td></tr>`),
    `</tbody></table>`];
  qs('attendance-table').innerHTML=h.join('');
}

// ===== Pembayaran: modal dengan checkbox & auto-fee =====
function openPaymentModal(){
  // siswa
  qs('pay-student').innerHTML = CACHE.students.map(s=>`<option value="${s.id}">${s.full_name} — (${s.id})</option>`).join('');
  // bulan
  const m=(qs('pay-month')?.value)||new Date().toISOString().slice(0,7); qs('pay-month-modal').value=m;
  // kelas (checkbox)
  const box = CACHE.classes.map(c=>{
    const label = `${c.class_name} — ${nameOfTeacher(c.teacher_id)} — ¥${c.monthly_fee_jpy}`;
    return `<label class="flex items-center gap-2"><input type="checkbox" class="pay-class" value="${c.id}"><span>${label}</span></label>`;
  }).join('');
  qs('pay-classes-box').innerHTML = `<div class="grid md:grid-cols-2 gap-2 max-h-[220px] overflow-auto">${box}</div>`;
  qs('pay-summary').innerHTML = '';
  qs('pay-amount').value = '';
  qs('pay-method').value = 'Cash';
  qs('pay-modal').classList.remove('hidden'); qs('pay-modal').classList.add('flex');

  // re-calc saat ada perubahan
  Array.from(document.querySelectorAll('.pay-class')).forEach(ch=> ch.addEventListener('change', previewFees));
  qs('pay-student').addEventListener('change', previewFees);
}
function closePayModal(){ qs('pay-modal').classList.add('hidden'); qs('pay-modal').classList.remove('flex'); }

async function previewFees(){
  const student_id = qs('pay-student').value;
  const class_ids = Array.from(document.querySelectorAll('.pay-class:checked')).map(x=>x.value);
  if (class_ids.length===0){ qs('pay-summary').innerHTML=''; return; }
  const r = await api('fees.preview',{student_id, class_ids});
  const fmt = n => new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY'}).format(n);
  qs('pay-summary').innerHTML = `
    <div class="mt-2 border rounded-lg p-2 bg-slate-50">
      ${r.items.map(it=>`<div class="flex justify-between"><span>${it.class_name}</span><span>${fmt(it.fee)}</span></div>`).join('')}
      <div class="border-t mt-1 pt-1 flex justify-between font-medium"><span>Total</span><span>${fmt(r.total)}</span></div>
    </div>`;
  qs('pay-amount').value = r.total; // auto-isi total (boleh diedit manual jika bayar gabungan)
  // Simpan hasil preview untuk submit per kelas:
  qs('pay-summary').dataset.preview = JSON.stringify(r.items);
}

async function submitPayment(){
  try{
    const student_id = qs('pay-student').value;
    const month  = qs('pay-month-modal').value;
    const method = qs('pay-method').value;
    const selected = Array.from(document.querySelectorAll('.pay-class:checked')).map(x=>x.value);
    if (!student_id || !month) return alert('Pilih siswa dan bulan.');

    // jika ada kelas terpilih -> batch pakai fee per kelas (dari preview)
    if (selected.length>0){
      let items = [];
      try { items = JSON.parse(qs('pay-summary').dataset.preview||'[]'); } catch(_) {}
      if (items.length===0){ // kalau user tidak klik apa2 setelah centang, preview cepat
        const r = await api('fees.preview',{student_id, class_ids:selected}); items = r.items;
      }
      await api('payments.addBatch',{student_id, month, method, items: items.map(it=>({class_id:it.class_id, amount_jpy:it.fee}))});
    }else{
      // tanpa kelas: single payment umum
      const amount = Number(qs('pay-amount').value||0);
      if (!amount) return alert('Masukkan nominal.');
      await api('payments.add',{row:{student_id, class_id:'', month, amount_jpy:amount, method}});
    }

    closePayModal(); await loadPayments(); await loadInvoices(); await loadCashbook();
    alert('Pembayaran tersimpan.');
  }catch(err){ alert(err.message); }
}

async function loadPayments(){
  const data = await api('payments.list',{month:(qs('pay-month')?.value||'').slice(0,7)});
  const fmt = n => new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY'}).format(n);
  const h = [`<table class="min-w-full text-sm"><thead><tr class="text-left">
    <th class="p-2">ID</th><th class="p-2">Siswa</th><th class="p-2">Kelas</th><th class="p-2">Bulan</th><th class="p-2">Nominal</th><th class="p-2">Metode</th><th class="p-2">Kwitansi</th></tr></thead><tbody>`,
    ...data.map(r=>`<tr class="border-t">
      <td class="p-2">${r.id}</td><td class="p-2">${nameOfStudent(r.student_id)}</td><td class="p-2">${r.class_id? nameOfClass(r.class_id) : '—'}</td>
      <td class="p-2">${r.month}</td><td class="p-2">${fmt(Number(r.amount_jpy||0))}</td><td class="p-2">${r.method||''}</td>
      <td class="p-2">${r.pdf_file_id?`<a class="text-sky-700" target="_blank" href="https://drive.google.com/uc?id=${r.pdf_file_id}">PDF</a>`:''}</td>
    </tr>`), `</tbody></table>`];
  qs('payments-table').innerHTML = h.join('');
}

// ===== Invoice =====
async function generateInvoices(){
  const month = (qs('inv-month')?.value||'').slice(0,7);
  if(!month) return alert('Pilih bulan.');
  const r = await api('invoices.generate',{month}); alert('Invoice dibuat: '+r.count); loadInvoices();
}
async function loadInvoices(){
  const month = (qs('inv-month')?.value||'').slice(0,7);
  const data = await api('invoices.list',{month});
  const fmt = n => new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY'}).format(n);
  const h = [`<table class="min-w-full text-sm"><thead><tr class="text-left">
    <th class="p-2">ID</th><th class="p-2">Siswa</th><th class="p-2">Bulan</th><th class="p-2">Tagihan</th><th class="p-2">Terbayar</th><th class="p-2">Status</th><th class="p-2">PDF</th></tr></thead><tbody>`,
    ...data.map(r=>`<tr class="border-t">
      <td class="p-2">${r.id}</td><td class="p-2">${nameOfStudent(r.student_id)}</td><td class="p-2">${r.month}</td>
      <td class="p-2">${fmt(Number(r.total_due_jpy||0))}</td><td class="p-2">${fmt(Number(r.total_paid_jpy||0))}</td>
      <td class="p-2">${r.status||''}</td>
      <td class="p-2">${r.pdf_file_id?`<a class="text-sky-700" target="_blank" href="https://drive.google.com/uc?id=${r.pdf_file_id}">PDF</a>`:''}</td>
    </tr>`), `</tbody></table>`];
  qs('invoices-table').innerHTML = h.join('');
}

// ===== Mukafaah =====
async function loadMukafaah(){
  const month = (qs('muka-month')?.value||'').slice(0,7);
  const data = await api('mukafaah.byTeacher',{month});
  const fmt = n => new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY'}).format(n);
  const h = [`<table class="min-w-full text-sm"><thead><tr class="text-left">
    <th class="p-2">Guru</th><th class="p-2">Total SPP</th><th class="p-2">Mukafaah (70%)</th></tr></thead><tbody>`,
    ...data.map(r=>`<tr class="border-t"><td class="p-2">${nameOfTeacher(r.teacher_id)}</td><td class="p-2">${fmt(Number(r.total_fee||0))}</td><td class="p-2 font-medium">${fmt(Number(r.mukafaah||0))}</td></tr>`),
    `</tbody></table>`];
  qs('mukafaah-table').innerHTML = h.join('');
}

// ===== Pengeluaran & Kas =====
function openExpenseForm(){
  const date = prompt('Tanggal (YYYY-MM-DD)',''); if(date===null) return;
  const category = prompt('Kategori',''); const amount = prompt('Nominal JPY',''); const desc = prompt('Deskripsi','');
  api('expenses.add',{row:{date, category, amount_jpy:Number(amount), description:desc, note:''}}).then(loadExpenses).catch(e=>alert(e.message));
}
async function loadExpenses(){
  const data = await api('expenses.list');
  const fmt = n => new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY'}).format(n);
  const h = [`<table class="min-w-full text-sm"><thead><tr class="text-left">
    <th class="p-2">Tanggal</th><th class="p-2">Kategori</th><th class="p-2">Nominal</th><th class="p-2">Keterangan</th><th class="p-2">Bukti</th></tr></thead><tbody>`,
    ...data.map(r=>`<tr class="border-t">
      <td class="p-2">${r.date||''}</td><td class="p-2">${r.category||''}</td><td class="p-2">${fmt(Number(r.amount_jpy||0))}</td>
      <td class="p-2">${r.description||''}</td><td class="p-2">${r.pdf_file_id?`<a target="_blank" class="text-sky-700" href="https://drive.google.com/uc?id=${r.pdf_file_id}">PDF</a>`:''}</td>
    </tr>`), `</tbody></table>`];
  qs('expenses-table').innerHTML = h.join('');
}
async function loadCashbook(){
  const month = (qs('cash-month')?.value||'').slice(0,7);
  const r = await api('cashbook',{month});
  const fmt = n => new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY'}).format(n);
  qs('cashbook-table').innerHTML = `
    <div class="grid md:grid-cols-3 gap-3 mb-3">
      <div class="card"><div class="text-sm text-slate-500">Pemasukan</div><div class="text-2xl font-bold">${fmt(r.income||0)}</div></div>
      <div class="card"><div class="text-sm text-slate-500">Pengeluaran</div><div class="text-2xl font-bold">${fmt(r.expense||0)}</div></div>
      <div class="card"><div class="text-sm text-slate-500">Saldo</div><div class="text-2xl font-bold">${fmt((r.income||0)-(r.expense||0))}</div></div>
    </div>`;
}
