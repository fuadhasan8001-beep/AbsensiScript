# Sistem Informasi Absensi Instansi

Fondasi Google Apps Script V8 dengan Google Sheets, Firebase Authentication dan validasi lokasi di server. Zona waktu sistem `Asia/Jakarta`.

## Status saat ini

UI responsif kini mencakup halaman login, dashboard berbasis role, profil, absensi GPS, riwayat dan pengajuan koreksi, data pegawai/kantor/wilayah, jadwal, kalender libur, penugasan dan persetujuan, laporan dengan filter dan ekspor CSV/print-to-PDF, audit log, serta pengaturan akun/role Super Admin. **Belum merupakan rilis produksi**: seluruh alur masih perlu dites pada project Google/Firebase, integrasi eksternal belum dikonfigurasi, dan browser preview/deployment live belum tersedia. Tidak ada pengujian fungsional atau deployment live yang diklaim berhasil.

## Mulai

Ikuti [INSTALLATION.md](INSTALLATION.md), kemudian [DEPLOYMENT.md](DEPLOYMENT.md). Rancangan komponen ada di [ARCHITECTURE.md](ARCHITECTURE.md) dan skema ada di [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

### Struktur

- `Code.gs`, `Config.gs`, `Database.gs`: entrypoint dan database
- `Auth.gs`, `Access.gs`, `AuditService.gs`: autentikasi dan otorisasi
- `AttendanceService.gs`, `GPSService.gs`, `DutyAssignmentService.gs`: aturan operasional
- `EmployeeService.gs`, `OfficeService.gs`, `ScheduleService.gs`, `ReportService.gs`: layanan
- `Index.html`, `Styles.html`, `Scripts.html`: aplikasi web

Deploy melalui clasp atau editor Apps Script setelah menetapkan Script Properties. Jangan bagikan spreadsheet database kepada pegawai.

## Preview tampilan lokal

Untuk melihat UI tanpa konfigurasi Firebase, jalankan `python3 -m http.server 8765` di folder proyek lalu buka `http://localhost:8765/preview.html`. Preview memakai data simulasi dan tidak menyimpan perubahan.
# AbsensiScript
