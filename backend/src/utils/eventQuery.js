/**
 * eventQuery.js — Helper untuk query event blockchain dalam potongan (chunk) block.
 *
 * KENAPA INI PERLU:
 * RPC publik (Alchemy/Infura, terutama tier gratis) MEMBATASI rentang block
 * untuk eth_getLogs per request. Alchemy FREE TIER ternyata cuma izinkan
 * MAKSIMAL 10 BLOCK per request eth_getLogs (lihat pesan error aslinya:
 * "Under the Free tier plan, you can make eth_getLogs requests with up to
 * a 10 block range"). Kalau kita query langsung dari block 0/DEPLOY_BLOCK
 * sampai 'latest' sekaligus, request DITOLAK provider. Sebelumnya error ini
 * ditelan diam-diam oleh `.catch(() => null)` di frontend, sehingga halaman
 * Admin tetap menampilkan data mock lama tanpa entitas baru muncul —
 * padahal data on-chain sebenarnya valid.
 *
 * Fungsi ini memecah query jadi banyak request kecil (10 block per chunk)
 * secara berurutan (bukan paralel, supaya tidak kena rate limit juga),
 * dengan jeda kecil antar-request, dan otomatis membagi chunk lebih kecil
 * lagi (bisection) kalau ternyata limit provider lebih ketat dari dugaan.
 */

// Alchemy free tier: 10 block per eth_getLogs. Pakai 10 sebagai default aman.
// Kalau provider kalian beda (Infura dkk biasanya jauh lebih longgar),
// boleh dinaikkan lewat env LOG_CHUNK_SIZE.
const DEFAULT_CHUNK_SIZE = Number(process.env.LOG_CHUNK_SIZE || 10);
const MIN_CHUNK_SIZE = 1;     // batas bawah bisection
const REQUEST_DELAY_MS = 120; // jeda antar-request supaya tidak kena rate limit (CU/s) Alchemy free tier

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** Ambil satu range [from, to]; kalau provider menolak, bagi dua dan coba lagi. */
async function fetchRange(contract, filter, from, to) {
  try {
    const result = await contract.queryFilter(filter, from, to);
    await sleep(REQUEST_DELAY_MS);
    return result;
  } catch (err) {
    if (to - from < MIN_CHUNK_SIZE) {
      throw err; // sudah sekecil mungkin (1 block), lempar error aslinya supaya kelihatan di log backend
    }
    const mid = Math.floor((from + to) / 2);
    const left  = await fetchRange(contract, filter, from, mid);
    const right = await fetchRange(contract, filter, mid + 1, to);
    return [...left, ...right];
  }
}

/**
 * Query semua event yang cocok dengan filter, dipecah per chunk block kecil,
 * dari `fromBlock` (default: env DEPLOY_BLOCK atau 0) sampai block terkini.
 * @param {ethers.Contract} contract - instance contract (read-only)
 * @param {ethers.EventFilter} filter - hasil dari contract.filters.XXX(...)
 * @param {number} [fromBlock] - block awal pencarian
 * @param {number} [chunkSize] - ukuran tiap potongan block
 * @returns {Promise<Array>} gabungan semua event yang ditemukan, urut menaik
 */
async function queryEventsChunked(contract, filter, fromBlock = null, chunkSize = DEFAULT_CHUNK_SIZE) {
  const startBlock  = fromBlock ?? Number(process.env.DEPLOY_BLOCK || 0);
  const latestBlock = await contract.runner.provider.getBlockNumber();
  if (startBlock > latestBlock) return [];

  const allEvents = [];
  for (let from = startBlock; from <= latestBlock; from += chunkSize) {
    const to = Math.min(from + chunkSize - 1, latestBlock);
    const events = await fetchRange(contract, filter, from, to);
    allEvents.push(...events);
  }

  return allEvents.sort((a, b) => a.blockNumber - b.blockNumber);
}

module.exports = { queryEventsChunked };
