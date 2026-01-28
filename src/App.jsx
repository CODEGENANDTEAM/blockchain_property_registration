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

  useEffect(() => {
    const init = async () => {
      try {
        const _web3 = getWeb3();
        const instance = getContract(_web3);

        // Auto-detect Ganache Account
        const accounts = await _web3.eth.getAccounts();
        const currentAccount = accounts[0];
        const bal = await _web3.eth.getBalance(currentAccount);

        setWeb3(_web3);
        setContract(instance);
        setAccount(currentAccount);
        setBalance(_web3.utils.fromWei(bal, 'ether'));

        // Load initial data
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
        // Query: "Show me everything I CREATED"
        // Note: You might need to create a Firestore Index for this to work perfectly
        q = query(
          collection(db, "properties"),
          where("creator", "==", currentAccount)
        );
      } else {
        // Query: "Show me everything recently added"
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

  // Switch between "All Properties" and "My Portfolio"
  const toggleView = (mode) => {
    setView(mode);
    fetchProperties(mode, account);
  }

  // --- ACTIONS ---

  const handleRegister = async () => {
    if (!contract || !propId) return alert("Input required");
    setLoading(true);

    try {
      // 1. Blockchain Write
      const receipt = await contract.methods.registerProperty(propId).send({
        from: account,
        gas: 3000000
      });

      // 2. Firebase Write (We track CREATOR separately now)
      await addDoc(collection(db, "properties"), {
        propertyId: propId,
        creator: account, // ORIGINAL OWNER (You)
        owner: account,   // CURRENT OWNER (You)
        txHash: receipt.transactionHash,
        timestamp: new Date()
      });

      alert("Success: Property Registered");
      setPropId('');
      fetchProperties(view, account);
    } catch (error) {
      alert("Error: " + error.message);
    }
    setLoading(false);
  };

  const handleTransfer = async () => {
    const { id, newOwner } = transferData;
    if (!contract || !id || !newOwner) return alert("All fields required");
    setLoading(true);

    try {
      const receipt = await contract.methods.transferProperty(id, newOwner).send({
        from: account,
        gas: 3000000
      });

      // Update Owner in DB
      const q = query(collection(db, "properties"), where("propertyId", "==", id));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, {
          owner: newOwner, // Update ONLY the current owner
          txHash: receipt.transactionHash
        });
      }

      alert("Success: Transferred to " + newOwner);
      setTransferData({ id: '', newOwner: '' });
      fetchProperties(view, account);
    } catch (error) {
      console.error(error);
      alert("Transfer Failed: " + error.message);
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

        {/* FORMS GRID */}
        <div className="actions-grid">
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
              <button onClick={handleTransfer} disabled={loading} className="btn-dark">
                {loading ? "SIGNING..." : "TRANSFER"}
              </button>
            </div>
          </section>
        </div>

        {/* GALLERY CONTROLS */}
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

          {/* ... inside the grid div ... */}
          <div className="grid">
            {properties.map((item) => {
              // Safety: Default to empty string if data is missing to prevent crashes
              const owner = item.owner || "";
              const creator = item.creator || "";
              const txHash = item.txHash || "";

              // Logic: Is this property currently held by the current user?
              // (We also check if account exists to avoid errors on load)
              const isHeld = owner.toLowerCase() === (account ? account.toLowerCase() : "");

              // Logic: Did the current user create this but then transfer it?
              // (Only relevant for 'MINE' view)
              const isTransferred = (view === 'MINE' && creator.toLowerCase() === (account ? account.toLowerCase() : "") && !isHeld);

              return (
                <div key={item.id} className={`prop-card ${isTransferred ? 'transferred' : ''}`}>
                  <div className="prop-header">
                    <div className="prop-id">{item.propertyId || "Unknown ID"}</div>

                    {/* Status Badge Logic */}
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
                        {/* SAFE SUBSTRING CHECK */}
                        {owner.length > 10
                          ? `${owner.substring(0, 6)}...${owner.substring(38)}`
                          : "Unknown"}
                      </span>
                    </div>

                    {/* Only show creator row if it's a transferred asset in portfolio view */}
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
                        {/* SAFE SUBSTRING CHECK */}
                        {txHash.length > 10
                          ? `${txHash.substring(0, 8)}...`
                          : "Pending..."}
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