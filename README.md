# Doorprize (Multi Pemenang)

Aplikasi web sederhana untuk undian doorprize: bisa memilih beberapa pemenang sekaligus, menampilkan animasi “Sedang Diacak”, dan menyediakan daftar pemenang yang bisa langsung dicopy untuk backup.

## Cara Menjalankan

Ada 2 cara:

### 1) Langsung buka file

- Buka file [index.html](./index.html) di browser.

### 2) Pakai server lokal (disarankan)

Jalankan perintah ini di folder proyek `d:\Latihan\doorprize`:

```bash
py -m http.server 8000
```

Lalu buka:

- http://127.0.0.1:8000/

Kalau `py` tidak tersedia, coba:

```bash
python -m http.server 8000
```

## Cara Pakai

1. Isi daftar peserta di kolom **Daftar Peserta** (satu nama per baris).
2. Isi **Jumlah Pemenang** (misalnya `1`, `3`, `10`).
3. Klik **Mulai Undi** (bisa dari tombol di hero atau dari bagian Pengaturan Undian).
4. Panel **Sedang Diacak** akan menampilkan sejumlah baris sesuai input jumlah pemenang.
5. Setelah animasi selesai, pemenang final muncul di:
   - **Pemenang Ronde Terakhir**
   - **Daftar Pemenang** (format 1 nama per baris, siap dicopy)
   - **Riwayat Undian**
6. Klik **Reset Hasil** untuk mengulang dari awal.

## Aturan Undian

- Nama peserta yang duplikat akan dianggap satu (unik).
- Pemenang tidak akan terpilih lagi pada ronde berikutnya (hingga di-reset).
- Setelah pemenang terpilih, namanya otomatis dihapus dari **Daftar Peserta** (yang tersisa hanya peserta yang belum menang).
- Jika jumlah pemenang lebih besar dari sisa peserta, aplikasi akan menampilkan pesan error.

## Backup Pemenang

- Klik tombol **Copy** di bagian **Daftar Pemenang** untuk menyalin semua pemenang (1 nama per baris), lalu paste ke WA/Excel/dokumen.
- Data tersimpan otomatis di browser (localStorage), jadi refresh halaman tidak menghilangkan hasil.

## Struktur File

- [index.html](./index.html): struktur UI
- [styles.css](./styles.css): styling / responsif
- [script.js](./script.js): logika undian + animasi acak

## Catatan

- Data disimpan di browser (localStorage), bukan database server. Jika pakai browser lain/clear data browser, data akan hilang.
- Jika ingin fitur tambahan seperti impor CSV/Excel, suara undian, confetti, atau mode fullscreen, bisa ditambahkan.
