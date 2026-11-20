const DB = {
  _requestRows: null,
  beginRequest_() { this._requestRows = Object.create(null); },
  invalidate_(name) { if (this._requestRows) delete this._requestRows[name]; },
  ss() {
    const id = prop_('DATABASE_SPREADSHEET_ID');
    try { return SpreadsheetApp.openById(id); }
    catch (e) { throw new Error('Database tidak dapat dibuka. Periksa DATABASE_SPREADSHEET_ID dan akses akun deployment.'); }
  },
  sheet(name) {
    if (!Object.prototype.hasOwnProperty.call(TABLES, name)) throw new Error('Tabel database tidak dikenal.');
    const sheet = this.ss().getSheetByName(name);
    if (!sheet) throw new Error('Database belum diinisialisasi: ' + name);
    if (!this.assertHeader_(sheet, name)) throw new Error('Database belum diinisialisasi: ' + name);
    return sheet;
  },
  assertHeader_(sheet, name) {
    const expected = TABLES[name];
    if (sheet.getLastRow() === 0) return false;
    if (sheet.getLastColumn() !== expected.length) throw new Error('Header database tidak sesuai untuk tab ' + name + '. Tidak ada perubahan yang dilakukan.');
    const actual = sheet.getRange(1, 1, 1, expected.length).getDisplayValues()[0];
    if (expected.some((header, i) => actual[i] !== header)) throw new Error('Header database tidak sesuai untuk tab ' + name + '. Tidak ada perubahan yang dilakukan.');
    return true;
  },
  validate_() {
    const ss = this.ss();
    Object.keys(TABLES).forEach(name => {
      const sheet = ss.getSheetByName(name);
      if (sheet) this.assertHeader_(sheet, name);
    });
    return ss;
  },
  init() {
    const ss = this.validate_();
    Object.keys(TABLES).forEach(name => {
      const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
      if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, TABLES[name].length).setValues([TABLES[name]]);
    });
    this.beginRequest_();
    return 'Database siap';
  },
  rows(name) {
    if (this._requestRows && this._requestRows[name]) return this._requestRows[name];
    const sheet = this.sheet(name), last = sheet.getLastRow();
    if (last < 2) return [];
    const headers = TABLES[name], values = sheet.getRange(2, 1, last - 1, headers.length).getValues();
    const rows = values.filter(row => row.some(value => value !== '')).map(row => Object.fromEntries(headers.map((header, i) => [header, row[i]])));
    if (this._requestRows) this._requestRows[name] = rows;
    return rows;
  },
  by(name, key, value) { return this.rows(name).find(row => String(row[key]) === String(value)) || null; },
  assertUnique_(name, obj, exceptId) {
    const keys = UNIQUE_KEYS[name] || [];
    const rows = this.rows(name);
    const currentIndex = exceptId === undefined || exceptId === null ? -1 : rows.findIndex(row => String(row[keys[0][0]]) === String(exceptId));
    const conflict = rows.find((row, index) => {
      if (index === currentIndex) return false;
      return keys.some(fields => fields.every(field => {
        const value = obj[field];
        if (value === '' || value === null || value === undefined) return false;
        return String(row[field]).trim().toLowerCase() === String(value).trim().toLowerCase();
      }));
    });
    if (conflict) throw new Error('Data duplikat pada tabel ' + name + '. Periksa ID, email, tanggal absensi, atau kode.');
  },
  append(name, obj) {
    this.assertUnique_(name, obj);
    const headers = TABLES[name];
    this.sheet(name).appendRow(headers.map(key => obj[key] === undefined ? '' : obj[key]));
    this.invalidate_(name);
    return obj;
  },
  update(name, key, value, patch) {
    const sheet = this.sheet(name), headers = TABLES[name], index = headers.indexOf(key);
    if (index < 0) throw new Error('Kolom tidak ditemukan');
    const range = sheet.getRange(2, index + 1, Math.max(sheet.getLastRow() - 1, 1), 1);
    const found = range.createTextFinder(String(value)).matchEntireCell(true).findNext();
    if (!found) throw new Error('Data tidak ditemukan');
    const rowNumber = found.getRow();
    const old = Object.fromEntries(headers.map((header, i) => [header, sheet.getRange(rowNumber, i + 1).getValue()]));
    const next = { ...old, ...patch };
    this.assertUnique_(name, next, old[key]);
    sheet.getRange(rowNumber, 1, 1, headers.length).setValues([headers.map(header => next[header] ?? '')]);
    this.invalidate_(name);
    return next;
  }
};
