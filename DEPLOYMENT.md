# Deployment

Deploy sebagai Web App dengan **Execute as: Me** dan akses **Anyone, even anonymous** agar halaman login Firebase dapat dibuka tanpa sesi Google Drive. Semua operasi API tetap memerlukan ID token Firebase valid; akun baru hanya mendapat akses setelah persetujuan Super Admin. Fungsi pemeliharaan database dan bootstrap Super Admin hanya dapat dijalankan oleh pemilik dari editor Apps Script. Bila kebijakan Workspace melarang akses publik, pengaturan ini tidak cocok.

Gunakan URL HTTPS deployment. Uji login pada perangkat lain, geolocation pada HTTPS, lalu check-in/out di kantor. Setiap perubahan source memerlukan versi deployment baru/update deployment. Deployment tidak dapat dilakukan dari workspace ini karena membutuhkan akses pemilik Google/Firebase.

Backup: buat salinan berkala semua sheet dan konfigurasi, simpan di Drive terbatas. Pemulihan: salin backup ke spreadsheet baru, verifikasi header/relasi, ubah `DATABASE_SPREADSHEET_ID`, lalu uji baca/tulis.
