import { Card } from "flowbite-react";
import { notFound } from "next/navigation";
import { getHistoryById } from "@/actions/historyActions";
import { formatAdminDateTime } from "@/lib/dateUtils";

interface PageProps {
  params: { id: string };
}

export default async function TableHistoryDetailPage({ params }: PageProps) {
  const { id } = await params;
  
  let record;
  try {
    record = await getHistoryById(id);
  } catch (error) {
    notFound();
  }

  if (!record) {
    notFound();
  }

  const data = record.data as any; // The JSON data containing previous/current state

  const timestamps = {
    createdAt: data?.createdAt,
    updatedAt: data?.updatedAt,
    createdBy: data?.createdBy || data?.adminCreatedBy,
    updatedBy: data?.updatedBy || data?.adminUpdatedBy,
  };
  return (
    <div className="space-y-6">
        {/* Header - same as before */}
        <Card>
        <h5 className="text-xl font-bold">Table History Details</h5>
        {/* ... header content ... */}
        <div className="grid grid-cols-2 gap-6">
          {/* Operation Info */}
          <div className="space-y-2">
            <div><strong>Table Name:</strong> {record.tableName}</div>
                <div>
                <strong>Operation:</strong> 
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    record.operation === 'INSERT' ? 'bg-green-100 text-green-800' :
                    record.operation === 'UPDATE' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                }`}>
                    {record.operation}
                </span>
                </div>
                <div><strong>Affected ID:</strong> {record.affectedId}</div>
                <div><strong>Performed By:</strong> {record.operationPerformedByAdminId || record.operationPerformedByUserId || 'System'}</div>
            </div>
            
            {/* Timestamps */}
            <div className="space-y-2">
                <div><strong>Record Created:</strong> {
                formatAdminDateTime(timestamps.createdAt)
                }</div>
                <div><strong>Record Updated:</strong> {
                formatAdminDateTime(timestamps.updatedAt)
                }</div>
                <div><strong>Created By:</strong> {timestamps.createdBy || 'N/A'}</div>
                <div><strong>Updated By:</strong> {timestamps.updatedBy || 'N/A'}</div>
            </div>
            </div>
        </Card>

        {/* Data Display - FIXED VERSION */}
        <Card>
        <h6 className="text-lg font-semibold text-blue-600">
            {record.operation === 'INSERT' ? 'Inserted Data' : 
            record.operation === 'UPDATE' ? 'Record Data' : 'Deleted Data'}
        </h6>
        
        {/* Option 1: Fixed JSON display */}
        <div className="bg-slate-900 text-green-300 p-4 rounded overflow-auto text-sm max-h-96 font-mono">
            <pre className="whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
            </pre>
        </div>

        {/* Option 2: Structured display (recommended) */}
        {/* <div className="bg-gray-50 dark:bg-gray-800 border rounded-lg p-4 mt-4">
            <div className="space-y-3">
            {Object.entries(data).map(([key, value]) => (
                <div key={key} className="flex flex-col">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{key}:</span>
                <span className="text-gray-900 dark:text-gray-100 ml-4 break-all">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
                </div>
            ))}
            </div>
        </div>
         */}
        </Card>
    </div>
    );
}
