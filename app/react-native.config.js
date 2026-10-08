// ★ v18.60 — Apple 로그인은 아이폰에서만 씀(안드로이드는 웹 방식이라 서비스 ID가 따로 필요) → 안드로이드 연결 안 함
module.exports = {
  dependencies: {
    '@invertase/react-native-apple-authentication': {
      platforms: { android: null },
    },
  },
};
