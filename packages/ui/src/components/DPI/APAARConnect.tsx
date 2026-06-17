import React, { useState } from "react";

export interface APAARConnectProps {
  connected?: boolean;
  studentId?: string;
  studentName?: string;
  lastSynced?: string;
  onConnect: () => void;
  onSync?: () => void;
  onDisconnect?: () => void;
  onManageConsent?: () => void;
  loading?: boolean;
}

export function APAARConnect({
  connected = false,
  studentId,
  studentName,
  lastSynced,
  onConnect,
  onSync,
  onDisconnect,
  onManageConsent,
  loading = false,
}: APAARConnectProps) {
  const [showConsent, setShowConsent] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            AP
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">APAAR ID</h3>
            <p className="text-xs text-gray-500">Automated Permanent Academic Account Registry</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm font-medium text-green-700">Connected</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">APAAR ID</span>
                <span className="text-sm font-mono font-medium text-gray-900">{studentId}</span>
              </div>
              {studentName && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Name</span>
                  <span className="text-sm font-medium text-gray-900">{studentName}</span>
                </div>
              )}
              {lastSynced && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Last Synced</span>
                  <span className="text-sm text-gray-700">{lastSynced}</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {onSync && (
                <button
                  onClick={onSync}
                  disabled={loading}
                  className="px-3 py-1.5 text-sm font-medium text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50 disabled:opacity-50"
                >
                  Sync Now
                </button>
              )}
              {onManageConsent && (
                <button
                  onClick={onManageConsent}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Manage Consent
                </button>
              )}
              {onDisconnect && (
                <button
                  onClick={onDisconnect}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Connect your APAAR ID to sync your academic records across institutions.
              Your unique student ID follows you throughout your educational journey.
            </p>
            {!showConsent ? (
              <button
                onClick={() => setShowConsent(true)}
                className="w-full py-2.5 px-4 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
              >
                Connect APAAR ID
              </button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <p className="font-medium mb-1">Consent Required</p>
                  <p>By connecting your APAAR ID, you consent to sharing your academic identity
                  and records with this institution for educational purposes.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConsent(false)}
                    className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onConnect}
                    disabled={loading}
                    className="flex-1 py-2 px-4 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50"
                  >
                    {loading ? "Connecting..." : "I Consent & Connect"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
