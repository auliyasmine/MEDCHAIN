const { ethers } = require('ethers');
const { contractRead, contractAsAdmin } = require('../config/blockchain');
const { queryEventsChunked } = require('../utils/eventQuery');

let db;
try { db = require('../database/db'); } catch (_) { db = null; }

async function registerDoctor(req, res, next) {
  try {
    if (!contractAsAdmin) {
      return res.status(500).json({ success: false, message: 'ADMIN_PRIVATE_KEY belum dikonfigurasi' });
    }
    const { address, name } = req.body;
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ success: false, message: 'Alamat wallet dokter tidak valid' });
    }
    if (!name) {
      return res.status(400).json({ success: false, message: 'name wajib diisi' });
    }
    const tx = await contractAsAdmin.registerDoctor(address, name);
    const receipt = await tx.wait();

    // Simpan ke SQLite supaya listDoctors() tidak perlu scan blockchain lagi
    // (lihat komentar di db.js soal kenapa eth_getLogs sebaiknya dihindari
    // untuk pembacaan rutin).
    if (db) {
      try {
        db.prepare(`
          INSERT OR REPLACE INTO doctors (wallet_address, name, registered_at)
          VALUES (?, ?, ?)
        `).run(address.toLowerCase(), name, Math.floor(Date.now() / 1000));
      } catch (_) {}
    }

    res.json({ success: true, message: 'Dokter berhasil didaftarkan on-chain', txHash: receipt.hash });
  } catch (err) { next(err); }
}

async function getDoctor(req, res, next) {
  try {
    const { address } = req.params;
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ success: false, message: 'Alamat wallet tidak valid' });
    }
    // PENTING: ABI kontrak tidak punya getter publik bernama `doctors`,
    // yang ada adalah getDoctorInfo(address). Memanggil contractRead.doctors(...)
    // akan selalu throw "contractRead.doctors is not a function".
    if (!contractAsAdmin) {
      return res.status(500).json({ success: false, message: 'ADMIN_PRIVATE_KEY belum dikonfigurasi di backend' });
    }
    const [name, isRegistered, registeredAt] = await contractAsAdmin.getDoctorInfo(address);
    res.json({ success: true, data: {
      address,
      name,
      isRegistered,
      registeredAt: registeredAt.toString(),
    }});
  } catch (err) { next(err); }
}

/**
 * GET /api/doctors/list
 * Baca dari cache SQLite (cepat, tidak kena limit RPC). Data masuk ke sini
 * otomatis tiap kali registerDoctor() lewat backend berhasil. Untuk dokter
 * yang terdaftar LANGSUNG via Remix/etherscan (tidak lewat backend ini),
 * gunakan endpoint POST /api/doctors/sync sekali untuk menarik data lama
 * dari blockchain ke cache.
 */
async function listDoctors(req, res, next) {
  try {
    if (!db) return res.json({ success: true, data: [] });
    const rows = db.prepare('SELECT wallet_address, name, registered_at FROM doctors ORDER BY registered_at DESC').all();
    const data = rows.map(r => ({
      address: r.wallet_address,
      name: r.name,
      registeredAt: String(r.registered_at),
    }));
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

/**
 * POST /api/doctors/sync
 * Scan event DoctorRegistered langsung dari blockchain (chunked, karena
 * limit eth_getLogs RPC publik) dan isi ulang cache SQLite. Dipakai SEKALI
 * lewat tombol "Sync dari Blockchain" di Admin — bukan dipanggil otomatis
 * tiap halaman dibuka — supaya tidak lambat/kena rate limit terus-menerus.
 * Berguna untuk menarik data registrasi lama yang terjadi sebelum cache
 * SQLite ini ada, atau yang didaftarkan langsung dari Remix/etherscan.
 */
async function syncDoctors(req, res, next) {
  try {
    const filter = contractRead.filters.DoctorRegistered();
    const events = await queryEventsChunked(contractRead, filter);

    if (db) {
      const insert = db.prepare(`
        INSERT OR REPLACE INTO doctors (wallet_address, name, registered_at)
        VALUES (?, ?, ?)
      `);
      const insertMany = db.transaction((items) => {
        for (const item of items) insert.run(item.address.toLowerCase(), item.name, Number(item.registeredAt));
      });
      insertMany(events.map(e => ({
        address: e.args.doctorAddress,
        name: e.args.name,
        registeredAt: e.args.timestamp.toString(),
      })));
    }

    res.json({ success: true, message: `${events.length} data dokter disinkronkan dari blockchain` });
  } catch (err) { next(err); }
}

module.exports = { registerDoctor, getDoctor, listDoctors, syncDoctors };
