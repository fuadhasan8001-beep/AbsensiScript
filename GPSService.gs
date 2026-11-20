const GPSService = {
  distance(lat1, lng1, lat2, lng2) {
    const radius = 6371000, rad = value => value * Math.PI / 180;
    const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
    const raw = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
    const haversine = Math.min(1, Math.max(0, raw));
    return 2 * radius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  },
  validate(payload, office) {
    const lat = Utils.number(payload.latitude, 'Latitude'), lng = Utils.number(payload.longitude, 'Longitude'), accuracy = Utils.number(payload.accuracy, 'Akurasi GPS');
    const officeLat = Utils.number(office.latitude, 'Latitude kantor'), officeLng = Utils.number(office.longitude, 'Longitude kantor'), radius = Utils.number(office.radiusM, 'Radius kantor');
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || accuracy < 0 || Math.abs(officeLat) > 90 || Math.abs(officeLng) > 180 || radius < 1) throw new Error('Koordinat, akurasi, atau radius GPS tidak valid.');
    if (String(office.status).toUpperCase() !== 'ACTIVE') throw new Error('Lokasi kantor tidak aktif.');
    if (accuracy > APP.MAX_GPS_ACCURACY_M) throw new Error('Akurasi GPS terlalu rendah. Coba lagi di area terbuka.');
    const distance = this.distance(lat, lng, officeLat, officeLng);
    if (distance > radius) throw new Error('Anda berada di luar radius kantor (' + Math.round(distance) + ' m).');
    return { lat, lng, acc: accuracy, distance: Math.round(distance) };
  }
};
