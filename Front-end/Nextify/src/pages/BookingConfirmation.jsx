import React, { useEffect, useState } from 'react';

import Container from 'react-bootstrap/Container';

import { Link, useLocation, useParams } from 'react-router-dom';

import PriceSummary from '../components/booking/PriceSummary';

import { SERVICE_LABELS } from '../components/booking/bookingConstants';

import { buildConfirmedBookingWhatsAppMessage, COMPANY_PHONE, getWhatsAppUrl } from '../utils/whatsapp';



function BookingConfirmation() {

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

        <h3>Booking not found</h3>

        <Link to="/track-booking" className="btn btn-light rounded-pill mt-3">Track a booking</Link>

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

            {customQuote ? 'Quote Request Submitted' : paymentSuccess === false ? 'Payment Failed' : 'Booking Confirmed'}

          </h2>

          <p className="text-white-50">

            Booking ID: <strong>{booking.bookingNumber}</strong>

          </p>

        </div>



        <div className="rounded-4 p-4 shadow-lg mb-4" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>

          <div className="row g-3 mb-4 text-white">

            <div className="col-md-6"><strong>Service</strong><br />{SERVICE_LABELS[serviceType] || serviceType}</div>

            <div className="col-md-6"><strong>Status</strong><br />{booking.bookingStatus}</div>

            <div className="col-md-6"><strong>Payment</strong><br />{booking.paymentStatus}</div>

            <div className="col-md-6"><strong>Vehicle</strong><br />{booking.vehicle?.name} + chauffeur</div>

            <div className="col-md-6"><strong>Pickup</strong><br />{booking.pickup?.address || booking.pickupLocation || booking.origin}</div>

            <div className="col-md-6"><strong>Destination</strong><br />{booking.destination?.address || booking.dropoffLocation || booking.destinationText || '—'}</div>

            <div className="col-md-6"><strong>Date &amp; Time</strong><br />{new Date(booking.schedule?.pickupDateTime || booking.arrivalDateTime).toLocaleString()}</div>

            <div className="col-md-6"><strong>Contact</strong><br />{booking.customer?.name}<br />{booking.customer?.mobile}</div>

          </div>

          {booking.driver?.name && (

            <div className="alert alert-secondary">

              <strong>Assigned Chauffeur:</strong> {booking.driver.name} · {booking.driver.phone}

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

            Contact us on WhatsApp

          </a>

          <Link to="/track-booking" className="btn btn-outline-light rounded-pill px-4">Track Booking</Link>

          <Link to="/" className="btn btn-light rounded-pill px-4">Back to Home</Link>

        </div>

      </Container>

    </div>

  );

}



export default BookingConfirmation;

