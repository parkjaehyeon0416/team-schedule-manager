<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuoteLine extends Model
{
    protected $fillable = [
        'quote_id',
        'user_material_id',
        'name',
        'spec',
        'quantity',
        'unit',
        'unit_price',
        'amount',
        'sort_order',
    ];

    protected $casts = [
        'quantity'   => 'decimal:2',
        'unit_price' => 'decimal:2',
        'amount'     => 'decimal:2',
        'sort_order' => 'integer',
    ];

    public function quote()
    {
        return $this->belongsTo(Quote::class);
    }
}
