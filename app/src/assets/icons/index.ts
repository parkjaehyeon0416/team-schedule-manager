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
  loginLinks: require('./login_links.png'), // ★ v18.51 로그인 연결 관리
  // ★ v18.70 — 내정보 메뉴 전용 아이콘(사용자 제공 에셋, 192×192 투명 PNG)
  profileSettings: require('./profile_settings.png'), // 프로필 설정 — 사람 + 주황 톱니바퀴
  profilePublic: require('./profile_public.png'), // 공개 프로필 보기 — 사람 + 파란 눈
  // 고객 문의 — 물음표 말풍선 + 답변(…) 말풍선
  //   ★ v18.70 QA — 흰 말풍선이 연한 아이콘 바탕(#F2F7FE)에 묻혀 아이콘이 작고 흐려 보여서, 흰 말풍선만 불투명하게 +
  //   가장자리에 연한 파랑 테두리(#B7CCE9, 2px)·원래 그림자 조금 진하게(사용자 원본에서 그 부분만 손봄, 크기·색은 그대로)
  inquiry: require('./inquiry.png'),
};

export type IconKey = keyof typeof ICONS;
