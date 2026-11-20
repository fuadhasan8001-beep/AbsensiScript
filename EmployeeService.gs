const EmployeeService = {
  list(c) {
    Access.requireRole(c, ['SUPER_ADMIN', 'ADMIN_KECAMATAN', 'ADMIN_DESA']);
    const offices = new Map(DB.rows('OFFICES').map(o => [String(o.officeId), o]));
    return DB.rows('EMPLOYEES').filter(e => Access.officeScope(c, offices.get(String(e.primaryOfficeId)) || {}));
  },
  save(c, p) {
    Access.requireRole(c, ['SUPER_ADMIN', 'ADMIN_KECAMATAN', 'ADMIN_DESA']);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const d = p.employee || {}, prior = d.employeeId ? DB.by('EMPLOYEES', 'employeeId', d.employeeId) : null;
      if (d.employeeId && !prior) throw new Error('Data pegawai tidak ditemukan.');
      if (prior) Access.employee(c, d.employeeId);
      const name = Utils.clean(d.name, 150), email = Utils.email(d.email), office = DB.by('OFFICES', 'officeId', d.primaryOfficeId);
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !office) throw new Error('Nama, email valid, dan kantor utama wajib diisi.');
      if (String(office.status).toUpperCase() !== 'ACTIVE' || !Access.officeScope(c, office)) throw new Error('Kantor tidak aktif atau di luar kewenangan.');
      const id = prior ? prior.employeeId : Utils.id('emp');
      const status = String(d.status || prior?.status || 'ACTIVE').toUpperCase();
      if (!['ACTIVE', 'INACTIVE'].includes(status)) throw new Error('Status pegawai tidak valid.');
      const employee = { employeeId: id, identityNo: Utils.clean(d.identityNo, 80), name, email, phone: Utils.clean(d.phone, 40), position: Utils.clean(d.position, 120), unit: Utils.clean(d.unit, 120), primaryOfficeId: office.officeId, status, startDate: d.startDate || prior?.startDate || Utils.dateKey(Utils.now()), createdAt: prior?.createdAt || Utils.iso(Utils.now()) };
      const users = DB.rows('USERS');
      const collision = users.find(u => Utils.email(u.email) === email && String(u.employeeId || '') !== String(id));
      if (collision) throw new Error('Email sudah terhubung ke akun lain.');
      const employeeCollision = DB.rows('EMPLOYEES').find(e => String(e.employeeId) !== String(id) && Utils.email(e.email) === email);
      if (employeeCollision) throw new Error('Email sudah digunakan pegawai lain.');
      const linked = users.filter(u => String(u.employeeId || '') === String(id));
      const target = users.find(u => Utils.email(u.email) === email);
      if (target && target.role !== 'PEGAWAI') throw new Error('Email sudah digunakan akun administrator.');
      const linkedBefore = linked.map(user => ({ ...user }));
      AuditService.log(c, 'EMPLOYEE_SAVE_STARTED', 'EMPLOYEES', id, { previousEmail: prior?.email || '', email });
      if (prior) DB.update('EMPLOYEES', 'employeeId', id, employee);
      else DB.append('EMPLOYEES', employee);
      try {
        linked.filter(u => String(u.userId) !== String(target?.userId || '')).forEach(u => DB.update('USERS', 'userId', u.userId, { status: 'INACTIVE', updatedAt: Utils.iso(Utils.now()) }));
        if (target) DB.update('USERS', 'userId', target.userId, { email, role: 'PEGAWAI', status, employeeId: id, districtId: office.districtId, villageId: office.villageId || '', updatedAt: Utils.iso(Utils.now()) });
        else DB.append('USERS', { userId: Utils.id('usr'), email, role: 'PEGAWAI', status, employeeId: id, districtId: office.districtId, villageId: office.villageId || '', createdAt: Utils.iso(Utils.now()), updatedAt: Utils.iso(Utils.now()) });
      } catch (error) {
        // Compensate prior writes where possible; STARTED/PARTIAL_FAILURE audit records allow later reconciliation.
        try { if (prior) DB.update('EMPLOYEES', 'employeeId', id, prior); } catch (_) {}
        try { linkedBefore.forEach(user => DB.update('USERS', 'userId', user.userId, user)); } catch (_) {}
        try {
          const created = DB.rows('USERS').find(user => Utils.email(user.email) === email && String(user.employeeId || '') === String(id) && !linkedBefore.some(old => String(old.userId) === String(user.userId)));
          if (created) DB.update('USERS', 'userId', created.userId, { status: 'INACTIVE', updatedAt: Utils.iso(Utils.now()) });
        } catch (_) {}
        try { AuditService.log(c, 'EMPLOYEE_SAVE_PARTIAL_FAILURE', 'EMPLOYEES', id, { message: String(error.message || error) }); } catch (_) {}
        throw new Error('Perubahan akun pegawai tidak selesai. Periksa audit log dan rekonsiliasi data sebelum mengulang.');
      }
      AuditService.log(c, 'EMPLOYEE_SAVE_COMPLETED', 'EMPLOYEES', id, { email, status });
      AuditService.log(c, prior && prior.email !== email ? 'EMPLOYEE_EMAIL_CHANGED' : 'EMPLOYEE_SAVE', 'EMPLOYEES', id, { previousEmail: prior?.email || '', email, status });
      return employee;
    } finally { lock.releaseLock(); }
  }
};
