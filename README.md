#  Decentralized Land Registry System (DApp)

A secure, blockchain-based property registration and transfer system. This application uses **Ethereum Smart Contracts** to prove ownership and **Firebase** to index data for a fast, modern user interface.

##  Features

* **Immutable Registration:** Mint unique property IDs onto the local blockchain.
* **Ownership Transfer:** Securely transfer assets from your wallet to another user.
* **Live Verification:** Verify property ownership directly from the blockchain (bypassing the database).
* **Dual-View Gallery:**
    * **Global Registry:** See all registered assets.
    * **My Portfolio:** Filter assets created or currently owned by you.
* **Real-time Wallet Status:** Live display of current account address and ETH balance.
* **Minimalist UI:** Clean, monochrome aesthetic with responsive design.

##  Tech Stack

* **Frontend:** React.js (Vite/CRA)
* **Blockchain:** Ganache (Local Ethereum Node)
* **Smart Contract:** Solidity (v0.8.19 - Paris EVM)
* **Integration:** Web3.js
* **Indexing/DB:** Firebase Firestore

##  Prerequisites

1.  **Node.js** (v16 or higher)
2.  **Ganache GUI** (Running on port `7545`)
3.  **Firebase Account** (Firestore Database enabled)
4.  **Remix IDE** (For compiling/deploying the contract)

##  Installation & Setup

### 1. Clone & Install
```bash
git clone https://github.com/CODEGENANDTEAM/blockchain_property_registration.git
cd land-registry
npm install
