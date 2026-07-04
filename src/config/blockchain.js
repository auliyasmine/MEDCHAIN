/**
 * blockchain.js — Konfigurasi koneksi ke Ethereum Sepolia Testnet
 *
 * Tidak ada perubahan dari v1, disertakan untuk kelengkapan.
 */

const { ethers } = require('ethers');
const abi = require('../abi/MedChainABI.json');
require('dotenv').config();

if (!process.env.SEPOLIA_RPC_URL || !process.env.CONTRACT_ADDRESS) {
  console.warn('[blockchain.js] PERINGATAN: SEPOLIA_RPC_URL atau CONTRACT_ADDRESS belum diisi di .env');
}

// Provider read-only — dipakai untuk semua query "view" (tidak butuh gas/signature)
//
// PENTING: ethers v6 secara default MENGGABUNGKAN (batch) beberapa request
// JSON-RPC yang terjadi dalam tick yang sama jadi satu HTTP request, untuk
// efisiensi. Tapi kalau dua endpoint dipanggil bersamaan dari frontend
// (mis. /patients/list dan /doctors/list lewat Promise.all) dan salah satu
// gagal/ditolak provider, ethers tidak bisa menentukan request mana yang
// gagal di dalam batch itu — lalu melempar error generik
// "could not coalesce error". Solusinya: matikan batching (batchMaxCount: 1)
// supaya tiap request dikirim satu-satu ke RPC, sedikit lebih lambat tapi
// jauh lebih stabil untuk provider publik seperti Alchemy free tier.
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL, undefined, {
  batchMaxCount: 1,
});

// Wallet admin — HANYA dipakai untuk fungsi onlyAdmin (registerPatient, registerDoctor)
// Wallet pasien/dokter TIDAK pernah disimpan di backend
const adminWallet = process.env.ADMIN_PRIVATE_KEY
  ? new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider)
  : null;

if (adminWallet) {
  console.log("Admin Wallet:", adminWallet.address);
}
// Contract instance read-only
const contractRead = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, provider);

// Contract instance untuk transaksi admin
const contractAsAdmin = adminWallet
  ? new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, adminWallet)
  : null;

module.exports = { provider, adminWallet, contractRead, contractAsAdmin, abi };
