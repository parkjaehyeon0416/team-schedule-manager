<?php

namespace Database\Seeders;

use App\Models\{Role, Team, User, Site};
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;


class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. roles 기본 데이터
        Role::insert([
            ['id'=>1,'name'=>'superadmin','permissions'=>null,'created_at'=>now(),'updated_at'=>now()],
            ['id'=>2,'name'=>'manager',   'permissions'=>null,'created_at'=>now(),'updated_at'=>now()],
            ['id'=>3,'name'=>'member',    'permissions'=>null,'created_at'=>now(),'updated_at'=>now()],
        ]);

        // 2. 테스트 팀
        $team = Team::create([
            'name'        => '테스트팀A',
            'invite_code' => strtoupper(Str::random(6)),
            'created_by'  => 1,
        ]);

        // 3~5. 사용자 3명
        User::create(['name'=>'슈퍼관리자','email'=>'superadmin@test.com',
            'password'=>Hash::make('password123'),'role_id'=>1,'team_id'=>$team->id]);

        User::create(['name'=>'홍길동팀장','email'=>'manager@test.com',
            'password'=>Hash::make('password123'),'role_id'=>2,'team_id'=>$team->id]);
        User::create(['name'=>'김팀원',    'email'=>'member@test.com',
            'password'=>Hash::make('password123'),'role_id'=>3,'team_id'=>$team->id]);

        // 6. 테스트 현장
        Site::create(['address'=>'서울시 강남구 역삼동','apt_name'=>'테스트아파트',
            'dong'=>'101동','ho'=>'501호','area_m2'=>84.50,'team_id'=>$team->id]);

    }
}
