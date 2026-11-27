const AttendanceAreaService = {
  ensure_() { if (!DB.ss().getSheetByName('ATTENDANCE_AREAS')) DB.init(); },
  list(c) {
    Access.requireRole(c, ['SUPER_ADMIN','ADMIN_KECAMATAN','ADMIN_DESA']);
    this.ensure_();
    const org = OrganizationService.list(c);
    const saved = DB.rows('ATTENDANCE_AREAS');
    const areas = [];
    org.districts.forEach(d => areas.push(this.view_('KECAMATAN', d.districtId, '', d.name, saved)));
    org.villages.forEach(v => areas.push(this.view_('DESA', v.districtId, v.villageId, v.name, saved)));
    return areas;
  },
  view_(type, districtId, villageId, name, saved) {
    const areaId = type === 'DESA' ? 'DESA:'+villageId : 'KECAMATAN:'+districtId;
    const row = saved.find(x => String(x.areaId) === areaId) || {};
    return { areaId, type, districtId, villageId, name, latitude:row.latitude||'', longitude:row.longitude||'', enabled:String(row.enabled).toUpperCase()==='TRUE', updatedAt:row.updatedAt||'', updatedBy:row.updatedBy||'' };
  },
  save(c, p) {
    Access.requireRole(c, ['SUPER_ADMIN','ADMIN_KECAMATAN','ADMIN_DESA']);
    this.ensure_();
    const type = String(p.type||'').toUpperCase(), districtId = String(p.districtId||''), villageId = String(p.villageId||'');
    let areaId, name;
    if (type === 'KECAMATAN') {
      if (c.role === 'ADMIN_DESA') throw new Error('Admin desa hanya dapat mengatur koordinat desanya.');
      if (c.role === 'ADMIN_KECAMATAN' && districtId !== String(c.districtId)) throw new Error('Kecamatan di luar kewenangan Anda.');
      const district = DB.by('KECAMATAN','districtId',districtId);
      if (!district) throw new Error('Kecamatan tidak ditemukan.');
      areaId = 'KECAMATAN:'+districtId; name = district.name;
    } else if (type === 'DESA') {
      const village = DB.by('DESA','villageId',villageId);
      if (!village || String(village.districtId) !== districtId) throw new Error('Desa tidak ditemukan atau tidak sesuai kecamatan.');
      if (c.role === 'ADMIN_KECAMATAN' && districtId !== String(c.districtId)) throw new Error('Desa di luar kecamatan Anda.');
      if (c.role === 'ADMIN_DESA' && villageId !== String(c.villageId)) throw new Error('Desa di luar kewenangan Anda.');
      areaId = 'DESA:'+villageId; name = village.name;
    } else throw new Error('Jenis wilayah tidak valid.');
    if (String(p.latitude||'').trim()==='' || String(p.longitude||'').trim()==='') throw new Error('Latitude dan longitude wajib diisi.');
    const latitude = Number(p.latitude), longitude = Number(p.longitude);
    if (!Number.isFinite(latitude) || Math.abs(latitude)>90 || !Number.isFinite(longitude) || Math.abs(longitude)>180) throw new Error('Latitude dan longitude harus berupa koordinat yang valid.');
    const previous = DB.by('ATTENDANCE_AREAS','areaId',areaId), row = {areaId,type,districtId,villageId,latitude,longitude,enabled:'TRUE',updatedAt:Utils.iso(Utils.now()),updatedBy:c.id};
    if (previous) DB.update('ATTENDANCE_AREAS','areaId',areaId,row); else DB.append('ATTENDANCE_AREAS',row);
    AuditService.log(c,'ATTENDANCE_AREA_SAVE','ATTENDANCE_AREAS',areaId,{name,latitude,longitude,radiusM:15});
    return row;
  },
  forOffice(office) {
    this.ensure_();
    const areaId = office.villageId ? 'DESA:'+office.villageId : 'KECAMATAN:'+office.districtId;
    const area = DB.by('ATTENDANCE_AREAS','areaId',areaId);
    if (!area || String(area.enabled).toUpperCase() !== 'TRUE' || area.latitude === '' || area.longitude === '') {
      throw new Error('Koordinat absensi untuk wilayah ini belum diatur. Hubungi admin wilayah.');
    }
    return {latitude:Number(area.latitude),longitude:Number(area.longitude),radiusM:15,status:office.status};
  }
};
