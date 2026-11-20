# Instalasi dari nol

1. Buat project Google Apps Script V8 dan salin file `.gs`/HTML beserta `appsscript.json` (atau unggah dengan clasp).
2. Buat project Google Cloud yang terkait, aktifkan Apps Script API dan Identity Toolkit API.
3. Buat Firebase project; aktifkan Authentication > Google, tetapkan authorized domains untuk domain deployment Apps Script, dan daftarkan konfigurasi web app.
4. Tambahkan Script Properties `DATABASE_SPREADSHEET_ID`, `FIREBASE_WEB_API_KEY`, `FIREBASE_AUTH_DOMAIN`, dan `FIREBASE_PROJECT_ID`. Tidak ada fallback ID database di source. API key Firebase web adalah identifier publik, bukan secret; batasi API key pada API/domain yang diperlukan. Token tidak disimpan ke Sheets.
5. Buat spreadsheet staging kosong dan set `DATABASE_SPREADSHEET_ID` ke ID staging. Dari editor Apps Script jalankan fungsi privat `initializeDatabase_()` satu kali. Fungsi privat berakhiran `_` tidak tersedia melalui `google.script.run`. Database dan seluruh tab/header yang sudah ada divalidasi sebelum tab yang hilang dibuat. Berikan akses spreadsheet hanya kepada akun pemilik deployment.
6. Untuk membuat Super Admin pertama di staging, isi Script Property sementara `FIRST_SUPER_ADMIN_EMAIL` dengan email Google admin, lalu jalankan `createFirstSuperAdmin_()` dari editor Apps Script. Fungsi menolak bootstrap jika Super Admin sudah ada dan menghapus property setelah berhasil. Email harus sama dengan akun Firebase yang akan dipakai. Jangan menguji bootstrap pada database produksi.
7. Set manifest timezone ke `Asia/Jakarta` (sudah disetel di source). Lakukan deployment sebagai versi staging dan uji akun aktif/nonaktif, wilayah, waktu, dan integrasi sebelum pengguna mengaksesnya.
Firebase API key tidak memberi akses admin sendiri. Server memvalidasi ID token dengan endpoint Google Identity Toolkit sebelum membaca data pengguna.
