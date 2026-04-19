import { Typography } from "antd";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";

// 테이블에 표시할 데이터 타입 정의
type TeamMember = {
  id: number;
  name: string;
  email: string;
  role: string;
};

// 테스트용 더미 데이터 (나중에 API 데이터로 교체)
const dummyData: TeamMember[] = [
  { id: 1, name: "홍길동팀장", email: "manager@test.com", role: "팀장" },
  { id: 2, name: "김팀원", email: "member@test.com", role: "팀원" },
];

// 컬럼(열) 정의 — 어떤 데이터를 어떤 제목으로 보여줄지 설정
const columns: ColumnDef<TeamMember>[] = [
  { accessorKey: "id", header: "ID" },
  { accessorKey: "name", header: "이름" },
  { accessorKey: "email", header: "이메일" },
  { accessorKey: "role", header: "역할" },
];

export default function Teams() {
  // useReactTable: 테이블을 만드는 함수
  // data: 표에 넣을 데이터 배열
  // columns: 열(컬럼) 설정
  // getCoreRowModel(): 기본 행 출력 설정
  const table = useReactTable({
    data: dummyData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div>
      <Typography.Title level={4}>팀/팀원 관리</Typography.Title>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  style={{
                    border: "1px solid #ddd",
                    padding: "8px 12px",
                    background: "#1F3864",
                    color: "white",
                    textAlign: "left",
                  }}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  style={{ border: "1px solid #ddd", padding: "8px 12px" }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
