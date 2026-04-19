<?php

namespace App\Http\Requests\Auth;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use App\Http\Responses\ApiResponse;

class LoginRequest extends FormRequest
{
    // authorize(): 이 요청을 허용할 조건 (true = 모두 허용)
    public function authorize(): bool { return true; }

    // rules(): 검증 규칙 정의
    public function rules(): array
    {
        return [
            'email'    => 'required|email',
            'password' => 'required|string',
        ];
    }

    // messages(): 필드별 오류 메시지 커스텀
    public function messages(): array
    {
        return [
            'email.required'    => '이메일을 입력해주세요.',
            'email.email'       => '올바른 이메일 형식이 아닙니다.',
            'password.required' => '비밀번호를 입력해주세요.',
        ];
    }

    // failedValidation(): 검증 실패 시 오류 코드 정의서 형식으로 반환
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            ApiResponse::error('입력값을 확인해주세요.', 'ERR_VALID_001', 422)
                ->setData(['errors' => $validator->errors()])
        );
    }
}
