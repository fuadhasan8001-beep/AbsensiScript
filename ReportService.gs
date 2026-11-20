const ReportService = {
  get(c, p) {
    Access.requireRole(c, ['SUPER_ADMIN', 'ADMIN_KECAMATAN', 'ADMIN_DESA']);
    const from = String(p.from || Utils.dateKey(Utils.now())), to = String(p.to || from);
    const validDate = value => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(value + 'T00:00:00Z'); return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
    };
    if (!validDate(from) || !validDate(to) || from > to) throw new Error('Rentang tanggal tidak valid.');
    if ((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000 > 366) throw new Error('Rentang laporan maksimum 367 hari.');
    const offices = OfficeService.list(c), officeMap = new Map(offices.map(o => [String(o.officeId), o]));
    let employees = DB.rows('EMPLOYEES');
    if (p.employeeId) employees = employees.filter(e => String(e.employeeId) === String(p.employeeId));
    const employeeMap = new Map(employees.map(e => [String(e.employeeId), e]));
    if (p.officeId && !officeMap.has(String(p.officeId))) throw new Error('Kantor di luar cakupan akses.');
    if (p.districtId && !offices.some(o => String(o.districtId) === String(p.districtId))) throw new Error('Kecamatan di luar cakupan akses.');
    if (p.villageId && !offices.some(o => String(o.villageId) === String(p.villageId))) throw new Error('Desa di luar cakupan akses.');
    const rows = DB.rows('ATTENDANCES').filter(a => {
      const employee = employeeMap.get(String(a.employeeId)), office = officeMap.get(String(a.officeId));
      return employee && office && a.date >= from && a.date <= to && (!p.officeId || String(a.officeId) === String(p.officeId)) && (!p.districtId || String(office.districtId) === String(p.districtId)) && (!p.villageId || String(office.villageId) === String(p.villageId));
    }).slice(0, 20000);
    return { rows, summary: { total: rows.length, late: rows.filter(a => Number(a.lateMinutes) > 0).length, checkedOut: rows.filter(a => a.checkOutAt).length } };
  },
  dashboard(c) {
    if (c.role === 'PEGAWAI') {
      const attendance = AttendanceService.today(c);
      return { cards: [{ label: 'Status hari ini', value: attendance ? (attendance.checkOutAt ? 'Selesai' : 'Hadir') : 'Belum hadir' }, { label: 'Check-in', value: attendance?.checkInAt || '—' }, { label: 'Check-out', value: attendance?.checkOutAt || '—' }], rows: AttendanceService.history(c, { limit: 8 }) };
    }
    const today = Utils.dateKey(Utils.now()), now = Utils.now(), allEmployees = DB.rows('EMPLOYEES'), offices = new Map(DB.rows('OFFICES').map(o => [String(o.officeId), o]));
    const schedules = new Map();
    DB.rows('WORK_SCHEDULES').filter(s => String(s.status).toUpperCase() === 'ACTIVE').forEach(schedule => {
      const officeId = String(schedule.officeId);
      if (schedules.has(officeId)) schedules.set(officeId, null);
      else schedules.set(officeId, schedule);
    });
    const duties = DB.rows('DUTY_ASSIGNMENTS').filter(d => d.status === 'APPROVED' && Utils.parseDateTime(d.startAt) <= now && Utils.parseDateTime(d.endAt) >= now && Access.officeScope(c, offices.get(String(d.officeId)) || {}));
    const dutyEmployees = new Set(duties.map(d => String(d.employeeId)));
    const active = allEmployees.filter(e => String(e.status).toUpperCase() === 'ACTIVE' && (!e.startDate || String(e.startDate).slice(0, 10) <= today) && (Access.officeScope(c, offices.get(String(e.primaryOfficeId)) || {}) || dutyEmployees.has(String(e.employeeId))));
    const expected = new Set();
    active.forEach(employee => {
      const home = offices.get(String(employee.primaryOfficeId)), schedule = home && schedules.get(String(home.officeId));
      if (home && schedule && String(home.status).toUpperCase() === 'ACTIVE') {
        const day = Number(Utilities.formatDate(Utils.now(), APP.TZ, 'u'));
        if (String(schedule.days).split(',').includes(String(day)) && !ScheduleService.isHoliday(home, today)) expected.add(String(employee.employeeId));
      }
    });
    duties.forEach(duty => {
      const office = offices.get(String(duty.officeId)), schedule = office && schedules.get(String(office.officeId)), employee = active.find(e => String(e.employeeId) === String(duty.employeeId));
      const day = Number(Utilities.formatDate(Utils.now(), APP.TZ, 'u'));
      if (employee && office && schedule && String(office.status).toUpperCase() === 'ACTIVE' && String(schedule.days).split(',').includes(String(day)) && !ScheduleService.isHoliday(office, today)) expected.add(String(employee.employeeId));
    });
    const expectedEmployees = active.filter(e => expected.has(String(e.employeeId))), ids = new Set(expectedEmployees.map(e => String(e.employeeId)));
    const attendance = DB.rows('ATTENDANCES').filter(a => a.date === today && ids.has(String(a.employeeId)));
    const present = new Set(attendance.map(a => String(a.employeeId)));
    return { cards: [{ label: 'Pegawai aktif', value: active.length }, { label: 'Dijadwalkan hari ini', value: expected.size }, { label: 'Terlambat', value: attendance.filter(a => Number(a.lateMinutes) > 0).length }, { label: 'Belum hadir', value: Math.max(0, expected.size - present.size) }], rows: attendance };
  }
};
