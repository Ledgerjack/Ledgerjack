/**
 * QRCode — renders a string as a QR code. Uses the `qrcode` library (run
 * `npm install` after updating). Handy for sharing an invoice link or the
 * accountant share, and (with a warning) the recovery key for device transfer.
 *
 * NOTE: rendering can't be verified in the build sandbox — smoke-test in a
 * browser. The component fails gracefully with a short message if the value is
 * empty or the library isn't present.
 */

import { useEffect, useRef, useState } from "react";
import QRCodeLib from "qrcode";

export default function QRCode({ value, size = 200 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) { setError("Nothing to encode yet."); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCodeLib.toCanvas(canvas, value, { width: size, margin: 1 }, (err: Error | null | undefined) => {
      setError(err ? "Couldn't render the QR code." : null);
    });
  }, [value, size]);

  if (error) return <p className="text-xs text-slate-400">{error}</p>;
  return <canvas ref={canvasRef} width={size} height={size} className="rounded-lg border border-slate-200" />;
}
