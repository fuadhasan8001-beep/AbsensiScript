# Laporan pengujian

Tidak ada test suite atau kredensial Firebase/database terpasang di workspace saat ini. Maka kasus berikut **BELUM DIUJI**; tidak ada PASS yang diklaim.

| Pengujian | Kondisi | Hasil diharapkan | Aktual | Status | Catatan |
|---|---|---|---|---|---|
| Autentikasi | Token/email terdaftar, tak terdaftar, kedaluwarsa, akun nonaktif | Akses hanya bagi akun terverifikasi aktif | Belum dijalankan | BELUM DIUJI | Perlu Firebase setup |
| RBAC | Empat role dan parameter wilayah dimanipulasi | Data sesuai wilayah/identitas | Belum dijalankan | BELUM DIUJI | Perlu audit menyeluruh |
| GPS | Radius, akurasi buruk, koordinat invalid, kantor nonaktif | Ditolak/diterima sesuai aturan | Belum dijalankan | BELUM DIUJI | Perlu perangkat nyata |
| Absensi | Duplikat, check-out tanpa check-in, jadwal, waktu server | Konsisten dan transaksi tunggal | Belum dijalankan | BELUM DIUJI | Perlu spreadsheet uji |
| Tugas | Setujui/tolak/kedaluwarsa/kantor lain | Hanya tugas valid mengizinkan kantor | Belum dijalankan | BELUM DIUJI | Perlu uji lintas role |
| Laporan | Rentang tanggal, CSV, rekonsiliasi | Angka cocok dan file dapat dibuka | Belum dijalankan | BELUM DIUJI | PDF belum dibuat |
| Performa | Konkurensi, kuota, putus koneksi | Tidak ada duplikasi dan pulih aman | Belum dijalankan | BELUM DIUJI | Perlu beban terukur |
