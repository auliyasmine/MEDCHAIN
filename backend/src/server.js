/**
 * server.js — Entry point MedChain Backend
 *
 * Perubahan dari v1:
 *  - Import db.js di awal agar SQLite diinisialisasi saat server start
 */

const express = require('express');
const cors    = require('cors');
require('dotenv').config();

// Inisialisasi SQLite saat server start (membuat file medchain.db + tabel jika belum ada)
require('./database/db');

const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes  = require('./routes/doctorRoutes');
const recordRoutes  = require('./routes/recordRoutes');
const accessRoutes  = require('./routes/accessRoutes');
const authRoutes    = require('./routes/authRoutes');
const errorHandler  = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ success: true, message: 'MedChain Backend API aktif 🚀' });
});

// Routes
app.use('/api/patients', patientRoutes);
app.use('/api/doctors',  doctorRoutes);
app.use('/api/records',  recordRoutes);
app.use('/api/access',   accessRoutes);
app.use('/api/auth',     authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});

// Error handler (selalu paling bawah)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ MedChain Backend berjalan di http://localhost:${PORT}`);
});
