import React, { useState, useEffect } from 'react';
import DeviceService from '../services/DeviceService';
import CameraSnapshot from '../components/CameraSnapshot';
import { DEVICE_CONFIG } from '../config/hardware.config';
import { translations } from '../i18n/translations';
import {
  SoilSensorCard,
  BirdDetectionCard,
  StatusIndicator
} from '../components/ui';

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
    <div className="min-h-screen bg-secondary p-4 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
          🤖 BantayBot
        </h1>
        <p className="text-secondary">
          {language === 'tl' ? 'Smart Agriculture Monitoring' : 'Smart Agriculture Monitoring'}
        </p>
      </div>

      {/* System Status Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatusIndicator
          status={cameraOnline ? 'online' : 'offline'}
          label={language === 'tl' ? 'Camera System' : 'Camera System'}
          lastUpdate={cameraDevice?.last_seen}
          connectionStrength={cameraOnline ? 85 : 0}
          language={language}
          size="medium"
        />
        <StatusIndicator
          status={mainOnline ? 'online' : 'offline'}
          label={language === 'tl' ? 'Main Board' : 'Main Board'}
          lastUpdate={mainDevice?.last_seen}
          connectionStrength={mainOnline ? 92 : 0}
          batteryLevel={mainOnline ? 78 : null}
          language={language}
          size="medium"
        />
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-primary rounded-2xl p-6 shadow-lg border border-primary animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-success/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🌱</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-primary">
                {language === 'tl' ? 'Kalusugan ng Halaman' : 'Plant Health'}
              </h3>
              <p className="text-sm text-success font-medium">
                {language === 'tl' ? 'Mabuti' : 'Good'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-primary rounded-2xl p-6 shadow-lg border border-primary animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-info/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🐦</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-primary">
                {language === 'tl' ? 'Mga Ibon Ngayon' : 'Birds Today'}
              </h3>
              <p className="text-sm text-info font-medium">
                {cameraData.birds_detected_today || 0} {language === 'tl' ? 'nakita' : 'detected'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="space-y-6">
        {/* Soil Monitoring Card */}
        <SoilSensorCard
          humidity={mainData.soil_humidity || 0}
          temperature={mainData.soil_temperature || 0}
          conductivity={mainData.soil_conductivity || 0}
          ph={mainData.ph || 7.0}
          language={language}
          className="w-full"
        />

        {/* Bird Detection Card */}
        <BirdDetectionCard
          isDetecting={cameraData.bird_detected || false}
          lastDetectionTime={cameraData.last_bird_detection}
          detectionCount={cameraData.birds_detected_today || 0}
          detectionSensitivity={75}
          language={language}
          className="w-full"
        />

        {/* Camera Stream Section */}
        <div className="bg-primary rounded-2xl p-6 shadow-lg border border-primary hover-lift transition-all animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-info rounded-xl flex items-center justify-center">
              <span className="text-2xl">📹</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-primary">
                {language === 'tl' ? 'LIVE CAMERA' : 'LIVE CAMERA'}
              </h3>
              <p className="text-sm text-secondary">
                {language === 'tl' ? 'Real-time na pagsusuri' : 'Real-time monitoring'}
              </p>
            </div>
            <div className="ml-auto">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                cameraOnline ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
              }`}>
                {cameraOnline ? 'LIVE' : 'OFFLINE'}
              </div>
            </div>
          </div>

          <div className="bg-tertiary rounded-xl overflow-hidden">
            <CameraSnapshot
              deviceId={DEVICE_CONFIG.CAMERA_DEVICE_ID}
              className="min-h-64 w-full"
              translations={t}
            />
          </div>

          <div className="mt-4 pt-4 border-t border-secondary flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${cameraOnline ? 'bg-success animate-pulse' : 'bg-error'}`}></div>
              <span className="text-xs text-secondary">
                {language === 'tl' ? 'AI Detection' : 'AI Detection'}
              </span>
            </div>
            <span className="text-xs text-tertiary">
              {language === 'tl' ? 'ESP32-CAM' : 'ESP32-CAM'}
            </span>
          </div>
        </div>

        {/* Environmental Overview */}
        <div className="bg-primary rounded-2xl p-6 shadow-lg border border-primary animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-warning/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🌤️</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-primary">
                {language === 'tl' ? 'KAPALIGIRAN' : 'ENVIRONMENT'}
              </h3>
              <p className="text-sm text-secondary">
                {language === 'tl' ? 'Kondisyon ng paligid' : 'Environmental conditions'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-tertiary rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">🌡️</div>
              <div className="text-lg font-bold text-primary">25°C</div>
              <div className="text-xs text-secondary">
                {language === 'tl' ? 'Temperatura' : 'Temperature'}
              </div>
            </div>
            <div className="bg-tertiary rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">💨</div>
              <div className="text-lg font-bold text-primary">65%</div>
              <div className="text-xs text-secondary">
                {language === 'tl' ? 'Humidity' : 'Humidity'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
