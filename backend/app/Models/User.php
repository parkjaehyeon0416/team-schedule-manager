<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, SoftDeletes;

    protected $fillable = [
        'name', 'email', 'password', 'role_id', 'team_id',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    // ── 관계 설정 ──

    /**
     * belongsTo: "이 User는 하나의 Role에 속한다"
     * User::find(1)->role  →  SELECT * FROM roles WHERE id = user.role_id
     */
    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * belongsTo: "이 User는 하나의 Team에 속한다"
     */
    public function team()
    {
        return $this->belongsTo(Team::class);
    }
}
