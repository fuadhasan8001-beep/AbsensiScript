# Deployment

Di editor Apps Script pilih Deploy > New deployment > Web app. Pilih **Execute as: Me** agar spreadsheet tidak perlu dibuka kepada pegawai. Akses dapat diset **Anyone** bila akun Gmail pribadi harus dapat masuk; aplikasi tetap menolak akun yang tidak mempunyai token Firebase valid dan record USERS aktif. Bila kebijakan Workspace melarang akses publik, pengaturan ini tidak cocok.

Gunakan URL HTTPS deployment. Uji login pada perangkat lain, geolocation pada HTTPS, lalu check-in/out di kantor. Setiap perubahan source memerlukan versi deployment baru/update deployment. Deployment tidak dapat dilakukan dari workspace ini karena membutuhkan akses pemilik Google/Firebase.

Backup: buat salinan berkala semua sheet dan konfigurasi, simpan di Drive terbatas. Pemulihan: salin backup ke spreadsheet baru, verifikasi header/relasi, ubah `DATABASE_SPREADSHEET_ID`, lalu uji baca/tulis.
