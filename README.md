# Balikin

Balikin adalah MVP statis untuk Lost & Found kampus. Kode sumber ada di `src/`; `npm run build` membuat `index.html` dan `public/index.html` mandiri untuk deploy.

## Jalankan

```sh
npm install
npm test
npx live-server --host=0.0.0.0 --port=8080
```

Buka `http://localhost:8080/?demo=1` untuk alur rekaman yang tetap.

## Mode demo

`?demo=1` masuk otomatis sebagai NIM `20240001`, membuka tab **Temuin**, dan menyediakan tombol **Reset demo**.

1. Ambil foto atau pilih dari galeri. Foto dipindai, lalu isian publik muncul bertahap.
2. Isi ciri privat, lalu pilih **Cari loker**. Catat PIN penitipan yang berlaku 15 menit, lalu pilih **Buka loker**. Botol masuk ke katalog.
3. Buka **Cari**, lihat warna barang dengan jelas, lalu klaim botol. Kamu juga dapat mengambil foto barang untuk dipindai sebelum memilih **Isi jawaban demo**. Skor tetap adalah 94%.
4. Simulasikan pengambilan untuk menghapus barang dari katalog.
5. Buka **Bantuan** untuk mengirim pesan ke admin. Masuk sebagai `admin` / `admin123` untuk membalasnya.

Bantuan pengisian foto, pencocokan klaim, PIN, dan loker semuanya simulasi. Tidak ada AI, backend, perangkat loker, atau panggilan API nyata.

## Penyimpanan lokal

Katalog dan foto penitipan disimpan di `localStorage` pada browser ini. Foto kamera hingga 12 MB dikecilkan menjadi maksimal 2 MB sebelum disimpan. Mode demo memakai key terpisah dan **Reset demo** menghapusnya. Bukti foto klaim juga disimpan bersama data barang selama barang masih ada di katalog.

## Batasan chat

Pesan bantuan disimpan di `sessionStorage` dengan key `balikin-support-v1`. Pesan hanya tersedia di tab browser yang sama selama sesi itu masih aktif. Chat lintas perangkat atau realtime memerlukan backend.

Kredensial admin berada di kode klien untuk demo dan tidak boleh digunakan sebagai akses nyata.
