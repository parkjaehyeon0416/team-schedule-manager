<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CorsMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        // OPTIONS 요청 (Preflight) 즉시 허용
        if ($request->getMethod() === 'OPTIONS') {
            return response('', 200)
                ->header('Access-Control-Allow-Origin', '*')
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
        }

        $response = $next($request);

        // ★ v12 수정 — response()->download() 등 BinaryFileResponse(Symfony)는
        //   Illuminate\Http\Response의 ->header() 매크로가 없어 에러가 났음.
        //   모든 응답 타입에 공통으로 존재하는 headers(HeaderBag)->set()으로 교체.
        $response->headers->set('Access-Control-Allow-Origin', '*');
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

        return $response;
    }
}
