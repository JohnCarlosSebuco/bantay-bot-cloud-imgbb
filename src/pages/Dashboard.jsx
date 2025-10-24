import React, { useState, useEffect } from 'react';
import DeviceService from '../services/DeviceService';
import CameraSnapshot from '../components/CameraSnapshot';
import { DEVICE_CONFIG } from '../config/hardware.config';
import { translations } from '../i18n/translations';

export default function Dashboard({ language }) {
  const [cameraData, setCameraData] = useState({});
  const [mainData, setMainData] = useState({});
  const [cameraDevice, setCameraDevice] = useState(null);
  const [mainDevice, setMainDevice] = useState(null);
  const t = translations[language];

  useEffect(() => {
    // Subscribe to camera sensor data
    const unsubCamera = DeviceService.subscribeToSensorData(
      DEVICE_CONFIG.CAMERA_DEVICE_ID,
      setCameraData
    );

    // Subscribe to main board sensor data
    const unsubMain = DeviceService.subscribeToSensorData(
      DEVICE_CONFIG.MAIN_DEVICE_ID,
      setMainData
    );

    // Subscribe to device status
    const unsubCameraDev = DeviceService.subscribeToDevice(
      DEVICE_CONFIG.CAMERA_DEVICE_ID,
      setCameraDevice
    );

    const unsubMainDev = DeviceService.subscribeToDevice(
      DEVICE_CONFIG.MAIN_DEVICE_ID,
      setMainDevice
    );

    return () => {
      unsubCamera();
      unsubMain();
      unsubCameraDev();
      unsubMainDev();
    };
  }, []);

  const cameraOnline = DeviceService.isDeviceOnline(cameraDevice?.last_seen);
  const mainOnline = DeviceService.isDeviceOnline(mainDevice?.last_seen);

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-green-600">🤖 BantayBot</h1>

      {/* Device Status */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={`p-4 rounded-lg ${cameraOnline ? 'bg-green-100' : 'bg-red-100'}`}>
          <div className="text-sm text-gray-600">📷 Camera</div>
          <div className="font-bold">{cameraOnline ? t.online : t.offline}</div>
        </div>
        <div className={`p-4 rounded-lg ${mainOnline ? 'bg-green-100' : 'bg-red-100'}`}>
          <div className="text-sm text-gray-600">🤖 Main Board</div>
          <div className="font-bold">{mainOnline ? t.online : t.offline}</div>
        </div>
      </div>

      {/* Camera Snapshot */}
      <div className="mb-6 bg-white rounded-lg shadow-lg p-4">
        <h2 className="text-xl font-bold mb-4">📸 {t.cameraStream}</h2>
        <CameraSnapshot
          deviceId={DEVICE_CONFIG.CAMERA_DEVICE_ID}
          className="min-h-64"
          translations={t}
        />
        <div className="mt-3 text-sm text-gray-600">
          🐦 Birds detected today: {cameraData.birds_detected_today || 0}
        </div>
      </div>

      {/* Soil Sensors */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <h2 className="text-xl font-bold mb-4">{t.soilSensors}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600">💧 {t.humidity}</div>
            <div className="text-2xl font-bold">{mainData.soil_humidity || 0}%</div>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="text-sm text-gray-600">🌡️ {t.temperature}</div>
            <div className="text-2xl font-bold">{mainData.soil_temperature || 0}°C</div>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="text-sm text-gray-600">⚡ {t.conductivity}</div>
            <div className="text-2xl font-bold">{mainData.soil_conductivity || 0}</div>
            <div className="text-xs text-gray-500">µS/cm</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-gray-600">🧪 {t.ph}</div>
            <div className="text-2xl font-bold">{mainData.ph || 7.0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
