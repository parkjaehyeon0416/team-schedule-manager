<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Responses\ApiResponse;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// 서버 상태 확인 API (로그인 없이 누구나 접근 가능)
Route::get('/test', function () {
    return ApiResponse::success(
        ['version' => '1.0', 'status' => 'running'],
        'API 서버 정상 동작 중'
    );
});

