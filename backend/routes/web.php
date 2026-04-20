<?php

use Illuminate\Support\Facades\Route;

// API 백엔드 전용 — 웹 페이지는 React 프론트엔드에서 제공
Route::get('/', function () {
    return response()->json([
        'app' => 'Team Schedule Manager API',
        'version' => '1.0',
        'status' => 'running',
    ]);
});
