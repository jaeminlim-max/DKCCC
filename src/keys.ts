// 이 폰에 저장하는 항목 이름 (localStorage 'ltc:' 접두어 아래).
export const KEYS = {
  prayerList: 'prayer-list', // { names: string[] }
  pledge: 'pledge', // { evangelize: string[], grow: string }
} as const;
