# Laporan Audit Aplikasi Absensi

**Tanggal audit:** 19 November 2026

**Cakupan:** seluruh file kerja yang tersedia di workspace, termasuk Apps Script, HTML/CSS, konfigurasi, preview lokal, dan dokumentasi. Audit bersifat statis; tidak ada kode aplikasi atau database yang diubah.

## Ringkasan eksekutif

| Tingkat | Jumlah | Kesimpulan |
|---|---:|---|
| Critical | 0 | Tidak ada temuan yang dapat dibuktikan memenuhi tingkat ini dari source yang tersedia. |
| High | 6 | Ada risiko bypass fungsi server yang tidak berada di router API, celah batas wilayah, akun lama yang tetap aktif setelah perubahan email, konsistensi transaksi, performa, dan ketidaksesuaian zona waktu. |
| Medium | 10 | Ada gap GPS, jadwal/libur, koreksi, pelaporan, konfigurasi database, penugasan, pengelolaan Super Admin, dan retensi lokasi. |
| Low | 2 | Ada risiko formula pada ekspor CSV dan masa berlaku token di sisi browser. |

**Kesimpulan:** belum layak dipakai untuk produksi sebelum temuan High ditutup dan pengujian integrasi dilakukan pada project Google/Firebase staging. Temuan bertanda **Terbukti** terlihat langsung pada alur source. **Risiko** berarti dampak bergantung pada konfigurasi atau kondisi operasional. Hal yang tidak dapat diperiksa tanpa akses project disebut terpisah sebagai **Belum dapat diverifikasi**.

## Temuan Critical

Tidak ada temuan Critical yang dapat dibuktikan dari pemeriksaan source statis ini.

## Temuan High

### H-01 — Fungsi server selain API dapat dipanggil tanpa melewati autentikasi API

- **Status:** Terbukti pada source; dampak aktual bergantung pada mode deployment.
- **File/lokasi:** [`Code.gs`](./Code.gs#L29), [`Code.gs`](./Code.gs#L44), [`Code.gs`](./Code.gs#L68), [`Code.gs`](./Code.gs#L93).
- **Masalah:** autentikasi dan otorisasi dipasang pada `api()`, tetapi fungsi top-level `initializeDatabase()`, `inspectDatabase()`, dan `createFirstSuperAdmin()` tidak memeriksa identitas. Pada Web App HTML Service yang menjalankan sebagai pemilik, fungsi server publik dapat dipanggil langsung melalui `google.script.run` tanpa melalui `api()`. `inspectDatabase()` mengembalikan URL dan ID spreadsheet; inisialisasi dapat dipicu dari luar alur admin. Bootstrap dibatasi oleh email pada Script Properties dan penolakan jika Super Admin sudah ada, tetapi tetap tidak semestinya menjadi endpoint publik.
- **Dampak:** metadata lokasi database dapat terbuka; fungsi setup dapat dijalankan tanpa alur autentikasi aplikasi. Ini memperluas attack surface, walau source ini tidak menyediakan pembacaan semua baris database melalui fungsi tersebut.
- **Rekomendasi:** pindahkan operasi setup ke project/fungsi administrasi yang tidak ikut diekspos oleh Web App, atau jadikan fungsi privat Apps Script dengan akhiran `_` dan panggil hanya melalui prosedur editor yang sesuai. Jangan mengandalkan tombol UI untuk melindungi fungsi server.
- **Uji perbaikan:** dari sesi browser anonim, coba panggil fungsi setup/inspect via `google.script.run`; panggilan harus tidak tersedia/ditolak. Akun aktif tetap dapat memakai endpoint API yang memang diizinkan.

### H-02 — Admin kecamatan dapat membuat kantor dengan ID kecamatan di luar cakupannya

- **Status:** Terbukti.
- **File/lokasi:** [`OfficeService.gs`](./OfficeService.gs#L1), khususnya validasi role dan konstruksi `districtId` pada `save()`.
- **Masalah:** `save()` membatasi role dan memeriksa cakupan kantor lama saat update. Untuk kantor baru, `districtId` diambil dari payload jika dikirim, lalu record langsung disimpan tanpa memeriksa bahwa kecamatan baru sama dengan `c.districtId`. `villageId` juga tidak divalidasi terhadap kecamatan tersebut.
- **Dampak:** Admin Kecamatan dapat menulis record kantor di luar wilayahnya atau membuat relasi kecamatan/desa yang tidak konsisten. Ini melanggar isolasi wilayah dan mencemari data master.
- **Rekomendasi:** validasi semua atribut wilayah pada record baru maupun update. Untuk `ADMIN_KECAMATAN`, paksa kecamatan berasal dari context server; pastikan desa benar-benar milik kecamatan tersebut. Jangan mempercayai nilai scope dari browser.
- **Uji perbaikan:** login sebagai Admin Kecamatan A, kirim `officeSave` dengan `districtId` Kecamatan B dan `villageId` di B; permintaan harus ditolak dan jumlah baris database tidak berubah. Uji pembuatan kantor sah di A dan update kantor lintas wilayah.

### H-03 — Mengubah email pegawai tidak menonaktifkan akun lama yang masih terhubung

- **Status:** Terbukti.
- **File/lokasi:** [`EmployeeService.gs`](./EmployeeService.gs#L1), `save()`.
- **Masalah:** saat email pegawai diganti, kode mencari user berdasarkan email baru. User yang masih terhubung melalui email lama tidak dicari atau dinonaktifkan. Jika alamat baru belum terdaftar, record user baru dibuat; record lama dapat tetap `ACTIVE` dengan `employeeId` yang sama.
- **Dampak:** dua identitas Firebase berbeda dapat tetap masuk sebagai pegawai yang sama dan membuat absensi atas satu `employeeId`; pencabutan akses lewat penggantian email tidak efektif.
- **Rekomendasi:** cari record user berdasarkan relasi `employeeId` sebelum mengganti email. Lakukan perubahan email dan status akun secara konsisten, tolak benturan email dengan user/pegawai lain, serta catat perubahan identitas pada audit log.
- **Uji perbaikan:** buat pegawai dengan user aktif email lama, ganti emailnya, lalu coba login memakai kedua alamat. Hanya alamat baru yang boleh mengakses profil/absensi pegawai tersebut.

### H-04 — Operasi multi-sheet tidak atomik dan kunci unik tidak ditegakkan

- **Status:** Risiko kuat yang berakar pada implementasi database saat ini.
- **File/lokasi:** [`Database.gs`](./Database.gs#L1), [`EmployeeService.gs`](./EmployeeService.gs#L1), [`UserService.gs`](./UserService.gs#L1), [`DutyAssignmentService.gs`](./DutyAssignmentService.gs#L1), [`AttendanceService.gs`](./AttendanceService.gs#L1).
- **Masalah:** Sheets tidak memiliki constraint unik yang diterapkan aplikasi. `append()` selalu menambah baris; `by()`/`update()` memilih kecocokan pertama. `ScriptLock` hanya dipakai untuk absensi dan bootstrap, bukan operasi pegawai/user/tugas. Penyimpanan pegawai menulis EMPLOYEES, lalu USERS, lalu AUDIT_LOGS sebagai operasi terpisah. Gangguan atau permintaan bersamaan dapat meninggalkan data parsial atau duplikat.
- **Dampak:** email/ID dapat ganda, update dapat mengenai record pertama yang tidak semestinya, perubahan pegawai dan akun dapat tidak sinkron, dan retry setelah timeout dapat menghasilkan record tambahan.
- **Rekomendasi:** tentukan kunci unik dan validasi duplikasi sebelum tulis; kunci/atur antrean untuk operasi read-modify-write yang kritis; rancang operasi multi-tab agar dapat dideteksi dan dipulihkan bila gagal di tengah. Tambahkan idempotency key untuk operasi yang dapat diulang. Jelaskan serta uji dampak migrasi/penanganan data duplikat sebelum mengubah skema.
- **Uji perbaikan:** kirim dua permintaan bersamaan untuk email/pegawai yang sama; hanya satu record yang boleh dibuat. Simulasikan kegagalan setelah penulisan pegawai tetapi sebelum user/audit selesai, lalu pastikan sistem menandai atau memulihkan operasi tanpa mengklaim sukses.

### H-05 — Pola baca database berulang tidak memadai untuk target 100–500 pegawai

- **Status:** Terbukti pada pola akses; batas waktu aktual belum diukur.
- **File/lokasi:** [`Database.gs`](./Database.gs#L1), [`EmployeeService.gs`](./EmployeeService.gs#L1), [`ReportService.gs`](./ReportService.gs#L1), [`DutyAssignmentService.gs`](./DutyAssignmentService.gs#L1), [`AttendanceService.gs`](./AttendanceService.gs#L1).
- **Masalah:** `DB.rows()` membaca seluruh tab setiap kali dipanggil. `EmployeeService.list()` memanggil `DB.by('OFFICES',...)` untuk tiap pegawai; `DB.by()` sendiri membaca seluruh tab kantor. Dashboard/laporan/keputusan juga memindai sheet penuh. Riwayat membatasi hasil setelah seluruh tab absensi dibaca. Pada laporan, pola tersebut menimbulkan banyak panggilan Spreadsheet service dan kerja berulang dalam satu eksekusi.
- **Dampak:** halaman lambat atau gagal karena kuota/waktu eksekusi, respons API membesar seiring histori, dan penggunaan bersamaan makin mudah mencapai batas eksekusi Apps Script.
- **Rekomendasi:** baca tiap tab sekali per request, bangun map lookup di memori, gunakan filter/paginasi di server, dan ukur volume/konkurensi dengan data representatif. Tetapkan batas panjang periode laporan dan kebijakan arsip sebelum volume histori tumbuh.
- **Uji perbaikan:** uji dashboard, daftar pegawai, absensi, dan laporan menggunakan dataset 500 pegawai serta histori representatif; jalankan permintaan bersamaan pada jam puncak. Catat waktu eksekusi, jumlah panggilan layanan, ukuran respons, error kuota, dan duplikasi.

### H-06 — Zona waktu project berbeda dari zona waktu bisnis, sementara input tugas tidak membawa offset

- **Status:** Terbukti ada ketidaksesuaian; dampak persis bergantung pada perilaku runtime Apps Script saat parsing tanggal lokal.
- **File/lokasi:** [`appsscript.json`](./appsscript.json#L2), [`Config.gs`](./Config.gs#L1), [`DutyAssignmentService.gs`](./DutyAssignmentService.gs#L1), [`AttendanceService.gs`](./AttendanceService.gs#L1), [`Scripts.html`](./Scripts.html#L43).
- **Masalah:** project disetel `America/New_York`, sedangkan aplikasi memakai `Asia/Jakarta`. Form penugasan mengirim `datetime-local` tanpa zona waktu dan backend mem-parsingnya dengan `new Date(...)`. Perhitungan keterlambatan juga membuat waktu kerja dengan `setHours()` tanpa zona eksplisit. Ini membuat interpretasi waktu tugas dan/atau batas terlambat berpotensi bergeser.
- **Dampak:** penugasan dapat dianggap belum berlaku/sudah kedaluwarsa pada waktu yang salah; menit keterlambatan dapat salah, sehingga catatan absensi dan laporan tidak akurat.
- **Rekomendasi:** samakan timezone project dengan timezone aplikasi dan gunakan representasi timestamp yang eksplisit (misalnya epoch/ISO dengan offset) untuk data lintas browser/server. Hindari parsing tanggal lokal ambigu. Uji batas tanggal dan perubahan musim waktu pada zona project.
- **Uji perbaikan:** ajukan tugas pukul 08:00 WIB, lalu verifikasi record dan hak check-in tepat sebelum, pada, dan setelah waktu mulai/akhir. Uji keterlambatan 0, 1, dan melewati toleransi pada waktu kerja WIB.

## Temuan Medium

### M-01 — Validasi GPS hanya memvalidasi koordinat yang dikirim browser

- **Status:** Terbukti sebagai batas desain; tidak ada mekanisme anti-spoof pada source.
- **File/lokasi:** [`GPSService.gs`](./GPSService.gs#L1), [`Scripts.html`](./Scripts.html#L36).
- **Masalah:** server menghitung ulang jarak dan memeriksa akurasi/radius, tetapi latitude, longitude, dan accuracy tetap berasal dari klien. Nilai tersebut dapat dimanipulasi oleh perangkat/browser; `MAX_GPS_ACCURACY_M` bukan bukti bahwa lokasi berasal dari GPS tepercaya.
- **Dampak:** pengguna yang memalsukan lokasi dapat berpotensi memenuhi geofence. Validasi ini berguna untuk kesalahan lokasi biasa, bukan jaminan kehadiran anti-kecurangan.
- **Rekomendasi:** dokumentasikan tingkat jaminan yang realistis; simpan anomali dan tinjau pola jarak/akurasi secara proporsional. Jika diperlukan jaminan lebih tinggi, lakukan kajian perangkat/attestation dan kontrol operasional sebelum memilih solusi; jangan mengklaim GPS browser tidak dapat dipalsukan.
- **Uji perbaikan:** uji koordinat tepat di dalam/tepi/luar radius, akurasi di atas ambang, koordinat invalid, kantor nonaktif, serta permintaan API dengan koordinat yang dimanipulasi. Pengujian terakhir harus dicatat sebagai keterbatasan yang tetap ada bila tidak ada attestation.

### M-02 — Hari libur tidak memengaruhi absensi dan kantor tanpa jadwal menerima absensi tanpa batas waktu

- **Status:** Terbukti.
- **File/lokasi:** [`ScheduleService.gs`](./ScheduleService.gs#L1), [`AttendanceService.gs`](./AttendanceService.gs#L1), [`ReportService.gs`](./ReportService.gs#L1).
- **Masalah:** data `HOLIDAYS` dapat disimpan/dibaca, tetapi tidak diperiksa saat check-in/out. `AttendanceService.punch()` hanya membatasi hari dan jam jika `ScheduleService.forOffice()` menemukan jadwal; jika tidak ada jadwal aktif, absensi tetap diproses. Laporan juga tidak menghitung hari kerja/libur yang seharusnya menjadi dasar ketidakhadiran.
- **Dampak:** pegawai dapat absen pada hari libur; kantor tanpa konfigurasi jadwal mempunyai aturan waktu yang longgar; dashboard “Belum hadir” tidak sebanding dengan hari kerja.
- **Rekomendasi:** putuskan kebijakan eksplisit untuk libur nasional/daerah/per-kantor dan kantor tanpa jadwal. Tolak absensi tanpa jadwal aktif atau sediakan fallback yang disetujui; gunakan kalender kerja yang sama untuk absensi dan pelaporan.
- **Uji perbaikan:** uji hari kerja, akhir pekan, libur global, libur kantor, kantor tanpa jadwal, dan jadwal nonaktif untuk check-in serta check-out. Pastikan laporan tidak menandai pegawai absen pada hari libur.

### M-03 — Persetujuan koreksi dapat membuat timestamp, tanggal absensi, dan menit terlambat tidak konsisten

- **Status:** Terbukti.
- **File/lokasi:** [`AttendanceService.gs`](./AttendanceService.gs#L1), [`Scripts.html`](./Scripts.html#L45).
- **Masalah:** keputusan koreksi hanya menyalin `checkInAt`/`checkOutAt` dari JSON usulan ke record. Tidak ada validasi urutan timestamp, rentang waktu yang masuk akal, atau perhitungan ulang kolom `date` dan `lateMinutes`. UI mengubah input lokal menjadi ISO UTC, sedangkan kolom `date` tetap tanggal lama.
- **Dampak:** record dapat menunjukkan tanggal check-in berbeda dari `date` yang dipakai laporan; check-out dapat lebih awal dari check-in; metrik keterlambatan menjadi usang.
- **Rekomendasi:** validasi timestamp di server, hitung ulang tanggal dan keterlambatan dengan aturan zona waktu resmi, dan simpan nilai sebelum/sesudah yang benar pada audit. Pertahankan keputusan koreksi hanya untuk field yang memang boleh diubah.
- **Uji perbaikan:** ajukan koreksi yang melintasi tengah malam, check-out sebelum check-in, timestamp invalid, dan check-in setelah jam kerja; permintaan invalid harus ditolak dan perubahan valid harus menghasilkan laporan yang konsisten.

### M-04 — Jadwal tidak divalidasi penuh dan cache dapat mempertahankan jadwal lama

- **Status:** Terbukti.
- **File/lokasi:** [`ScheduleService.gs`](./ScheduleService.gs#L1), [`Scripts.html`](./Scripts.html#L41).
- **Masalah:** `save()` tidak memvalidasi format hari, rentang jam, toleransi negatif, atau duplikasi jadwal aktif untuk kantor. `forOffice()` memilih jadwal aktif pertama. Saat jadwal dipindahkan ke kantor lain, cache kantor baru dihapus tetapi cache kantor lama tidak. Cache juga tetap hidup hingga TTL saat data diubah di luar fungsi save.
- **Dampak:** jadwal yang tidak valid atau jadwal lama dapat dipakai untuk menerima/menolak absensi; dua jadwal aktif untuk satu kantor menghasilkan pemilihan yang tidak deterministik.
- **Rekomendasi:** validasi rentang/hari dan satu jadwal aktif per kantor; saat update, invalidasi cache kantor lama dan baru; hindari mengubah data jadwal langsung di sheet tanpa prosedur cache yang sesuai.
- **Uji perbaikan:** simpan jadwal dengan waktu terbalik/hari invalid/toleransi negatif dan duplikat aktif; semua harus ditolak. Pindahkan jadwal kantor A ke B dan pastikan absensi A/B langsung memakai jadwal yang benar.

### M-05 — Angka dashboard dan laporan tidak merepresentasikan absensi harian secara akurat

- **Status:** Terbukti.
- **File/lokasi:** [`ReportService.gs`](./ReportService.gs#L1), [`AttendanceService.gs`](./AttendanceService.gs#L1), [`Scripts.html`](./Scripts.html#L21), [`Scripts.html`](./Scripts.html#L31).
- **Masalah:** “Belum hadir” dihitung sebagai jumlah pegawai dikurangi record hari ini tanpa mengecualikan pegawai nonaktif, belum mulai bekerja, akhir pekan, atau hari libur. Filter laporan menyaring daftar pegawai berdasarkan kantor utama sebelum menyaring record kehadiran; pegawai yang melakukan absensi di kantor tujuan tugas dapat tidak masuk pada laporan kantor/wilayah tersebut. Respons laporan juga tidak memuat baris absen yang diharapkan.
- **Dampak:** dashboard dan rekap berpotensi menampilkan angka ketidakhadiran/kehadiran yang keliru dan menyulitkan rekonsiliasi.
- **Rekomendasi:** definisikan populasi pegawai aktif dan hari kerja yang dihitung. Gunakan kantor pada record absensi untuk filter lokasi; sertakan penugasan dinas yang relevan. Bedakan “tidak ada record” dari “absen tanpa keterangan”.
- **Uji perbaikan:** bandingkan rekap dengan data kontrol untuk pegawai aktif/nonaktif, belum mulai, hari libur, akhir pekan, kantor utama, serta tugas ke kantor lain.

### M-06 — Konfigurasi database memiliki fallback ID tetap dan inisialisasi tidak memeriksa header yang sudah ada

- **Status:** Risiko konfigurasi/data; kepemilikan dan isi spreadsheet tidak dapat diverifikasi dari workspace.
- **File/lokasi:** [`Config.gs`](./Config.gs#L3), [`Database.gs`](./Database.gs#L1), [`INSTALLATION.md`](./INSTALLATION.md#L1), [`ARCHITECTURE.md`](./ARCHITECTURE.md#L1).
- **Masalah:** bila `DATABASE_SPREADSHEET_ID` tidak disetel, seluruh operasi diarahkan ke ID tetap dalam source. Dokumentasi instalasi menyuruh membuat spreadsheet baru, sedangkan konfigurasi punya fallback yang berbeda. `DB.init()` hanya menulis header jika tab kosong; header lama yang berbeda tidak divalidasi sebelum `rows()`/`append()` menggunakannya.
- **Dampak:** deployment dapat membaca/menulis spreadsheet yang tidak dimaksud pemilik; header drift dapat menghasilkan pembacaan field yang salah atau perubahan data yang tidak konsisten.
- **Rekomendasi:** wajibkan Script Property database eksplisit pada deployment produksi dan gagalkan startup bila belum ada. Dokumentasikan target tunggal dengan jelas. Saat setup, validasi nama/urutan header dan hentikan proses jika tidak cocok; lakukan backup sebelum perbaikan header.
- **Uji perbaikan:** hapus property pada project staging dan pastikan aplikasi gagal dengan pesan konfigurasi, bukan memakai fallback. Uji spreadsheet baru, ID salah, tab dengan header hilang/berubah, dan pastikan tidak ada data yang ditulis sebelum validasi lulus.

### M-07 — Penugasan lokasi kerja reguler belum terintegrasi dengan tabel assignment

- **Status:** Terbukti pada source.
- **File/lokasi:** [`Config.gs`](./Config.gs#L6), [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md#L13), [`EmployeeService.gs`](./EmployeeService.gs#L1), [`AttendanceService.gs`](./AttendanceService.gs#L1).
- **Masalah:** tabel `EMPLOYEE_ASSIGNMENTS` dideklarasikan, tetapi tidak ada service/router yang membaca atau menulisnya. Akses rutin hanya memakai `EMPLOYEES.primaryOfficeId`; perpindahan penempatan tidak memiliki riwayat efektif tanggal. `DUTY_ASSIGNMENTS` menangani tugas sementara, bukan penempatan kerja permanen.
- **Dampak:** perubahan kantor utama menimpa konteks historis pegawai; laporan historis dan otorisasi berdasarkan lokasi lama tidak dapat direkonstruksi dengan andal.
- **Rekomendasi:** tentukan apakah assignment reguler memang bagian kebutuhan. Jika iya, rancang tanggal berlaku dan aturan transisi sebelum integrasi; jelaskan dampak migrasi dari `primaryOfficeId` dan uji laporan historis. Jangan menghapus tabel/fitur yang sudah ada.
- **Uji perbaikan:** pindahkan pegawai di tengah periode; absensi dan otorisasi sebelum/sesudah tanggal efektif harus memakai kantor yang benar dan histori lama tetap dapat ditelusuri.

### M-08 — Lokasi presisi disimpan tanpa retensi/backup otomatis yang terlihat di aplikasi

- **Status:** Terbukti bahwa koordinat disimpan; kebijakan Drive/backup aktual belum dapat diverifikasi.
- **File/lokasi:** [`Config.gs`](./Config.gs#L14), [`AttendanceService.gs`](./AttendanceService.gs#L1), [`Database.gs`](./Database.gs#L1), [`DEPLOYMENT.md`](./DEPLOYMENT.md#L1).
- **Masalah:** koordinat check-in/check-out dan jarak disimpan pada tab absensi. Source tidak menerapkan retensi/penghapusan atau backup terjadwal; panduan hanya memberi instruksi backup manual.
- **Dampak:** data lokasi sensitif dapat tersimpan lebih lama dari kebutuhan; penghapusan/restore saat kehilangan data bergantung pada proses manual. Salah konfigurasi sharing spreadsheet dapat mengekspos histori lokasi.
- **Rekomendasi:** tetapkan retensi dan dasar akses data lokasi, batasi sharing spreadsheet ke pemilik yang diperlukan, dokumentasikan proses backup/restore, dan uji pemulihan berkala. Jangan menghapus data lama tanpa persetujuan kebijakan dan backup.
- **Uji perbaikan:** verifikasi daftar pemilik/editor spreadsheet, jalankan backup staging, pulihkan ke spreadsheet baru, cocokkan jumlah baris dan relasi, lalu uji retensi dengan dataset uji.

### M-09 — Super Admin dapat terdemote melalui form pengelolaan akun

- **Status:** Terbukti.
- **File/lokasi:** [`UserService.gs`](./UserService.gs#L1), [`Scripts.html`](./Scripts.html#L47).
- **Masalah:** backend menolak role `SUPER_ADMIN` sebagai nilai baru, tetapi menerima perubahan role akun yang sudah Super Admin ke salah satu role lain. Form edit tidak menyediakan opsi `SUPER_ADMIN`; ketika nilai saat ini tidak cocok dengan pilihan mana pun, browser memilih opsi pertama.
- **Dampak:** admin dapat tidak sengaja menurunkan akun Super Admin. Jika itu satu-satunya Super Admin, pengelolaan akun dapat terkunci sampai pemilik menjalankan bootstrap kembali.
- **Rekomendasi:** lindungi akun Super Admin dari perubahan role melalui form umum; sediakan alur khusus dengan konfirmasi, cek bahwa Super Admin lain tetap aktif, dan prosedur pemulihan pemilik.
- **Uji perbaikan:** edit akun Super Admin dari UI dan kirim payload langsung dengan role non-Super Admin; perubahan harus ditolak atau melewati alur khusus yang memenuhi kebijakan pemulihan.

### M-10 — Keputusan tugas dapat menimpa status yang sudah final

- **Status:** Terbukti.
- **File/lokasi:** [`DutyAssignmentService.gs`](./DutyAssignmentService.gs#L1).
- **Masalah:** `decide()` memvalidasi kewenangan dan nilai keputusan, tetapi tidak memastikan status tugas masih `PENDING`. Endpoint dapat mengubah tugas yang sudah `APPROVED` menjadi `REJECTED` atau sebaliknya dan menambah approval baru.
- **Dampak:** status akses tugas bisa berubah setelah dipakai untuk absensi, sementara histori keputusan tidak menunjukkan bahwa keputusan sebelumnya dianggap final.
- **Rekomendasi:** tetapkan transisi status yang sah di server, misalnya hanya `PENDING` yang dapat diputuskan; jika perubahan setelah keputusan memang diperlukan, buat tindakan pembatalan/revisi yang eksplisit dan dapat diaudit.
- **Uji perbaikan:** putuskan tugas sekali lalu kirim keputusan kedua via API; permintaan kedua harus ditolak atau tercatat sebagai alur revisi yang terpisah.

## Temuan Low

### L-01 — Ekspor CSV belum menetralkan formula yang berasal dari data

- **Status:** Risiko bergantung pada konten spreadsheet.
- **File/lokasi:** [`Scripts.html`](./Scripts.html#L18), [`Scripts.html`](./Scripts.html#L46).
- **Masalah:** nilai CSV hanya di-quote dan quote digandakan. Nilai yang dimulai `=`, `+`, `-`, atau `@` tetap dapat ditafsirkan sebagai formula oleh aplikasi spreadsheet setelah file dibuka.
- **Dampak:** data ekspor yang berisi teks terkontrol pengguna dapat menjalankan formula saat dibuka.
- **Rekomendasi:** gunakan serialisasi CSV yang menetralkan nilai formula (misalnya prefiks teks yang aman sesuai target spreadsheet) tanpa mengubah isi database.
- **Uji perbaikan:** ekspor nilai normal dan nilai uji yang diawali karakter formula; buka di Google Sheets/Excel dan pastikan semuanya ditampilkan sebagai teks.

### L-02 — Token ID Firebase tidak diperbarui pada pemanggilan API

- **Status:** Terbukti pada alur frontend; gangguan setelah kedaluwarsa belum diuji live.
- **File/lokasi:** [`Scripts.html`](./Scripts.html#L7), [`Scripts.html`](./Scripts.html#L10).
- **Masalah:** token diambil sekali dengan `getIdToken(true)` saat login dan disimpan dalam variabel `token`. Pemanggilan API berikutnya memakai nilai tersebut; tidak ada refresh sebelum permintaan atau handler perubahan token.
- **Dampak:** sesi yang lama terbuka dapat mulai gagal setelah token kedaluwarsa sampai pengguna memuat ulang/login kembali.
- **Rekomendasi:** ambil token valid sebelum setiap permintaan API atau sinkronkan dengan perubahan ID token Firebase; tangani sesi tidak valid dengan alur login yang jelas.
- **Uji perbaikan:** biarkan sesi melewati umur token, lalu buka halaman dan lakukan absensi; token harus diperbarui tanpa mengirim token lama atau menyebabkan operasi ganda.

## Cakupan modul dan skenario pengujian

Semua skenario di bawah **belum dijalankan** karena workspace tidak memiliki kredensial Firebase, akses spreadsheet, deployment staging, maupun test suite otomatis. Hasilnya tidak boleh dianggap PASS.

| Modul | Skenario minimum | Hasil yang diharapkan |
|---|---|---|
| Firebase login | Google Gmail terdaftar aktif; email tidak terdaftar; token invalid/kedaluwarsa; akun nonaktif; email belum terverifikasi | Hanya token valid dan akun yang diizinkan masuk; kegagalan tidak membocorkan token/konfigurasi rahasia. Verifikasi provider/domain di Firebase Console. |
| Role dan scope | Uji Super Admin, Admin Kecamatan, Admin Desa, Pegawai; ubah ID pegawai/kantor/kecamatan/desa di payload | Setiap operasi server mengikuti scope context hasil verifikasi token; tidak bergantung pada menu/validasi browser. |
| Bootstrap/deployment | Panggil fungsi setup langsung dari sesi anonim; panggil API tanpa token; periksa mode eksekusi Web App | Fungsi setup tidak dapat dipanggil publik; API menolak tanpa token; deployment hanya memakai spreadsheet yang disetujui. |
| Router dan utilitas | Aksi API tak dikenal; angka/koordinat non-finite; string panjang; error layanan Apps Script | Aksi invalid ditolak; input numerik divalidasi; pesan publik tidak mengungkap detail internal. |
| Pegawai dan akun | Tambah/edit/nonaktif pegawai; ubah email; email duplikat; hubungkan user dengan pegawai lain | Relasi email-user-pegawai konsisten; akses lama dicabut; duplikat ditolak. |
| Organisasi dan kantor | Admin Kecamatan menulis kecamatan lain; Desa salah kecamatan; kantor inactive; koordinat/radius invalid | Perubahan lintas wilayah/relasi salah ditolak; kantor nonaktif tidak menerima absensi. |
| Absensi dan GPS | Check-in dua kali, check-out tanpa check-in, check-out dua kali, request bersamaan, radius tepi, accuracy buruk, koordinat palsu | Satu record per pegawai/tanggal; transisi valid saja; server menghitung jarak; keterbatasan spoofing dicatat. |
| Jadwal dan libur | Jadwal tanpa konfigurasi, hari non-kerja, waktu di luar jendela, libur global/lokal, jadwal duplikat, perubahan jadwal | Keputusan absensi sesuai aturan yang disetujui; jadwal aktif deterministik; dashboard/report sejalan. |
| Tugas dinas | Rentang waktu WIB, belum mulai, aktif, kedaluwarsa, tujuan lintas wilayah, persetujuan berulang, self-approval | Hanya penugasan sah dan disetujui memberi akses; waktu mulai/akhir tepat; keputusan tercatat satu kali atau punya riwayat yang jelas. |
| Koreksi absensi | Waktu invalid, check-out sebelum check-in, lintas tengah malam, approve/reject, keputusan ganda | Data waktu/tanggal/late konsisten; keputusan di luar scope ditolak; perubahan historis dapat ditelusuri. |
| Laporan/dashboard | Pegawai aktif/nonaktif, hari libur, belum mulai kerja, absensi kantor tugas, rentang kosong/panjang | Jumlah cocok dengan dataset kontrol dan kebijakan kalender; filter lokasi tidak membuang tugas dinas yang relevan. |
| Audit dan database | Gagal menulis audit setelah perubahan; header salah; duplikasi ID/email; dua save bersamaan; backup dan restore | Aplikasi tidak mengembalikan status gagal untuk perubahan yang sebenarnya sudah committed tanpa rekonsiliasi; data pulih konsisten dan duplikat terdeteksi. |
| Performa | 100, lalu 500 pegawai; histori bertumbuh; beberapa permintaan serentak pada jam masuk | Ukur durasi, kuota, timeout/lock, ukuran respons, jumlah panggilan Spreadsheet/UrlFetch, dan tingkat duplikasi. |
| Frontend/responsif | Desktop, tablet, ponsel kecil; setiap role; navigasi berulang; loading/error; ekspor CSV | Tidak ada elemen penting tertutup/overflow tak terkendali; menu role sesuai server; aksi ganda dicegah; nilai CSV aman. |
| Konfigurasi Firebase | Authorized domains, Google provider, API key restrictions, ID project, Script Properties | Domain deployment dan provider tepat; konfigurasi tidak mengarah ke project lain; API key dibatasi sesuai dukungan Firebase. |

Pemeriksaan yang benar-benar dijalankan pada workspace: parser JavaScript menerima seluruh 16 file `.gs` sebagai satu kesatuan, serta blok JavaScript inline di `Scripts.html` dan `preview.html`. Ini hanya validasi sintaks; bukan uji fungsional atau validasi runtime Google Apps Script.

## Hal yang belum dapat diverifikasi

- Kepemilikan, isi, izin berbagi, backup, dan header spreadsheet yang ditunjuk oleh ID default/Script Property.
- Konfigurasi Firebase sebenarnya: Google provider, authorized domains, API key restrictions, pengguna, email verification, dan batas layanan.
- Mode deployment, daftar pengguna deployment, domain publik, deployment version, dan izin akun pemilik.
- Perilaku aktual kuota/latensi pada data dan beban 100–500 pengguna.
- Tampilan nyata pada browser/perangkat; CSS sudah dibaca, tetapi tidak ada pengujian visual/responsif pada browser.
- Struktur konfigurasi juga menyatakan desain empat spreadsheet namun source sekarang memakai satu spreadsheet. Status migrasi pemisahan tersebut tidak dapat disimpulkan selain belum tampak di source saat ini.
- `.clasp.json` menunjuk suatu Script ID; hubungan/otorisasi Script ID tersebut dengan project dan database produksi tidak dapat diperiksa dari workspace.

## Roadmap perbaikan menuju produksi

1. **Amankan deployment dan identitas terlebih dahulu.** Verifikasi project Firebase/Apps Script/spreadsheet yang benar; tutup akses langsung ke fungsi setup; paksa database ID eksplisit; validasi konfigurasi deployment serta Firebase domains/provider.
2. **Tutup batas otorisasi dan siklus akun.** Perbaiki validasi wilayah saat membuat kantor; sinkronkan perubahan email pegawai dengan akun lama; tambahkan pengujian role untuk semua endpoint dan payload yang dimanipulasi.
3. **Perkuat integritas tulis dan audit.** Tentukan constraint unik; tangani permintaan bersamaan dan retry; buat alur operasi parsial yang dapat direkonsiliasi; catat nilai perubahan sensitif tanpa menyimpan token/rahasia.
4. **Samakan aturan waktu dan absensi.** Samakan timezone project dan aplikasi; gunakan timestamp eksplisit; tetapkan kebijakan jadwal/libur/default tanpa jadwal; validasi tugas, koreksi, dan menit keterlambatan.
5. **Selesaikan model penempatan dan pelaporan.** Putuskan integrasi assignment reguler; tentukan populasi pegawai dan definisi “belum hadir”; rekonsiliasi absensi di kantor tugas dan kalender kerja.
6. **Ukur kapasitas dan kesiapan data.** Optimalkan pembacaan penuh/per-pegawai; tambah paginasi/arsip sesuai kebijakan; lakukan uji beban bertahap 100–500 pengguna; verifikasi backup dan pemulihan sebelum mengubah skema atau mengarsip data.
7. **Uji staging lintas modul dan perangkat.** Jalankan skenario di atas untuk seluruh role, Google login, GPS nyata, ponsel, ekspor, dan pemulihan. Catat hasil, waktu, error, serta keputusan risiko GPS residual.
8. **Rilis bertahap dengan rollback.** Buat snapshot spreadsheet dan versi Apps Script, lakukan pilot satu wilayah, pantau error/kuota/audit, lalu perluas hanya setelah indikator integritas dan akses terpenuhi.
