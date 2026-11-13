import React, { useCallback, useEffect, useRef, useState } from 'react';
import Container from 'react-bootstrap/Container';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { COMPANY } from '../utils/company';
import { COMPANY_PHONE, getWhatsAppUrl } from '../utils/whatsapp';
import { useLanguage } from '../i18n/LanguageContext';

const SITE_URL = COMPANY.website;
const WHATSAPP_URL = getWhatsAppUrl(COMPANY_PHONE);
const QR_OPTIONS = {
  width: 640,
  margin: 2,
  color: { dark: '#0a0a0a', light: '#ffffff' },
  errorCorrectionLevel: 'M',
};

function isWhatsAppValue(text) {
  return /(?:wa\.me|api\.whatsapp\.com|whatsapp:)/i.test(String(text || ''));
}

function openScannedValue(text) {
  const value = String(text || '').trim();
  if (isWhatsAppValue(value)) {
    const url = /^https?:\/\//i.test(value) || /^whatsapp:/i.test(value) ? value : `https://${value}`;
    window.location.assign(url);
    return 'whatsapp';
  }
  const asUrl = /^https?:\/\//i.test(value) ? value : SITE_URL;
  window.location.assign(asUrl);
  return 'site';
}

const CARD_STYLE = { background: '#141414', border: '1px solid rgba(255,255,255,0.08)' };
const GOLD_BTN_STYLE = { background: 'linear-gradient(135deg, #a88448 0%, #c8a261 100%)', color: '#000' };

function QrCard({ kicker, src, alt, href, hrefLabel, downloadName, preparing, downloadLabel }) {
  return (
    <div className="col-lg-5">
      <div className="h-100 p-4 p-md-5 rounded-4 text-center" style={CARD_STYLE}>
        <p className="text-uppercase small mb-3" style={{ color: '#eeb012', letterSpacing: 2 }}>{kicker}</p>
        {src ? (
          <img
            src={src}
            alt={alt}
            className="img-fluid rounded-3 bg-white p-3"
            style={{ maxWidth: 320 }}
          />
        ) : (
          <p className="text-white-50">{preparing}</p>
        )}
        <p className="mt-3 mb-4">
          <a href={href} className="text-decoration-none" style={{ color: '#cda274' }}>{hrefLabel}</a>
        </p>
        {src && (
          <a
            href={src}
            download={downloadName}
            className="btn rounded-pill px-4 py-2 fw-semibold border-0"
            style={GOLD_BTN_STYLE}
          >
            {downloadLabel}
          </a>
        )}
      </div>
    </div>
  );
}

export default function QrCodePage() {
  const { t } = useLanguage();
  const [qrSrc, setQrSrc] = useState('');
  const [waQrSrc, setWaQrSrc] = useState('');
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const handledRef = useRef(false);

  useEffect(() => {
    Promise.all([
      QRCode.toDataURL(SITE_URL, QR_OPTIONS),
      QRCode.toDataURL(WHATSAPP_URL, QR_OPTIONS),
    ])
      .then(([siteQr, whatsappQr]) => {
        setQrSrc(siteQr);
        setWaQrSrc(whatsappQr);
      })
      .catch(() => setStatus(t('qr.fail')));
  }, [t]);

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
      setStatus(isWhatsAppValue(result.data) ? t('qr.foundWa') : t('qr.found'));
      stopScan();
      openScannedValue(result.data);
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [stopScan, t]);

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
      setStatus(t('qr.camera'));
    }
  };

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: 'white', paddingTop: '140px', paddingBottom: '80px' }}>
      <Container>
        <div className="text-center mb-5">
          <p className="text-uppercase fw-semibold mb-2" style={{ color: '#a0a0a0', letterSpacing: '3px', fontSize: '0.8rem' }}>
            {t('qr.scanKicker')}
          </p>
          <h1 className="display-5 fw-normal mb-3" style={{ fontFamily: 'Georgia, serif' }}>
            {t('qr.title')}
          </h1>
          <p className="mb-0" style={{ color: '#888', maxWidth: 560, margin: '0 auto' }}>
            {t('qr.lead')}
          </p>
        </div>

        <div className="row g-4 justify-content-center">
          <QrCard
            kicker={t('qr.kicker')}
            src={qrSrc}
            alt="Nextify website QR code"
            href={SITE_URL}
            hrefLabel={SITE_URL}
            downloadName="nextify-website-qr.png"
            preparing={t('qr.preparing')}
            downloadLabel={t('qr.download')}
          />
          <QrCard
            kicker={t('qr.waKicker')}
            src={waQrSrc}
            alt={t('qr.waAlt')}
            href={WHATSAPP_URL}
            hrefLabel={WHATSAPP_URL}
            downloadName="nextify-whatsapp-qr.png"
            preparing={t('qr.preparing')}
            downloadLabel={t('qr.download')}
          />
        </div>

        <div className="row g-4 justify-content-center mt-1">
          <div className="col-lg-10">
            <div className="p-4 p-md-5 rounded-4 text-center" style={CARD_STYLE}>
              <p className="text-uppercase small mb-2" style={{ color: '#eeb012', letterSpacing: 2 }}>{t('qr.scanner')}</p>
              <h2 className="h5 mb-2" style={{ fontFamily: 'Georgia, serif' }}>{t('qr.scanTitle')}</h2>
              <p className="mb-3" style={{ color: '#888', maxWidth: 520, margin: '0 auto' }}>{t('qr.scanLead')}</p>

              {scanning ? (
                <div>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-100 rounded-3"
                    style={{ background: '#000', maxWidth: 520, minHeight: 180, objectFit: 'cover' }}
                  />
                  <canvas ref={canvasRef} hidden />
                  <div>
                    <button
                      type="button"
                      className="btn btn-outline-light rounded-pill px-4 py-2 mt-3"
                      onClick={stopScan}
                    >
                      {t('qr.stop')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn rounded-pill px-4 py-2 fw-semibold border-0"
                  style={GOLD_BTN_STYLE}
                  onClick={startScan}
                >
                  {t('qr.open')}
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
