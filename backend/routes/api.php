<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// 서버 상태 확인 API (로그인 없이 누구나 접근 가능)
Route::get('/status', function () {
    return response()->json([
        'success' => true,
        'message' => 'Team Schedule Manager API 정상 동작 중',
        'version' => '1.0.0',
        'timestamp' => now()->toDateTimeString(),
    ]);
});
