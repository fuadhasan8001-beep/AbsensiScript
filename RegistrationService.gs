const RegistrationService = {
  ensureTable_() {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const spreadsheet = DB.ss();
      let sheet = spreadsheet.getSheetByName('REGISTRATION_REQUESTS');
      if (!sheet) sheet = spreadsheet.insertSheet('REGISTRATION_REQUESTS');
      if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, TABLES.REGISTRATION_REQUESTS.length).setValues([TABLES.REGISTRATION_REQUESTS]);
      return sheet;
    } finally {
      lock.releaseLock();
    }
  },

  status(firebaseUser) {
    this.ensureTable_();
    const email = Utils.email(firebaseUser.email);
    const user = DB.rows('USERS').find(row => Utils.email(row.email) === email);
    if (user && String(user.status).toUpperCase() === 'ACTIVE') return { status: 'ACTIVE' };

    const requests = DB.rows('REGISTRATION_REQUESTS').filter(row => Utils.email(row.email) === email);
    const latest = requests[requests.length - 1];
    return { status: latest?.status || (user ? 'INACTIVE' : 'NEW'), name: latest?.name || firebaseUser.displayName || '' };
  },

  submit(firebaseUser, payload) {
    this.ensureTable_();
    const email = Utils.email(firebaseUser.email);
    const name = Utils.clean(payload.name || firebaseUser.displayName || '', 150);
    if (!email || !name) throw new Error('Nama lengkap wajib diisi untuk mengajukan pendaftaran.');

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const user = DB.rows('USERS').find(row => Utils.email(row.email) === email);
      if (user && String(user.status).toUpperCase() === 'ACTIVE') return { status: 'ACTIVE' };

      const requests = DB.rows('REGISTRATION_REQUESTS').filter(row => Utils.email(row.email) === email);
      const pending = requests.find(row => String(row.status).toUpperCase() === 'PENDING');
      if (pending) return { status: 'PENDING' };

      const request = {
        requestId: Utils.id('reg'), email, name, status: 'PENDING',
        requestedAt: Utils.iso(Utils.now()), reviewedAt: '', reviewedBy: '', decisionNote: ''
      };
      DB.append('REGISTRATION_REQUESTS', request);
      return { status: 'PENDING' };
    } finally {
      lock.releaseLock();
    }
  },

  list(context) {
    Access.requireRole(context, ['SUPER_ADMIN']);
    this.ensureTable_();
    return DB.rows('REGISTRATION_REQUESTS').filter(row => String(row.status).toUpperCase() === 'PENDING');
  },

  approve(context, payload) {
    Access.requireRole(context, ['SUPER_ADMIN']);
    this.ensureTable_();
    const requestId = Utils.clean(payload.requestId, 100);
    const request = DB.by('REGISTRATION_REQUESTS', 'requestId', requestId);
    if (!request || String(request.status).toUpperCase() !== 'PENDING') throw new Error('Permintaan pendaftaran tidak ditemukan atau sudah diproses.');

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const current = DB.by('REGISTRATION_REQUESTS', 'requestId', requestId);
      if (!current || String(current.status).toUpperCase() !== 'PENDING') throw new Error('Permintaan pendaftaran sudah diproses. Muat ulang daftar.');
      const user = Object.assign({}, payload.user || {}, { email: current.email, status: 'ACTIVE' });
      if (!['PEGAWAI', 'ADMIN_DESA', 'ADMIN_KECAMATAN'].includes(user.role)) throw new Error('Pilih role akun yang valid.');
      if (user.role === 'ADMIN_KECAMATAN' && !user.districtId) throw new Error('Pilih kecamatan untuk admin kecamatan.');
      if (user.role === 'ADMIN_DESA' && !user.villageId) throw new Error('Pilih desa untuk admin desa.');
      if (user.districtId && !DB.by('KECAMATAN', 'districtId', user.districtId)) throw new Error('Kecamatan tidak ditemukan.');
      if (user.villageId) {
        const village = DB.by('DESA', 'villageId', user.villageId);
        if (!village || (user.districtId && String(village.districtId) !== String(user.districtId))) throw new Error('Desa tidak sesuai dengan kecamatan yang dipilih.');
      }
      if (!user.employeeId) {
        const existingEmployee = DB.rows('EMPLOYEES').find(row => Utils.email(row.email) === Utils.email(current.email));
        if (existingEmployee) user.employeeId = existingEmployee.employeeId;
        else {
          const office = user.officeId && DB.by('OFFICES', 'officeId', user.officeId);
          if (!office || String(office.status).toUpperCase() !== 'ACTIVE') throw new Error('Pilih kantor penempatan yang aktif untuk membuat profil pegawai.');
          if (user.role === 'ADMIN_KECAMATAN' && String(office.districtId) !== String(user.districtId)) throw new Error('Kantor yang dipilih tidak sesuai dengan kecamatan admin.');
          if (user.role === 'ADMIN_DESA' && String(office.villageId) !== String(user.villageId)) throw new Error('Kantor yang dipilih tidak sesuai dengan desa admin.');
          const employee = EmployeeService.save(context, { employee: { name: current.name, email: current.email, primaryOfficeId: office.officeId, status: 'ACTIVE' } });
          user.employeeId = employee.employeeId;
        }
      }
      const saved = UserService.userSave(context, { user });
      DB.update('REGISTRATION_REQUESTS', 'requestId', requestId, {
        status: 'APPROVED', reviewedAt: Utils.iso(Utils.now()), reviewedBy: context.id, decisionNote: ''
      });
      AuditService.log(context, 'REGISTRATION_APPROVED', 'REGISTRATION_REQUESTS', requestId, { email: current.email, role: saved.role });
      return saved;
    } finally {
      lock.releaseLock();
    }
  },

  reject(context, payload) {
    Access.requireRole(context, ['SUPER_ADMIN']);
    this.ensureTable_();
    const requestId = Utils.clean(payload.requestId, 100);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const request = DB.by('REGISTRATION_REQUESTS', 'requestId', requestId);
      if (!request || String(request.status).toUpperCase() !== 'PENDING') throw new Error('Permintaan pendaftaran tidak ditemukan atau sudah diproses.');
      DB.update('REGISTRATION_REQUESTS', 'requestId', requestId, {
        status: 'REJECTED', reviewedAt: Utils.iso(Utils.now()), reviewedBy: context.id,
        decisionNote: Utils.clean(payload.note, 300)
      });
      AuditService.log(context, 'REGISTRATION_REJECTED', 'REGISTRATION_REQUESTS', requestId, { email: request.email });
      return { requestId, status: 'REJECTED' };
    } finally {
      lock.releaseLock();
    }
  }
};
