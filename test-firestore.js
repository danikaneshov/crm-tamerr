import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy } from "firebase/firestore";

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
  const q = query(collection(db, 'inventory_movements'));
  const snap = await getDocs(q);
  console.log("Total inventory movements:", snap.size);
  const movs = snap.docs.map(d => d.data());
  const minDate = movs.reduce((min, m) => m.dateStr < min ? m.dateStr : min, "99.99.9999");
  console.log("Oldest dateStr:", minDate);
  const typeIn = movs.filter(m => m.type === 'in');
  console.log("Total IN movements:", typeIn.length);
  const minDateIn = typeIn.reduce((min, m) => m.dateStr < min ? m.dateStr : min, "99.99.9999");
  console.log("Oldest IN dateStr:", minDateIn);
  process.exit(0);
}
run();
