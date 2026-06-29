const fs = require('fs');
const sales = JSON.parse(fs.readFileSync('sales_dump.json'));

let count = 0;
sales.forEach(s => {
  if (s.status !== 'closed') return;
  const c1 = s.items?.cocktail1 || 0;
  const c2 = s.items?.cocktail2 || 0;
  if ((c1 > 0 || c2 > 0) && (!s.hookahPercentage || s.hookahPercentage === 0)) {
    console.log(`[${s.dateStr}] ${s.employeeName} has ${c1+c2} hookahs but 0 earned. ShiftFraction: ${s.shiftFraction}`);
    count++;
  }
});
console.log('Total zero percentage shifts: ', count);
