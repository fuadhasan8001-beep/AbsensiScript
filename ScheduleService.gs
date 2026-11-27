const ScheduleService = {
  list(c) {
    const offices = new Map(DB.rows('OFFICES').map(o => [String(o.officeId), o]));
    return DB.rows('WORK_SCHEDULES').filter(s => {
      const office = offices.get(String(s.officeId));
      return office && Access.officeScope(c, office);
    });
  },

  forOffice(id) {
    const cache = CacheService.getScriptCache(), key = 'schedule:' + id, hit = cache.get(key);
    if (hit) return JSON.parse(hit);
    const schedule = DB.rows('WORK_SCHEDULES').find(s =>
      String(s.officeId) === String(id) && String(s.status).toUpperCase() === 'ACTIVE'
    );
    if (schedule) cache.put(key, JSON.stringify(schedule), APP.CACHE_SECONDS);
    return schedule;
  },

  save(c, p) {
    Access.requireRole(c, ['SUPER_ADMIN', 'ADMIN_KECAMATAN']);
    const d = p.schedule || {}, id = d.scheduleId || Utils.id('sch');
    if (d.scheduleId) {
      const prior = DB.by('WORK_SCHEDULES', 'scheduleId', id);
      const priorOffice = prior && DB.by('OFFICES', 'officeId', prior.officeId);
      if (!prior || !priorOffice || !Access.officeScope(c, priorOffice)) throw new Error('Jadwal di luar kewenangan.');
    }
    const office = DB.by('OFFICES', 'officeId', d.officeId);
    if (!office || !Access.officeScope(c, office)) throw new Error('Kantor di luar kewenangan.');
    const days = String(d.days || '1,2,3,4,5').split(',').map(x => x.trim());
    const time = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));
    const checkInStart = d.checkInStart || '06:00', checkInEnd = d.checkInEnd || '09:00';
    const checkOutStart = d.checkOutStart || '15:00', checkOutEnd = d.checkOutEnd || '23:00';
    const workStart = d.workStart || '08:00', workEnd = d.workEnd || '16:00';
    if (!days.length || days.some(x => !/^[1-7]$/.test(x)) || new Set(days).size !== days.length) {
      throw new Error('Hari kerja harus berisi angka unik 1 sampai 7.');
    }
    if (![checkInStart, checkInEnd, checkOutStart, checkOutEnd, workStart, workEnd].every(time) ||
        checkInStart > checkInEnd || checkOutStart > checkOutEnd || workStart >= workEnd) {
      throw new Error('Rentang waktu jadwal tidak valid.');
    }
    const tolerance = Number(d.lateToleranceM || 0);
    if (!Number.isFinite(tolerance) || tolerance < 0) throw new Error('Toleransi keterlambatan harus nol atau lebih.');
    const schedule = {
      scheduleId: id, officeId: d.officeId, days: days.join(','),
      checkInStart, checkInEnd, checkOutStart, checkOutEnd,
      workStart, workEnd, lateToleranceM: tolerance, status: d.status || 'ACTIVE'
    };
    if (d.scheduleId) DB.update('WORK_SCHEDULES', 'scheduleId', id, schedule);
    else DB.append('WORK_SCHEDULES', schedule);
    CacheService.getScriptCache().remove('schedule:' + schedule.officeId);
    AuditService.log(c, 'SCHEDULE_SAVE', 'WORK_SCHEDULES', id, {});
    return schedule;
  },

  holidays(c) {
    const offices = new Map(DB.rows('OFFICES').map(o => [String(o.officeId), o]));
    return DB.rows('HOLIDAYS').filter(h => {
      if (c.role === 'SUPER_ADMIN' || !h.officeId) return true;
      const office = offices.get(String(h.officeId));
      return office && Access.officeScope(c, office);
    });
  },

  saveHoliday(c, p) {
    Access.requireRole(c, ['SUPER_ADMIN', 'ADMIN_KECAMATAN']);
    const d = p.holiday || {}, id = d.holidayId || Utils.id('hol');
    const office = d.officeId ? DB.by('OFFICES', 'officeId', d.officeId) : null;
    if (d.officeId && (!office || !Access.officeScope(c, office))) throw new Error('Kantor di luar kewenangan.');
    const holidayDate = new Date(String(d.date || '') + 'T00:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.date || '')) || isNaN(holidayDate) ||
        holidayDate.toISOString().slice(0, 10) !== String(d.date) || !d.name) {
      throw new Error('Tanggal dan nama hari libur wajib diisi dengan format yang benar.');
    }
    const holiday = { holidayId: id, date: d.date, name: Utils.clean(d.name), type: d.type || 'NASIONAL', officeId: d.officeId || '' };
    if (d.holidayId) DB.update('HOLIDAYS', 'holidayId', id, holiday);
    else DB.append('HOLIDAYS', holiday);
    AuditService.log(c, 'HOLIDAY_SAVE', 'HOLIDAYS', id, {});
    return holiday;
  }
};
