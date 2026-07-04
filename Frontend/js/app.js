/**
 * MedChain — app.js
 * Page-specific controllers, mock data, and event handlers.
 * All blockchain calls are stubbed — replace with real contract calls
 * by swapping the Wallet.Contract.send() stubs.
 */

'use strict';

/* ══════════════════════════════════════════
   BRIDGE — penghubung nyata ke backend & smart contract.
   Semua fungsi di sini otomatis FALLBACK ke mode simulasi
   (UI.simulateTx) kalau:
   - wallet masih simulasi (MetaMask tidak terdeteksi), ATAU
   - Config.CONTRACT_ADDRESS belum diisi.
   Jadi halaman tidak akan error walau backend/contract belum disiapkan.
══════════════════════════════════════════ */

const Bridge = {
  isLive() {
    const simulated = localStorage.getItem('mc_simulated') === '1';
    return !simulated && window.Config && Config.isConfigured && Wallet.getSigner();
  },

  /** Kirim transaksi state-changing (grantAccess, revokeAccess, addMedicalRecord, dst). */
  async sendTx(method, args, simulateLabel) {
    if (!this.isLive()) {
      return await UI.simulateTx(simulateLabel, 1200, 2800); // fallback demo, return fake txHash
    }
    const receipt = await Wallet.Contract.send(Config.CONTRACT_ADDRESS, Config.CONTRACT_ABI, method, ...args);
    return receipt.hash;
  },

  /** Baca data view dari contract (getRecord, hasAccess, dst). Return null kalau tidak live. */
  async readContract(method, args) {
    if (!this.isLive()) return null;
    return await Wallet.Contract.call(Config.CONTRACT_ADDRESS, Config.CONTRACT_ABI, method, ...args);
  },

  /** Panggil endpoint backend (untuk upload IPFS & operasi admin yang direlay backend). */
  async api(path, options = {}) {
    if (!window.Config || !Config.API_BASE_URL) {
      throw new Error('Config.API_BASE_URL belum diisi di js/config.js');
    }
    const res = await fetch(`${Config.API_BASE_URL}${path}`, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      throw new Error(data.message || `Permintaan ke ${path} gagal`);
    }
    return data;
  },
};
window.Bridge = Bridge;

/* ══════════════════════════════════════════
   MOCK DATA  (replace with blockchain reads)
══════════════════════════════════════════ */

const MockData = {
  records: [
    { id: 'rec_seed_1', date: '12 Jun 2025', doctor: 'Dr. Aditya Putra', hospital: 'RS Cipto', diagnosis: 'Pemeriksaan Rutin — Normal', ipfsHash: 'QmXyz...1A2B', txHash: '0xabc1...def2', status: 'verified' },
    { id: 'rec_seed_2', date: '05 Mei 2025', doctor: 'Dr. Rina Dewi', hospital: 'Klinik Prima', diagnosis: 'Hasil Lab Darah — Normal', ipfsHash: 'QmAbc...3C4D', txHash: '0x1234...5678', status: 'verified' },
    { id: 'rec_seed_3', date: '10 Jan 2025', doctor: 'Dr. Hendro', hospital: 'RS Pusat', diagnosis: 'Radiologi Toraks — Clear', ipfsHash: 'QmDef...5E6F', txHash: '0x9abc...def0', status: 'verified' },
  ],

  accessList: [
    { address: '0x4A23...8921', label: 'Dr. Aditya Putra', grantedAt: '12 Jun 2025', expires: 'Tidak Terbatas' },
    { address: '0x9BFc...12F4', label: 'RS Pusat (Admin)', grantedAt: '01 Jan 2025', expires: '31 Des 2025' },
  ],

  accessLogs: [
    { time: 'Hari ini, 10:45', actor: '0x4A23...8921', action: 'Membaca Rekam Medis', txHash: '0xabc1...ef45', type: 'read' },
    { time: 'Kemarin, 14:20', actor: 'Anda', action: 'Memberikan Akses', txHash: '0x1234...5678', type: 'grant' },
    { time: '3 hari lalu, 08:00', actor: '0x9BFc...12F4', action: 'Membaca Rekam Medis', txHash: '0xcc11...2233', type: 'read' },
    { time: '5 hari lalu, 16:30', actor: 'Anda', action: 'Mencabut Akses', txHash: '0xdd22...3344', type: 'revoke' },
  ],

  doctorPatients: [
    { address: '0x7E1A...BB23', name: 'Siti Rahayu', age: 34, lastVisit: '12 Jun 2025', status: 'Active' },
    { address: '0x3CB5...44A1', name: 'Budi Santoso', age: 51, lastVisit: '05 Mei 2025', status: 'Active' },
    { address: '0xF2D8...99C0', name: 'Citra Lestari', age: 28, lastVisit: '10 Jan 2025', status: 'Inactive' },
  ],

  adminStats: { patients: 1245, doctors: 84, records: 8932, transactions: 21089 },

  adminLogs: [
    { time: '2 menit lalu', actor: '0x4A23...8921', action: 'Dokter Terdaftar', txHash: '0x99aa...bbcc', type: 'register' },
    { time: '15 menit lalu', actor: '0x4A23...8921', action: 'Rekam Medis Ditambahkan', txHash: '0x45cd...ef56', type: 'record' },
    { time: '1 jam lalu', actor: '0x11A0...22B3', action: 'Izin Akses Dicabut', txHash: '0x1122...3344', type: 'revoke' },
    { time: '2 jam lalu', actor: '0xF2D8...99C0', action: 'Pasien Terdaftar', txHash: '0xeeff...0011', type: 'register' },
    { time: '3 jam lalu', actor: '0x9BFc...12F4', action: 'Akses Diberikan', txHash: '0xaabb...ccdd', type: 'grant' },
  ],

  adminEntities: [
    { address: '0x4A23...8921', name: 'Dr. Aditya Putra', type: 'Dokter', registeredAt: '01 Jan 2025', status: 'Aktif' },
    { address: '0x9BFc...12F4', name: 'RS Pusat (Admin)', type: 'Rumah Sakit', registeredAt: '15 Des 2024', status: 'Aktif' },
    { address: '0xF2D8...99C0', name: 'Citra Lestari', type: 'Pasien', registeredAt: '10 Jan 2025', status: 'Aktif' },
    { address: '0x3CB5...44A1', name: 'Budi Santoso', type: 'Pasien', registeredAt: '05 Mei 2025', status: 'Aktif' },
    { address: '0xA9E3...FF12', name: 'Dr. Rina Dewi', type: 'Dokter', registeredAt: '20 Feb 2025', status: 'Aktif' },
  ],
};

/* ══════════════════════════════════════════
   STORE — persist MockData ke localStorage
   supaya data nyambung & gak reset antar
   halaman (pasien/dokter/admin) maupun refresh.
   (Di sistem nyata, ini peran blockchain +
   IPFS sebagai "sumber kebenaran" bersama.)
══════════════════════════════════════════ */
const Store = {
  KEY: 'mc_store_v1',
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  },
  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(MockData)); } catch (_) { /* abaikan kalau storage penuh/diblokir */ }
  },
  reset() {
    try { localStorage.removeItem(this.KEY); } catch (_) {}
    window.location.reload();
  },
};

(function hydrateMockData() {
  const saved = Store.load();
  if (saved && Array.isArray(saved.records)) {
    Object.assign(MockData, saved); // pakai data tersimpan kalau ada
  } else {
    Store.save(); // pertama kali dibuka: simpan default sebagai baseline
  }
})();


/* ══════════════════════════════════════════
   RENDER HELPERS
══════════════════════════════════════════ */

function logBadge(type) {
  const map = {
    read:     'badge-cyan',
    grant:    'badge-green',
    revoke:   'badge-red',
    register: 'badge-purple',
    record:   'badge-amber',
  };
  return `<span class="badge ${map[type] || 'badge-gray'}">${UI.escapeHtml(type)}</span>`;
}

function logIcon(type) {
  const map = {
    read:     { icon: 'fa-eye',           bg: 'var(--color-cyan-light)',   color: 'var(--color-cyan)' },
    grant:    { icon: 'fa-key',           bg: 'var(--color-green-light)',  color: 'var(--color-green)' },
    revoke:   { icon: 'fa-ban',           bg: 'var(--color-red-light)',    color: 'var(--color-red)' },
    register: { icon: 'fa-user-plus',     bg: 'var(--color-purple-light)', color: 'var(--color-purple)' },
    record:   { icon: 'fa-file-medical',  bg: 'var(--color-amber-light)',  color: 'var(--color-amber)' },
  };
  const cfg = map[type] || { icon: 'fa-circle', bg: 'var(--color-bg)', color: 'var(--color-navy-400)' };
  return `<div class="activity-icon" style="background:${cfg.bg};color:${cfg.color}"><i class="fas ${cfg.icon}"></i></div>`;
}


/* ══════════════════════════════════════════
   PATIENT PAGE CONTROLLER
══════════════════════════════════════════ */

const PatientApp = {
  async init() {
    await this.loadRealRecords();
    await this.loadRealAccessList();
    this.renderRecords();
    this.renderAccessList();
    this.renderLogs();
    this.bindEvents();
    UI.initTabs('#patient-tabs');
    UI.showView('records');
  },

  /** Baca daftar izin aktif dari blockchain via hasAccess.
   *  Karena kontrak tidak menyimpan list address dokter per pasien,
   *  kita baca dari event AccessGranted & AccessRevoked via backend. */
  async loadRealAccessList() {
    try {
      if (!Bridge.isLive()) return;
      const account = Wallet.getAccount() || localStorage.getItem('mc_account');
      if (!account) return;

      // Ambil daftar access dari backend (backend membaca event blockchain)
      const res = await Bridge.api(`/access/${account}`).catch(() => null);
      if (!res || !res.data) return;

      MockData.accessList = (res.data || []).map(item => ({
        address:   item.doctorAddress,
        label:     item.doctorName || Wallet.shortAddress(item.doctorAddress),
        grantedAt: item.grantedAt
          ? new Date(Number(item.grantedAt) * 1000).toLocaleDateString('id-ID')
          : '—',
        expires: 'Tidak Terbatas',
      }));
    } catch (err) {
      console.warn('Gagal memuat access list on-chain, pakai data demo:', err.message);
    }
  },

  /** Kalau wallet terhubung asli (bukan demo) & contract sudah dikonfigurasi,
   *  timpa MockData.records dengan data on-chain hasil getRecord(). */
  async loadRealRecords() {
    try {
      const account = Wallet.getAccount() || localStorage.getItem('mc_account');
      if (!Bridge.isLive() || !account) return; // tetap pakai data demo

      const records = await Bridge.readContract('getRecord', [account]);
      if (!records) return;

      MockData.records = records.map(r => ({
        id: 'rec_' + r.id.toString(),
        date: new Date(Number(r.timestamp) * 1000).toLocaleDateString('id-ID'),
        doctor: Wallet.shortAddress(r.doctor),
        hospital: '—',
        diagnosis: r.diagnosis,
        ipfsHash: r.ipfsCID,
        txHash: '', // tidak tersimpan di struct; ambil dari event RecordAdded kalau perlu ditampilkan
        status: 'verified',
      }));
    } catch (err) {
      console.warn('Gagal mengambil rekam medis on-chain, menampilkan data demo:', err.message);
    }
  },

  renderRecords() {
    const tbody = document.getElementById('records-tbody');
    if (!tbody) return;
    tbody.innerHTML = MockData.records.map(r => {
      const isPending = r.status === 'pending';
      const statusBadge = isPending
        ? `<span class="badge badge-amber"><i class="fas fa-clock"></i> Menunggu Verifikasi</span>`
        : `<span class="badge badge-green"><i class="fas fa-shield-alt"></i> Terverifikasi</span>`;
      const etherscanBtn = r.txHash
        ? `<a class="btn btn-sm btn-outline" href="https://sepolia.etherscan.io/tx/${UI.escapeHtml(r.txHash)}" target="_blank" title="Verifikasi di Etherscan">
             <i class="fas fa-external-link-alt"></i>
           </a>`
        : `<button class="btn btn-sm btn-outline" disabled title="Belum tercatat on-chain — menunggu dokter">
             <i class="fas fa-hourglass-half"></i>
           </button>`;
      return `
      <tr>
        <td>${UI.escapeHtml(r.date)}</td>
        <td>
          <div style="font-weight:600;font-size:0.875rem;color:var(--color-navy)">${UI.escapeHtml(/^0x[a-fA-F0-9]{40}$/.test(r.doctor||'') ? Wallet.shortAddress(r.doctor) : (r.doctor || '—'))}</div>
          <div style="font-size:0.75rem;color:var(--color-navy-400)">${UI.escapeHtml(r.hospital)}</div>
        </td>
        <td>${UI.escapeHtml(r.diagnosis)}</td>
        <td>
          <code class="mono" style="font-size:0.75rem;color:var(--color-navy-400)" title="${UI.escapeHtml(r.ipfsHash)}">${UI.escapeHtml(r.ipfsHash)}</code>
        </td>
        <td>${statusBadge}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-outline" onclick="PatientApp.viewDoc('${UI.escapeHtml(r.ipfsHash)}')">
              <i class="fas fa-eye"></i> Lihat
            </button>
            ${etherscanBtn}
          </div>
        </td>
      </tr>
    `;
    }).join('');
  },

  renderAccessList() {
    const ul = document.getElementById('access-list');
    if (!ul) return;
    ul.innerHTML = MockData.accessList.map(item => `
      <li class="access-item">
        <span class="dot"></span>
        <div style="flex:1;min-width:0">
          <div class="addr truncate">${UI.escapeHtml(item.address)}</div>
          <div class="label">${UI.escapeHtml(item.label)} · Diberikan: ${UI.escapeHtml(item.grantedAt)}</div>
        </div>
        <button class="btn btn-danger" onclick="PatientApp.revokeAccess('${UI.escapeHtml(item.address)}', this)">
          <i class="fas fa-times"></i> Revoke
        </button>
      </li>
    `).join('');
  },

  renderLogs() {
    const ul = document.getElementById('access-logs');
    if (!ul) return;
    ul.innerHTML = MockData.accessLogs.map(log => `
      <li class="activity-item">
        ${logIcon(log.type)}
        <div class="activity-body">
          <div class="activity-title">${UI.escapeHtml(log.action)}</div>
          <div class="activity-meta">Oleh: <span class="mono">${UI.escapeHtml(log.actor)}</span></div>
          <a class="activity-tx" href="https://sepolia.etherscan.io/tx/${UI.escapeHtml(log.txHash)}" target="_blank">
            <i class="fas fa-link" style="font-size:10px;margin-right:3px"></i>${UI.escapeHtml(log.txHash)}
          </a>
        </div>
        <span class="activity-time">${UI.escapeHtml(log.time)}</span>
      </li>
    `).join('');
  },

  bindEvents() {
    document.getElementById('form-grant')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('grant-address');
      const addr  = input.value.trim();
      const btn   = e.target.querySelector('button[type=submit]');

      if (!addr) return;
      if (!UI.isValidAddress(addr)) {
        UI.Toast.error('Alamat Tidak Valid', 'Masukkan alamat Ethereum yang valid (0x...)');
        return;
      }

      const restore = UI.setButtonLoading(btn, 'Menandatangani…');
      try {
        const txHash = await Bridge.sendTx('grantAccess', [addr], 'grantAccess(address)');
        const account = Wallet.getAccount() || localStorage.getItem('mc_account');
        if (Bridge.isLive() && account) {
          // Lapor ke backend supaya cache /api/access tetap sinkron tanpa
          // perlu scan eth_getLogs (kena limit 10 block/request di Alchemy free tier)
          Bridge.api('/access/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patient: account, doctor: addr, action: 'grant', txHash }),
          }).catch(() => {});
        }
        MockData.accessList.push({
          address: addr, label: 'Alamat Baru',
          grantedAt: UI.formatTime(new Date()).split(',')[0], expires: 'Tidak Terbatas',
        });
        MockData.accessLogs.unshift({ time: 'Baru saja', actor: 'Anda', action: 'Memberikan Akses', txHash: UI.shortHash(txHash), type: 'grant' });
        Store.save();
        this.renderAccessList();
        this.renderLogs();
        input.value = '';
        UI.Toast.success('Akses Diberikan!', `Tx: ${UI.shortHash(txHash)}`);
      } catch (err) {
        UI.Toast.error('Transaksi Gagal', err.message);
      } finally { restore(); }
    });
  },

  async revokeAccess(addr, btn) {
    const restore = UI.setButtonLoading(btn, '…');
    try {
      const txHash = await Bridge.sendTx('revokeAccess', [addr], 'revokeAccess(address)');
      const account = Wallet.getAccount() || localStorage.getItem('mc_account');
      if (Bridge.isLive() && account) {
        Bridge.api('/access/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patient: account, doctor: addr, action: 'revoke', txHash }),
        }).catch(() => {});
      }
      // Hapus dari list lokal dulu (optimistic update)
      MockData.accessList = MockData.accessList.filter(i => i.address !== addr);
      MockData.accessLogs.unshift({ time: 'Baru saja', actor: 'Anda', action: 'Mencabut Akses', txHash: UI.shortHash(txHash), type: 'revoke' });
      Store.save();
      // Reload dari blockchain untuk memastikan data akurat
      await this.loadRealAccessList();
      this.renderAccessList();
      this.renderLogs();
      UI.Toast.success('Akses Dicabut', `Tx: ${UI.shortHash(txHash)}`);
    } catch (err) {
      UI.Toast.error('Gagal', err.message);
      restore();
    }
  },

  viewDoc(hash) {
    UI.Toast.info('Membuka Dokumen', `IPFS: ${hash} (placeholder — sambungkan ke IPFS gateway)`);
  },
};


/* ══════════════════════════════════════════
   DOCTOR PAGE CONTROLLER
══════════════════════════════════════════ */

const DoctorApp = {
  init() {
    this.renderPatients();
    this.renderPendingRequests();
    this.bindEvents();
    UI.initTabs('#doctor-tabs');
    UI.showView('search');
  },

  /* ── Permintaan Verifikasi (dokumen yang diunggah pasien) ── */
  renderPendingRequests() {
    const tbody = document.getElementById('pending-tbody');
    const badge = document.getElementById('badge-pending-doctor');
    const currentDoctor = (localStorage.getItem('mc_account') || '').toLowerCase();
    const pending = MockData.records.filter(r =>
      r.status === 'pending' &&
      (r.doctorWallet || r.doctor || '').toLowerCase() === currentDoctor
    );

    if (badge) {
      badge.textContent = pending.length;
      badge.style.display = pending.length ? 'inline-flex' : 'none';
    }
    if (!tbody) return;

    if (!currentDoctor) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--color-navy-400)">
        <i class="fas fa-wallet"></i> Hubungkan wallet dokter untuk melihat permintaan verifikasi yang ditujukan kepada Anda.
      </td></tr>`;
      return;
    }

    if (!pending.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--color-navy-400)">
        <i class="fas fa-inbox"></i> Tidak ada permintaan verifikasi saat ini.
      </td></tr>`;
      return;
    }

    tbody.innerHTML = pending.map(r => `
      <tr>
        <td><code class="mono" style="font-size:0.8125rem">${UI.escapeHtml(r.patientAddress ? Wallet.shortAddress(r.patientAddress) : '—')}</code></td>
        <td>${UI.escapeHtml(r.diagnosis)}</td>
        <td style="max-width:220px;font-size:0.8125rem;color:var(--color-navy-400)">${UI.escapeHtml(r.note || '—')}</td>
        <td><code class="mono" style="font-size:0.75rem;color:var(--color-navy-400)" title="${UI.escapeHtml(r.ipfsHash)}">${UI.escapeHtml((r.ipfsHash||'').slice(0,14))}…</code></td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="DoctorApp.openVerifyModal('${UI.escapeHtml(r.id)}')">
            <i class="fas fa-clipboard-check"></i> Verifikasi
          </button>
        </td>
      </tr>
    `).join('');
  },

  openVerifyModal(id) {
    const r = MockData.records.find(x => x.id === id);
    if (!r) return;
    document.getElementById('verify-record-id').value = id;
    document.getElementById('verify-patient-display').value = r.patientAddress || '—';
    document.getElementById('verify-ipfs-display').value = r.ipfsHash || '—';
    document.getElementById('verify-diagnosis').value = '';
    document.getElementById('verify-hospital').value = '';
    UI.openModal('modal-verify');
  },

  async verifyRecord(id, diagnosis, hospital) {
    const r = MockData.records.find(x => x.id === id);
    if (!r) return;

    // Simulasi proses addMedicalRecord() oleh dokter
    const t1 = UI.Toast.loading('Memeriksa dokumen…', 'Membandingkan hash IPFS');
    await new Promise(res => setTimeout(res, 900));
    UI.Toast.dismiss(t1);

    const txHash = await UI.simulateTx('addMedicalRecord(address, string)', 1500, 2800);

    r.status    = 'verified';
    r.diagnosis = diagnosis;
    r.hospital  = hospital || r.hospital || '—';
    r.doctor    = localStorage.getItem('mc_account') ? `Anda (${Wallet.shortAddress(localStorage.getItem('mc_account'))})` : 'Anda';
    r.txHash    = txHash;
    Store.save();

    UI.Toast.success('Rekam Medis Terverifikasi!', `Tx: ${UI.shortHash(txHash)} — pasien akan melihat status ini diperbarui.`);
    this.renderPendingRequests();
    UI.closeModal('modal-verify');
  },

  renderPatients() {
    const tbody = document.getElementById('patients-tbody');
    if (!tbody) return;
    tbody.innerHTML = MockData.doctorPatients.map(p => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--color-cyan),var(--color-purple));display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:700;flex-shrink:0">
              ${UI.escapeHtml(p.name[0])}
            </div>
            <div>
              <div style="font-weight:600;font-size:0.875rem">${UI.escapeHtml(p.name)}</div>
              <div class="mono text-xs text-muted">${UI.escapeHtml(p.address)}</div>
            </div>
          </div>
        </td>
        <td>${p.age} th</td>
        <td>${UI.escapeHtml(p.lastVisit)}</td>
        <td><span class="badge ${p.status === 'Active' ? 'badge-green' : 'badge-gray'}">${p.status === 'Active' ? 'Aktif' : 'Tidak Aktif'}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="DoctorApp.loadPatient('${UI.escapeHtml(p.address)}')">
            <i class="fas fa-search"></i> Cari
          </button>
        </td>
      </tr>
    `).join('');
  },

  bindEvents() {
    // Search form
    document.getElementById('form-search')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('search-address');
      const addr  = input.value.trim();
      await this.searchPatient(addr);
    });

    // Add record form
    document.getElementById('form-add-record')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type=submit]');
      const restore = UI.setButtonLoading(btn, 'Mengenkripsi & Menyimpan…');

      const patientAddr = document.getElementById('rec-patient-addr')?.value.trim();
      const diagnosis    = document.getElementById('rec-diagnosis')?.value.trim();
      const fileInput     = document.getElementById('rec-document');
      const file = fileInput?.files?.[0];

      try {
        let ipfsCID, documentHash;

        if (Bridge.isLive()) {
          if (!file) throw new Error('Pilih dokumen rekam medis terlebih dahulu');

          // Step 1: Upload dokumen ke backend -> backend yang teruskan ke IPFS (Pinata)
          const t1 = UI.Toast.loading('Mengunggah ke IPFS…', 'Lewat backend MedChain');
          const form = new FormData();
          form.append('document', file);
          const uploadRes = await Bridge.api('/records/upload', { method: 'POST', body: form });
          ipfsCID      = uploadRes.data.ipfsCID;
          documentHash = uploadRes.data.documentHash;
          UI.Toast.dismiss(t1);

          // Step 2: Dokter menandatangani transaksi addMedicalRecord() lewat MetaMask
          const txHash = await Bridge.sendTx(
            'addMedicalRecord',
            [patientAddr, ipfsCID, documentHash, diagnosis],
            'addMedicalRecord(address, string)'
          );
          UI.Toast.success('Rekam Medis Tersimpan!', `IPFS: ${ipfsCID.slice(0,12)}… | Tx: ${UI.shortHash(txHash)}`);
        } else {
          // Mode demo: tetap simulasi seperti sebelumnya
          const t1 = UI.Toast.loading('Mengenkripsi dokumen…', 'Mempersiapkan upload ke IPFS');
          await new Promise(r => setTimeout(r, 1400));
          UI.Toast.dismiss(t1);

          const t2 = UI.Toast.loading('Mengunggah ke IPFS…', 'Menyimpan dokumen terenkripsi');
          await new Promise(r => setTimeout(r, 1200));
          ipfsCID = 'Qm' + [...Array(44)].map(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.random()*62|0]).join('');
          UI.Toast.dismiss(t2);

          const txHash = await UI.simulateTx('addMedicalRecord(address, string)', 1800, 3200);
          UI.Toast.success('Rekam Medis Tersimpan!', `IPFS: ${ipfsCID.slice(0,12)}… | Tx: ${UI.shortHash(txHash)}`);
        }

        e.target.reset();
      } catch (err) {
        UI.Toast.error('Gagal Menyimpan', err.message);
      } finally { restore(); }
    });

    // Verify (permintaan dari pasien) form
    document.getElementById('form-verify')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id        = document.getElementById('verify-record-id').value;
      const diagnosis = document.getElementById('verify-diagnosis').value.trim();
      const hospital  = document.getElementById('verify-hospital').value.trim();
      if (!diagnosis) return;

      const btn = e.target.querySelector('button[type=submit]');
      const restore = UI.setButtonLoading(btn, 'Memverifikasi…');
      try {
        await this.verifyRecord(id, diagnosis, hospital);
      } finally { restore(); }
    });
  },

  loadPatient(addr) {
    const input = document.getElementById('search-address');
    if (input) input.value = addr;
    // Switch to search tab and search
    document.querySelector('[data-tab="tab-search"]')?.click();
    this.searchPatient(addr);
  },

  async searchPatient(addr) {
    const resultDiv = document.getElementById('search-result');
    if (!resultDiv) return;
    if (!addr) return;

    resultDiv.className = 'result-box';
    resultDiv.innerHTML = `<div style="text-align:center;padding:12px"><i class="fas fa-spinner" style="animation:spin 1s linear infinite;color:var(--color-cyan)"></i> Memeriksa izin di smart contract…</div>`;

    let granted;
    let patientInfo = null;
    if (Bridge.isLive()) {
      try {
        const doctorAddr = Wallet.getAccount();
        granted = await Bridge.readContract('hasAccess', [addr, doctorAddr]);

        // Cek juga apakah alamat ini benar-benar pasien terdaftar,
        // supaya pencarian wallet yang belum/tidak terdaftar tidak
        // ditampilkan seolah-olah hanya soal izin akses.
        try {
          const res = await Bridge.api(`/patients/${addr}`);
          if (res?.data?.isRegistered) patientInfo = res.data;
        } catch (_) { /* belum terdaftar atau backend offline — abaikan, lanjut tampilkan hasil hasAccess saja */ }
      } catch (err) {
        resultDiv.className = 'result-box denied';
        resultDiv.innerHTML = `<div class="result-title" style="color:#b91c1c"><i class="fas fa-exclamation-circle"></i> Gagal Memeriksa</div>
          <div class="result-sub" style="color:#dc2626">${UI.escapeHtml(err.message)}</div>`;
        return;
      }

      // Jangan hard-stop kalau patientInfo null (backend offline / ADMIN_PRIVATE_KEY
      // belum dikonfigurasi). Tetap lanjut tampilkan hasil hasAccess dari contract.
      // "Pasien Tidak Ditemukan" hanya ditampilkan kalau hasAccess juga false.
    } else {
      // Mode demo: fallback ke mock seperti sebelumnya
      await new Promise(r => setTimeout(r, 900));
      const patient = MockData.doctorPatients.find(p =>
        p.address.toLowerCase().includes(addr.slice(-6).toLowerCase()));
      granted = !!patient;
    }

    if (granted) {
      resultDiv.className = 'result-box granted';
      resultDiv.innerHTML = `
        <div class="result-title" style="color:#065f46"><i class="fas fa-check-circle"></i> Akses Diberikan</div>
        <div class="result-sub" style="color:#047857">${patientInfo ? `Pasien: ${UI.escapeHtml(patientInfo.name)} · ` : ''}Anda memiliki akses ke rekam medis pasien ini.</div>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm" style="background:var(--color-green);color:white;border:none" onclick="DoctorApp.viewPatientRecords('${UI.escapeHtml(addr)}')">
            <i class="fas fa-file-medical"></i> Lihat Rekam Medis
          </button>
          <button class="btn btn-sm btn-outline" onclick="document.querySelector('[data-tab=tab-add-record]')?.click()">
            <i class="fas fa-plus"></i> Tambah Rekam
          </button>
        </div>
      `;
    } else if (patientInfo === null && !granted) {
      // Backend offline / ADMIN_PRIVATE_KEY tidak dikonfigurasi DAN hasAccess = false
      // Bisa jadi pasien belum terdaftar, atau akses memang belum diberikan.
      resultDiv.className = 'result-box denied';
      resultDiv.innerHTML = `
        <div class="result-title" style="color:#b91c1c"><i class="fas fa-user-slash"></i> Akses Ditolak / Pasien Tidak Ditemukan</div>
        <div class="result-sub" style="color:#dc2626">
          Smart contract tidak mendeteksi izin akses. Kemungkinan penyebab:<br>
          • Pasien belum memberikan akses ke wallet dokter ini<br>
          • Pasien belum terdaftar di smart contract<br>
          • Backend offline (info nama pasien tidak tersedia)
        </div>
      `;
    } else {
      resultDiv.className = 'result-box denied';
      resultDiv.innerHTML = `
        <div class="result-title" style="color:#b91c1c"><i class="fas fa-lock"></i> Akses Ditolak</div>
        <div class="result-sub" style="color:#dc2626">${patientInfo ? `Pasien: ${UI.escapeHtml(patientInfo.name)} · ` : ''}Pasien belum memberikan izin akses kepada Anda, atau izin telah dicabut.</div>
      `;
    }
  },

  viewPatientRecords(addr) {
    UI.Toast.info('Membuka Rekam Medis', `Pasien: ${addr} (integrasi smart contract diperlukan)`);
  },
};


/* ══════════════════════════════════════════
   ADMIN PAGE CONTROLLER
══════════════════════════════════════════ */

const AdminApp = {
  async init() {
    this.renderStats();
    this.renderLogs();
    this.renderEntitiesLoading(); // tampilkan indikator loading dulu, jangan biarkan tabel kosong/diam
    await this.loadRealEntities();
    this.renderEntities();
    this.bindEvents();
    UI.initTabs('#admin-tabs');
    UI.showView('monitor');
  },

  /** Tampilkan baris "memuat data..." di tabel entitas selagi fetch ke backend berjalan. */
  renderEntitiesLoading() {
    const tbody = document.getElementById('entities-tbody');
    if (!tbody) return;
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted)">
          <i class="fas fa-spinner fa-spin"></i> Memuat data entitas dari blockchain…
        </td>
      </tr>
    `;
  },

  /** Baca entitas terdaftar dari event blockchain via backend */
  async loadRealEntities() {
    if (!Bridge.isLive() && !(window.Config && Config.isConfigured)) return;
    try {
      // PENTING: tidak pakai .catch(() => null) di sini lagi — kalau salah
      // satu gagal (mis. backend error / RPC limit), admin HARUS tahu,
      // bukan diam-diam tetap menampilkan data demo lama seolah-olah itu data asli.
      // Dipanggil berurutan (bukan Promise.all) supaya tidak membebani RPC
      // gratis dengan 2 request bersamaan — lebih sedikit kemungkinan kena
      // limit/"could not coalesce error" dari provider seperti Alchemy.
      const res  = await Bridge.api('/patients/list');
      const res2 = await Bridge.api('/doctors/list');

      const patients = (res?.data || []).map(p => ({
        address: p.address, name: p.name, type: 'Pasien',
        registeredAt: p.registeredAt
          ? new Date(Number(p.registeredAt) * 1000).toLocaleDateString('id-ID')
          : '—',
        status: 'Aktif',
      }));
      const doctors = (res2?.data || []).map(d => ({
        address: d.address, name: d.name, type: 'Dokter',
        registeredAt: d.registeredAt
          ? new Date(Number(d.registeredAt) * 1000).toLocaleDateString('id-ID')
          : '—',
        status: 'Aktif',
      }));

      // Selalu timpa dengan hasil on-chain (walau kosong), karena ini halaman
      // admin live — kalau memang belum ada entitas terdaftar, tabel harus
      // kosong, bukan diam-diam menampilkan 5 data demo yang menyesatkan.
      MockData.adminEntities = [...doctors, ...patients];
    } catch (err) {
      console.error('Gagal memuat entitas on-chain:', err);
      UI.Toast.error('Gagal Memuat Entitas',
        `Tidak bisa mengambil daftar dokter/pasien dari backend: ${err.message}. Data di bawah ini mungkin tidak akurat (data demo).`);
    }
  },

  renderStats() {
    const s = MockData.adminStats;
    const map = {
      'stat-patients':     s.patients.toLocaleString(),
      'stat-doctors':      s.doctors.toLocaleString(),
      'stat-records':      s.records.toLocaleString(),
      'stat-transactions': s.transactions.toLocaleString(),
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });
  },

  renderLogs() {
    const ul = document.getElementById('admin-activity');
    if (!ul) return;
    ul.innerHTML = MockData.adminLogs.map(log => `
      <li class="activity-item">
        ${logIcon(log.type)}
        <div class="activity-body">
          <div class="activity-title">${UI.escapeHtml(log.action)}</div>
          <div class="activity-meta">Oleh: <span class="mono">${UI.escapeHtml(log.actor)}</span></div>
          <a class="activity-tx" href="https://sepolia.etherscan.io/tx/${UI.escapeHtml(log.txHash)}" target="_blank">
            <i class="fas fa-link" style="font-size:10px;margin-right:3px"></i>${UI.escapeHtml(log.txHash)}
          </a>
        </div>
        <span class="activity-time">${UI.escapeHtml(log.time)}</span>
      </li>
    `).join('');
  },

  renderEntities() {
    const tbody = document.getElementById('entities-tbody');
    if (!tbody) return;
    tbody.innerHTML = MockData.adminEntities.map(e => `
      <tr>
        <td><code class="mono text-xs">${UI.escapeHtml(e.address)}</code></td>
        <td style="font-weight:500">${UI.escapeHtml(e.name)}</td>
        <td>
          <span class="badge ${e.type === 'Dokter' ? 'badge-cyan' : e.type === 'Rumah Sakit' ? 'badge-purple' : 'badge-amber'}">
            ${UI.escapeHtml(e.type)}
          </span>
        </td>
        <td>${UI.escapeHtml(e.registeredAt)}</td>
        <td><span class="badge badge-green">${UI.escapeHtml(e.status)}</span></td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-outline" onclick="AdminApp.viewEntity('${UI.escapeHtml(e.address)}')">Detail</button>
            <button class="btn btn-sm btn-danger" onclick="AdminApp.revokeEntity('${UI.escapeHtml(e.address)}', this)">Cabut</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  bindEvents() {
    // Tampilkan field "Tanggal Lahir" hanya untuk tipe Pasien (0),
    // karena registerPatient() di smart contract butuh parameter dob & nik.
    document.getElementById('reg-type')?.addEventListener('change', (e) => {
      const dobGroup = document.getElementById('reg-dob-group');
      if (dobGroup) dobGroup.style.display = e.target.value === '0' ? 'block' : 'none';
    });

    document.getElementById('form-register')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type=submit]');
      const restore = UI.setButtonLoading(btn, 'Mendaftarkan…');

      const type    = document.getElementById('reg-type')?.value;     // '0' Pasien, '1' Dokter, dst.
      const address = document.getElementById('reg-address')?.value.trim();
      const name    = document.getElementById('reg-name')?.value.trim();
      const idNum   = document.getElementById('reg-id')?.value.trim();
      const dob     = document.getElementById('reg-dob')?.value;

      try {
        let txHash;

        if (Bridge.isLive() || (window.Config && Config.isConfigured)) {
          // registerPatient & registerDoctor adalah onlyAdmin di smart contract,
          // jadi direlay lewat backend yang memegang wallet admin (lihat README backend).
          if (type === '0') {
            const r = await Bridge.api('/patients', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ address, name, dob, nik: idNum }),
            });
            txHash = r.txHash;
          } else if (type === '1') {
            const r = await Bridge.api('/doctors', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ address, name }),
            });
            txHash = r.txHash;
          } else {
            throw new Error('Smart contract MedChain saat ini hanya mendukung registrasi Pasien & Dokter.');
          }
          UI.Toast.success('Registrasi Berhasil!', `Data tersimpan di blockchain. Tx: ${UI.shortHash(txHash)}`);
        } else {
          // Mode demo: tetap simulasi seperti sebelumnya
          txHash = await UI.simulateTx('registerEntity(address, string, uint8)', 2000, 3500);
          UI.Toast.success('Registrasi Berhasil! (Demo)', `Tx: ${UI.shortHash(txHash)}`);
        }

        e.target.reset();
        MockData.adminLogs.unshift({ time: 'Baru saja', actor: '0xAdmin', action: 'Entitas Terdaftar', txHash: UI.shortHash(txHash), type: 'register' });
        this.renderLogs();
        // Reload entitas dari blockchain agar yang baru terdaftar langsung muncul
        await this.loadRealEntities();
        this.renderEntities();
      } catch (err) {
        UI.Toast.error('Gagal Mendaftarkan', err.message);
      } finally { restore(); }
    });
  },

  viewEntity(addr) {
    UI.Toast.info('Detail Entitas', `Alamat: ${addr}`);
  },

  async revokeEntity(addr, btn) {
    const restore = UI.setButtonLoading(btn, '…');
    try {
      const txHash = await UI.simulateTx('revokeEntity(address)', 1200, 2500);
      UI.Toast.success('Akses Entitas Dicabut', `Tx: ${UI.shortHash(txHash)}`);
      MockData.adminEntities = MockData.adminEntities.filter(e => e.address !== addr);
      this.renderEntities();
    } catch (err) {
      UI.Toast.error('Gagal', err.message);
      restore();
    }
  },
};


/* ══════════════════════════════════════════
   LANDING PAGE CONTROLLER
══════════════════════════════════════════ */

const LandingApp = {
  init() {
    UI.initModals();
    this.bindEvents();
    this.animateStats();
  },

  bindEvents() {
    document.querySelectorAll('[data-open-modal]').forEach(btn => {
      btn.addEventListener('click', () => UI.openModal(btn.dataset.openModal));
    });

    document.getElementById('form-connect')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn  = e.target.querySelector('button[type=submit]');
      const restore = UI.setButtonLoading(btn, 'Menghubungkan…');

      try {
        const result = await Wallet.connect();
        UI.closeModal('modal-connect');

        // PENTING: jangan percaya dropdown "Peran Anda" dari frontend —
        // itu cuma input user, gampang dipalsukan siapa saja (mis. pilih
        // "Admin" walau wallet-nya bukan admin). Peran SEBENARNYA harus
        // diverifikasi ke backend: admin = wallet ADMIN_PRIVATE_KEY di .env,
        // dokter/pasien = status registrasi on-chain.
        let role = 'none';
        let roleName = null;

        if (result.simulated) {
          // Mode demo (MetaMask tidak terdeteksi): tidak ada wallet asli untuk
          // diverifikasi ke kontrak, jadi tetap pakai pilihan dropdown sebagai simulasi.
          role = document.getElementById('role-select')?.value || 'patient';
        } else {
          UI.Toast.info('Memverifikasi…', 'Mengecek peran wallet Anda ke backend, mohon tunggu.');
          try {
            const res = await Bridge.api(`/auth/role/${result.account}`);
            role = res?.data?.role || 'none';
            roleName = res?.data?.name || null;
          } catch (err) {
            UI.Toast.error('Gagal Memverifikasi Peran',
              `Tidak bisa menghubungi backend di ${Config.API_BASE_URL}: ${err.message}. Pastikan backend menyala dan FRONTEND_ORIGIN di .env backend sesuai dengan alamat halaman ini (${window.location.origin}).`);
            restore();
            return;
          }
        }

        if (role === 'none') {
          UI.Toast.error('Wallet Belum Terdaftar',
            'Alamat wallet ini belum didaftarkan oleh admin sebagai dokter maupun pasien, dan bukan wallet admin. Hubungi admin untuk didaftarkan terlebih dahulu.');
          restore();
          return;
        }

        const roleMap = { patient: 'patient.html', doctor: 'doctor.html', admin: 'admin.html' };
        const dest = roleMap[role] || 'patient.html';

        if (result.simulated) {
          UI.Toast.info('Mode Demo', 'MetaMask tidak terdeteksi — menggunakan akun simulasi');
        } else {
          UI.Toast.success('Wallet Terhubung!', `${roleName ? roleName + ' · ' : ''}${Wallet.shortAddress(result.account)} @ ${result.network?.name}`);
        }

        localStorage.setItem('mc_account', result.account);
        localStorage.setItem('mc_role',    role);
        localStorage.setItem('mc_simulated', result.simulated ? '1' : '0');

        setTimeout(() => { window.location.href = dest; }, 800);
      } catch (err) {
        if (err.code !== 4001) {
          UI.Toast.error('Koneksi Gagal', err.message);
        }
        restore();
      }
    });
  },

  animateStats() {
    const targets = [
      { id: 'counter-patients', end: 1245 },
      { id: 'counter-doctors',  end: 84   },
      { id: 'counter-records',  end: 8932 },
      { id: 'counter-uptime',   end: 99.9, decimals: 1 },
    ];
    targets.forEach(({ id, end, decimals = 0 }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const duration = 1800;
      const step = (end / (duration / 16));
      let current = 0;
      const timer = setInterval(() => {
        current = Math.min(current + step, end);
        el.textContent = decimals
          ? current.toFixed(decimals)
          : Math.floor(current).toLocaleString();
        if (current >= end) clearInterval(timer);
      }, 16);
    });
  },
};


/* ══════════════════════════════════════════
   SHARED APP INIT (runs on all pages)
══════════════════════════════════════════ */

const AppShared = {
  // Pemetaan halaman → role yang berhak mengaksesnya.
  // Ini mensimulasikan require(role tertentu) yang ada di smart contract
  // (mis. addMedicalRecord hanya bisa dipanggil Dokter, registerPatient hanya Admin).
  PAGE_ROLE_MAP: { 'patient.html': 'patient', 'doctor.html': 'doctor', 'admin.html': 'admin' },
  ROLE_LABEL:    { patient: 'Pasien', doctor: 'Dokter', admin: 'Admin' },

  async init() {
    UI.init();
    this.showPendingToast();
    await this.restoreWalletState();
    this.bindWalletEvents();
    this.initNav();
  },

  /**
   * Cek apakah wallet yang sedang terhubung berhak mengakses halaman ini.
   * Return true kalau akses DITOLAK (dan sudah me-redirect ke index.html).
   *
   * PENTING: localStorage bisa dipalsukan lewat devtools kapan saja
   * (mis. localStorage.setItem('mc_role','admin')). Jadi di sini role yang
   * tersimpan HANYA dipakai sebagai cache tampilan awal — peran sebenarnya
   * selalu diverifikasi ulang ke backend (yang membandingkan ke ADMIN_PRIVATE_KEY
   * di .env dan status registrasi on-chain) setiap kali halaman dimuat.
   */
  async guardRole() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const requiredRole = this.PAGE_ROLE_MAP[page];
    if (!requiredRole) return false; // halaman publik (index.html), tidak perlu guard

    const account   = localStorage.getItem('mc_account');
    const simulated = localStorage.getItem('mc_simulated') === '1';

    if (!account) {
      this.redirectWithToast('warning', 'Belum Terhubung',
        'Silakan hubungkan wallet terlebih dahulu untuk mengakses portal ini.');
      return true;
    }

    if (simulated) {
      // Mode demo: tidak ada wallet asli untuk diverifikasi on-chain,
      // jadi tetap pakai role tersimpan (perilaku demo sebelumnya).
      // Admin dikecualikan dari pengecekan ketat: admin boleh akses
      // SEMUA portal (admin, dokter, pasien), bukan cuma admin.html.
      const role = localStorage.getItem('mc_role');
      if (role !== requiredRole && role !== 'admin') {
        this.redirectWithToast('error', 'Akses Ditolak',
          `Wallet Anda terhubung sebagai "${this.ROLE_LABEL[role] || role}", bukan "${this.ROLE_LABEL[requiredRole]}".`);
        return true;
      }
      return false;
    }

    // Mode live: verifikasi ulang ke backend, JANGAN percaya localStorage.
    // Tampilkan overlay loading dulu — tanpa ini halaman terlihat blank/diam
    // selama proses verifikasi, seolah-olah macet/error.
    this.showVerifyingOverlay();
    try {
      const res  = await Bridge.api(`/auth/role/${account}`);
      const role = res?.data?.role || 'none';
      localStorage.setItem('mc_role', role); // sinkronkan cache lokal dengan hasil verifikasi nyata

      // Admin dikecualikan dari pengecekan ketat: wallet admin (sesuai
      // ADMIN_PRIVATE_KEY di backend) boleh mengakses SEMUA portal —
      // admin.html, doctor.html, MAUPUN patient.html — bukan cuma admin.html.
      if (role !== requiredRole && role !== 'admin') {
        const msg = role === 'none'
          ? 'Wallet ini belum terdaftar oleh admin sebagai dokter maupun pasien.'
          : `Wallet Anda terverifikasi sebagai "${this.ROLE_LABEL[role] || role}", bukan "${this.ROLE_LABEL[requiredRole]}".`;
        this.redirectWithToast('error', 'Akses Ditolak', msg);
        return true;
      }
      this.hideVerifyingOverlay();
      return false;
    } catch (err) {
      this.redirectWithToast('error', 'Gagal Memverifikasi',
        `Tidak bisa menghubungi backend di ${Config.API_BASE_URL}: ${err.message}. Pastikan backend menyala dan FRONTEND_ORIGIN di .env backend sesuai (${window.location.origin}).`);
      return true;
    }
  },

  showVerifyingOverlay() {
    if (document.getElementById('mc-verify-overlay')) return;
    const el = document.createElement('div');
    el.id = 'mc-verify-overlay';
    el.style.cssText = `
      position:fixed; inset:0; z-index:99999; background:#0b1220;
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      gap:14px; color:#e2e8f0; font:500 15px/1.4 system-ui,sans-serif;
    `;
    el.innerHTML = `
      <i class="fas fa-circle-notch fa-spin" style="font-size:32px;color:#22d3ee"></i>
      <div>Memverifikasi peran wallet Anda…</div>
    `;
    document.body.appendChild(el);
  },

  hideVerifyingOverlay() {
    document.getElementById('mc-verify-overlay')?.remove();
  },

  redirectWithToast(type, title, msg) {
    sessionStorage.setItem('mc_pending_toast', JSON.stringify({ type, title, msg }));
    window.location.href = 'index.html';
  },

  showPendingToast() {
    const raw = sessionStorage.getItem('mc_pending_toast');
    if (!raw) return;
    sessionStorage.removeItem('mc_pending_toast');
    try {
      const { type, title, msg } = JSON.parse(raw);
      UI.Toast[type]?.(title, msg, 6000);
    } catch (_) { /* abaikan kalau gagal parse */ }
  },

  async restoreWalletState() {
    const account   = localStorage.getItem('mc_account');
    const role      = localStorage.getItem('mc_role');
    const simulated = localStorage.getItem('mc_simulated') === '1';
    if (!account) return;

    // PENTING: sambungkan ulang signer/provider yang hilang akibat full-page
    // navigation dari index.html. Tanpa ini, Bridge.isLive() selalu false
    // dan semua pembacaan on-chain (hasAccess dkk) diam-diam pakai data mock.
    await Wallet.reconnectSilent();

    const network = simulated
      ? { name: 'Demo Mode' }
      : { name: 'Sepolia Testnet' };

    // Populate wallet pill
    document.querySelectorAll('.wallet-addr-display').forEach(el => {
      el.textContent = Wallet.shortAddress(account);
    });
    document.querySelectorAll('.network-badge-text').forEach(el => {
      el.textContent = network.name;
    });

    // Show role badge in sidebar if present
    const roleEl = document.getElementById('sidebar-role');
    if (roleEl) {
      const labelMap = { patient: 'Pasien', doctor: 'Dokter', admin: 'Admin' };
      roleEl.textContent = labelMap[role] || role;
    }

    const nameEl = document.getElementById('sidebar-name');
    if (nameEl && account) {
      nameEl.textContent = Wallet.shortAddress(account);
    }
  },

  bindWalletEvents() {
    // Disconnect / logout buttons
    document.querySelectorAll('[data-action="disconnect"]').forEach(btn => {
      btn.addEventListener('click', () => {
        Wallet.disconnect();
        localStorage.removeItem('mc_account');
        localStorage.removeItem('mc_role');
        localStorage.removeItem('mc_simulated');
        window.location.href = 'index.html';
      });
    });

    // Copy wallet address
    document.querySelectorAll('[data-action="copy-address"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const account = localStorage.getItem('mc_account');
        if (account) UI.copyToClipboard(account);
      });
    });
  },

  initNav() {
    // Sidebar view switching
    document.querySelectorAll('[data-view]').forEach(item => {
      item.addEventListener('click', (e) => {
        if (item.tagName !== 'A') e.preventDefault();
        UI.showView(item.dataset.view);
        // Update active state
        document.querySelectorAll('[data-view]').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
    });
  },
};

/* ── Page detection & boot ── */
document.addEventListener('DOMContentLoaded', async () => {
  if (await AppShared.guardRole()) return; // akses ditolak — sudah di-redirect ke index.html

  await AppShared.init(); // tunggu signer tersambung ulang dulu sebelum baca on-chain

  const page = window.location.pathname.split('/').pop() || 'index.html';

  if (page === 'index.html' || page === '') {
    LandingApp.init();
  } else if (page === 'patient.html') {
    PatientApp.init();
  } else if (page === 'doctor.html') {
    DoctorApp.init();
  } else if (page === 'admin.html') {
    AdminApp.init();
  }
});

window.PatientApp = PatientApp;
window.DoctorApp  = DoctorApp;
window.AdminApp   = AdminApp;
window.Store      = Store;