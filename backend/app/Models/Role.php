<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $fillable = ['name', 'permissions'];

    // permissions 컬럼을 자동으로 배열로 변환
    protected $casts = [
        'permissions' => 'array',
    ];
}
