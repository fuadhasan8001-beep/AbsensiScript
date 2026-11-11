# Skema database

`DB.init()` membentuk satu tab per tabel, memakai baris pertama sebagai header. ID bertipe string UUID berprefiks; tanggal absensi `yyyy-MM-dd`, timestamp ISO dengan timezone Jakarta. Sheet yang diperlukan berada dalam `DATABASE_SPREADSHEET_ID`.

| Tab | Primary ID | Relasi/kolom utama |
|---|---|---|
| USERS | userId | email, role, status, employeeId, districtId, villageId |
| ROLES | roleId | name, description |
| KECAMATAN | districtId | name, code, status |
| DESA | villageId | districtId, name, code, status |
| OFFICES | officeId | districtId, villageId, koordinat, radiusM, status |
| EMPLOYEES | employeeId | email, primaryOfficeId, status |
| EMPLOYEE_ASSIGNMENTS | assignmentId | employeeId, officeId, rentang tanggal |
| WORK_SCHEDULES | scheduleId | officeId, hari dan rentang waktu |
| HOLIDAYS | holidayId | date, type, officeId |
| DUTY_ASSIGNMENTS | dutyId | employeeId, officeId, rentang, approval |
| DUTY_ASSIGNMENT_APPROVALS | approvalId | dutyId, actorId, decision |
| ATTENDANCE_ADJUSTMENTS | adjustmentId | attendanceId, before/proposed JSON, status |
| ATTENDANCES | attendanceId | employeeId, officeId, dutyId, waktu/koordinat check-in/out |
| AUDIT_LOGS | auditId | actorId, action, entity, detailsJson |

Email pengguna harus unik; koordinat valid dalam rentang latitude/longitude; attendance unik per employeeId+date; penugasan perlu waktu akhir setelah waktu mulai. Skema versi awal belum memasang validasi data spreadsheet atau indeks terpisah. Pemisahan MASTER/OPERATIONAL/ATTENDANCE/AUDIT per spreadsheet dan pengarsipan belum diimplementasikan.
