<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\SmsCampaign;
use App\Models\SmsTemplate;
use App\Models\User;
use App\Services\Sms\SmsServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

/**
 * ★ v18.43 — 운영자 웹 "문자 발송": 템플릿 관리 + 공지·이벤트 문자 발송 + 발송 기록.
 *
 * 법적 규칙(정보통신망법)을 서버에서 강제함:
 *   - 광고성(ad): 마케팅 수신 동의한 회원에게만, 맨 앞 "(광고)WorkMate", 끝에 무료 수신거부 안내,
 *     밤 9시~아침 8시 발송 금지. 수신거부 안내(SMS_AD_OPT_OUT)가 설정 안 돼 있으면 발송 막음.
 *   - 안내성(info): 서버 점검 같은 서비스 안내. 전체 회원에게 보낼 수 있음.
 * 문구 안의 {이름}은 받는 사람 이름으로 바뀜.
 */
class AdminSmsController extends Controller
{
    // ─── 템플릿 ───

    // GET /api/admin/sms/templates
    public function templates()
    {
        $items = SmsTemplate::with('notice:id,type,title')->latest()->get()
            ->map(fn(SmsTemplate $t) => self::templateRow($t));

        return ApiResponse::success($items, '템플릿 목록 조회 성공');
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

    // ─── 발송 ───

    // POST /api/admin/sms/preview  { kind, body } — 받는 사람 수, 실제 나갈 문구, 발송 가능 여부
    public function preview(Request $request)
    {
        $data = $request->validate([
            'kind' => ['required', Rule::in(['ad', 'info'])],
            'body' => 'required|string|max:1800',
        ]);

        $finalBody = self::finalBody($data['kind'], $data['body']);
        $bytes = self::byteLength(str_replace('{이름}', '홍길동', $finalBody));

        return ApiResponse::success([
            'recipient_count' => self::recipients($data['kind'])->count(),
            'final_body'      => $finalBody,
            'bytes'           => $bytes,
            'type'            => $bytes > 90 ? 'LMS' : 'SMS', // 90바이트 넘으면 장문(LMS) 요금
            'blocked_reason'  => self::blockedReason($data['kind']),
        ], '미리보기');
    }

    // POST /api/admin/sms/send  { kind, body, template_id? }
    public function send(Request $request, SmsServiceInterface $sms)
    {
        $data = $request->validate([
            'kind'        => ['required', Rule::in(['ad', 'info'])],
            'body'        => 'required|string|max:1800',
            'template_id' => 'nullable|integer|exists:sms_templates,id',
        ]);

        if ($reason = self::blockedReason($data['kind'])) {
            return ApiResponse::error($reason, 'ERR_VALID_001', 422);
        }

        $recipients = self::recipients($data['kind'])->get(['id', 'name', 'phone']);
        if ($recipients->isEmpty()) {
            return ApiResponse::error('받을 회원이 없습니다.', 'ERR_VALID_001', 422);
        }

        $finalBody = self::finalBody($data['kind'], $data['body']);
        $campaign = SmsCampaign::create([
            'template_id'     => $data['template_id'] ?? null,
            'kind'            => $data['kind'],
            'body'            => $finalBody,
            'recipient_count' => $recipients->count(),
            'status'          => 'sending',
            'sent_by'         => $request->user()->id,
        ]);

        $messages = $recipients->map(fn($u) => [
            'to'   => $u->phone,
            'text' => str_replace('{이름}', $u->name ?? '회원', $finalBody),
        ])->all();

        // 큐 워커 없이도 동작하도록 응답을 먼저 돌려준 뒤 발송 (운영자 화면은 기록 목록에서 결과 확인)
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

        return ApiResponse::success(self::campaignRow($campaign), '발송을 시작했습니다.', 201);
    }

    // GET /api/admin/sms/campaigns?page=1 — 발송 기록
    public function campaigns()
    {
        $page = SmsCampaign::with('template:id,name')->latest()->paginate(20);

        return ApiResponse::success([
            'items' => collect($page->items())->map(fn(SmsCampaign $c) => self::campaignRow($c)),
            'total' => $page->total(),
            'page'  => $page->currentPage(),
            'pages' => $page->lastPage(),
        ], '발송 기록 조회 성공');
    }

    // ─── 내부 ───

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
    private static function recipients(string $kind)
    {
        return User::query()
            ->where('user_type', '!=', 'operator')
            ->whereNull('suspended_at')
            ->whereNotNull('phone')->where('phone', '!=', '')
            ->when($kind === 'ad', fn($q) => $q->whereExists(fn($s) => $s->selectRaw(1)
                ->from('notification_settings')
                ->whereColumn('notification_settings.user_id', 'users.id')
                ->where('notification_settings.marketing_opt_in', true)));
    }

    private static function finalBody(string $kind, string $body): string
    {
        $body = trim($body);
        if ($kind !== 'ad') {
            return "[WorkMate] {$body}";
        }
        $optOut = trim((string) config('sms.ad_opt_out'));

        return "(광고)WorkMate\n{$body}\n{$optOut}";
    }

    private static function blockedReason(string $kind): ?string
    {
        if ($kind !== 'ad') {
            return null;
        }
        if (!trim((string) config('sms.ad_opt_out'))) {
            return '광고성 문자에 넣을 무료 수신거부 번호가 설정되지 않았습니다. (서버 SMS_AD_OPT_OUT)';
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
        return [
            'id'         => $t->id,
            'name'       => $t->name,
            'kind'       => $t->kind,
            'body'       => $t->body,
            'notice'     => $t->notice ? ['id' => $t->notice->id, 'type' => $t->notice->type, 'title' => $t->notice->title] : null,
            'updated_at' => $t->updated_at?->toIso8601String(),
        ];
    }

    private static function campaignRow(SmsCampaign $c): array
    {
        return [
            'id'              => $c->id,
            'template'        => $c->template?->name,
            'kind'            => $c->kind,
            'body'            => $c->body,
            'recipient_count' => $c->recipient_count,
            'success_count'   => $c->success_count,
            'fail_count'      => $c->fail_count,
            'status'          => $c->status,
            'created_at'      => $c->created_at?->toIso8601String(),
        ];
    }
}
