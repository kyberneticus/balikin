(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const icons = (name) => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const ADMIN_USERNAME = 'admin';
  const ADMIN_PASSWORD = 'admin123';
  const USER_KEY = 'balikin-visual-user-v2';
  const locations = [
    { id: 'fisip', name: 'FISIP', place: 'Gedung A · Lantai 1', distance: 'Terdekat dari kelas sosial', capacity: 7, total: 12, sizes: ['S 3', 'M 3', 'L 1'], status: 'online' },
    { id: 'fti', name: 'FTI', place: 'Lobi Utama', distance: '4 menit dari FISIP', capacity: 3, total: 12, sizes: ['S 1', 'M 1', 'L 1'], status: 'online' },
    { id: 'masjid', name: 'Masjid Kampus', place: 'Sisi utara', distance: '6 menit dari FISIP', capacity: 0, total: 9, sizes: ['S 0', 'M 0', 'L 0'], status: 'offline' },
  ];
  const items = [
    { id: 'bottle', name: 'Botol minum hijau', category: 'Botol / Tumbler', color: 'Hijau', location: 'FISIP · Gedung A', date: 'Hari ini', locker: 'A2', node: 'FISIP', status: 'stored', risk: 'normal', secret: 'Stiker nama di bagian bawah', finder: '20240001', depositPin: '184205', claimPin: '482916' },
    { id: 'wallet', name: 'Dompet hitam', category: 'Dompet', color: 'Hitam', location: 'FTI · Lobi Utama', date: 'Kemarin', locker: 'B1', node: 'FTI', status: 'claimed', risk: 'high', secret: 'Ada foto keluarga di bagian dalam', finder: '20240045', depositPin: '—', claimPin: 'Diterbitkan setelah review' },
    { id: 'card', name: 'Kartu Identitas', category: 'Kartu Identitas', color: 'Tertutup', location: 'Masjid Kampus', date: '2 hari lalu', locker: 'Pos', node: 'Masjid', status: 'review', risk: 'identity', secret: 'Data tidak pernah ditampilkan di katalog', finder: '20240120', depositPin: '—', claimPin: 'Verifikasi admin' },
  ];
  const lockerRows = [
    ['A1', 'FISIP', 'available'], ['A2', 'FISIP', 'stored', items[0]], ['A3', 'FISIP', 'held'],
    ['B1', 'FTI', 'claimed', items[1]], ['B2', 'FTI', 'available'], ['B3', 'FTI', 'available'],
    ['C1', 'Masjid', 'offline'], ['C2', 'Masjid', 'offline'], ['C3', 'Masjid', 'offline'],
  ];
  const exceptions = [
    ['Foto tidak valid', 'Mahasiswa unggah ulang. Jika AI gagal, formulir tetap dapat diisi manual.', 'camera', 'Mahasiswa memperbaiki data'],
    ['Kartu identitas / ATM', 'Foto disembunyikan dari katalog, diberi label aman, lalu masuk antrean Himatif.', 'shield', 'Admin memeriksa dan menghubungi pemilik'],
    ['Loker penuh', 'Sistem menawarkan titik lain beserta jarak. Jika seluruh titik penuh, arahkan ke pos.', 'pin', 'Status: Dititip di Pos'],
    ['Klaim ditolak', 'Pemilik dapat mencoba maksimal tiga kali sebelum eskalasi ke peninjauan manusia.', 'alert', 'Himatif menilai bukti tambahan'],
    ['PIN salah atau kedaluwarsa', 'Tiga percobaan gagal mengunci sementara; reservasi atau klaim kembali ke antrean.', 'lock', 'Admin menangani eskalasi'],
    ['Listrik atau Wi-Fi mati', 'Titik ditandai offline/tertunda. Aktivitas lokal harus disinkronkan saat pulih.', 'clock', 'Jangan janji akses otomatis'],
  ];
  let user = null;
  let foundPhoto = '';

  const storage = (() => {
    try {
      const session = window.sessionStorage;
      session.setItem('__balikin_test', '1');
      session.removeItem('__balikin_test');
      return session;
    } catch {
      const memory = new Map();
      return { getItem: (key) => memory.get(key) || null, setItem: (key, value) => memory.set(key, String(value)), removeItem: (key) => memory.delete(key) };
    }
  })();

  function toast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    $('toastZone').appendChild(toast);
    setTimeout(() => toast.remove(), 4200);
  }

  function renderLocations() {
    $('locationGrid').innerHTML = locations.map((location) => {
      const used = location.total - location.capacity;
      const percent = Math.round((used / location.total) * 100);
      return `<article class="location-card ${location.status === 'offline' ? 'offline' : ''}">
        <div class="location-card-head"><div><span class="eyebrow">TITIK LOKER</span><h3>${safe(location.name)}</h3><p>${safe(location.place)}</p></div><span class="location-status">${location.status === 'offline' ? 'OFFLINE' : 'ONLINE'}</span></div>
        <p>${safe(location.distance)}</p>
        <div class="capacity-line"><span>${location.status === 'offline' ? 'Tidak tersedia' : `${location.capacity} loker tersedia`}</span><span>${used}/${location.total}</span></div>
        <div class="capacity-bar"><span style="width:${percent}%"></span></div>
        <div class="size-row">${location.sizes.map((size) => `<span>${safe(size)}</span>`).join('')}</div>
        <button class="button button-outline" type="button" data-node="${location.id}" ${location.status === 'offline' ? 'disabled' : ''}>${location.status === 'offline' ? 'Titik sedang offline' : 'Lihat rute penitipan'}</button>
      </article>`;
    }).join('');
    $('locationGrid').querySelectorAll('[data-node]').forEach((button) => button.addEventListener('click', () => toast(`Visual rute ke ${button.closest('.location-card').querySelector('h3').textContent} ditampilkan pada peta kampus nanti.`)));
  }

  function renderExceptions() {
    $('exceptionGrid').innerHTML = exceptions.map(([title, detail, icon, action]) => `<article class="exception-card">${icons(icon)}<h3>${safe(title)}</h3><p>${safe(detail)}</p><strong>${safe(action)}</strong></article>`).join('');
  }

  function renderItems() {
    const query = $('searchInput').value.trim().toLocaleLowerCase('id');
    const location = $('searchLocation').value.toLocaleLowerCase('id');
    const visible = items.filter((item) => [item.name, item.category, item.location].join(' ').toLocaleLowerCase('id').includes(query) && (!location || item.location.toLocaleLowerCase('id').includes(location)));
    $('resultCount').textContent = `${visible.length} barang ditemukan · detail rahasia tidak pernah ditampilkan di katalog.`;
    $('itemsList').innerHTML = visible.map((item) => `<article class="item-card"><div class="item-cover">${icons(item.category === 'Kartu Identitas' ? 'shield' : 'package')}</div><div class="item-info"><div class="item-meta"><span class="chip">${safe(item.category)}</span>${item.risk !== 'normal' ? '<span class="chip risk-chip">Review manusia</span>' : ''}</div><h3>${safe(item.name)}</h3><small>${safe(item.color)} · ${safe(item.location)} · ${safe(item.date)}</small><p>${item.category === 'Kartu Identitas' ? 'Data pribadi disembunyikan dari katalog publik.' : 'Pilih klaim dan jawab ciri khusus tanpa petunjuk.'}</p><button class="button button-main" type="button" data-claim="${item.id}">Ini barang saya ${icons('arrow-right')}</button></div></article>`).join('') || '<p class="empty-state">Tidak ada barang yang cocok. Coba kata kunci lain atau laporkan kehilangan.</p>';
    $('itemsList').querySelectorAll('[data-claim]').forEach((button) => button.addEventListener('click', () => openClaim(button.dataset.claim)));
  }

  function previewFoundPhoto(file) {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      toast('Pilih foto gambar dengan ukuran maksimal 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => toast('Foto tidak dapat dibaca. Coba lagi.');
    reader.onload = () => {
      foundPhoto = reader.result;
      $('foundPreview').innerHTML = `<img src="${foundPhoto}" alt="Foto barang yang akan dititipkan">`;
    };
    reader.readAsDataURL(file);
  }

  function renderLockerRecommendation(foundLocation, detailLocation) {
    const preferred = locations.find((location) => location.id === foundLocation && location.status === 'online' && location.capacity > 0);
    const alternative = locations.find((location) => location.status === 'online' && location.capacity > 0);
    const location = preferred || alternative;
    const fallback = !location;
    $('lockerRecommendation').hidden = false;
    $('lockerRecommendation').innerHTML = fallback
      ? `<div class="recommendation-grid"><div><span class="eyebrow">KAPASITAS PENUH</span><h3>Alihkan ke pos Himatif atau satpam.</h3><p>Barang dicatat sebagai <strong>Dititip di Pos</strong>; admin kemudian memasukkannya ke antrean layanan.</p></div><button class="button button-main" type="button" id="handoffBtn">Catat handoff</button></div>`
      : `<div class="recommendation-grid"><div><span class="eyebrow">REKOMENDASI LOKER</span><h3>${safe(location.name)} · Loker M-03</h3><p>Ditemukan di ${safe(detailLocation)} · ${safe(location.distance)}. PIN penitipan berlaku 15 menit, lalu sensor pintu mengonfirmasi penutupan.</p><div class="pin-display"><span>PIN penitipan</span><strong>184205</strong><span>15:00</span></div></div><button class="button button-main" type="button" id="reserveLockerBtn">Simulasikan buka loker</button></div>`;
    const action = $('reserveLockerBtn') || $('handoffBtn');
    action.addEventListener('click', () => {
      action.textContent = fallback ? 'Handoff tercatat' : 'Pintu terkonfirmasi tertutup';
      action.disabled = true;
      toast(fallback ? 'Status visual berubah menjadi Dititip di Pos.' : 'Barang masuk katalog publik tanpa ciri khusus.');
    });
    $('lockerRecommendation').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function openClaim(id) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    const requiresReview = item.risk !== 'normal';
    openModal(`
      <button class="modal-close" type="button" aria-label="Tutup" id="modalClose">×</button>
      <span class="eyebrow">AJUKAN KLAIM</span><h2>${safe(item.name)}</h2>
      <p>${requiresReview ? 'Barang bernilai atau sensitif: skor tinggi tetap masuk antrean verifikasi Himatif.' : 'Barang biasa: jawaban yang meyakinkan dapat diteruskan ke penerbitan PIN pengambilan.'}</p>
      <form id="claimForm" class="claim-form"><label class="field"><span>Ciri khusus tanpa petunjuk</span><textarea required rows="3" placeholder="Jelaskan bagian yang tidak terlihat di katalog publik"></textarea></label><label class="field"><span>Bukti kepemilikan tambahan</span><input placeholder="Opsional untuk barang biasa" /></label><button class="button button-main" type="submit">Kirim untuk verifikasi</button></form><div id="claimResult"></div>`, 'Klaim barang');
    $('claimForm').addEventListener('submit', (event) => {
      event.preventDefault();
      $('claimResult').innerHTML = `<div class="claim-result">${icons('check')} ${requiresReview ? 'Klaim tercatat. Himatif memeriksa bukti sebelum PIN diterbitkan.' : 'Skor visual cukup tinggi. PIN pengambilan diterbitkan setelah konfirmasi akhir.'}</div>`;
    });
  }

  function openLostReport() {
    $('lostReportPanel').hidden = !$('lostReportPanel').hidden;
    if (!$('lostReportPanel').hidden) $('lostReportPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function openModal(body, heading) {
    $('modalLayer').hidden = false;
    $('modalContent').innerHTML = body;
    $('modalContent').setAttribute('aria-label', heading);
    const close = $('modalClose');
    if (close) close.addEventListener('click', closeModal);
  }

  function closeModal() {
    $('modalLayer').hidden = true;
    $('modalContent').innerHTML = '';
  }

  function renderAdminDashboard() {
    const summary = [
      ['Loker tersedia', 10, 'available'], ['Klaim perlu review', 2, 'waiting'], ['Barang > 30 hari', 1, 'alert'], ['Titik offline', 1, 'alert'],
    ];
    $('adminSummary').innerHTML = summary.map(([label, count, tone]) => `<article class="admin-summary-card ${tone}"><span>${label}</span><strong>${count}</strong><small>butuh keputusan operasional</small></article>`).join('');
    const queue = [
      ['alert', 'Kartu Identitas dari Masjid', 'Hubungi pemilik bila NIM terbaca; jangan tampilkan data di katalog.', 'Buka prosedur', 'shield'],
      ['waiting', 'Klaim Dompet hitam', 'Bukti kepemilikan perlu dicocokkan sebelum PIN pengambilan diterbitkan.', 'Tinjau klaim', 'search'],
      ['alert', 'Loker C1–C3 offline', 'Heartbeat titik Masjid berhenti. Jangan arahkan penitipan baru ke titik ini.', 'Tandai ditangani', 'alert'],
      ['waiting', 'Botol minum > 30 hari', 'Siapkan pengumuman terbuka sebelum keputusan donasi atau handoff.', 'Buka audit', 'clock'],
    ];
    $('adminQueue').innerHTML = queue.map(([tone, title, detail, action, icon]) => `<article class="queue-item ${tone}"><div class="queue-icon">${icons(icon)}</div><div><h3>${safe(title)}</h3><p>${safe(detail)}</p></div><button class="button button-outline" type="button">${safe(action)}</button></article>`).join('');
    $('adminQueue').querySelectorAll('button').forEach((button) => button.addEventListener('click', () => { button.textContent = 'Dicatat'; button.disabled = true; toast('Tindakan dicatat dalam audit trail visual.'); }));
    $('adminLocations').innerHTML = locations.map((location) => `<div class="admin-location"><span><strong>${safe(location.name)}</strong><br><small>${safe(location.place)}</small></span><span class="location-status">${location.status === 'offline' ? 'OFFLINE' : `${location.capacity} TERSEDIA`}</span></div>`).join('');
    const audit = ['09:42 · Klaim dompet masuk antrean verifikasi', '09:18 · Sensor FISIP A2 mengonfirmasi pintu tertutup', 'Kemarin · Alert botol minum diaktifkan', '2 hari lalu · Kartu identitas diberi perlindungan privasi'];
    $('auditLog').innerHTML = audit.map((entry) => `<div class="audit-item"><span>${safe(entry)}</span><small>tercatat</small></div>`).join('');
    const labels = { available: 'KOSONG', held: 'DIPESAN', stored: 'TERSIMPAN', claimed: 'SIAP DIAMBIL', offline: 'OFFLINE' };
    $('adminLockerList').innerHTML = lockerRows.map(([locker, node, status, item]) => `<article class="admin-locker-row ${status}"><div class="admin-locker-code"><strong>${safe(locker)}</strong><span class="admin-status ${status}">${labels[status]}</span></div>${item ? `<div class="admin-locker-detail"><strong>${safe(item.name)}</strong><span>${safe(node)} · ${safe(item.category)} · ${safe(item.color)}</span><span>Penemu: ${safe(item.finder)} · ${safe(item.location)}</span><span>Ciri khusus: ${safe(item.secret)}</span><span>PIN penitipan ${safe(item.depositPin)} · PIN ambil ${safe(item.claimPin)}</span></div>` : `<p class="admin-empty">${status === 'offline' ? 'Titik sedang offline; status pintu perlu sinkronisasi.' : 'Tidak ada barang aktif di loker ini.'}</p>`}</article>`).join('');
    $('adminUpdated').textContent = `Visual data · ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
  }

  function showTab(tab) {
    ['temukan', 'cari', 'lokasi', 'bantuan'].forEach((name) => { $(`tab-${name}`).hidden = name !== tab; });
    document.querySelectorAll('[data-tab]').forEach((button) => button.classList.toggle('active', button.dataset.tab === tab));
    if (tab === 'cari') renderItems();
    if (tab === 'lokasi') renderLocations();
    if (tab === 'bantuan') renderExceptions();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function setUser(data) {
    user = data;
    storage.setItem(USER_KEY, JSON.stringify(data));
    const admin = data.role === 'admin';
    $('authView').hidden = true;
    $('appView').hidden = admin;
    $('adminView').hidden = !admin;
    $('userTools').hidden = false;
    $('mobileNav').hidden = admin;
    $('nimDisplay').textContent = admin ? 'Himatif admin' : `NIM ${data.nim || 'Mahasiswa'}`;
    if (admin) {
      renderAdminDashboard();
    } else {
      $('welcomeTitle').textContent = 'Apa yang ingin kamu lakukan?';
      showTab('temukan');
    }
    window.scrollTo(0, 0);
  }

  function logout() {
    user = null;
    storage.removeItem(USER_KEY);
    closeModal();
    $('authView').hidden = false;
    $('appView').hidden = true;
    $('adminView').hidden = true;
    $('userTools').hidden = true;
    $('mobileNav').hidden = true;
    $('loginPassword').value = '';
    window.scrollTo(0, 0);
  }

  function install() {
    renderLocations();
    renderExceptions();
    $('loginForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const username = $('loginNim').value.trim();
      const password = $('loginPassword').value;
      if (username === ADMIN_USERNAME) {
        if (password === ADMIN_PASSWORD) setUser({ role: 'admin', name: 'Himatif admin' });
        else toast('Kredensial admin tidak sesuai.');
        return;
      }
      setUser({ nim: username || 'Mahasiswa' });
    });
    document.querySelectorAll('.eye-button').forEach((button) => button.addEventListener('click', () => {
      const input = $(button.dataset.target);
      input.type = input.type === 'password' ? 'text' : 'password';
      button.setAttribute('aria-label', input.type === 'password' ? 'Tampilkan password' : 'Sembunyikan password');
      button.querySelector('use').setAttribute('href', input.type === 'password' ? '#i-eye' : '#i-eye-off');
    }));
    document.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => showTab(button.dataset.tab)));
    $('foundCameraBtn').addEventListener('click', () => $('foundCamera').click());
    $('foundGalleryBtn').addEventListener('click', () => $('foundGallery').click());
    $('foundCamera').addEventListener('change', (event) => previewFoundPhoto(event.target.files?.[0]));
    $('foundGallery').addEventListener('change', (event) => previewFoundPhoto(event.target.files?.[0]));
    $('depositForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const name = $('itemName').value.trim();
      const category = $('itemCategory').value;
      const detailLocation = $('detailLocation').value.trim();
      if (!foundPhoto) return toast('Ambil foto barang terlebih dahulu.');
      if (!name || !category || !detailLocation) return toast('Lengkapi nama, kategori, dan detail lokasi barang.');
      renderLockerRecommendation($('foundLocation').value, detailLocation);
    });
    $('searchInput').addEventListener('input', renderItems);
    $('searchLocation').addEventListener('change', renderItems);
    $('showLostReport').addEventListener('click', openLostReport);
    $('activateAlertBtn').addEventListener('click', (event) => { event.target.textContent = 'Alert kategori aktif'; event.target.disabled = true; toast('Visual alert diaktifkan untuk kategori dan ciri yang dipilih.'); });
    $('logoutBtn').addEventListener('click', logout);
    $('brandLink').addEventListener('click', (event) => { event.preventDefault(); if (user?.role === 'admin') renderAdminDashboard(); else if (user) showTab('temukan'); else window.scrollTo(0, 0); });
    $('modalLayer').addEventListener('click', (event) => { if (event.target.dataset.close === 'true') closeModal(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !$('modalLayer').hidden) closeModal(); });
    const saved = (() => { try { return JSON.parse(storage.getItem(USER_KEY) || 'null'); } catch { return null; } })();
    if (saved) setUser(saved);
  }

  document.addEventListener('DOMContentLoaded', install);
})();
