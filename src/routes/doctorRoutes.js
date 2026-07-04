const express = require('express');
const router  = express.Router();
const { registerDoctor, getDoctor, listDoctors } = require('../controllers/doctorController');

router.post('/',           registerDoctor);   // POST /api/doctors
router.get('/list',        listDoctors);      // GET  /api/doctors/list   ← BARU
router.get('/:address',    getDoctor);        // GET  /api/doctors/:address

module.exports = router;
