const multer = require('multer');

// Simpan file di memori (buffer) — tidak ditulis ke disk server,
// langsung diteruskan ke IPFS lalu dibuang dari memori.
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // maksimal 10MB per dokumen
});

module.exports = upload;
