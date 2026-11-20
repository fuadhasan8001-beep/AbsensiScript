const AttendanceService = {
  today(c) {
    const employee = this.myEmployee(c), date = Utils.dateKey(Utils.now());
    return DB.rows('ATTENDANCES').find(a => String(a.employeeId) === String(employee.employeeId) && a.date === date) || null;
  },
  myEmployee(c) {
    const employee = DB.by('EMPLOYEES', 'employeeId', c.employeeId);
    if (!employee || String(employee.status).toUpperCase() !== 'ACTIVE') throw new Error('Data pegawai aktif tidak ditemukan.');
    return employee;
  },
  history(c, p = {}) {
    const id = p.employeeId || c.employeeId;
    Access.employee(c, id);
    const limit = Math.min(Math.max(Number(p.limit) || 120, 1), 200), offset = Math.max(Number(p.offset) || 0, 0);
    return DB.rows('ATTENDANCES').filter(a => String(a.employeeId) === String(id)).sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.checkInAt).localeCompare(String(a.checkInAt))).slice(offset, offset + limit);
  },
  punch(c, p, kind) {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const employee = this.myEmployee(c), now = Utils.now(), date = Utils.dateKey(now);
      let attendance = DB.rows('ATTENDANCES').find(row => String(row.employeeId) === String(employee.employeeId) && row.date === date);
      if (kind === 'in' && attendance) throw new Error('Anda sudah melakukan check-in hari ini.');
      if (kind === 'out' && (!attendance || !attendance.checkInAt)) throw new Error('Anda belum melakukan check-in.');
      if (kind === 'out' && attendance.checkOutAt) throw new Error('Anda sudah melakukan check-out hari ini.');
      if (kind === 'out' && String(p.officeId || attendance.officeId) !== String(attendance.officeId)) throw new Error('Check-out harus dilakukan di kantor yang sama dengan check-in.');
      const homeOffice = DB.by('OFFICES', 'officeId', employee.primaryOfficeId);
      if (!homeOffice || String(homeOffice.status).toUpperCase() !== 'ACTIVE') throw new Error('Lokasi kantor utama tidak tersedia atau tidak aktif.');
      let duty = null, office = homeOffice;
      if (p.officeId && String(p.officeId) !== String(homeOffice.officeId)) {
        duty = DB.rows('DUTY_ASSIGNMENTS').find(row => String(row.employeeId) === String(employee.employeeId) && String(row.officeId) === String(p.officeId) && row.status === 'APPROVED' && Utils.parseDateTime(row.startAt) <= now && Utils.parseDateTime(row.endAt) >= now);
        if (!duty) throw new Error('Anda belum memiliki penugasan yang disetujui untuk kantor ini.');
        office = DB.by('OFFICES', 'officeId', p.officeId);
      }
      if (!office || String(office.status).toUpperCase() !== 'ACTIVE') throw new Error('Lokasi kantor tujuan tidak ditemukan atau tidak aktif.');
      const gps = GPSService.validate(p, office);
      const schedule = ScheduleService.forOffice(office.officeId);
      if (!schedule) throw new Error('Kantor belum memiliki jadwal aktif. Hubungi administrator sebelum melakukan absensi.');
      if (ScheduleService.isHoliday(office, date)) throw new Error('Absensi tidak tersedia karena tanggal ini tercatat sebagai hari libur.');
      const hm = Utilities.formatDate(now, APP.TZ, 'HH:mm'), day = Number(Utilities.formatDate(now, APP.TZ, 'u'));
      if (!String(schedule.days).split(',').includes(String(day))) throw new Error('Hari ini bukan hari kerja sesuai jadwal.');
      const start = kind === 'in' ? schedule.checkInStart : schedule.checkOutStart, end = kind === 'in' ? schedule.checkInEnd : schedule.checkOutEnd;
      if (hm < start || hm > end) throw new Error('Waktu ' + (kind === 'in' ? 'check-in' : 'check-out') + ' di luar jadwal.');
      if (kind === 'in') {
        const workStart = Utils.jakartaTime(date, schedule.workStart);
        const lateMinutes = Math.max(0, Math.floor((now.getTime() - workStart.getTime()) / 60000) - Number(schedule.lateToleranceM || 0));
        attendance = { attendanceId: Utils.id('att'), employeeId: employee.employeeId, date, officeId: office.officeId, dutyId: duty?.dutyId || '', checkInAt: Utils.iso(now), checkInLat: gps.lat, checkInLng: gps.lng, checkInAccuracy: gps.acc, checkInDistanceM: gps.distance, checkOutAt: '', checkOutLat: '', checkOutLng: '', checkOutAccuracy: '', checkOutDistanceM: '', lateMinutes, createdAt: Utils.iso(now) };
        DB.append('ATTENDANCES', attendance);
      } else {
        attendance = DB.update('ATTENDANCES', 'attendanceId', attendance.attendanceId, { checkOutAt: Utils.iso(now), checkOutLat: gps.lat, checkOutLng: gps.lng, checkOutAccuracy: gps.acc, checkOutDistanceM: gps.distance });
      }
      AuditService.log(c, kind === 'in' ? 'CHECK_IN' : 'CHECK_OUT', 'ATTENDANCES', attendance.attendanceId, { officeId: office.officeId, distanceM: gps.distance });
      return attendance;
    } finally { lock.releaseLock(); }
  },
  correction(c, p) {
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      const attendance = DB.by('ATTENDANCES', 'attendanceId', p.attendanceId);
      if (!attendance) throw new Error('Absensi tidak ditemukan.');
      Access.employee(c, attendance.employeeId);
      const proposed = p.proposed || {};
      ['checkInAt', 'checkOutAt'].forEach(key => { if (proposed[key] !== undefined && proposed[key] !== '') proposed[key] = Utils.iso(Utils.parseDateTime(proposed[key], key)); });
      if (!proposed.checkInAt && !proposed.checkOutAt) throw new Error('Isi waktu check-in atau check-out yang diusulkan.');
      const reason = Utils.clean(p.reason), proposedJson = Utils.json(proposed);
      const retry = DB.rows('ATTENDANCE_ADJUSTMENTS').find(row => String(row.attendanceId) === String(attendance.attendanceId) && String(row.requestedBy) === String(c.id) && row.status === 'PENDING' && row.proposedJson === proposedJson && row.reason === reason);
      if (retry) return { adjustmentId: retry.adjustmentId, status: 'PENDING' };
      const id = Utils.id('adj');
      DB.append('ATTENDANCE_ADJUSTMENTS', { adjustmentId: id, attendanceId: attendance.attendanceId, employeeId: attendance.employeeId, date: attendance.date, beforeJson: Utils.json(attendance), proposedJson, reason, requestedBy: c.id, status: 'PENDING', decidedBy: '', decidedAt: '', createdAt: Utils.iso(Utils.now()) });
      AuditService.log(c, 'CORRECTION_REQUEST', 'ATTENDANCE_ADJUSTMENTS', id, {});
      return { adjustmentId: id, status: 'PENDING' };
    } finally { lock.releaseLock(); }
  },
  correctionList(c) {
    Access.requireRole(c, ['SUPER_ADMIN', 'ADMIN_KECAMATAN', 'ADMIN_DESA']);
    const employees = new Map(DB.rows('EMPLOYEES').map(e => [String(e.employeeId), e]));
    const offices = new Map(DB.rows('OFFICES').map(o => [String(o.officeId), o]));
    return DB.rows('ATTENDANCE_ADJUSTMENTS').filter(item => {
      const employee = employees.get(String(item.employeeId)), office = employee && offices.get(String(employee.primaryOfficeId));
      return office && Access.officeScope(c, office);
    }).reverse();
  },
  correctionDecision(c, p) {
    Access.requireRole(c, ['SUPER_ADMIN', 'ADMIN_KECAMATAN', 'ADMIN_DESA']);
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      const item = DB.by('ATTENDANCE_ADJUSTMENTS', 'adjustmentId', p.adjustmentId);
      const employee = item && DB.by('EMPLOYEES', 'employeeId', item.employeeId);
      const office = employee && DB.by('OFFICES', 'officeId', employee.primaryOfficeId);
      if (!item || !office || !Access.officeScope(c, office) || !['APPROVED', 'REJECTED'].includes(p.decision) || item.status !== 'PENDING') throw new Error('Koreksi tidak valid atau di luar kewenangan.');
      let after = null;
      if (p.decision === 'APPROVED') {
        const current = DB.by('ATTENDANCES', 'attendanceId', item.attendanceId);
        if (!current) throw new Error('Record absensi sudah tidak ditemukan.');
        const proposed = JSON.parse(item.proposedJson || '{}'), checkInAt = proposed.checkInAt ? Utils.parseDateTime(proposed.checkInAt) : Utils.parseDateTime(current.checkInAt);
        const checkOutAt = proposed.checkOutAt ? Utils.parseDateTime(proposed.checkOutAt) : (current.checkOutAt ? Utils.parseDateTime(current.checkOutAt) : null);
        if (checkOutAt && checkOutAt < checkInAt) throw new Error('Check-out tidak boleh sebelum check-in.');
        const date = Utils.dateKey(checkInAt), schedule = ScheduleService.forOffice(current.officeId);
        if (!schedule) throw new Error('Jadwal aktif kantor tidak tersedia; koreksi tidak dapat dihitung ulang.');
        const start = Utils.jakartaTime(date, schedule.workStart);
        const lateMinutes = Math.max(0, Math.floor((checkInAt.getTime() - start.getTime()) / 60000) - Number(schedule.lateToleranceM || 0));
        after = DB.update('ATTENDANCES', 'attendanceId', current.attendanceId, { checkInAt: Utils.iso(checkInAt), checkOutAt: checkOutAt ? Utils.iso(checkOutAt) : '', date, lateMinutes });
      }
      DB.update('ATTENDANCE_ADJUSTMENTS', 'adjustmentId', item.adjustmentId, { status: p.decision, decidedBy: c.id, decidedAt: Utils.iso(Utils.now()) });
      AuditService.log(c, 'CORRECTION_' + p.decision, 'ATTENDANCE_ADJUSTMENTS', item.adjustmentId, { before: item.beforeJson, after: after ? Utils.json(after) : '' });
      return { adjustmentId: item.adjustmentId, status: p.decision };
    } finally { lock.releaseLock(); }
  }
};
