const OrganizationService = {
  list(c) {
    Access.requireRole(c, ['SUPER_ADMIN', 'ADMIN_KECAMATAN', 'ADMIN_DESA']);
    const districts = DB.rows('KECAMATAN').filter(d => c.role === 'SUPER_ADMIN' || String(d.districtId) === String(c.districtId));
    const villages = DB.rows('DESA').filter(v => c.role === 'SUPER_ADMIN' || (c.role === 'ADMIN_DESA' ? String(v.villageId) === String(c.villageId) : String(v.districtId) === String(c.districtId)));
    return { districts, villages };
  },
  save(c, p) {
    Access.requireRole(c, ['SUPER_ADMIN', 'ADMIN_KECAMATAN']);
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      const kind = p.kind, data = p.record || {};
      if (kind === 'district') {
        Access.requireRole(c, ['SUPER_ADMIN']);
        const id = data.districtId || Utils.id('dist'), record = { districtId: id, name: Utils.clean(data.name, 120), code: Utils.clean(data.code, 30), status: String(data.status || 'ACTIVE').toUpperCase() };
        if (!record.name || !record.code || !['ACTIVE', 'INACTIVE'].includes(record.status)) throw new Error('Nama, kode, atau status kecamatan tidak valid.');
        if (data.districtId) DB.update('KECAMATAN', 'districtId', id, record); else DB.append('KECAMATAN', record);
        AuditService.log(c, 'DISTRICT_SAVE', 'KECAMATAN', id, {}); return record;
      }
      if (kind === 'village') {
        const districtId = c.role === 'SUPER_ADMIN' ? String(data.districtId || '') : String(c.districtId || '');
        if (c.role !== 'SUPER_ADMIN' && data.districtId && String(data.districtId) !== districtId) throw new Error('Kecamatan di luar kewenangan.');
        const district = DB.by('KECAMATAN', 'districtId', districtId);
        if (!district || String(district.status).toUpperCase() !== 'ACTIVE') throw new Error('Kecamatan tidak ditemukan atau tidak aktif.');
        const id = data.villageId || Utils.id('vil'), record = { villageId: id, districtId, name: Utils.clean(data.name, 120), code: Utils.clean(data.code, 30), status: String(data.status || 'ACTIVE').toUpperCase() };
        if (!record.name || !record.code || !['ACTIVE', 'INACTIVE'].includes(record.status)) throw new Error('Nama, kode, atau status desa tidak valid.');
        if (data.villageId) DB.update('DESA', 'villageId', id, record); else DB.append('DESA', record);
        AuditService.log(c, 'VILLAGE_SAVE', 'DESA', id, {}); return record;
      }
      throw new Error('Jenis data organisasi tidak dikenal.');
    } finally { lock.releaseLock(); }
  }
};
