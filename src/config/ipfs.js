const axios = require('axios');
const FormData = require('form-data');

const PINATA_PIN_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

/**
 * Upload buffer file (dari multer, hasil unggahan dokter di front-end)
 * ke IPFS lewat Pinata, lalu mengembalikan CID-nya.
 *
 * @param {Buffer} fileBuffer - isi file
 * @param {string} fileName   - nama file asli
 * @returns {Promise<string>} CID (Content Identifier) IPFS
 */
async function uploadToIPFS(fileBuffer, fileName) {
  const data = new FormData();
  data.append('file', fileBuffer, fileName);

  const metadata = JSON.stringify({ name: fileName });
  data.append('pinataMetadata', metadata);

  const response = await axios.post(PINATA_PIN_URL, data, {
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    headers: {
      ...data.getHeaders(),
      pinata_api_key: process.env.PINATA_API_KEY,
      pinata_secret_api_key: process.env.PINATA_SECRET_KEY,
    },
  });

  return response.data.IpfsHash; // ini CID yang nanti dicatat on-chain via addMedicalRecord
}

module.exports = { uploadToIPFS };
