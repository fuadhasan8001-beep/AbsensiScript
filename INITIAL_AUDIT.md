# Kondisi Awal — Audit Remediasi

## Snapshot dan ruang lingkup

- Branch kerja dibuat dari `main`: `fix/security-and-production-readiness`.
- Commit dasar: `29313f0bb379042a16092ef1692e41d8cdb82273`.
- Backup source sebelum perubahan: `/tmp/absensi-source-backup-20261119-213205.tar.gz`.
- Seluruh file proyek terinventarisasi dan dibaca: `.gs`, HTML/CSS/JavaScript, `appsscript.json`, serta dokumentasi instalasi, deployment, arsitektur, skema, audit, keamanan, dan pengujian.
- Tidak ada konfigurasi kredensial Google/Firebase staging yang tersedia di workspace. Database dan layanan live belum disentuh.

## Struktur dan alur aplikasi

- Frontend: `Index.html` memuat `Styles.html` dan `Scripts.html`; `preview.html` adalah preview simulasi lokal.
- Web entry/API: `doGet()` menyusun konfigurasi publik Firebase; `api(action,payload)` memverifikasi Firebase ID token melalui `Auth.require_()`, lalu mengirim aksi ke `Router.dispatch_()`.
- Endpoint router: `bootstrap`, `dashboard`, `attendanceToday`, `attendanceHistory`, `checkIn`, `checkOut`, `dutyList`, `dutyRequest`, `dutyDecision`, `correctionRequest`, `correctionList`, `correctionDecision`, `employeeList`, `employeeSave`, `officeList`, `officeSave`, `orgList`, `orgSave`, `scheduleList`, `scheduleSave`, `holidayList`, `holidaySave`, `report`, `auditList`, `profile`, `settings`, `userList`, `userSave`.
- Service: auth/access, pegawai, kantor/organisasi, jadwal/libur, penugasan, absensi/koreksi, laporan, audit, dan utilitas.
- Persistence: tiap tabel adalah tab Google Sheets; `TABLES` mendefinisikan header. Relasi logis meliputi USERS→EMPLOYEES/wilayah, EMPLOYEES→OFFICES, OFFICES→DESA/KECAMATAN, EMPLOYEE_ASSIGNMENTS→EMPLOYEES/OFFICES, WORK_SCHEDULES/HOLIDAYS→OFFICES, DUTY_ASSIGNMENTS→EMPLOYEES/OFFICES, ATTENDANCES→EMPLOYEES/OFFICES/DUTY_ASSIGNMENTS, ADJUSTMENTS→ATTENDANCES, approvals→DUTY_ASSIGNMENTS, dan AUDIT_LOGS→aktor/entitas.
- Zona waktu aplikasi di `Config.gs` sudah `Asia/Jakarta`, tetapi manifest masih `America/New_York`. Input `datetime-local` dan beberapa parsing `Date` tidak eksplisit zona waktunya.
- `DATABASE_SPREADSHEET_ID` dibaca dari Script Properties tetapi masih ada fallback ID statis di `Config.gs`.

## Temuan awal terkonfirmasi dari source

- Fungsi setup/inspect/bootstrap di `Code.gs` masih fungsi top-level publik di luar router.
- Pembuatan kantor mempercayai `districtId`/`villageId` payload; relasi wilayah tidak diverifikasi menyeluruh.
- Penyimpanan pegawai dapat membuat/memperbarui akun tanpa sinkronisasi aman berdasarkan employeeId dan tanpa pencabutan akun Firebase.
- Operasi Sheets tidak transaksional; append/update tidak menegakkan keunikan umum. Absensi memakai ScriptLock, operasi lain tidak konsisten menggunakannya.
- `DB.by()` memuat seluruh tabel; beberapa service memanggilnya berulang dalam loop. Riwayat memotong hasil sesudah membaca seluruh sheet.
- GPS dihitung server-side tetapi sumber koordinat tetap browser. Jadwal tidak wajib ada dan hari libur belum diterapkan pada absensi.
- Koreksi absensi belum memvalidasi ulang timestamp dan keterurutan check-in/out.
- Validasi jadwal, perlindungan Super Admin, transisi keputusan tugas, CSV injection, dan refresh token memiliki gap pada source.
- Header tabel tidak divalidasi terhadap `TABLES` sebelum operasi; fallback spreadsheet membuat target database tidak eksplisit.

## Batasan audit awal

Ini adalah baseline pembacaan statis, bukan hasil uji runtime. Tidak ada database yang dibuka, Firebase token yang diuji, data yang dimigrasikan, atau deployment yang dijalankan. Hasil dan perubahan berikutnya dicatat terpisah di `REMEDIATION_REPORT.md` dan `TESTING_REPORT.md`.
