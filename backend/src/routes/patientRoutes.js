const express = require('express');
const router  = express.Router();
const { registerPatient, getPatient, listPatients, syncPatients } = require('../controllers/patientController');

router.post('/',           registerPatient);  // POST /api/patients
router.get('/list',        listPatients);     // GET  /api/patients/list  ← BARU
router.post('/sync',       syncPatients);     // POST /api/patients/sync  ← BARU (sekali jalan, tarik data lama dari chain)
router.get('/:address',    getPatient);       // GET  /api/patients/:address

module.exports = router;
