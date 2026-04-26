<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SiteFile extends Model
{
    use SoftDeletes;

    /**
     * 사용자 입력으로 저장 가능한 컬럼 화이트리스트.
     *
     * fillable에 등록된 컬럼만 create() / update() 시 일괄 저장됩니다.
     * 보안 기능 — 의도치 않은 컬럼 조작(예: uploaded_by를 임의로 바꿔서
     * 다른 사람 파일로 위장) 공격을 차단합니다.
     */
    protected $fillable = [
        'site_id',
        'original_name',
        'stored_name',
        'mime_type',
        'file_size',
        'file_path',
        'file_type',
        'uploaded_by',
        // ★ v11 추가 (현장 사진 구조화)
        'photo_category',  // 'before' | 'during' | 'after' | 'other'
        'description',     // 사진 캡션 (예: '거실 북쪽 벽')
        'sort_order',      // 같은 카테고리 내 정렬 순서
    ];

    /**
     * 캐스팅 — DB에서 꺼낼 때 자동으로 타입 변환.
     *
     * file_size, sort_order는 INT로 저장되지만 Laravel이 가끔
     * 문자열로 반환할 수 있어서 명시적으로 integer로 캐스팅합니다.
     */
    protected $casts = [
        'file_size'  => 'integer',
        'sort_order' => 'integer',
    ];

    /**
     * ★ v11 추가 — 카테고리별 사진 조회 스코프.
     *
     * 사용 예:
     *   SiteFile::ofCategory('before')->get();
     *   SiteFile::where('site_id', 5)->ofCategory('after')->count();
     *
     * Laravel이 'scope' 접두사를 자동으로 떼어내고 ofCategory로 인식합니다.
     */
    public function scopeOfCategory(Builder $query, string $category): Builder
    {
        return $query->where('photo_category', $category);
    }
}
