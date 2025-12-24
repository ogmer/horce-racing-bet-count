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
  selections?: Map<number, number[]>; // position -> horse numbers
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
 * 履歴を取得する
 */
export function getHistory(): CalculationHistory[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const history = JSON.parse(stored);
    // Mapを復元
    return history.map((item: any) => {
      if (item.selections && Array.isArray(item.selections)) {
        const selectionsMap = new Map<number, number[]>();
        item.selections.forEach(([pos, horses]: [number, number[]]) => {
          selectionsMap.set(pos, horses);
        });
        item.selections = selectionsMap;
      }
      return item;
    });
  } catch (error) {
    console.error('履歴の読み込みに失敗しました:', error);
    return [];
  }
}

/**
 * 履歴を保存する
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
    
    // Mapを配列に変換して保存
    const serialized = allHistory.map(item => {
      const serializedItem: any = { ...item };
      if (item.selections instanceof Map) {
        serializedItem.selections = Array.from(item.selections.entries());
      }
      return serializedItem;
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
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

