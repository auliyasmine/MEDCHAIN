const { ethers } = require('ethers');
const { contractRead, contractAsAdmin, adminWallet } = require('../config/blockchain');

/**
 * GET /api/auth/role/:address
 *
 * Sumber kebenaran peran (role) wallet, dipakai frontend untuk memutuskan
 * halaman mana yang boleh diakses. TIDAK BOLEH dipercaya dari localStorage
 * atau pilihan dropdown di frontend, karena itu bisa dipalsukan siapa saja
 * lewat devtools. Aturan:
 *   1. Kalau alamat == address wallet ADMIN_PRIVATE_KEY di .env  -> role 'admin'
 *   2. Kalau alamat terdaftar sebagai dokter on-chain             -> role 'doctor'
 *   3. Kalau alamat terdaftar sebagai pasien on-chain             -> role 'patient'
 *   4. Selain itu                                                 -> role 'none'
 *      (belum didaftarkan admin, tidak boleh akses halaman manapun)
 */
async function getRole(req, res, next) {
  try {
    const { address } = req.params;
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ success: false, message: 'Alamat wallet tidak valid' });
    }
    const addr = address.toLowerCase();

    if (adminWallet && addr === adminWallet.address.toLowerCase()) {
      return res.json({ success: true, data: { role: 'admin', name: 'Administrator' } });
    }

    const [isDoctor, isPatient] = await Promise.all([
      contractRead.isDoctorRegistered(address),
      contractRead.isPatientRegistered(address),
    ]);

    // getDoctorInfo/getPatientInfo dikunci access-control di smart contract
    // (msg.sender harus pemiliknya / dokter berizin / admin). Dipanggil lewat
    // contractRead (provider tanpa signer) msg.sender = address(0) -> selalu
    // revert. contractAsAdmin sudah ditandatangani wallet admin dari .env,
    // jadi msg.sender == admin terpenuhi dan request selalu lolos.
    if (!contractAsAdmin) {
      return res.status(500).json({ success: false, message: 'ADMIN_PRIVATE_KEY belum dikonfigurasi di backend' });
    }

    if (isDoctor) {
      const [name] = await contractAsAdmin.getDoctorInfo(address);
      return res.json({ success: true, data: { role: 'doctor', name } });
    }

    if (isPatient) {
      const [, name] = await contractAsAdmin.getPatientInfo(address);
      return res.json({ success: true, data: { role: 'patient', name } });
    }

    return res.json({ success: true, data: { role: 'none', name: null } });
  } catch (err) { next(err); }
}

module.exports = { getRole };
