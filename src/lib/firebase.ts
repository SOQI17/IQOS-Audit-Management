import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { AuditSectionConfig, SavedAudit } from "../types";
import { defaultSections } from "../data";

const firebaseConfig = {
  apiKey: "AIzaSyBXs-_1WfL5fXbqBTj60U_TeeK60BJO-W4",
  authDomain: "qaudit-7a5e1.firebaseapp.com",
  projectId: "qaudit-7a5e1",
  storageBucket: "qaudit-7a5e1.firebasestorage.app",
  messagingSenderId: "751678779697",
  appId: "1:751678779697:web:087ced51f973625fd8c010"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const loginAnonymously = async () => {
  try {
    await signInAnonymously(auth);
  } catch (error) {
    console.error("Error signing in anonymously", error);
  }
};

export const saveAuditToCloud = async (auditData: any, finalScore: number) => {
  try {
    const docRef = await addDoc(collection(db, "audits"), {
      ...auditData,
      finalScore,
      timestamp: Date.now()
    });
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
    return null;
  }
};

export const loadAuditsFromCloud = async (): Promise<SavedAudit[]> => {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000));
    const querySnapshot = await Promise.race([
      getDocs(collection(db, "audits")),
      timeoutPromise
    ]);
    const audits: SavedAudit[] = [];
    querySnapshot.forEach((doc) => {
      audits.push({ id: doc.id, ...doc.data() } as SavedAudit);
    });
    return audits.sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    console.warn("Could not load audits from cloud (offline or error). Returning empty list.");
    return [];
  }
};

export const saveConfigToCloud = async (config: AuditSectionConfig[]) => {
  try {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000));
    await Promise.race([
      setDoc(doc(db, "settings", "checklistConfig"), { sections: config }),
      timeoutPromise
    ]);
  } catch (e) {
    console.error("Error saving config: ", e);
  }
};

export const loadConfigFromCloud = async (): Promise<AuditSectionConfig[]> => {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000));
    const docSnap = await Promise.race([
      getDoc(doc(db, "settings", "checklistConfig")),
      timeoutPromise
    ]);
    if (docSnap.exists()) {
      return docSnap.data().sections;
    } else {
      // If no config exists, save default and return
      await saveConfigToCloud(defaultSections);
      return defaultSections;
    }
  } catch (e) {
    console.warn("Could not load config from cloud (offline or error). Using defaults.");
    return defaultSections;
  }
};
