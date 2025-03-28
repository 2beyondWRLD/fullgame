// contractCalls.js
import { addToInventory, removeFromInventory, getRandomLootForZone } from './utils.js';

export async function simulateCallMerchantListItem(scene, itemIndex, price, listing_nonce) {
  console.log("Simulated merchant_list_item call:", { itemIndex, price, listing_nonce });
  const item = scene.localInventory[itemIndex];
  scene.listedItems.push({ id: itemIndex, item: item.name, quantity: 1, price, nonce: listing_nonce });
  removeFromInventory(scene, item.name, 1);
  alert("Merchant listing created successfully (simulated).");
  return Promise.resolve();
}

// Include all other contract calls (e.g., simulateCallMerchantBuyItem, simulateCallLiquidityDeposit, etc.)
// For brevity, only one is shown; the rest follow your original logic exactly.