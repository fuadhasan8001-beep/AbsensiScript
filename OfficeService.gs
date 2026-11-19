const OfficeService = {
  list(c) {
    const all = DB.rows('OFFICES');
    if (c.role === 'SUPER_ADMIN') return all;
    if (c.role === 'ADMIN_KECAMATAN' || c.role === 'ADMIN_DESA') return all.filter(o => Access.officeScope(c, o));
    const ids = new Set();
    if (c.employeeId) {
      const employee = DB.by('EMPLOYEES', 'employeeId', c.employeeId);
      if (employee) ids.add(String(employee.primaryOfficeId));
    }
    const now = Utils.now();
    DB.rows('DUTY_ASSIGNMENTS').filter(d => String(d.employeeId) === String(c.employeeId) && d.status === 'APPROVED' && new Date(d.startAt) <= now && new Date(d.endAt) >= now).forEach(d => ids.add(String(d.officeId)));
    return all.filter(o => ids.has(String(o.officeId)) && String(o.status).toUpperCase() === 'ACTIVE');
  },
  save(c, p) {
    Access.requireRole(c, ['SUPER_ADMIN', 'ADMIN_KECAMATAN']);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const d = p.office || {};
      const prior = d.officeId ? DB.by('OFFICES', 'officeId', d.officeId) : null;
      if (d.officeId && (!prior || !Access.officeScope(c, prior))) throw new Error('Kantor di luar kewenangan.');
      const districtId = c.role === 'ADMIN_KECAMATAN' ? String(c.districtId || '') : String(d.districtId || prior?.districtId || '');
      if (!districtId || (c.role === 'ADMIN_KECAMATAN' && String(d.districtId || districtId) !== districtId)) throw new Error('Kecamatan di luar kewenangan.');
      const district = DB.by('KECAMATAN', 'districtId', districtId);
      if (!district || String(district.status).toUpperCase() !== 'ACTIVE') throw new Error('Kecamatan tidak ditemukan atau tidak aktif.');
      const villageId = String(d.villageId === undefined ? (prior?.villageId || '') : d.villageId).trim();
      const type = String(d.type || prior?.type || 'DESA').toUpperCase();
      const village = villageId ? DB.by('DESA', 'villageId', villageId) : null;
      if (villageId && (!village || String(village.districtId) !== districtId || String(village.status).toUpperCase() !== 'ACTIVE')) throw new Error('Desa tidak valid atau bukan bagian dari kecamatan yang dipilih.');
      if (type === 'DESA' && !villageId) throw new Error('Kantor desa harus memiliki desa.');
      if (type === 'KECAMATAN' && villageId) throw new Error('Kantor kecamatan tidak boleh memiliki relasi desa.');
      if (!['DESA', 'KECAMATAN'].includes(type)) throw new Error('Jenis kantor tidak valid.');
      const name = Utils.clean(d.name, 150);
      if (!name) throw new Error('Nama kantor wajib diisi.');
      const latitude = Utils.number(d.latitude, 'Latitude'), longitude = Utils.number(d.longitude, 'Longitude'), radiusM = Utils.number(d.radiusM, 'Radius');
      if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || radiusM < 1) throw new Error('Koordinat atau radius kantor tidak valid.');
      const id = d.officeId || Utils.id('off');
      const office = { officeId: id, name, type, districtId, villageId, address: Utils.clean(d.address), latitude, longitude, radiusM, status: String(d.status || prior?.status || 'ACTIVE').toUpperCase() };
      if (!['ACTIVE', 'INACTIVE'].includes(office.status)) throw new Error('Status kantor tidak valid.');
      if (d.officeId) DB.update('OFFICES', 'officeId', id, office);
      else DB.append('OFFICES', office);
      AuditService.log(c, 'OFFICE_SAVE', 'OFFICES', id, { districtId: districtId, villageId: villageId, status: office.status });
      return office;
    } finally { lock.releaseLock(); }
  }
};
