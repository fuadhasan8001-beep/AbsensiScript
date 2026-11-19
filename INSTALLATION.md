# Instalasi dari nol

1. Buat project Google Apps Script V8 dan salin file `.gs`/HTML beserta `appsscript.json` (atau unggah dengan clasp).
2. Buat project Google Cloud yang terkait, aktifkan Apps Script API dan Identity Toolkit API.
3. Buat Firebase project; aktifkan Authentication > Google, tetapkan authorized domains untuk domain deployment Apps Script, dan daftarkan konfigurasi web app.
4. Tambahkan Script Properties `FIREBASE_WEB_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`. Database sudah diarahkan ke spreadsheet yang ditentukan di `Config.gs`; bila ingin mengganti target, set Script Property `DATABASE_SPREADSHEET_ID` untuk menimpa default tersebut. API key Firebase web adalah identifier publik, bukan secret; batasi API key pada API/domain yang diperlukan. Token tidak disimpan ke Sheets.
5. Buat spreadsheet database kosong. Jalankan `initializeDatabase` dari editor Apps Script (fungsi ini perlu tersedia sebagai wrapper; sementara jalankan `DB.init()` dari fungsi setup khusus). Berikan akses spreadsheet hanya kepada akun pemilik deployment.
6. Untuk membuat Super Admin pertama, isi Script Property sementara `FIRST_SUPER_ADMIN_EMAIL` dengan email Google admin, simpan, lalu jalankan fungsi `createFirstSuperAdmin()` dari editor Apps Script. Fungsi menolak berjalan bila Super Admin sudah ada dan menghapus property bootstrap setelah berhasil. Email harus sama dengan akun Google Firebase.
7. Pastikan spreadsheet dan Script Properties tidak dibagikan ke pegawai. Uji akun aktif dan akun tak terdaftar sebelum deployment.

Firebase API key tidak memberi akses admin sendiri. Server memvalidasi ID token dengan endpoint Google Identity Toolkit sebelum membaca data pengguna.
