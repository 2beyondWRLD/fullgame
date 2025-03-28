// blockchain.js
let walletPublicKey = null;

export async function connectWallet() {
  console.log("Simulated wallet connection successful.");
  walletPublicKey = "SIMULATED_WALLET";
  return Promise.resolve(walletPublicKey);
}

export async function initOnChain(scene) {
  console.log("Simulated on-chain initialization (skipped).");
  return Promise.resolve();
}

export async function depositOnChain(scene) {
  console.log("Simulated deposit on-chain.");
  alert("Deposit simulated successfully.");
  return Promise.resolve();
}

export { walletPublicKey };