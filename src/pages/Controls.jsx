import React, { useState, useEffect } from 'react';
import CommandService from '../services/CommandService';
import DeviceService from '../services/DeviceService';
import { DEVICE_CONFIG, AUDIO_CONFIG } from '../config/hardware.config';
import { translations } from '../i18n/translations';

export default function Controls({ language }) {
  const [mainData, setMainData] = useState({});
  const t = translations[language];

  useEffect(() => {
    const unsub = DeviceService.subscribeToSensorData(
      DEVICE_CONFIG.MAIN_DEVICE_ID,
      setMainData
    );
    return unsub;
  }, []);

  const handleAudioControl = async (action) => {
    switch (action) {
      case 'play':
        await CommandService.playAudio(DEVICE_CONFIG.MAIN_DEVICE_ID);
        break;
      case 'stop':
        await CommandService.stopAudio(DEVICE_CONFIG.MAIN_DEVICE_ID);
        break;
      case 'next':
        await CommandService.nextTrack(DEVICE_CONFIG.MAIN_DEVICE_ID);
        break;
      case 'prev':
        await CommandService.prevTrack(DEVICE_CONFIG.MAIN_DEVICE_ID);
        break;
    }
  };

  const handleRotate = async (direction) => {
    switch (direction) {
      case 'left':
        await CommandService.rotateLeft(DEVICE_CONFIG.MAIN_DEVICE_ID);
        break;
      case 'center':
        await CommandService.rotateCenter(DEVICE_CONFIG.MAIN_DEVICE_ID);
        break;
      case 'right':
        await CommandService.rotateRight(DEVICE_CONFIG.MAIN_DEVICE_ID);
        break;
    }
  };

  const handleServo = async (action) => {
    switch (action) {
      case 'oscillate':
        await CommandService.oscillateArms(DEVICE_CONFIG.MAIN_DEVICE_ID);
        break;
      case 'stop':
        await CommandService.stopOscillate(DEVICE_CONFIG.MAIN_DEVICE_ID);
        break;
      case 'rest':
        await CommandService.armsRest(DEVICE_CONFIG.MAIN_DEVICE_ID);
        break;
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-green-600">🎮 {t.controls}</h1>

      {/* Audio Controls */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">🔊 {t.audioControls}</h2>
        <div className="flex justify-center space-x-4 mb-4">
          <button
            onClick={() => handleAudioControl('prev')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-bold"
          >
            ⏮️ {t.previous}
          </button>
          <button
            onClick={() => handleAudioControl('play')}
            className="px-6 py-3 bg-green-500 text-white rounded-lg font-bold"
          >
            ▶️ {t.play}
          </button>
          <button
            onClick={() => handleAudioControl('stop')}
            className="px-6 py-3 bg-red-500 text-white rounded-lg font-bold"
          >
            ⏹️ {t.stop}
          </button>
          <button
            onClick={() => handleAudioControl('next')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-bold"
          >
            ⏭️ {t.next}
          </button>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-600">{t.track}: {mainData.current_track || 1}</div>
          <div className="text-sm text-gray-600">{t.volume}: {mainData.volume || AUDIO_CONFIG.DEFAULT_VOLUME}</div>
        </div>
      </div>

      {/* Motor Controls */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">↻ {t.motorControls}</h2>
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => handleRotate('left')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-bold"
          >
            ← {t.rotateLeft}
          </button>
          <button
            onClick={() => handleRotate('center')}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-bold"
          >
            ● {t.rotateCenter}
          </button>
          <button
            onClick={() => handleRotate('right')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-bold"
          >
            {t.rotateRight} →
          </button>
        </div>
        <div className="text-center mt-4">
          <div className="text-sm text-gray-600">{t.headPosition}: {mainData.head_position || 0}°</div>
        </div>
      </div>

      {/* Servo Controls */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">🦾 {t.servoControls}</h2>
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => handleServo('oscillate')}
            className="px-6 py-3 bg-green-500 text-white rounded-lg font-bold"
          >
            🔄 {t.oscillate}
          </button>
          <button
            onClick={() => handleServo('stop')}
            className="px-6 py-3 bg-red-500 text-white rounded-lg font-bold"
          >
            ⏹️ {t.stopOscillate}
          </button>
          <button
            onClick={() => handleServo('rest')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-bold"
          >
            😴 {t.rest}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="text-center p-3 bg-gray-100 rounded-lg">
            <div className="text-sm text-gray-600">{t.leftArm}</div>
            <div className="font-bold">{mainData.left_arm_angle || 90}°</div>
          </div>
          <div className="text-center p-3 bg-gray-100 rounded-lg">
            <div className="text-sm text-gray-600">{t.rightArm}</div>
            <div className="font-bold">{mainData.right_arm_angle || 90}°</div>
          </div>
        </div>
      </div>
    </div>
  );
}
