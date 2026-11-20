# Keamanan aplikasi

## Kontrol yang diterapkan

- Firebase ID token divalidasi server-side menggunakan Identity Toolkit; email dari payload klien tidak digunakan sebagai identitas. Request frontend meminta token valid melalui `getIdToken()` sebelum setiap API call dan menangani sesi berakhir.
- API memiliki allowlist action dan menerapkan role/scope di backend. Fungsi setup/inspect/bootstrap memakai akhiran `_` sehingga tidak dapat dipanggil sebagai fungsi `google.script.run`.
- Scope kecamatan kantor Admin Kecamatan dipaksa dari context server; relasi kecamatan/desa diperiksa saat save. Akses kantor nonaktif ditolak untuk absensi.
- Script Property `DATABASE_SPREADSHEET_ID` wajib; source tidak memuat fallback database. Header sheet diperiksa sebelum API web berjalan.
- Validasi aplikasi menolak duplikasi untuk ID/email dan pasangan pegawai/tanggal absensi; operasi kritis tertentu memakai ScriptLock. Ini bukan transaksi database.
- Role Super Admin tidak dapat diubah melalui form umum; akun hanya disiapkan melalui prosedur bootstrap pemilik.
- Latitude, longitude, accuracy, radius, status kantor, tanggal/waktu, keputusan koreksi dan penugasan divalidasi pada backend.
- Ekspor CSV memberi awalan apostrof pada nilai yang dapat ditafsirkan sebagai formula.

## Risiko dan kontrol operasional

- Perubahan email aplikasi menonaktifkan akun aplikasi lama dan menghubungkan alamat baru; source tidak mengubah atau mencabut identitas/sesi Firebase. Akun Firebase baru harus disiapkan terpisah dan login lama perlu diuji di staging. Jangan klaim revoke Firebase berhasil.
- Browser GPS bisa dipalsukan. Koordinat akurat/di dalam radius bukan bukti anti-spoof.
- Multi-sheet tidak atomik; penanda audit dan kompensasi pada sinkronisasi pegawai membantu rekonsiliasi, namun pemutusan eksekusi/kuota masih dapat menyisakan data parsial. Tidak ada idempotency token umum.
- Spreadsheet harus hanya dapat diakses operator tepercaya. Data absensi mencakup koordinat lokasi dan belum memiliki kebijakan retensi yang disahkan.
- Batasi kredensial Script Properties, batasi API key Firebase ke API/domain yang diperlukan, gunakan deployment HTTPS, tinjau audit log, dan uji restore backup.
- Pengujian akses langsung, role, Firebase token, serta batas wilayah harus dilakukan pada deployment staging. Tes lokal/mock bukan bukti kontrol live.

Laporkan potensi insiden ke pemilik deployment; jangan memasukkan token, credential privat, atau isi data pribadi ke log/debug.
