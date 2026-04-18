<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Schedule extends Model
{
    use SoftDeletes

    protected $fillable = ['site_id', 'team_id', 'date', 'status', 'memo'];
}
