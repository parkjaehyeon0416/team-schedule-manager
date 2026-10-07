<?php

namespace App\Http\Controllers;

use Illuminate\Support\Carbon;

/**
 * ★ v18.48 — 앱 소개 웹페이지(디자인 WEB_LANDING / WEB_LANDING_M) + 웹 이용약관·개인정보 처리방침.
 *   스토어 주소가 아직 없으면 Android는 설치 파일(APK), iPhone은 "준비 중"으로 표시(초대 페이지와 같은 방식).
 *   config/workmate.php의 APP_STORE_URL / PLAY_STORE_URL을 넣으면 스토어 버튼으로 바뀜.
 */
class LandingPageController extends Controller
{
    public function show()
    {
        $ios = config('workmate.app_store_url');
        $android = config('workmate.play_store_url');

        $store = [
            'ios' => $ios
                ? ['url' => $ios, 'sub' => 'iPhone에서 받기', 'label' => 'App Store']
                : ['url' => '#download', 'sub' => 'iPhone', 'label' => '출시 준비 중'],
            'android' => $android
                ? ['url' => $android, 'sub' => 'Android에서 받기', 'label' => 'Google Play']
                : ['url' => url('/download/latest'), 'sub' => 'Android에서 받기', 'label' => '설치 파일 받기'],
        ];

        // ★ v18.53 — 종료일이 없으면(결제 준비 전까지 무료) 날짜 없이 안내
        $promo = \App\Services\PlanService::promoActive();
        $until = config('plans.launch_free_until');
        $freeText = $until ? Carbon::parse($until)->subDay()->format('Y년 n월 j일') . '까지' : '지금은';
        $launchNote = trim(($promo ? "출시 기념으로 {$freeText} 모든 기능을 무료로 쓸 수 있어요." : '')
            . ($ios ? '' : ' iPhone 앱은 준비 중이에요.'));

        $pro = number_format(config('plans.plans.pro.monthly'));
        $team = number_format(config('plans.plans.team.monthly'));
        $faq = [
            ['어떤 분들이 쓰면 좋나요?', '도배 · 타일 · 필름 · 도장처럼 현장을 옮겨 다니며 일하는 분, 그리고 팀을 꾸려 일정을 나누는 팀장님께 맞춰 만들었어요.'],
            ['이용 요금이 있나요?', '일정 · 수입 · 현장 · 사진 같은 기본 기능은 계속 무료예요. 견적서와 세무 자료 내보내기를 많이 쓰면 개인 프로(월 ' . $pro . '원), '
                . '팀원 정산표 · 근태 · 팀 공지 같은 팀 운영 기능은 팀 요금제(월 ' . $team . '원, 팀장만 결제 · 팀원은 무료)예요.'
                . ($promo ? ($until ? " {$freeText}는 모든 기능이 무료예요." : ' 지금은 출시 기념으로 모든 기능이 무료예요.') : '')],
            ['팀원이 앱을 안 쓰면 어떻게 하나요?', '연락처에서 골라 초대 문자를 보낼 수 있어요. 받은 사람이 링크를 누르면 설치와 팀 참여까지 안내돼요.'],
            ['세금 신고도 대신 해주나요?', '아니요. WorkMate는 수입 자료를 정리하고 예상 원천세를 계산해 보여주는 참고용 기능이에요. 신고는 홈택스나 세무사를 통해 직접 진행해주세요.'],
            ['휴대폰을 바꾸면 기록이 사라지나요?', '아니요. 같은 계정으로 로그인하면 일정 · 수입 · 견적서가 그대로 이어져요.'],
        ];

        return view('web.landing', [
            'store'      => $store,
            'launchNote' => $launchNote,
            'faq'        => $faq,
            'company'    => config('workmate.company_info'), // 사업자 등록 후 "상호 · 대표 · 사업자등록번호" (없으면 숨김)
        ]);
    }

    public function terms()
    {
        return $this->legal('이용약관', 'terms.txt');
    }

    public function privacy()
    {
        return $this->legal('개인정보 처리방침', 'privacy.txt');
    }

    private function legal(string $title, string $file)
    {
        return view('web.legal', [
            'title' => $title,
            'body'  => file_get_contents(resource_path("legal/$file")),
        ]);
    }
}
