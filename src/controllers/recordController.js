const { ethers } = require('ethers');
const { contractRead, contractAsAdmin } = require('../config/blockchain');
const { uploadToIPFS } = require('../config/ipfs');

/**
 * POST /api/records/upload
 * Dokter mengunggah dokumen rekam medis lewat front-end (multipart/form-data, field "document").
 * Backend MENGHITUNG hash + MENGUNGGAH ke IPFS, lalu mengembalikan CID & hash
 * agar front-end bisa memanggil contract.addMedicalRecord(...) sendiri lewat MetaMask
 * (transaksi tetap ditandatangani dokter, bukan oleh backend).
 */
async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File dokumen wajib diunggah (field "document")' });
    }

    // Hash Keccak-256 dihitung di server dari buffer yang sama yang akan diunggah ke IPFS,
    // supaya konsisten dengan hash yang nanti diverifikasi oleh verifyRecord().
    const documentHash = ethers.keccak256(req.file.buffer);
    const ipfsCID = await uploadToIPFS(req.file.buffer, req.file.originalname);

    res.json({
      success: true,
      message: 'Dokumen berhasil diunggah ke IPFS',
      data: { ipfsCID, documentHash },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/records/:patientAddress?viewer=0x...
 * Membaca seluruh riwayat rekam medis pasien (read-only).
 * NOTE: contract getRecord() mensyaratkan msg.sender = pasien/dokter berizin/admin.
 * Backend memanggil lewat contractAsAdmin (signer = wallet admin dari .env),
 * supaya msg.sender == admin terpenuhi dan tidak revert. Otorisasi pemanggil
 * endpoint ini (apakah dia boleh lihat data pasien ini) tetap perlu dicek di
 * layer auth/middleware backend -- contractAsAdmin hanya membuat panggilan
 * baca ke contract berhasil, bukan pengganti pengecekan izin di sisi API.
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
 * Verifikasi integritas dokumen (bandingkan hash lokal vs hash on-chain).
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

module.exports = { uploadDocument, getRecords, getRecordCount, verifyRecord };
