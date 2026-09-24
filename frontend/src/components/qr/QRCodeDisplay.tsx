import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ value, size = 180, className }) => {
  return (
    <div className={`p-4 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center ${className || ''}`}>
      <QRCodeSVG
        value={value}
        size={size}
        level="H"
        includeMargin={false}
        fgColor="#000000"
        bgColor="#ffffff"
      />
    </div>
  );
};
