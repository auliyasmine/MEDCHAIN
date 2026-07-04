const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  uploadDocument,
  getRecords,
  getRecordCount,
  verifyRecord,
} = require('../controllers/recordController');

router.post('/upload', upload.single('document'), uploadDocument); // POST /api/records/upload
router.post('/verify', verifyRecord);                              // POST /api/records/verify
router.get('/:patientAddress/count', getRecordCount);               // GET  /api/records/:patientAddress/count
router.get('/:patientAddress', getRecords);                         // GET  /api/records/:patientAddress

module.exports = router;
