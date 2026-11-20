const UserService = {
  bootstrap(c) {
    const user = DB.by('USERS', 'userId', c.id), employee = c.employeeId ? DB.by('EMPLOYEES', 'employeeId', c.employeeId) : null;
    return { user, employee, app: { name: APP.NAME, version: APP.VERSION }, today: Utils.dateKey(Utils.now()) };
  },
  profile(c) { return this.bootstrap(c); },
  settings(c) {
    Access.requireRole(c, ['SUPER_ADMIN']);
    return { app: { name: APP.NAME, version: APP.VERSION, timezone: APP.TZ, maxGpsAccuracy: APP.MAX_GPS_ACCURACY_M }, counts: Object.fromEntries(Object.keys(TABLES).map(name => [name, DB.sheet(name).getLastRow() - 1])) };
  },
  userList(c) { Access.requireRole(c, ['SUPER_ADMIN']); return DB.rows('USERS'); },
  userSave(c, p) {
    Access.requireRole(c, ['SUPER_ADMIN']);
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      const data = p.user || {}, email = Utils.email(data.email), roles = ['PEGAWAI', 'ADMIN_DESA', 'ADMIN_KECAMATAN'];
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !roles.includes(data.role)) throw new Error('Email atau role akun tidak valid. Super Admin dikelola melalui prosedur bootstrap pemilik.');
      const prior = data.userId ? DB.by('USERS', 'userId', data.userId) : null;
      if (data.userId && !prior) throw new Error('Akun tidak ditemukan.');
      if (prior?.role === 'SUPER_ADMIN') throw new Error('Akun Super Admin dilindungi dari perubahan melalui form umum.');
      if (data.role === 'ADMIN_KECAMATAN' && !data.districtId) throw new Error('Admin kecamatan harus memiliki wilayah kecamatan.');
      if (data.role === 'ADMIN_DESA' && !data.villageId) throw new Error('Admin desa harus memiliki wilayah desa.');
      const employee = data.employeeId ? DB.by('EMPLOYEES', 'employeeId', data.employeeId) : null;
      if (data.employeeId && !employee) throw new Error('Data pegawai terkait tidak ditemukan.');
      if (data.role === 'PEGAWAI' && employee && Utils.email(employee.email) !== email) throw new Error('Email akun pegawai harus disamakan melalui pengelolaan data pegawai.');
      if (data.districtId && !DB.by('KECAMATAN', 'districtId', data.districtId)) throw new Error('Kecamatan tidak ditemukan.');
      if (data.villageId) {
        const village = DB.by('DESA', 'villageId', data.villageId);
        if (!village || String(village.status).toUpperCase() !== 'ACTIVE' || (data.districtId && String(village.districtId) !== String(data.districtId))) throw new Error('Desa tidak ditemukan atau tidak sesuai kecamatan.');
      }
      if (data.role === 'ADMIN_KECAMATAN') {
        const district = DB.by('KECAMATAN', 'districtId', data.districtId);
        if (!district || String(district.status).toUpperCase() !== 'ACTIVE' || data.villageId) throw new Error('Admin kecamatan harus terhubung ke kecamatan aktif tanpa scope desa.');
      }
      if (data.role === 'ADMIN_DESA' && !data.villageId) throw new Error('Admin desa harus memiliki desa.');
      if (data.role === 'ADMIN_DESA') {
        const village = DB.by('DESA', 'villageId', data.villageId);
        if (!village || String(village.status).toUpperCase() !== 'ACTIVE') throw new Error('Desa admin harus aktif.');
        if (data.districtId && String(data.districtId) !== String(village.districtId)) throw new Error('Desa tidak sesuai kecamatan.');
        data.districtId = village.districtId;
      }
      if (employee && data.role === 'PEGAWAI') { data.districtId = employee.primaryOfficeId ? DB.by('OFFICES', 'officeId', employee.primaryOfficeId)?.districtId : data.districtId; data.villageId = employee.primaryOfficeId ? DB.by('OFFICES', 'officeId', employee.primaryOfficeId)?.villageId : data.villageId; }
      const collision = DB.rows('USERS').find(user => Utils.email(user.email) === email && String(user.userId) !== String(prior?.userId || ''));
      if (collision) throw new Error('Email sudah digunakan akun lain.');
      if (employee && DB.rows('USERS').some(user => String(user.employeeId || '') === String(employee.employeeId) && String(user.userId) !== String(prior?.userId || '') && String(user.status).toUpperCase() === 'ACTIVE')) throw new Error('Pegawai sudah terhubung ke akun aktif lain.');
      const status = String(data.status || prior?.status || 'ACTIVE').toUpperCase();
      if (!['ACTIVE', 'INACTIVE'].includes(status)) throw new Error('Status akun tidak valid.');
      const id = prior?.userId || Utils.id('usr'), user = { userId: id, email, role: data.role, status, employeeId: data.employeeId || employee?.employeeId || '', districtId: data.districtId || '', villageId: data.villageId || '', createdAt: prior?.createdAt || Utils.iso(Utils.now()), updatedAt: Utils.iso(Utils.now()) };
      if (prior) DB.update('USERS', 'userId', id, user); else DB.append('USERS', user);
      AuditService.log(c, prior && prior.email !== email ? 'USER_EMAIL_CHANGED' : 'USER_ROLE_SAVE', 'USERS', id, { oldEmail: prior?.email || '', email, role: user.role, status: user.status });
      return user;
    } finally { lock.releaseLock(); }
  }
};
