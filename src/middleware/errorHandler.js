function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message);

  // Error dari smart contract (require() gagal) biasanya muncul di err.reason / err.shortMessage
  const reason = err.reason || err.shortMessage || err.message || 'Terjadi kesalahan pada server';

  res.status(err.status || 500).json({
    success: false,
    message: reason,
  });
}

module.exports = errorHandler;
