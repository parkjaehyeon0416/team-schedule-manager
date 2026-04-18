<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ScheduleUser extends Model
{
    use SoftDeletes;

    protected $fillable = ['schedule_id', 'user_id'];
}
