const fs = require('fs');
const sales = JSON.parse(fs.readFileSync('sales_dump.json'));

let corruptedCount = 0;
let partnerCorruptedCount = 0;

sales.forEach(s => {
  if (s.status !== 'closed') return;
  
  const c1 = s.items?.cocktail1 || 0;
  const c2 = s.items?.cocktail2 || 0;
  const currentTotal = c1 + c2;
  
  let expectedTotal = 0;
  if (s.hookahPercentage > 0) {
    // We assume 1500 is the rate for most. Let's see if hookahPercentage is a multiple of totalItems.
    // If not, it means currentTotal is wrong.
    if (currentTotal > 0 && s.hookahPercentage % currentTotal !== 0) {
      // Something is wrong, or the rate is weird.
    }
  }

  // A better way: The migration script divided hookahs.
  // If it was an independent shift (shiftFraction: 1 or no partnerId)
  // AND it was divided by mistake, we can find its twin.
  const isActuallyShared = s.shiftFraction === 0.5 || s.isPartnerRecord || s.partnerId;

  if (!isActuallyShared) {
    // If it's an independent shift, but got divided, its current c1 is exactly ceil or floor of original.
    // And its hookahPercentage / 1500 gives the original!
    const originalTotal = Math.round(s.hookahPercentage / 1500);
    if (originalTotal > 0 && originalTotal !== currentTotal) {
      corruptedCount++;
      // console.log(`Independent shift ${s.id} corrupted: has ${currentTotal}, expected ${originalTotal}`);
    }
  } else {
    // It IS a shared shift. Did it get divided TWICE?
    // In May, maybe it was ALREADY divided manually in Admin?
    // If it was already divided in Admin, my script divided it again.
    // How to know if it was divided again?
    // Its expected total is hookahPercentage / 1500.
    const originalTotal = Math.round(s.hookahPercentage / 1500);
    if (originalTotal > 0 && originalTotal !== currentTotal) {
      partnerCorruptedCount++;
      // console.log(`Shared shift ${s.id} corrupted: has ${currentTotal}, expected ${originalTotal}`);
    }
  }
});

console.log(`Found ${corruptedCount} corrupted independent shifts and ${partnerCorruptedCount} corrupted shared shifts.`);
