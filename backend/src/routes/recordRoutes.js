const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  uploadDocument,
  getPendingUploads,
  markPendingVerified,
  getPatientUploads,
  getRecords,
  getRecordCount,
  verifyRecord,
} = require('../controllers/recordController');

router.post('/upload',           upload.single('document'), uploadDocument);  // POST /api/records/upload
router.post('/verify',           verifyRecord);                                // POST /api/records/verify
router.get('/pending',           getPendingUploads);                           // GET  /api/records/pending?doctorAddress=
router.patch('/pending/:id/verify', markPendingVerified);                     // PATCH /api/records/pending/:id/verify
router.get('/:patientAddress/pending', getPatientUploads);                    // GET  /api/records/:patientAddress/pending — riwayat pengajuan pasien
router.get('/:patientAddress/count', getRecordCount);                          // GET  /api/records/:patientAddress/count
router.get('/:patientAddress',   getRecords);                                  // GET  /api/records/:patientAddress

module.exports = router;
