import Pagination from "@/components/Pagination";
import { parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";
import { Button, Card, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import Link from "next/link";
import { HiEye } from "react-icons/hi";
import { getTableHistory } from "@/actions/historyActions";

export default async function TableHistoryPage({ searchParams }: ServerPageProps) {
  const { limit, offset } = parseLimitOffset(await searchParams);
  
  const { data: historyData, totalCount } = await getTableHistory(searchParams);

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full">
        <div className="space-between flex w-full flex-row items-center">
          <div className="flex w-full flex-col gap-2">
            {/* Header */}
            <div className="flex w-full flex-row items-center justify-between">
              <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Table History
              </h5>
              <div className="text-sm text-gray-500">
                Total Records: {totalCount}
              </div>
            </div>
            
            {/* Stats Summary */}
            <div className="flex gap-4 text-sm text-gray-600 pb-3">
              <span>Showing {offset + 1} - {Math.min(offset + limit, totalCount)} of {totalCount}</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="w-full table-auto overflow-x-auto rounded-xl bg-slate-100 p-5 dark:bg-gray-900">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>S. No.</TableHeadCell>
                <TableHeadCell>ID</TableHeadCell>
                <TableHeadCell>Changed By Admin</TableHeadCell>
                <TableHeadCell>Changed By User</TableHeadCell>
                <TableHeadCell>Table Name</TableHeadCell>
                <TableHeadCell>Operation Type</TableHeadCell>
                {/* <TableHeadCell>Affected Record</TableHeadCell>
                <TableHeadCell>Date</TableHeadCell> */}
                <TableHeadCell>Actions</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {historyData.map((record, index) => (
                <TableRow 
                  key={record.id}
                  className="bg-white dark:border-gray-700 dark:bg-gray-800"
                >
                  <TableCell>{offset + index + 1}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {record.id.substring(0, 8)}...
                  </TableCell>
                  <TableCell className="font-medium">
                    {record.adminName || 'N/A'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {record.userName || 'N/A'}
                  </TableCell>
                  <TableCell className="font-medium">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                      {record.tableName}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      record.operation === 'INSERT' ? 'bg-green-100 text-green-800' :
                      record.operation === 'UPDATE' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {record.operation}
                    </span>
                  </TableCell>
                  {/* <TableCell className="font-mono text-xs">
                    {record.affectedId ? record.affectedId.substring(0, 8) + '...' : 'N/A'}
                  </TableCell> */}
                  {/* <TableCell className="text-sm">
                    {record.createdAt ? new Date(record.createdAt).toLocaleString() : 'N/A'}
                  </TableCell> */}
                  <TableCell>
                    <Link href={`/admin/history/${record.id}`}>
                      <Button size="sm" color="blue">
                        <HiEye className="mr-1 h-3 w-3" />
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              
              {/* Empty State */}
              {historyData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                    No table history records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination Component */}
        <Pagination />
      </Card>
    </div>
  );
}