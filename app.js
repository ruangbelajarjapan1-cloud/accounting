// ===== URL Apps Script (WAJIB: /exec) =====
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxvyEzH2EXVr4tQ2rcrN5qxo9KkMS9Nqz0UPkokatszxbeCZqrU18K5xhVf6ERXzmT7RA/exec';

// ===== JSONP helper (dengan timeout & debug) =====
function jsonp(action, payload = {}, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const cb = 'rbmj_cb_' + Math.random().toString(36).slice(2);
    const params = new URLSearchParams({
      action: action || '',
      payload: JSON.stringify(payload || {}),
      callback: cb,
      _: Date.now().toString()
    });
    const src = GAS_URL + '?' + params.toString();
    const s = document.createElement('script');
    let timed = false;

    window[cb] = (data) => { if(!timed){ resolve(data); } cleanup(); };
    s.onerror = () => { if(!timed){ reject(new Error('JSONP failed: ' + src)); } cleanup(); };
    s.src = src;
    document.body.appendChild(s);

    const t = setTimeout(() => { timed = true; reject(new Error('JSONP timeout: ' + src)); cleanup(); }, timeoutMs);

    function cleanup(){
      try{ delete window[cb]; }catch(_){ window[cb]=undefined; }
      clearTimeout(t); s.remove();
    }
  });
}
const api = (a,p)=>jsonp(a,p);

// ===== util UI =====
function qs(id){return document.getElementById(id);}
function show(page){document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden')); qs('page-'+page).classList.remove('hidden');}
document.querySelectorAll('.nav').forEach(b=> b.onclick = ()=> show(b.dataset.page));

function loadLogo(){ const u=localStorage.getItem('rbmj_logo'); const img=document.getElementById('ui-logo'); if(img) img.src=u||'https://via.placeholder.com/80x80.png?text=RBMJ'; }
loadLogo();

// ===== cache =====
let CACHE={students:[],teachers:[],classes:[],enrollments:[]};
const mapById=a=>{const m={}; a.forEach(x=>m[String(x.id)]=x); return m;};
const nameOfStudent=id => (CACHE._s||{})[String(id)]?.full_name || id || '—';
const nameOfClass  =id => (CACHE._c||{})[String(id)]?.class_name || id || '—';
const nameOfTeacher=id => (CACHE._t||{})[String(id)]?.full_name || id || '—';

async function refreshCache(){
  const [s,t,c,e]=await Promise.all([api('students.list'),api('teachers.list'),api('classes.list'),api('enrollments.list')]);
  CACHE.students=s; CACHE.teachers=t; CACHE.classes=c; CACHE.enrollments=e;
  CACHE._s=mapById(s); CACHE._t=mapById(t); CACHE._c=mapById(c);
}
refreshCache().then(()=>{ loadDashboard(); loadStudents(); loadTeachers(); loadClasses(); loadEnrollments(); loadAttendance(); loadPayments(); loadInvoices(); loadMukafaah(); loadExpenses(); loadCashbook(); });

// ===== dashboard =====
async function loadDashboard(){
  try{
    const s=await api('stats');
    qs('stat-students').textContent=s.students;
    qs('stat-classes').textContent=s.classes;
    qs('stat-payments').textContent=new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY'}).format(s.paymentsThisMonth||0);
  }catch(e){console.warn(e);}
}

// ===== students =====
function openStudentForm(row={}){
  const full = prompt('Nama lengkap', row.full_name||''); if(full===null) return;
  const family=prompt('Family key', row.family_key||'');
  const parent=prompt('Nama ortu', row.parent_name||'');
  const phone =prompt('Telp ortu', row.parent_phone||'');
  const email =prompt('Email', row.email||'');
  const status=prompt('Status (Active/Inactive)', row.status||'Active');
  api('students.upsert',{row:{id:row.id||'', full_name:full, family_key:family, parent_name:parent, parent_phone:phone, email, note:'', status}})
    .then(refreshCache).then(loadStudents).catch(e=>alert(e.message));
}
function loadStudents(){
  const d=CACHE.students;
  const h=[`<table><thead><tr>
    <th>ID</th><th>Nama</th><th>Family</th><th>Ortu</th><th>Kontak</th><th>Status</th><th></th></tr></thead><tbody>`,
    ...d.map(r=>`<tr><td>${r.id}</td><td>${r.full_name}</td><td>${r.family_key||''}</td>
      <td>${r.parent_name||''}</td><td>${r.parent_phone||''}<br>${r.email||''}</td>
      <td>${r.status||''}</td><td><button class="btn" onclick='openStudentForm(${JSON.stringify(r)})'>Edit</button></td></tr>`),
    `</tbody></table>`];
  qs('students-table').innerHTML=h.join('');
}

// ===== teachers =====
function openTeacherForm(row={}){ const full=prompt('Nama lengkap',row.full_name||''); if(full===null) return;
  const phone=prompt('Telp',row.phone||''); const email=prompt('Email',row.email||''); const status=prompt('Status',row.status||'Active');
  api('teachers.upsert',{row:{id:row.id||'', full_name:full, phone, email, note:'', status}})
    .then(refreshCache).then(loadTeachers).catch(e=>alert(e.message));
}
function loadTeachers(){
  const d=CACHE.teachers;
  const h=[`<table><thead><tr><th>ID</th><th>Nama</th><th>Kontak</th><th>Status</th><th></th></tr></thead><tbody>`,
    ...d.map(r=>`<tr><td>${r.id}</td><td>${r.full_name}</td>
      <td>${r.phone||''}<br>${r.email||''}</td><td>${r.status||''}</td>
      <td><button class="btn" onclick='openTeacherForm(${JSON.stringify(r)})'>Edit</button></td></tr>`),
    `</tbody></table>`];
  qs('teachers-table').innerHTML=h.join('');
}

// ===== classes =====
function openClassForm(row={}){ const name=prompt('Nama kelas',row.class_name||''); if(name===null) return;
  const teacher_id=prompt('ID Guru',row.teacher_id||''); const fee=prompt('SPP/bulan (JPY)',row.monthly_fee_jpy||'');
  const dow=prompt('Hari (Mon..Sun)',row.day_of_week||''); const time=prompt('Jam (HH:MM)',row.time||''); const status=prompt('Status',row.status||'Active');
  api('classes.upsert',{row:{id:row.id||'', class_name:name, teacher_id, monthly_fee_jpy:fee, day_of_week:dow, time, note:'', status}})
    .then(refreshCache).then(loadClasses).catch(e=>alert(e.message));
}
function loadClasses(){
  const d=CACHE.classes, h=[`<table><thead><tr>
    <th>ID</th><th>Nama</th><th>Guru</th><th>SPP</th><th>Jadwal</th><th>Status</th><th></th></tr></thead><tbody>`,
    ...d.map(r=>`<tr><td>${r.id}</td><td>${r.class_name}</td>
      <td>${nameOfTeacher(r.teacher_id)}</td><td>¥${r.monthly_fee_jpy}</td>
      <td>${r.day_of_week} ${r.time||''}</td><td>${r.status||''}</td>
      <td><button class="btn" onclick='openClassForm(${JSON.stringify(r)})'>Edit</button></td></tr>`),
    `</tbody></table>`];
  qs('classes-table').innerHTML=h.join('');
}

// ===== enrollments =====
function openEnrollForm(row={}){ const sid=prompt('ID Siswa',row.student_id||''); if(sid===null) return;
  const cid=prompt('ID Kelas',row.class_id||''); const st=prompt('Mulai (YYYY-MM)',row.start_month||''); const en=prompt('Akhir (YYYY-MM atau kosong)',row.end_month||'');
  api('enrollments.upsert',{row:{id:row.id||'', student_id:sid, class_id:cid, start_month:st, end_month:en}})
    .then(refreshCache).then(loadEnrollments).catch(e=>alert(e.message));
}
function loadEnrollments(){
  const d=CACHE.enrollments, h=[`<table><thead><tr>
    <th>ID</th><th>Siswa</th><th>Kelas</th><th>Start</th><th>End</th><th></th></tr></thead><tbody>`,
    ...d.map(r=>`<tr><td>${r.id}</td><td>${nameOfStudent(r.student_id)}</td><td>${nameOfClass(r.class_id)}</td><td>${r.start_month||''}</td><td>${r.end_month||''}</td><td><button class="btn" onclick='openEnrollForm(${JSON.stringify(r)})'>Edit</button></td></tr>`),
    `</tbody></table>`];
  qs('enrollments-table').innerHTML=h.join('');
}

// ===== attendance =====
function openAttendanceForm(){ const cid=prompt('ID Kelas',''); if(cid===null) return;
  const sid=prompt('ID Siswa',''); const date=prompt('Tanggal (YYYY-MM-DD)',''); const st=prompt('Status (Present/Absent/Late/Excused)','Present');
  api('attendance.add',{row:{class_id:cid, student_id:sid, date, status:st, note:''}}).then(loadAttendance).catch(e=>alert(e.message));
}
async function loadAttendance(){
  const d=await api('attendance.list'), h=[`<table><thead><tr>
    <th>Kelas</th><th>Siswa</th><th>Tanggal</th><th>Status</th></tr></thead><tbody>`,
    ...d.map(r=>`<tr><td>${nameOfClass(r.class_id)}</td><td>${nameOfStudent(r.student_id)}</td><td>${r.date}</td><td>${r.status}</td></tr>`),
    `</tbody></table>`];
  qs('attendance-table').innerHTML=h.join('');
}

// ===== payments =====
function openPaymentModal(){
  qs('pay-student').innerHTML = CACHE.students.map(s=>`<option value="${s.id}">${s.full_name} — (${s.id})</option>`).join('');
  const m=(qs('pay-month')?.value)||new Date().toISOString().slice(0,7); qs('pay-month-modal').value=m;

  const box = CACHE.classes.map(c=>{
    const label = `${c.class_name} — ${nameOfTeacher(c.teacher_id)} — ¥${c.monthly_fee_jpy}`;
    return `<label style="display:flex;gap:8px;align-items:center;margin:4px 0"><input type="checkbox" class="pay-class" value="${c.id}"><span>${label}</span></label>`;
  }).join('');
  qs('pay-classes-box').innerHTML = box;
  qs('pay-summary').innerHTML = ''; qs('pay-amount').value = ''; qs('pay-method').value = 'Cash';
  qs('pay-modal').style.display='flex';

  Array.from(document.querySelectorAll('.pay-class')).forEach(ch=> ch.addEventListener('change', previewFees));
  qs('pay-student').addEventListener('change', previewFees);
}
function closePayModal(){ qs('pay-modal').style.display='none'; }

async function previewFees(){
  const sid=qs('pay-student').value;
  const class_ids=Array.from(document.querySelectorAll('.pay-class:checked')).map(x=>x.value);
  if(class_ids.length===0){ qs('pay-summary').innerHTML=''; qs('pay-amount').value=''; return; }
  const r=await api('fees.preview',{student_id:sid, class_ids});
  const fmt=n=>new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY'}).format(n);
  qs('pay-summary').innerHTML = `
    ${r.items.map(it=>`<div style="display:flex;justify-content:space-between"><span>${it.class_name}</span><span>${fmt(it.fee)}</span></div>`).join('')}
    <div style="border-top:1px solid #e2e8f0;margin-top:6px;padding-top:6px;display:flex;justify-content:space-between;font-weight:600">
      <span>Total</span><span>${fmt(r.total)}</span></div>`;
  qs('pay-amount').value = r.total;
  qs('pay-summary').dataset.preview = JSON.stringify(r.items);
}

// modePrint = true → setelah simpan, auto-buka PDF kwitansi
// modePrint = true → setelah simpan, auto-buka PDF kwitansi
async function submitPayment(modePrint){
  try{
    const student_id = qs('pay-student').value;
    const month      = qs('pay-month-modal').value;
    const method     = qs('pay-method').value;
    const selected   = Array.from(document.querySelectorAll('.pay-class:checked')).map(x=>x.value);

    if(!student_id || !month) return alert('Pilih siswa dan bulan.');

    let receiptLinks = [];

    if (selected.length > 0) {
      // >>> PERBAIKAN: kirim class_ids saja (server yang hitung nominal) <<<
      const res = await api('payments.addBatch', {
        student_id: student_id,
        month     : month,
        method    : method,
        class_ids : selected
      });
      receiptLinks = (res.files || []).map(id => `https://drive.google.com/uc?id=${id}`);
    } else {
      // pembayaran umum (tanpa kelas)
      const amount = Number(qs('pay-amount').value || 0);
      if (!amount) return alert('Masukkan nominal.');
      const r = await api('payments.add', {
        row: { student_id, class_id:'', month, amount_jpy: amount, method }
      });
      if (r.pdf_file_id) receiptLinks = [`https://drive.google.com/uc?id=${r.pdf_file_id}`];
    }

    closePayModal();
    await loadPayments();
    await loadInvoices();

    if (modePrint && receiptLinks.length){
      receiptLinks.forEach(u => window.open(u, '_blank'));
    } else {
      if (receiptLinks.length){
        const html = receiptLinks.map((u,i)=>`<li><a target="_blank" href="${u}">Kwitansi ${i+1}</a></li>`).join('');
        const w = window.open('', '_blank', 'width=480,height=320');
        w.document.write(`<h3>Kwitansi</h3><ul>${html}</ul>`);
      } else {
        alert('Pembayaran tersimpan.');
      }
    }
  } catch(err){
    alert(err.message);
  }
}


    closePayModal(); await loadPayments(); await loadInvoices();

    if(modePrint && receiptLinks.length){
      receiptLinks.forEach(u=>window.open(u,'_blank'));
    }else{
      // tampilkan dialog kecil daftar link
      if(receiptLinks.length){
        const html=receiptLinks.map((u,i)=>`<li><a target="_blank" href="${u}">Kwitansi ${i+1}</a></li>`).join('');
        const w=window.open('', '_blank', 'width=480,height=320');
        w.document.write(`<h3>Kwitansi</h3><ul>${html}</ul>`);
      }else{
        alert('Pembayaran tersimpan.');
      }
    }
  }catch(err){ alert(err.message); }
}

async function loadPayments(){
  const m=(qs('pay-month')?.value||'').slice(0,7);
  const d=await api('payments.list',{month:m});
  const fmt=n=>new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY'}).format(n);
  const h=[`<table><thead><tr>
    <th>ID</th><th>Siswa</th><th>Kelas</th><th>Bulan</th><th>Nominal</th><th>Metode</th><th>Kwitansi</th></tr></thead><tbody>`,
    ...d.map(r=>`<tr><td>${r.id}</td><td>${nameOfStudent(r.student_id)}</td><td>${r.class_id?nameOfClass(r.class_id):'—'}</td><td>${r.month}</td><td>${fmt(Number(r.amount_jpy||0))}</td><td>${r.method||''}</td><td>${r.pdf_file_id?`<a target="_blank" href="https://drive.google.com/uc?id=${r.pdf_file_id}">PDF</a>`:''}</td></tr>`),
    `</tbody></table>`];
  qs('payments-table').innerHTML=h.join('');
}

// ===== invoices =====
async function generateInvoices(){ const m=(qs('inv-month')?.value||'').slice(0,7); if(!m) return alert('Pilih bulan.'); const r=await api('invoices.generate',{month:m}); alert('Invoice dibuat: '+r.count); loadInvoices(); }
async function loadInvoices(){
  const m=(qs('inv-month')?.value||'').slice(0,7), d=await api('invoices.list',{month:m});
  const fmt=n=>new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY'}).format(n);
  const h=[`<table><thead><tr><th>ID</th><th>Siswa</th><th>Bulan</th><th>Tagihan</th><th>Terbayar</th><th>Status</th><th>PDF</th></tr></thead><tbody>`,
    ...d.map(r=>`<tr><td>${r.id}</td><td>${nameOfStudent(r.student_id)}</td><td>${r.month}</td><td>${fmt(Number(r.total_due_jpy||0))}</td><td>${fmt(Number(r.total_paid_jpy||0))}</td><td>${r.status||''}</td><td>${r.pdf_file_id?`<a target="_blank" href="https://drive.google.com/uc?id=${r.pdf_file_id}">PDF</a>`:''}</td></tr>`),
    `</tbody></table>`];
  qs('invoices-table').innerHTML=h.join('');
}

// ===== mukafaah =====
async function loadMukafaah(){
  const m=(qs('muka-month')?.value||'').slice(0,7), d=await api('mukafaah.byTeacher',{month:m});
  const fmt=n=>new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY'}).format(n);
  const h=[`<table><thead><tr><th>Guru</th><th>Total SPP</th><th>Mukafaah (70%)</th></tr></thead><tbody>`,
    ...d.map(r=>`<tr><td>${nameOfTeacher(r.teacher_id)}</td><td>${fmt(Number(r.total_fee||0))}</td><td style="font-weight:600">${fmt(Number(r.mukafaah||0))}</td></tr>`),
    `</tbody></table>`];
  qs('mukafaah-table').innerHTML=h.join('');
}

// ===== expenses & cashbook =====
function openExpenseForm(){ const date=prompt('Tanggal (YYYY-MM-DD)',''); if(date===null) return;
  const cat=prompt('Kategori',''); const amt=prompt('Nominal JPY',''); const desc=prompt('Deskripsi','');
  api('expenses.add',{row:{date, category:cat, amount_jpy:Number(amt), description:desc, note:''}}).then(loadExpenses).catch(e=>alert(e.message));
}
async function loadExpenses(){
  const d=await api('expenses.list'), fmt=n=>new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY'}).format(n);
  const h=[`<table><thead><tr><th>Tanggal</th><th>Kategori</th><th>Nominal</th><th>Keterangan</th><th>Bukti</th></tr></thead><tbody>`,
    ...d.map(r=>`<tr><td>${r.date||''}</td><td>${r.category||''}</td><td>${fmt(Number(r.amount_jpy||0))}</td><td>${r.description||''}</td><td>${r.pdf_file_id?`<a target="_blank" href="https://drive.google.com/uc?id=${r.pdf_file_id}">PDF</a>`:''}</td></tr>`),
    `</tbody></table>`];
  qs('expenses-table').innerHTML=h.join('');
}
async function loadCashbook(){
  const m=(qs('cash-month')?.value||'').slice(0,7), r=await api('cashbook',{month:m});
  const fmt=n=>new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY'}).format(n);
  qs('cashbook-table').innerHTML=`<div class="cards">
    <div class="card"><h4>Pemasukan</h4><div class="num">${fmt(r.income||0)}</div></div>
    <div class="card"><h4>Pengeluaran</h4><div class="num">${fmt(r.expense||0)}</div></div>
    <div class="card"><h4>Saldo</h4><div class="num">${fmt((r.income||0)-(r.expense||0))}</div></div>
  </div>`;
}
