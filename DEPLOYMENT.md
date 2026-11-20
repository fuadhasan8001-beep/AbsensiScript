# Deployment dan operasi

## Target deployment

Gunakan project Google Apps Script dan Firebase khusus **staging**. Pastikan `appsscript.json` memakai `Asia/Jakarta`. Set Script Properties `DATABASE_SPREADSHEET_ID`, `FIREBASE_WEB_API_KEY`, `FIREBASE_AUTH_DOMAIN`, dan `FIREBASE_PROJECT_ID`; tidak ada fallback database ID. Batasi spreadsheet ke akun pemilik deployment dan operator yang memang memerlukan akses.

Deploy melalui **Deploy → New deployment → Web app**, jalankan sebagai pemilik deployment, dan batasi siapa yang dapat membuka URL sesuai kebijakan Google Workspace. Firebase Authentication tetap membatasi akses aplikasi ke akun yang lolos verifikasi token dan tercatat aktif di `USERS`. Gunakan URL HTTPS karena browser meminta izin lokasi pada secure context.

## Preflight staging

1. Buat spreadsheet staging terpisah dan backup sebelum setup.
2. Jalankan `initializeDatabase_()` dari editor Apps Script; jangan panggil fungsi setup dari browser.
3. Jalankan bootstrap Super Admin staging melalui `createFirstSuperAdmin_()` setelah mengisi property sementara.
4. Pastikan konfigurasi, nama tab, header, scope role, jadwal, serta data kontrol telah divalidasi.
5. Uji akun anonim, aktif, nonaktif, setiap role, manipulasi scope, absensi, koreksi, ekspor, dan pemulihan.
6. Rilis versi deployment staging baru setelah perubahan source. Jangan deploy production dari workspace ini.

## Data lokasi, retensi, backup, dan restore

Record `ATTENDANCES` menyimpan latitude, longitude, accuracy, dan jarak dari kantor untuk check-in dan check-out. Browser GPS dapat dipalsukan; data ini bukan bukti lokasi anti-spoof. Batasi akses spreadsheet, audit akses Drive, dan jangan membagikan salinan data ke pengguna umum.

Belum ada retensi/purge otomatis. Pemilik data harus menetapkan durasi retensi, dasar kebijakan, serta siapa yang berwenang sebelum menghapus histori lokasi. Sampai kebijakan disahkan, jangan menghapus atau memodifikasi histori lokasi secara otomatis.

Backup: jadwalkan salinan spreadsheet staging/produksi dengan akses Drive terbatas dan simpan manifest konfigurasi non-secret secara terpisah. Uji backup dan restore pada spreadsheet staging: salin backup ke spreadsheet baru, validasi semua header dan relasi, set `DATABASE_SPREADSHEET_ID` staging, lalu uji baca/tulis.

## Rollback

1. Hentikan promosi versi staging dan arahkan pengguna kembali ke deployment source version sebelumnya.
2. Jika hanya source yang bermasalah, pulihkan file dari branch/backup source yang dicatat di `REMEDIATION_REPORT.md`.
3. Jika data staging berubah, pulihkan salinan staging terakhir ke spreadsheet staging baru dan verifikasi header/relasi sebelum mengganti Script Property staging.
4. Jangan mengubah database produksi atau menimpa histori tanpa persetujuan pemilik data dan backup terverifikasi.

Deployment dan restore live belum dilakukan dari workspace ini karena tidak tersedia akses project Google/Firebase staging.
