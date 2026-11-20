# Production readiness gate

**Status: belum layak untuk staging operasional penuh atau produksi.** Source remediation sudah dibuat pada branch kerja dan enam unit test lokal lulus, tetapi belum ada deployment/Spreadsheet/Firebase staging untuk membuktikan integrasi, scope, concurrent writes, browser flow, restore, atau kuota.

## Layak dilakukan sekarang

Setelah keputusan bisnis pada M-07/M-08 dan review source disetujui, tim dapat menyiapkan **staging terisolasi dengan data sintetis**. Jangan menyalin data produksi sebelum kebijakan retensi/privasi lokasi disahkan. Checklist lingkungan ada di `INSTALLATION.md` dan `DEPLOYMENT.md`.

## Gate wajib sebelum staging operasional

- [ ] Pemilik bisnis menyetujui cakupan hari libur (global vs lokal) dan kebijakan jika jadwal tidak ada; implementasi saat ini menolak absensi tanpa jadwal.
- [ ] Pemilik bisnis menetapkan bagaimana `EMPLOYEE_ASSIGNMENTS` berinteraksi dengan `primaryOfficeId`, tanggal efektif, overlap, serta tugas sementara.
- [ ] Pemilik data menetapkan retensi koordinat, akses spreadsheet, backup, dan restore.
- [ ] Buat project Firebase dan spreadsheet staging terpisah; isi Script Properties tanpa fallback.
- [ ] Audit duplikasi/relasi pada data seed dan pastikan tab/header cocok.
- [ ] Jalankan seluruh test integrasi role, scope, email, operasi parsial, tugas, koreksi, jadwal/libur, report control totals, dan token.
- [ ] Jalankan browser QA responsive/console pada role utama.
- [ ] Uji backup/restore dan rollback versi deployment.

## Gate sebelum menyatakan siap produksi

- [ ] Seluruh test staging PASS dengan hasil aktual tercatat.
- [ ] Beban 100, 300, 500 pegawai serta histori representatif dan konkurensi diukur: durasi, sheet reads/writes, respons, quota, timeout, duplikasi.
- [ ] Firebase email lifecycle dan pencabutan akses lama diuji; source hanya menonaktifkan record aplikasi, tidak memanggil Firebase Admin SDK.
- [ ] Temuan H-03/H-04/H-05/M-07/M-08/M-10 yang masih mitigated/blocked ditutup atau mitigasinya disetujui tertulis.
- [ ] Pemilik data menyetujui retention, operator, incident response, backup dan pemulihan.
- [ ] Review keamanan akhir dan persetujuan deployment terpisah dilakukan.

## Rollback dan perubahan database

Tidak ada schema migration atau write data pada pekerjaan ini. Untuk prosedur rollback source/database, lihat `DEPLOYMENT.md`; header dan integritas harus diverifikasi di staging sebelum perubahan `DATABASE_SPREADSHEET_ID`.

## Keputusan akhir saat ini

**Belum layak staging operasional penuh.** Hasil ini bukan klaim bahwa source tidak dapat dipasang pada sandbox; sumber daya live dan keputusan kebijakan belum tersedia, dan test lokal bukan validasi Google/Firebase. Rekomendasi: selesaikan keputusan bisnis, siapkan sandbox sintetis, lalu jalankan integration/browser/load/restore gates di atas.
