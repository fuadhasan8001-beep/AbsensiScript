const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const apps = vm.createContext({
  Utilities: { getUuid: () => 'test-id', formatDate: () => '' }, Number, Date, Math, Object, String, Set, Map, JSON, Error, RegExp,
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
  AuditService: { log() {} }
});
for (const file of ['Config.gs', 'Utils.gs', 'Database.gs', 'Access.gs', 'GPSService.gs', 'ScheduleService.gs', 'DutyAssignmentService.gs']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), apps, { filename: file });
const evaluate = expression => vm.runInContext(expression, apps);

test('waktu datetime-local ditafsirkan sebagai WIB dan serialisasi ISO membawa offset +07:00', () => {
  const date = evaluate("Utils.parseDateTime('2026-11-19T08:00')");
  assert.equal(date.toISOString(), '2026-11-19T01:00:00.000Z');
  apps.Utilities.formatDate = (d, tz, pattern) => pattern.includes('XXX') ? '1970-01-01T07:00:00+07:00' : '2026-11-19';
  assert.equal(evaluate('Utils.iso(new Date(0))'), '1970-01-01T07:00:00+07:00');
});

test('tanggal kalender tidak menerima tanggal mustahil', () => {
  assert.throws(() => evaluate("Utils.parseDateTime('2026-02-30T08:00')"), /tidak valid/);
  assert.throws(() => evaluate("Utils.jakartaTime('2026-02-30','08:00')"), /tidak valid/);
});

test('GPS menolak koordinat di luar rentang, nilai non-finite, accuracy buruk, dan kantor nonaktif', () => {
  apps.office = { latitude: -6.2, longitude: 106.8, radiusM: 100, status: 'ACTIVE' };
  const office = apps.office;
  assert.throws(() => evaluate("GPSService.validate({latitude:91,longitude:106.8,accuracy:5}, office)"), /tidak valid/);
  assert.throws(() => evaluate("GPSService.validate({latitude:'Infinity',longitude:106.8,accuracy:5}, office)"), /tidak valid/);
  assert.throws(() => evaluate("GPSService.validate({latitude:-6.2,longitude:106.8,accuracy:101}, office)"), /Akurasi GPS terlalu rendah/);
  assert.throws(() => evaluate("GPSService.validate({latitude:-6.2,longitude:106.8,accuracy:5}, {...office,status:'INACTIVE'})"), /tidak aktif/);
});

test('GPS menerima titik dalam radius dan menolak titik di luar radius', () => {
  const office = { latitude: -6.2, longitude: 106.8, radiusM: 100, status: 'ACTIVE' };
  const point = evaluate("GPSService.validate({latitude:-6.2,longitude:106.8,accuracy:5}, office)");
  assert.equal(point.distance, 0);
  assert.throws(() => evaluate("GPSService.validate({latitude:-6.2,longitude:106.802,accuracy:5}, office)"), /di luar radius/);
});

test('database uniqueness rules reject duplicate attendance employee/date pair', () => {
  evaluate("DB._requestRows={ATTENDANCES:[{attendanceId:'a1',employeeId:'e1',date:'2026-11-19'}]}");
  assert.throws(() => evaluate("DB.assertUnique_('ATTENDANCES',{attendanceId:'a2',employeeId:'e1',date:'2026-11-19'})"), /duplikat/);
  assert.doesNotThrow(() => evaluate("DB.assertUnique_('ATTENDANCES',{attendanceId:'a1',employeeId:'e1',date:'2026-11-19'},'a1')"));
});

test('jadwal menolak hari duplikat, toleransi negatif, dan jadwal aktif kedua', () => {
  evaluate("DB.rows=function(name){return name==='WORK_SCHEDULES'?[{scheduleId:'s1',officeId:'o1',status:'ACTIVE',days:'1,2,3,4,5',checkInStart:'06:00',checkInEnd:'09:00',checkOutStart:'15:00',checkOutEnd:'23:00',workStart:'08:00',workEnd:'16:00',lateToleranceM:0}]:[]}; DB.by=function(name,key,value){return name==='OFFICES'?{officeId:'o1',status:'ACTIVE'}:null}; DB.append=function(name,row){DB.rows(name).push(row)}; DB.update=function(){return {}}; DB.invalidate_=function(){}");
  const admin = { role: 'SUPER_ADMIN', id: 'sa' };
  assert.throws(() => evaluate("ScheduleService.save(admin,{schedule:{officeId:'o1',days:'1,1'}})"), /unik/);
  assert.throws(() => evaluate("ScheduleService.save(admin,{schedule:{officeId:'o1',days:'1,2,3',lateToleranceM:-1}})"), /Toleransi/);
  assert.throws(() => evaluate("ScheduleService.save(admin,{schedule:{officeId:'o1'}})"), /jadwal aktif/);
});

test('keputusan tugas hanya sekali; retry setelah write parsial tidak menggandakan approval', () => {
  evaluate("DB._test={duty:{dutyId:'d1',officeId:'o1',status:'PENDING'},approvals:[]}; DB.rows=function(name){return name==='DUTY_ASSIGNMENT_APPROVALS'?DB._test.approvals:[]}; DB.by=function(name){return name==='DUTY_ASSIGNMENTS'?DB._test.duty:name==='OFFICES'?{officeId:'o1'}:null}; DB.append=function(name,row){DB._test.approvals.push(row)}; DB.update=function(name,key,value,patch){if(name==='DUTY_ASSIGNMENTS'){if(DB._test.failUpdate){DB._test.failUpdate=false;throw Error('injected failure')}DB._test.duty={...DB._test.duty,...patch};return DB._test.duty}}; Access.officeScope=function(){return true}; DB._test.failUpdate=true");
  const admin = { role: 'SUPER_ADMIN', id: 'sa' }, request = { dutyId: 'd1', decision: 'APPROVED' };
  assert.throws(() => evaluate('DutyService.decide(admin,request)'), /reconcili/);
  assert.equal(evaluate('DB._test.approvals.length'), 1);
  assert.equal(evaluate('DutyService.decide(admin,request).status'), 'APPROVED');
  assert.equal(evaluate('DB._test.approvals.length'), 1);
  assert.throws(() => evaluate('DutyService.decide(admin,request)'), /sudah diputuskan/);
});

test('CSV export prefixes formula-leading text and quotes embedded delimiters', async () => {
  const client = vm.createContext({ Blob, URL: { createObjectURL: blob => { client.lastBlob = blob; return 'blob:test'; }, revokeObjectURL: () => {} }, document: { createElement: () => ({ click() {} }) } });
  const source = fs.readFileSync(path.join(root, 'Scripts.html'), 'utf8');
  const fn = source.match(/function csvDownload\([^]*?\n/);
  assert.ok(fn, 'csvDownload source should exist');
  vm.runInContext(fn[0], client);
  vm.runInContext("csvDownload('test.csv',['value'],[['=1+1'],['@cmd'],['a,\"b\"']])", client);
  const content = await client.lastBlob.text();
  assert.match(content, /"'=1\+1"/);
  assert.match(content, /"'@cmd"/);
  assert.match(content, /"a,""b"""/);
});
