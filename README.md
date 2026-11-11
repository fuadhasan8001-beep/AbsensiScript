# Sistem Informasi Absensi Instansi

Fondasi Google Apps Script V8 dengan Google Sheets, Firebase Authentication dan validasi lokasi di server. Zona waktu sistem `Asia/Jakarta`.

## Status saat ini

Repository ini menyediakan struktur modular dan alur dasar. Ini **belum merupakan rilis produksi**: autentikasi, integrasi akun Firebase, tata kelola role/organisasi, laporan lengkap/PDF/XLSX, seluruh halaman admin, dan verifikasi deployment masih memerlukan konfigurasi serta pengembangan/pengujian. Tidak ada pengujian atau deployment live yang diklaim berhasil.

## Mulai

Ikuti [INSTALLATION.md](INSTALLATION.md), kemudian [DEPLOYMENT.md](DEPLOYMENT.md). Rancangan komponen ada di [ARCHITECTURE.md](ARCHITECTURE.md) dan skema ada di [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

### Struktur

- `Code.gs`, `Config.gs`, `Database.gs`: entrypoint dan database
- `Auth.gs`, `Access.gs`, `AuditService.gs`: autentikasi dan otorisasi
- `AttendanceService.gs`, `GPSService.gs`, `DutyAssignmentService.gs`: aturan operasional
- `EmployeeService.gs`, `OfficeService.gs`, `ScheduleService.gs`, `ReportService.gs`: layanan
- `Index.html`, `Styles.html`, `Scripts.html`: aplikasi web

Deploy melalui clasp atau editor Apps Script setelah menetapkan Script Properties. Jangan bagikan spreadsheet database kepada pegawai.
