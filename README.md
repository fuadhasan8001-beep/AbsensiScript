# Sistem Informasi Absensi Instansi

Fondasi Google Apps Script V8 dengan Google Sheets, Firebase Authentication dan validasi lokasi di server. Zona waktu sistem `Asia/Jakarta`.

## Status saat ini

UI responsif mencakup login, dashboard berbasis role, profil, absensi GPS, riwayat/koreksi, data pegawai/kantor/wilayah, jadwal/libur, penugasan, laporan, audit log, dan pengaturan akun. Source sedang melalui remediation keamanan dan **belum siap produksi atau staging operasional penuh**. Preview lokal memakai data simulasi; integrasi Firebase/Google, browser QA, beban, backup/restore belum dibuktikan. Lihat [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) dan [TESTING_REPORT.md](TESTING_REPORT.md).

## Mulai

Ikuti [INSTALLATION.md](INSTALLATION.md), kemudian [DEPLOYMENT.md](DEPLOYMENT.md). Rancangan komponen ada di [ARCHITECTURE.md](ARCHITECTURE.md) dan skema ada di [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

### Struktur

- `Code.gs`, `Config.gs`, `Database.gs`: entrypoint dan database
- `Auth.gs`, `Access.gs`, `AuditService.gs`: autentikasi dan otorisasi
- `AttendanceService.gs`, `GPSService.gs`, `DutyAssignmentService.gs`: aturan operasional
- `EmployeeService.gs`, `OfficeService.gs`, `ScheduleService.gs`, `ReportService.gs`: layanan
- `Index.html`, `Styles.html`, `Scripts.html`: aplikasi web
- `INITIAL_AUDIT.md`, `REMEDIATION_REPORT.md`: baseline dan hasil remediasi
- `tests/unit.test.js`: unit test lokal murni

Deploy melalui clasp atau editor Apps Script setelah menetapkan Script Properties. Jangan bagikan spreadsheet database kepada pegawai.

## Preview tampilan lokal

Untuk melihat UI tanpa konfigurasi Firebase, jalankan `python3 -m http.server 8765` di folder proyek lalu buka `http://localhost:8765/preview.html`. Preview memakai data simulasi dan tidak menyimpan perubahan.
# AbsensiScript
