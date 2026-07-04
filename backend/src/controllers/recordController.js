const { ethers } = require('ethers');
const { contractRead, contractAsAdmin } = require('../config/blockchain');
const { uploadToIPFS } = require('../config/ipfs');
const db = require('../database/db');

/**
 * POST /api/records/upload
 * Pasien mengunggah dokumen rekam medis.
 * Body (multipart): field "document" (file), "doctorAddress", "note" (opsional)
 * 
 * Setelah upload ke IPFS berhasil, data disimpan ke tabel pending_uploads
 * supaya dokter yang dituju bisa melihatnya di halaman Permintaan Verifikasi.
 */
async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File dokumen wajib diunggah (field "document")' });
    }

    const { doctorAddress, patientAddress, note } = req.body;

    if (!doctorAddress || !ethers.isAddress(doctorAddress)) {
      return res.status(400).json({ success: false, message: 'doctorAddress wajib diisi dan harus alamat Ethereum valid' });
    }
    if (!patientAddress || !ethers.isAddress(patientAddress)) {
      return res.status(400).json({ success: false, message: 'patientAddress wajib diisi dan harus alamat Ethereum valid' });
    }

    // Hitung hash & upload ke IPFS
    const documentHash = ethers.keccak256(req.file.buffer);
    const ipfsCID = await uploadToIPFS(req.file.buffer, req.file.originalname);

    // Simpan ke tabel pending_uploads supaya dokter bisa lihat
    const info = db.prepare(`
      INSERT INTO pending_uploads (patient_address, doctor_address, ipfs_cid, document_hash, note, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).run(
      patientAddress.toLowerCase(),
      doctorAddress.toLowerCase(),
      ipfsCID,
      documentHash,
      note || null,
      Math.floor(Date.now() / 1000)
    );

    res.json({
      success: true,
      message: 'Dokumen berhasil diunggah ke IPFS dan permintaan verifikasi dikirim ke dokter',
      data: { id: info.lastInsertRowid, ipfsCID, documentHash },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/records/pending?doctorAddress=0x...
 * Dokter mengambil daftar dokumen yang menunggu verifikasinya.
 */
async function getPendingUploads(req, res, next) {
  try {
    const { doctorAddress } = req.query;
    if (!doctorAddress || !ethers.isAddress(doctorAddress)) {
      return res.status(400).json({ success: false, message: 'doctorAddress wajib diisi' });
    }

    const rows = db.prepare(`
      SELECT id, patient_address, doctor_address, ipfs_cid, document_hash, note, status, tx_hash, created_at
      FROM pending_uploads
      WHERE doctor_address = ? AND status = 'pending'
      ORDER BY created_at DESC
    `).all(doctorAddress.toLowerCase());

    const data = rows.map(r => ({
      id:             r.id,
      patientAddress: r.patient_address,
      doctorAddress:  r.doctor_address,
      ipfsCID:        r.ipfs_cid,
      documentHash:   r.document_hash,
      note:           r.note,
      status:         r.status,
      createdAt:      r.created_at,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/records/pending/:id/verify
 * Dokter menandai dokumen sebagai terverifikasi setelah addMedicalRecord() berhasil.
 * Body: { txHash }
 */
async function markPendingVerified(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { txHash } = req.body;

    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: 'id tidak valid' });
    }

    const row = db.prepare('SELECT * FROM pending_uploads WHERE id = ?').get(id);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Permintaan tidak ditemukan' });
    }

    db.prepare(`
      UPDATE pending_uploads SET status = 'verified', tx_hash = ? WHERE id = ?
    `).run(txHash || null, id);

    res.json({ success: true, message: 'Status diperbarui ke verified' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/records/mine/:patientAddress
 * Pasien mengambil daftar dokumen yang PERNAH ia unggah sendiri (baik yang masih
 * 'pending' maupun yang sudah 'verified'), langsung dari tabel pending_uploads.
 *
 * Endpoint ini dipakai supaya status di dashboard pasien selalu SINKRON dengan
 * aksi dokter (PATCH /records/pending/:id/verify), bukan dari data lokal /
 * localStorage yang tidak pernah ter-update setelah dokter memverifikasi.
 */
async function getMyUploads(req, res, next) {
  try {
    const { patientAddress } = req.params;
    if (!patientAddress || !ethers.isAddress(patientAddress)) {
      return res.status(400).json({ success: false, message: 'patientAddress wajib diisi dan harus alamat Ethereum valid' });
    }

    const rows = db.prepare(`
      SELECT id, patient_address, doctor_address, ipfs_cid, document_hash, note, status, tx_hash, created_at
      FROM pending_uploads
      WHERE patient_address = ?
      ORDER BY created_at DESC
    `).all(patientAddress.toLowerCase());

    const data = rows.map(r => ({
      id:             'upload_' + r.id,
      patientAddress: r.patient_address,
      doctorAddress:  r.doctor_address,
      ipfsCID:        r.ipfs_cid,
      documentHash:   r.document_hash,
      note:           r.note,
      status:         r.status, // 'pending' | 'verified'
      txHash:         r.tx_hash,
      createdAt:      r.created_at,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/records/:patientAddress?viewer=0x...
 */
async function getRecords(req, res, next) {
  try {
    const { patientAddress } = req.params;
    if (!ethers.isAddress(patientAddress)) {
      return res.status(400).json({ success: false, message: 'Alamat pasien tidak valid' });
    }
    if (!contractAsAdmin) {
      return res.status(500).json({ success: false, message: 'ADMIN_PRIVATE_KEY belum dikonfigurasi di backend' });
    }

    const records = await contractAsAdmin.getRecord(patientAddress);

    const formatted = records.map((r) => ({
      id: r.id.toString(),
      patient: r.patient,
      doctor: r.doctor,
      ipfsCID: r.ipfsCID,
      documentHash: r.documentHash,
      diagnosis: r.diagnosis,
      timestamp: r.timestamp.toString(),
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/records/:patientAddress/count
 */
async function getRecordCount(req, res, next) {
  try {
    const { patientAddress } = req.params;
    if (!ethers.isAddress(patientAddress)) {
      return res.status(400).json({ success: false, message: 'Alamat pasien tidak valid' });
    }
    if (!contractAsAdmin) {
      return res.status(500).json({ success: false, message: 'ADMIN_PRIVATE_KEY belum dikonfigurasi di backend' });
    }

    const count = await contractAsAdmin.getRecordCount(patientAddress);
    res.json({ success: true, data: { count: count.toString() } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/records/verify
 * Body: { patientAddress, recordIndex, localHash }
 */
async function verifyRecord(req, res, next) {
  try {
    const { patientAddress, recordIndex, localHash } = req.body;
    if (!ethers.isAddress(patientAddress)) {
      return res.status(400).json({ success: false, message: 'Alamat pasien tidak valid' });
    }
    if (!contractAsAdmin) {
      return res.status(500).json({ success: false, message: 'ADMIN_PRIVATE_KEY belum dikonfigurasi di backend' });
    }

    const isAuthentic = await contractAsAdmin.verifyRecord(patientAddress, recordIndex, localHash);
    res.json({ success: true, data: { isAuthentic } });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadDocument, getPendingUploads, markPendingVerified, getMyUploads, getRecords, getRecordCount, verifyRecord };