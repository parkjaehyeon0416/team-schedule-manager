package com.app

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

// ★ v18.70 — 시스템 하단 바(뒤로·홈·최근 버튼 / 제스처 바)를 다시 보이게 함.
//   예전엔 onCreate·포커스 복귀 때마다 숨겼는데(hideNavigationBar), 기기 기본 조작이 사라져 불편하다는 요청으로 제거.
//   바 색은 테마(res/values-v27/styles.xml: 흰 바탕 + 어두운 버튼), 앱 하단 버튼이 바에 가리지 않게 올리는 건
//   JS 쪽 아래 안전 영역(insets.bottom — 하단 탭·스택 화면 틀·시트)이 맡음.
class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "app"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  /**
   * ★ v18.70 — 안드로이드가 화면(액티비티)을 다시 만들 때 앱이 죽던 문제
   *   ("Screen fragments should never be restored", react-native-screens).
   *   기기 하단 조작 방식 변경(제스처 ↔ 3버튼), 백그라운드에서 앱이 정리된 뒤 다시 열기 등에서 일어남.
   *   저장된 화면 상태(savedInstanceState)를 넘기지 않아 화면 조각을 되살리지 않게 함 → JS가 화면을 처음부터 다시 그림.
   *   (react-native-screens 안내 방법. 날짜 선택 창 같은 네이티브 대화상자도 되살리지 않아 주인 없는 창이 남지 않음)
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }
}
