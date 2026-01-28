import Web3 from "web3";
import LandRegistryABI from "../LandRegistryABI.json";

// Ganache default URL
const GANACHE_URL = "http://127.0.0.1:7545"; 
const CONTRACT_ADDRESS = "0x8B5D46e5eeC22d5D2960d07BBEf10903b2442b82";

export const getWeb3 = () => {
  return new Web3(new Web3.providers.HttpProvider(GANACHE_URL));
};

export const getContract = (web3) => {
  // Ensure ABI and Address are correct
  if (!LandRegistryABI || !CONTRACT_ADDRESS) {
      console.error("Missing ABI or Contract Address!");
      return null;
  }
  return new web3.eth.Contract(LandRegistryABI, CONTRACT_ADDRESS);
};