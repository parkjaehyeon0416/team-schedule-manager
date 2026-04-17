<?php

use Illuminate\Support\Facades\Route;

// React SPA 진입점
// 모든 웹 경로를 index.html(React 앱)으로 보냄
// API는 routes/api.php 에서 처리
Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');
