# Balikin — situs prototipe Lost & Found kampus

Website statis HTML, CSS, JavaScript tanpa backend (siap dipasang di Vercel sebagai **Other / Static Site**).

## Jalankan
- Buka `index.html` di browser, atau jalankan `python -m http.server 8000` dari folder proyek.
- Di Vercel, buat proyek yang menunjuk ke folder ini. Framework preset: **Other**, build command: kosong, output directory: `.`.
- Aset dan kode tidak menggunakan dependency eksternal.

## Alur presentasi
1. Masuk atau daftar menggunakan NIM bebas; password apa pun diterima. Ini bukan autentikasi sebenarnya.
2. Pilih Titip, unggah foto botol dari kamera/galeri; formulir contoh terisi setelah indikator 2,7 detik.
3. Isi lokasi, pilih Lanjut, kemudian konfirmasi penitipan melalui dialog PIN.
4. Pindah ke Cari. Klik Ini barang saya, unggah foto barang milikmu. Setelah scan sekitar 6,4 detik, kode pengambilan ditampilkan.
5. Konfirmasi pengambilan, lalu loker kosong. Tombol Video ada di navbar dan membuka storyboard 13 tahap.
6. Menu navigasi bawah tersedia di ponsel.

## Batasan penting
- Akun, NIM, PIN, data barang, dan foto hanya tersimpan sementara di sesi browser. Dashboard demo dapat dibuka dengan username `admin` dan password `admin123`, tetapi kredensial ini publik dan bukan keamanan sungguhan.
- Bantuan pengisian dan pencocokan foto adalah simulasi yang menggunakan hasil tetap, **bukan analisis AI sebenarnya**. Untuk keperluan video, unggahan gambar yang valid akan dianggap cocok pada alur klaim foto.
- PIN bukan pengamanan perangkat fisik; loker adalah simulasi. Jangan menggunakan versi ini untuk penitipan barang sungguhan.
- `Video` membuka storyboard teks 13 langkah (bukan rekaman atau animasi 3D asli dari situs terdahulu).
