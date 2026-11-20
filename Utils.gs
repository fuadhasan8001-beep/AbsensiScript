const Utils = {
  id(prefix) { return prefix + '_' + Utilities.getUuid().replace(/-/g, ''); },
  now() { return new Date(); },
  dateKey(date) { return Utilities.formatDate(date, APP.TZ, 'yyyy-MM-dd'); },
  iso(date) { return Utilities.formatDate(date, APP.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX"); },
  email(value) { return String(value || '').trim().toLowerCase(); },
  json(value) { return JSON.stringify(value || {}); },
  number(value, name) { const n = Number(value); if (!Number.isFinite(n)) throw new Error(name + ' tidak valid'); return n; },
  clean(value, max = 500) { return String(value || '').trim().slice(0, max); },
  parseDateTime(value, name = 'Tanggal dan waktu') {
    if (value instanceof Date && Number.isFinite(value.getTime())) return value;
    if (typeof value !== 'string' || value.length > 40) throw new Error(name + ' tidak valid.');
    const text = value.trim();
    const local = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text);
    if (local) {
      const [, ys, mos, ds, hs, mis, ss = '0'] = local;
      const [y, mo, d, h, mi, sec] = [ys, mos, ds, hs, mis, ss].map(Number);
      if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || sec > 59) throw new Error(name + ' tidak valid.');
      const utc = Date.UTC(y, mo - 1, d, h - 7, mi, sec);
      const check = new Date(Date.UTC(y, mo - 1, d));
      if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) throw new Error(name + ' tidak valid.');
      return new Date(utc);
    }
    if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(text)) throw new Error(name + ' harus memiliki zona waktu atau format waktu lokal WIB.');
    const date = new Date(text);
    if (!Number.isFinite(date.getTime())) throw new Error(name + ' tidak valid.');
    return date;
  },
  jakartaTime(dateKey, time) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey));
    const t = /^(\d{2}):(\d{2})$/.exec(String(time));
    if (!m || !t) throw new Error('Tanggal atau jam kerja tidak valid.');
    const [y, mo, d, h, mi] = [m[1], m[2], m[3], t[1], t[2]].map(Number);
    if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) throw new Error('Tanggal atau jam kerja tidak valid.');
    const check = new Date(Date.UTC(y, mo - 1, d));
    if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) throw new Error('Tanggal atau jam kerja tidak valid.');
    return new Date(Date.UTC(y, mo - 1, d, h - 7, mi));
  }
};
const Errors = { public_(error) { const message = String(error && error.message || 'Terjadi kesalahan'); return message.startsWith('HTTP') || message.includes('Exception') ? 'Permintaan tidak dapat diproses. Silakan coba kembali.' : message; } };
