const express = require('express');
const router  = express.Router();
const { checkAccess, getAccessList, recordAccessEvent, syncAccess } = require('../controllers/accessController');

router.get('/',                       checkAccess);        // GET  /api/access?patient=&doctor=
router.post('/record',                recordAccessEvent);  // POST /api/access/record          ← BARU
router.post('/sync/:patientAddress',  syncAccess);          // POST /api/access/sync/:patient   ← BARU
router.get('/:patientAddress',        getAccessList);       // GET  /api/access/:patientAddress

module.exports = router;
