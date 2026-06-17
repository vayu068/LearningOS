import React from "react";

export interface CreditRecord {
  id: string;
  courseName: string;
  institution: string;
  credits: number;
  grade: string;
  semester: string;
  year: string;
  status: "verified" | "pending" | "transferred";
}

export interface ABCIntegrationProps {
  connected?: boolean;
  abcId?: string;
  totalCredits?: number;
  creditRecords?: CreditRecord[];
  onConnect: () => void;
  onRequestTransfer?: (creditId: string) => void;
  onViewDetails?: (creditId: string) => void;
  loading?: boolean;
}

export function ABCIntegration({
  connected = false,
  abcId,
  totalCredits = 0,
  creditRecords = [],
  onConnect,
  onRequestTransfer,
  onViewDetails,
  loading = false,
}: ABCIntegrationProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            AB
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Academic Bank of Credits</h3>
            <p className="text-xs text-gray-500">Credit accumulation and transfer</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {connected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm font-medium text-green-700">Connected</span>
              </div>
              {abcId && (
                <span className="text-xs text-gray-500 font-mono">ID: {abcId}</span>
              )}
            </div>

            {/* Credit summary */}
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-xs text-green-600 font-medium">Total Credits Accumulated</p>
              <p className="text-3xl font-bold text-green-800">{totalCredits}</p>
            </div>

            {/* Credit records */}
            {creditRecords.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Credit Records</h4>
                <div className="space-y-2">
                  {creditRecords.map((record) => (
                    <div
                      key={record.id}
                      className="p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{record.courseName}</p>
                          <p className="text-xs text-gray-500">{record.institution}</p>
                          <p className="text-xs text-gray-400">{record.semester} {record.year}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">{record.credits} cr</p>
                          <p className="text-xs text-gray-500">Grade: {record.grade}</p>
                          <span
                            className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full font-medium ${
                              record.status === "verified"
                                ? "bg-green-100 text-green-700"
                                : record.status === "transferred"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {record.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2">
                        {onViewDetails && (
                          <button
                            onClick={() => onViewDetails(record.id)}
                            className="text-xs text-primary-600 hover:underline"
                          >
                            View Details
                          </button>
                        )}
                        {onRequestTransfer && record.status === "verified" && (
                          <button
                            onClick={() => onRequestTransfer(record.id)}
                            className="text-xs text-green-600 hover:underline"
                          >
                            Request Transfer
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Connect to the Academic Bank of Credits (ABC) to view your accumulated
              credits across institutions and request credit transfers.
            </p>
            <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
              <li>Store and track credits from multiple institutions</li>
              <li>Request credit transfers between universities</li>
              <li>Enable multiple entry and exit in higher education</li>
            </ul>
            <button
              onClick={onConnect}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Connecting..." : "Connect to ABC"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
