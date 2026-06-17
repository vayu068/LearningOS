import React from "react";

export interface Document {
  id: string;
  name: string;
  type: string;
  issuer: string;
  issueDate: string;
  verified: boolean;
}

export interface DigiLockerConnectProps {
  connected?: boolean;
  documents?: Document[];
  onConnect: () => void;
  onDisconnect?: () => void;
  onPullDocument?: (docType: string) => void;
  onViewDocument?: (docId: string) => void;
  loading?: boolean;
  availableDocTypes?: string[];
}

export function DigiLockerConnect({
  connected = false,
  documents = [],
  onConnect,
  onDisconnect,
  onPullDocument,
  onViewDocument,
  loading = false,
  availableDocTypes = ["Marksheet", "Certificate", "Degree", "ID Card"],
}: DigiLockerConnectProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            DL
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">DigiLocker</h3>
            <p className="text-xs text-gray-500">Digital Document Verification</p>
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
              {onDisconnect && (
                <button
                  onClick={onDisconnect}
                  className="text-xs text-red-600 hover:underline"
                >
                  Disconnect
                </button>
              )}
            </div>

            {/* Pull documents */}
            {onPullDocument && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Pull a document from DigiLocker:</p>
                <div className="flex flex-wrap gap-2">
                  {availableDocTypes.map((docType) => (
                    <button
                      key={docType}
                      onClick={() => onPullDocument(docType)}
                      disabled={loading}
                      className="px-3 py-1.5 text-xs font-medium border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                    >
                      {docType}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Documents list */}
            {documents.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Your Documents</h4>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => onViewDocument?.(doc.id)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                        <p className="text-xs text-gray-500">{doc.issuer} - {doc.issueDate}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.verified && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                            Verified
                          </span>
                        )}
                        <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                          {doc.type}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Connect your DigiLocker account to verify and pull academic documents
              digitally. All documents are cryptographically signed and tamper-proof.
            </p>
            <button
              onClick={onConnect}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Connecting..." : "Connect DigiLocker"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
