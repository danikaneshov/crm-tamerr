const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
app.use(cors());
app.use(express.json({limit: '50mb'}));
app.post('/dump', (req, res) => {
  fs.writeFileSync('sales_dump.json', JSON.stringify(req.body, null, 2));
  console.log("Dumped sales to sales_dump.json");
  res.send('ok');
});
app.listen(3001, () => console.log('Dump server running on 3001'));
