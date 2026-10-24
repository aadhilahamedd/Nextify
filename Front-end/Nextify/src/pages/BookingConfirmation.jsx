import React, { useEffect, useState } from 'react';

import Container from 'react-bootstrap/Container';

import { Link, useLocation, useParams } from 'react-router-dom';

import PriceSummary from '../components/booking/PriceSummary';

import { SERVICE_LABELS } from '../components/booking/bookingConstants';

import { buildConfirmedBookingWhatsAppMessage, COMPANY_PHONE, getWhatsAppUrl } from '../utils/whatsapp';
import { useLanguage } from '../i18n/LanguageContext';
import { translateService } from '../i18n/places';
import { formatDateTimeForLang } from '../i18n/format';



function BookingConfirmation() {
  const { t, lang } = useLanguage();

  const { bookingNumber } = useParams();

  const location = useLocation();

  const [booking, setBooking] = useState(location.state?.booking || null);

  const paymentSuccess = location.state?.paymentSuccess;

  const customQuote = location.state?.customQuote || booking?.customQuoteRequired;



  useEffect(() => {

    if (booking?.bookingNumber) return;

    if (!bookingNumber) return;



    const stored = sessionStorage.getItem(`booking_${bookingNumber}`);

    if (stored) {

      setBooking(JSON.parse(stored));

    }

  }, [bookingNumber, booking]);



  useEffect(() => {

    if (booking?.bookingNumber) {

      sessionStorage.setItem(`booking_${booking.bookingNumber}`, JSON.stringify(booking));

    }

  }, [booking]);



  if (!booking) {

    return (

      <Container className="py-5 text-center text-white" style={{ minHeight: '60vh', paddingTop: 140 }}>

        <h3>{t('confirm.notFound')}</h3>

        <Link to="/track-booking" className="btn btn-light rounded-pill mt-3">{t('confirm.track')}</Link>

      </Container>

    );

  }



  const serviceType = booking.serviceType;

  const whatsappMessage = buildConfirmedBookingWhatsAppMessage(booking);

  const pricingQuote = {

    price: booking.quotedPrice ?? booking.pricing?.totalAmount,

    currency: booking.pricing?.currency || 'SAR',

    customQuoteRequired: customQuote,

    pricingType: booking.pricingType || booking.pricing?.breakdown?.pricingType,

    message: booking.pricing?.breakdown?.message,

  };



  return (

    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', paddingTop: 120, paddingBottom: 80, color: 'white' }}>

      <Container style={{ maxWidth: 720 }}>

        <div className="text-center text-white mb-4">

          <i className={`bi ${paymentSuccess === false ? 'bi-exclamation-circle' : 'bi-check-circle'} display-4 mb-3`} style={{ color: '#eeb012' }} />

          <h2 style={{ fontFamily: 'Georgia, serif' }}>

            {customQuote ? t('confirm.quote') : paymentSuccess === false ? t('confirm.failed') : t('confirm.confirmed')}

          </h2>

          <p className="text-white-50">

            {t('confirm.id')} <strong>{booking.bookingNumber}</strong>

          </p>

        </div>



        <div className="rounded-4 p-4 shadow-lg mb-4" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>

          <div className="row g-3 mb-4 text-white">

            <div className="col-md-6"><strong>{t('confirm.service')}</strong><br />{translateService(serviceType, t) || SERVICE_LABELS[serviceType] || serviceType}</div>

            <div className="col-md-6"><strong>{t('confirm.status')}</strong><br />{booking.bookingStatus}</div>

            <div className="col-md-6"><strong>{t('confirm.payment')}</strong><br />{booking.paymentStatus}</div>

            <div className="col-md-6"><strong>{t('confirm.vehicle')}</strong><br />{booking.vehicle?.name} {t('confirm.chauffeur')}</div>

            <div className="col-md-6"><strong>{t('confirm.pickup')}</strong><br />{booking.pickup?.address || booking.pickupLocation || booking.origin}</div>

            <div className="col-md-6"><strong>{t('confirm.dest')}</strong><br />{booking.destination?.address || booking.dropoffLocation || booking.destinationText || '—'}</div>

            <div className="col-md-6"><strong>{t('confirm.datetime')}</strong><br />{formatDateTimeForLang(booking.schedule?.pickupDateTime || booking.arrivalDateTime, lang)}</div>

            <div className="col-md-6"><strong>{t('confirm.contact')}</strong><br />{booking.customer?.name}<br />{booking.customer?.mobile}</div>

          </div>

          {booking.driver?.name && (

            <div className="alert alert-secondary">

              <strong>{t('confirm.assigned')}</strong> {booking.driver.name} · {booking.driver.phone}

            </div>

          )}

          <PriceSummary quote={pricingQuote} compact />

        </div>



        <div className="d-flex flex-wrap gap-2 justify-content-center">

          <a

            href={getWhatsAppUrl(COMPANY_PHONE, whatsappMessage)}

            target="_blank"

            rel="noopener noreferrer"

            className="btn rounded-pill px-4"

            style={{ background: '#25d366', color: '#fff', border: 'none' }}

          >

            <i className="bi bi-whatsapp me-2" />

            {t('confirm.wa')}

          </a>

          <Link to="/track-booking" className="btn btn-outline-light rounded-pill px-4">{t('confirm.trackBtn')}</Link>

          <Link to="/" className="btn btn-light rounded-pill px-4">{t('confirm.home')}</Link>

        </div>

      </Container>

    </div>

  );

}



export default BookingConfirmation;

