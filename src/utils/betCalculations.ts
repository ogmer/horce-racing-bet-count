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
 * 馬券種別IDから馬券種別オブジェクトを取得する
 * @param betTypeId 馬券種別ID
 * @returns 馬券種別オブジェクト（見つからない場合はnull）
 */
export function getBetTypeById(betTypeId: string): BetType | null {
  return BET_TYPES.find((bt) => bt.id === betTypeId) || null;
}


/**
 * 金額を日本円形式でフォーマットする
 * @param amount 金額
 * @returns フォーマットされた金額文字列
 */
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
 * 馬券種別が有効かどうかを検証する
 * @param betTypeId 馬券種別ID
 * @returns 有効な場合true
 */
export function isValidBetType(betTypeId: string): boolean {
  return BET_TYPES.some((bt) => bt.id === betTypeId);
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

/**
 * 組み合わせ数を計算する（nCr）
 * @param n 全体の数
 * @param r 選択する数
 * @returns 組み合わせ数
 */
function combination(n: number, r: number): number {
  if (r > n || r < 0) return 0;
  if (r === 0 || r === n) return 1;

  let result = 1;
  for (let i = 0; i < r; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.floor(result);
}

/**
 * 順列数を計算する（nPr）
 * @param n 全体の数
 * @param r 選択する数
 * @returns 順列数
 */
function permutation(n: number, r: number): number {
  if (r > n || r < 0) return 0;
  if (r === 0) return 1;

  let result = 1;
  for (let i = 0; i < r; i++) {
    result *= n - i;
  }
  return result;
}

/**
 * BOX買いの点数を計算する
 * @param betTypeId 馬券種別ID
 * @param horseCount 選択頭数
 * @returns 点数
 */
export function calculateBoxPoints(
  betTypeId: string,
  horseCount: number
): number {
  if (horseCount < 1) return 0;

  switch (betTypeId) {
    case "tansho":
    case "fukusho":
      // 単勝・複勝は頭数分
      return horseCount;

    case "wakuren":
    case "umaren":
    case "wide":
      // 2頭の組み合わせ（順序なし）
      return combination(horseCount, 2);

    case "umatan":
      // 2頭の順列（順序あり）
      return permutation(horseCount, 2);

    case "sanrenpuku":
      // 3頭の組み合わせ（順序なし）
      return combination(horseCount, 3);

    case "sanrentan":
      // 3頭の順列（順序あり）
      return permutation(horseCount, 3);

    default:
      return 0;
  }
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

/**
 * BOX買いの詳細情報を取得
 * @param betTypeId 馬券種別ID
 * @param horseCount 選択頭数
 * @returns BOX買いの詳細情報
 */
export function getBoxCalculationDetails(
  betTypeId: string,
  horseCount: number
): {
  points: number;
  formula: string;
  description: string;
  isValid: boolean;
} {
  const minCount = getMinimumHorseCount(betTypeId);
  const maxCount = getMaximumHorseCount(betTypeId);

  if (horseCount < minCount || horseCount > maxCount) {
    return {
      points: 0,
      formula: "",
      description: `${minCount}頭以上${maxCount}頭以下で選択してください`,
      isValid: false,
    };
  }

  const points = calculateBoxPoints(betTypeId, horseCount);
  const betType = getBetTypeById(betTypeId);

  let formula = "";
  let description = "";

  switch (betTypeId) {
    case "tansho":
    case "fukusho":
      formula = `${horseCount}頭 = ${points}点`;
      description = `${horseCount}頭から1頭を選ぶ`;
      break;

    case "wakuren":
    case "umaren":
    case "wide":
      formula = `${horseCount}C2 = ${points}点`;
      description = `${horseCount}頭から2頭の組み合わせ`;
      break;

    case "umatan":
      formula = `${horseCount}P2 = ${points}点`;
      description = `${horseCount}頭から2頭の順列（着順あり）`;
      break;

    case "sanrenpuku":
      formula = `${horseCount}C3 = ${points}点`;
      description = `${horseCount}頭から3頭の組み合わせ`;
      break;

    case "sanrentan":
      formula = `${horseCount}P3 = ${points}点`;
      description = `${horseCount}頭から3頭の順列（着順あり）`;
      break;
  }

  return {
    points,
    formula,
    description,
    isValid: true,
  };
}

/**
 * 頭数選択の検証
 * @param horseCount 頭数
 * @returns 検証結果
 */
export function validateHorseCount(horseCount: number): {
  isValid: boolean;
  errorMessage?: string;
} {
  if (horseCount < 1) {
    return {
      isValid: false,
      errorMessage: "1頭以上を選択してください",
    };
  }

  if (horseCount > 18) {
    return {
      isValid: false,
      errorMessage: "18頭以下で選択してください",
    };
  }

  return {
    isValid: true,
  };
}

/**
 * 流し買いの点数を計算する
 * @param betTypeId 馬券種別ID
 * @param axisCount 軸の頭数（1頭または2頭）
 * @param opponentCount 相手の頭数
 * @param isMulti マルチをマークした場合（馬単・3連単のみ）
 * @returns 点数（マルチの場合は { normal: number, multi: number } の形式）
 */
export function calculateNagashiPoints(
  betTypeId: string,
  axisCount: number,
  opponentCount: number,
  isMulti: boolean = false
): number | { normal: number; multi: number } {
  if (axisCount < 1 || opponentCount < 1) return 0;

  switch (betTypeId) {
    case "wakuren":
    case "umaren":
    case "wide":
      // 流し: 軸1頭 × 相手n頭 = n点
      if (axisCount === 1) {
        return opponentCount;
      }
      // 軸2頭の場合は、軸2頭の組み合わせ × 相手n頭
      if (axisCount === 2) {
        return combination(axisCount, 2) * opponentCount;
      }
      return 0;

    case "umatan":
      // 流し: 軸1頭 × 相手n頭 = n点（順序あり）
      if (axisCount === 1) {
        if (isMulti) {
          // マルチ: 軸1頭 × 相手n頭 × 2（順序の組み合わせ）
          return { normal: opponentCount, multi: opponentCount * 2 };
        }
        return opponentCount;
      }
      // 軸2頭の場合は、軸2頭の順列 × 相手n頭
      if (axisCount === 2) {
        const axisPerm = permutation(axisCount, 2);
        if (isMulti) {
          return { normal: axisPerm * opponentCount, multi: axisPerm * opponentCount * 2 };
        }
        return axisPerm * opponentCount;
      }
      return 0;

    case "sanrenpuku":
      // 流し: 軸1頭 × 相手n頭から2頭選ぶ = nC2点
      if (axisCount === 1) {
        return combination(opponentCount, 2);
      }
      // 軸2頭 × 相手n頭から1頭選ぶ = n点
      if (axisCount === 2) {
        return opponentCount;
      }
      return 0;

    case "sanrentan":
      // 流し: 軸1頭 × 相手n頭から2頭選ぶ順列 = nP2点
      if (axisCount === 1) {
        if (isMulti) {
          // マルチ: 軸1頭 × 相手n頭から2頭選ぶ × 順序の組み合わせ
          const normal = permutation(opponentCount, 2);
          return { normal, multi: normal * 2 };
        }
        return permutation(opponentCount, 2);
      }
      // 軸2頭 × 相手n頭 = n点（順序あり）
      if (axisCount === 2) {
        if (isMulti) {
          return { normal: opponentCount, multi: opponentCount * 2 };
        }
        return opponentCount;
      }
      return 0;

    default:
      return 0;
  }
}