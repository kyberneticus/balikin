# Sumber Balikin

Edit hanya tiga file berikut untuk aplikasi:

- `index.html`
- `style.css`
- `script.js`

Jangan mengubah `index.html` di root atau `public/index.html` secara manual. Jalankan `npm run build` agar keduanya dibuat ulang. Tag berikut di `src/index.html` harus tetap persis seperti ini karena build menginline keduanya:

```html
<link rel="stylesheet" href="style.css" />
<script src="script.js" defer></script>
```

Gunakan `assets/botol-hijau.jpg` untuk foto demo. Build menggantinya dengan jalur yang sesuai pada berkas mandiri.

## Demo

Tambahkan `?demo=1` pada URL untuk masuk sebagai NIM `20240001`, membuka Temukan, dan menampilkan Reset demo. Alurnya: pakai foto demo, titipkan botol, cari dengan detail warna yang jelas, lalu klaim botol dengan foto opsional dan jawaban demo sebelum mengambil barang.

Semua bantuan pengisian, pencocokan, PIN, dan loker disimulasikan di `script.js`. Objek `api` adalah seam untuk mengganti simulasi dengan backend di masa depan. Data katalog dan foto disimpan melalui `localStorage`; key demo terpisah dihapus oleh Reset demo.

Chat Bantuan disimpan di `sessionStorage` sebagai `balikin-support-v1`; chat hanya dapat dipakai dalam satu tab browser selama sesi aktif. Chat lintas perangkat memerlukan backend.
