import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import FirebaseCore
import KakaoSDKAuth
import KakaoSDKCommon

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // ★ v18.46 — 푸시(Firebase). GoogleService-Info.plist를 넣기 전까지는 건너뜀(없이 configure하면 앱이 꺼짐)
    if Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil {
      FirebaseApp.configure()
    }
    // ★ v18.46 — 카카오 SDK를 앱 시작 때 초기화. 안 하면 링크로 앱이 열릴 때 아래 isKakaoTalkLoginUrl에서
    //   "MustInitAppKey"로 앱이 꺼짐(가상 아이폰 점검에서 발견). 키는 Info.plist의 KAKAO_APP_KEY.
    if let kakaoKey = Bundle.main.object(forInfoDictionaryKey: "KAKAO_APP_KEY") as? String, !kakaoKey.isEmpty {
      KakaoSDK.initSDK(appKey: kakaoKey)
    }

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "app",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  // ★ v18.46 — workmate://join/코드 같은 링크로 앱이 열릴 때 React Native(Linking)로 전달
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    // 카카오톡으로 로그인하고 돌아온 경우 카카오 SDK가 처리
    if url.scheme?.hasPrefix("kakao") == true && AuthApi.isKakaoTalkLoginUrl(url) {
      return AuthController.handleOpenUrl(url: url)
    }
    return RCTLinkingManager.application(app, open: url, options: options)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
