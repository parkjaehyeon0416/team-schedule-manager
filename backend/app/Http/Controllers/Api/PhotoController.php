<?php
namespace App\Http\Controllers\Api;
use App\Models\SiteFile;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class PhotoController extends Controller {

    // 사진 업로드
    public function store(Request $request, $scheduleId) {
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg|max:10240', // 최대 10MB
        ]);
        $file   = $request->file('photo');
        $stored = $file->store('schedule-photos', 'public');
        $record = SiteFile::create([
            'site_id'       => $scheduleId,
            'original_name' => $file->getClientOriginalName(),
            'stored_name'   => basename($stored),
            'mime_type'     => $file->getClientMimeType(),
            'file_size'     => $file->getSize(),
            'file_path'     => $stored,
            'file_type'     => 'photo',
            'uploaded_by'   => auth()->id(),
        ]);
        return ApiResponse::success($record, "사진이 업로드되었습니다.", 201);
    }

    // 사진 삭제
    public function destroy($scheduleId, $photoId) {
        $photo = SiteFile::findOrFail($photoId);
        $photo->delete();
        return ApiResponse::success(null, "사진이 삭제되었습니다.");
    }
}
