# Arsitektur

Browser menggunakan HTML Service, Firebase Google Sign-In, dan Geolocation API. Firebase ID token dikirim pada setiap pemanggilan `api()`. Backend Apps Script meminta Identity Toolkit `accounts:lookup` untuk memvalidasi token dan memastikan email terverifikasi, lalu mencocokkan email terhadap USERS aktif. API hanya mengembalikan pesan error terkendali.

Backend modular berjalan dengan identitas pemilik deployment, sehingga identitas aplikasi berasal dari token Firebase dan akses spreadsheet berada di bawah pemilik. Jangan membuka spreadsheet kepada pengguna aplikasi. GPS dihitung ulang di server dengan Haversine, radius dan batas accuracy; GPS browser tetap dapat dipalsukan.

Sheets dibagi menjadi empat spreadsheet terpisah, masing-masing ID pada Script Properties: `MASTER_DATA_SPREADSHEET_ID`, `OPERATIONAL_DATA_SPREADSHEET_ID`, `ATTENDANCE_DATA_SPREADSHEET_ID`, `AUDIT_LOGS_SPREADSHEET_ID`. Untuk kompatibilitas awal, versi kode sekarang memakai satu properti `DATABASE_SPREADSHEET_ID` dan memuat seluruh tabel di satu spreadsheet; pemisahan fisik adalah pekerjaan produksi yang belum diterapkan.

Transaksi check-in/out menggunakan ScriptLock. Saat skala meningkat, Sheets dan Apps Script punya kuota serta batas konkurensi; ukur beban aktual dan pertimbangkan database transaksional sebelum perluasan.
