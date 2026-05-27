import React, { useState, useEffect } from 'react'
import Container from 'react-bootstrap/Container'
import { useLocation } from 'react-router-dom'
import { addBookingAPI } from '../Services/allAPI'
import { buildBookingWhatsAppMessage, openCompanyWhatsApp } from '../utils/whatsapp'

function Booking() {
  const location = useLocation()
  const carFromDetails = location.state?.car
  
  const [activeTab, setActiveTab] = useState('airport')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    eventType: '',
    eventOther: '',
    flightNumber: '',
    arrivalDateTime: '',
    vehicle: '',
    pickupLocation: '',
    otherPickupLocation: '',
    dropoffLocation: '',
    hours: '5 HRS'
  })

  // Pre-fill vehicle if coming from car details
  useEffect(() => {
    if (carFromDetails?.name) {
      setFormData(prev => ({
        ...prev,
        vehicle: carFromDetails.name
      }))
    }
  }, [carFromDetails])

  const vehicles = [
    "Mercedes-Benz Sprinter",
    "Lexus ES 350",
    "Chevrolet Impala",
    "Toyota Hiace",
    "Toyota Coaster",
    "Mercedes-Benz Coach Bus",
    "Mercedes-Benz V-Class",
    "Mercedes-Benz S-Class",
    "Ford Taurus",
    "GMC Yukon XL AT4",
    "BMW 7 Series",
    "BMW 5 Series",
    "Mercedes-Benz E-Class",
    "Mercedes-Benz eVito Tourer"
  ]

  const handleBookingSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const bookingPayload = {
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email,
        serviceType: activeTab,
          eventType: formData.eventType,
          eventOther: formData.eventOther,
        flightNumber: formData.flightNumber,
        arrivalDateTime: formData.arrivalDateTime,
        vehicle: formData.vehicle,
        pickupLocation: formData.pickupLocation,
        otherPickupLocation: formData.otherPickupLocation,
        dropoffLocation: formData.dropoffLocation,
        hours: formData.hours
      }

      const whatsappMessage = buildBookingWhatsAppMessage(bookingPayload, activeTab)
      const whatsappResult = openCompanyWhatsApp(whatsappMessage)

      if (!whatsappResult.ok) {
        setError(`❌ ${whatsappResult.error}`)
        setLoading(false)
        return
      }

      const response = await addBookingAPI(bookingPayload)
      
      if (response?.status === 201 || response?.status === 200) {
        setSuccess('✅ Booking submitted! WhatsApp opened with your booking details — tap Send to confirm.')
        // Reset form
        setFormData({
          name: '',
          mobile: '',
          email: '',
            eventType: '',
            eventOther: '',
          flightNumber: '',
          arrivalDateTime: '',
          vehicle: '',
          pickupLocation: '',
          otherPickupLocation: '',
          dropoffLocation: '',
          hours: '5 HRS'
        })
        setTimeout(() => setSuccess(''), 5000)
      } else {
        const errorMsg = response?.response?.data?.message || response?.error || 'Failed to submit booking. Please try again.'
        setError('❌ ' + errorMsg)
      }
    } catch (err) {
      console.error('Booking error:', err)
      setError('❌ Error submitting booking. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', paddingTop: '120px', paddingBottom: '80px' }}>
      <Container>
        <div className="text-center mb-5" style={{ padding: '60px 30px', backgroundColor: '#000', borderRadius: '24px', color: 'white' }}>
          <p className="text-uppercase fw-semibold mb-2" style={{ color: '#a0a0a0', letterSpacing: '2px', fontSize: '0.8rem' }}>
            Reservation
          </p>
          <h2 className="display-5 fw-normal mb-3" style={{ fontFamily: 'Georgia, serif', color: '#f8f8f8' }}>
            Book Your Luxury Ride
          </h2>
          <p className="mb-0" style={{ color: '#cccccc', lineHeight: '1.8', maxWidth: '640px', margin: '0 auto' }}>
            Complete your booking details below to reserve the vehicle and service type that best fits your journey.
          </p>
        </div>

        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            {error}
            <button type="button" className="btn-close" onClick={() => setError('')}></button>
          </div>
        )}

        {success && (
          <div className="alert alert-success alert-dismissible fade show" role="alert">
            {success}
            <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
          </div>
        )}

        <div className="p-0 rounded-4 shadow-sm overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="d-flex w-100 flex-row" style={{ borderBottom: '1px solid #eee' }}>

            <button
              type="button"
              className="flex-fill border-0 py-3 px-3 d-flex align-items-center justify-content-center gap-2 text-uppercase fw-semibold booking-page-tab-btn"
              style={{ background: activeTab === 'airport' ? '#111' : '#f8f8f8', color: activeTab === 'airport' ? '#fff' : '#333', cursor: 'pointer' }}
              onClick={() => setActiveTab('airport')}
            >
              <i className="bi bi-airplane-fill me-2"></i> Airport Transfer
            </button>
            <button
              type="button"
              className="flex-fill border-0 py-3 px-3 d-flex align-items-center justify-content-center gap-2 text-uppercase fw-semibold booking-page-tab-btn"
              style={{ background: activeTab === 'pointToPoint' ? '#111' : '#f8f8f8', color: activeTab === 'pointToPoint' ? '#fff' : '#333', cursor: 'pointer' }}
              onClick={() => setActiveTab('pointToPoint')}
            >
              <i className="bi bi-geo-alt-fill me-2"></i> Point to Point
            </button>
            <button
              type="button"
              className="flex-fill border-0 py-3 px-3 d-flex align-items-center justify-content-center gap-2 text-uppercase fw-semibold booking-page-tab-btn"
              style={{ background: activeTab === 'hourly' ? '#111' : '#f8f8f8', color: activeTab === 'hourly' ? '#fff' : '#333', cursor: 'pointer' }}
              onClick={() => setActiveTab('hourly')}
            >
              <i className="bi bi-clock-fill me-2"></i> Hourly Service
            </button>
          </div>

          <form onSubmit={handleBookingSubmit} className="p-4 p-md-5 row g-4">
            <div className="col-md-4">
              <label className="form-label fw-bold">Name <span className="text-danger">*</span></label>
              <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-control p-3" placeholder="Enter your name" />
            </div>

            <div className="col-md-4">
              <label className="form-label fw-bold">Mobile Number <span className="text-danger">*</span></label>
              <input type="tel" required value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} className="form-control p-3" placeholder="Enter your mobile number" />
            </div>

            <div className="col-md-4">
              <label className="form-label fw-bold">Email <span className="text-danger">*</span></label>
              <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="form-control p-3" placeholder="Enter your email" />
            </div>

            <div className="col-md-4">
              <label className="form-label fw-bold">Event Type (optional)</label>
              <select value={formData.eventType} onChange={(e) => setFormData({ ...formData, eventType: e.target.value })} className="form-select p-3">
                <option value="">None</option>
                <option value="Birthday">Birthday Party</option>
                <option value="Wedding">Wedding</option>
                <option value="Anniversary">Anniversary</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {formData.eventType === 'Other' && (
              <div className="col-md-4">
                <label className="form-label fw-bold">Other Event</label>
                <input type="text" value={formData.eventOther} onChange={(e) => setFormData({ ...formData, eventOther: e.target.value })} className="form-control p-3" placeholder="Specify event type" />
              </div>
            )}

            {activeTab === 'airport' && (
              <>
                <div className="col-md-4">
                  <label className="form-label fw-bold">Flight Number <span className="text-danger">*</span></label>
                  <input type="text" required value={formData.flightNumber} onChange={(e) => setFormData({ ...formData, flightNumber: e.target.value })} className="form-control p-3" placeholder="e.g. EK901" />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-bold">Arrival Date & Time <span className="text-danger">*</span></label>
                  <input type="datetime-local" required value={formData.arrivalDateTime} onChange={(e) => setFormData({ ...formData, arrivalDateTime: e.target.value })} className="form-control p-3" />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-bold">Choose vehicle <span className="text-danger">*</span></label>
                  <select required value={formData.vehicle} onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })} className="form-select p-3">
                    <option value="">Select a vehicle</option>
                    {vehicles.map((v, i) => <option key={i} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-bold">Pick-up Location <span className="text-danger">*</span></label>
                  <select required value={formData.pickupLocation} onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })} className="form-select p-3">
                    <option value="">Select Airport</option>
                    <option value="King Khalid International Airport (RUH) - Riyadh">King Khalid International Airport (RUH) - Riyadh</option>
                    <option value="King Abdulaziz International Airport (JED) - Jeddah">King Abdulaziz International Airport (JED) - Jeddah</option>
                    <option value="King Fahd International Airport (DMM) - Dammam">King Fahd International Airport (DMM) - Dammam</option>
                    <option value="Prince Mohammad Bin Abdulaziz International Airport (MED) - Medina">Prince Mohammad Bin Abdulaziz International Airport (MED) - Medina</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-bold">Other Pickup Location</label>
                  <input type="text" value={formData.otherPickupLocation} onChange={(e) => setFormData({ ...formData, otherPickupLocation: e.target.value })} className="form-control p-3" placeholder="Specify if Other selected" />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-bold">Drop-off Location <span className="text-danger">*</span></label>
                  <input type="text" required value={formData.dropoffLocation} onChange={(e) => setFormData({ ...formData, dropoffLocation: e.target.value })} className="form-control p-3" placeholder="Enter drop-off location" />
                </div>
              </>
            )}

            {activeTab === 'pointToPoint' && (
              <>
                <div className="col-md-4">
                  <label className="form-label fw-bold">Date & Time <span className="text-danger">*</span></label>
                  <input type="datetime-local" required value={formData.arrivalDateTime} onChange={(e) => setFormData({ ...formData, arrivalDateTime: e.target.value })} className="form-control p-3" />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-bold">Choose vehicle <span className="text-danger">*</span></label>
                  <select required value={formData.vehicle} onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })} className="form-select p-3">
                    <option value="">Select a vehicle</option>
                    {vehicles.map((v, i) => <option key={i} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-bold">Pick-up Location <span className="text-danger">*</span></label>
                  <input type="text" required value={formData.pickupLocation} onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })} className="form-control p-3" placeholder="Enter pick-up location" />
                </div>
                <div className="col-md-12">
                  <label className="form-label fw-bold">Drop Off Location <span className="text-danger">*</span></label>
                  <input type="text" required value={formData.dropoffLocation} onChange={(e) => setFormData({ ...formData, dropoffLocation: e.target.value })} className="form-control p-3" placeholder="Enter drop-off location" />
                </div>
              </>
            )}

            {activeTab === 'hourly' && (
              <>
                <div className="col-md-4">
                  <label className="form-label fw-bold">Start Date & Time <span className="text-danger">*</span></label>
                  <input type="datetime-local" required value={formData.arrivalDateTime} onChange={(e) => setFormData({ ...formData, arrivalDateTime: e.target.value })} className="form-control p-3" />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-bold">Pick-up Location <span className="text-danger">*</span></label>
                  <input type="text" required value={formData.pickupLocation} onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })} className="form-control p-3" placeholder="Enter pick-up location" />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-bold">Choose vehicle <span className="text-danger">*</span></label>
                  <select required value={formData.vehicle} onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })} className="form-select p-3">
                    <option value="">Select a vehicle</option>
                    {vehicles.map((v, i) => <option key={i} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="col-md-12">
                  <label className="form-label fw-bold">Select Hours (Optional)</label>
                  <select value={formData.hours} onChange={(e) => setFormData({ ...formData, hours: e.target.value })} className="form-select p-3">
                    <option value="1 HR">1 HR</option>
                    <option value="2 HRS">2 HRS</option>
                    <option value="3 HRS">3 HRS</option>
                    <option value="4 HRS">4 HRS</option>
                    <option value="5 HRS">5 HRS</option>
                    <option value="6 HRS">6 HRS</option>
                    <option value="8 HRS">8 HRS</option>
                    <option value="12 HRS">12 HRS</option>
                    <option value="24 HRS">24 HRS</option>
                  </select>
                </div>
              </>
            )}

            <div className="col-12 mt-3 text-start">
              <button type="submit" disabled={loading} className="btn px-4 py-3 text-uppercase fw-bold" style={{ background: loading ? '#ccc' : '#a88448', color: '#fff', borderRadius: '30px', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Booking...' : 'Book Now'}
              </button>
            </div>
          </form>
        </div>
      </Container>
    </div>
  )
}

export default Booking
