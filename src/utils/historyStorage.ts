/**
 * 計算履歴のローカルストレージ管理
 * Circular buffer implementation for O(1) writes
 */

export interface CalculationHistory {
  id: string;
  type: 'box' | 'formation' | 'win5' | 'triple_umatan';
  timestamp: number;
  horseCount?: number;
  unitAmount: number;
  selections?: Array<[number, number[]]>;
  raceHorseCounts?: number[];
  buyType?: string;
  results?: {
    betTypeId: string;
    points: number;
    totalAmount: number;
  }[];
}

interface CircularBufferMetadata {
  head: number;      // Index where next write occurs
  count: number;     // Number of items stored
  maxSize: number;   // Maximum capacity
  version: number;   // For migration/compatibility
}

const STORAGE_KEY = 'horse-racing-calc-history';
const METADATA_KEY = 'horse-racing-calc-history-meta';
const MAX_HISTORY_COUNT = 50;
const BUFFER_VERSION = 2;

/**
 * Circular buffer for efficient history storage
 * Provides O(1) insertion instead of O(n) unshift
 */
class CircularHistoryBuffer {
  private metadata: CircularBufferMetadata;

  constructor() {
    this.metadata = this.loadMetadata();
  }

  private loadMetadata(): CircularBufferMetadata {
    try {
      const stored = localStorage.getItem(METADATA_KEY);
      if (stored) {
        const meta = JSON.parse(stored);
        // Validate structure
        if (meta.version === BUFFER_VERSION &&
            typeof meta.head === 'number' &&
            typeof meta.count === 'number') {
          return meta;
        }
      }
    } catch (error) {
      console.warn('Failed to load metadata, initializing new buffer:', error);
    }

    // Initialize new buffer
    return {
      head: 0,
      count: 0,
      maxSize: MAX_HISTORY_COUNT,
      version: BUFFER_VERSION
    };
  }

  private saveMetadata(): void {
    try {
      localStorage.setItem(METADATA_KEY, JSON.stringify(this.metadata));
    } catch (error) {
      console.error('Failed to save metadata:', error);
    }
  }

  /**
   * Get storage key for a specific index
   */
  private getItemKey(index: number): string {
    return `${STORAGE_KEY}_${index}`;
  }

  /**
   * Add new history entry (O(1) operation)
   */
  public push(history: CalculationHistory): void {
    try {
      // Write to head position
      const key = this.getItemKey(this.metadata.head);
      localStorage.setItem(key, JSON.stringify(history));

      // Update metadata
      this.metadata.head = (this.metadata.head + 1) % this.metadata.maxSize;
      this.metadata.count = Math.min(this.metadata.count + 1, this.metadata.maxSize);

      this.saveMetadata();
    } catch (error) {
      console.error('履歴の保存に失敗しました:', error);
      // If storage is full, try clearing old entries
      this.handleStorageQuotaExceeded();
    }
  }

  /**
   * Get all history entries in chronological order (newest first)
   */
  public getAll(): CalculationHistory[] {
    const results: CalculationHistory[] = [];

    if (this.metadata.count === 0) return results;

    try {
      // Calculate start position (most recent entry)
      const start = (this.metadata.head - 1 + this.metadata.maxSize) % this.metadata.maxSize;

      // Read entries in reverse chronological order
      for (let i = 0; i < this.metadata.count; i++) {
        const index = (start - i + this.metadata.maxSize) % this.metadata.maxSize;
        const key = this.getItemKey(index);
        const stored = localStorage.getItem(key);

        if (stored) {
          try {
            const entry = JSON.parse(stored);
            results.push(entry);
          } catch (parseError) {
            console.warn(`Failed to parse entry at index ${index}:`, parseError);
          }
        }
      }
    } catch (error) {
      console.error('Failed to retrieve history:', error);
    }

    return results;
  }

  /**
   * Get most recent entry of specific type
   */
  public getLatestByType(type: CalculationHistory['type']): CalculationHistory | null {
    const all = this.getAll();
    return all.find(h => h.type === type) || null;
  }

  /**
   * Clear all history
   */
  public clear(): void {
    try {
      // Remove all stored entries
      for (let i = 0; i < this.metadata.maxSize; i++) {
        localStorage.removeItem(this.getItemKey(i));
      }

      // Reset metadata
      this.metadata = {
        head: 0,
        count: 0,
        maxSize: MAX_HISTORY_COUNT,
        version: BUFFER_VERSION
      };

      this.saveMetadata();
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }

  /**
   * Handle storage quota exceeded error
   */
  private handleStorageQuotaExceeded(): void {
    console.warn('Storage quota exceeded, attempting to free space');

    try {
      // Remove oldest 25% of entries
      const removeCount = Math.ceil(this.metadata.count * 0.25);

      for (let i = 0; i < removeCount; i++) {
        const oldestIndex = (this.metadata.head - this.metadata.count + this.metadata.maxSize) % this.metadata.maxSize;
        localStorage.removeItem(this.getItemKey(oldestIndex));
        this.metadata.count--;
      }

      this.saveMetadata();
    } catch (error) {
      console.error('Failed to free storage space:', error);
    }
  }

  /**
   * Migrate from old array-based storage to circular buffer
   */
  public static migrateFromLegacy(): void {
    try {
      const legacyData = localStorage.getItem(STORAGE_KEY);
      if (!legacyData) return;

      const legacyHistory: CalculationHistory[] = JSON.parse(legacyData);
      if (!Array.isArray(legacyHistory)) return;


      // Create new buffer
      const buffer = new CircularHistoryBuffer();

      // Add entries in chronological order (oldest first so newest end up at head)
      legacyHistory.reverse().forEach(entry => {
        buffer.push(entry);
      });

      // Remove legacy data
      localStorage.removeItem(STORAGE_KEY);

    } catch (error) {
      console.error('Failed to migrate legacy history:', error);
    }
  }
}

// Global buffer instance
let bufferInstance: CircularHistoryBuffer | null = null;

function getBuffer(): CircularHistoryBuffer {
  if (!bufferInstance) {
    bufferInstance = new CircularHistoryBuffer();

    // One-time migration on first access
    CircularHistoryBuffer.migrateFromLegacy();
  }
  return bufferInstance;
}

/**
 * Public API (maintains backward compatibility)
 */

export function getHistory(): CalculationHistory[] {
  return getBuffer().getAll();
}

export function saveHistory(history: CalculationHistory): void {
  getBuffer().push(history);
}

export function generateHistoryId(): string {
  return `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function clearHistory(): void {
  getBuffer().clear();
}

/**
 * Optimized history manager with debouncing
 */
class HistoryManager {
  private writeTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingWrite: CalculationHistory | null = null;
  private readonly DEBOUNCE_MS = 600;

  public scheduleSave(history: CalculationHistory): void {
    this.pendingWrite = history;

    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
    }

    this.writeTimeout = setTimeout(() => {
      this.flushWrite();
    }, this.DEBOUNCE_MS);
  }

  public flushWrite(): void {
    if (this.pendingWrite) {
      this.writeToStorage(this.pendingWrite);
      this.pendingWrite = null;
      this.writeTimeout = null;
    }
  }

  private writeToStorage(history: CalculationHistory): void {
    const doWrite = () => {
      try {
        // O(1) operation instead of O(n)
        getBuffer().push(history);
      } catch (error) {
        console.error('履歴の保存に失敗しました:', error);
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(doWrite);
    } else {
      setTimeout(doWrite, 0);
    }
  }
}

export const historyManager = new HistoryManager();
