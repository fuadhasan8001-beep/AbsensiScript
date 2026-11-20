# Remediation report

Tanggal: 19 November 2026. Baseline: `INITIAL_AUDIT.md`, commit `29313f0bb379042a16092ef1692e41d8cdb82273`. Source backup sebelum perubahan: `/tmp/absensi-source-backup-20261119-213205.tar.gz`. Branch kerja: `fix/security-and-production-readiness`. Tidak ada perubahan database/deployment/commit/push.

## Ringkasan

Implementasi source diperkuat untuk fungsi server, scope kantor, validasi identitas, duplikasi, performa pembacaan, WIB, GPS, jadwal/libur, koreksi, dashboard, konfigurasi, Super Admin, keputusan penugasan, CSV, dan token. Test unit murni lokal dan pemeriksaan sintaks lolos. Tidak tersedia akun staging, Firebase, spreadsheet uji, atau browser QA; integrasi, beban, backup/restore belum terbukti.

## Status temuan (18)

| ID | Status | Remediasi / risiko tersisa |
|---|---|---|
| H-01 | FIXED | Fungsi initialize/inspect/bootstrap berakhiran `_`; hanya router `api` memegang auth flow. Uji `google.script.run` anonim tetap perlu staging. |
| H-02 | FIXED | District Admin Kecamatan dipaksa dari context; desa, kecamatan, scope update, status aktif, dan foreign relation divalidasi server. |
| H-03 | MITIGATED | Akun aplikasi lama berdasarkan employeeId dinonaktifkan; email bentrok ditolak, penanda operasi/audit dan kompensasi ditambahkan. Firebase Auth tidak dimutasi/revoke; email baru harus disiapkan di Firebase, dan login lama perlu uji staging. |
| H-04 | MITIGATED | Kunci unik aplikasi, ScriptLock pada beberapa operasi kritis, serta audit started/completed/partial dan kompensasi pada save pegawai. Sheets tetap bukan transaksi; belum ada idempotency key umum dan semua service belum memakai pola lock. |
| H-05 | MITIGATED | Cache baris per request, map lookup pada daftar pegawai/koreksi/tugas, batas histori/laporan. Tidak ada benchmark 100/300/500; service/periode belum semua diuji beban. |
| H-06 | FIXED | Manifest `Asia/Jakarta`, parser `datetime-local` sebagai WIB, ISO ber-offset dan perhitungan jam kerja dari kalender WIB. Boundary integration tetap perlu staging. |
| M-01 | FIXED | Koordinat kantor/perangkat, accuracy, radius, finite dan active office diperiksa di server. GPS spoof tetap mungkin dan terdokumentasi. |
| M-02 | MITIGATED | Absensi memerlukan jadwal aktif, memeriksa hari libur dan hari kerja. Asumsi scope: officeId kosong global, officeId terisi hanya kantor itu; minta pemilik bisnis mengesahkan perilaku libur lokal/nasional sebelum staging operasional. |
| M-03 | FIXED | Usulan koreksi diparse/validasi server; urutan checkout, tanggal attendance, keterlambatan, decidedBy, before/after audit diperbarui. Belum live-tested. |
| M-04 | FIXED | Hari unik 1–7, jam dan tolerance tervalidasi; satu jadwal aktif/kantor; cache kantor lama/baru diinvalidasi. Jadwal lintas tengah malam ditolak. |
| M-05 | MITIGATED | Dashboard membedakan aktif, dijadwalkan, terlambat, belum hadir; mengecualikan sebelum start date, nonaktif, libur/non-workday, mempertimbangkan tugas. `EMPLOYEE_ASSIGNMENTS` belum memengaruhi perhitungan; control totals belum diuji. |
| M-06 | FIXED | Fallback ID dihapus; Script Property wajib; spreadsheet/tab/header lama divalidasi sebelum web startup dan sebelum init menulis. Database staging yang ada harus dicek duplikasi manual. |
| M-07 | BLOCKED | `EMPLOYEE_ASSIGNMENTS` dipertahankan. Butuh keputusan bisnis tentang rentang efektif, overlap, prioritas terhadap primaryOfficeId, dan histori sebelum mengubah aturan absensi. |
| M-08 | BLOCKED | Data koordinat/accuracy/jarak terinventaris; retensi, dasar kebijakan, pemilik backup, dan lama penyimpanan perlu persetujuan. Tidak ada purge otomatis atau restore test. |
| M-09 | FIXED | Form umum menolak perubahan akun Super Admin; role/scope/status/email/relasi divalidasi server dan diaudit. Bootstrap pertama tetap prosedur editor pemilik. |
| M-10 | MITIGATED | Keputusan hanya dari PENDING, role/scope dicek, lock dan record approval/audit digunakan. Multi-sheet tetap dapat gagal parsial; keputusan ganda perlu uji konkurensi staging. |
| L-01 | FIXED | CSV menetralkan nilai formula-leading dan melakukan quote/escape field; sampel unit lolos. Verifikasi buka di Excel/Sheets masih perlu QA staging. |
| L-02 | FIXED | `getIdToken()` dipanggil sebelum setiap API request; sesi invalid diarahkan ke sign-in. Belum diuji dengan token Firebase live. |

## Deployment, rollback, dan sisa risiko

Prasyarat, backup/restore, dan rollback dijelaskan di `DEPLOYMENT.md`; tidak ada migrasi schema (lihat `DATABASE_MIGRATION.md`). Jangan arahkan Script Property ke database produksi sebelum seluruh BLOCKED terselesaikan, duplikasi lama diaudit, dan staging integration/load/browser QA dijalankan.
