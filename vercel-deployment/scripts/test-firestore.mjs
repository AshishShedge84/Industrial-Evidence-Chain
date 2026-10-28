import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAGR50D7O96gMrq4v4-qoDKW_3t7at7JRI",
  authDomain: "electronics-gadget-review-sys.firebaseapp.com",
  projectId: "electronics-gadget-review-sys",
  storageBucket: "electronics-gadget-review-sys.firebasestorage.app",
  messagingSenderId: "50069074898",
  appId: "1:50069074898:web:21532c81852ba39d188e0b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    console.log('Testing Firestore reads across all IEC collections...');
    const usersSnap = await getDocs(collection(db, 'users'));
    console.log(`✓ Users: ${usersSnap.docs.length} found`);
    const assetsSnap = await getDocs(collection(db, 'assets'));
    console.log(`✓ Assets: ${assetsSnap.docs.length} found`);
    const evidenceSnap = await getDocs(collection(db, 'evidence'));
    console.log(`✓ Evidence: ${evidenceSnap.docs.length} found`);
    const proofsSnap = await getDocs(collection(db, 'blockchain_proofs'));
    console.log(`✓ Blockchain Proofs: ${proofsSnap.docs.length} found`);
    const logsSnap = await getDocs(collection(db, 'audit_logs'));
    console.log(`✓ Audit Logs: ${logsSnap.docs.length} found`);
    console.log('\nAll Firestore collections verified successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Firestore test error:', err.message);
    process.exit(1);
  }
}

run();

