# Data dummy Tulungagung

`TulungagungSeed.gs` menyediakan data wilayah, kantor contoh, pegawai contoh, dan akun admin kecamatan contoh.

## Menjalankan seeder

1. Buka project ini di Google Apps Script menggunakan akun pemilik project.
2. Pastikan Script Property `DATABASE_SPREADSHEET_ID` menunjuk ke spreadsheet database (atau spreadsheet default sudah dapat diakses).
3. Pilih fungsi `seedTulungagungDummyData` di editor Apps Script, lalu klik **Run** dan setujui akses spreadsheet.
4. Fungsi dapat dijalankan ulang. Baris yang sudah ada tidak ditimpa; hanya baris yang belum ditemukan berdasarkan ID/email yang ditambahkan.

Seeder menghasilkan 19 kecamatan, 271 desa/kelurahan, 19 kantor contoh, 19 pegawai contoh, 19 admin kecamatan contoh, serta 38 akun contoh. Akun contoh memakai domain email `example.test`; kantor, pegawai, dan akun disetel `INACTIVE`, koordinat kantor sengaja kosong, dan seluruh identitas diberi label dummy. Data tersebut tidak dapat dipakai untuk login atau presensi. Aktifkan hanya akun dan kantor nyata yang sudah diverifikasi.

## Sumber dan batasan

Nama dan kode wilayah disusun dari BPS, *Master File Desa Provinsi Jawa Timur 2022*, bagian Kabupaten Tulungagung (Tabel 9–10). Publikasi BPS tersebut mencatat 19 kecamatan serta total 271 desa/kelurahan. Ini data referensi tahun 2022, bukan data pegawai resmi. Nama pegawai, NIP, email, dan kantor adalah contoh sintetis.

- [BPS Tulungagung — publikasi statistik](https://tulungagungkab.bps.go.id/id/publication/)
- [BPS — Master File Wilayah Kabupaten Tulungagung, Tabel 9–10 (2022)](https://web-api.bps.go.id/download.php?f=3ozGKFLJXF37JJc61eUKzDhmOTNWcERRZlhneUwyOCtmMnBFT3ZDc2hwck9Bd0NNZTZWZjZOYXVuaWVtYzczOURsTkV3d0dmQ3hJM05KbTg2RnBVa2ZTZmxtdWVFWE1oRWQrU3Vld05UWUFGZW1nZmg5SHlUR2JkQ2V0a1U3WW44bytYTldsL3JRV2ZQYWNrS3NIMTRtSHVrZ2lWWmI3d1VlekROcHZqbFhuOUdDVXcyNzdtSGNWNlQvY1BOc0d3RlhYRlJ1UnhpQ0FLeW9oekRnZXhMbERsNTZXbDZkUEZkQm90RDA4bjBlT1RoNXJ4RU5FL0JzNjZvTTRVZTBvU0FVZm14WDNvVVlEL0FWQ2UxVFRnTldEc0ZQMW5oZUN3VkNhQzhnPT0%3D)
