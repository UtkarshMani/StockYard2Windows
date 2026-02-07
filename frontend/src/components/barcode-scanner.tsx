'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { Camera, X } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    const startScanning = async () => {
      try {
        setError(null);
        setIsScanning(true);

        const videoInputDevices = await codeReader.listVideoInputDevices();
        
        if (videoInputDevices.length === 0) {
          setError('No camera found');
          return;
        }

        // Prefer back camera on mobile
        const selectedDevice = videoInputDevices.find(device => 
          device.label.toLowerCase().includes('back')
        ) || videoInputDevices[0];

        await codeReader.decodeFromVideoDevice(
          selectedDevice.deviceId,
          videoRef.current!,
          (result, error) => {
            if (result) {
              const barcode = result.getText();
              onScan(barcode);
              stopScanning();
            }
            if (error && !(error instanceof NotFoundException)) {
              console.error('Scanning error:', error);
            }
          }
        );
      } catch (err: any) {
        console.error('Error starting scanner:', err);
        setError(err.message || 'Failed to start camera');
        setIsScanning(false);
      }
    };

    startScanning();

    return () => {
      stopScanning();
    };
  }, []);

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setIsScanning(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-50 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Camera className="h-6 w-6" />
          <span className="font-semibold">Scan Barcode</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
        >
          <X className="h-6 w-6 text-white" />
        </button>
      </div>

      <div className="flex-1 relative">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="border-2 border-white w-64 h-64 rounded-lg opacity-50"></div>
        </div>
      </div>

      {error && (
        <div className="absolute bottom-20 left-0 right-0 mx-4 p-4 bg-red-500 text-white rounded-lg">
          {error}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-black bg-opacity-50 text-white text-center">
        <p className="text-sm">Position the barcode within the frame</p>
        {isScanning && (
          <div className="mt-2 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        )}
      </div>
    </div>
  );
}
