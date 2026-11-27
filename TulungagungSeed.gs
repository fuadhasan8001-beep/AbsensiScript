/**
 * Data contoh wilayah dan akun Kabupaten Tulungagung.
 * Sumber nama/kode desa: BPS, Master File Desa Provinsi Jawa Timur 2022.
 * Jalankan manual oleh pemilik project setelah database tersedia.
 * Seeder idempotent: hanya menambahkan record yang belum ada.
 */
const TULUNGAGUNG_SEED_DISTRICTS = [
  ['3504010','BESUKI','SEDAYUGUNUNG|KEBOIRENG|BESUKI|BESOLE|TANGGULWELAHAN|TANGGULTURUS|TANGGULKUNDUNG|WATESKROYO|SIYOTOBAGUS|TULUNGREJO'],
  ['3504020','BANDUNG','NGLAMPIR|TALUNKULON|BANTENGAN|KEDUNGWILUT|SUWARU|NGUNGGAHAN|SURUHAN KIDUL|BANDUNG|MERGAYU|SEBALOR|SUKOHARJO|SINGGIT|SURUHAN LOR|KESAMBI|GANDONG|BULUS|NGEPEH|SOKO'],
  ['3504030','PAKEL','SAMBITAN|BONO|SUKOANYAR|DUWET|TAMBAN|NGEBONG|SODO|GOMBANG|PAKEL|SUWALUH|PECUK|BANGUNMULYO|KASREMAN|SANAN|BANGUNJAYA|NGRANCE|GEBANG|GESIKAN|GEMPOLAN'],
  ['3504040','CAMPUR DARAT','NGENTRONG|SAWO|GEDANGAN|GAMPING|CAMPURDARAT|WATES|PELEM|POJOK|TANGGUNG'],
  ['3504050','TANGGUNG GUNUNG','NGREJO|JENGGLUNGHARJO|KRESIKAN|TANGGUNGGUNUNG|NGEPOH|TENGGAREJO|PAKISREJO'],
  ['3504060','KALIDAWIR','KALIBATUR|REJOSARI|SUKOREJO KULON|BANYUURIP|WINONG|JOHO|PAKISAJI|KARANGTALUN|KALIDAWIR|NGUBALAN|SALAK KEMBANG|TUNGGANGRI|JABON|PAGERSARI|BETAK|TANJUNG|DOMASAN'],
  ['3504061','PUCANG LABAN','PANGGUNGKALAK|KALIDAWE|PUCANGLABAN|SUMBERBENDO|KALIGENTONG|MANDING|PANGGUNGUNI|SUMBERDADAP|DEMUK'],
  ['3504070','REJOTANGAN','TENGGONG|PANJEREJO|KARANGSARI|TUGU|SUKOREJO WETAN|TANEN|SUMBERAGUNG|BLIMBING|PAKISREJO|TEGALREJO|BANJAREJO|JATIDOWO|TENGGUR|BUNTARAN|ARIYOJEDING|REJOTANGAN'],
  ['3504080','NGUNUT','BALESONO|SELOREJO|SAMIR|KARANGSONO|KACANGAN|PANDANSARI|SUMBERINGIN KULON|SUMBERINGIN KIDUL|KALANGAN|GILANG|KALIWUNGU|NGUNUT|SUMBEREJO WETAN|SUMBEREJO KULON|PURWOREJO|KROMASAN|PULOSARI|PULOTONDO'],
  ['3504090','SUMBERGEMPOL','JUNJUNG|PODOREJO|WATES|SAMBIDOPLANG|MIRIGAMBAR|TRENCENG|BENDILWUNGU|SAMBIJAJAR|TAMBAKREJO|DOROAMPEL|WONOREJO|BENDILJATI KULON|BENDILJATI WETAN|SUMBERDADI|JABALSARI|SAMBIROBYONG|BUKUR'],
  ['3504100','BOYOLANGU','NGRANTI|KENDALBULUR|BOYOLANGU|PUCUNG KIDUL|SANGGRAHAN|WAJAK KIDUL|KARANGREJO|WAJAK LOR|KEPUH|TANJUNGSARI|SERUT|BEJI|SOBONTORO|GEDANGSEWU|MOYOKETEN|WAUNG|BONO'],
  ['3504110','TULUNGAGUNG','KEDUNGSOKO|TERTEK|KARANGWARU|TAMANAN|JEPUN|BAGO|KEPATIHAN|KAMPUNGDALEM|KAUMAN|KUTOANYAR|SEMBUNG|PANGGUNGREJO|BOTORAN|KENAYAN'],
  ['3504120','KEDUNGWARU','PLOSOKANDANG|TUNGGULSARI|RINGINPITU|LODERESAN|BULUSARI|BANGOAN|REJOAGUNG|KEDUNGWARU|PLANDAAN|MANGUNSARI|TAWANGSARI|WINONG|MAJAN|SIMO|KETANON|GENDINGAN|TAPAN|NGUJANG|BORO'],
  ['3504130','NGANTRU','PAKEL|PUCUNG LOR|SRIKATON|PADANGAN|PINGGIRSARI|BENDOSARI|NGANTRU|PULEREJO|POJOK|KEPUHREJO|MOJOAGUNG|BATOKAN|BANJARSARI'],
  ['3504140','KARANGREJO','BUNGUR|BABADAN|SUKOWIYONO|SEMBON|SUKOWIDODO|TANJUNGSARI|GEDANGAN|SUKODONO|KARANGREJO|SUKOREJO|PUNJUL|TULUNGREJO|JELI'],
  ['3504150','KAUMAN','PUCANGAN|BOLOREJO|KAUMAN|BALEREJO|BATANGSAREN|PANGGUNGREJO|SIDOREJO|KALANGBRET|MOJOSARI|KARANGANOM|KATES|BANARAN|JATIMULYO'],
  ['3504160','GONDANG','KENDAL|TAWING|GONDOSULI|DUKUH|SEPATAN|MACANBANG|KIPING|REJOSARI|BENDO|NGRENDENG|GONDANG|BENDUNGAN|MOJOARUM|SIDOMULYO|NOTOREJO|SIDEM|BLENDIS|TIUDAN|WONOKROMO|JARAKAN'],
  ['3504170','PAGER WOJO','WONOREJO|KEDUNGCANGKRING|MULYOSARI|SEGAWE|PENJOR|SAMAR|SIDOMULYO|KRADINAN|PAGERWOJO|GONDANGGUNUNG|GAMBIRAN'],
  ['3504180','SENDANG','KEDOYO|NGLUTUNG|TALANG|DONO|KROSOK|TUGU|PICISAN|NYAWANGAN|SENDANG|NGLURUP|GEGER']
];

function seedTulungagungDummyData() {
  assertProjectOwner_();
  DB.init();
  const counts = { kecamatan:0, desa:0, offices:0, employees:0, users:0 };
  const stamp = Utils.iso(Utils.now());
  const districts = DB.rows('KECAMATAN'), villages = DB.rows('DESA'), offices = DB.rows('OFFICES'), employees = DB.rows('EMPLOYEES'), users = DB.rows('USERS');
  const districtIds = new Set(districts.map(x=>String(x.districtId)));
  const villageIds = new Set(villages.map(x=>String(x.villageId)));
  const officeIds = new Set(offices.map(x=>String(x.officeId)));
  const employeeIds = new Set(employees.map(x=>String(x.employeeId)));
  const emails = new Set(users.map(x=>String(x.email).toLowerCase()));
  const pending = { KECAMATAN:[], DESA:[], OFFICES:[], EMPLOYEES:[], USERS:[] };
  TULUNGAGUNG_SEED_DISTRICTS.forEach(([districtId, name, villageList]) => {
    if (!districtIds.has(districtId)) { pending.KECAMATAN.push({districtId,name,code:districtId,status:'ACTIVE'}); counts.kecamatan++; }
    villageList.split('|').forEach((villageName,index) => {
      const villageId = districtId + String(index+1).padStart(3,'0');
      if (!villageIds.has(villageId)) { pending.DESA.push({villageId,districtId,name:villageName,code:villageId,status:'ACTIVE'}); counts.desa++; }
    });
    const officeId = 'DUMMY-OFF-'+districtId;
    if (!officeIds.has(officeId)) { pending.OFFICES.push({officeId,name:'KANTOR CONTOH - '+name,type:'KECAMATAN',districtId,villageId:'',address:'DATA DUMMY - BUKAN LOKASI KANTOR',latitude:'',longitude:'',radiusM:15,status:'INACTIVE'}); counts.offices++; }
    [
      { suffix:'EMP', role:'PEGAWAI', title:'Pegawai Contoh' },
      { suffix:'ADM', role:'ADMIN_KECAMATAN', title:'Admin Contoh Kecamatan' }
    ].forEach(sample => {
      const id = 'DUMMY-'+sample.suffix+'-'+districtId, email = sample.suffix.toLowerCase()+'.'+districtId+'@example.test';
      if (!employeeIds.has(id)) { pending.EMPLOYEES.push({employeeId:id,identityNo:'DUMMY-NIP-'+districtId+'-'+sample.suffix,name:sample.title+' '+name,email,phone:'',position:sample.title,unit:'Kecamatan '+name,primaryOfficeId:officeId,status:'INACTIVE',startDate:'',createdAt:stamp}); counts.employees++; }
      if (!emails.has(email)) { pending.USERS.push({userId:id,email,role:sample.role,status:'INACTIVE',employeeId:id,districtId,villageId:'',createdAt:stamp,updatedAt:stamp}); counts.users++; }
    });
  });
  Object.keys(pending).forEach(tableName=>DB.appendMany(tableName,pending[tableName]));
  return { message:'Data dummy Tulungagung selesai ditambahkan. Penulisan dilakukan per tabel dalam batch; fungsi aman dijalankan ulang.', counts, totalDesa:TULUNGAGUNG_SEED_DISTRICTS.reduce((n,d)=>n+d[2].split('|').length,0) };
}
