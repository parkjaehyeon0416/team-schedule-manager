<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Site extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'address', 'apt_name', 'dong', 'ho', 'area_m2', 'team_id', 'memo',
    ];

}
