const express = require('express');
const router  = express.Router();
const { getRole } = require('../controllers/authController');

router.get('/role/:address', getRole); // GET /api/auth/role/:address

module.exports = router;
