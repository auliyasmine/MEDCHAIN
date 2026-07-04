const { ethers } = require('ethers');
const { contractRead } = require('../config/blockchain');
const { queryEventsChunked } = require('../utils/eventQuery');

let db;
try { db = require('../database/db'); } catch (_) { db = null; }

async function checkAccess(req, res, next) {
  try {
    const { patient, doctor } = req.query;
    if (!ethers.isAddress(patient) || !ethers.isAddress(doctor)) {
      return res.status(400).json({ success: false, message: 'Parameter patient & doctor harus alamat wallet valid' });
    }
    const granted = await contractRead.hasAccess(patient, doctor);
    res.json({ success: true, data: { granted } });
  } catch (err) { next(err); }
}

/**
 * GET /api/access/:patientAddress
 * Baca dari cache SQLite (instan). Untuk setiap dokter, ambil baris
 * grant/revoke TERAKHIR (id terbesar) — kalau actionnya 'grant', berarti
 * akses masih aktif.
 */
async function getAccessList(req, res, next) {
  try {
    const { patientAddress } = req.params;
    if (!ethers.isAddress(patientAddress)) {
      return res.status(400).json({ success: false, message: 'Alamat pasien tidak valid' });
    }
    if (!db) return res.json({ success: true, data: [] });

    const rows = db.prepare(`
      SELECT doctor_address, action, created_at
      FROM access_log
      WHERE patient_address = ?
      AND id IN (
        SELECT MAX(id) FROM access_log WHERE patient_address = ? GROUP BY doctor_address
      )
    `).all(patientAddress.toLowerCase(), patientAddress.toLowerCase());

    const active = rows.filter(r => r.action === 'grant');

    // Ambil nama dokter dari cache doctors (kalau ada)
    const data = active.map(r => {
      const doc = db.prepare('SELECT name FROM doctors WHERE wallet_address = ?').get(r.doctor_address);
      return {
        doctorAddress: r.doctor_address,
        doctorName:    doc?.name || null,
        grantedAt:     String(r.created_at),
      };
    });

    res.json({ success: true, data });
  } catch (err) { next(err); }
}

/**
 * POST /api/access/record
 * Body: { patient, doctor, action: 'grant'|'revoke', txHash }
 * Dipanggil FRONTEND tepat setelah transaksi grantAccess/revokeAccess
 * confirmed oleh MetaMask. Ini cara murah untuk menjaga cache tetap
 * sinkron TANPA scan eth_getLogs (yang kena limit 10 block/request di
 * Alchemy free tier) — frontend sudah tahu hasil tx-nya, tinggal lapor.
 */
async function recordAccessEvent(req, res, next) {
  try {
    const { patient, doctor, action, txHash } = req.body;
    if (!ethers.isAddress(patient) || !ethers.isAddress(doctor)) {
      return res.status(400).json({ success: false, message: 'patient & doctor harus alamat wallet valid' });
    }
    if (action !== 'grant' && action !== 'revoke') {
      return res.status(400).json({ success: false, message: "action harus 'grant' atau 'revoke'" });
    }
    if (db) {
      db.prepare(`
        INSERT INTO access_log (patient_address, doctor_address, action, tx_hash, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(patient.toLowerCase(), doctor.toLowerCase(), action, txHash || null, Math.floor(Date.now() / 1000));
    }
    res.json({ success: true });
  } catch (err) { next(err); }
}

/**
 * POST /api/access/sync/:patientAddress
 * Scan event AccessGranted & AccessRevoked langsung dari blockchain (chunked,
 * kena limit 10 block/request) untuk SATU pasien, lalu isi ulang cache-nya.
 * Dipakai SEKALI saat dibutuhkan (mis. ada grant lama dari sebelum cache ini
 * ada, atau grant yang dilakukan langsung dari Remix/Etherscan) — bukan
 * dipanggil otomatis tiap halaman dibuka.
 */
async function syncAccess(req, res, next) {
  try {
    const { patientAddress } = req.params;
    if (!ethers.isAddress(patientAddress)) {
      return res.status(400).json({ success: false, message: 'Alamat pasien tidak valid' });
    }

    const grantFilter  = contractRead.filters.AccessGranted(patientAddress);
    const revokeFilter = contractRead.filters.AccessRevoked(patientAddress);
    const [grantEvents, revokeEvents] = await Promise.all([
      queryEventsChunked(contractRead, grantFilter),
      queryEventsChunked(contractRead, revokeFilter),
    ]);

    const events = [
      ...grantEvents.map(e => ({ action: 'grant',  doctor: e.args.doctor, ts: Number(e.args.timestamp), block: e.blockNumber })),
      ...revokeEvents.map(e => ({ action: 'revoke', doctor: e.args.doctor, ts: Number(e.args.timestamp), block: e.blockNumber })),
    ].sort((a, b) => a.block - b.block);

    if (db) {
      const insert = db.prepare(`
        INSERT INTO access_log (patient_address, doctor_address, action, tx_hash, created_at)
        VALUES (?, ?, ?, NULL, ?)
      `);
      const insertMany = db.transaction((items) => {
        // Bersihkan cache lama untuk pasien ini supaya tidak duplikat dengan sync berulang
        db.prepare('DELETE FROM access_log WHERE patient_address = ?').run(patientAddress.toLowerCase());
        for (const item of items) {
          insert.run(patientAddress.toLowerCase(), item.doctor.toLowerCase(), item.action, item.ts);
        }
      });
      insertMany(events);
    }

    res.json({ success: true, message: `${events.length} event akses disinkronkan dari blockchain` });
  } catch (err) { next(err); }
}

module.exports = { checkAccess, getAccessList, recordAccessEvent, syncAccess };
