const ScheduleService = {
  list(c) {
    const offices = new Map(DB.rows('OFFICES').map(o => [String(o.officeId), o]));
    return DB.rows('WORK_SCHEDULES').filter(schedule => Access.officeScope(c, offices.get(String(schedule.officeId)) || {}));
  },
  forOffice(id) {
    const cache = CacheService.getScriptCache(), key = 'schedule:' + id, hit = cache.get(key);
    if (hit) return JSON.parse(hit);
    const active = DB.rows('WORK_SCHEDULES').filter(row => String(row.officeId) === String(id) && String(row.status).toUpperCase() === 'ACTIVE');
    if (active.length > 1) throw new Error('Kantor memiliki beberapa jadwal aktif; administrator harus merekonsiliasi konfigurasi jadwal.');
    const schedule = active[0] || null;
    if (schedule) cache.put(key, JSON.stringify(schedule), APP.CACHE_SECONDS);
    return schedule;
  },
  isHoliday(office, date) {
    return DB.rows('HOLIDAYS').some(holiday => String(holiday.date) === String(date) && (!holiday.officeId || String(holiday.officeId) === String(office.officeId)));
  },
  save(c, p) {
    Access.requireRole(c, ['SUPER_ADMIN', 'ADMIN_KECAMATAN']);
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      const d = p.schedule || {}, prior = d.scheduleId ? DB.by('WORK_SCHEDULES', 'scheduleId', d.scheduleId) : null;
      if (d.scheduleId) {
        const priorOffice = prior && DB.by('OFFICES', 'officeId', prior.officeId);
        if (!prior || !priorOffice || !Access.officeScope(c, priorOffice)) throw new Error('Jadwal di luar kewenangan.');
      }
      const office = DB.by('OFFICES', 'officeId', d.officeId || prior?.officeId);
      if (!office || String(office.status).toUpperCase() !== 'ACTIVE' || !Access.officeScope(c, office)) throw new Error('Kantor tidak aktif atau di luar kewenangan.');
      const days = String(d.days || prior?.days || '1,2,3,4,5').split(',').map(x => x.trim());
      if (!days.length || days.some(x => !/^[1-7]$/.test(x)) || new Set(days).size !== days.length) throw new Error('Hari kerja harus berisi angka unik 1–7.');
      const times = {};
      ['checkInStart','checkInEnd','checkOutStart','checkOutEnd','workStart','workEnd'].forEach(key => {
        const value = String(d[key] || prior?.[key] || '');
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Format jam jadwal tidak valid: ' + key);
        times[key] = value;
      });
      if (times.workStart >= times.workEnd || times.checkInStart > times.checkInEnd || times.checkOutStart > times.checkOutEnd) throw new Error('Rentang jam jadwal tidak valid; jadwal lintas tengah malam belum didukung.');
      const tolerance = Number(d.lateToleranceM === undefined ? (prior?.lateToleranceM || 0) : d.lateToleranceM);
      if (!Number.isInteger(tolerance) || tolerance < 0 || tolerance > 240) throw new Error('Toleransi keterlambatan harus 0–240 menit.');
      const status = String(d.status || prior?.status || 'ACTIVE').toUpperCase();
      if (!['ACTIVE', 'INACTIVE'].includes(status)) throw new Error('Status jadwal tidak valid.');
      const id = prior?.scheduleId || Utils.id('sch');
      if (status === 'ACTIVE') {
        const conflict = DB.rows('WORK_SCHEDULES').find(row => String(row.officeId) === String(office.officeId) && String(row.status).toUpperCase() === 'ACTIVE' && String(row.scheduleId) !== String(id));
        if (conflict) throw new Error('Kantor sudah memiliki jadwal aktif. Nonaktifkan jadwal lama sebelum membuat pengganti.');
      }
      const schedule = { scheduleId: id, officeId: office.officeId, days: days.join(','), ...times, lateToleranceM: tolerance, status };
      if (prior) DB.update('WORK_SCHEDULES', 'scheduleId', id, schedule); else DB.append('WORK_SCHEDULES', schedule);
      const cache = CacheService.getScriptCache(); cache.remove('schedule:' + office.officeId);
      if (prior && prior.officeId !== office.officeId) cache.remove('schedule:' + prior.officeId);
      AuditService.log(c, 'SCHEDULE_SAVE', 'WORK_SCHEDULES', id, { officeId: office.officeId, status });
      return schedule;
    } finally { lock.releaseLock(); }
  },
  holidays(c) {
    const offices = new Map(DB.rows('OFFICES').map(o => [String(o.officeId), o]));
    return DB.rows('HOLIDAYS').filter(holiday => !holiday.officeId || Access.officeScope(c, offices.get(String(holiday.officeId)) || {}));
  },
  saveHoliday(c, p) {
    Access.requireRole(c, ['SUPER_ADMIN', 'ADMIN_KECAMATAN']);
    const d = p.holiday || {}, date = String(d.date || ''), name = Utils.clean(d.name, 150), type = String(d.type || 'NASIONAL').toUpperCase();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !name || !['NASIONAL', 'DAERAH', 'KHUSUS'].includes(type)) throw new Error('Tanggal, nama, atau jenis hari libur tidak valid.');
    const dateObj = new Date(date + 'T00:00:00Z');
    if (isNaN(dateObj.getTime()) || dateObj.toISOString().slice(0, 10) !== date) throw new Error('Tanggal hari libur tidak valid.');
    const office = d.officeId ? DB.by('OFFICES', 'officeId', d.officeId) : null;
    if (d.officeId && (!office || !Access.officeScope(c, office))) throw new Error('Kantor di luar kewenangan.');
    if (c.role === 'ADMIN_KECAMATAN' && !d.officeId) throw new Error('Hari libur tingkat kecamatan harus dikaitkan dengan kantor dalam wilayah Anda.');
    const id = d.holidayId || Utils.id('hol'), holiday = { holidayId: id, date, name, type, officeId: office?.officeId || '' };
    if (d.holidayId) DB.update('HOLIDAYS', 'holidayId', id, holiday); else DB.append('HOLIDAYS', holiday);
    AuditService.log(c, 'HOLIDAY_SAVE', 'HOLIDAYS', id, { date, officeId: holiday.officeId, type });
    return holiday;
  }
};
