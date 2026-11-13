BALIKIN — LOST & FOUND KAMPUS

Balikin adalah MVP statis HTML, CSS, dan JavaScript. Edit file di src/, lalu jalankan npm run build untuk membuat index.html dan public/index.html.

Jalankan:
1. npm install
2. npm test
3. npx live-server --host=0.0.0.0 --port=8080

MODE DEMO
Buka http://localhost:8080/?demo=1.
- Sistem masuk sebagai NIM 20240001 dan membuka Temukan.
- Klik Pakai foto demo untuk memulai alur botol hijau.
- Isi ciri khusus, dapatkan PIN penitipan, lalu simulasikan buka loker.
- Cari botol di katalog, lihat warna barang, lalu ambil foto barang bila perlu sebelum memakai Isi jawaban demo.
- Simulasikan buka loker untuk menghapus barang dari katalog.
- Gunakan Bantuan untuk mengirim pesan ke admin.

Admin demo: username admin, password admin123.

BATASAN
Foto, bantuan pengisian, pencocokan klaim, PIN, dan loker adalah simulasi. Tidak ada AI, backend, atau perangkat fisik.
Katalog, foto penitipan, dan bukti foto klaim disimpan di localStorage browser ini. Foto hingga 12 MB dikecilkan menjadi maksimal 2 MB sebelum disimpan. Reset demo menghapus data demo tersebut.
Pesan Bantuan memakai sessionStorage dengan key balikin-support-v1. Pesan hanya hidup dalam tab browser yang sama selama sesi aktif. Chat lintas perangkat memerlukan backend.
