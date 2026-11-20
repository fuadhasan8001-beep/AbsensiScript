const DutyService = {
  list(c) {
    const offices = new Map(DB.rows('OFFICES').map(o => [String(o.officeId), o]));
    return DB.rows('DUTY_ASSIGNMENTS').filter(d => {
      if (c.role === 'SUPER_ADMIN' || String(d.employeeId) === String(c.employeeId)) return true;
      return (c.role === 'ADMIN_KECAMATAN' || c.role === 'ADMIN_DESA') && Access.officeScope(c, offices.get(String(d.officeId)) || {});
    });
  },
  request(c, p) {
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      const employee = DB.by('EMPLOYEES', 'employeeId', p.employeeId || c.employeeId);
      if (!employee || String(employee.status).toUpperCase() !== 'ACTIVE') throw new Error('Pegawai aktif tidak ditemukan.');
      Access.employee(c, employee.employeeId);
      const office = DB.by('OFFICES', 'officeId', p.officeId), start = Utils.parseDateTime(p.startAt, 'Waktu mulai'), end = Utils.parseDateTime(p.endAt, 'Waktu selesai');
      if (!office || String(office.status).toUpperCase() !== 'ACTIVE' || start >= end || !Utils.clean(p.reason, 500)) throw new Error('Data penugasan tidak valid.');
      const startAt = Utils.iso(start), endAt = Utils.iso(end);
      const retry = DB.rows('DUTY_ASSIGNMENTS').find(row => String(row.employeeId) === String(employee.employeeId) && String(row.officeId) === String(office.officeId) && row.startAt === startAt && row.endAt === endAt && row.status === 'PENDING');
      if (retry) return { dutyId: retry.dutyId, status: 'PENDING' };
      const id = Utils.id('duty'), duty = { dutyId: id, employeeId: employee.employeeId, officeId: office.officeId, startAt, endAt, reason: Utils.clean(p.reason), requestedBy: c.id, status: 'PENDING', approvedBy: '', decidedAt: '', createdAt: Utils.iso(Utils.now()) };
      DB.append('DUTY_ASSIGNMENTS', duty);
      AuditService.log(c, 'DUTY_REQUEST', 'DUTY_ASSIGNMENTS', id, { officeId: office.officeId, startAt: duty.startAt, endAt: duty.endAt });
      return { dutyId: id, status: 'PENDING' };
    } finally { lock.releaseLock(); }
  },
  decide(c, p) {
    Access.requireRole(c, ['SUPER_ADMIN', 'ADMIN_KECAMATAN']);
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      const duty = DB.by('DUTY_ASSIGNMENTS', 'dutyId', p.dutyId), office = duty && DB.by('OFFICES', 'officeId', duty.officeId);
      if (!duty || !office || !Access.officeScope(c, office) || String(duty.status).toUpperCase() !== 'PENDING' || !['APPROVED', 'REJECTED'].includes(p.decision)) throw new Error('Keputusan penugasan tidak valid, sudah diputuskan, atau di luar kewenangan.');
      const now = Utils.iso(Utils.now());
      const existingApproval = DB.rows('DUTY_ASSIGNMENT_APPROVALS').find(row => String(row.dutyId) === String(duty.dutyId));
      if (existingApproval && (existingApproval.decision !== p.decision || String(existingApproval.actorId) !== String(c.id))) throw new Error('Ada keputusan penugasan parsial yang perlu direkonsiliasi.');
      if (!existingApproval) DB.append('DUTY_ASSIGNMENT_APPROVALS', { approvalId: 'approval_' + duty.dutyId, dutyId: duty.dutyId, actorId: c.id, decision: p.decision, note: Utils.clean(p.note), createdAt: now });
      DB.update('DUTY_ASSIGNMENTS', 'dutyId', duty.dutyId, { status: p.decision, approvedBy: c.id, decidedAt: now });
      AuditService.log(c, 'DUTY_' + p.decision, 'DUTY_ASSIGNMENTS', duty.dutyId, { officeId: office.officeId });
      return { dutyId: duty.dutyId, status: p.decision };
    } finally { lock.releaseLock(); }
  }
};
