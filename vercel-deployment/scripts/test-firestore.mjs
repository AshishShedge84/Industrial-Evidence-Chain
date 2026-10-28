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
    console.log('Testing Firestore read...');
    const snap = await getDocs(collection(db, 'assets'));
    console.log(`Success! Found ${snap.docs.length} assets.`);
  } catch (err) {
    console.error('Firestore test error:', err.message);
  }
}

run();

