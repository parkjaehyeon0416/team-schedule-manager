<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SiteFile extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'site_id', 'original_name', 'stored_name',
        'mime_type', 'file_size', 'file_path', 'file_type', 'uploaded_by',
    ];
}
