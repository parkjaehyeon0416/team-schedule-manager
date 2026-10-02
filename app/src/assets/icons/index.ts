// ★ v18.36 — 디자인(DESIGN-CANVAS)의 3D 일러스트 아이콘. 아티팩트 에셋 그대로 사용.
export const ICONS = {
  logo: require('./logo.png'),
  schedule: require('./schedule.png'),
  income: require('./income.png'),
  team: require('./team.png'),
  quote: require('./quote.png'),
  card: require('./card.png'),
  tax: require('./tax.png'),
  site: require('./site.png'),
  megaphone: require('./megaphone.png'),
  gift: require('./gift.png'),
  profile: require('./profile.png'),
  rates: require('./rates.png'),
  bell: require('./bell.png'),
  doc: require('./doc.png'),
  privacy: require('./privacy.png'),
  info: require('./info.png'),
};

export type IconKey = keyof typeof ICONS;
