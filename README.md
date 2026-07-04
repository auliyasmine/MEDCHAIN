# MedChain Backend
## 🔗 Link Deployment Live
Aplikasi ini sudah berhasil di-deploy secara online dan dapat diakses langsung oleh dosen atau publik melalui tautan berikut:

👉 **[Main App: medchain-omw3.vercel.app](https://medchain-omw3.vercel.app/)**
API gateway pendukung sistem **MedChain** (Front-End + Smart Contract + IPFS).

## Peran Backend Ini

Backend **tidak** menggantikan smart contract — semua logika inti rekam medis tetap
on-chain di Solidity (sesuai Bab IV laporan). Backend hanya menangani dua hal yang
sebaiknya tidak dilakukan langsung dari browser:

1. **Upload dokumen ke IPFS** — supaya API key provider IPFS (Pinata) tidak terekspos di
   front-end. Backend menghitung hash Keccak-256 + upload file, lalu mengembalikan
   `ipfsCID` & `documentHash` ke front-end untuk dipakai memanggil `addMedicalRecord()`.
2. **Operasi admin** (`registerPatient`, `registerDoctor`) — direlay backend memakai
   wallet admin yang disimpan aman di server (`.env`), supaya admin tidak harus selalu
   buka MetaMask.

Transaksi yang **harus** ditandatangani pasien/dokter sendiri (`grantAccess`,
`revokeAccess`, `addMedicalRecord`) tetap dilakukan front-end via MetaMask — backend
tidak pernah menyimpan private key pengguna.

## Setup di VS Code

```bash
# 1. Buka folder ini di VS Code
cd medchain-backend

# 2. Install dependencies
npm install

# 3. Copy .env.example -> .env, lalu isi:
#    - SEPOLIA_RPC_URL  (dari Infura/Alchemy, gratis)
#    - ADMIN_PRIVATE_KEY (private key wallet yang dipakai deploy contract di Remix)
#    - CONTRACT_ADDRESS  (alamat hasil deploy MedChain.sol)
#    - PINATA_API_KEY & PINATA_API_SECRET (daftar gratis di app.pinata.cloud)
cp .env.example .env

# 4. Jalankan (mode development, auto-reload)
npm run dev

# atau jalankan biasa:
npm start
```

Server akan jalan di `http://localhost:5000`.

## Daftar Endpoint

| Method | Endpoint                              | Keterangan                                  |
|--------|----------------------------------------|----------------------------------------------|
| GET    | `/`                                    | Health check                                 |
| POST   | `/api/patients`                        | Admin daftarkan pasien `{address,name,dob,nik}` |
| GET    | `/api/patients/:address`               | Cek data pasien                              |
| POST   | `/api/doctors`                         | Admin daftarkan dokter `{address,name}`      |
| GET    | `/api/doctors/:address`                | Cek data dokter                              |
| POST   | `/api/records/upload`                  | Upload dokumen (form-data, field `document`) → IPFS |
| GET    | `/api/records/:patientAddress`         | Ambil semua rekam medis pasien               |
| GET    | `/api/records/:patientAddress/count`   | Jumlah rekam medis                           |
| POST   | `/api/records/verify`                  | Verifikasi hash `{patientAddress,recordIndex,localHash}` |
| GET    | `/api/access?patient=&doctor=`         | Cek status izin akses                        |

## Catatan Penting

- `getRecord()` di smart contract membatasi siapa yang boleh membaca (pasien sendiri /
  dokter berizin / admin) berdasarkan `msg.sender`. Karena endpoint `GET /api/records/:patientAddress`
  di backend memanggil contract lewat provider **tanpa wallet pengguna**, `msg.sender`
  di EVM akan dianggap `address(0)` — sehingga panggilan ini hanya berguna untuk data
  yang memang diizinkan publik/admin. Untuk tampilan dashboard pasien/dokter yang
  butuh validasi izin akses pribadi, front-end sebaiknya tetap memanggil
  `contract.getRecord()` langsung via Ethers.js + MetaMask (seperti pola yang sudah ada
  di `wallet.js`), bukan lewat backend.
- Jangan commit file `.env` asli ke GitHub (sudah ada di `.gitignore`).
