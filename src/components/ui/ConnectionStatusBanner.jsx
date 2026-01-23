import React from 'react';
import { CloudOff, RefreshCw, WifiOff } from 'lucide-react';

export default function ConnectionStatusBanner({
  pwaOnline = true,
  botConnectionState = 'unknown',
  queuedCommands = 0,
  isSyncing = false,
  onRetry,
  language = 'en'
}) {
  const t = language === 'tl' ? {
    pwaOffline: 'Ikaw ay offline',
    botOffline: 'Bot offline - nagbabantay pa rin',
    syncing: 'Nagsi-sync ng data...',
    unreachable: 'Hindi maabot ang bot',
    queued: 'nakapila'
  } : {
    pwaOffline: 'You are offline',
    botOffline: 'Bot offline - still protecting crops',
    syncing: 'Syncing queued data...',
    unreachable: 'Cannot reach bot locally',
    queued: 'queued'
  };

  if (isSyncing) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
        <RefreshCw size={16} className="text-yellow-500 animate-spin" />
        <span className="text-xs text-gray-300 font-medium">{t.syncing}</span>
        {queuedCommands > 0 && (
          <span className="text-xs text-gray-500">({queuedCommands} {t.queued})</span>
        )}
      </div>
    );
  }

  if (!pwaOnline) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudOff size={16} className="text-red-400" />
          <span className="text-xs text-gray-300 font-medium">{t.pwaOffline}</span>
        </div>
        {queuedCommands > 0 && (
          <span className="text-xs text-gray-500">{queuedCommands} {t.queued}</span>
        )}
      </div>
    );
  }

  if (botConnectionState === 'offline') {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudOff size={16} className="text-yellow-400" />
          <span className="text-xs text-gray-300 font-medium">{t.botOffline}</span>
        </div>
        {onRetry && <button onClick={onRetry} className="text-xs text-blue-400 underline">{language === 'tl' ? 'I-retry' : 'Retry'}</button>}
      </div>
    );
  }

  if (botConnectionState === 'unreachable') {
    return (
      <div className="bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <WifiOff size={16} className="text-gray-400" />
          <span className="text-xs text-gray-300 font-medium">{t.unreachable}</span>
        </div>
        {onRetry && <button onClick={onRetry} className="text-xs text-blue-400 underline">{language === 'tl' ? 'I-retry' : 'Retry'}</button>}
      </div>
    );
  }

  return null;  // Online - no banner
}
