const EmployeeService = {
  list(c) {
    Access.requireRole(c, ['SUPER_ADMIN', 'ADMIN_KECAMATAN', 'ADMIN_DESA']);
    const employees = DB.rows('EMPLOYEES');
    if (c.role === 'SUPER_ADMIN') return employees;
    const offices = new Map(DB.rows('OFFICES').map(o => [String(o.officeId), o]));
    return employees.filter(e => {
      const office = offices.get(String(e.primaryOfficeId));
      return office && Access.officeScope(c, office);
    });
  },

  save(c, p) {
    Access.requireRole(c, ['SUPER_ADMIN', 'ADMIN_KECAMATAN', 'ADMIN_DESA']);
    const d = p.employee || {};
    let prior = null;
    if (d.employeeId) {
      prior = DB.by('EMPLOYEES', 'employeeId', d.employeeId);
      if (!prior) throw new Error('Data pegawai tidak ditemukan.');
      Access.employee(c, d.employeeId);
    }
    if (!d.name || !d.email || !d.primaryOfficeId) throw new Error('Nama, email, dan kantor utama wajib diisi.');
    const office = DB.by('OFFICES', 'officeId', d.primaryOfficeId);
    if (!office || !Access.officeScope(c, office)) throw new Error('Kantor di luar kewenangan.');
    const email = Utils.email(d.email);
    const allEmployees = DB.rows('EMPLOYEES');
    if (allEmployees.some(e => String(e.employeeId) !== String(d.employeeId || '') && Utils.email(e.email) === email)) {
      throw new Error('Email sudah digunakan oleh profil pegawai lain.');
    }
    const accounts = DB.rows('USERS');
    const linkedUser = d.employeeId ? accounts.find(u => String(u.employeeId) === String(d.employeeId)) : null;
    const accountByEmail = accounts.find(u => Utils.email(u.email) === email);
    if (accountByEmail?.employeeId && String(accountByEmail.employeeId) !== String(d.employeeId || '')) {
      throw new Error('Akun ini sudah ditautkan ke profil pegawai lain.');
    }
    if (prior && linkedUser && Utils.email(prior.email) !== email) {
      throw new Error('Email pegawai sudah terhubung ke akun. Ubah email melalui pengelolaan akun Firebase terlebih dahulu.');
    }

    const id = d.employeeId || Utils.id('emp');
    const obj = {
      employeeId: id,
      identityNo: Utils.clean(d.identityNo),
      name: Utils.clean(d.name, 150),
      email,
      phone: Utils.clean(d.phone, 40),
      position: Utils.clean(d.position),
      unit: Utils.clean(d.unit),
      primaryOfficeId: d.primaryOfficeId,
      status: d.status || 'ACTIVE',
      startDate: d.startDate || Utils.dateKey(Utils.now()),
      createdAt: prior?.createdAt || Utils.iso(Utils.now())
    };
    if (d.employeeId) DB.update('EMPLOYEES', 'employeeId', id, obj);
    else DB.append('EMPLOYEES', obj);

    // Profil pegawai tidak membuat akun atau memberikan persetujuan akses.
    // Akun yang sudah ada hanya ditautkan; status aktifnya tetap kendali admin.
    const account = accountByEmail || linkedUser;
    if (account) {
      const patch = {
        employeeId: id,
        updatedAt: Utils.iso(Utils.now())
      };
      if (String(account.role).toUpperCase() !== 'SUPER_ADMIN' && String(obj.status).toUpperCase() !== 'ACTIVE') patch.status = 'INACTIVE';
      DB.update('USERS', 'userId', account.userId, patch);
    }
    AuditService.log(c, 'EMPLOYEE_SAVE', 'EMPLOYEES', id, {});
    return obj;
  }
};
