'use client';

import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeSVGProps {
  value: string;
  format?: 'CODE128' | 'EAN13' | 'UPC' | 'CODE39';
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  className?: string;
}

export function BarcodeSVG({
  value,
  format = 'CODE128',
  width = 1.5,
  height = 30,
  displayValue = true,
  fontSize = 10,
  className = '',
}: BarcodeSVGProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, String(value), {
        format,
        width,
        height,
        displayValue,
        fontSize,
        textMargin: 2,
        margin: 0,
        font: 'monospace',
        lineColor: '#000000',
        background: 'transparent',
      });
    } catch {
      // Fallback if invalid chars for specific format (fallback to CODE128)
      try {
        JsBarcode(svgRef.current, String(value), {
          format: 'CODE128',
          width,
          height,
          displayValue,
          fontSize,
          textMargin: 2,
          margin: 0,
          font: 'monospace',
          lineColor: '#000000',
          background: 'transparent',
        });
      } catch (e) {
        console.warn('Failed to render barcode:', e);
      }
    }
  }, [value, format, width, height, displayValue, fontSize]);

  if (!value) return null;

  return <svg ref={svgRef} className={`max-w-full inline-block ${className}`} />;
}
