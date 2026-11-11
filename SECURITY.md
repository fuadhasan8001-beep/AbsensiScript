# Keamanan

- Firebase token diverifikasi server-side melalui Identity Toolkit; email dari payload klien tidak digunakan sebagai identitas.
- Status USERS dan role diperiksa setiap pemanggilan API.
- Validasi GPS server-side; batas accuracy 100 m dapat disesuaikan di `Config.gs`.
- Check-in/out memakai ScriptLock dan waktu server.
- Spreadsheet tidak dibagikan ke pengguna.
- GPS browser dapat dimanipulasi; gunakan audit dan kebijakan operasional tambahan.

Sebelum produksi, tinjau pembatasan wilayah setiap service, sanitasi output HTML, rate limiting, retensi lokasi, backup, dan pengujian penetration. Jangan catat token atau rahasia dalam log.
