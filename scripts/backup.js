import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from 'fs';

// Конфиг Firebase (публичный)
const firebaseConfig = {
  apiKey: "AIzaSyCUQ6IZ-eoAG8qCq5yoRklIl34kVUNCq2U",
  authDomain: "crm-fifty.firebaseapp.com",
  projectId: "crm-fifty",
  storageBucket: "crm-fifty.firebasestorage.app",
  messagingSenderId: "37266175294",
  appId: "1:37266175294:web:42118a3130c5b3e88de86f"
};

// Инициализация
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runBackup() {
  console.log('Starting Firebase backup...');
  
  const collections = ['sales', 'employees', 'inventory', 'settings', 'expenses'];
  const backupData = {};
  let totalDocs = 0;
  
  for (const colName of collections) {
    try {
      console.log(`Fetching collection: ${colName}...`);
      const snapshot = await getDocs(collection(db, colName));
      backupData[colName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`- Got ${snapshot.docs.length} documents.`);
      totalDocs += snapshot.docs.length;
    } catch (err) {
      console.error(`Error fetching collection ${colName}:`, err.message);
    }
  }
  
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `backup-${dateStr}.json`;
  
  fs.writeFileSync(filename, JSON.stringify(backupData, null, 2));
  
  console.log(`\n✅ Backup successfully created!`);
  console.log(`- File: ${filename}`);
  console.log(`- Total Collections: ${collections.length}`);
  console.log(`- Total Documents: ${totalDocs}`);
  
  process.exit(0);
}

runBackup().catch(err => {
  console.error("Critical Backup Error:", err);
  process.exit(1);
});
