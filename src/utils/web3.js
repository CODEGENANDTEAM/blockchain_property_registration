
import Web3 from 'web3';
import LandRegistryABI from '../LandRegistryABI.json';

// 1. Force connection to Ganache (Direct HTTP Provider)
// This bypasses MetaMask to avoid "User Denied" errors during dev.
const web3 = new Web3("http://127.0.0.1:7545");

// 2. PASTE YOUR NEW CONTRACT ADDRESS HERE
// (Copy this from Remix "Deployed Contracts" section after deploying with Compiler 0.8.19)
const CONTRACT_ADDRESS = "0x499b6bfbc31e63C42EB477E9a883bAE2242a8B71";

const getWeb3 = () => {
  return web3;
};

const getContract = (web3Instance) => {
  const w3 = web3Instance || web3;
  return new w3.eth.Contract(LandRegistryABI, CONTRACT_ADDRESS);
};

export { getWeb3, getContract };