<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Team extends Model
{
    // SoftDeletes: deleted_at 컬럼 자동 처리 (기획서 12.2절 확정)
    use SoftDeletes;

    protected $fillable = ['name', 'invite_code', 'created_by'];

}
