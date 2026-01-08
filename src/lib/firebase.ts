
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, writeBatch, query, where, Timestamp, updateDoc, orderBy } from "firebase/firestore";
import { logger, withLogging } from '@/lib/logger';
import type { Expense, Income } from '@/lib/types';
import { startOfMonth, endOfMonth } from 'date-fns';

// Get environment variables - these are replaced at build time by Next.js
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Validate that all required config values are present
const requiredConfigKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'] as const;
for (const key of requiredConfigKeys) {
  if (!firebaseConfig[key]) {
    throw new Error(`Missing required Firebase configuration: ${key}. Please check your environment variables.`);
  }
}

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);
const auth = getAuth(app);

export const PROFILES_COLLECTION = "profiles";
const EXPENSES_SUBCOLLECTION = "expenses";
const INCOMES_SUBCOLLECTION = "incomes";

const getExpensesCollectionPath = (profileId: string) => collection(db, PROFILES_COLLECTION, profileId, EXPENSES_SUBCOLLECTION);
const getIncomesCollectionPath = (profileId: string) => collection(db, PROFILES_COLLECTION, profileId, INCOMES_SUBCOLLECTION);

export const getExpenses = async (profileId: string, year?: number, month?: number): Promise<Expense[]> => {
  if (!profileId) {
    logger.warn("getExpenses called without profileId. Returning empty array.");
    return [];
  }

  return withLogging(
    `getExpenses for profile ${profileId}`,
    async () => {
      const expensesCollectionRef = getExpensesCollectionPath(profileId);
      let q;

      if (year !== undefined && month !== undefined) {
        if (typeof year !== 'number' || typeof month !== 'number' || !Number.isFinite(year) || !Number.isFinite(month)) {
          logger.error("Invalid year or month provided to getExpenses (must be finite numbers)", undefined, { year, month });
          return [];
        }
        const dateForMonth = new Date(year, month, 1);
        if (isNaN(dateForMonth.getTime())) {
          logger.error("Constructed invalid date in getExpenses", undefined, { year, month });
          return [];
        }
        const startDate = startOfMonth(dateForMonth);
        const endDate = endOfMonth(dateForMonth);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          logger.error("Invalid startDate or endDate in getExpenses", undefined, { year, month, startDate, endDate });
          return [];
        }
        q = query(expensesCollectionRef,
          where("date", ">=", Timestamp.fromDate(startDate)),
          where("date", "<=", Timestamp.fromDate(endDate)),
          orderBy("date", "desc")
        );
      } else {
        q = query(expensesCollectionRef, orderBy("date", "desc"));
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, date: (doc.data().date as Timestamp).toDate(), profileId: doc.data().profileId } as Expense));
    },
    { year, month }
  );
};

export const addExpenseFS = async (profileId: string, expenseData: Omit<Expense, 'id'>): Promise<string> => {
  if (!profileId) {
    throw new Error("addExpenseFS called without profileId");
  }
  const expensesCollectionRef = getExpensesCollectionPath(profileId);
  const dataToSave = {
    ...expenseData,
    date: Timestamp.fromDate(expenseData.date),
    profileId: expenseData.profileId,
  };
  const docRef = await addDoc(expensesCollectionRef, dataToSave);
  return docRef.id;
};

export const updateExpenseFS = async (originalProfileId: string, expenseId: string, expenseData: Partial<Omit<Expense, 'id' | 'date'>> & { date?: Date, profileId?: string }): Promise<void> => {
  if (!originalProfileId || !expenseId) {
    throw new Error("updateExpenseFS called without originalProfileId or expenseId");
  }
  const expenseRef = doc(db, PROFILES_COLLECTION, originalProfileId, EXPENSES_SUBCOLLECTION, expenseId);
  const dataToUpdate: { [key: string]: any } = { ...expenseData };
  if (expenseData.date) {
    dataToUpdate.date = Timestamp.fromDate(expenseData.date);
  }
  await updateDoc(expenseRef, dataToUpdate);
};

export const deleteExpenseFS = async (profileId: string, expenseId: string): Promise<void> => {
  if (!profileId || !expenseId) {
    throw new Error("deleteExpenseFS called without profileId or expenseId");
  }
  const expenseRef = doc(db, PROFILES_COLLECTION, profileId, EXPENSES_SUBCOLLECTION, expenseId);
  await deleteDoc(expenseRef);
};

export const getIncomes = async (profileId: string, year?: number, month?: number): Promise<Income[]> => {
  if (!profileId) {
    logger.warn("getIncomes called without profileId. Returning empty array.");
    return [];
  }
  const incomesCollectionRef = getIncomesCollectionPath(profileId);
  let q;
  if (year !== undefined && month !== undefined) {
    if (typeof year !== 'number' || typeof month !== 'number' || !Number.isFinite(year) || !Number.isFinite(month)) {
      logger.error("Invalid year or month provided to getIncomes (must be finite numbers)", undefined, { year, month });
      return [];
    }
    const dateForMonth = new Date(year, month, 1);
    if (isNaN(dateForMonth.getTime())) {
      logger.error("Constructed invalid date in getIncomes", undefined, { year, month });
      return [];
    }
    const startDate = startOfMonth(dateForMonth);
    const endDate = endOfMonth(dateForMonth);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      logger.error("Invalid startDate or endDate in getIncomes", undefined, { year, month, startDate, endDate });
      return [];
    }
    q = query(incomesCollectionRef,
      where("date", ">=", Timestamp.fromDate(startDate)),
      where("date", "<=", Timestamp.fromDate(endDate)),
      orderBy("date", "desc") // Sort by date descending
    );
  } else {
    q = query(incomesCollectionRef, orderBy("date", "desc")); // Sort by date descending
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, date: (doc.data().date as Timestamp).toDate(), profileId: doc.data().profileId } as Income));
};

export const addIncomeFS = async (profileId: string, incomeData: Omit<Income, 'id'>): Promise<string> => {
  if (!profileId) {
    throw new Error("addIncomeFS called without profileId");
  }
  const incomesCollectionRef = getIncomesCollectionPath(profileId);
  const docRef = await addDoc(incomesCollectionRef, {
    ...incomeData,
    profileId: incomeData.profileId,
    date: Timestamp.fromDate(incomeData.date)
  });
  return docRef.id;
};

export const updateIncomeFS = async (profileId: string, incomeId: string, incomeData: Partial<Omit<Income, 'id' | 'date' | 'profileId'>> & { date?: Date }): Promise<void> => {
  if (!profileId || !incomeId) {
    throw new Error("updateIncomeFS called without profileId or incomeId");
  }
  const incomeRef = doc(db, PROFILES_COLLECTION, profileId, INCOMES_SUBCOLLECTION, incomeId);
  // Create a mutable copy for modifications
  const dataToUpdate: { [key: string]: any } = { ...incomeData };

  // Convert Date to Firestore Timestamp if present
  if (incomeData.date) {
    dataToUpdate.date = Timestamp.fromDate(incomeData.date);
  }

  // Ensure profileId is not part of the update payload for this function
  // as profileId is part of the document path and shouldn't be changed here.
  // The 'profileId' property was already omitted from the type of incomeData.
  // delete dataToUpdate.profileId; // This line is not strictly necessary due to type Omit

  await updateDoc(incomeRef, dataToUpdate);
};

export const deleteIncomeFS = async (profileId: string, incomeId: string): Promise<void> => {
  if (!profileId || !incomeId) {
    throw new Error("deleteIncomeFS called without profileId or incomeId");
  }
  const incomeRef = doc(db, PROFILES_COLLECTION, profileId, INCOMES_SUBCOLLECTION, incomeId);
  await deleteDoc(incomeRef);
};

export const clearAllDataFS = async (profileId: string): Promise<void> => {
  if (!profileId) {
    throw new Error("clearAllDataFS called without profileId");
  }

  return withLogging(
    `clearAllDataFS for profile ${profileId}`,
    async () => {
      logger.info(`Attempting to clear manually logged data for profileId: ${profileId}`);
      const batch = writeBatch(db);

      const expensesCollectionRef = getExpensesCollectionPath(profileId);
      const expensesSnapshot = await getDocs(query(expensesCollectionRef));
      logger.info(`Found ${expensesSnapshot.docs.length} expense documents to delete for profile ${profileId}`);
      expensesSnapshot.forEach(doc => batch.delete(doc.ref));

      const incomesCollectionRef = getIncomesCollectionPath(profileId);
      const incomesSnapshot = await getDocs(query(incomesCollectionRef));
      logger.info(`Found ${incomesSnapshot.docs.length} income documents to delete for profile ${profileId}`);
      incomesSnapshot.forEach(doc => batch.delete(doc.ref));

      if (expensesSnapshot.docs.length === 0 && incomesSnapshot.docs.length === 0) {
        logger.info(`No manual expenses or incomes found in Firestore to delete for profile ${profileId}. Recurring salaries are not stored in Firestore and won't be cleared by this function.`);
      }

      await batch.commit();
      logger.info(`Batch commit successful for clearing data of profile ${profileId}`);
    },
    { profileId }
  );
};



export { db, auth };


