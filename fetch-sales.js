import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCUQ6IZ-eoAG8qCq5yoRklIl34kVUNCq2U",
  authDomain: "crm-fifty.firebaseapp.com",
  projectId: "crm-fifty",
  storageBucket: "crm-fifty.firebasestorage.app",
  messagingSenderId: "37266175294",
  appId: "1:37266175294:web:42118a3130c5b3e88de86f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const q = query(collection(db, 'sales'));
  const snap = await getDocs(q);
  console.log("Total sales:", snap.size);
  const sales = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // check for exact duplicates (same date, same employee)
  const map = {};
  let duplicates = 0;
  sales.forEach(s => {
    const key = s.dateStr + '__' + s.employeeId;
    if (map[key]) {
      console.log("Duplicate found:", key, s.id, map[key].id);
      duplicates++;
    } else {
      map[key] = s;
    }
  });
  console.log("Total duplicates by date+employee:", duplicates);
  
  // Print latest 5
  sales.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  console.log("Latest 5 sales:", JSON.stringify(sales.slice(0, 5), null, 2));
  process.exit(0);
}
run();
