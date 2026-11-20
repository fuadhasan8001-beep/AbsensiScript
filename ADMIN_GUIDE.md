# Panduan administrator

Kelola pegawai, kantor, kecamatan/desa, jadwal kerja, kalender libur, akun, laporan, dan audit melalui menu sesuai role. Backend memvalidasi role dan scope wilayah; nilai district/village dari browser bukan sumber otorisasi. Pastikan relasi kantor, desa, kecamatan, tanggal efektif, status, dan email telah dikonfirmasi.

Pegawai baru melalui Data Pegawai membuat record akun aplikasi role `PEGAWAI`. Jika email berubah, sistem menonaktifkan akun aplikasi lama dan menghubungkan alamat baru. Firebase Authentication tidak diubah oleh aplikasi; operator harus menyiapkan alamat Firebase baru dan menguji bahwa login lama ditolak oleh record aplikasi nonaktif.

Super Admin pertama dibuat pemilik project dari editor Apps Script dengan prosedur privat `createFirstSuperAdmin_()` dan property sementara `FIRST_SUPER_ADMIN_EMAIL`. Akun Super Admin tidak dapat didemosi melalui form umum. Jangan membagikan spreadsheet atau Script Properties kepada pegawai/admin wilayah.

Check-in/out memerlukan kantor aktif, jadwal aktif, hari kerja, dan bukan tanggal libur yang berlaku. Hari libur dengan officeId kosong diperlakukan global; officeId terisi berlaku untuk kantor tersebut. Minta pengesahan kebijakan instansi sebelum memakai konfigurasi staging. Penugasan sementara terpisah dari penempatan rutin `primaryOfficeId`; aturan tabel `EMPLOYEE_ASSIGNMENTS` belum diaktifkan.

Setiap keputusan/koreksi dan perubahan penting memiliki audit log. Jika ditemukan audit `*_STARTED` tanpa `*_COMPLETED`, atau status data tidak cocok, hentikan pengulangan operasi dan lakukan rekonsiliasi berdasarkan audit sebelum melanjutkan.
