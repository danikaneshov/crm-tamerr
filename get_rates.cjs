const fs = require('fs');
const { getDocs, collection } = require('firebase/firestore'); // Can't easily use firestore from node without admin SDK.
// But we have sales_dump.json
