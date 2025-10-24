import { db } from './FirebaseService';
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { FIREBASE_COLLECTIONS } from '../config/hardware.config';

class CropDataService {
  async addHarvestRecord(harvestData) {
    try {
      const harvestsRef = collection(db, FIREBASE_COLLECTIONS.HARVEST_DATA);
      const newRecord = {
        ...harvestData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };
      const docRef = await addDoc(harvestsRef, newRecord);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding harvest record:', error);
      return { success: false, error: error.message };
    }
  }

  async getHarvestHistory(limitCount = 50) {
    try {
      const harvestsRef = collection(db, FIREBASE_COLLECTIONS.HARVEST_DATA);
      const q = query(harvestsRef, orderBy('planted_date', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting harvest history:', error);
      return [];
    }
  }

  async addRainfallLog(rainfallData) {
    try {
      const rainfallRef = collection(db, FIREBASE_COLLECTIONS.RAINFALL_LOG);
      const newLog = {
        ...rainfallData,
        created_at: serverTimestamp()
      };
      const docRef = await addDoc(rainfallRef, newLog);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding rainfall log:', error);
      return { success: false, error: error.message };
    }
  }

  async getRainfallLogs(days = 30) {
    try {
      const rainfallRef = collection(db, FIREBASE_COLLECTIONS.RAINFALL_LOG);
      const q = query(rainfallRef, orderBy('date', 'desc'), limit(days));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting rainfall logs:', error);
      return [];
    }
  }
}

export default new CropDataService();
