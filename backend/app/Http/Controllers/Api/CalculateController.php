<?php
namespace App\Http\Controllers\Api;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class CalculateController extends Controller {

    public function area(Request $request) {
        $data = $request->validate([
            'work_type' => 'required|in:도배,타일,필름',
            // 도배용
            'width'     => 'required_if:work_type,도배|numeric|min:0',  // 가로(m)
            'length'    => 'required_if:work_type,도배|numeric|min:0',  // 세로(m)
            'height'    => 'required_if:work_type,도배|numeric|min:0',  // 높이(m)
            // 타일·필름용
            'area_m2'   => 'required_if:work_type,타일|required_if:work_type,필름|numeric|min:0',
            // 타일 규격 (mm)
            'tile_w'    => 'required_if:work_type,타일|numeric|min:1',
            'tile_h'    => 'required_if:work_type,타일|numeric|min:1',
            // 필름 폭 (cm)
            'film_width'=> 'required_if:work_type,필름|numeric|min:1',
            // 손실률 (사용자 커스텀 가능, 기본값은 서버에서 설정)
            'loss_rate' => 'nullable|numeric|min:0|max:1', // 0.10 = 10%
        ]);

        $result = [];

        if ($data['work_type'] === '도배') {
            $loss = $data['loss_rate'] ?? 0.10;
            $wallArea    = ($data['width'] + $data['length']) * 2 * $data['height'];
            $ceilingArea = $data['width'] * $data['length'];
            $totalArea   = $wallArea + $ceilingArea;
            $pyeong      = round($totalArea / 3.3, 1);
            $rolls       = ceil($totalArea / 5.3 * (1 + $loss));
            $result = ['pyeong'=>$pyeong, 'rolls'=>$rolls, 'total_m2'=>round($totalArea,2)];

        } elseif ($data['work_type'] === '타일') {
            $loss      = $data['loss_rate'] ?? 0.15;
            $tileArea  = ($data['tile_w'] / 1000) * ($data['tile_h'] / 1000); // ㎡ 변환
            $tiles     = ceil($data['area_m2'] / $tileArea * (1 + $loss));
            $pyeong    = round($data['area_m2'] / 3.3, 1);
            $result = ['pyeong'=>$pyeong, 'tiles'=>$tiles, 'total_m2'=>$data['area_m2']];

        } else { // 필름
            $loss       = $data['loss_rate'] ?? 0.10;
            $filmWidthM = $data['film_width'] / 100; // cm → m 변환
            $filmLength = ceil($data['area_m2'] / $filmWidthM * (1 + $loss));
            $pyeong     = round($data['area_m2'] / 3.3, 1);
            $result = ['pyeong'=>$pyeong, 'film_length_m'=>$filmLength, 'total_m2'=>$data['area_m2']];
        }

        return ApiResponse::success($result, '평수 계산 완료');
    }
}

