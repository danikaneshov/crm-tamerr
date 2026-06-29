const fs = require('fs');
const sales = JSON.parse(fs.readFileSync('sales_dump.json'));

sales.forEach(s => {
  if (s.status !== 'closed') return;
  
  const c1 = s.items?.cocktail1 || 0;
  const c2 = s.items?.cocktail2 || 0;
  const currentTotal = c1 + c2;

  // Find exact expected total from money
  let expectedTotal = 0;
  if (s.hookahPercentage > 0) {
    expectedTotal = Math.round(s.hookahPercentage / 1500); // We assume everyone has 1500 rate
  } else {
    return; // Can't restore automatically if no percentage
  }

  if (expectedTotal > 0 && expectedTotal !== currentTotal) {
    console.log(`[${s.dateStr}] ${s.employeeName}: Has ${currentTotal} (${c1}+${c2}), Expected ${expectedTotal} (Earned ${s.hookahPercentage}). ShiftFraction: ${s.shiftFraction}`);
  }
});
