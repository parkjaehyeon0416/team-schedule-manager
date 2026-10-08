<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\SmsCampaign;
use App\Models\SmsTemplate;
use App\Models\User;
use App\Services\Sms\SmsServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

/**
 * ★ v18.43 — 운영자 웹 "문자 발송"·"문자 템플릿" (디자인 ADMIN_SMS_SEND / ADMIN_SMS_TEMPLATES / ADMIN_SMS_TEMPLATE_EDIT)
 *
 * 법적 규칙(정보통신망법)을 서버에서 강제함:
 *   - 광고성(ad): 마케팅 수신 동의한 회원에게만, 맨 앞 "(광고)", 보내는 곳(현장메이트) 표기, 끝에 무료 수신거부 번호,
 *     밤 9시~아침 8시 발송 금지. 수신거부 번호(SMS_AD_OPT_OUT)가 설정 안 돼 있으면 발송 막음.
 *   - 안내성(info): 서버 점검 같은 서비스 안내. 전체 회원에게 보낼 수 있음.
 * 문구 안의 {이름}은 받는 사람 이름으로 바뀜. 공지·이벤트를 연결하면 바로가기 링크(/n/{id})가 붙음.
 */
class AdminSmsController extends Controller
{
    private const TARGETS = [
        'all'        => '전체 회원',
        'recent30'   => '최근 30일 가입',
        'inactive30' => '30일 이상 미접속',
    ];

    // ─── 템플릿 ───

    // GET /api/admin/sms/templates
    public function templates()
    {
        $items = SmsTemplate::with('notice:id,type,title')->latest('updated_at')->get()
            ->map(fn(SmsTemplate $t) => self::templateRow($t));

        return ApiResponse::success($items, '템플릿 목록 조회 성공');
    }

    // GET /api/admin/sms/templates/{id}
    public function showTemplate(int $id)
    {
        return ApiResponse::success(self::templateRow(SmsTemplate::with('notice:id,type,title')->findOrFail($id)), '템플릿 조회 성공');
    }

    // POST /api/admin/sms/templates
    public function storeTemplate(Request $request)
    {
        $data = self::validateTemplate($request);
        $template = SmsTemplate::create($data + ['created_by' => $request->user()->id]);

        return ApiResponse::success(self::templateRow($template->load('notice:id,type,title')), '템플릿이 저장되었습니다.', 201);
    }

    // PUT /api/admin/sms/templates/{id}
    public function updateTemplate(Request $request, int $id)
    {
        $template = SmsTemplate::findOrFail($id);
        $template->update(self::validateTemplate($request));

        return ApiResponse::success(self::templateRow($template->load('notice:id,type,title')), '템플릿이 수정되었습니다.');
    }

    // DELETE /api/admin/sms/templates/{id}
    public function destroyTemplate(int $id)
    {
        SmsTemplate::findOrFail($id)->delete();

        return ApiResponse::success(null, '템플릿이 삭제되었습니다.');
    }

    // POST /api/admin/sms/test  { kind, body, notice_id?, phone } — 테스트 번호 1곳으로 발송
    public function test(Request $request, SmsServiceInterface $sms)
    {
        $data = $request->validate([
            'kind'      => ['required', Rule::in(['ad', 'info'])],
            'body'      => 'required|string|max:1800',
            'notice_id' => 'nullable|integer|exists:notices,id',
            'phone'     => ['required', 'string', 'regex:/^01[0-9]-?\d{3,4}-?\d{4}$/'],
        ]);
        if ($data['kind'] === 'ad' && !trim((string) config('sms.ad_opt_out'))) {
            return ApiResponse::error(self::OPT_OUT_MISSING, 'ERR_VALID_001', 422);
        }

        $text = str_replace('{이름}', $request->user()->name ?? '테스트', self::finalBody($data['kind'], $data['body'], $data['notice_id'] ?? null));
        try {
            $sms->send($data['phone'], $text);
        } catch (\Throwable $e) {
            Log::error('[문자 테스트 발송 실패] ' . $e->getMessage());
            return ApiResponse::error('테스트 문자를 보내지 못했습니다.', 'ERR_SERVER_001', 500);
        }

        return ApiResponse::success(null, '테스트 문자를 보냈습니다.');
    }

    // GET /api/admin/sms/config — 템플릿 작성 화면 미리보기용 (수신거부 문구, 발신번호, 공지 링크 주소)
    public function config()
    {
        $sender = preg_replace('/[^0-9]/', '', (string) config('sms.solapi.sender'));

        return ApiResponse::success([
            'ad_opt_out' => trim((string) config('sms.ad_opt_out')),
            'sender'     => $sender ? preg_replace('/^(\d{3})(\d{3,4})(\d{4})$/', '$1-$2-$3', $sender) : null,
            'link_base'  => url('/n') . '/',
        ], '문자 설정');
    }

    // ─── 발송 ───

    // POST /api/admin/sms/preview  { template_id, target } — 받는 사람 수(대상별), 실제 문구, SMS/LMS, 발송 가능 여부
    public function preview(Request $request)
    {
        $data = $request->validate([
            'template_id' => 'required|integer|exists:sms_templates,id',
            'target'      => ['required', Rule::in(array_keys(self::TARGETS))],
        ]);
        $template = SmsTemplate::findOrFail($data['template_id']);
        $finalBody = self::finalBody($template->kind, $template->body, $template->notice_id);
        $bytes = self::byteLength(str_replace('{이름}', '김철수', $finalBody));

        $targetCounts = [];
        foreach (array_keys(self::TARGETS) as $key) {
            $targetCounts[$key] = self::recipients('info', $key)->count();
        }
        $count = self::recipients($template->kind, $data['target'])->count();

        return ApiResponse::success([
            'recipient_count' => $count,
            'excluded_count'  => $template->kind === 'ad' ? $targetCounts[$data['target']] - $count : 0,
            'target_counts'   => $targetCounts, // 대상 버튼에 표시하는 인원 (번호 있는 회원 기준)
            'final_body'      => $finalBody,
            'bytes'           => $bytes,
            'type'            => $bytes > 90 ? 'LMS' : 'SMS',
            'blocked_reason'  => self::blockedReason($template->kind),
        ], '미리보기');
    }

    // POST /api/admin/sms/send  { template_id, target }
    public function send(Request $request, SmsServiceInterface $sms)
    {
        $data = $request->validate([
            'template_id' => 'required|integer|exists:sms_templates,id',
            'target'      => ['required', Rule::in(array_keys(self::TARGETS))],
        ]);
        $template = SmsTemplate::findOrFail($data['template_id']);

        if ($reason = self::blockedReason($template->kind)) {
            return ApiResponse::error($reason, 'ERR_VALID_001', 422);
        }

        $recipients = self::recipients($template->kind, $data['target'])->get(['users.id', 'users.name', 'users.phone']);
        if ($recipients->isEmpty()) {
            return ApiResponse::error('받을 회원이 없습니다.', 'ERR_VALID_001', 422);
        }

        $finalBody = self::finalBody($template->kind, $template->body, $template->notice_id);
        $campaign = SmsCampaign::create([
            'template_id'     => $template->id,
            'kind'            => $template->kind,
            'target'          => $data['target'],
            'body'            => $finalBody,
            'recipient_count' => $recipients->count(),
            'status'          => 'sending',
            'sent_by'         => $request->user()->id,
        ]);

        $messages = $recipients->map(fn($u) => [
            'to'   => $u->phone,
            'text' => str_replace('{이름}', $u->name ?? '회원', $finalBody),
        ])->all();

        // 큐 워커 없이도 동작하도록 응답을 먼저 돌려준 뒤 발송 (운영자 화면은 발송 기록에서 결과 확인)
        dispatch(function () use ($sms, $messages, $campaign) {
            try {
                $result = $sms->sendMany($messages);
                $campaign->update([
                    'success_count' => $result['success'],
                    'fail_count'    => $result['fail'],
                    'status'        => $result['success'] > 0 ? 'done' : 'failed',
                ]);
            } catch (\Throwable $e) {
                Log::error('[문자 발송 실패] campaign=' . $campaign->id . ' ' . $e->getMessage());
                $campaign->update(['fail_count' => count($messages), 'status' => 'failed']);
            }
        })->afterResponse();

        return ApiResponse::success(self::campaignRow($campaign->load('template:id,name', 'sender:id,name')), '발송을 시작했습니다.', 201);
    }

    // GET /api/admin/sms/campaigns — 최근 30일 발송 기록
    public function campaigns()
    {
        $items = SmsCampaign::with('template:id,name', 'sender:id,name')
            ->where('created_at', '>=', now()->subDays(30))
            ->latest()->limit(100)->get();

        return ApiResponse::success($items->map(fn(SmsCampaign $c) => self::campaignRow($c)), '발송 기록 조회 성공');
    }

    // ─── 내부 ───

    private const OPT_OUT_MISSING = '광고성 문자에 넣을 무료 수신거부 번호가 설정되지 않았습니다. (서버 SMS_AD_OPT_OUT)';

    private static function validateTemplate(Request $request): array
    {
        return $request->validate([
            'name'      => 'required|string|max:60',
            'kind'      => ['required', Rule::in(['ad', 'info'])],
            'body'      => 'required|string|max:1800',
            'notice_id' => 'nullable|integer|exists:notices,id',
        ]);
    }

    // 문자를 받을 회원: 정지·탈퇴·운영자 제외, 휴대폰 번호 있는 사람. 광고성은 마케팅 수신 동의자만.
    private static function recipients(string $kind, string $target)
    {
        // 마지막 접속 = 일일 접속 기록과 로그인 토큰 마지막 사용 시각 중 늦은 쪽
        $since = now()->subDays(30);

        return User::query()
            ->where('users.user_type', '!=', 'operator')
            ->whereNull('users.suspended_at')
            ->whereNotNull('users.phone')->where('users.phone', '!=', '')
            ->when($kind === 'ad', fn($q) => $q->whereExists(fn($s) => $s->selectRaw(1)
                ->from('notification_settings')
                ->whereColumn('notification_settings.user_id', 'users.id')
                ->where('notification_settings.marketing_opt_in', true)))
            ->when($target === 'recent30', fn($q) => $q->where('users.created_at', '>=', $since))
            ->when($target === 'inactive30', fn($q) => $q
                ->where('users.created_at', '<', $since)
                ->whereNotExists(fn($s) => $s->selectRaw(1)->from('daily_active_users')
                    ->whereColumn('daily_active_users.user_id', 'users.id')->where('daily_active_users.date', '>=', $since->toDateString()))
                ->whereNotExists(fn($s) => $s->selectRaw(1)->from('personal_access_tokens')
                    ->whereColumn('personal_access_tokens.tokenable_id', 'users.id')
                    ->where('personal_access_tokens.tokenable_type', User::class)
                    ->where('personal_access_tokens.last_used_at', '>=', $since)));
    }

    public static function finalBody(string $kind, string $body, ?int $noticeId): string
    {
        $body = trim($body);
        $link = $noticeId ? "\n" . url('/n/' . $noticeId) : '';
        if ($kind !== 'ad') {
            return $body . $link;
        }
        // 광고성: (광고) + 보내는 곳 이름(문구에 없으면 붙임) + 본문 + 링크 + 무료 수신거부
        $body = preg_replace('/^\(광고\)\s*/u', '', $body);
        if (!str_contains($body, '현장메이트')) {
            $body = '[현장메이트] ' . $body;
        }
        $optOut = trim((string) config('sms.ad_opt_out'));

        return "(광고){$body}{$link}\n{$optOut}";
    }

    private static function blockedReason(string $kind): ?string
    {
        if ($kind !== 'ad') {
            return null;
        }
        if (!trim((string) config('sms.ad_opt_out'))) {
            return self::OPT_OUT_MISSING;
        }
        $hour = (int) now()->format('G');
        if ($hour >= 21 || $hour < 8) {
            return '광고성 문자는 밤 9시부터 아침 8시까지 보낼 수 없습니다.';
        }

        return null;
    }

    // 문자 요금 기준 바이트 수 (한글 2바이트, 영문·숫자 1바이트 — EUC-KR 기준)
    private static function byteLength(string $text): int
    {
        $len = 0;
        foreach (mb_str_split($text) as $ch) {
            $len += strlen($ch) > 1 ? 2 : 1;
        }

        return $len;
    }

    private static function templateRow(SmsTemplate $t): array
    {
        $bytes = self::byteLength(str_replace('{이름}', '김철수', self::finalBody($t->kind, $t->body, $t->notice_id)));

        return [
            'id'         => $t->id,
            'name'       => $t->name,
            'kind'       => $t->kind,
            'body'       => $t->body,
            'notice_id'  => $t->notice_id,
            'notice'     => $t->notice ? ['id' => $t->notice->id, 'type' => $t->notice->type, 'title' => $t->notice->title] : null,
            'type'       => $bytes > 90 ? 'LMS' : 'SMS',
            'final_body' => self::finalBody($t->kind, $t->body, $t->notice_id),
            'updated_at' => $t->updated_at?->toIso8601String(),
        ];
    }

    private static function campaignRow(SmsCampaign $c): array
    {
        return [
            'id'              => $c->id,
            'template'        => $c->template?->name,
            'kind'            => $c->kind,
            'type'            => self::byteLength(str_replace('{이름}', '김철수', $c->body)) > 90 ? 'LMS' : 'SMS',
            'target'          => self::TARGETS[$c->target] ?? null,
            'recipient_count' => $c->recipient_count,
            'success_count'   => $c->success_count,
            'fail_count'      => $c->fail_count,
            'status'          => $c->status,
            'sent_by'         => $c->sender?->name,
            'created_at'      => $c->created_at?->toIso8601String(),
        ];
    }
}
