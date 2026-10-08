<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Services\OperatorInviteService;
use Illuminate\Http\Request;

/**
 * ★ v18.56 — 관리 웹 운영자 관리 (디자인 ADMIN_OPERATORS / ADMIN_OPERATOR_INVITE 예정)
 * GET    /admin/operators              목록(상태: active=비밀번호 설정함, invited=링크만 받음)
 * POST   /admin/operators              초대 {name, email, phone} → 비밀번호 설정 링크 문자
 * POST   /admin/operators/{id}/resend  링크 다시 보내기
 * DELETE /admin/operators/{id}         삭제(본인은 불가)
 */
class AdminOperatorController extends Controller
{
    public function index(Request $request)
    {
        $me = $request->user()->id;
        $rows = User::where('user_type', 'operator')->orderBy('created_at')->get()
            ->map(fn(User $u) => [
                'id'            => $u->id,
                'name'          => $u->name,
                'email'         => $u->email,
                'phone'         => OperatorInviteService::mask($u->operator_phone),
                'status'        => $u->password_set_at ? 'active' : 'invited',
                'last_login_at' => $u->last_login_at?->toIso8601String(),
                'created_at'    => $u->created_at?->toIso8601String(),
                'is_me'         => $u->id === $me,
            ]);

        return ApiResponse::success(['operators' => $rows]);
    }

    public function store(Request $request, OperatorInviteService $invites)
    {
        $data = $request->validate([
            'name'  => 'required|string|max:50',
            'email' => 'required|email|max:255',
            'phone' => ['required', 'string', 'regex:/^01[016789]-?\d{3,4}-?\d{4}$/'],
        ], [
            'phone.regex' => '휴대폰 번호를 확인해주세요. (예: 010-1234-5678)',
        ]);

        [$user, $why] = $invites->invite($data['name'], $data['email'], $data['phone']);
        if ($why) {
            return ApiResponse::error(
                $why === 'member_email' ? '이미 앱 회원이 쓰는 이메일이에요. 다른 이메일을 써주세요.' : '이미 등록된 운영자예요.',
                $why === 'member_email' ? 'ERR_OPERATOR_001' : 'ERR_OPERATOR_002',
                422
            );
        }

        return ApiResponse::success(['id' => $user->id, 'name' => $user->name], "{$user->name}님에게 초대 문자를 보냈어요", 201);
    }

    public function resend(int $id, OperatorInviteService $invites)
    {
        $user = User::where('user_type', 'operator')->findOrFail($id);
        if (!$invites->sendLink($user)) {
            return ApiResponse::error('휴대폰 번호가 없어 링크를 보낼 수 없어요.', 'ERR_OPERATOR_003', 422);
        }
        return ApiResponse::success(null, '비밀번호 설정 링크를 다시 보냈어요');
    }

    public function destroy(Request $request, int $id)
    {
        $user = User::where('user_type', 'operator')->findOrFail($id);
        if ($user->id === $request->user()->id) {
            return ApiResponse::error('내 계정은 삭제할 수 없어요.', 'ERR_OPERATOR_004', 422);
        }
        $user->tokens()->delete();
        $user->forceDelete(); // 운영자는 쌓인 데이터가 없음(답변·발송 기록의 작성자는 null로 남음)
        return ApiResponse::success(null, '운영자를 삭제했어요');
    }
}
