# Pemecahan masalah

- Firebase belum dikonfigurasi: lengkapi Script Properties dan domain Firebase.
- Email tidak terdaftar: admin harus menambahkan USERS aktif dengan email Google terverifikasi.
- Spreadsheet belum diinisialisasi: set DATABASE_SPREADSHEET_ID dan jalankan fungsi inisialisasi.
- Lokasi tidak diizinkan/tidak tersedia: gunakan HTTPS, izinkan lokasi untuk situs, aktifkan GPS dan coba di area terbuka.
- Di luar radius/akurasi rendah: periksa titik kantor dan radius; tunggu akurasi membaik. Jangan mengubah koordinat untuk melewati validasi.
- Apps Script kuota/lock timeout: kurangi frekuensi permintaan dan tinjau skala database.
