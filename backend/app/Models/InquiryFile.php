<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * ★ v18.43 — 고객 문의 첨부 사진
 */
class InquiryFile extends Model
{
    protected $fillable = ['inquiry_id', 'path'];
}
