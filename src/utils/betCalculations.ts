/**
 * 競馬点数計算ユーティリティ
 * 各種馬券の点数計算と金額計算を行う
 */

// 馬券の種類を定義するインターフェース
export interface BetType {
  id: string;
  name: string;
  displayName: string;
  points: number;
  description?: string;
}

// 馬券種別の定義
export const BET_TYPES: BetType[] = [
  {
    id: "tansho",
    name: "tansho",
    displayName: "単勝",
    points: 1,
    description: "1着になる馬を当てる",
  },
  {
    id: "fukusho",
    name: "fukusho",
    displayName: "複勝",
    points: 1,
    description: "3着以内に入る馬を当てる",
  },
  {
    id: "wakuren",
    name: "wakuren",
    displayName: "枠連",
    points: 1,
    description: "1着・2着の馬の枠番の組み合わせを当てる",
  },
  {
    id: "umaren",
    name: "umaren",
    displayName: "馬連",
    points: 1,
    description: "1着・2着の馬番の組み合わせを当てる（順序不問）",
  },
  {
    id: "umatan",
    name: "umatan",
    displayName: "馬単",
    points: 1,
    description: "1着・2着の馬番を順序通りに当てる",
  },
  {
    id: "wide",
    name: "wide",
    displayName: "ワイド",
    points: 1,
    description: "3着以内に入る2頭の組み合わせを当てる",
  },
  {
    id: "sanrenpuku",
    name: "sanrenpuku",
    displayName: "3連複",
    points: 1,
    description: "1着・2着・3着の馬番の組み合わせを当てる（順序不問）",
  },
  {
    id: "sanrentan",
    name: "sanrentan",
    displayName: "3連単",
    points: 1,
    description: "1着・2着・3着の馬番を順序通りに当てる",
  },
];

// プリセット金額の定義
export const PRESET_AMOUNTS = [100, 200, 500, 1000] as const;

// デフォルト金額
export const DEFAULT_AMOUNT = 100;

/**
 * HTMLエスケープ関数（XSS対策）
 * @param str エスケープする文字列
 * @returns エスケープされた文字列
 */
export function escapeHtml(str: string | number): string {
  const text = String(str);
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export function formatYenAmount(amount: number): string {
  if (amount === 0) {
    return "0円";
  }
  return `${amount.toLocaleString("ja-JP")}円`;
}

/**
 * カスタム金額の入力値を検証する
 * @param input 入力値
 * @returns 検証結果オブジェクト
 */
export function validateCustomAmount(input: string): {
  isValid: boolean;
  value: number;
  errorMessage?: string;
} {
  // 空文字チェック
  if (!input.trim()) {
    return {
      isValid: false,
      value: 0,
      errorMessage: "金額を入力してください",
    };
  }

  // 数値変換
  const numValue = parseInt(input.trim(), 10);

  // 数値チェック
  if (isNaN(numValue)) {
    return {
      isValid: false,
      value: 0,
      errorMessage: "有効な数値を入力してください",
    };
  }

  // 正の整数チェック
  if (numValue <= 0) {
    return {
      isValid: false,
      value: 0,
      errorMessage: "1円以上の金額を入力してください",
    };
  }

  // 上限チェック（1億円まで）
  if (numValue > 100000000) {
    return {
      isValid: false,
      value: 0,
      errorMessage: "金額が大きすぎます（1億円以下で入力してください）",
    };
  }

  return {
    isValid: true,
    value: numValue,
  };
}

/**
 * 馬券種別の一覧を取得する（表示用）
 * @returns 馬券種別の配列
 */
export function getAllBetTypes(): BetType[] {
  return [...BET_TYPES];
}

/**
 * プリセット金額の一覧を取得する
 * @returns プリセット金額の配列
 */
export function getPresetAmounts(): readonly number[] {
  return PRESET_AMOUNTS;
}

/**
 * BOX買いの点数計算関数
 */

// 計算結果のキャッシュ（メモ化）
const combinationCache = new Map<string, number>();
const permutationCache = new Map<string, number>();
const boxPointsCache = new Map<string, number>();

/**
 * キャッシュキーを生成する
 */
function getCacheKey(...args: (string | number)[]): string {
  return args.join('_');
}

/**
 * 組み合わせ数を計算する（nCr）- メモ化対応
 * @param n 全体の数
 * @param r 選択する数
 * @returns 組み合わせ数
 */
function combination(n: number, r: number): number {
  if (r > n || r < 0) return 0;
  if (r === 0 || r === n) return 1;

  // キャッシュキーを生成
  const cacheKey = getCacheKey('C', n, r);
  
  // キャッシュを確認
  if (combinationCache.has(cacheKey)) {
    return combinationCache.get(cacheKey)!;
  }

  let result = 1;
  for (let i = 0; i < r; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  const finalResult = Math.floor(result);
  
  // キャッシュに保存
  combinationCache.set(cacheKey, finalResult);
  return finalResult;
}

/**
 * 順列数を計算する（nPr）- メモ化対応
 * @param n 全体の数
 * @param r 選択する数
 * @returns 順列数
 */
function permutation(n: number, r: number): number {
  if (r > n || r < 0) return 0;
  if (r === 0) return 1;

  // キャッシュキーを生成
  const cacheKey = getCacheKey('P', n, r);
  
  // キャッシュを確認
  if (permutationCache.has(cacheKey)) {
    return permutationCache.get(cacheKey)!;
  }

  let result = 1;
  for (let i = 0; i < r; i++) {
    result *= n - i;
  }
  
  // キャッシュに保存
  permutationCache.set(cacheKey, result);
  return result;
}

/**
 * BOX買いの点数を計算する - メモ化対応
 * @param betTypeId 馬券種別ID
 * @param horseCount 選択頭数
 * @returns 点数
 */
export function calculateBoxPoints(
  betTypeId: string,
  horseCount: number
): number {
  if (horseCount < 1) return 0;

  // キャッシュキーを生成
  const cacheKey = getCacheKey('box', betTypeId, horseCount);
  
  // キャッシュを確認
  if (boxPointsCache.has(cacheKey)) {
    return boxPointsCache.get(cacheKey)!;
  }

  let result: number;

  switch (betTypeId) {
    case "tansho":
    case "fukusho":
      // 単勝・複勝は頭数分
      result = horseCount;
      break;

    case "wakuren":
    case "umaren":
    case "wide":
      // 2頭の組み合わせ（順序なし）
      result = combination(horseCount, 2);
      break;

    case "umatan":
      // 2頭の順列（順序あり）
      result = permutation(horseCount, 2);
      break;

    case "sanrenpuku":
      // 3頭の組み合わせ（順序なし）
      result = combination(horseCount, 3);
      break;

    case "sanrentan":
      // 3頭の順列（順序あり）
      result = permutation(horseCount, 3);
      break;

    default:
      result = 0;
  }

  // キャッシュに保存
  boxPointsCache.set(cacheKey, result);
  return result;
}

/**
 * 各馬券種別の最小必要頭数を取得
 * @param betTypeId 馬券種別ID
 * @returns 最小必要頭数
 */
export function getMinimumHorseCount(betTypeId: string): number {
  switch (betTypeId) {
    case "tansho":
    case "fukusho":
      return 1;

    case "wakuren":
    case "umaren":
    case "umatan":
    case "wide":
      return 2;

    case "sanrenpuku":
    case "sanrentan":
      return 3;

    default:
      return 1;
  }
}

/**
 * 各馬券種別の推奨最大頭数を取得
 * @param betTypeId 馬券種別ID
 * @returns 推奨最大頭数
 */
export function getMaximumHorseCount(betTypeId: string): number {
  // 一般的な競馬の出走頭数を考慮
  return 18;
}
