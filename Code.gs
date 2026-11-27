/**
 * Entry point aplikasi web dan router API.
 * Pastikan seluruh modul .gs serta file HTML proyek sudah ditambahkan
 * ke project Google Apps Script yang sama.
 */

function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');

  // Konfigurasi Firebase web bukan secret server.
  template.firebaseConfig = {
    apiKey: prop_('FIREBASE_WEB_API_KEY', false) || '',
    authDomain: prop_('FIREBASE_AUTH_DOMAIN', false) || '',
    projectId: prop_('FIREBASE_PROJECT_ID', false) || ''
  };

  return template
    .evaluate()
    .setTitle(APP.NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Memasukkan isi file HTML parsial ke template Index. */
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/** Endpoint tunggal yang dipanggil oleh frontend melalui google.script.run. */
function api(action, payload) {
  try {
    const request = payload || {};
    if (action === 'registrationStatus' || action === 'registrationSubmit') {
      const firebaseUser = Auth.verify_(request.token);
      const data = action === 'registrationStatus'
        ? RegistrationService.status(firebaseUser)
        : RegistrationService.submit(firebaseUser, request);
      return { ok: true, data: apiSafeValue_(data) };
    }
    const context = Auth.require_(request.token);
    const data = Router.dispatch_(action, request, context);
    return { ok: true, data: apiSafeValue_(data) };
  } catch (error) {
    console.error('API action failed (' + action + '): ' + String(error && (error.stack || error.message) || error));
    return { ok: false, error: Errors.public_(error) };
  }
}

/** Date objects from Sheets cannot cross google.script.run; normalize response values first. */
function apiSafeValue_(value) {
  if (value === undefined) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? '' : Utils.iso(value);
  if (Array.isArray(value)) return value.map(apiSafeValue_);
  if (value && typeof value === 'object') {
    const result = {};
    Object.keys(value).forEach(function (key) { result[key] = apiSafeValue_(value[key]); });
    return result;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  return value;
}

/** Batasi fungsi pemeliharaan yang diekspos Google.script.run ke pemilik saat menjalankannya dari editor. */
function assertProjectOwner_() {
  const activeEmail = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const effectiveEmail = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
  if (!activeEmail || !effectiveEmail || activeEmail !== effectiveEmail) {
    throw new Error('Fungsi pemeliharaan hanya dapat dijalankan oleh pemilik project dari editor Apps Script.');
  }
}

/**
 * Buat tab dan header database secara idempoten.
 * Fungsi ini tidak mengisi data contoh kecamatan, kantor, atau pegawai.
 */
function initializeDatabase() {
  assertProjectOwner_();
  const spreadsheet = DB.ss();
  const message = DB.init();
  const tabs = spreadsheet.getSheets().map(function (sheet) {
    return {
      name: sheet.getName(),
      rows: sheet.getLastRow(),
      columns: sheet.getLastColumn()
    };
  });

  Logger.log('URL database: ' + spreadsheet.getUrl());
  Logger.log('Spreadsheet ID: ' + spreadsheet.getId());
  Logger.log('Tab: ' + JSON.stringify(tabs));

  return {
    message: message,
    url: spreadsheet.getUrl(),
    spreadsheetId: spreadsheet.getId(),
    tabs: tabs
  };
}

/** Periksa spreadsheet dan tab database tanpa membuat perubahan. */
function inspectDatabase() {
  assertProjectOwner_();
  const spreadsheet = DB.ss();
  const tabs = spreadsheet.getSheets().map(function (sheet) {
    return {
      name: sheet.getName(),
      rows: sheet.getLastRow(),
      columns: sheet.getLastColumn()
    };
  });

  Logger.log('URL database: ' + spreadsheet.getUrl());
  Logger.log('Spreadsheet ID: ' + spreadsheet.getId());
  Logger.log('Tab: ' + JSON.stringify(tabs));

  return {
    url: spreadsheet.getUrl(),
    spreadsheetId: spreadsheet.getId(),
    tabs: tabs
  };
}

/**
 * Reset akun pegawai/admin dan profil pegawai.
 * Mempertahankan Super Admin serta riwayat absensi, koreksi, penugasan, dan audit.
 * Jalankan manual oleh pemilik dari editor Apps Script; fungsi ini tidak tersedia di API web.
 */
function resetEmployeeAdminData() {
  assertProjectOwner_();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const spreadsheet = DB.ss();
    const userSheet = spreadsheet.getSheetByName('USERS');
    if (!userSheet) throw new Error('Tab USERS tidak ditemukan. Jalankan initializeDatabase terlebih dahulu.');
    const headers = TABLES.USERS;
    const roleColumn = headers.indexOf('role');
    const userRows = userSheet.getLastRow() > 1
      ? userSheet.getRange(2, 1, userSheet.getLastRow() - 1, headers.length).getValues()
      : [];
    let removedAccounts = 0;
    for (let i = userRows.length - 1; i >= 0; i--) {
      const row = userRows[i];
      if (!row.some(value => value !== '' && value !== null)) continue;
      if (!['PEGAWAI', 'ADMIN_DESA', 'ADMIN_KECAMATAN'].includes(String(row[roleColumn]).toUpperCase())) continue;
      userSheet.deleteRow(i + 2);
      removedAccounts++;
    }

    const cleared = {};
    ['EMPLOYEES', 'REGISTRATION_REQUESTS'].forEach(name => {
      const sheet = spreadsheet.getSheetByName(name);
      if (!sheet || sheet.getLastRow() <= 1) {
        cleared[name] = 0;
        return;
      }
      cleared[name] = sheet.getLastRow() - 1;
      sheet.getRange(2, 1, cleared[name], Math.max(sheet.getLastColumn(), TABLES[name].length)).clearContent();
    });

    const result = { removedAccounts, cleared };
    AuditService.log({ id: 'SYSTEM_RESET' }, 'EMPLOYEE_ADMIN_DATA_RESET', 'DATABASE', 'EMPLOYEES_AND_USERS', result);
    Logger.log('Reset data pegawai/admin: ' + JSON.stringify(result));
    return result;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Membuat akun Super Admin pertama dari Script Property
 * FIRST_SUPER_ADMIN_EMAIL. Jalankan sekali oleh pemilik project.
 */
function createFirstSuperAdmin() {
  assertProjectOwner_();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const users = DB.rows('USERS');
    if (users.some(function (user) {
      return String(user.role).toUpperCase() === 'SUPER_ADMIN';
    })) {
      throw new Error('Super Admin sudah tersedia. Bootstrap awal ditolak.');
    }

    const properties = PropertiesService.getScriptProperties();
    const email = Utils.email(properties.getProperty('FIRST_SUPER_ADMIN_EMAIL'));
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Isi Script Property FIRST_SUPER_ADMIN_EMAIL dengan email Google admin.');
    }

    const existing = users.find(function (user) {
      return Utils.email(user.email) === email;
    });
    const now = Utils.iso(Utils.now());
    const account = {
      userId: existing ? existing.userId : Utils.id('usr'),
      email: email,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      employeeId: existing ? existing.employeeId : '',
      districtId: '',
      villageId: '',
      createdAt: existing && existing.createdAt ? existing.createdAt : now,
      updatedAt: now
    };

    if (existing) {
      DB.update('USERS', 'userId', existing.userId, account);
    } else {
      DB.append('USERS', account);
    }

    AuditService.log({ id: 'SYSTEM_SETUP' }, 'FIRST_SUPER_ADMIN_CREATED', 'USERS', account.userId, { email: email });
    properties.deleteProperty('FIRST_SUPER_ADMIN_EMAIL');
    Logger.log('Super Admin pertama dibuat untuk: ' + email);
    return { message: 'Super Admin pertama berhasil dibuat.', email: email, userId: account.userId };
  } finally {
    lock.releaseLock();
  }
}

/** Pemetaan aksi frontend ke service backend. */
const Router = {
  dispatch_: function (action, payload, context) {
    const routes = {
      bootstrap: function () {
        return UserService.bootstrap(context);
      },
      dashboard: function () {
        return ReportService.dashboard(context);
      },

      attendanceToday: function () {
        return AttendanceService.today(context);
      },
      attendanceHistory: function () {
        return AttendanceService.history(context, payload);
      },
      checkIn: function () {
        return AttendanceService.punch(context, payload, 'in');
      },
      checkOut: function () {
        return AttendanceService.punch(context, payload, 'out');
      },

      dutyList: function () {
        return DutyService.list(context);
      },
      dutyRequest: function () {
        return DutyService.request(context, payload);
      },
      dutyDecision: function () {
        return DutyService.decide(context, payload);
      },

      correctionRequest: function () {
        return AttendanceService.correction(context, payload);
      },
      correctionList: function () {
        return AttendanceService.correctionList(context);
      },
      correctionDecision: function () {
        return AttendanceService.correctionDecision(context, payload);
      },

      employeeList: function () {
        return EmployeeService.list(context, payload);
      },
      employeeSave: function () {
        return EmployeeService.save(context, payload);
      },
      officeList: function () {
        return OfficeService.list(context);
      },
      officeSave: function () {
        return OfficeService.save(context, payload);
      },
      attendanceAreaList: function () {
        return AttendanceAreaService.list(context);
      },
      attendanceAreaSave: function () {
        return AttendanceAreaService.save(context, payload);
      },
      orgList: function () {
        return OrganizationService.list(context, payload);
      },
      orgSave: function () {
        return OrganizationService.save(context, payload);
      },

      scheduleList: function () {
        return ScheduleService.list(context);
      },
      scheduleSave: function () {
        return ScheduleService.save(context, payload);
      },
      holidayList: function () {
        return ScheduleService.holidays(context);
      },
      holidaySave: function () {
        return ScheduleService.saveHoliday(context, payload);
      },

      report: function () {
        return ReportService.get(context, payload);
      },
      auditList: function () {
        return AuditService.list(context, payload);
      },
      profile: function () {
        return UserService.profile(context);
      },
      settings: function () {
        return UserService.settings(context);
      },
      userList: function () {
        return UserService.userList(context);
      },
      userSave: function () {
        return UserService.userSave(context, payload);
      },
      registrationList: function () {
        return RegistrationService.list(context);
      },
      registrationApprove: function () {
        return RegistrationService.approve(context, payload);
      },
      registrationReject: function () {
        return RegistrationService.reject(context, payload);
      }
    };

    if (!Object.prototype.hasOwnProperty.call(routes, action)) {
      throw new Error('Aksi tidak dikenal.');
    }

    return routes[action]();
  }
};
