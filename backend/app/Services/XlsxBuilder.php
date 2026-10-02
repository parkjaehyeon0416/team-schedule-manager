<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * ★ v18.40 — 진짜 엑셀(.xlsx) 파일 만들기 (이전엔 CSV를 "엑셀"로 내려줬음)
 *
 * 시트별로 행 배열을 받아 첫 행은 굵게, 숫자는 숫자 셀(천 단위 쉼표)로, 열 너비는 자동으로 맞춘다.
 *   XlsxBuilder::download('파일명.xlsx', ['요약' => [[헤더...], [값...]], '원본 일정' => [...]]);
 */
class XlsxBuilder
{
    /** @param array<string, array<int, array<int, mixed>>> $sheets */
    public static function download(string $filename, array $sheets): StreamedResponse
    {
        $book = new Spreadsheet();
        $book->removeSheetByIndex(0);

        foreach ($sheets as $title => $rows) {
            $sheet = $book->createSheet();
            // 시트 이름은 31자 제한, 일부 특수문자 불가
            $sheet->setTitle(mb_substr(str_replace(['\\', '/', '?', '*', '[', ']', ':'], ' ', $title), 0, 31));

            foreach (array_values($rows) as $r => $row) {
                foreach (array_values($row) as $c => $value) {
                    $cell = $sheet->getCell([$c + 1, $r + 1]);
                    if (is_numeric($value) && $r > 0) {
                        $cell->setValue(0 + $value);
                        $cell->getStyle()->getNumberFormat()->setFormatCode(
                            floor((float) $value) == (float) $value ? '#,##0' : '#,##0.0#'
                        );
                    } else {
                        $cell->setValueExplicit((string) $value, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                    }
                }
            }

            $lastCol = $sheet->getHighestColumn();
            $sheet->getStyle("A1:{$lastCol}1")->getFont()->setBold(true);
            foreach (range(1, \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($lastCol)) as $col) {
                $sheet->getColumnDimensionByColumn($col)->setAutoSize(true);
            }
        }

        $book->setActiveSheetIndex(0);

        return response()->streamDownload(function () use ($book) {
            (new Xlsx($book))->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
