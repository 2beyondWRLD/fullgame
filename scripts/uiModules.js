// uiModules.js
import { SCREEN_STATES } from './constants.js';
import { clearButtons, createScrollableMenu, hideDialog, showDialog, showModalOverlay, hideModalOverlay } from './narrative.js';
import { simulateCallMerchantListItem } from './contractCalls.js';

export function showMerchantQuarterOptions(scene) {
  scene.narrativeScreen = SCREEN_STATES.MERCHANT;
  showModalOverlay(scene);
  const options = [
    { label: "List Item for Sale", callback: () => { clearButtons(scene); showListItemScreen(scene); } },
    { label: "Browse Marketplace", callback: () => { clearButtons(scene); showBrowseMarketplaceScreen(scene); } },
    { label: "View My Listed Items", callback: () => { clearButtons(scene); showMyListingsScreen(scene); } },
    { label: "Back", callback: () => { clearButtons(scene); hideDialog(scene); hideModalOverlay(scene); scene.narrativeScreen = SCREEN_STATES.NONE; } }
  ];
  createScrollableMenu(scene, "Merchant Quarter Options:\nSelect an option:", options);
}

function showListItemScreen(scene) {
  const resources = scene.localInventory;
  if (!resources || resources.length === 0) {
    alert("No items available to list.");
    showMerchantQuarterOptions(scene);
    return;
  }
  clearButtons(scene);
  const options = resources.map((item, index) => ({
    label: `${item.name} x${item.quantity}`,
    callback: () => { clearButtons(scene); promptListItemDetails(scene, item, index); }
  }));
  options.push({ label: "Back", callback: () => { clearButtons(scene); showMerchantQuarterOptions(scene); } });
  createScrollableMenu(scene, "Select an item to list for sale:", options);
}

function promptListItemDetails(scene, item, index) {
  clearButtons(scene);
  hideDialog(scene);
  let priceStr = prompt(`Enter sale price for ${item.name}:`, "1000");
  let price = parseInt(priceStr, 10);
  if (isNaN(price)) {
    alert("Invalid price. Returning to item selection.");
    showListItemScreen(scene);
    return;
  }
  let nonce = Date.now() + Math.floor(Math.random() * 1000);
  showDialog(scene, `List ${item.name} for sale at ${price} OROMOZI?\nConfirm listing?`);
  const options = [
    { label: "Yes", callback: async () => { await simulateCallMerchantListItem(scene, index, price, nonce); clearButtons(scene); showMerchantQuarterOptions(scene); } },
    { label: "No", callback: () => { clearButtons(scene); showListItemScreen(scene); } }
  ];
  createButtons(scene, options);
}

// Include all other UI functions (e.g., showLiquidityPoolOptions, showRoyalMarketOptions, etc.)