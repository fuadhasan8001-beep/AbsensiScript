# Changelog

## 2026-11-19 — Audit remediation baseline

- Sembunyikan fungsi setup/inspect/bootstrap dari Google Apps Script client-call surface dengan akhiran `_`.
- Wajibkan ID database eksplisit, validasi tab/header lama sebelum startup dan inisialisasi.
- Tegakkan scope kantor, relasi desa/kecamatan, status kantor aktif, validasi GPS, serta aturan jadwal/libur.
- Tambahkan pemeriksaan keunikan aplikasi, cache baris per request, beberapa lookup map, dan locking pada operasi kritis.
- Sinkronkan email pegawai dengan akun aplikasi, nonaktifkan identitas aplikasi lama, catat penanda operasi dan lakukan kompensasi best-effort.
- Samakan manifest dan pemrosesan tanggal/waktu dengan Asia/Jakarta; perbaiki validasi koreksi, keputusan tugas, perlindungan Super Admin, CSV injection, dan token refresh.
- Tambahkan baseline audit, test unit lokal, dan dokumentasi staging/backup/rollback.

Tidak ada spreadsheet atau database live yang diubah. Tidak ada deployment/commit/push.
