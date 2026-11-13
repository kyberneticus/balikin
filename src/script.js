(() => {
  'use strict';

  // Constants
  const DEMO_TIMING = Object.freeze({
    api: 160,
    finderStages: [1200, 1200, 800],
    finderField: 250,
    finderScroll: 450,
    claimCheck: 900,
    claimGauge: 600,
    claimHold: 1200,
    toast: 4000,
    pinTtl: 15 * 60 * 1000,
    lockerSearch: 1200,
    lockerSignal: 3500,
    doorClose: 2500,
  });
  const ADMIN_USERNAME = 'admin';
  const ADMIN_PASSWORD = 'admin123';
  const USER_KEY = 'balikin-visual-user-v2';
  const SUPPORT_KEY = 'balikin-support-v1';
  const DEMO_LOGOUT_KEY = 'balikin-demo-logged-out-v1';
  const DEMO_MODE = new URLSearchParams(window.location.search).get('demo') === '1';
  const ITEMS_KEY = DEMO_MODE ? 'balikin-demo-items-v1' : 'balikin-items-v1';
  const DEMO_ITEM = Object.freeze({
    id: 'bottle',
    name: 'Botol minum hijau',
    category: 'Botol / Tumbler',
    color: 'Hijau',
    general: 'Botol minum hijau dengan tutup hijau',
    detection: Object.freeze(['Botol minum', 'Hijau', 'Tutup hijau']),
    location: 'FISIP · Gedung A',
    date: 'Hari ini',
    locker: 'A2',
    node: 'FISIP',
    status: 'stored',
    secret: 'Stiker nama di bagian bawah',
    finder: '20240001',
    photo: 'assets/botol-hijau.jpg',
    depositPin: '184205',
    claimPin: '482916',
  });
  const IMAGE_LIMITS = Object.freeze({
    uploadBytes: 12 * 1024 * 1024,
    storageBytes: 2 * 1024 * 1024,
    maxDimension: 1600,
    quality: .82,
    qualityStep: .12,
    resizeFactor: .75,
    attempts: 5,
  });
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
    const bottle = { ...DEMO_ITEM };
    const wallet = { id: 'wallet', name: 'Dompet hitam', category: 'Dompet', color: 'Hitam', location: 'FTI · Lobi utama', date: 'Kemarin', locker: 'B1', node: 'FTI', status: 'claimed', secret: 'Ada foto keluarga di bagian dalam', finder: '20240045', depositPin: 'Belum ada', claimPin: 'Review admin' };
    const card = { id: 'card', name: 'Kartu identitas', category: 'Kartu Identitas', color: 'Tertutup', location: 'Masjid Kampus', date: '2 hari lalu', locker: 'Pos', node: 'Masjid', status: 'review', secret: 'Data tidak pernah ditampilkan di katalog', finder: '20240120', depositPin: 'Belum ada', claimPin: 'Verifikasi admin' };
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
    finderScanning: false,
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
    document.querySelectorAll('.flow-steps li').forEach((element, index) => {
      element.classList.toggle('active', index === step);
      element.classList.toggle('complete', index < step);
      element.querySelector('b').textContent = index < step ? '✓' : String(index + 1);
    });
  }

  function updateVisualViewport() {
    const viewport = window.visualViewport;
    const offset = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
    document.documentElement.style.setProperty('--keyboard-offset', `${offset}px`);
  }

  // Finder rendering and flow
  function detectionMarkup() {
    return DEMO_ITEM.detection.map((label) => `<span>${safe(label)}</span>`).join('');
  }

  function scanOverlay(scanning = false) {
    return `<div class="scanner-overlay${scanning ? ' is-scanning' : ''}" aria-hidden="true"><span class="scan-sweep"><span class="scan-line"></span></span><span class="scan-corner top-left"></span><span class="scan-corner top-right"></span><span class="scan-corner bottom-left"></span><span class="scan-corner bottom-right"></span><div class="detection-list">${detectionMarkup()}</div></div>`;
  }

  function setFoundPhotoControls(selected) {
    $('photoActions').classList.toggle('has-photo', selected);
    $('foundChangeBtn').hidden = !selected;
  }

  function setFinderFormHasContent() {
    $('depositForm').classList.add('has-content');
  }

  async function scrollFinderFieldsIntoView() {
    if (window.innerWidth > 670) return;
    const first = $('itemName').getBoundingClientRect();
    const last = $('itemGeneral').getBoundingClientRect();
    const headerBottom = document.querySelector('.site-header').getBoundingClientRect().bottom;
    const nav = $('mobileNav');
    const navTop = !nav.hidden ? nav.getBoundingClientRect().top : window.innerHeight;
    const submit = document.querySelector('.item-form.has-content .finder-submit');
    const safeTop = headerBottom + 16;
    const safeBottom = navTop - (submit ? submit.getBoundingClientRect().height : 0) - 36;
    const range = last.bottom - first.top;
    const targetTop = Math.max(safeTop, safeBottom - range);
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    window.scrollBy({ top: first.top - targetTop, behavior });
    await wait(DEMO_TIMING.finderScroll);
  }

  function renderFoundPreview() {
    if (!state.foundPhoto) return;
    $('foundPreview').classList.remove('is-empty');
    $('foundPreview').innerHTML = `<img src="${safe(state.foundPhoto)}" alt="Foto barang yang akan dititipkan">${scanOverlay(state.finderScanning)}`;
    setFoundPhotoControls(true);
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
      ['itemCategory', 'itemCategoryTag', DEMO_ITEM.category],
      ['itemColor', 'itemColorTag', DEMO_ITEM.color],
      ['itemGeneral', 'itemGeneralTag', DEMO_ITEM.general],
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
    setFinderFormHasContent();
    await scrollFinderFieldsIntoView();
    if (run !== state.finderRun) return;
    await applyFoundAiSuggestions(run);
    if (run !== state.finderRun) return;
    state.finderScanning = false;
    renderFoundPreview();
    setFinderStep(1);
  }

  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Foto tidak dapat dibaca. Coba lagi.'));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onerror = () => reject(new Error('Foto tidak dapat diproses. Coba JPEG atau PNG.'));
      image.onload = () => resolve(image);
      image.src = dataUrl;
    });
  }

  function canvasBlob(canvas, quality) {
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  }

  async function prepareImage(file) {
    if (!file.type.startsWith('image/')) throw new Error('Pilih berkas gambar.');
    if (file.size > IMAGE_LIMITS.uploadBytes) throw new Error('Pilih gambar dengan ukuran maksimal 12 MB.');
    const dataUrl = await readAsDataUrl(file);
    if (file.size <= IMAGE_LIMITS.storageBytes) return dataUrl;

    const image = await loadImage(dataUrl);
    const scale = Math.min(1, IMAGE_LIMITS.maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    let width = Math.max(1, Math.round(image.naturalWidth * scale));
    let height = Math.max(1, Math.round(image.naturalHeight * scale));
    let quality = IMAGE_LIMITS.quality;

    for (let attempt = 0; attempt < IMAGE_LIMITS.attempts; attempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(image, 0, 0, width, height);
      const blob = await canvasBlob(canvas, quality);
      if (blob && blob.size <= IMAGE_LIMITS.storageBytes) return readAsDataUrl(blob);
      width = Math.max(1, Math.round(width * IMAGE_LIMITS.resizeFactor));
      height = Math.max(1, Math.round(height * IMAGE_LIMITS.resizeFactor));
      quality = Math.max(0, quality - IMAGE_LIMITS.qualityStep);
    }
    throw new Error('Foto tidak dapat dikecilkan. Coba foto dengan resolusi lebih rendah.');
  }

  async function previewFoundPhoto(file) {
    if (!file) return;
    try {
      if (file.size > IMAGE_LIMITS.storageBytes) setTextStatus('depositStatus', 'Mengecilkan foto sebelum disimpan.');
      state.foundPhoto = await prepareImage(file);
      state.finderScanning = true;
      setTextStatus('depositStatus');
      renderFoundPreview();
      startFoundAiSimulation().catch(() => setTextStatus('depositStatus', 'Pemeriksaan foto tidak dapat dijalankan.', 'error'));
    } catch (error) {
      setTextStatus('depositStatus', error.message || 'Foto tidak dapat dibaca. Coba lagi.', 'error');
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

  let lockerTimer = null;
  let lockerEnd = 0;
  let lockerRun = 0;
  const lockerAnnounced = new Set();

  function formatPinCountdown(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const minutes = String(Math.floor(total / 60)).padStart(2, '0');
    const seconds = String(total % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  function stopLockerCountdown() {
    if (lockerTimer) window.clearInterval(lockerTimer);
    lockerTimer = null;
  }

  function lockerCountdownMarkup() {
    return `<div class="locker-count"><strong id="lockerCountdown" class="locker-time">15:00</strong><div class="locker-bar" aria-hidden="true"><span id="lockerBar"></span></div></div><p id="lockerLive" class="sr-only" aria-live="polite"></p>`;
  }

  function updateLockerCountdown(locationLabel) {
    const remain = lockerEnd - Date.now();
    const label = formatPinCountdown(remain);
    const time = $('lockerCountdown');
    if (time) time.textContent = label;
    const bar = $('lockerBar');
    if (bar) bar.style.transform = `scaleX(${Math.max(0, Math.min(1, remain / DEMO_TIMING.pinTtl))})`;
    const live = $('lockerLive');
    for (const mark of ['05:00', '01:00']) {
      if (label === mark && !lockerAnnounced.has(mark)) {
        lockerAnnounced.add(mark);
        if (live) live.textContent = `PIN tersisa ${mark === '05:00' ? '5 menit' : '1 menit'}.`;
      }
    }
    if (remain <= 0) {
      if ($('newPinBtn')) return;
      stopLockerCountdown();
      lockerRun += 1;
      if (live) live.textContent = 'PIN kedaluwarsa.';
      modalShell(locationLabel, `<section class="locker-sheet"><p class="locker-expired">PIN kedaluwarsa. Reservasi loker dilepas.</p><button id="newPinBtn" class="button button-main full" type="button">Buat PIN baru</button></section>`);
      const close = $('modalClose');
      if (close) close.hidden = true;
      $('newPinBtn').addEventListener('click', () => {
        document.body.classList.remove('locker-open');
        closeModal(true);
      });
    }
  }

  function startLockerCountdown(locationLabel) {
    stopLockerCountdown();
    lockerAnnounced.clear();
    lockerEnd = Date.now() + DEMO_TIMING.pinTtl;
    updateLockerCountdown(locationLabel);
    lockerTimer = window.setInterval(() => updateLockerCountdown(locationLabel), 250);
  }

  function resetDepositForm() {
    state.finderRun += 1;
    state.foundPhoto = '';
    $('depositForm').reset();
    $('depositForm').classList.remove('has-content');
    $('foundCamera').value = '';
    $('foundGallery').value = '';
    $('foundPreview').classList.add('is-empty');
    $('foundPreview').innerHTML = '<svg><use href="#i-camera"></use></svg><span>Ambil foto atau pilih dari galeri.</span>';
    setFoundPhotoControls(false);
    $('foundAiProgress').hidden = true;
    ['itemNameTag', 'itemCategoryTag', 'itemColorTag', 'itemGeneralTag'].forEach((id) => { $(id).hidden = true; });
    clearFieldErrors(['itemNameError', 'itemCategoryError', 'itemColorError', 'detailLocationError', 'itemSecretError']);
    setTextStatus('depositStatus');
    setFinderStep(0);
  }

  async function renderLockerRecommendation(payload) {
    const run = ++lockerRun;
    state.pendingFound = payload;
    const preferred = locations.find((location) => location.id === payload.locationId && location.status === 'online' && location.capacity > 0);
    const location = preferred || locations.find((entry) => entry.status === 'online' && entry.capacity > 0);
    if (!location) {
      setTextStatus('depositStatus', 'Loker sedang tidak tersedia. Coba lagi saat ada loker kosong.', 'error');
      return;
    }
    const title = `${location.name} · Loker M-03`;
    setFinderStep(2);
    openModal('Mencari loker', `<section class="locker-sheet is-busy"><p>Memeriksa titik ${safe(location.name)}.</p><div class="indeterminate" aria-hidden="true"><span></span></div></section>`, $('depositSubmit'), { persistent: true });
    const closeSearch = $('modalClose');
    if (closeSearch) closeSearch.hidden = true;
    document.body.classList.add('locker-open');
    await wait(DEMO_TIMING.lockerSearch);
    if (run !== lockerRun) return;
    openModal(title, `<section class="locker-sheet"><p class="locker-found">Ditemukan di ${safe(payload.detailLocation)}.</p><p class="locker-valid">PIN penitipan berlaku 15 menit.</p><div class="locker-pin"><span>PIN penitipan</span><strong>184205</strong></div>${lockerCountdownMarkup()}<button id="openLockerBtn" class="button button-main full" type="button">Buka loker</button><button id="cancelLockerBtn" class="link-button" type="button">Batalkan</button></section>`, $('depositSubmit'), { persistent: true });
    const close = $('modalClose');
    if (close) close.hidden = true;
    document.body.classList.add('locker-open');
    startLockerCountdown(title);
    $('cancelLockerBtn').addEventListener('click', () => {
      stopLockerCountdown();
      lockerRun += 1;
      document.body.classList.remove('locker-open');
      closeModal(true);
    });
    $('openLockerBtn').addEventListener('click', () => openLockerSignal(title).catch((error) => setTextStatus('depositStatus', error.message || 'Loker tidak dapat dibuka.', 'error')));
  }

  async function openLockerSignal(title) {
    const run = ++lockerRun;
    const steps = ['Perintah terkirim', 'Menunggu respons loker', 'Pintu terbuka'];
    modalShell('Menghubungi loker', `<section class="locker-sheet is-busy">${lockerCountdownMarkup()}<div class="indeterminate" aria-hidden="true"><span></span></div><ol class="locker-steps">${steps.map((label, index) => `<li id="lockerStep${index}"><span></span>${safe(label)}</li>`).join('')}</ol></section>`);
    const closeA = $('modalClose');
    if (closeA) closeA.hidden = true;
    const stepWait = DEMO_TIMING.lockerSignal / (steps.length + 1);
    for (let index = 0; index < steps.length; index += 1) {
      await wait(stepWait);
      if (run !== lockerRun) return;
      const row = $(`lockerStep${index}`);
      if (row) row.classList.add('complete');
    }
    await wait(stepWait);
    if (run !== lockerRun) return;
    stopLockerCountdown();
    modalShell('Loker terbuka', `<section class="locker-sheet"><p>Masukkan barang, lalu tutup pintu.</p><p class="locker-wait"><span class="spinner" aria-hidden="true"></span>Menunggu pintu tertutup</p></section>`);
    const closeB = $('modalClose');
    if (closeB) closeB.hidden = true;
    await wait(DEMO_TIMING.doorClose);
    if (run !== lockerRun) return;
    let item = null;
    try {
      item = await api.submitFound(state.pendingFound);
    } catch (error) {
      setTextStatus('depositStatus', error.message || 'Barang tidak dapat disimpan.', 'error');
      document.body.classList.remove('locker-open');
      closeModal(true);
      return;
    }
    if (run !== lockerRun) return;
    state.pendingFound = null;
    setFinderStep(3);
    setTextStatus('depositStatus', 'Barang berhasil disimpan.', 'success');
    modalShell('Barang tercatat', `<section class="locker-sheet"><p>${safe(item.name)} sudah masuk katalog.</p><button id="viewCatalogBtn" class="button button-main full" type="button">Lihat di katalog</button></section>`);
    const closeC = $('modalClose');
    if (closeC) closeC.hidden = true;
    $('viewCatalogBtn').addEventListener('click', () => {
      document.body.classList.remove('locker-open');
      closeModal(true);
      resetDepositForm();
      showTab('cari');
    });
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

  function openModal(title, body, trigger, options = {}) {
    state.modalTrigger = trigger || document.activeElement;
    state.modalPersistent = Boolean(options.persistent);
    $('modalLayer').hidden = false;
    document.body.style.overflow = 'hidden';
    modalShell(title, body);
    window.requestAnimationFrame(() => ($('modalContent').querySelector('[data-autofocus]') || $('modalClose')).focus());
  }

  function closeModal(force = false) {
    if ($('modalLayer').hidden) return;
    if (state.modalPersistent && !force) return;
    $('modalLayer').hidden = true;
    $('modalContent').innerHTML = '';
    document.body.style.overflow = '';
    const trigger = state.modalTrigger;
    state.modalTrigger = null;
    state.modalPersistent = false;
    if (trigger && document.contains(trigger)) trigger.focus();
  }

  function claimFormBody(item, attempt = 0, feedback = '', answer = '') {
    return `<section class="claim-state claim-question"><p class="claim-prompt">Sebutkan ciri khusus yang tidak terlihat di katalog.</p><form id="claimForm" class="claim-form" novalidate><label class="field" for="claimAnswer"><span>Ciri khusus</span><textarea id="claimAnswer" data-autofocus rows="3" maxlength="500" placeholder="Tulis ciri khusus barang">${safe(answer)}</textarea></label><p id="claimAnswerError" class="field-error" aria-live="polite"></p><div class="claim-tools"><button id="claimExampleBtn" class="text-button" type="button">Isi jawaban demo</button><span class="claim-attempt">Percobaan ${attempt} dari 3</span></div><p id="claimStatus" class="form-status ${feedback ? 'is-error' : ''}" aria-live="polite">${safe(feedback)}</p><button id="claimSubmit" class="button button-main full" type="submit">Verifikasi klaim</button><section class="claim-photo-field" aria-labelledby="claimPhotoLabel"><label class="sr-only" for="claimCamera">Tambah foto barang untuk klaim</label><button id="claimCameraBtn" class="button button-outline full claim-photo-toggle" type="button">${icons('camera')}<span id="claimPhotoLabel">Tambah foto (opsional)</span></button><input id="claimCamera" type="file" accept="image/*" capture="environment" hidden /><div id="claimPreview" class="claim-preview" aria-live="polite" hidden></div><p id="claimPhotoError" class="field-error" aria-live="polite"></p></section></form></section><p class="simulation-note">Simulasi pencocokan</p>`;
  }

  function renderClaimPreview() {
    const preview = $('claimPreview');
    if (!state.claimPhoto) {
      preview.hidden = true;
      preview.innerHTML = '';
      return;
    }
    preview.hidden = false;
    preview.innerHTML = `<img src="${safe(state.claimPhoto)}" alt="Foto barang untuk klaim">${scanOverlay()}`;
  }

  async function previewClaimPhoto(file) {
    if (!file) return;
    try {
      if (file.size > IMAGE_LIMITS.storageBytes) setFieldError('claimPhotoError', 'Mengecilkan foto sebelum disimpan.');
      state.claimPhoto = await prepareImage(file);
      setFieldError('claimPhotoError');
      renderClaimPreview();
    } catch (error) {
      setFieldError('claimPhotoError', error.message || 'Foto tidak dapat dibaca. Coba lagi.');
    }
  }

  function wireClaimForm(item, attempt = 0, feedback = '', answer = '', replace = true) {
    if (replace) modalShell(`Klaim ${item.name}`, claimFormBody(item, attempt, feedback, answer));
    renderClaimPreview();
    $('claimCameraBtn').addEventListener('click', () => $('claimCamera').click());
    $('claimCamera').addEventListener('change', (event) => previewClaimPhoto(event.target.files?.[0]));
    $('claimExampleBtn').addEventListener('click', () => { $('claimAnswer').value = `Ada ${DEMO_ITEM.secret.toLocaleLowerCase('id')} botol`; $('claimAnswer').focus(); });
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
    wireClaimForm(item, 0, '', '', false);
  }

  async function submitClaim(item) {
    const answer = $('claimAnswer').value.trim();
    setFieldError('claimAnswerError');
    if (!answer) {
      setFieldError('claimAnswerError', 'Ciri khusus wajib diisi.');
      return;
    }
    const button = $('claimSubmit');
    setButtonLoading(button, true, 'Memeriksa klaim');
    const result = await api.submitClaim({ itemId: item.id, answer, photo: state.claimPhoto });
    await runClaimVerification(item, result);
    if (result.match) {
      renderPickup(item);
      return;
    }
    if (result.retryAllowed) {
      wireClaimForm(item, result.attempt, 'Belum cocok. Coba lagi.', answer);
      return;
    }
    modalShell(`Klaim ${item.name}`, '<section class="claim-state claim-result"><h3>Belum cocok</h3><p>Jawaban belum cocok setelah tiga percobaan.</p></section><p class="simulation-note">Simulasi pencocokan</p>');
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

  async function runClaimVerification(item, result) {
    modalShell(`Klaim ${item.name}`, `<section class="claim-state claim-verification" aria-live="polite"><ol class="claim-checks"><li id="claimCheck0"><span>1</span>Membandingkan jawaban</li><li id="claimCheck1"><span>2</span>Mencocokkan detail rahasia</li><li id="claimCheck2"><span>3</span>Menghitung skor</li></ol><div class="claim-gauge-wrap"><div class="claim-gauge-display"><svg class="claim-gauge" viewBox="0 0 120 120" aria-label="Skor kecocokan"><circle class="gauge-track" cx="60" cy="60" r="52"></circle><circle id="claimGaugeValue" class="gauge-value" cx="60" cy="60" r="52"></circle></svg><strong id="claimScore" class="claim-score">0%</strong></div><h3 id="claimResultHeadline" class="claim-result-headline" hidden></h3><p>Skor simulasi</p></div></section>`);
    for (let index = 0; index < 3; index += 1) {
      await wait(DEMO_TIMING.claimCheck);
      $(`claimCheck${index}`).classList.add('complete');
    }
    await animateGauge(result.score);
    $('claimResultHeadline').textContent = result.match ? 'Cocok' : 'Belum cocok';
    $('claimResultHeadline').hidden = false;
    await wait(DEMO_TIMING.claimHold);
  }

  function renderPickup(item) {
    modalShell(`Klaim ${item.name}`, `<section class="claim-state claim-result"><h3>Cocok</h3><p>Gunakan PIN ini di loker ${safe(item.locker)}.</p><div class="pickup-pin"><span>PIN pengambilan</span><strong>${safe(item.claimPin)}</strong><span>Berlaku 3 hari</span></div><p id="pickupStatus" class="form-status" aria-live="polite"></p><button id="pickupBtn" class="button button-main full" type="button">Simulasikan buka loker</button><button id="lockerProblemBtn" class="link-button" type="button">Loker bermasalah?</button></section><p class="simulation-note">Simulasi pencocokan</p>`);
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
    $('adminSummary').innerHTML = summary.map(([label, count, tone]) => `<article class="admin-summary-card ${tone}"><span><i class="summary-dot ${tone}" aria-hidden="true"></i>${label}</span><strong>${count}</strong></article>`).join('');
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
    $('adminUpdated').textContent = `Diperbarui ${timeLabel(new Date().toISOString())}`;
    renderAdminSupport().catch(() => { $('adminSupportContent').textContent = 'Pesan tidak dapat dimuat.'; });
  }

  async function renderAdminSupport(threadId = '') {
    const target = $('adminSupportContent');
    target.textContent = 'Memuat pesan...';
    const threads = await api.listSupportThreads();
    const unread = threads.filter((entry) => entry.messages.some((message) => message.sender === 'student' && !message.read)).length;
    $('adminUnreadCount').textContent = unread ? `${unread} belum dibaca` : 'Tidak ada pesan baru';
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
    $('adminSupportContent').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    if (DEMO_MODE) storage.setItem(DEMO_LOGOUT_KEY, '1');
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
    storage.removeItem(DEMO_LOGOUT_KEY);
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
    $('foundChangeBtn').addEventListener('click', () => setFoundPhotoControls(false));
    $('foundCamera').addEventListener('change', (event) => previewFoundPhoto(event.target.files?.[0]));
    $('foundGallery').addEventListener('change', (event) => previewFoundPhoto(event.target.files?.[0]));
    $('depositForm').addEventListener('input', (event) => {
      if (event.target.value?.trim()) setFinderFormHasContent();
    });
    $('depositForm').addEventListener('change', (event) => {
      if (event.target.value?.trim()) setFinderFormHasContent();
    });
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
      if (!storage.getItem(DEMO_LOGOUT_KEY)) setUser({ nim: '20240001' });
      return;
    }
    let saved = null;
    try { saved = JSON.parse(storage.getItem(USER_KEY) || 'null'); } catch { saved = null; }
    if (saved) setUser(saved);
  }

  document.addEventListener('DOMContentLoaded', install);
})();
