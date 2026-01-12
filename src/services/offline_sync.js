/**
 * Offline-First Architecture Service
 * Handles local storage, sync queue, conflict resolution, and background sync
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database schema
const DB_NAME = 'food_waste_db';
const DB_VERSION = 1;

const STORES = {
  SYNC_QUEUE: 'sync_queue',
  LOCAL_DATA: 'local_data',
  CONFLICTS: 'conflicts',
};

/**
 * Initialize IndexedDB for offline storage
 */
export async function initOfflineDB() {
  try {
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Sync Queue Store - for queuing operations when offline
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncQueueStore = db.createObjectStore(STORES.SYNC_QUEUE, {
            keyPath: 'id',
            autoIncrement: true,
          });
          syncQueueStore.createIndex('timestamp', 'timestamp');
          syncQueueStore.createIndex('status', 'status');
          syncQueueStore.createIndex('type', 'type');
        }

        // Local Data Store - for caching data locally
        if (!db.objectStoreNames.contains(STORES.LOCAL_DATA)) {
          const localDataStore = db.createObjectStore(STORES.LOCAL_DATA, {
            keyPath: 'key',
          });
          localDataStore.createIndex('type', 'type');
          localDataStore.createIndex('updated_at', 'updated_at');
        }

        // Conflicts Store - for storing conflict resolution data
        if (!db.objectStoreNames.contains(STORES.CONFLICTS)) {
          const conflictsStore = db.createObjectStore(STORES.CONFLICTS, {
            keyPath: 'id',
            autoIncrement: true,
          });
          conflictsStore.createIndex('timestamp', 'timestamp');
          conflictsStore.createIndex('resolved', 'resolved');
        }
      },
    });

    return db;
  } catch (error) {
    console.error('Error initializing offline DB:', error);
    throw error;
  }
}

/**
 * Sync Queue Manager
 */
export class SyncQueue {
  constructor(db) {
    this.db = db;
  }

  /**
   * Add operation to sync queue
   */
  async enqueue(operation) {
    try {
      const queueItem = {
        type: operation.type, // 'create', 'update', 'delete'
        endpoint: operation.endpoint,
        method: operation.method || 'POST',
        data: operation.data,
        timestamp: new Date().toISOString(),
        status: 'pending',
        retries: 0,
        max_retries: 3,
      };

      const tx = this.db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      await tx.store.add(queueItem);
      await tx.done;

      return queueItem;
    } catch (error) {
      console.error('Error enqueueing operation:', error);
      throw error;
    }
  }

  /**
   * Get pending operations from queue
   */
  async getPending() {
    try {
      const tx = this.db.transaction(STORES.SYNC_QUEUE, 'readonly');
      const index = tx.store.index('status');
      return await index.getAll('pending');
    } catch (error) {
      console.error('Error getting pending operations:', error);
      return [];
    }
  }

  /**
   * Mark operation as completed
   */
  async markCompleted(id) {
    try {
      const tx = this.db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const item = await tx.store.get(id);
      if (item) {
        item.status = 'completed';
        item.completed_at = new Date().toISOString();
        await tx.store.put(item);
      }
      await tx.done;
    } catch (error) {
      console.error('Error marking operation as completed:', error);
    }
  }

  /**
   * Mark operation as failed
   */
  async markFailed(id, error) {
    try {
      const tx = this.db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const item = await tx.store.get(id);
      if (item) {
        item.retries += 1;
        if (item.retries >= item.max_retries) {
          item.status = 'failed';
        } else {
          item.status = 'pending'; // Retry
        }
        item.last_error = error.message;
        item.last_attempt = new Date().toISOString();
        await tx.store.put(item);
      }
      await tx.done;
    } catch (error) {
      console.error('Error marking operation as failed:', error);
    }
  }

  /**
   * Remove completed operations (cleanup)
   */
  async cleanupCompleted() {
    try {
      const tx = this.db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const index = tx.store.index('status');
      const completed = await index.getAll('completed');
      
      // Remove items older than 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      for (const item of completed) {
        if (new Date(item.completed_at) < sevenDaysAgo) {
          await tx.store.delete(item.id);
        }
      }
      
      await tx.done;
    } catch (error) {
      console.error('Error cleaning up completed operations:', error);
    }
  }
}

/**
 * Local Data Manager
 */
export class LocalDataManager {
  constructor(db) {
    this.db = db;
  }

  /**
   * Save data locally
   */
  async save(key, data, type = 'generic') {
    try {
      const tx = this.db.transaction(STORES.LOCAL_DATA, 'readwrite');
      await tx.store.put({
        key,
        data,
        type,
        updated_at: new Date().toISOString(),
      });
      await tx.done;
    } catch (error) {
      console.error('Error saving local data:', error);
      throw error;
    }
  }

  /**
   * Get data from local storage
   */
  async get(key) {
    try {
      const tx = this.db.transaction(STORES.LOCAL_DATA, 'readonly');
      const item = await tx.store.get(key);
      return item ? item.data : null;
    } catch (error) {
      console.error('Error getting local data:', error);
      return null;
    }
  }

  /**
   * Delete data from local storage
   */
  async delete(key) {
    try {
      const tx = this.db.transaction(STORES.LOCAL_DATA, 'readwrite');
      await tx.store.delete(key);
      await tx.done;
    } catch (error) {
      console.error('Error deleting local data:', error);
    }
  }

  /**
   * Get all data of a specific type
   */
  async getAllByType(type) {
    try {
      const tx = this.db.transaction(STORES.LOCAL_DATA, 'readonly');
      const index = tx.store.index('type');
      const items = await index.getAll(type);
      return items.map(item => item.data);
    } catch (error) {
      console.error('Error getting data by type:', error);
      return [];
    }
  }
}

/**
 * Conflict Resolution Manager
 */
export class ConflictResolver {
  constructor(db) {
    this.db = db;
  }

  /**
   * Record a conflict
   */
  async recordConflict(localData, serverData, operation) {
    try {
      const conflict = {
        local_data: localData,
        server_data: serverData,
        operation,
        timestamp: new Date().toISOString(),
        resolved: false,
        resolution: null,
      };

      const tx = this.db.transaction(STORES.CONFLICTS, 'readwrite');
      const id = await tx.store.add(conflict);
      await tx.done;

      return id;
    } catch (error) {
      console.error('Error recording conflict:', error);
      throw error;
    }
  }

  /**
   * Resolve conflict
   */
  async resolveConflict(conflictId, resolution, resolvedData) {
    try {
      const tx = this.db.transaction(STORES.CONFLICTS, 'readwrite');
      const conflict = await tx.store.get(conflictId);
      
      if (conflict) {
        conflict.resolved = true;
        conflict.resolution = resolution; // 'local', 'server', 'merge'
        conflict.resolved_data = resolvedData;
        conflict.resolved_at = new Date().toISOString();
        await tx.store.put(conflict);
      }
      
      await tx.done;
    } catch (error) {
      console.error('Error resolving conflict:', error);
      throw error;
    }
  }

  /**
   * Get unresolved conflicts
   */
  async getUnresolved() {
    try {
      const tx = this.db.transaction(STORES.CONFLICTS, 'readonly');
      const index = tx.store.index('resolved');
      return await index.getAll(false);
    } catch (error) {
      console.error('Error getting unresolved conflicts:', error);
      return [];
    }
  }
}

/**
 * Background Sync Manager
 */
export class BackgroundSync {
  constructor(db, apiClient) {
    this.db = db;
    this.apiClient = apiClient;
    this.syncQueue = new SyncQueue(db);
    this.isOnline = navigator.onLine;
    this.syncInterval = null;
    
    // Listen to online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.startSync();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.stopSync();
    });
  }

  /**
   * Start background sync
   */
  startSync(intervalMs = 30000) {
    if (this.syncInterval) {
      return; // Already running
    }

    // Sync immediately
    this.sync();

    // Then sync at intervals
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.sync();
      }
    }, intervalMs);
  }

  /**
   * Stop background sync
   */
  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Sync pending operations
   */
  async sync() {
    if (!this.isOnline) {
      return;
    }

    try {
      const pending = await this.syncQueue.getPending();
      
      for (const operation of pending) {
        try {
          // Execute the operation
          const response = await this.apiClient.request({
            method: operation.method,
            url: operation.endpoint,
            data: operation.data,
          });

          // Mark as completed
          await this.syncQueue.markCompleted(operation.id);
          
          console.log(`Synced operation ${operation.id}: ${operation.type} ${operation.endpoint}`);
        } catch (error) {
          // Mark as failed (will retry if retries < max_retries)
          await this.syncQueue.markFailed(operation.id, error);
          console.error(`Failed to sync operation ${operation.id}:`, error);
        }
      }

      // Cleanup old completed operations
      await this.syncQueue.cleanupCompleted();
    } catch (error) {
      console.error('Error in background sync:', error);
    }
  }
}

/**
 * Main Offline Sync Service
 */
export class OfflineSyncService {
  constructor(apiClient) {
    this.db = null;
    this.syncQueue = null;
    this.localData = null;
    this.conflictResolver = null;
    this.backgroundSync = null;
    this.apiClient = apiClient;
    this.initialized = false;
  }

  /**
   * Initialize offline sync service
   */
  async init() {
    if (this.initialized) {
      return;
    }

    try {
      this.db = await initOfflineDB();
      this.syncQueue = new SyncQueue(this.db);
      this.localData = new LocalDataManager(this.db);
      this.conflictResolver = new ConflictResolver(this.db);
      this.backgroundSync = new BackgroundSync(this.db, this.apiClient);
      
      // Start background sync
      this.backgroundSync.startSync();
      
      this.initialized = true;
      console.log('Offline sync service initialized');
    } catch (error) {
      console.error('Error initializing offline sync service:', error);
      throw error;
    }
  }

  /**
   * Execute operation (with offline support)
   */
  async execute(operation) {
    if (!this.initialized) {
      await this.init();
    }

    // If online, try to execute directly
    if (navigator.onLine) {
      try {
        const response = await this.apiClient.request({
          method: operation.method || 'POST',
          url: operation.endpoint,
          data: operation.data,
        });
        return response;
      } catch (error) {
        // If request fails, queue it for retry
        console.warn('Request failed, queueing for retry:', error);
        await this.syncQueue.enqueue(operation);
        throw error;
      }
    } else {
      // If offline, queue the operation
      await this.syncQueue.enqueue(operation);
      
      // Return a promise that will resolve when synced
      return new Promise((resolve, reject) => {
        // Store resolve/reject for later
        operation._resolve = resolve;
        operation._reject = reject;
      });
    }
  }

  /**
   * Get sync queue status
   */
  async getQueueStatus() {
    if (!this.initialized) {
      await this.init();
    }

    const pending = await this.syncQueue.getPending();
    return {
      pending: pending.length,
      isOnline: navigator.onLine,
    };
  }
}

// Export singleton instance
let offlineSyncService = null;

export function getOfflineSyncService(apiClient) {
  if (!offlineSyncService) {
    offlineSyncService = new OfflineSyncService(apiClient);
  }
  return offlineSyncService;
}









