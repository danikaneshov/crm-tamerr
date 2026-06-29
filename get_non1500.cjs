const fs = require('fs');
const sales = JSON.parse(fs.readFileSync('sales_dump.json'));

let count = 0;
sales.forEach(s => {
  if (s.status !== 'closed') return;
  if (s.hookahPercentage > 0 && s.hookahPercentage % 1500 !== 0) {
    console.log(`[${s.dateStr}] ${s.employeeName} has hookahPercentage ${s.hookahPercentage}.`);
    count++;
  }
});
console.log('Total non-1500 shifts: ', count);
