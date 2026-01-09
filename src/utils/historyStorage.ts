/**
 * 計算履歴のローカルストレージ管理
 */

export interface CalculationHistory {
  id: string;
  type: 'box' | 'formation' | 'win5';
  timestamp: number;
  // BOX買いの場合
  horseCount?: number;
  unitAmount: number;
  // フォーメーションの場合
  // Map→Array変換を削除: JSON互換性のため直接配列で保存
  selections?: Array<[number, number[]]>; // position -> horse numbers
  // WIN5の場合
  raceHorseCounts?: number[]; // 各レースの選択頭数 [race1, race2, race3, race4, race5]
  // 計算結果
  results?: {
    betTypeId: string;
    points: number;
    totalAmount: number;
  }[];
}

const STORAGE_KEY = 'horse-racing-calc-history';
const MAX_HISTORY_COUNT = 50; // 最大保存件数

/**
 * 履歴を取得する（Map変換なし - 配列のまま返す）
 */
export function getHistory(): CalculationHistory[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const history = JSON.parse(stored);
    // selectionsは既に配列形式なのでそのまま返す
    return history;
  } catch (error) {
    console.error('履歴の読み込みに失敗しました:', error);
    return [];
  }
}

/**
 * 履歴を保存する（Map変換なし - 配列のまま保存）
 */
export function saveHistory(history: CalculationHistory): void {
  try {
    const allHistory = getHistory();

    // 新しい履歴を先頭に追加
    allHistory.unshift(history);

    // 最大件数を超えた場合は古いものを削除
    if (allHistory.length > MAX_HISTORY_COUNT) {
      allHistory.splice(MAX_HISTORY_COUNT);
    }

    // selectionsは既に配列形式なので、変換不要でそのまま保存
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allHistory));
  } catch (error) {
    console.error('履歴の保存に失敗しました:', error);
  }
}

/**
 * 履歴IDを生成する
 */
export function generateHistoryId(): string {
  return `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * すべての履歴を削除する
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('履歴の削除に失敗しました:', error);
  }
}

/**
 * デバウンス機能付きの履歴管理クラス
 * localStorage書き込みを最適化し、UIブロッキングを防ぐ
 */
class HistoryManager {
  private writeTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingWrite: CalculationHistory | null = null;
  private readonly DEBOUNCE_MS = 600;

  /**
   * 履歴保存をスケジュールする（デバウンス付き）
   * 連続した呼び出しは最後の1回のみ実行される
   */
  public scheduleSave(history: CalculationHistory): void {
    this.pendingWrite = history;

    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
    }

    this.writeTimeout = setTimeout(() => {
      this.flushWrite();
    }, this.DEBOUNCE_MS);
  }

  /**
   * 即座に保存を実行する（デバウンスをスキップ）
   */
  public flushWrite(): void {
    if (this.pendingWrite) {
      this.writeToStorage(this.pendingWrite);
      this.pendingWrite = null;
      this.writeTimeout = null;
    }
  }

  /**
   * requestIdleCallbackを使用してバックグラウンドで書き込み
   * フォールバックとしてsetTimeoutを使用
   */
  private writeToStorage(history: CalculationHistory): void {
    const doWrite = () => {
      try {
        const allHistory = getHistory();

        // 新しい履歴を先頭に追加
        allHistory.unshift(history);

        // 最大件数を超えた場合は古いものを削除
        if (allHistory.length > MAX_HISTORY_COUNT) {
          allHistory.splice(MAX_HISTORY_COUNT);
        }

        // selectionsは既に配列形式なので、変換不要でそのまま保存
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allHistory));
      } catch (error) {
        console.error('履歴の保存に失敗しました:', error);
      }
    };

    // requestIdleCallbackが利用可能な場合はそれを使用、そうでなければsetTimeout
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(doWrite);
    } else {
      setTimeout(doWrite, 0);
    }
  }
}

/**
 * グローバルなHistoryManagerインスタンス
 * コンポーネントから使用する
 */
export const historyManager = new HistoryManager();

