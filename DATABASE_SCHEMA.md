# Skema database

`DB.init()` membentuk satu tab per tabel di spreadsheet yang ditentukan oleh Script Property `DATABASE_SPREADSHEET_ID`. Header dan urutannya mengikuti `TABLES` di `Config.gs`; pada API startup, semua tab yang ada diperiksa sebelum aplikasi lanjut. Tidak ada fallback spreadsheet ID. Tanggal kehadiran menggunakan `yyyy-MM-dd`; timestamp disimpan sebagai ISO dengan offset `+07:00`.

| Tab | Primary ID | Relasi/kolom utama | Keunikan aplikasi |
|---|---|---|---|
| USERS | userId | employeeId, districtId, villageId | userId, email |
| ROLES | roleId | name, description | roleId |
| KECAMATAN | districtId | name, code, status | districtId, code |
| DESA | villageId | districtId, name, code, status | villageId, code |
| OFFICES | officeId | districtId, villageId, koordinat, radius, status | officeId |
| EMPLOYEES | employeeId | email, primaryOfficeId, status, startDate | employeeId, email, identityNo nonkosong |
| EMPLOYEE_ASSIGNMENTS | assignmentId | employeeId, officeId, rentang tanggal | assignmentId |
| WORK_SCHEDULES | scheduleId | officeId, hari dan rentang waktu | scheduleId; satu jadwal ACTIVE per office divalidasi saat save |
| HOLIDAYS | holidayId | date, type, officeId opsional | holidayId |
| DUTY_ASSIGNMENTS | dutyId | employeeId, officeId, rentang, approval | dutyId |
| DUTY_ASSIGNMENT_APPROVALS | approvalId | dutyId, actorId, decision | approvalId |
| ATTENDANCE_ADJUSTMENTS | adjustmentId | attendanceId, before/proposed JSON, status | adjustmentId |
| ATTENDANCES | attendanceId | employeeId, officeId, dutyId, timestamp/koordinat check-in/out | attendanceId dan pasangan employeeId+date |
| AUDIT_LOGS | auditId | actorId, action, entity, detailsJson | auditId |

Keunikan adalah validasi aplikasi, bukan constraint yang dijamin Google Sheets. Data lama tidak otomatis dihapus atau dideduplikasi. Sebelum menghubungkan spreadsheet lama, audit duplikasi ID/email/employeeId+date dan relasi wilayah secara manual di staging. Aplikasi tidak menjalankan reset database.

Relasi logis: USERS→EMPLOYEES/KECAMATAN/DESA; DESA→KECAMATAN; OFFICES→KECAMATAN/DESA; EMPLOYEES→OFFICES; EMPLOYEE_ASSIGNMENTS→EMPLOYEES/OFFICES; WORK_SCHEDULES/HOLIDAYS→OFFICES; DUTY_ASSIGNMENTS→EMPLOYEES/OFFICES; approvals→DUTY_ASSIGNMENTS; ATTENDANCES→EMPLOYEES/OFFICES/DUTY_ASSIGNMENTS; ADJUSTMENTS→ATTENDANCES.

Semua baris menyimpan koordinat GPS check-in/out, akurasi, dan jarak. Retensi/purge belum otomatis dan membutuhkan keputusan pemilik data.
