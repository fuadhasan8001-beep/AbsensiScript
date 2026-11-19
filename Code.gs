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
    const context = Auth.require_(request.token);
    const data = Router.dispatch_(action, request, context);
    return { ok: true, data: data };
  } catch (error) {
    return { ok: false, error: Errors.public_(error) };
  }
}

/**
 * Buat tab dan header database secara idempoten.
 * Fungsi ini tidak mengisi data contoh kecamatan, kantor, atau pegawai.
 */
function initializeDatabase_() {
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
function inspectDatabase_() {
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
 * Membuat akun Super Admin pertama dari Script Property
 * FIRST_SUPER_ADMIN_EMAIL. Jalankan sekali oleh pemilik project.
 */
function createFirstSuperAdmin_() {
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
      }
    };

    if (!Object.prototype.hasOwnProperty.call(routes, action)) {
      throw new Error('Aksi tidak dikenal.');
    }

    return routes[action]();
  }
};
