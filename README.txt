BALIKIN — SOURCE CODE

Versi: situs baru (Vercel) dengan Login/Register tanpa validasi, tiga tab Titip/Cari/Loker, dan tombol Video di navbar.

Folder:
- index.html : versi single-file sesuai source yang diterbitkan ke Vercel. Jalankan langsung dari browser.
- src/ : versi modular HTML, CSS, dan JavaScript yang lebih mudah diedit, beserta aset foto botol dan README proyek.

Cara pakai:
1. Untuk versi yang identik dengan deploy, buka index.html.
2. Untuk mengedit versi modular, buka src/index.html (atau jalankan server statis dari folder src).
3. Untuk hosting versi single-file di Vercel, unggah index.html sebagai situs statis.

PENTING:
- Login/Register dan pemrosesan foto hanya simulasi; tidak ada autentikasi backend atau AI asli.
- Data disimpan di sesi browser, bukan database.
- Versi modular menggunakan foto aset lokal; versi single-file memakai gambar botol SVG inline sebagai placeholder saat daftar barang kosong.
- PIN dan loker bukan sistem keamanan fisik.

User Login
Menggunakan kredensial NIM dll
1. Alur Penemu Barang
 Menemukan barang -> Membuka website -> Memilih menu “Saya Menemukan Barang” -> Mengunggah foto -> Validasi foto -> Deteksi kartu identitas/ATM (jika terdeteksi: lanjut ke alur Kartu Identitas, lihat poin 5) -> AI menganalisis foto -> AI menyarankan pengisian formulir (kategori, warna, ciri umum) -> Pengguna memeriksa dan mengoreksi hasil AI -> Mengisi lokasi ditemukan -> Mengisi 1-2 detail rahasia (tidak ditampilkan di katalog) -> Konfirmasi data -> Memeriksa ketersediaan loker sesuai ukuran barang -> Mengarahkan ke loker terdekat dari lokasi ditemukan yang ukurannya cocok -> Sistem menentukan loker dan membuat PIN penitipan (berlaku terbatas, misal 15 menit) -> Pengguna memasukkan PIN -> Loker terbuka -> Memasukkan barang -> Menutup loker -> Sensor pintu mengonfirmasi loker tertutup -> Konfirmasi penitipan -> Status loker TERISI -> Barang ditampilkan dalam katalog publik (foto + kategori + lokasi, tanpa detail rahasia) -> Kirim notifikasi ke pengguna yang mengaktifkan alert kategori sama -> Selesai.
2. Alur Pemilik Barang
 Kehilangan barang -> Membuka website -> Memilih menu “Saya Kehilangan Barang” -> Mencari barang (filter kategori, lokasi, tanggal) -> Memeriksa hasil pencarian -> Memilih “Ini Barang Saya” -> Menjawab pertanyaan ciri khusus tanpa petunjuk (isian bebas, bukan pilihan) -> Validasi pengajuan -> AI menghitung skor kecocokan dengan detail rahasia -> Cek tingkat nilai barang:
Barang biasa (botol, payung, alat tulis): skor tinggi -> terverifikasi otomatis -> PIN pengambilan diterbitkan
Barang berharga (HP, laptop, dompet, kartu): skor tinggi -> antre verifikasi manusia (admin mencocokkan dengan KTM / bukti kepemilikan) -> disetujui -> PIN pengambilan diterbitkan
Skor rendah: klaim ditolak (lihat poin 5)
-> Klaim tercatat -> PIN pengambilan dikirim ke pemilik (berlaku terbatas, misal 3 hari) -> Selesai.
Jika barang tidak ketemu:
 Tidak ketemu -> Pilih “Laporkan Kehilangan” -> Isi kategori, ciri, lokasi, dan waktu hilang -> Aktifkan notifikasi otomatis -> Barang baru masuk dengan kategori/ciri cocok -> Notifikasi ke pemilik -> Lanjut ke alur klaim (di atas).
3. Alur Pengambilan Barang
 Menerima PIN pengambilan (hanya setelah klaim terverifikasi) -> Menuju loker -> Memasukkan PIN -> Validasi PIN -> Loker terbuka -> Mengambil barang -> Menutup loker -> Sensor mengonfirmasi loker kosong dan tertutup -> Konfirmasi pengambilan -> Status barang SUDAH DIAMBIL -> PIN dinonaktifkan -> Status loker KOSONG -> Hapus barang dari katalog -> Selesai.
4. Admin (Himatif)
 Admin melihat dashboard -> Mengecek barang yang sudah > 30 hari -> Pengumuman terbuka di website/IG (barang belum diambil) -> Jika masih tidak ada klaim:
Barang sepele (pensil, botol murah, dll): donasikan -> catat di log
Barang berharga: serahkan ke satpam / bagian kemahasiswaan dengan berita acara serah terima (bukan disimpan sendiri oleh admin)
-> Semua tindakan admin tercatat di audit log (siapa, kapan, barang apa, tidak bisa diubah) -> Status loker KOSONG -> Selesai.
5. Kondisi Khusus
Foto tidak valid -> Tampilkan kesalahan -> Unggah ulang foto.
AI gagal -> Isi formulir manual -> Lanjutkan proses.
Data tidak lengkap -> Tampilkan kesalahan -> Perbaiki formulir.
Foto kartu identitas/ATM terdeteksi -> Foto di-blur atau disembunyikan dari katalog -> Barang masuk dengan label “Kartu Identitas” tanpa nama/NIM -> Pemilik dinotifikasi lewat NIM (jika terbaca) atau cek manual oleh admin.
Loker penuh -> Aplikasi menampilkan titik lain yang tersedia beserta estimasi jarak -> Pengguna memilih titik, atau langsung titip ke pos -> Jika semua titik penuh: aplikasi langsung mengarahkan titip ke pos satpam/sekretariat -> Petugas menginput barang ke sistem (status “Dititip di Pos”) -> Selesai.
Barang tidak ditemukan -> Ubah kata kunci -> Cari ulang -> Jika masih nihil: Laporkan Kehilangan + aktifkan notifikasi.
Klaim ditolak -> Tampilkan pemberitahuan -> Boleh coba ulang (maks 3x) -> Setelah itu eskalasi ke verifikasi manusia -> Barang tetap tersedia untuk klaim yang sah.
PIN salah -> Tampilkan kesalahan -> Coba kembali (maks 3x) -> Terkunci sementara -> Hubungi admin.
PIN penitipan kedaluwarsa (tidak dipakai) -> Reservasi loker dilepas -> Pengguna bisa mengulang.
PIN pengambilan kedaluwarsa (pemilik tidak datang dalam batas waktu) -> Klaim dibatalkan -> Barang kembali tersedia untuk klaim lain.
Penemu mengklaim barangnya sendiri -> Sistem menolak otomatis.
Penyalahgunaan (titip sampah, spam loker, klaim palsu berulang) -> Batas penitipan aktif per NIM -> Sanksi akun oleh admin.
Listrik mati -> Loker tetap terkunci (fail-secure) -> Heartbeat (mikrocontroller inside locker) berhenti -> Titik ditandai OFFLINE di aplikasi -> Notifikasi ke admin -> Pemilik dengan PIN valid: dibukakan dengan kunci cadangan, dicatat di log -> Listrik pulih -> Sinkronisasi status ke server -> Titik kembali ONLINE.
Wifi mati, listrik hidup -> Loker validasi PIN secara lokal -> Aktivitas dicatat lokal -> Sinkronisasi ke server saat koneksi kembali -> Titik ditandai “status tertunda” selama offline.
Pintu tidak terdeteksi tertutup -> Alarm / notifikasi ke pengguna -> Loker ditandai bermasalah.
Loker bermasalah -> Laporkan masalah -> Loker ditandai NONAKTIF -> Admin melakukan penanganan -> Barang di dalamnya dipindahkan manual.
Catatan:
- Loker seperti loker gym tetapi dengan berbagai ukuran.
- Ada 3 titik loker: FISIP, FTI, dan Masjid.
- Jika suatu titik penuh, arahkan ke titik loker lain.
