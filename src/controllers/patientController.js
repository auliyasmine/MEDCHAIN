const { ethers } = require('ethers');
const { contractRead, contractAsAdmin } = require('../config/blockchain');
const { queryEventsChunked } = require('../utils/eventQuery');

let db;
try { db = require('../database/db'); } catch (_) { db = null; }

async function registerPatient(req, res, next) {
  try {
    if (!contractAsAdmin) {
      return res.status(500).json({ success: false, message: 'ADMIN_PRIVATE_KEY belum dikonfigurasi' });
    }
    const { address, name, dob, nik } = req.body;
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ success: false, message: 'Alamat wallet pasien tidak valid' });
    }
    if (!name || !dob || !nik) {
      return res.status(400).json({ success: false, message: 'name, dob, dan nik wajib diisi' });
    }

    // Kirim NIK plaintext ke contract (versi lama SmartContract_Medchain.sol)
    const tx = await contractAsAdmin.registerPatient(address, name, dob, nik);
    const receipt = await tx.wait();

    // Simpan ke SQLite jika tersedia
    if (db) {
      try {
        const nikHash = ethers.keccak256(ethers.toUtf8Bytes(nik));
        db.prepare(`
          INSERT OR IGNORE INTO patients (wallet_address, name, dob, nik, nik_hash, registered_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(address.toLowerCase(), name, dob, nik, nikHash, Math.floor(Date.now() / 1000));
      } catch (_) {}
    }

    res.json({ success: true, message: 'Pasien berhasil didaftarkan on-chain', txHash: receipt.hash });
  } catch (err) { next(err); }
}

async function getPatient(req, res, next) {
  try {
    const { address } = req.params;
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ success: false, message: 'Alamat wallet tidak valid' });
    }
    // PENTING: ABI kontrak tidak punya getter publik bernama `patients`,
    // yang ada adalah getPatientInfo(address). Memanggil contractRead.patients(...)
    // akan selalu throw "contractRead.patients is not a function".
    if (!contractAsAdmin) {
      return res.status(500).json({ success: false, message: 'ADMIN_PRIVATE_KEY belum dikonfigurasi di backend' });
    }
    const [patientAddress, name, dob, , isRegistered, registeredAt] = await contractAsAdmin.getPatientInfo(address);
    const localData = db
      ? db.prepare('SELECT nik FROM patients WHERE wallet_address = ?').get(address.toLowerCase())
      : null;
    res.json({ success: true, data: {
      address:      patientAddress,
      name,
      dob,
      nik:          localData?.nik || null,
      isRegistered,
      registeredAt: registeredAt.toString(),
    }});
  } catch (err) { next(err); }
}

/**
 * GET /api/patients/list
 * Baca dari cache SQLite (instan, tidak kena limit eth_getLogs 10 block/request
 * punya Alchemy free tier). Data masuk otomatis tiap kali registerPatient()
 * lewat backend berhasil. Untuk pasien yang terdaftar LANGSUNG via Remix/
 * Etherscan (bukan lewat backend ini), gunakan POST /api/patients/sync sekali.
 */
async function listPatients(req, res, next) {
  try {
    if (!db) return res.json({ success: true, data: [] });
    const rows = db.prepare('SELECT wallet_address, name, registered_at FROM patients ORDER BY registered_at DESC').all();
    const data = rows.map(r => ({
      address:      r.wallet_address,
      name:         r.name,
      registeredAt: String(r.registered_at),
    }));
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

/**
 * POST /api/patients/sync
 * Scan event PatientRegistered langsung dari blockchain (chunked, kena limit
 * 10 block/request) dan isi ulang cache SQLite. Dipakai SEKALI lewat tombol
 * "Sync dari Blockchain" di Admin — bukan dipanggil otomatis tiap halaman
 * dibuka — supaya tidak lambat terus-menerus. Berguna menarik data registrasi
 * lama yang terjadi sebelum cache ini ada, atau yang didaftarkan langsung
 * dari Remix/Etherscan tanpa lewat backend.
 */
async function syncPatients(req, res, next) {
  try {
    const filter = contractRead.filters.PatientRegistered();
    const events = await queryEventsChunked(contractRead, filter);

    if (db) {
      const insert = db.prepare(`
        INSERT INTO patients (wallet_address, name, dob, nik, nik_hash, registered_at)
        VALUES (?, ?, '', '', '', ?)
        ON CONFLICT(wallet_address) DO UPDATE SET name = excluded.name
      `);
      const insertMany = db.transaction((items) => {
        for (const item of items) insert.run(item.address.toLowerCase(), item.name, Number(item.registeredAt));
      });
      insertMany(events.map(e => ({
        address: e.args.patientAddress,
        name: e.args.name,
        registeredAt: e.args.timestamp.toString(),
      })));
    }

    res.json({ success: true, message: `${events.length} data pasien disinkronkan dari blockchain` });
  } catch (err) { next(err); }
}

module.exports = { registerPatient, getPatient, listPatients, syncPatients };
