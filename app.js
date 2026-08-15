/* ==========================================================
   Catatan Keuangan v4.0
   Semua data disimpan di localStorage perangkat pengguna.
   ========================================================== */

const STORAGE_KEY = 'ck_transaksi';
const THEME_KEY = 'ck_theme';

const KATEGORI = {
  pengeluaran: [
    { nama: 'Makan', emoji: '🍜' },
    { nama: 'BBM', emoji: '⛽' },
    { nama: 'Belanja', emoji: '🛒' },
    { nama: 'Rokok', emoji: '🚬' },
    { nama: 'Transportasi', emoji: '🚌' },
    { nama: 'Tagihan', emoji: '🧾' },
    { nama: 'Lainnya', emoji: '📦' },
  ],
  pemasukan: [
    { nama: 'Gaji', emoji: '💼' },
    { nama: 'Bonus', emoji: '🎁' },
    { nama: 'Usaha', emoji: '🏪' },
    { nama: 'Hasil Panen', emoji: '🌾' },
    { nama: 'Lainnya', emoji: '📦' },
  ],
};

let transaksi = [];
let editingId = null; // id transaksi yang sedang diedit, null = mode tambah baru

/* ---------------- Utilitas ---------------- */

function formatRupiah(angka) {
  const n = Number(angka) || 0;
  return 'Rp ' + n.toLocaleString('id-ID');
}

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ---------------- Penyimpanan ---------------- */

function muatData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    transaksi = raw ? JSON.parse(raw) : [];
  } catch (e) {
    transaksi = [];
  }
}

function simpanData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transaksi));
}

/* ---------------- Navigasi ---------------- */

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');

  document.querySelectorAll('.bottom-nav button').forEach(b => {
    b.classList.toggle('active', b.dataset.nav === pageId);
  });

  if (pageId === 'dashboardPage') renderDashboard();
}

/* ---------------- Form Tambah ---------------- */

// Dipanggil dari tombol nav "Tambah" -> selalu mulai form kosong (bukan mode edit)
function bukaTambahBaru() {
  editingId = null;
  showPage('tambahPage');
  resetFormTambah();
}

function resetFormTambah() {
  document.getElementById('formTambahJudul').innerHTML = '<span class="emoji">➕</span> Tambah Transaksi';
  document.getElementById('tanggal').value = todayISO();
  document.getElementById('nominal').value = '';
  document.getElementById('catatan').value = '';
  document.getElementById('nominalPreview').textContent = '';
  setJenisAktif('pengeluaran');
  document.getElementById('btnSimpanTambah').textContent = '💾 Simpan';
  document.getElementById('btnBatalEdit').style.display = 'none';
}

// Buka form Tambah dalam mode edit, terisi data transaksi yang dipilih
function editTransaksi(id) {
  const t = transaksi.find(x => x.id === id);
  if (!t) return;

  editingId = id;
  showPage('tambahPage');
  setJenisAktif(t.jenis);
  document.getElementById('kategori').value = t.kategori;
  document.getElementById('tanggal').value = t.tanggal;
  document.getElementById('nominal').value = t.nominal;
  document.getElementById('nominalPreview').textContent = formatRupiah(t.nominal);
  document.getElementById('catatan').value = t.catatan || '';
  document.getElementById('formTambahJudul').innerHTML = '<span class="emoji">✏️</span> Edit Transaksi';
  document.getElementById('btnSimpanTambah').textContent = '✏️ Update Transaksi';
  document.getElementById('btnBatalEdit').style.display = 'block';
}

function batalEdit() {
  editingId = null;
  resetFormTambah();
}

function renderOpsiKategori(jenis) {
  const select = document.getElementById('kategori');
  select.innerHTML = '';
  KATEGORI[jenis].forEach(k => {
    const opt = document.createElement('option');
    opt.value = k.nama;
    opt.textContent = `${k.emoji} ${k.nama}`;
    select.appendChild(opt);
  });
}

function setJenisAktif(jenis) {
  document.getElementById('jenis').value = jenis;
  document.querySelectorAll('#jenisToggle button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.jenis === jenis);
  });
  renderOpsiKategori(jenis);
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#jenisToggle button').forEach(btn => {
    btn.addEventListener('click', () => setJenisAktif(btn.dataset.jenis));
  });

  document.getElementById('nominal').addEventListener('input', (e) => {
    const val = e.target.value;
    document.getElementById('nominalPreview').textContent = val ? formatRupiah(val) : '';
  });
});

function tambahTransaksi() {
  const jenis = document.getElementById('jenis').value;
  const tanggal = document.getElementById('tanggal').value;
  const kategori = document.getElementById('kategori').value;
  const nominal = Number(document.getElementById('nominal').value);
  const catatan = document.getElementById('catatan').value.trim();

  if (!tanggal) return showToast('Tanggal belum diisi');
  if (!nominal || nominal <= 0) return showToast('Nominal harus lebih dari 0');

  if (editingId) {
    const idx = transaksi.findIndex(t => t.id === editingId);
    if (idx !== -1) {
      transaksi[idx] = { ...transaksi[idx], jenis, tanggal, kategori, nominal, catatan };
    }
  } else {
    transaksi.push({
      id: uid(),
      jenis,
      tanggal,
      kategori,
      nominal,
      catatan,
      dibuat: Date.now(),
    });
  }

  simpanData();
  showToast(editingId ? 'Transaksi diperbarui ✓' : 'Transaksi tersimpan ✓');

  const sedangEdit = !!editingId;
  editingId = null;
  resetFormTambah();
  showPage('dashboardPage');

  // Nasehat keuangan hanya relevan untuk pengeluaran baru hari ini,
  // bukan saat sedang mengedit transaksi lama.
  if (jenis === 'pengeluaran' && !sedangEdit && tanggal === todayISO()) {
    cekNasehatKeuangan();
  }
}

function hapusTransaksi(id) {
  if (!confirm('Hapus transaksi ini?')) return;
  transaksi = transaksi.filter(t => t.id !== id);
  simpanData();
  renderDashboard();
  filterRiwayatPeriode();
  showToast('Transaksi dihapus');
}

/* ---------------- Dashboard ---------------- */

function renderDashboard() {
  const hariIni = todayISO();
  const bulanIni = hariIni.slice(0, 7); // YYYY-MM

  let saldo = 0, pemasukanBulan = 0, pengeluaranBulan = 0, pengeluaranHari = 0;
  let jumlahTransaksiBulan = 0;
  const kategoriTotal = {};

  transaksi.forEach(t => {
    const nilai = t.jenis === 'pemasukan' ? t.nominal : -t.nominal;
    saldo += nilai;

    const bulanT = t.tanggal.slice(0, 7);
    if (bulanT === bulanIni) {
      jumlahTransaksiBulan++;
      if (t.jenis === 'pemasukan') pemasukanBulan += t.nominal;
      if (t.jenis === 'pengeluaran') {
        pengeluaranBulan += t.nominal;
        kategoriTotal[t.kategori] = (kategoriTotal[t.kategori] || 0) + t.nominal;
      }
    }
    if (t.tanggal === hariIni && t.jenis === 'pengeluaran') {
      pengeluaranHari += t.nominal;
    }
  });

  document.getElementById('saldoSaatIni').textContent = formatRupiah(saldo);
  document.getElementById('pemasukanBulan').textContent = formatRupiah(pemasukanBulan);
  document.getElementById('pengeluaranBulan').textContent = formatRupiah(pengeluaranBulan);
  document.getElementById('pengeluaranHari').textContent = formatRupiah(pengeluaranHari);
  document.getElementById('jumlahTransaksiBulan').textContent = jumlahTransaksiBulan;

  const heroSub = document.getElementById('heroSub');
  heroSub.textContent = transaksi.length === 0
    ? 'Belum ada transaksi tercatat'
    : (saldo >= 0 ? 'Kondisi keuangan positif bulan ini' : 'Pengeluaran lebih besar dari pemasukan');

  // badge status pengeluaran hari ini (dibandingkan rata-rata 30 hari terakhir)
  const badgeEl = document.getElementById('statusBadge');
  const rataRataHarian = hitungRataRataPengeluaranHarian();
  if (rataRataHarian && pengeluaranHari > 0) {
    const rasio = pengeluaranHari / rataRataHarian;
    let label = 'Aman', cls = 'aman';
    if (rasio >= 2) { label = 'Boros'; cls = 'boros'; }
    else if (rasio >= 1.5) { label = 'Waspada'; cls = 'waspada'; }
    badgeEl.textContent = label;
    badgeEl.className = `status-badge ${cls}`;
    badgeEl.style.display = 'inline-block';
  } else {
    badgeEl.style.display = 'none';
  }

  // breakdown kategori
  const breakdownEl = document.getElementById('kategoriBreakdown');
  const entries = Object.entries(kategoriTotal).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    breakdownEl.innerHTML = '<div class="empty-state">Belum ada pengeluaran bulan ini</div>';
  } else {
    const max = entries[0][1];
    breakdownEl.innerHTML = entries.map(([nama, total]) => `
      <div class="kategori-row">
        <div class="kategori-nama">${nama}</div>
        <div class="kategori-bar-track">
          <div class="kategori-bar-fill" style="width:${Math.max(6, (total / max) * 100)}%"></div>
        </div>
        <div class="kategori-nominal">${formatRupiah(total)}</div>
      </div>
    `).join('');
  }

  // riwayat hari ini
  const riwayatHariEl = document.getElementById('riwayatHariIni');
  const transaksiHari = transaksi
    .filter(t => t.tanggal === hariIni)
    .sort((a, b) => b.dibuat - a.dibuat);

  riwayatHariEl.innerHTML = transaksiHari.length === 0
    ? '<div class="empty-state">Belum ada transaksi</div>'
    : transaksiHari.map(itemRiwayatHTML).join('');
}

function itemRiwayatHTML(t) {
  const kategoriData = KATEGORI[t.jenis].find(k => k.nama === t.kategori);
  const emoji = kategoriData ? kategoriData.emoji : '📦';
  const tanda = t.jenis === 'pemasukan' ? '+' : '−';
  return `
    <div class="riwayat-item">
      <div class="riwayat-icon ${t.jenis}">${emoji}</div>
      <div class="riwayat-mid">
        <div class="riwayat-kategori">${t.kategori}</div>
        ${t.catatan ? `<div class="riwayat-catatan">${escapeHTML(t.catatan)}</div>` : ''}
      </div>
      <div class="riwayat-right">
        <div class="riwayat-nominal ${t.jenis}">${tanda} ${formatRupiah(t.nominal)}</div>
      </div>
      <div class="riwayat-aksi">
        <button class="riwayat-edit" onclick="editTransaksi('${t.id}')" aria-label="Edit">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="riwayat-hapus" onclick="hapusTransaksi('${t.id}')" aria-label="Hapus">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  `;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---------------- Riwayat / filter ---------------- */

function filterRiwayatPeriode() {
  const jenisFilter = document.getElementById('filterJenis').value;
  const awal = document.getElementById('tanggalAwal').value;
  const akhir = document.getElementById('tanggalAkhir').value;

  let hasil = [...transaksi];
  if (jenisFilter !== 'semua') hasil = hasil.filter(t => t.jenis === jenisFilter);
  if (awal) hasil = hasil.filter(t => t.tanggal >= awal);
  if (akhir) hasil = hasil.filter(t => t.tanggal <= akhir);

  hasil.sort((a, b) => (b.tanggal + b.dibuat).localeCompare(a.tanggal + a.dibuat));

  // ringkasan
  const masuk = hasil.filter(t => t.jenis === 'pemasukan').reduce((s, t) => s + t.nominal, 0);
  const keluar = hasil.filter(t => t.jenis === 'pengeluaran').reduce((s, t) => s + t.nominal, 0);

  const ringkasanEl = document.getElementById('ringkasanPeriode');
  if (awal || akhir || jenisFilter !== 'semua') {
    ringkasanEl.style.display = 'flex';
    document.getElementById('ringkasanMasuk').textContent = formatRupiah(masuk);
    document.getElementById('ringkasanKeluar').textContent = formatRupiah(keluar);
    document.getElementById('ringkasanSelisih').textContent = formatRupiah(masuk - keluar);
  } else {
    ringkasanEl.style.display = 'none';
  }

  // grup per tanggal
  const hasilEl = document.getElementById('hasilRiwayat');
  if (hasil.length === 0) {
    hasilEl.innerHTML = '<div class="card"><div class="empty-state">Tidak ada transaksi pada periode ini</div></div>';
    return;
  }

  const grup = {};
  hasil.forEach(t => {
    grup[t.tanggal] = grup[t.tanggal] || [];
    grup[t.tanggal].push(t);
  });

  hasilEl.innerHTML = Object.keys(grup).map(tgl => `
    <div class="riwayat-tanggal-group">${formatTanggalPanjang(tgl)}</div>
    <div class="card">${grup[tgl].map(itemRiwayatHTML).join('')}</div>
  `).join('');
}

function formatTanggalPanjang(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/* ---------------- Export & Backup ---------------- */

function exportExcel() {
  if (transaksi.length === 0) return showToast('Belum ada data untuk diexport');

  const rows = [...transaksi]
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
    .map(t => ({
      Tanggal: t.tanggal,
      Jenis: t.jenis === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
      Kategori: t.kategori,
      Nominal: t.nominal,
      Catatan: t.catatan || '',
    }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 30 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');
  XLSX.writeFile(wb, `catatan-keuangan-${todayISO()}.xlsx`);
  showToast('Excel berhasil diunduh');
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(transaksi, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-catatan-keuangan-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup berhasil diunduh');
}

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error('format tidak valid');
      if (!confirm(`Pulihkan ${data.length} transaksi dari backup? Data saat ini akan digabung dengan data backup.`)) return;
      const idSekarang = new Set(transaksi.map(t => t.id));
      data.forEach(t => { if (t.id && !idSekarang.has(t.id)) transaksi.push(t); });
      simpanData();
      renderDashboard();
      showToast('Data berhasil dipulihkan');
    } catch (err) {
      showToast('Gagal membaca file backup');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function hapusSemuaData() {
  if (!confirm('Yakin ingin menghapus SEMUA data? Tindakan ini tidak bisa dibatalkan.')) return;
  if (!confirm('Konfirmasi sekali lagi: hapus semua transaksi sekarang?')) return;
  transaksi = [];
  simpanData();
  renderDashboard();
  showToast('Semua data telah dihapus');
}

/* ---------------- Nasehat Keuangan ---------------- */

// Rata-rata pengeluaran harian dari 30 hari terakhir (hari yang punya transaksi pengeluaran).
// excludeHariIni: true = tidak menghitung hari ini sebagai bagian dari rata-rata,
// supaya pengeluaran hari ini bisa dibandingkan secara adil terhadap kebiasaan sebelumnya.
function hitungRataRataPengeluaranHarian(excludeHariIni = true) {
  const hariIni = todayISO();
  const batas = new Date();
  batas.setDate(batas.getDate() - 30);
  const batasISO = batas.toISOString().slice(0, 10);

  const data = transaksi.filter(t =>
    t.jenis === 'pengeluaran' &&
    t.tanggal >= batasISO &&
    (!excludeHariIni || t.tanggal < hariIni)
  );

  if (data.length < 3) return null; // riwayat belum cukup untuk dijadikan patokan

  const totalPerHari = {};
  data.forEach(t => { totalPerHari[t.tanggal] = (totalPerHari[t.tanggal] || 0) + t.nominal; });

  const nilaiHarian = Object.values(totalPerHari);
  return nilaiHarian.reduce((a, b) => a + b, 0) / nilaiHarian.length;
}

function cekNasehatKeuangan() {
  const hariIni = todayISO();
  const pengeluaranHariIni = transaksi
    .filter(t => t.tanggal === hariIni && t.jenis === 'pengeluaran')
    .reduce((s, t) => s + t.nominal, 0);

  if (pengeluaranHariIni <= 0) return;

  const rataRata = hitungRataRataPengeluaranHarian();

  // Prioritas 1: pengeluaran hari ini jauh di atas kebiasaan
  if (rataRata && rataRata > 0) {
    const rasio = pengeluaranHariIni / rataRata;

    if (rasio >= 2) {
      tampilkanNasehat(
        'Pengeluaran Hari Ini Tinggi Sekali',
        `Kamu sudah keluar ${formatRupiah(pengeluaranHariIni)} hari ini — sekitar ${rasio.toFixed(1)}x dari rata-rata harianmu (${formatRupiah(Math.round(rataRata))}). Coba cek lagi, ada pengeluaran yang bisa ditunda ke lain waktu?`,
        '🚨'
      );
      return;
    }
    if (rasio >= 1.5) {
      tampilkanNasehat(
        'Sedikit Boros Hari Ini',
        `Pengeluaran hari ini ${formatRupiah(pengeluaranHariIni)}, lebih tinggi dari biasanya (rata-rata ${formatRupiah(Math.round(rataRata))} per hari). Nggak apa sesekali, tapi coba dijaga lagi besok ya.`,
        '⚠️'
      );
      return;
    }
  }

  // Prioritas 2: pengeluaran bulan ini sudah melebihi pemasukan bulan ini
  const bulanIni = hariIni.slice(0, 7);
  let pemasukanBulan = 0, pengeluaranBulan = 0;
  transaksi.forEach(t => {
    if (t.tanggal.slice(0, 7) === bulanIni) {
      if (t.jenis === 'pemasukan') pemasukanBulan += t.nominal;
      else pengeluaranBulan += t.nominal;
    }
  });

  if (pemasukanBulan > 0 && pengeluaranBulan > pemasukanBulan) {
    tampilkanNasehat(
      'Pengeluaran Bulan Ini Melebihi Pemasukan',
      `Bulan ini pengeluaran sudah ${formatRupiah(pengeluaranBulan)}, sementara pemasukan baru ${formatRupiah(pemasukanBulan)}. Coba mulai perhatikan kategori mana yang paling banyak menyedot pengeluaran.`,
      '📉'
    );
  }
}

function tampilkanNasehat(judul, pesan, icon) {
  document.getElementById('adviceIcon').textContent = icon;
  document.getElementById('adviceTitle').textContent = judul;
  document.getElementById('adviceMessage').textContent = pesan;
  document.getElementById('adviceOverlay').style.display = 'flex';
}

function tutupNasehat() {
  document.getElementById('adviceOverlay').style.display = 'none';
}

/* ---------------- Dark mode ---------------- */

function terapkanTema(tema) {
  document.documentElement.setAttribute('data-theme', tema);
  document.getElementById('darkModeToggle').checked = tema === 'dark';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', tema === 'dark' ? '#10161A' : '#0F6B5C');
}

document.addEventListener('DOMContentLoaded', () => {
  const temaTersimpan = localStorage.getItem(THEME_KEY) ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  terapkanTema(temaTersimpan);

  document.getElementById('darkModeToggle').addEventListener('change', (e) => {
    const tema = e.target.checked ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, tema);
    terapkanTema(tema);
  });
});

/* ---------------- Init ---------------- */

document.addEventListener('DOMContentLoaded', () => {
  muatData();
  renderDashboard();
  document.getElementById('tanggalAkhir').value = todayISO();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});

    // Kalau ada versi baru yang aktif, muat ulang otomatis sekali
    // supaya update langsung kepakai tanpa perlu hapus data manual.
    let sudahReload = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (sudahReload) return;
      sudahReload = true;
      window.location.reload();
    });
  }
});
