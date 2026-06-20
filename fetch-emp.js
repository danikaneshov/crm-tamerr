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
  const q = query(collection(db, 'employees'));
  const snap = await getDocs(q);
  const emps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(JSON.stringify(emps, null, 2));
  process.exit(0);
}
run();
