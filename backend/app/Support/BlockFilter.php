<?php

namespace App\Support;

/**
 * ★ v18.72 — 차단한 사람의 콘텐츠를 쿼리에서 거르기 (Apple 1.2)
 *
 *   $blocked = $user->blockedUserIds();
 *   $query->tap(fn($q) => BlockFilter::actor($q, 'team_notices.user_id', $blocked));
 *
 *   - 차단 목록이 비어 있으면 아무 조건도 붙이지 않음.
 *   - 활동 피드처럼 출처마다 SQL limit을 걸고 PHP에서 합치는 곳이 있어서, PHP에서 나중에 빼면 개수가 모자람 → 꼭 SQL에서 거름.
 *   - 쓰는 곳: 팀 공지·팀 앨범·팀 활동만. 팀원 목록·일정·정산·근태·작업 보고서는 업무 기록이라 거르지 않음.
 */
final class BlockFilter
{
    /** 작성자 컬럼이 NOT NULL일 때 (team_notices.user_id, schedules.created_by, team_members.user_id, users.id) */
    public static function actor($query, string $column, array $blocked)
    {
        return $blocked ? $query->whereNotIn($column, $blocked) : $query;
    }

    /**
     * 작성자 컬럼이 NULL일 수 있을 때 (site_files.uploaded_by).
     *   SQL에서 `NULL NOT IN (...)`은 참이 아니라서 올린 사람이 없는 사진이 통째로 빠짐 → NULL은 남김.
     */
    public static function uploader($query, string $column, array $blocked)
    {
        return $blocked
            ? $query->where(fn($w) => $w->whereNull($column)->orWhereNotIn($column, $blocked))
            : $query;
    }
}
