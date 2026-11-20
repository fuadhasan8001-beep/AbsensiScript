# Arsitektur dan batas sistem

Browser menggunakan HTML Service, Firebase Google Sign-In, dan Geolocation API. Frontend memperoleh Firebase ID token yang valid lewat `getIdToken()` pada setiap request ke endpoint tunggal `api(action,payload)`. Backend memverifikasi token melalui Identity Toolkit, memastikan email terverifikasi dan akun `USERS` aktif, lalu mengirim aksi ke router yang memiliki allowlist.

`Code.gs` berisi endpoint web, router, dan fungsi setup privat berakhiran `_`. Fungsi helper server selain `doGet`, `include`, dan `api` diakhiri `_` atau menjadi method object; fungsi setup tidak tersedia sebagai pemanggilan `google.script.run`. Konteks role dan wilayah berasal dari record server `USERS`, bukan payload scope.

Google Sheets menjadi satu database spreadsheet dengan satu tab per tabel. `TABLES` merupakan kontrak header; koneksi mewajibkan Script Property `DATABASE_SPREADSHEET_ID`, dan `doGet` memvalidasi semua header yang telah ada. Inisialisasi hanya menambahkan tab/header yang belum ada setelah validasi tab lama. Setiap request API menggunakan cache baris per eksekusi yang diinvalidasi oleh operasi write. Lookup peta menghindari pembacaan sheet berulang pada sebagian list/report.

Google Sheets tidak menyediakan transaksi relasional. Beberapa read-modify-write kritis memakai `ScriptLock`, validasi aplikasi menegakkan kunci unik untuk insert/update, dan perubahan identitas pegawai menulis penanda audit mulai/selesai/gagal serta mencoba kompensasi. Kunci tidak menjamin transaksi; timeout/kuota dapat meninggalkan kondisi parsial yang harus direkonsiliasi dari audit dan relasi data. Belum ada idempotency key persisten atau mekanisme transaksional umum.

Semua tanggal bisnis memakai kalender `Asia/Jakarta`; timestamp disimpan dengan offset eksplisit `+07:00`. String `datetime-local` ditafsirkan sebagai WIB di server. Jadwal lintas tengah malam belum didukung.

GPS divalidasi ulang di server dengan Haversine, radius, status kantor, rentang koordinat dan ambang akurasi. Nilai lokasi tetap dikirim browser sehingga spoofing mungkin terjadi. Hari libur global (officeId kosong) berlaku umum; hari libur dengan `officeId` berlaku ke kantor tersebut. Penempatan reguler menggunakan `EMPLOYEES.primaryOfficeId`; `EMPLOYEE_ASSIGNMENTS` belum menentukan penempatan efektif sampai aturan bisnis (prioritas dan rentang) disepakati.

Skala Sheets/Apps Script memiliki batas kuota dan waktu eksekusi. Optimasi statis belum menjadi bukti kapasitas untuk 100–500 pegawai; pengukuran beban dan konkurensi wajib dilakukan di staging.
