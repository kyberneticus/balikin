(() => {
  'use strict';

  // Constants
  const DEMO_TIMING = Object.freeze({
    api: 160,
    finderStages: [1200, 1200, 800],
    finderField: 250,
    claimCheck: 900,
    claimGauge: 600,
    claimResult: 200,
    toast: 4200,
  });
  const ADMIN_USERNAME = 'admin';
  const ADMIN_PASSWORD = 'admin123';
  const USER_KEY = 'balikin-visual-user-v2';
  const SUPPORT_KEY = 'balikin-support-v1';
  const DEMO_MODE = new URLSearchParams(window.location.search).get('demo') === '1';
  const ITEMS_KEY = DEMO_MODE ? 'balikin-demo-items-v1' : 'balikin-items-v1';
  const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
  const $ = (id) => document.getElementById(id);
  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const icons = (name) => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;

  const locations = [
    { id: 'fisip', name: 'FISIP', place: 'Gedung A, lantai 1', capacity: 7, total: 12, sizes: ['S 3', 'M 3', 'L 1'], status: 'online' },
    { id: 'fti', name: 'FTI', place: 'Lobi utama', capacity: 3, total: 12, sizes: ['S 1', 'M 1', 'L 1'], status: 'online' },
    { id: 'masjid', name: 'Masjid Kampus', place: 'Sisi utara', capacity: 0, total: 9, sizes: ['S 0', 'M 0', 'L 0'], status: 'offline' },
  ];

  function seedItems() {
    const bottle = { id: 'bottle', name: 'Botol minum hijau', category: 'Botol / Tumbler', color: 'Hijau', location: 'FISIP · Gedung A', date: 'Hari ini', locker: 'A2', node: 'FISIP', status: 'stored', secret: 'Stiker nama di bagian bawah', finder: '20240001', photo: 'assets/botol-hijau.jpg', depositPin: '184205', claimPin: '482916' };
    const wallet = { id: 'wallet', name: 'Dompet hitam', category: 'Dompet', color: 'Hitam', location: 'FTI · Lobi utama', date: 'Kemarin', locker: 'B1', node: 'FTI', status: 'claimed', secret: 'Ada foto keluarga di bagian dalam', finder: '20240045', depositPin: '—', claimPin: 'Review admin' };
    const card = { id: 'card', name: 'Kartu identitas', category: 'Kartu Identitas', color: 'Tertutup', location: 'Masjid Kampus', date: '2 hari lalu', locker: 'Pos', node: 'Masjid', status: 'review', secret: 'Data tidak pernah ditampilkan di katalog', finder: '20240120', depositPin: '—', claimPin: 'Verifikasi admin' };
    return DEMO_MODE ? [wallet, card] : [bottle, wallet, card];
  }

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

  const persistentStorage = (() => {
    try {
      const local = window.localStorage;
      local.setItem('__balikin_test', '1');
      local.removeItem('__balikin_test');
      return local;
    } catch {
      const memory = new Map();
      return { getItem: (key) => memory.get(key) || null, setItem: (key, value) => memory.set(key, String(value)), removeItem: (key) => memory.delete(key) };
    }
  })();

  function loadItems() {
    try {
      const saved = JSON.parse(persistentStorage.getItem(ITEMS_KEY) || 'null');
      return Array.isArray(saved) ? saved : seedItems();
    } catch {
      return seedItems();
    }
  }

  function saveItems(items) {
    persistentStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  }

  // State
  const state = {
    user: null,
    items: loadItems(),
    foundPhoto: '',
    claimPhoto: '',
    pendingFound: null,
    activeTab: 'temukan',
    claimAttempts: {},
    selectedSupportTopic: '',
    activeSupportThreadId: '',
    supportContext: null,
    modalTrigger: null,
    finderRun: 0,
  };

  function getSupportThreads() {
    try {
      const data = JSON.parse(storage.getItem(SUPPORT_KEY) || '[]');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function saveSupportThreads(threads) {
    storage.setItem(SUPPORT_KEY, JSON.stringify(threads));
  }

  function timeLabel(value) {
    return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  }

  // Simulated backend seam
  const api = {
    async submitFound(payload) {
      await wait(DEMO_TIMING.api);
      const location = locations.find((entry) => entry.id === payload.locationId) || locations[0];
      const item = {
        id: `found-${Date.now()}`,
        name: payload.name,
        category: payload.category,
        color: payload.color || 'Tidak disebutkan',
        location: `${location.name} · ${payload.detailLocation}`,
        date: 'Hari ini',
        locker: 'M-03',
        node: location.name,
        status: 'stored',
        secret: payload.secret,
        finder: state.user?.nim || 'Mahasiswa',
        photo: payload.photo,
        depositPin: '184205',
        claimPin: '482916',
      };
      const nextItems = [item, ...state.items];
      saveItems(nextItems);
      state.items = nextItems;
      return item;
    },

    async searchItems({ query, location }) {
      await wait(DEMO_TIMING.api);
      const needle = query.trim().toLocaleLowerCase('id');
      const place = location.trim().toLocaleLowerCase('id');
      return state.items.filter((item) => {
        const matchesQuery = [item.name, item.category, item.location, item.color].join(' ').toLocaleLowerCase('id').includes(needle);
        return matchesQuery && (!place || item.location.toLocaleLowerCase('id').includes(place));
      });
    },

    async submitClaim({ itemId, answer, photo }) {
      await wait(DEMO_TIMING.api);
      const item = state.items.find((entry) => entry.id === itemId);
      if (!item) throw new Error('Barang sudah tidak ada di katalog.');
      if (photo) {
        const nextItems = state.items.map((entry) => entry.id === itemId ? { ...entry, claimPhoto: photo } : entry);
        saveItems(nextItems);
        state.items = nextItems;
      }
      const attempt = (state.claimAttempts[itemId] || 0) + 1;
      state.claimAttempts[itemId] = attempt;
      const match = /(stiker|nama)/i.test(answer);
      return { itemId, attempt, score: match ? 94 : 38, match, retryAllowed: !match && attempt < 3 };
    },

    async confirmPickup({ itemId }) {
      await wait(DEMO_TIMING.api);
      const item = state.items.find((entry) => entry.id === itemId);
      if (!item) throw new Error('Barang sudah tidak ada di katalog.');
      const nextItems = state.items.filter((entry) => entry.id !== itemId);
      saveItems(nextItems);
      state.items = nextItems;
      return item;
    },

    async sendSupportMessage({ nim, topic, body, context, threadId }) {
      await wait(DEMO_TIMING.api);
      const threads = getSupportThreads();
      let thread = threads.find((entry) => entry.id === threadId);
      if (!thread) {
        thread = { id: `support-${Date.now()}`, nim, topic, context: context || null, messages: [] };
        threads.unshift(thread);
      }
      thread.messages.push({ id: `message-${Date.now()}`, sender: 'student', body, sentAt: new Date().toISOString(), delivery: 'Terkirim', read: false });
      thread.updatedAt = new Date().toISOString();
      saveSupportThreads(threads);
      return thread;
    },

    async listSupportThreads({ nim } = {}) {
      await wait(DEMO_TIMING.api);
      const threads = getSupportThreads();
      return (nim ? threads.filter((thread) => thread.nim === nim) : threads).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    },

    async markSupportRead(threadId) {
      await wait(DEMO_TIMING.api);
      const threads = getSupportThreads();
      const thread = threads.find((entry) => entry.id === threadId);
      if (!thread) throw new Error('Pesan tidak ditemukan.');
      thread.messages.forEach((message) => {
        if (message.sender === 'student') {
          message.read = true;
          message.delivery = 'Dibaca';
        }
      });
      saveSupportThreads(threads);
      return thread;
    },

    async replySupport({ threadId, body }) {
      await wait(DEMO_TIMING.api);
      const threads = getSupportThreads();
      const thread = threads.find((entry) => entry.id === threadId);
      if (!thread) throw new Error('Pesan tidak ditemukan.');
      thread.messages.push({ id: `message-${Date.now()}`, sender: 'admin', body, sentAt: new Date().toISOString(), delivery: 'Dibaca', read: true });
      thread.updatedAt = new Date().toISOString();
      saveSupportThreads(threads);
      return thread;
    },
  };

  // Shared UI helpers
  function toast(message) {
    const element = document.createElement('div');
    element.className = 'toast';
    element.setAttribute('role', 'status');
    element.textContent = message;
    $('toastZone').appendChild(element);
    window.setTimeout(() => element.remove(), DEMO_TIMING.toast);
  }

  function setTextStatus(id, message = '', tone = '') {
    const element = $(id);
    if (!element) return;
    element.textContent = message;
    element.className = `form-status${tone ? ` is-${tone}` : ''}`;
  }

  function setFieldError(id, message = '') {
    const element = $(id);
    if (element) element.textContent = message;
  }

  function clearFieldErrors(ids) {
    ids.forEach((id) => setFieldError(id));
  }

  function setButtonLoading(button, loading, label) {
    if (!button) return;
    if (loading) {
      button.dataset.label = button.innerHTML;
      button.disabled = true;
      button.textContent = label;
      return;
    }
    button.disabled = false;
    if (button.dataset.label) button.innerHTML = button.dataset.label;
  }

  function setFinderStep(step) {
    document.querySelectorAll('.flow-steps li').forEach((element, index) => element.classList.toggle('active', index === step));
  }

  function updateVisualViewport() {
    const viewport = window.visualViewport;
    const offset = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
    document.documentElement.style.setProperty('--keyboard-offset', `${offset}px`);
  }

  // Finder rendering and flow
  function renderFoundPreview() {
    if (!state.foundPhoto) return;
    $('foundPreview').innerHTML = `<img src="${safe(state.foundPhoto)}" alt="Foto barang yang akan dititipkan"><div class="scanner-overlay" aria-hidden="true"><span class="scan-line"></span><span class="scan-corner top-left"></span><span class="scan-corner top-right"></span><span class="scan-corner bottom-left"></span><span class="scan-corner bottom-right"></span><div class="detection-list"><span>Botol minum</span><span>Hijau</span><span>Tutup hijau</span></div></div>`;
  }

  function updateFoundAiProgress(stage) {
    const stages = [
      ['Memvalidasi foto', 'Memastikan foto dapat dibaca.', 30],
      ['Membaca ciri umum', 'Menyiapkan saran yang bisa kamu ubah.', 68],
      ['Menyiapkan isian', 'Periksa semua saran sebelum mengirim.', 100],
    ];
    const [title, hint, percent] = stages[stage];
    const panel = $('foundAiProgress');
    panel.hidden = false;
    panel.setAttribute('aria-busy', String(stage < stages.length - 1));
    $('foundAiTitle').textContent = title;
    $('foundAiHint').textContent = hint;
    $('foundAiPercent').textContent = `${percent}%`;
    $('foundAiBar').style.width = `${percent}%`;
    document.querySelectorAll('[data-ai-stage]').forEach((element, index) => {
      element.classList.toggle('active', index === stage);
      element.classList.toggle('complete', index < stage);
    });
  }

  async function applyFoundAiSuggestions(run) {
    const suggestions = [
      ['itemName', 'itemNameTag', 'Botol minum'],
      ['itemCategory', 'itemCategoryTag', 'Botol / Tumbler'],
      ['itemColor', 'itemColorTag', 'Hijau'],
      ['itemGeneral', 'itemGeneralTag', 'Botol minum hijau dengan tutup hitam'],
    ];
    for (const [inputId, tagId, value] of suggestions) {
      if (run !== state.finderRun) return;
      const input = $(inputId);
      if (!input.value.trim()) {
        input.value = value;
        $(tagId).hidden = false;
        if (input.animate) input.animate([{ opacity: .35, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: DEMO_TIMING.finderField, fill: 'both' });
      }
      await wait(DEMO_TIMING.finderField);
    }
  }

  async function startFoundAiSimulation() {
    const run = ++state.finderRun;
    updateFoundAiProgress(0);
    await wait(DEMO_TIMING.finderStages[0]);
    if (run !== state.finderRun) return;
    updateFoundAiProgress(1);
    await wait(DEMO_TIMING.finderStages[1]);
    if (run !== state.finderRun) return;
    updateFoundAiProgress(2);
    await wait(DEMO_TIMING.finderStages[2]);
    if (run !== state.finderRun) return;
    await applyFoundAiSuggestions(run);
    if (run !== state.finderRun) return;
    setFinderStep(1);
  }

  function previewFoundPhoto(file) {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_BYTES) {
      setTextStatus('depositStatus', 'Pilih gambar dengan ukuran maksimal 2 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setTextStatus('depositStatus', 'Foto tidak dapat dibaca. Coba lagi.', 'error');
    reader.onload = () => {
      state.foundPhoto = String(reader.result);
      setTextStatus('depositStatus');
      renderFoundPreview();
      startFoundAiSimulation().catch(() => setTextStatus('depositStatus', 'Pemeriksaan foto tidak dapat dijalankan.', 'error'));
    };
    reader.readAsDataURL(file);
  }

  async function useDemoPhoto() {
    const button = $('foundDemoBtn');
    setButtonLoading(button, true, 'Memuat foto');
    try {
      const source = $('demoPhotoSource');
      if (!source.complete || !source.naturalWidth) await source.decode();
      const canvas = document.createElement('canvas');
      canvas.width = source.naturalWidth;
      canvas.height = source.naturalHeight;
      canvas.getContext('2d').drawImage(source, 0, 0);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', .92));
      if (!blob) throw new Error('Foto demo tidak tersedia.');
      previewFoundPhoto(new File([blob], 'botol-hijau.jpg', { type: 'image/jpeg' }));
    } catch (error) {
      setTextStatus('depositStatus', error.message || 'Foto demo tidak dapat digunakan.', 'error');
    } finally {
      setButtonLoading(button, false);
    }
  }

  function validateFoundForm() {
    const values = {
      name: $('itemName').value.trim(),
      category: $('itemCategory').value.trim(),
      color: $('itemColor').value.trim(),
      locationId: $('foundLocation').value,
      detailLocation: $('detailLocation').value.trim(),
      general: $('itemGeneral').value.trim(),
      secret: $('itemSecret').value.trim(),
      photo: state.foundPhoto,
    };
    clearFieldErrors(['itemNameError', 'itemCategoryError', 'itemColorError', 'detailLocationError', 'itemSecretError']);
    let valid = true;
    if (!values.photo) { setTextStatus('depositStatus', 'Tambahkan foto barang terlebih dahulu.', 'error'); valid = false; }
    if (!values.name) { setFieldError('itemNameError', 'Nama barang wajib diisi.'); valid = false; }
    if (!values.category) { setFieldError('itemCategoryError', 'Pilih kategori barang.'); valid = false; }
    if (!values.detailLocation) { setFieldError('detailLocationError', 'Detail lokasi wajib diisi.'); valid = false; }
    if (!values.secret) { setFieldError('itemSecretError', 'Ciri khusus wajib diisi.'); valid = false; }
    return valid ? values : null;
  }

  function renderLockerRecommendation(payload) {
    state.pendingFound = payload;
    const preferred = locations.find((location) => location.id === payload.locationId && location.status === 'online' && location.capacity > 0);
    const location = preferred || locations.find((entry) => entry.status === 'online' && entry.capacity > 0);
    if (!location) {
      $('lockerRecommendation').hidden = false;
      $('lockerRecommendation').innerHTML = '<h3>Loker sedang tidak tersedia</h3><p>Coba lagi saat ada loker kosong.</p>';
      return;
    }
    $('lockerRecommendation').hidden = false;
    $('lockerRecommendation').innerHTML = `<div class="recommendation-grid"><div><h3>${safe(location.name)} · Loker M-03</h3><p>Ditemukan di ${safe(payload.detailLocation)}. PIN penitipan berlaku 15 menit.</p><div class="pin-display"><span>PIN penitipan</span><strong>184205</strong><span>15 menit</span></div></div><button id="reserveLockerBtn" class="button button-main" type="button">Simulasikan buka loker</button></div>`;
    $('reserveLockerBtn').addEventListener('click', () => submitFoundItem().catch((error) => setTextStatus('depositStatus', error.message || 'Barang tidak dapat disimpan.', 'error')));
    setFinderStep(2);
    $('lockerRecommendation').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function submitFoundItem() {
    const button = $('reserveLockerBtn');
    if (!state.pendingFound || !button) return;
    setButtonLoading(button, true, 'Menyimpan barang');
    try {
      const item = await api.submitFound(state.pendingFound);
      state.pendingFound = null;
      setFinderStep(3);
      $('lockerRecommendation').innerHTML = `<div class="recommendation-grid"><div><h3>Barang sudah dititipkan</h3><p>${safe(item.name)} sekarang tampil di katalog tanpa ciri khusus.</p></div><button id="viewCatalogBtn" class="button button-main" type="button">Lihat di katalog</button></div>`;
      $('viewCatalogBtn').addEventListener('click', () => showTab('cari'));
      setTextStatus('depositStatus', 'Barang berhasil disimpan.', 'success');
      toast('Barang masuk ke katalog.');
    } catch (error) {
      setButtonLoading(button, false);
      throw error;
    }
  }

  // Catalog and claim flow
  async function renderItems() {
    const query = $('searchInput').value;
    const location = $('searchLocation').value;
    $('resultCount').textContent = 'Mencari barang...';
    try {
      const visible = await api.searchItems({ query, location });
      $('resultCount').textContent = visible.length ? `${visible.length} barang ditemukan.` : 'Tidak ada barang yang cocok.';
      $('itemsList').innerHTML = visible.map((item) => `<article class="item-card"><div class="item-cover">${item.photo ? `<img src="${safe(item.photo)}" alt="Foto ${safe(item.name)}">` : icons(item.category === 'Kartu Identitas' ? 'shield' : 'package')}</div><div class="item-info"><div class="item-meta">${safe(item.category)}</div><h3>${safe(item.name)}</h3><dl class="item-details"><div><dt>Warna</dt><dd>${safe(item.color)}</dd></div><div><dt>Lokasi</dt><dd>${safe(item.location)}</dd></div><div><dt>Ditemukan</dt><dd>${safe(item.date)}</dd></div></dl><p>${item.category === 'Kartu Identitas' ? 'Data pribadi tidak ditampilkan di katalog.' : 'Jawab ciri khusus untuk mengajukan klaim.'}</p><button class="button button-main" type="button" data-claim="${safe(item.id)}">Ini barang saya ${icons('arrow-right')}</button></div></article>`).join('') || '<p class="empty-state">Tidak ada barang yang cocok. Coba kata kunci lain.</p>';
      $('itemsList').querySelectorAll('[data-claim]').forEach((button) => button.addEventListener('click', () => openClaim(button.dataset.claim, button)));
    } catch (error) {
      $('resultCount').textContent = 'Barang tidak dapat dimuat.';
      $('itemsList').innerHTML = '<p class="empty-state">Coba muat ulang daftar barang.</p>';
    }
  }

  function modalShell(title, body) {
    $('modalContent').innerHTML = `<span class="sheet-handle" aria-hidden="true"></span><button class="modal-close" id="modalClose" type="button" aria-label="Tutup">×</button><h2 id="modalHeading">${safe(title)}</h2>${body}`;
    $('modalClose').addEventListener('click', closeModal);
  }

  function openModal(title, body, trigger) {
    state.modalTrigger = trigger || document.activeElement;
    $('modalLayer').hidden = false;
    modalShell(title, body);
    window.requestAnimationFrame(() => ($('modalContent').querySelector('[data-autofocus]') || $('modalClose')).focus());
  }

  function closeModal() {
    if ($('modalLayer').hidden) return;
    $('modalLayer').hidden = true;
    $('modalContent').innerHTML = '';
    const trigger = state.modalTrigger;
    state.modalTrigger = null;
    if (trigger && document.contains(trigger)) trigger.focus();
  }

  function claimFormBody(item, attempt = 0, feedback = '') {
    return `<p>Sebutkan ciri khusus yang tidak terlihat di katalog.</p><form id="claimForm" class="claim-form" novalidate><section class="claim-photo-field" aria-labelledby="claimPhotoLabel"><span id="claimPhotoLabel">Foto barang <small>opsional</small></span><div id="claimPreview" class="claim-preview" aria-live="polite"></div><label class="sr-only" for="claimCamera">Ambil foto barang untuk klaim</label><button id="claimCameraBtn" class="button button-outline full" type="button">${icons('camera')}Ambil foto barang</button><input id="claimCamera" type="file" accept="image/*" capture="environment" hidden /><p id="claimPhotoError" class="field-error" aria-live="polite"></p></section><label class="field" for="claimAnswer"><span>Ciri khusus</span><textarea id="claimAnswer" data-autofocus rows="3" maxlength="500" placeholder="Tulis ciri khusus barang"></textarea></label><p id="claimAnswerError" class="field-error" aria-live="polite"></p><div class="claim-tools"><button id="claimExampleBtn" class="text-button" type="button">Isi jawaban demo</button><span class="claim-attempt">Percobaan ${attempt} dari 3</span></div><p id="claimStatus" class="form-status ${feedback ? 'is-error' : ''}" aria-live="polite">${safe(feedback)}</p><button id="claimSubmit" class="button button-main full" type="submit">Verifikasi klaim</button></form><p class="simulation-note">Simulasi pencocokan</p>`;
  }

  function renderClaimPreview() {
    const preview = $('claimPreview');
    if (!state.claimPhoto) {
      preview.innerHTML = `${icons('camera')}<strong>Foto belum ditambahkan</strong><span>Foto membantu admin memeriksa barang.</span>`;
      return;
    }
    preview.innerHTML = `<img src="${safe(state.claimPhoto)}" alt="Foto barang untuk klaim"><div class="scanner-overlay" aria-hidden="true"><span class="scan-line"></span><span class="scan-corner top-left"></span><span class="scan-corner top-right"></span><span class="scan-corner bottom-left"></span><span class="scan-corner bottom-right"></span><div class="detection-list"><span>Botol minum</span><span>Hijau</span><span>Tutup hijau</span></div></div>`;
  }

  function previewClaimPhoto(file) {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_BYTES) {
      setFieldError('claimPhotoError', 'Pilih gambar dengan ukuran maksimal 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setFieldError('claimPhotoError', 'Foto tidak dapat dibaca. Coba lagi.');
    reader.onload = () => {
      state.claimPhoto = String(reader.result);
      setFieldError('claimPhotoError');
      renderClaimPreview();
    };
    reader.readAsDataURL(file);
  }

  function wireClaimForm(item, attempt = 0, feedback = '') {
    modalShell(`Klaim ${item.name}`, claimFormBody(item, attempt, feedback));
    renderClaimPreview();
    $('claimCameraBtn').addEventListener('click', () => $('claimCamera').click());
    $('claimCamera').addEventListener('change', (event) => previewClaimPhoto(event.target.files?.[0]));
    $('claimExampleBtn').addEventListener('click', () => { $('claimAnswer').value = 'Ada stiker nama di bagian bawah botol'; $('claimAnswer').focus(); });
    $('claimForm').addEventListener('submit', (event) => {
      event.preventDefault();
      submitClaim(item).catch((error) => setTextStatus('claimStatus', error.message || 'Klaim tidak dapat diperiksa.', 'error'));
    });
  }

  function openClaim(id, trigger) {
    const item = state.items.find((entry) => entry.id === id);
    if (!item) return toast('Barang sudah tidak ada di katalog.');
    state.claimPhoto = '';
    openModal(`Klaim ${item.name}`, claimFormBody(item), trigger);
    renderClaimPreview();
    $('claimCameraBtn').addEventListener('click', () => $('claimCamera').click());
    $('claimCamera').addEventListener('change', (event) => previewClaimPhoto(event.target.files?.[0]));
    $('claimExampleBtn').addEventListener('click', () => { $('claimAnswer').value = 'Ada stiker nama di bagian bawah botol'; $('claimAnswer').focus(); });
    $('claimForm').addEventListener('submit', (event) => {
      event.preventDefault();
      submitClaim(item).catch((error) => setTextStatus('claimStatus', error.message || 'Klaim tidak dapat diperiksa.', 'error'));
    });
  }

  async function submitClaim(item) {
    const answer = $('claimAnswer').value.trim();
    const attempt = state.claimAttempts[item.id] || 0;
    setFieldError('claimAnswerError');
    if (!answer) {
      setFieldError('claimAnswerError', 'Ciri khusus wajib diisi.');
      return;
    }
    const button = $('claimSubmit');
    setButtonLoading(button, true, 'Memeriksa klaim');
    const result = await api.submitClaim({ itemId: item.id, answer, photo: state.claimPhoto });
    await runClaimVerification(result);
    if (result.match) {
      await wait(DEMO_TIMING.claimResult);
      renderPickup(item);
      return;
    }
    if (result.retryAllowed) {
      wireClaimForm(item, result.attempt, 'Belum cocok. Coba lagi.');
      return;
    }
    modalShell(`Klaim ${item.name}`, '<section class="claim-result"><h3>Klaim perlu review</h3><p>Jawaban belum cocok setelah tiga percobaan.</p></section><p class="simulation-note">Simulasi pencocokan</p>');
  }

  async function animateGauge(score) {
    const ring = $('claimGaugeValue');
    const number = $('claimScore');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      ring.style.strokeDashoffset = String(326.73 * (1 - score / 100));
      number.textContent = `${score}%`;
      return;
    }
    const start = performance.now();
    await new Promise((resolve) => {
      const frame = (now) => {
        const progress = Math.min(1, (now - start) / DEMO_TIMING.claimGauge);
        const current = Math.round(score * progress);
        ring.style.strokeDashoffset = String(326.73 * (1 - current / 100));
        number.textContent = `${current}%`;
        if (progress < 1) window.requestAnimationFrame(frame);
        else resolve();
      };
      window.requestAnimationFrame(frame);
    });
  }

  async function runClaimVerification(result) {
    modalShell('Verifikasi klaim', `<section class="claim-verification" aria-live="polite"><ol class="claim-checks"><li id="claimCheck0"><span>1</span>Membandingkan jawaban</li><li id="claimCheck1"><span>2</span>Mencocokkan detail rahasia</li><li id="claimCheck2"><span>3</span>Menghitung skor</li></ol><div class="claim-gauge-wrap"><svg class="claim-gauge" viewBox="0 0 120 120" aria-label="Skor kecocokan"><circle class="gauge-track" cx="60" cy="60" r="52"></circle><circle id="claimGaugeValue" class="gauge-value" cx="60" cy="60" r="52"></circle></svg><strong id="claimScore" class="claim-score">0%</strong><p>Skor simulasi</p></div></section>`);
    for (let index = 0; index < 3; index += 1) {
      await wait(DEMO_TIMING.claimCheck);
      $(`claimCheck${index}`).classList.add('complete');
    }
    await animateGauge(result.score);
  }

  function renderPickup(item) {
    modalShell('Klaim terverifikasi', `<section class="claim-result"><h3>Cocok. Klaim terverifikasi.</h3><p>Gunakan PIN ini di loker ${safe(item.locker)}.</p><div class="pickup-pin"><span>PIN pengambilan</span><strong>482916</strong><span>Berlaku 3 hari</span></div><p id="pickupStatus" class="form-status" aria-live="polite"></p><button id="pickupBtn" class="button button-main full" type="button">Simulasikan buka loker</button><button id="lockerProblemBtn" class="link-button" type="button">Loker bermasalah?</button></section><p class="simulation-note">Simulasi pencocokan</p>`);
    $('pickupBtn').addEventListener('click', () => confirmPickup(item).catch((error) => setTextStatus('pickupStatus', error.message || 'Barang tidak dapat diambil.', 'error')));
    $('lockerProblemBtn').addEventListener('click', () => {
      state.supportContext = { itemName: item.name, locker: item.locker };
      closeModal();
      showTab('bantuan');
    });
  }

  async function confirmPickup(item) {
    const button = $('pickupBtn');
    setButtonLoading(button, true, 'Membuka loker');
    const pickedUp = await api.confirmPickup({ itemId: item.id });
    modalShell('Pengambilan selesai', `<section class="pickup-success"><div><h3>Barang sudah diambil</h3><p>${safe(pickedUp.name)} sudah dihapus dari katalog.</p></div><button id="closePickupBtn" class="button button-main" type="button">Selesai</button></section>`);
    $('closePickupBtn').addEventListener('click', closeModal);
    toast('Barang sudah diambil.');
  }

  // Locations and support chat rendering
  function renderLocations() {
    $('locationGrid').innerHTML = locations.map((location) => {
      const used = location.total - location.capacity;
      const percent = Math.round((used / location.total) * 100);
      return `<article class="location-card ${location.status === 'offline' ? 'offline' : ''}"><h3>${safe(location.name)}</h3><p>${safe(location.place)}</p><div class="capacity-line"><span>${location.status === 'offline' ? 'Tidak tersedia' : `${location.capacity} loker tersedia`}</span><span>${used}/${location.total}</span></div><div class="capacity-bar" aria-hidden="true"><span style="width:${percent}%"></span></div><div class="size-row">${location.sizes.map((size) => `<span>${safe(size)}</span>`).join('')}</div><p class="location-state">${location.status === 'offline' ? 'Titik sedang offline' : 'Titik siap digunakan'}</p></article>`;
    }).join('');
  }

  function renderSupportContext() {
    const context = state.supportContext;
    const element = $('supportContext');
    if (!context) {
      element.hidden = true;
      element.textContent = '';
      return;
    }
    element.hidden = false;
    element.textContent = `Tentang ${context.itemName}, loker ${context.locker}.`;
  }

  function renderTopicSelection() {
    document.querySelectorAll('.topic-button').forEach((button) => {
      const selected = button.dataset.topic === state.selectedSupportTopic;
      button.setAttribute('aria-checked', String(selected));
    });
  }

  function messageMarkup(message) {
    const sender = message.sender === 'student' ? 'student' : 'admin';
    const label = sender === 'student' ? message.delivery : 'Admin';
    return `<article class="chat-message ${sender}"><div class="chat-bubble">${safe(message.body)}</div><span class="chat-meta">${safe(timeLabel(message.sentAt))} · ${safe(label)}</span></article>`;
  }

  async function renderSupportThread() {
    const threadElement = $('supportThread');
    threadElement.innerHTML = '<p class="chat-empty">Memuat percakapan...</p>';
    try {
      const threads = await api.listSupportThreads({ nim: state.user?.nim || '' });
      const active = threads.find((thread) => thread.id === state.activeSupportThreadId) || threads[0];
      state.activeSupportThreadId = active?.id || '';
      if (active) {
        state.selectedSupportTopic = active.topic;
        renderTopicSelection();
        threadElement.innerHTML = active.messages.map(messageMarkup).join('');
      } else {
        threadElement.innerHTML = '<p class="chat-empty">Belum ada pesan. Pilih topik lalu kirim pesan pertama.</p>';
      }
      threadElement.scrollTop = threadElement.scrollHeight;
    } catch (error) {
      threadElement.innerHTML = '<p class="chat-empty">Pesan tidak dapat dimuat.</p>';
    }
  }

  async function sendSupportMessage() {
    const body = $('supportMessage').value.trim();
    const error = $('supportError');
    error.textContent = '';
    if (!state.selectedSupportTopic && !state.activeSupportThreadId) {
      error.textContent = 'Pilih topik sebelum mengirim pesan.';
      return;
    }
    if (!body) {
      error.textContent = 'Tulis pesan untuk admin.';
      return;
    }
    const button = $('supportSend');
    setButtonLoading(button, true, 'Kirim');
    try {
      const thread = await api.sendSupportMessage({ nim: state.user?.nim || 'Mahasiswa', topic: state.selectedSupportTopic, body, context: state.supportContext, threadId: state.activeSupportThreadId });
      state.activeSupportThreadId = thread.id;
      $('supportMessage').value = '';
      $('supportSend').disabled = true;
      await renderSupportThread();
    } catch (errorValue) {
      error.textContent = errorValue.message || 'Pesan tidak dapat dikirim.';
      setButtonLoading(button, false);
    }
  }

  // Admin rendering
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
    const lockers = [
      ['A1', 'FISIP', 'available'], ['A2', 'FISIP', 'stored', state.items.find((item) => item.locker === 'A2')], ['A3', 'FISIP', 'held'],
      ['B1', 'FTI', 'claimed', state.items.find((item) => item.locker === 'B1')], ['B2', 'FTI', 'available'], ['B3', 'FTI', 'available'],
      ['C1', 'Masjid', 'offline'], ['C2', 'Masjid', 'offline'], ['C3', 'Masjid', 'offline'],
    ];
    const labels = { available: 'KOSONG', held: 'DIPESAN', stored: 'TERSIMPAN', claimed: 'SIAP DIAMBIL', offline: 'OFFLINE' };
    $('adminLockerList').innerHTML = lockers.map(([locker, node, status, item]) => `<article class="admin-locker-row ${status}"><div class="admin-locker-code"><strong>${safe(locker)}</strong><span class="admin-status ${status}">${labels[status]}</span></div>${item ? `<div class="admin-locker-detail"><strong>${safe(item.name)}</strong><span>${safe(node)} · ${safe(item.category)} · ${safe(item.color)}</span><span>Penemu: ${safe(item.finder)} · ${safe(item.location)}</span><span>Ciri khusus: ${safe(item.secret)}</span><span>PIN penitipan ${safe(item.depositPin)} · PIN ambil ${safe(item.claimPin)}</span></div>` : `<p class="admin-empty">${status === 'offline' ? 'Titik sedang offline; status pintu perlu sinkronisasi.' : 'Tidak ada barang aktif di loker ini.'}</p>`}</article>`).join('');
    $('adminUpdated').textContent = `Visual data · ${timeLabel(new Date().toISOString())}`;
    renderAdminSupport().catch(() => { $('adminSupportContent').textContent = 'Pesan tidak dapat dimuat.'; });
  }

  async function renderAdminSupport(threadId = '') {
    const target = $('adminSupportContent');
    target.textContent = 'Memuat pesan...';
    const threads = await api.listSupportThreads();
    const thread = threads.find((entry) => entry.id === threadId);
    if (!thread) {
      target.innerHTML = threads.length ? `<div class="support-ticket-list">${threads.map((entry) => {
        const last = entry.messages.at(-1);
        const unread = entry.messages.some((message) => message.sender === 'student' && !message.read);
        return `<button class="support-ticket" type="button" data-support-thread="${safe(entry.id)}"><span><strong>${safe(entry.nim)} · ${safe(entry.topic)}</strong><small>${safe(last?.body || '')}</small></span>${unread ? '<i class="unread-dot" aria-label="Belum dibaca"></i>' : '<span></span>'}</button>`;
      }).join('')}</div>` : '<p class="empty-state">Belum ada pesan masuk.</p>';
      target.querySelectorAll('[data-support-thread]').forEach((button) => button.addEventListener('click', () => openAdminThread(button.dataset.supportThread).catch(() => { target.textContent = 'Pesan tidak dapat dibuka.'; })));
      return;
    }
    target.innerHTML = `<div class="admin-thread-head"><div><h3>${safe(thread.nim)} · ${safe(thread.topic)}</h3>${thread.context ? `<p class="chat-meta">${safe(thread.context.itemName)} · Loker ${safe(thread.context.locker)}</p>` : ''}</div><button id="backToTickets" class="text-button" type="button">Kembali</button></div><div id="adminThread" class="admin-thread" aria-live="polite">${thread.messages.map(messageMarkup).join('')}</div><form id="adminReplyForm" class="admin-reply-form" novalidate><label class="sr-only" for="adminReply">Balas pesan</label><textarea id="adminReply" rows="1" maxlength="500" placeholder="Balas mahasiswa"></textarea><button id="adminReplySend" class="button button-main" type="submit">Kirim</button><p id="adminReplyError" class="field-error" aria-live="polite"></p></form>`;
    const messages = $('adminThread');
    messages.scrollTop = messages.scrollHeight;
    $('backToTickets').addEventListener('click', () => renderAdminSupport().catch(() => { target.textContent = 'Pesan tidak dapat dimuat.'; }));
    $('adminReplyForm').addEventListener('submit', (event) => {
      event.preventDefault();
      replyToSupportThread(thread.id).catch((error) => { $('adminReplyError').textContent = error.message || 'Balasan tidak dapat dikirim.'; });
    });
  }

  async function openAdminThread(threadId) {
    await api.markSupportRead(threadId);
    await renderAdminSupport(threadId);
  }

  async function replyToSupportThread(threadId) {
    const body = $('adminReply').value.trim();
    if (!body) {
      $('adminReplyError').textContent = 'Tulis balasan untuk mahasiswa.';
      return;
    }
    const button = $('adminReplySend');
    setButtonLoading(button, true, 'Kirim');
    await api.replySupport({ threadId, body });
    await renderAdminSupport(threadId);
  }

  // Navigation and session
  function showTab(tab) {
    ['temukan', 'cari', 'lokasi', 'bantuan'].forEach((name) => { $(`tab-${name}`).hidden = name !== tab; });
    document.querySelectorAll('[data-tab]').forEach((button) => button.classList.toggle('active', button.dataset.tab === tab));
    state.activeTab = tab;
    document.body.classList.toggle('support-tab-active', tab === 'bantuan');
    if (tab === 'cari') renderItems();
    if (tab === 'lokasi') renderLocations();
    if (tab === 'bantuan') {
      renderSupportContext();
      renderTopicSelection();
      renderSupportThread();
    }
    window.scrollTo(0, 0);
  }

  function setUser(data) {
    state.user = data;
    storage.setItem(USER_KEY, JSON.stringify(data));
    const admin = data.role === 'admin';
    $('authView').hidden = true;
    $('appView').hidden = admin;
    $('adminView').hidden = !admin;
    $('nimDisplay').hidden = false;
    $('nimDisplay').textContent = admin ? 'Admin Himatif' : `NIM ${data.nim}`;
    $('logoutBtn').hidden = false;
    $('mobileNav').hidden = admin;
    if (admin) renderAdminDashboard();
    else showTab('temukan');
  }

  function logout() {
    state.user = null;
    storage.removeItem(USER_KEY);
    closeModal();
    document.body.classList.remove('support-tab-active');
    $('authView').hidden = false;
    $('appView').hidden = true;
    $('adminView').hidden = true;
    $('nimDisplay').hidden = true;
    $('logoutBtn').hidden = true;
    $('mobileNav').hidden = true;
    $('loginPassword').value = '';
    window.scrollTo(0, 0);
  }

  function resetDemo() {
    storage.removeItem(USER_KEY);
    storage.removeItem(SUPPORT_KEY);
    persistentStorage.removeItem(ITEMS_KEY);
    window.location.reload();
  }

  function trapModalFocus(event) {
    if ($('modalLayer').hidden || event.key !== 'Tab') return;
    const focusable = [...$('modalContent').querySelectorAll('button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [href]')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  // Event wiring
  function install() {
    renderLocations();
    $('loginForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const username = $('loginNim').value.trim();
      const password = $('loginPassword').value;
      setFieldError('loginNimError');
      setTextStatus('loginStatus');
      if (!username) { setFieldError('loginNimError', 'NIM wajib diisi.'); return; }
      const button = $('loginSubmit');
      setButtonLoading(button, true, 'Masuk');
      window.setTimeout(() => {
        setButtonLoading(button, false);
        if (username === ADMIN_USERNAME) {
          if (password === ADMIN_PASSWORD) setUser({ role: 'admin', name: 'Admin Himatif' });
          else setTextStatus('loginStatus', 'Kredensial admin tidak sesuai.', 'error');
          return;
        }
        setUser({ nim: username });
      }, DEMO_TIMING.api);
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
    $('foundDemoBtn').addEventListener('click', () => useDemoPhoto());
    $('foundCamera').addEventListener('change', (event) => previewFoundPhoto(event.target.files?.[0]));
    $('foundGallery').addEventListener('change', (event) => previewFoundPhoto(event.target.files?.[0]));
    $('secretExampleBtn').addEventListener('click', () => { $('itemSecret').value = 'Stiker nama di bagian bawah'; setFieldError('itemSecretError'); $('itemSecret').focus(); });
    $('depositForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const payload = validateFoundForm();
      if (payload) {
        setTextStatus('depositStatus');
        renderLockerRecommendation(payload);
      }
    });
    $('searchInput').addEventListener('input', () => renderItems());
    $('searchLocation').addEventListener('change', () => renderItems());

    document.querySelectorAll('.topic-button').forEach((button) => button.addEventListener('click', () => {
      state.selectedSupportTopic = button.dataset.topic;
      $('supportError').textContent = '';
      renderTopicSelection();
    }));
    $('supportMessage').addEventListener('input', () => { $('supportSend').disabled = !$('supportMessage').value.trim(); });
    $('supportMessage').addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendSupportMessage();
      }
    });
    $('supportForm').addEventListener('submit', (event) => { event.preventDefault(); sendSupportMessage(); });

    $('logoutBtn').addEventListener('click', logout);
    $('brandLink').addEventListener('click', (event) => {
      event.preventDefault();
      if (state.user?.role === 'admin') renderAdminDashboard();
      else if (state.user) showTab('temukan');
      else window.scrollTo(0, 0);
    });
    $('modalLayer').addEventListener('click', (event) => { if (event.target.dataset.close === 'true') closeModal(); });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !$('modalLayer').hidden) closeModal();
      trapModalFocus(event);
    });
    document.addEventListener('focusin', (event) => {
      if (window.visualViewport && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) window.setTimeout(() => event.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120);
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateVisualViewport);
      window.visualViewport.addEventListener('scroll', updateVisualViewport);
    }
    updateVisualViewport();

    if (DEMO_MODE) {
      $('demoTag').hidden = false;
      $('resetDemoBtn').hidden = false;
      $('resetDemoBtn').addEventListener('click', resetDemo);
      setUser({ nim: '20240001' });
      return;
    }
    let saved = null;
    try { saved = JSON.parse(storage.getItem(USER_KEY) || 'null'); } catch { saved = null; }
    if (saved) setUser(saved);
  }

  document.addEventListener('DOMContentLoaded', install);
})();
