/* Balikin: prototype interaktif, tanpa backend, autentikasi, atau analisis AI sungguhan. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const icons = (name) => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const safe = (input) => String(input ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const locations = ['A1','A2','A3','B1','B2','B3','C1','C2','C3'];
  const ADMIN_USERNAME = 'admin';
  const ADMIN_PASSWORD = 'admin123';
  // Aplikasi tetap bisa dicoba secara lokal saat penyimpanan browser diblokir.
  const storage = (() => {
    try { const s = window.sessionStorage; s.setItem('__balikin_test', '1'); s.removeItem('__balikin_test'); return s; }
    catch { const memory = new Map(); return {getItem: k => memory.get(k) ?? null, setItem: (k,v) => memory.set(k,String(v)), removeItem: k => memory.delete(k)}; }
  })();
  const KEY_ITEMS = 'balikin-items-standalone-v1';
  const KEY_USER = 'balikin-user-standalone-v1';
  let user = null, foundPhoto = '', items = [], currentModal = '', progressTimer = null, videoTimer = null;
  const samplePhoto = 'assets/botol-hijau.jpg';
  const stages = [
    ['Barang ditemukan', 'Seorang mahasiswa menemukan botol minum yang tertinggal di ruang kelas.'],
    ['Buka Balikin', 'Mahasiswa membuka aplikasi dan memilih menu Titip Barang.'],
    ['Foto barang', 'Penemu memotret botol melalui kamera atau memilih foto dari galeri.'],
    ['Bantu isi formulir', 'Informasi seperti nama, kategori, dan warna terisi melalui simulasi pemrosesan foto.'],
    ['Konfirmasi data', 'Penemu memeriksa informasi serta menambahkan lokasi temuan dan ciri khusus.'],
    ['Loker dialokasikan', 'Sistem menyediakan salah satu dari sembilan kompartemen loker.'],
    ['Masukkan PIN', 'Penemu memasukkan kode untuk membuka loker.'],
    ['Barang disimpan', 'Loker ditutup dan barang dicatat sebagai tersedia di katalog.'],
    ['Pemilik mencari', 'Pemilik menelusuri daftar dan melihat barang yang sesuai.'],
    ['Foto pembanding', 'Pemilik mengunggah foto barang miliknya untuk pemindaian.'],
    ['Pemeriksaan foto', 'Simulasi AI membandingkan kedua foto dan menampilkan hasil cocok.'],
    ['Kode pengambilan', 'Kode akses diberikan pada alur klaim melalui foto.'],
    ['Barang kembali', 'Pemilik mengambil barang, lalu loker menjadi kosong.']
  ];

  function loadItems(){
    try {const stored = JSON.parse(storage.getItem(KEY_ITEMS) || '[]'); return Array.isArray(stored) ? stored : []; }
    catch {return [];}
  }
  function persistItems(){
    try { storage.setItem(KEY_ITEMS, JSON.stringify(items)); }
    catch { toast('Data foto terlalu besar untuk disimpan di sesi ini. Data tetap tersedia sampai halaman ditutup.'); }
  }
  function restoreUser(){ try { return JSON.parse(storage.getItem(KEY_USER) || 'null'); } catch {return null;} }
  function showAuthTab(which){
    const reg = which === 'register';
    $('loginForm').hidden = reg; $('registerForm').hidden = !reg;
    $('loginTab').classList.toggle('active', !reg); $('registerTab').classList.toggle('active', reg);
    $('loginTab').setAttribute('aria-selected', String(!reg)); $('registerTab').setAttribute('aria-selected', String(reg));
    $('authTitle').textContent = reg ? 'Buat akun Balikin' : 'Masuk ke Balikin';
    $('authHelp').textContent = reg ? 'Daftar menggunakan NIM untuk melanjutkan.' : 'Gunakan NIM untuk melanjutkan.';
  }
  function setUser(data) {
    user = data;
    storage.setItem(KEY_USER, JSON.stringify(data));
    const admin = data.role === 'admin';
    $('authView').hidden = true; $('appView').hidden = admin; $('adminView').hidden = !admin;
    $('userTools').hidden = false; $('mobileNav').hidden = admin;
    $('nimDisplay').textContent = admin ? 'Administrator' : (data.nim ? `NIM ${data.nim}` : (data.name || 'Mahasiswa'));
    if(admin){renderAdminDashboard();window.scrollTo(0,0);return;}
    showTab('titip'); window.scrollTo(0,0);
  }
  function logout(){
    user = null; storage.removeItem(KEY_USER);
    closeModal(); $('authView').hidden = false; $('appView').hidden = true; $('adminView').hidden = true;
    $('userTools').hidden = true; $('mobileNav').hidden = true;
    showAuthTab('login'); window.scrollTo(0,0);
  }
  function showTab(tab){
    ['titip','cari','loker'].forEach(t=>{
      $('tab-'+t).hidden = t!==tab;
    });
    document.querySelectorAll('[data-tab]').forEach(b => {
      const active = b.dataset.tab === tab;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });
    if(tab==='cari') renderItems();
    if(tab==='loker') renderLockers();
    window.scrollTo({top:0,behavior:'instant'});
  }
  function toast(message){
    const t=document.createElement('div'); t.className='toast'; t.setAttribute('role','status'); t.textContent=message;
    $('toastZone').appendChild(t); setTimeout(()=>t.remove(),4200);
  }
  function showModal(body, heading='Informasi'){
    clearInterval(videoTimer); videoTimer=null;
    $('modalLayer').hidden = false;
    $('modalContent').innerHTML = `<button class="modal-close" type="button" aria-label="Tutup" id="modalClose">${icons('x')}</button><h2 id="modalHeading">${safe(heading)}</h2>${body}`;
    $('modalClose').addEventListener('click', closeModal);
    $('modalClose').focus();
  }
  function closeModal(){
    if(progressTimer){clearInterval(progressTimer);progressTimer=null;}
    if(videoTimer){clearInterval(videoTimer);videoTimer=null;}
    $('modalLayer').hidden = true; $('modalContent').innerHTML=''; currentModal='';
  }
  function actionRow(buttons){
    return `<div class="modal-actions">${buttons.map(b=>`<button type="button" class="button ${b.type==='primary'?'button-main':'button-outline'}" data-action="${safe(b.action)}">${safe(b.label)}</button>`).join('')}</div>`;
  }
  const photoCheck = file => file && file.type.startsWith('image/') && file.size<=5*1024*1024;
  function imageData(file){
    return new Promise((resolve,reject)=>{
      const fr=new FileReader(); fr.onerror=()=>reject(Error('Gagal membaca foto.'));
      fr.onload=()=>{
        const img=new Image();img.onerror=()=>reject(Error('Format foto tidak dapat dibuka.'));
        img.onload=()=>{
          const ratio=Math.min(1,960/Math.max(img.naturalWidth,img.naturalHeight));
          const canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*ratio);canvas.height=Math.round(img.naturalHeight*ratio);
          canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
          resolve(canvas.toDataURL('image/jpeg',0.76));
        };img.src=fr.result;
      };fr.readAsDataURL(file);
    });
  }
  function animatePercent(container, bar, pct, milliseconds, done){
    container.hidden=false;bar.style.width='0%';pct.textContent='0%';
    let start=performance.now();
    clearInterval(progressTimer);
    progressTimer=setInterval(()=>{
      const x=Math.min(1,(performance.now()-start)/milliseconds); const n=Math.min(100,Math.round(x*100));
      bar.style.width=n+'%';pct.textContent=n+'%';
      if(x>=1){clearInterval(progressTimer);progressTimer=null;done?.();}
    },70);
  }
  async function foundUpload(file){
    if(!file)return;
    if(!photoCheck(file)){toast('Pilih foto JPG, PNG, atau format gambar lain dengan ukuran maksimal 5 MB.');return;}
    try {
      foundPhoto = await imageData(file);
      $('foundPreview').innerHTML=`<img src="${foundPhoto}" alt="Foto barang temuan"/>`;
      animatePercent($('foundProcessing'),$('foundProgressBar'),$('foundProcessPct'),2700,()=>{
        $('foundProcessingText').textContent='Formulir siap diperiksa';
        $('itemName').value='Botol minum';$('itemCategory').value='Botol / Tumbler';
        $('itemColor').value='Hijau';$('itemGeneral').value='Botol plastik transparan warna hijau, tutup hijau, badan dengan lekukan vertikal.';
        toast('Data barang terisi. Periksa dan lengkapi lokasinya.');
      });
      $('foundProcessingText').textContent='Memproses foto...';
    } catch {toast('Foto tidak dapat diproses. Coba foto lain.');}
  }
  const availableLocker = () => locations.find(l=>!items.some(i=>i.locker===l && (i.status==='held'||i.status==='stored'||i.status==='claimed')));
  function newPin(){ return String(Math.floor(100000 + Math.random()*900000)); }
  function submitDeposit(e){
    e.preventDefault();
    const name=$('itemName').value.trim(), location=$('itemLocation').value.trim(), category=$('itemCategory').value,
      color=$('itemColor').value.trim(), general=$('itemGeneral').value.trim(), secret=$('itemSecret').value.trim();
    if(!foundPhoto){toast('Tambahkan foto barang terlebih dahulu.');return;}
    if(!name||!location||!category){toast('Lengkapi nama, kategori, dan lokasi barang.');return;}
    const locker=availableLocker();if(!locker){toast('Seluruh loker sedang digunakan.');showTab('loker');return;}
    const item={id:Date.now().toString(36),name,category,color,location,general,secret,photo:foundPhoto,
      locker,depositPin:newPin(),claimPin:'482916',finder:user?.nim||'',date:new Date().toLocaleDateString('id-ID'),status:'held'};
    items.unshift(item);persistItems();renderLockers();
    showModal(`<p>Loker telah dipesan untuk barang temuanmu.</p><div class="pin-display"><small>LOKER ${safe(locker)} · PIN PENITIPAN</small><strong>${item.depositPin}</strong></div><p>Masukkan PIN pada loker, lalu taruh barang dan tutup pintunya.</p>${actionRow([{label:'Batalkan',action:'cancel-deposit'},{label:'Pintu terbuka',action:'open-deposit',type:'primary'}])}`,'Kode penitipan');
    currentModal=item.id;
  }
  function finishDeposit(item){
    item.status='stored';persistItems();renderLockers();renderItems();
    $('depositForm').reset();foundPhoto='';$('foundPreview').innerHTML=`${icons('camera')}<span>Belum ada foto</span>`;
    $('foundProcessing').hidden=true;
    showModal(`<p>Barang telah tersimpan di loker <strong>${safe(item.locker)}</strong> dan sekarang muncul dalam katalog pencarian.</p>${actionRow([{label:'Lihat barang',action:'go-cari',type:'primary'},{label:'Tutup',action:'close'}])}`,'Penitipan selesai');
  }
  function renderItems(){
    const query=$('searchInput').value.trim().toLocaleLowerCase('id');
    const visible=items.filter(i=>i.status==='stored'&&[i.name,i.category,i.color,i.location,i.general].some(v=>String(v||'').toLocaleLowerCase('id').includes(query)));
    $('resultCount').textContent=`${visible.length} barang ditemukan`;
    if(!visible.length){$('itemsList').innerHTML=`<div class="empty-state">${query?'Tidak ada barang yang sesuai. Coba kata kunci lain.':'Belum ada barang temuan yang tersedia. Titip barang untuk memulai.'}</div>`;return;}
    $('itemsList').innerHTML=visible.map(i=>`<article class="item-card"><div class="item-image"><img src="${i.photo}" alt="${safe(i.name)}"></div><div class="item-info"><span class="chip">${safe(i.category)}</span><h3>${safe(i.name)}</h3><div class="item-subtitle">${safe(i.color)} · ${safe(i.location)}</div><p class="item-desc">${safe(i.general)}</p><button class="button button-main" type="button" data-claim="${i.id}">Ini barang saya ${icons('arrow-right')}</button></div></article>`).join('');
    $('itemsList').querySelectorAll('[data-claim]').forEach(button=>button.addEventListener('click',()=>openClaim(button.dataset.claim)));
  }
  function renderLockers(){
    $('lockersGrid').innerHTML=locations.map(l=>{
      const item=items.find(i=>i.locker===l && ['held','stored','claimed'].includes(i.status));
      const state=item?(item.status==='held'?'held':'filled'):'available';
      const label=state==='available'?'KOSONG':state==='held'?'DIPESAN':'TERISI';
      return `<div class="locker-cell ${state}" aria-label="Loker ${l}: ${label}">${l}<small>${label}</small></div>`;
    }).join('');
  }
  function renderAdminDashboard(){
    const lockers=locations.map(locker=>{
      const item=items.find(i=>i.locker===locker&&['held','stored','claimed'].includes(i.status));
      const status=item?.status||'available';
      const labels={available:'KOSONG',held:'DIPESAN',stored:'TERSIMPAN',claimed:'SIAP DIAMBIL'};
      return {locker,item,status,label:labels[status]};
    });
    const counts={available:0,held:0,stored:0,claimed:0};
    lockers.forEach(({status})=>counts[status]++);
    $('adminSummary').innerHTML=[
      ['Kosong',counts.available,'available'],['Dipesan',counts.held,'held'],['Tersimpan',counts.stored,'stored'],['Siap diambil',counts.claimed,'claimed']
    ].map(([label,total,tone])=>`<article class="admin-summary-card ${tone}"><span>${label}</span><strong>${total}</strong><small>dari ${locations.length} loker</small></article>`).join('');
    $('adminLockerList').innerHTML=lockers.map(({locker,item,status,label})=>`<article class="admin-locker-row ${status}">
      <div class="admin-locker-code"><strong>${locker}</strong><span class="admin-status ${status}">${label}</span></div>
      ${item?`<div class="admin-locker-detail"><strong>${safe(item.name)}</strong><span>${safe(item.category)} · ${safe(item.color||'Warna tidak dicatat')}</span><span>${safe(item.location)}</span><span>Penitip: ${safe(item.finder||'Tidak tercatat')} · ${safe(item.date||'Tanpa tanggal')}</span><span>Ciri khusus: ${safe(item.secret||'Tidak dicatat')}</span><span>PIN titip ${safe(item.depositPin||'—')} · PIN ambil ${safe(item.claimPin||'—')}</span></div>`:`<p class="admin-empty">Tidak ada barang aktif di loker ini.</p>`}
    </article>`).join('');
    $('adminUpdated').textContent=`Diperbarui dari sesi ini · ${new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}`;
  }
  let claimPhoto='';
  function openClaim(id){
    const item=items.find(i=>i.id===id&&i.status==='stored');if(!item)return toast('Barang sudah tidak tersedia.');
    currentModal=id;claimPhoto='';
    showModal(`<p>Pilih salah satu cara pengajuan klaim. Foto bersifat opsional.</p>
      <div class="claim-path"><div class="claim-heading">${icons('camera')} Verifikasi dengan foto</div><p>Ambil foto barang milikmu atau pilih dari galeri. Ciri khusus tidak diperlukan jika menggunakan foto.</p>
        <div class="two-actions"><button class="button button-outline" type="button" id="claimCameraBtn">${icons('camera')} Ambil foto</button><button class="button button-outline" type="button" id="claimGalleryBtn">${icons('image')} Pilih galeri</button></div>
        <input type="file" id="claimCamera" accept="image/*" capture="environment" hidden><input type="file" id="claimGallery" accept="image/*" hidden>
        <div class="claim-photo-preview" id="claimPhotoPreview" hidden></div><button class="button button-main full" type="button" id="scanClaimBtn" hidden>${icons('search')} Bandingkan dua foto</button></div>
      <div class="claim-separator">atau</div>
      <div class="claim-path"><div class="claim-heading">${icons('shield')} Klaim tanpa foto</div><p>Masukkan ciri khusus barang. Pengajuan akan ditinjau pengelola.</p>
      <textarea class="claim-secret" id="claimSecret" rows="2" placeholder="Ciri khusus yang tidak terlihat pada foto publik"></textarea>
      <button class="button button-outline full" type="button" id="claimTextSubmit">Ajukan klaim tanpa foto</button></div>`, 'Ajukan klaim');
    currentModal=id;
    ['Camera','Gallery'].forEach(type=>{
      $(`claim${type}Btn`).addEventListener('click',()=> $(`claim${type}`).click());
      $(`claim${type}`).addEventListener('change',async e=>{
        const file=e.target.files?.[0];if(!file)return;
        if(!photoCheck(file)){toast('Foto maksimal 5 MB dan harus berupa gambar.');return;}
        try {claimPhoto=await imageData(file);$('claimPhotoPreview').hidden=false;$('claimPhotoPreview').innerHTML=`<img src="${claimPhoto}" alt="Foto bukti pemilik"/><p>Foto berhasil ditambahkan.</p>`;$('scanClaimBtn').hidden=false;}
        catch {toast('Foto gagal dibaca. Coba unggah kembali.');}
      });
    });
    $('scanClaimBtn').addEventListener('click',()=>scanClaim(id));
    $('claimTextSubmit').addEventListener('click',()=>{
      if(!$('claimSecret').value.trim()){toast('Masukkan ciri khusus atau unggah foto untuk melanjutkan.');return;}
      showModal(`<p>Pengajuan klaim telah dicatat dan akan diperiksa oleh pengelola.</p>${actionRow([{label:'Selesai',action:'close',type:'primary'}])}`,'Klaim terkirim');
    });
  }
  function scanClaim(id){
    const item=items.find(i=>i.id===id&&i.status==='stored');if(!item || !claimPhoto){toast('Pilih foto terlebih dahulu.');return;}
    showModal(`<p>Sistem sedang membandingkan dua foto barang.</p>
       <div class="modal-two-photos"><div><div class="comparison-frame"><img src="${item.photo}" alt="Foto barang temuan"><div class="scanline"></div></div><div class="photo-caption">Foto barang temuan</div></div><div><div class="comparison-frame"><img src="${claimPhoto}" alt="Foto milik pengklaim"><div class="scanline"></div></div><div class="photo-caption">Foto pemilik</div></div></div>
       <div class="processing" id="claimProcessing"><div class="processing-label">${icons('search')}<span id="claimScanLabel">Membaca detail foto...</span><span id="claimPercent">0%</span></div><div class="progress-track"><div class="progress-bar" id="claimProgressBar"></div></div></div>`,'Pemeriksaan foto');
    currentModal=id;
    const labels=['Membaca detail foto...','Memeriksa warna dan bentuk...','Mencocokkan ciri visual...','Menyelesaikan pemeriksaan...'];
    const start=performance.now();
    animatePercent($('claimProcessing'),$('claimProgressBar'),$('claimPercent'),6400,()=>{
      if(!items.includes(item))return;
      item.status='claimed';persistItems();renderLockers();
      showModal(`<div class="result-check">${icons('check')} <span>Foto sesuai</span></div><p>Foto barang telah dinyatakan cocok. Kode akses dapat digunakan untuk mengambil barang di loker ${safe(item.locker)}.</p>
      <div class="pin-display"><small>LOKER ${safe(item.locker)} · PIN PENGAMBILAN</small><strong>${safe(item.claimPin)}</strong></div>
      ${actionRow([{label:'Selesaikan pengambilan',action:'pickup',type:'primary'}])}`,'Verifikasi selesai');currentModal=id;
    });
    const ticker=setInterval(()=>{
      if(!$('claimScanLabel') || $('modalLayer').hidden){clearInterval(ticker);return;}
      const step=Math.min(3,Math.floor((performance.now()-start)/1600));$('claimScanLabel').textContent=labels[step];
      if(step>=3)clearInterval(ticker);
    },240);
  }
  function finishPickup(id){
    const item=items.find(i=>i.id===id);if(!item)return closeModal();
    item.status='picked';persistItems();renderLockers();renderItems();
    showModal(`<p>Barang telah diambil dan loker <strong>${safe(item.locker)}</strong> kembali kosong.</p>${actionRow([{label:'Lihat status loker',action:'go-loker',type:'primary'}])}`,'Pengambilan selesai');
  }
  let videoIndex=0;
  function renderVideoSlide(){
    if(!$('videoHeading'))return;
    $('videoHeading').textContent=stages[videoIndex][0];
    $('videoDescription').textContent=stages[videoIndex][1];
    $('videoCount').textContent=`${videoIndex+1} / ${stages.length}`;
    $('videoProgress').style.width=((videoIndex+1)/stages.length*100)+'%';
  }
  function showVideo(){
    videoIndex=0;
    showModal(`<p>Alur penitipan dan pengambilan barang melalui Balikin.</p>
      <div class="video-stage">${icons('play')}<h3 id="videoHeading"></h3><p id="videoDescription"></p></div>
      <div class="video-controls"><button type="button" class="video-control-button" id="videoPrev" aria-label="Adegan sebelumnya">${icons('arrow-left')}</button><div class="video-timeline"><div id="videoProgress"></div></div><span class="video-count" id="videoCount"></span><button type="button" class="video-control-button" id="videoNext" aria-label="Adegan berikutnya">${icons('arrow-right')}</button></div>
      ${actionRow([{label:'Putar otomatis',action:'autoplay',type:'primary'}])}`, 'Video alur Balikin');
    $('videoPrev').addEventListener('click',()=>{videoIndex=Math.max(0,videoIndex-1);renderVideoSlide();});
    $('videoNext').addEventListener('click',()=>{videoIndex=Math.min(stages.length-1,videoIndex+1);renderVideoSlide();});
    $('modalContent').querySelector('[data-action="autoplay"]').addEventListener('click',(e)=>{
      if(videoTimer){clearInterval(videoTimer);videoTimer=null;e.target.textContent='Putar otomatis';return;}
      e.target.textContent='Jeda';
      videoTimer=setInterval(()=>{
        if(videoIndex>=stages.length-1){clearInterval(videoTimer);videoTimer=null;e.target.textContent='Putar ulang';return;}
        videoIndex++;renderVideoSlide();
      },1800);
    });
    renderVideoSlide();
  }
  function modalClick(event){
    if(event.target?.dataset.close==='true'){closeModal();return;}
    const a=event.target.closest('[data-action]');if(!a)return;
    const item=items.find(i=>i.id===currentModal);
    switch(a.dataset.action){
      case 'cancel-deposit':if(item){items=items.filter(i=>i.id!==item.id);persistItems();renderLockers();}closeModal();break;
      case 'open-deposit':if(item){showModal(`<p>Loker ${safe(item.locker)} terbuka. Letakkan barang dan tutup pintunya.</p>${actionRow([{label:'Konfirmasi barang tersimpan',action:'finish-deposit',type:'primary'}])}`,'Loker terbuka');currentModal=item.id;}break;
      case 'finish-deposit':if(item)finishDeposit(item);break;
      case 'go-cari':closeModal();showTab('cari');break;
      case 'go-loker':closeModal();showTab('loker');break;
      case 'pickup':if(item)finishPickup(item.id);break;
      case 'close':closeModal();break;
    }
  }
  function install(){
    items=loadItems();renderLockers();renderItems();
    $('loginTab').addEventListener('click',()=>showAuthTab('login'));
    $('registerTab').addEventListener('click',()=>showAuthTab('register'));
    $('loginForm').addEventListener('submit',e=>{
      e.preventDefault();
      const username=$('loginNim').value.trim(),password=$('loginPassword').value;
      if(username===ADMIN_USERNAME){
        if(password===ADMIN_PASSWORD)setUser({name:'Administrator',role:'admin'});
        else toast('Kredensial admin tidak sesuai.');
        return;
      }
      setUser({nim:username,name:''});
    });
    $('registerForm').addEventListener('submit',e=>{e.preventDefault();setUser({nim:$('registerNim').value.trim(),name:$('registerName').value.trim()});});
    document.querySelectorAll('.eye-button').forEach(button=>button.addEventListener('click',()=>{
      const input=$(button.dataset.target);input.type=input.type==='password'?'text':'password';
      button.setAttribute('aria-label',input.type==='password'?'Tampilkan password':'Sembunyikan password');
      button.querySelector('use').setAttribute('href',input.type==='password'?'#i-eye':'#i-eye-off');
    }));
    $('logoutBtn').addEventListener('click',logout);
    $('brandLink').addEventListener('click',e=>{e.preventDefault();if(user)showTab('titip');else window.scrollTo(0,0);});
    $('videoBtn').addEventListener('click',showVideo);
    document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>showTab(button.dataset.tab)));
    $('modalLayer').addEventListener('click',modalClick);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('modalLayer').hidden)closeModal();});
    $('foundCameraBtn').addEventListener('click',()=>$('foundCamera').click());
    $('foundGalleryBtn').addEventListener('click',()=>$('foundGallery').click());
    $('foundCamera').addEventListener('change',e=>foundUpload(e.target.files?.[0]));
    $('foundGallery').addEventListener('change',e=>foundUpload(e.target.files?.[0]));
    $('depositForm').addEventListener('submit',submitDeposit);
    $('searchInput').addEventListener('input',renderItems);
    const saved=restoreUser();if(saved){setUser(saved);}else{showAuthTab('login');}
  }
  install();
})();
