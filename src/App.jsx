import React, { useState, useEffect } from 'react';
import { getWeb3, getContract } from './utils/web3';
import { db } from './firebase/config';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  updateDoc
} from 'firebase/firestore';
import './App.css';

function App() {
  const [account, setAccount] = useState('Connecting...');
  const [balance, setBalance] = useState('0');
  const [contract, setContract] = useState(null);
  const [web3, setWeb3] = useState(null);

  // UI State
  const [view, setView] = useState('ALL'); // 'ALL' or 'MINE'
  const [propId, setPropId] = useState('');
  const [transferData, setTransferData] = useState({ id: '', newOwner: '' });
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Feedback State (Success/Error Messages)
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Helper to show temporary messages
  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    // Auto-hide after 5 seconds
    setTimeout(() => setFeedback({ type: '', message: '' }), 5000);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const _web3 = getWeb3();
        const instance = getContract(_web3);

        const accounts = await _web3.eth.getAccounts();
        const currentAccount = accounts[0];
        const bal = await _web3.eth.getBalance(currentAccount);

        setWeb3(_web3);
        setContract(instance);
        setAccount(currentAccount);
        setBalance(_web3.utils.fromWei(bal, 'ether'));

        fetchProperties('ALL', currentAccount);
      } catch (err) {
        console.error(err);
        setAccount("Connection Error");
      }
    };
    init();
  }, []);

  // --- DATA FETCHING ---
  const fetchProperties = async (viewMode, currentAccount) => {
    try {
      let q;
      if (viewMode === 'MINE') {
        // Show assets I created (even if transferred later)
        q = query(
          collection(db, "properties"),
          where("creator", "==", currentAccount)
        );
      } else {
        // Show all assets
        q = query(
          collection(db, "properties"),
          orderBy("timestamp", "desc")
        );
      }

      const querySnapshot = await getDocs(q);
      const props = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProperties(props);
    } catch (e) {
      console.error("Fetch Error:", e);
    }
  };

  const toggleView = (mode) => {
    setView(mode);
    fetchProperties(mode, account);
  }

  // --- ACTIONS ---

  const handleRegister = async () => {
    setFeedback({ type: '', message: '' });
    if (!contract) return showFeedback('error', "Blockchain not ready.");
    if (!propId) return showFeedback('error', "Input required.");

    setLoading(true);

    try {
      const accounts = await web3.eth.getAccounts();
      const currentAccount = accounts[0];

      // 1. Blockchain Pre-Check
      const owner = await contract.methods.getOwner(propId).call();
      if (owner !== "0x0000000000000000000000000000000000000000") {
        setLoading(false);
        return showFeedback('error', `❌ REJECTED: '${propId}' is already taken.`);
      }

      // 2. Register on Blockchain
      const receipt = await contract.methods
        .registerProperty(propId)
        .send({ from: currentAccount, gas: 3000000 });

      // ✅ LOG: Kept as requested
      console.log("📝 Register Receipt:", receipt);

      // 3. Save to Firebase (Include 'creator' field!)
      await addDoc(collection(db, "properties"), {
        propertyId: propId,
        owner: currentAccount,
        creator: currentAccount, // Critical for tracking history
        txHash: receipt.transactionHash,
        timestamp: new Date()
      });

      showFeedback('success', "Success: Property Registered!");
      setPropId('');
      fetchProperties(view, currentAccount);

    } catch (error) {
      console.error("Registration Error:", error);
      if (error.message && error.message.includes("Already registered")) {
        showFeedback('error', "❌ Transaction Reverted: Property ID is taken.");
      } else {
        showFeedback('error', "Transaction Failed: " + error.message);
      }
    }
    setLoading(false);
  };

  const handleTransfer = async () => {
    const { id, newOwner } = transferData;
    setFeedback({ type: '', message: '' });

    if (!contract) return showFeedback('error', "Blockchain not ready");
    if (!id || !newOwner) return showFeedback('error', "All fields required");

    // 🛡️ Security Check
    if (!web3.utils.isAddress(newOwner)) {
      return showFeedback('error', "❌ Invalid Ethereum Address.");
    }

    setLoading(true);
    setFeedback({ type: 'info', message: '⏳ Signing transaction...' });

    try {
      // 1. Execute Transfer on Blockchain
      const receipt = await contract.methods
        .transferProperty(id, newOwner)
        .send({ from: account, gas: 3000000 });

      // ✅ LOG: Kept as requested
      console.log("🔄 Transfer Receipt:", receipt);

      // 2. Update Firestore
      const q = query(collection(db, "properties"), where("propertyId", "==", id));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, {
          owner: newOwner,
          txHash: receipt.transactionHash
        });
      }

      showFeedback('success', `✅ Transferred '${id}' to ${newOwner.substring(0, 6)}...`);
      setTransferData({ id: '', newOwner: '' });
      fetchProperties(view, account);

    } catch (error) {
      console.error("Full Error:", error);

      // 🔍 Parse the error string to catch "Not the owner"
      const errorString = JSON.stringify(error, Object.getOwnPropertyNames(error)).toLowerCase();

      if (errorString.includes("not the owner")) {
        showFeedback('error', "⛔ ACCESS DENIED: You do not own this asset.");
      } else if (errorString.includes("user denied")) {
        showFeedback('error', "Transaction rejected.");
      } else {
        showFeedback('error', "Transfer Failed. Check console.");
      }
    }
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>LAND REGISTRY.<span className="mono-badge">V1</span></h1>

        <div className="status-bar">
          <div className="wallet-badge">
            <span className="label">BAL</span>
            <span className="value mono">{parseFloat(balance).toFixed(4)} ETH</span>
          </div>

          <div className={`wallet-badge clickable ${copied ? 'active' : ''}`} onClick={handleCopy}>
            <span className="label">{copied ? "COPIED" : "WALLET"}</span>
            <span className="value mono">
              <span className="mobile-only">{account.substring(0, 6)}...</span>
              <span className="desktop-only">{account}</span>
            </span>
            <span className="icon">❐</span>
          </div>
        </div>
      </header>

      <main className="main-layout">
        <div className="actions-grid">

          {/* REGISTER CARD */}
          <section className="card">
            <h2>REGISTER ASSET</h2>
            <div className="form-group">
              <input
                value={propId}
                onChange={(e) => setPropId(e.target.value)}
                placeholder="Property ID"
              />
              <button onClick={handleRegister} disabled={loading}>
                {loading ? "PROCESSING..." : "REGISTER"}
              </button>
            </div>
          </section>

          {/* TRANSFER CARD */}
          <section className="card">
            <h2>TRANSFER OWNERSHIP</h2>
            <div className="form-group">
              <input
                value={transferData.id}
                onChange={(e) => setTransferData({ ...transferData, id: e.target.value })}
                placeholder="Property ID"
              />
              <input
                value={transferData.newOwner}
                onChange={(e) => setTransferData({ ...transferData, newOwner: e.target.value })}
                placeholder="New Owner (0x...)"
              />

              {/* FEEDBACK AREA */}
              {feedback.message && (
                <div className={`status-message ${feedback.type}`}>
                  {feedback.message}
                </div>
              )}

              <button onClick={handleTransfer} disabled={loading} className="btn-dark">
                {loading ? "SIGNING..." : "TRANSFER"}
              </button>
            </div>
          </section>
        </div>

        {/* GALLERY */}
        <div className="gallery-section">
          <div className="gallery-header">
            <div className="tabs">
              <button
                className={`tab ${view === 'ALL' ? 'active' : ''}`}
                onClick={() => toggleView('ALL')}>
                GLOBAL REGISTRY
              </button>
              <button
                className={`tab ${view === 'MINE' ? 'active' : ''}`}
                onClick={() => toggleView('MINE')}>
                MY PORTFOLIO
              </button>
            </div>
            <span className="count">{properties.length} ASSETS FOUND</span>
          </div>

          <div className="grid">
            {properties.map((item) => {
              const owner = item.owner || "";
              const creator = item.creator || "";
              const txHash = item.txHash || "";

              const isHeld = owner.toLowerCase() === (account ? account.toLowerCase() : "");
              const isTransferred = (view === 'MINE' && creator.toLowerCase() === (account ? account.toLowerCase() : "") && !isHeld);

              return (
                <div key={item.id} className={`prop-card ${isTransferred ? 'transferred' : ''}`}>
                  <div className="prop-header">
                    <div className="prop-id">{item.propertyId || "Unknown ID"}</div>
                    {isTransferred ? (
                      <span className="status-badge moved">TRANSFERRED</span>
                    ) : (
                      <span className="status-badge held">HELD</span>
                    )}
                  </div>

                  <div className="prop-meta">
                    <div className="meta-row">
                      <span>{isTransferred ? "TRANSFERRED TO" : "CURRENT OWNER"}</span>
                      <span className="mono" title={owner}>
                        {owner.length > 10 ? `${owner.substring(0, 6)}...${owner.substring(38)}` : "Unknown"}
                      </span>
                    </div>

                    {isTransferred && (
                      <div className="meta-row dim">
                        <span>CREATOR (YOU)</span>
                        <span className="mono">
                          {creator.length > 10 ? `${creator.substring(0, 6)}...` : ""}
                        </span>
                      </div>
                    )}

                    <div className="meta-row">
                      <span>TX PROOF</span>
                      <span className="mono" title={txHash}>
                        {txHash.length > 10 ? `${txHash.substring(0, 8)}...` : "Pending..."}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;