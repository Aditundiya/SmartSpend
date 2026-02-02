// Offline storage using IndexedDB for PWA functionality
import type { Expense, Income } from '@/lib/types';

const DB_NAME = 'SpentraDB';
const DB_VERSION = 1;
const EXPENSES_STORE = 'offline_expenses';
const INCOMES_STORE = 'offline_incomes';
const SYNC_QUEUE_STORE = 'sync_queue';

interface OfflineExpense extends Omit<Expense, 'id'> {
  tempId: string;
  timestamp: number;
  synced: boolean;
}

interface OfflineIncome extends Omit<Income, 'id'> {
  tempId: string;
  timestamp: number;
  synced: boolean;
}

interface SyncQueueItem {
  id: string;
  type: 'expense' | 'income';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create offline expenses store
        if (!db.objectStoreNames.contains(EXPENSES_STORE)) {
          const expenseStore = db.createObjectStore(EXPENSES_STORE, { keyPath: 'tempId' });
          expenseStore.createIndex('profileId', 'profileId', { unique: false });
          expenseStore.createIndex('timestamp', 'timestamp', { unique: false });
          expenseStore.createIndex('synced', 'synced', { unique: false });
        }

        // Create offline incomes store
        if (!db.objectStoreNames.contains(INCOMES_STORE)) {
          const incomeStore = db.createObjectStore(INCOMES_STORE, { keyPath: 'tempId' });
          incomeStore.createIndex('profileId', 'profileId', { unique: false });
          incomeStore.createIndex('timestamp', 'timestamp', { unique: false });
          incomeStore.createIndex('synced', 'synced', { unique: false });
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
          const syncStore = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id' });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        console.log('IndexedDB stores created');
      };
    });
  }

  // Expense operations
  async addOfflineExpense(expense: Omit<Expense, 'id'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const tempId = `temp_expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const offlineExpense: OfflineExpense = {
      ...expense,
      tempId,
      timestamp: Date.now(),
      synced: false,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([EXPENSES_STORE], 'readwrite');
      const store = transaction.objectStore(EXPENSES_STORE);
      const request = store.add(offlineExpense);

      request.onsuccess = () => {
        console.log('Offline expense added:', tempId);
        this.addToSyncQueue('expense', 'create', offlineExpense);
        resolve(tempId);
      };

      request.onerror = () => {
        console.error('Failed to add offline expense');
        reject(request.error);
      };
    });
  }

  async getOfflineExpenses(profileId: string): Promise<OfflineExpense[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([EXPENSES_STORE], 'readonly');
      const store = transaction.objectStore(EXPENSES_STORE);
      const index = store.index('profileId');
      const request = index.getAll(profileId);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error('Failed to get offline expenses');
        reject(request.error);
      };
    });
  }

  async getUnsyncedExpenses(): Promise<OfflineExpense[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([EXPENSES_STORE], 'readonly');
      const store = transaction.objectStore(EXPENSES_STORE);
      const index = store.index('synced');
      const request = index.getAll(IDBKeyRange.only(0));

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error('Failed to get unsynced expenses');
        reject(request.error);
      };
    });
  }

  // Income operations
  async addOfflineIncome(income: Omit<Income, 'id'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const tempId = `temp_income_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const offlineIncome: OfflineIncome = {
      ...income,
      tempId,
      timestamp: Date.now(),
      synced: false,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([INCOMES_STORE], 'readwrite');
      const store = transaction.objectStore(INCOMES_STORE);
      const request = store.add(offlineIncome);

      request.onsuccess = () => {
        console.log('Offline income added:', tempId);
        this.addToSyncQueue('income', 'create', offlineIncome);
        resolve(tempId);
      };

      request.onerror = () => {
        console.error('Failed to add offline income');
        reject(request.error);
      };
    });
  }

  async getOfflineIncomes(profileId: string): Promise<OfflineIncome[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([INCOMES_STORE], 'readonly');
      const store = transaction.objectStore(INCOMES_STORE);
      const index = store.index('profileId');
      const request = index.getAll(profileId);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error('Failed to get offline incomes');
        reject(request.error);
      };
    });
  }

  async getUnsyncedIncomes(): Promise<OfflineIncome[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([INCOMES_STORE], 'readonly');
      const store = transaction.objectStore(INCOMES_STORE);
      const index = store.index('synced');
      const request = index.getAll(IDBKeyRange.only(0));

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error('Failed to get unsynced incomes');
        reject(request.error);
      };
    });
  }

  // Sync queue operations
  private async addToSyncQueue(type: 'expense' | 'income', action: 'create' | 'update' | 'delete', data: any): Promise<void> {
    if (!this.db) return;

    const queueItem: SyncQueueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      action,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SYNC_QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(SYNC_QUEUE_STORE);
      const request = store.add(queueItem);

      request.onsuccess = () => {
        console.log('Added to sync queue:', queueItem.id);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to add to sync queue');
        reject(request.error);
      };
    });
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SYNC_QUEUE_STORE], 'readonly');
      const store = transaction.objectStore(SYNC_QUEUE_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error('Failed to get sync queue');
        reject(request.error);
      };
    });
  }

  async markAsSynced(tempId: string, type: 'expense' | 'income'): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const storeName = type === 'expense' ? EXPENSES_STORE : INCOMES_STORE;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const getRequest = store.get(tempId);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.synced = true;
          const updateRequest = store.put(item);

          updateRequest.onsuccess = () => {
            console.log(`Marked ${type} as synced:`, tempId);
            resolve();
          };

          updateRequest.onerror = () => {
            reject(updateRequest.error);
          };
        } else {
          resolve(); // Item not found, consider it synced
        }
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  async clearSyncedItems(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const promises = [
      this.clearSyncedFromStore(EXPENSES_STORE),
      this.clearSyncedFromStore(INCOMES_STORE),
    ];

    await Promise.all(promises);
  }

  private async clearSyncedFromStore(storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const index = store.index('synced');
      const request = index.openCursor(IDBKeyRange.only(true));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

// Singleton instance
export const offlineStorage = new OfflineStorage();

// Initialize offline storage
export async function initOfflineStorage(): Promise<void> {
  try {
    await offlineStorage.init();
    console.log('✅ Offline storage initialized');
  } catch (error) {
    console.error('❌ Failed to initialize offline storage:', error);
  }
}

// Check if we're online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Network status helpers
export function onOnline(callback: () => void): void {
  window.addEventListener('online', callback);
}

export function onOffline(callback: () => void): void {
  window.addEventListener('offline', callback);
}