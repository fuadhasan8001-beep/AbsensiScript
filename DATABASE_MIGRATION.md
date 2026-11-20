# Database migration

## Remediasi ini

Tidak ada perubahan header/tabel. Tidak ada migrasi data yang diperlukan atau dijalankan. Struktur database produksi/staging tidak dibuka atau disentuh oleh pekerjaan ini.

Perubahan validasi yang berlaku pada source selanjutnya menolak duplikasi ID, email, nomor identitas pegawai nonkosong, serta pasangan `ATTENDANCES.employeeId + date`. Sebelum deploy pada spreadsheet yang sudah berisi data, jalankan audit duplikasi di salinan staging dan selesaikan konflik secara manual. Source tidak menghapus atau memilih baris duplikat secara otomatis.

## Prosedur validasi untuk staging

1. Buat backup/copy spreadsheet target.
2. Pastikan `DATABASE_SPREADSHEET_ID` menunjuk hanya ke copy staging.
3. Periksa header setiap tab dibanding `TABLES` di `Config.gs`; startup akan menolak header yang tidak identik.
4. Audit kunci duplikat dan relasi USERS, DESA, OFFICES, EMPLOYEES, DUTY_ASSIGNMENTS, ATTENDANCES, dan ADJUSTMENTS.
5. Jalankan `initializeDatabase_()` hanya pada spreadsheet staging setelah inspeksi. Fungsi menambah tab yang hilang; tidak mengubah tab yang sudah berisi header valid.
6. Ulangi pemeriksaan relasi, bootstrap akun staging, dan regression test.

## Rollback

Tidak ada migrasi schema untuk di-rollback. Jika setup staging menambah tab kosong/header yang tidak diinginkan, pulihkan copy staging dari backup. Jangan menghapus tab/data produksi. Perubahan Script Property hanya boleh diarahkan kembali ke spreadsheet staging yang telah diverifikasi.
