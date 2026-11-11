# Instalasi dari nol

1. Buat project Google Apps Script V8 dan salin file `.gs`/HTML beserta `appsscript.json` (atau unggah dengan clasp).
2. Buat project Google Cloud yang terkait, aktifkan Apps Script API dan Identity Toolkit API.
3. Buat Firebase project; aktifkan Authentication > Google, tetapkan authorized domains untuk domain deployment Apps Script, dan daftarkan konfigurasi web app.
4. Tambahkan Script Properties `FIREBASE_WEB_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `DATABASE_SPREADSHEET_ID`. API key Firebase web adalah identifier publik, bukan secret; batasi API key pada API/domain yang diperlukan. Token tidak disimpan ke Sheets.
5. Buat spreadsheet database kosong. Jalankan `initializeDatabase` dari editor Apps Script (fungsi ini perlu tersedia sebagai wrapper; sementara jalankan `DB.init()` dari fungsi setup khusus). Berikan akses spreadsheet hanya kepada akun pemilik deployment.
6. Buat pengguna pertama di USERS dengan userId unik, email lowercase, `role=SUPER_ADMIN`, `status=ACTIVE`, dan profil pegawai pada EMPLOYEES bila admin juga perlu absen. Email harus sama dengan akun Google Firebase.
7. Pastikan spreadsheet dan Script Properties tidak dibagikan ke pegawai. Uji akun aktif dan akun tak terdaftar sebelum deployment.

Firebase API key tidak memberi akses admin sendiri. Server memvalidasi ID token dengan endpoint Google Identity Toolkit sebelum membaca data pengguna.
