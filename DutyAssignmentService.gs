const DutyService = {
  list(c) {
    const offices = new Map(DB.rows('OFFICES').map(o => [String(o.officeId), o]));
    return DB.rows('DUTY_ASSIGNMENTS').filter(d => {
      if (c.role === 'SUPER_ADMIN' || String(d.employeeId) === String(c.employeeId)) return true;
      if (c.role === 'ADMIN_KECAMATAN' || c.role === 'ADMIN_DESA') {
        const office = offices.get(String(d.officeId));
        return office && Access.officeScope(c, office);
      }
      return false;
    });
  },

  request(c, p) {
    const employee = DB.by('EMPLOYEES', 'employeeId', p.employeeId || c.employeeId);
    if (!employee) throw new Error('Pegawai tidak ditemukan.');
    Access.employee(c, employee.employeeId);
    const office = DB.by('OFFICES', 'officeId', p.officeId);
    const start = new Date(p.startAt), end = new Date(p.endAt);
    if (!office || String(office.status).toUpperCase() !== 'ACTIVE' || !p.startAt || !p.endAt || isNaN(start) || isNaN(end) || start >= end) {
      throw new Error('Kantor aktif dan rentang waktu penugasan yang valid wajib diisi.');
    }
    const id = Utils.id('duty');
    DB.append('DUTY_ASSIGNMENTS', {
      dutyId: id, employeeId: employee.employeeId, officeId: office.officeId,
      startAt: Utils.iso(start), endAt: Utils.iso(end), reason: Utils.clean(p.reason),
      requestedBy: c.id, status: 'PENDING', approvedBy: '', decidedAt: '', createdAt: Utils.iso(Utils.now())
    });
    AuditService.log(c, 'DUTY_REQUEST', 'DUTY_ASSIGNMENTS', id, {});
    return { dutyId: id, status: 'PENDING' };
  },

  decide(c, p) {
    Access.requireRole(c, ['SUPER_ADMIN', 'ADMIN_KECAMATAN']);
    const duty = DB.by('DUTY_ASSIGNMENTS', 'dutyId', p.dutyId);
    const office = duty && DB.by('OFFICES', 'officeId', duty.officeId);
    if (!duty || !office || !Access.officeScope(c, office) || duty.status !== 'PENDING' ||
        !['APPROVED', 'REJECTED'].includes(p.decision)) {
      throw new Error('Keputusan penugasan tidak valid, sudah diproses, atau di luar kewenangan.');
    }
    if (String(duty.requestedBy) === String(c.id)) throw new Error('Pengaju tidak dapat menyetujui penugasannya sendiri.');
    DB.update('DUTY_ASSIGNMENTS', 'dutyId', duty.dutyId, {
      status: p.decision, approvedBy: c.id, decidedAt: Utils.iso(Utils.now())
    });
    DB.append('DUTY_ASSIGNMENT_APPROVALS', {
      approvalId: Utils.id('ap'), dutyId: duty.dutyId, actorId: c.id,
      decision: p.decision, note: Utils.clean(p.note), createdAt: Utils.iso(Utils.now())
    });
    AuditService.log(c, 'DUTY_' + p.decision, 'DUTY_ASSIGNMENTS', duty.dutyId, {});
    return { dutyId: duty.dutyId, status: p.decision };
  }
};
