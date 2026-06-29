const fs = require('fs');
const sales = JSON.parse(fs.readFileSync('sales_dump.json'));

const toFix = [];
sales.forEach(s => {
  if (s.status !== 'closed') return;
  const c1 = s.items?.cocktail1 || 0;
  const c2 = s.items?.cocktail2 || 0;
  if ((c1 > 0 || c2 > 0) && (!s.hookahPercentage || s.hookahPercentage === 0)) {
    if (s.shiftFraction === undefined) {
      console.log(`Fixing ${s.dateStr} ${s.employeeName}: ${c1+c2} -> ${(c1+c2)*2}`);
      toFix.push({
        id: s.id,
        c1: c1 * 2,
        c2: c2 * 2
      });
    }
  }
});
console.log(JSON.stringify(toFix));
