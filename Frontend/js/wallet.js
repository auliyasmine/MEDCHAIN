/**
 * MedChain — wallet.js
 * Handles MetaMask detection, connection, disconnection,
 * network info, and Ethers.js provider setup.
 * Ready for smart-contract integration.
 */

'use strict';

const Wallet = (() => {
  /* ── Internal state ── */
  let _provider = null;
  let _signer   = null;
  let _account  = null;
  let _network  = null;
  let _listeners = {};

  /* ── Public: check MetaMask ── */
  function isMetaMaskInstalled() {
    return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
  }

  /* ── Public: connect ── */
  async function connect() {
    if (!isMetaMaskInstalled()) {
      // Simulate a wallet for demo purposes
      const fakeAddress = '0x' + [...Array(40)].map(() =>
        Math.floor(Math.random() * 16).toString(16)).join('');
      _account = fakeAddress;
      _network = { name: 'Simulated', chainId: BigInt(11155111) };
      _emit('connected', { account: _account, network: _network, simulated: true });
      return { account: _account, network: _network, simulated: true };
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) throw new Error('No accounts returned');

      _account  = accounts[0];
      _provider = new ethers.BrowserProvider(window.ethereum);
      _signer   = await _provider.getSigner();
      _network  = await _provider.getNetwork();

      _setupListeners();

      const result = { account: _account, network: _network, simulated: false };
      _emit('connected', result);
      return result;
    } catch (err) {
      _emit('error', err);
      throw err;
    }
  }

  /**
   * Public: reconnectSilent
   * Dipanggil di setiap halaman (doctor/patient/admin) setelah navigasi penuh
   * dari index.html, karena _provider/_signer di module ini RESET ke null
   * setiap kali halaman baru dimuat (full page reload, bukan SPA).
   * Tanpa ini, Bridge.isLive() akan SELALU false di halaman manapun selain
   * index.html, sehingga semua pembacaan on-chain (hasAccess, getRecord, dst)
   * diam-diam jatuh ke data mock — itulah penyebab bug "akses selalu granted"
   * dan "data baru tidak muncul".
   * Pakai eth_accounts (BUKAN eth_requestAccounts) supaya tidak memunculkan
   * popup MetaMask berulang — hanya membaca akun yang sudah pernah di-approve.
   */
  async function reconnectSilent() {
    const wasSimulated = localStorage.getItem('mc_simulated') === '1';
    const savedAccount = localStorage.getItem('mc_account');
    if (!savedAccount) return null;

    if (wasSimulated || !isMetaMaskInstalled()) {
      // Tetap mode demo: account hanya dipakai untuk tampilan, Bridge.isLive() tetap false (memang seharusnya).
      _account = savedAccount;
      _network = { name: 'Simulated', chainId: BigInt(11155111) };
      return { account: _account, network: _network, simulated: true };
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' }); // tidak memicu popup
      if (!accounts || accounts.length === 0) return null; // user sudah disconnect dari MetaMask

      _account  = accounts[0];
      _provider = new ethers.BrowserProvider(window.ethereum);
      _signer   = await _provider.getSigner();
      _network  = await _provider.getNetwork();
      _setupListeners();

      const result = { account: _account, network: _network, simulated: false };
      _emit('connected', result);
      return result;
    } catch (err) {
      console.warn('[Wallet] Gagal reconnect otomatis:', err.message);
      return null;
    }
  }

  /* ── Public: disconnect (MetaMask doesn't truly disconnect, we just clear state) ── */
  function disconnect() {
    _provider = null;
    _signer   = null;
    _account  = null;
    _network  = null;
    _removeListeners();
    _emit('disconnected', {});
  }

  /* ── Public: get current account ── */
  function getAccount() { return _account; }

  /* ── Public: get provider ── */
  function getProvider() { return _provider; }

  /* ── Public: get signer ── */
  function getSigner() { return _signer; }

  /* ── Public: get network ── */
  function getNetwork() { return _network; }

  /* ── Public: get formatted short address ── */
  function shortAddress(addr) {
    const a = addr || _account;
    if (!a) return '';
    return `${a.substring(0, 6)}…${a.slice(-4)}`;
  }

  /* ── Public: check if on Sepolia ── */
  function isSepoliaNetwork() {
    return _network && _network.chainId === BigInt(11155111);
  }

  /* ── Public: switch to Sepolia ── */
  async function switchToSepolia() {
    if (!isMetaMaskInstalled()) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }],
      });
    } catch (err) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xaa36a7',
            chainName: 'Sepolia Testnet',
            nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://rpc.sepolia.org'],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          }],
        });
      }
      throw err;
    }
  }

  /* ── Public: get ETH balance ── */
  async function getBalance() {
    if (!_provider || !_account) return '0';
    try {
      const bal = await _provider.getBalance(_account);
      return ethers.formatEther(bal);
    } catch { return '0'; }
  }

  /* ── Public: sign a message (for auth) ── */
  async function signMessage(message) {
    if (!_signer) throw new Error('No signer available');
    return await _signer.signMessage(message);
  }

  /* ── Public: event emitter ── */
  function on(event, cb) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(cb);
  }
  function off(event, cb) {
    if (!_listeners[event]) return;
    _listeners[event] = _listeners[event].filter(fn => fn !== cb);
  }

  /* ── Private ── */
  function _emit(event, data) {
    (_listeners[event] || []).forEach(fn => fn(data));
  }

  function _setupListeners() {
    if (!isMetaMaskInstalled()) return;
    window.ethereum.on('accountsChanged', _onAccountsChanged);
    window.ethereum.on('chainChanged',    _onChainChanged);
    window.ethereum.on('disconnect',      _onDisconnect);
  }

  function _removeListeners() {
    if (!isMetaMaskInstalled()) return;
    window.ethereum.removeListener('accountsChanged', _onAccountsChanged);
    window.ethereum.removeListener('chainChanged',    _onChainChanged);
    window.ethereum.removeListener('disconnect',      _onDisconnect);
  }

  function _onAccountsChanged(accounts) {
    if (accounts.length === 0) {
      disconnect();
    } else {
      _account = accounts[0];
      _emit('accountChanged', { account: _account });
    }
  }

  async function _onChainChanged(chainId) {
    if (_provider) {
      _network = await _provider.getNetwork().catch(() => null);
    }
    _emit('chainChanged', { chainId, network: _network });
  }

  function _onDisconnect(err) {
    disconnect();
    _emit('error', err);
  }

  /* ── Placeholder: Smart Contract interaction stubs ── */
  const Contract = {
    /**
     * Call a read-only (view) function on the deployed contract.
     * Replace ABI and address before production.
     */
    async call(contractAddress, abi, method, ...args) {
      if (!_provider) throw new Error('Provider not initialized');
      const contract = new ethers.Contract(contractAddress, abi, _provider);
      return await contract[method](...args);
    },

    /**
     * Send a state-changing transaction.
     * Requires the user to sign via MetaMask.
     */
    async send(contractAddress, abi, method, ...args) {
      if (!_signer) throw new Error('Signer not available — connect wallet first');
      const contract = new ethers.Contract(contractAddress, abi, _signer);

      // Kirim transaksi ke jaringan
      const tx = await contract[method](...args);

      // Tunggu 1 konfirmasi, dengan timeout 120 detik supaya tombol tidak
      // spinner selamanya kalau jaringan Sepolia lambat atau RPC node down.
      const TIMEOUT_MS = 120_000; // 2 menit
      const receipt = await Promise.race([
        tx.wait(1),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(
              `Transaksi terkirim (${tx.hash.slice(0,10)}…) tapi konfirmasi` +
              ` belum diterima dalam ${TIMEOUT_MS / 1000} detik. ` +
              `Cek status di Sepolia Etherscan.`
            )),
            TIMEOUT_MS
          )
        ),
      ]);
      return receipt;
    },
  };

  /* ── Public API ── */
  return {
    isMetaMaskInstalled,
    connect,
    reconnectSilent,
    disconnect,
    getAccount,
    getProvider,
    getSigner,
    getNetwork,
    shortAddress,
    isSepoliaNetwork,
    switchToSepolia,
    getBalance,
    signMessage,
    on,
    off,
    Contract,
  };
})();

window.Wallet = Wallet;