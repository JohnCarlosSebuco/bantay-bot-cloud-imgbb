import React, { useState, useEffect } from 'react';
import SnapshotService from '../services/SnapshotService';

const CameraSnapshot = ({ deviceId, className = '', translations }) => {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageKey, setImageKey] = useState(Date.now());

  useEffect(() => {
    setLoading(true);
    const unsubscribe = SnapshotService.subscribeToSnapshot(
      deviceId,
      (data) => {
        if (data && data.url) {
          setSnapshot(data);
          setLoading(false);
          setError(false);
          // Update image key to force reload
          setImageKey(Date.now());
        } else {
          setLoading(false);
          setError(true);
        }
      }
    );

    return unsubscribe;
  }, [deviceId]);

  const handleImageError = () => {
    setError(true);
  };

  const handleRefresh = () => {
    setLoading(true);
    setError(false);
    setImageKey(Date.now());
  };

  if (loading) {
    return (
      <div className={`bg-gray-200 rounded-lg flex items-center justify-center min-h-64 ${className}`}>
        <div className="text-center p-8">
          <div className="text-6xl mb-3 animate-pulse">📷</div>
          <div className="text-sm text-gray-600">Loading snapshot...</div>
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className={`bg-gray-200 rounded-lg flex items-center justify-center min-h-64 ${className}`}>
        <div className="text-center p-8">
          <div className="text-6xl mb-3">📷</div>
          <div className="text-sm text-gray-600 mb-3">
            {!snapshot?.device_online ? 'Camera offline' : 'No snapshot available'}
          </div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <img
        key={imageKey}
        src={`${snapshot.url}?t=${imageKey}`}
        alt="Farm Camera Snapshot"
        className="w-full rounded-lg shadow-md"
        onError={handleImageError}
      />

      {/* Timestamp Overlay */}
      <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white text-xs px-3 py-1.5 rounded-md flex items-center gap-2">
        <span>📷</span>
        <span>{SnapshotService.getShortTimeSince(snapshot.timestamp)}</span>
      </div>

      {/* Refresh Button */}
      <button
        onClick={handleRefresh}
        className="absolute top-3 right-3 bg-white bg-opacity-90 p-2.5 rounded-full shadow-lg hover:bg-opacity-100 transition-all transform hover:scale-110"
        title="Refresh snapshot"
      >
        <span className="text-xl">🔄</span>
      </button>

      {/* Online Indicator */}
      {snapshot.device_online && (
        <div className="absolute top-3 left-3 bg-green-500 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          <span>Live</span>
        </div>
      )}
    </div>
  );
};

export default CameraSnapshot;
