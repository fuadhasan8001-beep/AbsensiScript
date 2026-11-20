const APP = Object.freeze({ NAME: 'Sistem Informasi Absensi Instansi', TZ: 'Asia/Jakarta', VERSION: '0.1.0', MAX_GPS_ACCURACY_M: 100, CACHE_SECONDS: 300 });
// Database harus ditentukan eksplisit melalui Script Property.
const TABLES = Object.freeze({
  USERS:['userId','email','role','status','employeeId','districtId','villageId','createdAt','updatedAt'],
  ROLES:['roleId','name','description'], KECAMATAN:['districtId','name','code','status'], DESA:['villageId','districtId','name','code','status'],
  OFFICES:['officeId','name','type','districtId','villageId','address','latitude','longitude','radiusM','status'],
  EMPLOYEES:['employeeId','identityNo','name','email','phone','position','unit','primaryOfficeId','status','startDate','createdAt'],
  EMPLOYEE_ASSIGNMENTS:['assignmentId','employeeId','officeId','startDate','endDate','createdBy','createdAt'],
  WORK_SCHEDULES:['scheduleId','officeId','days','checkInStart','checkInEnd','checkOutStart','checkOutEnd','workStart','workEnd','lateToleranceM','status'],
  HOLIDAYS:['holidayId','date','name','type','officeId'],
  DUTY_ASSIGNMENTS:['dutyId','employeeId','officeId','startAt','endAt','reason','requestedBy','status','approvedBy','decidedAt','createdAt'],
  DUTY_ASSIGNMENT_APPROVALS:['approvalId','dutyId','actorId','decision','note','createdAt'],
  ATTENDANCE_ADJUSTMENTS:['adjustmentId','attendanceId','employeeId','date','beforeJson','proposedJson','reason','requestedBy','status','decidedBy','decidedAt','createdAt'],
  ATTENDANCES:['attendanceId','employeeId','date','officeId','dutyId','checkInAt','checkInLat','checkInLng','checkInAccuracy','checkInDistanceM','checkOutAt','checkOutLat','checkOutLng','checkOutAccuracy','checkOutDistanceM','lateMinutes','createdAt'],
  AUDIT_LOGS:['auditId','actorId','action','entity','entityId','detailsJson','createdAt']
});
const UNIQUE_KEYS = Object.freeze({
  USERS: [['userId'], ['email']], ROLES: [['roleId'], ['name']], KECAMATAN: [['districtId'], ['code']], DESA: [['villageId'], ['code']],
  OFFICES: [['officeId']], EMPLOYEES: [['employeeId'], ['email'], ['identityNo']],
  EMPLOYEE_ASSIGNMENTS: [['assignmentId']], WORK_SCHEDULES: [['scheduleId']], HOLIDAYS: [['holidayId']],
  DUTY_ASSIGNMENTS: [['dutyId']], DUTY_ASSIGNMENT_APPROVALS: [['approvalId']],
  ATTENDANCE_ADJUSTMENTS: [['adjustmentId']], ATTENDANCES: [['attendanceId'], ['employeeId','date']], AUDIT_LOGS: [['auditId']]
});
function prop_(key, required=true){const v=PropertiesService.getScriptProperties().getProperty(key);if(required&&!v)throw new Error('Konfigurasi server belum lengkap: '+key);return v;}
