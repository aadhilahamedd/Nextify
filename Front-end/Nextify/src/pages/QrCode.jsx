import React, { useCallback, useEffect, useRef, useState } from 'react';
import Container from 'react-bootstrap/Container';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { COMPANY } from '../utils/company';

const SITE_URL = COMPANY.website;

function openScannedValue(text) {
  const value = String(text || '').trim();
  const asUrl = /^https?:\/\//i.test(value) ? value : SITE_URL;
  window.location.assign(asUrl);
}

export default function QrCodePage() {
  const [qrSrc, setQrSrc] = useState('');
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const handledRef = useRef(false);

  useEffect(() => {
    QRCode.toDataURL(SITE_URL, {
      width: 640,
      margin: 2,
      color: { dark: '#0a0a0a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then(setQrSrc)
      .catch(() => setStatus('Could not generate the QR code.'));
  }, []);

  const stopScan = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => () => stopScan(), [stopScan]);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });

    if (result?.data && !handledRef.current) {
      handledRef.current = true;
      setStatus('QR found. Opening Nextify…');
      stopScan();
      openScannedValue(result.data);
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [stopScan]);

  const startScan = async () => {
    setStatus('');
    handledRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setScanning(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        rafRef.current = requestAnimationFrame(tick);
      });
    } catch {
      setStatus('Camera access was blocked. Allow the camera, or scan this QR with your phone camera.');
    }
  };

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: 'white', paddingTop: '140px', paddingBottom: '80px' }}>
      <Container>
        <div className="text-center mb-5">
          <p className="text-uppercase fw-semibold mb-2" style={{ color: '#a0a0a0', letterSpacing: '3px', fontSize: '0.8rem' }}>
            SCAN TO VISIT
          </p>
          <h1 className="display-5 fw-normal mb-3" style={{ fontFamily: 'Georgia, serif' }}>
            Nextify QR Code
          </h1>
          <p className="mb-0" style={{ color: '#888', maxWidth: 560, margin: '0 auto' }}>
            Scan this code with your phone camera to open the Nextify website. You can also use the scanner below.
          </p>
        </div>

        <div className="row g-4 justify-content-center">
          <div className="col-lg-5">
            <div className="h-100 p-4 p-md-5 rounded-4 text-center" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-uppercase small mb-3" style={{ color: '#eeb012', letterSpacing: 2 }}>Website QR</p>
              {qrSrc ? (
                <img
                  src={qrSrc}
                  alt="Nextify website QR code"
                  className="img-fluid rounded-3 bg-white p-3"
                  style={{ maxWidth: 320 }}
                />
              ) : (
                <p className="text-white-50">Preparing QR…</p>
              )}
              <p className="mt-3 mb-4">
                <a href={SITE_URL} className="text-decoration-none" style={{ color: '#cda274' }}>{SITE_URL}</a>
              </p>
              {qrSrc && (
                <a
                  href={qrSrc}
                  download="nextify-website-qr.png"
                  className="btn rounded-pill px-4 py-2 fw-semibold border-0"
                  style={{ background: 'linear-gradient(135deg, #a88448 0%, #c8a261 100%)', color: '#000' }}
                >
                  Download QR
                </a>
              )}
            </div>
          </div>

          <div className="col-lg-5">
            <div className="h-100 p-4 p-md-5 rounded-4" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-uppercase small mb-3" style={{ color: '#eeb012', letterSpacing: 2 }}>Scanner</p>
              <h2 className="h4 mb-3" style={{ fontFamily: 'Georgia, serif' }}>Scan with this device</h2>
              <p style={{ color: '#888' }}>
                Point the camera at a Nextify QR. When it reads the code, you will be taken to the Nextify website.
              </p>

              {scanning ? (
                <div className="mt-3">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-100 rounded-3"
                    style={{ background: '#000', minHeight: 220, objectFit: 'cover' }}
                  />
                  <canvas ref={canvasRef} hidden />
                  <button
                    type="button"
                    className="btn btn-outline-light rounded-pill px-4 py-2 mt-3"
                    onClick={stopScan}
                  >
                    Stop scanner
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn rounded-pill px-4 py-3 fw-semibold border-0 mt-2"
                  style={{ background: 'linear-gradient(135deg, #a88448 0%, #c8a261 100%)', color: '#000' }}
                  onClick={startScan}
                >
                  Open camera scanner
                </button>
              )}

              {status && <p className="mt-3 mb-0" style={{ color: '#f6d26e' }}>{status}</p>}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
