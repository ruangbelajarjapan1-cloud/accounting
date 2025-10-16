/* ==========================================================
 * RBMJ Admin – Frontend (GitHub Pages)
 * Versi: 2025-10 – JSONP + Cetak & Simpan Kwitansi
 * ========================================================== */

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxvyEzH2EXVr4tQ2rcrN5qxo9KkMS9Nqz0UPkokatszxbeCZqrU18K5xhVf6ERXzmT7RA/exec'; // Ganti dgn URL WebApp terbaru dari Code.gs

/* ---------- UTIL JSONP ---------- */
function jsonp(url, params = {}) {
  return new Promise((resolve, reject) => {
    const cb = 'cb_' + Math.random().toString(36).slice(2);
    params.callback = cb;
    const qs = Object.entries(params)
      .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
      .join('&');
    const script = document.createElement('script');
    script.src = `${url}?${qs}`;
    let done = false;
    window[cb] = data => {
      done = true;
      resolve(data);
      cleanup();
    };
    script.onerror = () => {
      reject(new Error('JSONP failed'));
      cleanup();
    };
    function cleanup() {
      delete window[cb];
      script.remove();
    }
    document.body.appendChild(script);
    setTimeout(() => {
      if (!done) {
        reject(new Error('JSONP timeout'));
        cleanup();
      }
    }, 15000);
  });
}

/* ---------- DOM ELEMENTS ---------- */
const elSiswa = document.querySelector('#pay-student');
const elMonth = document.querySelector('#pay-month');
const elClassList = document.querySelector('#class-list');
const elTotal = document.querySelector('#total');
const elNominal = document.querySelector('#pay-amount');
const elMethod = document.querySelector('#pay-method');
const elSave = document.querySelector('#btn-save-payment');
const elPrint = document.querySelector('#btn-receipt-print');
const elPdf = document.querySelector('#btn-receipt-save');

/* ---------- INIT LOAD ---------- */
window.addEventListener('DOMContentLoaded', async () => {
  await loadStudents();
  await loadClasses();
});

/* ---------- LOAD STUDENTS ---------- */
async function loadStudents() {
  try {
    // sementara, isi manual
    elSiswa.innerHTML = `
      <option value="1">Luay Abdussalam Azzayan (1)</option>
      <option value="2">Ummu Khayla (2)</option>`;
  } catch (err) {
    console.error(err);
  }
}

/* ---------- LOAD CLASSES ---------- */
async function loadClasses() {
  try {
    const res = await jsonp(GAS_URL, { route: 'listClasses' });
    if (!res.ok) throw new Error(res.error);
    elClassList.innerHTML = res.data
      .map(
        c => `
        <label style="display:block;margin:2px 0;">
          <input type="checkbox" class="class-checkbox" value="${c.id}" data-fee="${c.monthly_fee_jpy}">
          ${c.class_name} — ¥${c.monthly_fee_jpy}
        </label>`
      )
      .join('');
    attachFeeCalc();
  } catch (err) {
    console.error('Error loadClasses:', err);
  }
}

/* ---------- HITUNG TOTAL OTOMATIS ---------- */
function attachFeeCalc() {
  elClassList.addEventListener('change', calcTotal);
}
function calcTotal() {
  const boxes = elClassList.querySelectorAll('.class-checkbox:checked');
  let sum = 0;
  boxes.forEach(b => (sum += Number(b.dataset.fee || 0)));
  elTotal.textContent = '¥' + sum.toLocaleString('ja-JP');
  elNominal.value = sum;
}

/* ---------- KUMPULKAN DATA ---------- */
function collectPaymentForm() {
  const student_id = elSiswa.value;
  const month = elMonth.dataset.value || elMonth.value || '2025-09';
  const class_ids = Array.from(
    document.querySelectorAll('.class-checkbox:checked')
  ).map(x => x.value);
  const amount_jpy = Number(elNominal.value || 0);
  const method = elMethod.value || 'Cash';
  const notes =
    document.querySelector('#pay-notes')?.value || '';
  return { student_id, month, class_ids: class_ids.join(','), amount_jpy, method, notes };
}

/* ---------- SIMPAN PEMBAYARAN ---------- */
elSave?.addEventListener('click', async () => {
  try {
    const p = collectPaymentForm();
    const res = await jsonp(GAS_URL, { route: 'recordPayment', ...p });
    if (!res.ok) throw new Error(res.error);
    alert('✅ Pembayaran berhasil disimpan!');
  } catch (err) {
    alert('❌ Gagal menyimpan: ' + err.message);
  }
});

/* ---------- CETAK KWITANSI ---------- */
elPrint?.addEventListener('click', async () => {
  try {
    const p = collectPaymentForm();
    const res = await jsonp(GAS_URL, { route: 'receiptPreview', ...p });
    if (!res.ok) throw new Error(res.error);
    const w = window.open('', '_blank', 'width=900,height=800');
    w.document.write(`
      <!doctype html>
      <html>
      <head><meta charset="utf-8"><title>Kwitansi</title></head>
      <body>${res.data.html}<script>window.onload=function(){window.print();}<\\/script></body>
      </html>`);
    w.document.close();
  } catch (err) {
    alert('❌ Gagal cetak: ' + err.message);
  }
});

/* ---------- SIMPAN KWITANSI KE DRIVE ---------- */
elPdf?.addEventListener('click', async () => {
  try {
    const p = collectPaymentForm();
    const res = await jsonp(GAS_URL, { route: 'receiptSavePdf', ...p });
    if (!res.ok) throw new Error(res.error);
    if (res.data && res.data.url) {
      if (confirm('✅ PDF tersimpan di Google Drive.\nBuka sekarang?'))
        window.open(res.data.url, '_blank');
    } else {
      alert('PDF tersimpan tanpa URL.');
    }
  } catch (err) {
    alert('❌ Gagal simpan PDF: ' + err.message);
  }
});
