# Testing report

Tanggal: 19 November 2026. Pengujian yang dijalankan hanya pada source/mocks lokal; tidak ada akses staging Google/Firebase atau spreadsheet live.

## PASS — dijalankan

| Test | Input/tujuan | Expected | Actual | Status |
|---|---|---|---|---|
| WIB datetime-local | `2026-11-19T08:00` | Instant `01:00Z`; timestamp tersimpan offset `+07:00` | Sesuai | PASS |
| Tanggal invalid | `2026-02-30` | Ditolak | Ditolak | PASS |
| GPS rentang dan akurasi | Latitude 91, Infinity, accuracy 101, kantor nonaktif | Ditolak | Ditolak | PASS |
| GPS radius | Titik kantor dan titik ±>100 m | Dalam radius diterima, luar radius ditolak | Sesuai | PASS |
| Unique attendance | employeeId/date yang sama | Duplikasi ditolak; update row sendiri diterima | Sesuai | PASS |
| CSV formula escaping | `=1+1`, `@cmd`, koma/kutip | Formula dinetralkan dan CSV quoted | Sesuai | PASS |
| Parse backend Apps Script | Semua `.gs` digabung, `node --check` | Tidak ada kesalahan sintaks JavaScript | Lolos parser Node | PASS (pemeriksaan sintaks statis saja) |
| Parse frontend | Isi script `Scripts.html`, `node --check` | Tidak ada kesalahan sintaks JavaScript | Lolos parser Node | PASS (pemeriksaan sintaks statis saja) |

Perintah unit: `node --test tests/unit.test.js` (6 PASS, 0 FAIL). Test lokal tidak memakai service live dan tidak membuktikan integrasi Apps Script.

## BLOCKED — perlu lingkungan staging

| Test | Expected | Aktual | Status / kebutuhan |
|---|---|---|---|
| Fungsi setup dari sesi anonim / direct invocation | Fungsi privat tidak tersedia; API resmi tetap berfungsi | Belum diuji pada Google Web App | BLOCKED — deploy staging |
| Auth: token valid/expired/revoked, user aktif/nonaktif | Akses sesuai status Firebase+USERS | Belum diuji | BLOCKED — Firebase staging |
| Scope kantor lintas kecamatan/desa dan manipulasi payload | Semua lintas wilayah ditolak | Belum dijalankan terhadap SpreadsheetApp | BLOCKED — seed staging untuk 2 kecamatan/desa |
| Email pegawai lama/baru, benturan, kegagalan antar-sheet | Email lama ditolak oleh USERS nonaktif; konflik ditolak; partial dapat direkonsiliasi | Belum menjalankan mock saga/failure injection atau Firebase login | BLOCKED — Firebase/Sheets staging |
| Konkurensi insert pegawai dan check-in | Satu record; retry tidak menggandakan | Lock/unique statis ditinjau; no concurrent execution run | BLOCKED — test deployment konkuren |
| Jadwal, hari libur, akhir pekan, batas jam | Semua boundary WIB sesuai kebijakan | Unit WIB parsial; belum run service integration 07:59/08:00/08:01 | BLOCKED — staging dan data kontrol |
| Koreksi dan audit | Timestamp/date/late dihitung ulang; nilai sebelum/sesudah dapat ditelusuri | Belum menjalankan write mock atau sheet | BLOCKED — staging |
| Keputusan tugas ganda dan scope | Hanya PENDING dapat diputus sekali oleh role/scope sah | Belum menjalankan service integration | BLOCKED — staging |
| Dashboard/report control totals | Aktif, startDate, jadwal, libur, tugas, record kantor selaras | Belum dibandingkan dengan dataset kontrol | BLOCKED — staging |
| Header database, startup fail closed, init/restore | Mismatch ditolak tanpa write; setup staging idempoten | Source ditinjau; belum ada SpreadsheetApp mock/live | BLOCKED — staging |
| Browser visual, responsive, console, flows seluruh role | Tidak ada error/regresi | Tidak dijalankan | BLOCKED — browser QA |
| Beban 100/300/500 pegawai dan request bersamaan | Catat durasi, sheet IO, respons, quota, timeout, duplikasi | Tidak diukur; tidak ada dataset staging | BLOCKED — load test staging |
| Backup/restore dan deployment rollback | Pulih ke spreadsheet staging baru dan verifikasi | Prosedur terdokumentasi, belum dieksekusi | BLOCKED — operator staging |

Tidak ada hasil yang dinyatakan lulus berdasarkan simulasi live yang tidak dilakukan. Lihat `PRODUCTION_READINESS.md` untuk prasyarat lanjut.
