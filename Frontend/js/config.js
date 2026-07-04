/**
 * MedChain — config.js
 * Satu tempat untuk semua konfigurasi koneksi:
 * - API_BASE_URL  : alamat backend Express (lihat repo medchain-backend)
 * - CONTRACT_ADDRESS : alamat MedChain.sol hasil deploy di Remix (Sepolia)
 * - CONTRACT_ABI  : ABI yang sama persis dengan yang dipakai backend
 *
 * WAJIB diisi sebelum frontend bisa terhubung ke blockchain & backend asli.
 * Selama CONTRACT_ADDRESS masih placeholder, app.js otomatis tetap memakai
 * mode simulasi (seperti sebelumnya) supaya halaman tidak error.
 */

const Config = {
  // Ganti dengan URL backend kalian. Kalau backend jalan lokal saat development:
  // PENTING: pakai 127.0.0.1, BUKAN localhost — di Windows, "localhost" kadang
  // di-resolve ke IPv6 (::1) duluan sementara backend Node biasanya cuma
  // listen di IPv4, menyebabkan fetch() gagal connect ("Failed to fetch")
  // tanpa request itu sempat sampai ke backend sama sekali (jadi backend
  // tidak mencatat error apa pun, padahal sebenarnya konek pun tidak).
  // Pastikan juga ini SAMA PERSIS host:port-nya dengan tempat Frontend
  // dibuka di browser, supaya FRONTEND_ORIGIN di .env backend cocok.
  API_BASE_URL: 'http://127.0.0.1:5000/api',

  // Ganti dengan alamat contract hasil deploy MedChain.sol di Remix (Sepolia)
  CONTRACT_ADDRESS: '0x99d533b0B153c6B558eef689Adc2B2082558859C',

  // ABI ini HARUS sama dengan src/abi/MedChainABI.json di backend
  CONTRACT_ABI: [
    { "type": "constructor", "stateMutability": "nonpayable", "inputs": [] },
    { "type": "function", "name": "admin", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "address" }] },
    { "type": "function", "name": "registerPatient", "stateMutability": "nonpayable",
      "inputs": [
        { "name": "_patientAddress", "type": "address" },
        { "name": "_name", "type": "string" },
        { "name": "_dob", "type": "string" },
        { "name": "_nik", "type": "string" }
      ], "outputs": [] },
    { "type": "function", "name": "registerDoctor", "stateMutability": "nonpayable",
      "inputs": [
        { "name": "_doctorAddress", "type": "address" },
        { "name": "_name", "type": "string" }
      ], "outputs": [] },
    { "type": "function", "name": "grantAccess", "stateMutability": "nonpayable",
      "inputs": [{ "name": "_doctor", "type": "address" }], "outputs": [] },
    { "type": "function", "name": "revokeAccess", "stateMutability": "nonpayable",
      "inputs": [{ "name": "_doctor", "type": "address" }], "outputs": [] },
    { "type": "function", "name": "addMedicalRecord", "stateMutability": "nonpayable",
      "inputs": [
        { "name": "_patient", "type": "address" },
        { "name": "_ipfsCID", "type": "string" },
        { "name": "_documentHash", "type": "bytes32" },
        { "name": "_diagnosis", "type": "string" }
      ], "outputs": [] },
    { "type": "function", "name": "getRecord", "stateMutability": "view",
      "inputs": [{ "name": "_patient", "type": "address" }],
      "outputs": [{
        "type": "tuple[]",
        "components": [
          { "name": "id", "type": "uint256" },
          { "name": "patient", "type": "address" },
          { "name": "doctor", "type": "address" },
          { "name": "ipfsCID", "type": "string" },
          { "name": "documentHash", "type": "bytes32" },
          { "name": "diagnosis", "type": "string" },
          { "name": "timestamp", "type": "uint256" }
        ]
      }] },
    { "type": "function", "name": "verifyRecord", "stateMutability": "view",
      "inputs": [
        { "name": "_patient", "type": "address" },
        { "name": "_recordIndex", "type": "uint256" },
        { "name": "_localHash", "type": "bytes32" }
      ], "outputs": [{ "name": "isAuthentic", "type": "bool" }] },
    { "type": "function", "name": "getRecordCount", "stateMutability": "view",
      "inputs": [{ "name": "_patient", "type": "address" }], "outputs": [{ "type": "uint256" }] },
    { "type": "function", "name": "hasAccess", "stateMutability": "view",
      "inputs": [
        { "name": "_patient", "type": "address" },
        { "name": "_doctor", "type": "address" }
      ], "outputs": [{ "type": "bool" }] },
    { "type": "function", "name": "isPatientRegistered", "stateMutability": "view",
      "inputs": [{ "name": "_addr", "type": "address" }], "outputs": [{ "type": "bool" }] },
    { "type": "function", "name": "isDoctorRegistered", "stateMutability": "view",
      "inputs": [{ "name": "_addr", "type": "address" }], "outputs": [{ "type": "bool" }] }
  ],
};

// true selama CONTRACT_ADDRESS belum diisi -> dipakai app.js untuk auto fallback ke mode simulasi
Config.isConfigured = !Config.CONTRACT_ADDRESS.includes('MASUKKAN');

window.Config = Config;
