const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
const JUNG_COUNT = 21;
const JONG_COUNT = 28;

const CHO_LIST = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const;

const JUNG_LIST = [
  'ㅏ',
  'ㅐ',
  'ㅑ',
  'ㅒ',
  'ㅓ',
  'ㅔ',
  'ㅕ',
  'ㅖ',
  'ㅗ',
  'ㅘ',
  'ㅙ',
  'ㅚ',
  'ㅛ',
  'ㅜ',
  'ㅝ',
  'ㅞ',
  'ㅟ',
  'ㅠ',
  'ㅡ',
  'ㅢ',
  'ㅣ',
] as const;

const JONG_LIST = [
  '',
  'ㄱ',
  'ㄲ',
  'ㄳ',
  'ㄴ',
  'ㄵ',
  'ㄶ',
  'ㄷ',
  'ㄹ',
  'ㄺ',
  'ㄻ',
  'ㄼ',
  'ㄽ',
  'ㄾ',
  'ㄿ',
  'ㅀ',
  'ㅁ',
  'ㅂ',
  'ㅄ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const;

const ENGLISH_TO_KOREAN_KEY: Record<string, string> = {
  q: 'ㅂ',
  w: 'ㅈ',
  e: 'ㄷ',
  r: 'ㄱ',
  t: 'ㅅ',
  y: 'ㅛ',
  u: 'ㅕ',
  i: 'ㅑ',
  o: 'ㅐ',
  p: 'ㅔ',
  a: 'ㅁ',
  s: 'ㄴ',
  d: 'ㅇ',
  f: 'ㄹ',
  g: 'ㅎ',
  h: 'ㅗ',
  j: 'ㅓ',
  k: 'ㅏ',
  l: 'ㅣ',
  z: 'ㅋ',
  x: 'ㅌ',
  c: 'ㅊ',
  v: 'ㅍ',
  b: 'ㅠ',
  n: 'ㅜ',
  m: 'ㅡ',
  Q: 'ㅃ',
  W: 'ㅉ',
  E: 'ㄸ',
  R: 'ㄲ',
  T: 'ㅆ',
  O: 'ㅒ',
  P: 'ㅖ',
};

const choIndexMap = new Map<string, number>(
  CHO_LIST.map((value, index) => [value, index]),
);
const jungIndexMap = new Map<string, number>(
  JUNG_LIST.map((value, index) => [value, index]),
);
const jongIndexMap = new Map<string, number>(
  JONG_LIST.map((value, index) => [value, index]),
);

const normalizeSearchText = (value: string) =>
  value.toLowerCase().replace(/\s+/g, '');

const isHangulSyllable = (char: string) => {
  const code = char.charCodeAt(0);
  return code >= HANGUL_BASE && code <= HANGUL_LAST;
};

const convertEnglishKeyboardMistype = (value: string) => {
  return [...value]
    .map((char) => ENGLISH_TO_KOREAN_KEY[char] ?? char)
    .join('');
};

const decomposeHangul = (value: string) => {
  return [...value]
    .map((char) => {
      if (!isHangulSyllable(char)) return char;

      const syllableIndex = char.charCodeAt(0) - HANGUL_BASE;
      const choIndex = Math.floor(syllableIndex / (JUNG_COUNT * JONG_COUNT));
      const jungIndex = Math.floor(
        (syllableIndex % (JUNG_COUNT * JONG_COUNT)) / JONG_COUNT,
      );
      const jongIndex = syllableIndex % JONG_COUNT;

      return `${CHO_LIST[choIndex]}${JUNG_LIST[jungIndex]}${JONG_LIST[jongIndex]}`;
    })
    .join('');
};

const composeCompatibilityJamo = (value: string) => {
  const chars = [...value];
  let result = '';

  for (let index = 0; index < chars.length; index += 1) {
    const choIndex = choIndexMap.get(chars[index]);
    const jungIndex = jungIndexMap.get(chars[index + 1]);

    if (choIndex === undefined || jungIndex === undefined) {
      result += chars[index];
      continue;
    }

    const nextJongIndex = jongIndexMap.get(chars[index + 2]);
    const nextNextIsVowel = jungIndexMap.has(chars[index + 3]);
    const jongIndex = nextJongIndex && !nextNextIsVowel ? nextJongIndex : 0;

    result += String.fromCharCode(
      HANGUL_BASE + (choIndex * JUNG_COUNT + jungIndex) * JONG_COUNT + jongIndex,
    );
    index += jongIndex > 0 ? 2 : 1;
  }

  return result;
};

const createSearchKeys = (value: string) => {
  const normalized = normalizeSearchText(value);
  const keyboardConverted = convertEnglishKeyboardMistype(value);
  const composed = normalizeSearchText(composeCompatibilityJamo(normalized));
  const composedKeyboardConverted = normalizeSearchText(
    composeCompatibilityJamo(keyboardConverted),
  );

  return [
    normalized,
    composed,
    decomposeHangul(composed),
    normalizeSearchText(keyboardConverted),
    composedKeyboardConverted,
    decomposeHangul(composedKeyboardConverted),
  ].filter(Boolean);
};

export const matchesKoreanNameSearch = (name: string, searchTerm: string) => {
  const queryKeys = createSearchKeys(searchTerm);
  const nameKeys = createSearchKeys(name);

  return queryKeys.some((query) =>
    nameKeys.some((nameKey) => nameKey.includes(query)),
  );
};
