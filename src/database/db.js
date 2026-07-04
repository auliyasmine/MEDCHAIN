/**
 * db.js — Konfigurasi SQLite untuk menyimpan NIK plaintext secara lokal
 *
 * Mengapa SQLite?
 *  - Tidak perlu install server database terpisah (MySQL/PostgreSQL)
 *  - Data tersimpan di satu file lokal: medchain.db
 *  - Cukup untuk kebutuhan proyek ini
 *
 * Arsitektur hybrid storage MedChain:
 *  - On-chain  : nikHash (Keccak-256), nama, tanggal lahir, hash dokumen, CID IPFS
 *  - Off-chain DB : NIK plaintext (hanya disimpan lokal di backend, tidak ke blockchain)
 *  - Off-chain IPFS : dokumen rekam medis lengkap
 */

const Database = require('better-sqlite3');
const path = require('path');

// File database disimpan di root folder Backend
const DB_PATH = path.join(__dirname, '../../medchain.db');

const db = new Database(DB_PATH);

// Aktifkan WAL mode untuk performa lebih baik
db.pragma('journal_mode = WAL');

// Buat tabel patients jika belum ada
db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    wallet_address TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    dob            TEXT NOT NULL,
    nik            TEXT NOT NULL,
    nik_hash       TEXT NOT NULL,
    registered_at  INTEGER NOT NULL
  );
`);

// Tabel dokter — dipakai sebagai cache lokal supaya halaman Admin tidak
// perlu scan event blockchain (eth_getLogs) tiap kali dibuka. eth_getLogs
// di RPC publik (mis. Alchemy free tier) sangat dibatasi rentang block-nya
// (cuma 10 block/request), jadi scan penuh dari awal bisa makan waktu
// berMENIT-menit dan gampang gagal/timeout. Dengan cache ini, data dokter
// yang didaftarkan lewat backend langsung tersimpan saat itu juga — tanpa
// perlu scan apa pun.
db.exec(`
  CREATE TABLE IF NOT EXISTS doctors (
    wallet_address TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    registered_at  INTEGER NOT NULL
  );
`);

// Tabel cache untuk daftar izin akses (grant/revoke), supaya getAccessList()
// tidak perlu scan event AccessGranted/AccessRevoked dari blockchain tiap
// halaman dibuka. Karena grantAccess/revokeAccess dikirim LANGSUNG dari
// frontend lewat MetaMask (bukan lewat backend), baris di sini diisi oleh
// frontend lewat POST /api/access/record tepat setelah tx-nya confirmed.
db.exec(`
  CREATE TABLE IF NOT EXISTS access_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_address TEXT NOT NULL,
    doctor_address  TEXT NOT NULL,
    action          TEXT NOT NULL CHECK (action IN ('grant', 'revoke')),
    tx_hash         TEXT,
    created_at      INTEGER NOT NULL
  );
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_access_log_patient ON access_log (patient_address, doctor_address, id);`);

console.log('[DB] SQLite database siap di:', DB_PATH);

module.exports = db;
