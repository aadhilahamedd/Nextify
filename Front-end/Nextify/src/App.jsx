import { Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Login from './pages/Login'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminMessages from './pages/admin/AdminMessages'
import AdminBookings from './pages/admin/AdminBookings'
import AdminPricing from './pages/admin/AdminPricing'
import AdminDrivers from './pages/admin/AdminDrivers'
import AdminPayments from './pages/admin/AdminPayments'
import Pnf from './components/Pnf'
import Header from './components/Header'
import Footer from './components/Footer'
import About from './components/About'
import Carlist from './components/Carlist'
import Contact from './components/Contact'
import Cardetails from './components/Cardetails'
import Booking from './components/Booking'
import BookingConfirmation from './pages/BookingConfirmation'
import TrackBooking from './pages/TrackBooking'
import MockPaymentCheckout from './pages/MockPaymentCheckout'
import PaymentResult from './pages/PaymentResult'
import ChatBot from './components/ChatBot'
import { COMPANY_PHONE, getWhatsAppUrl } from './utils/whatsapp'

function App() {
  const { pathname } = useLocation()
  const isAdminRoute = pathname.startsWith('/admin')

  return (
    <>
      {!isAdminRoute && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="pricing" element={<AdminPricing />} />
          <Route path="drivers" element={<AdminDrivers />} />
          <Route path="payments" element={<AdminPayments />} />
        </Route>
        <Route path="/about" element={<About />} />
        <Route path="/carlist" element={<Carlist />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/cardetails" element={<Cardetails />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/carlist/:id" element={<Booking />} />
        <Route path="/payment" element={<MockPaymentCheckout />} />
        <Route path="/payment-result" element={<PaymentResult />} />
        <Route path="/booking-confirmation/:bookingNumber" element={<BookingConfirmation />} />
        <Route path="/track-booking" element={<TrackBooking />} />
        <Route path="*" element={<Pnf />} />
      </Routes>
      {!isAdminRoute && <Footer />}
      {!isAdminRoute && <ChatBot />}
      {!isAdminRoute && (
        <a
          href={getWhatsAppUrl(COMPANY_PHONE, 'Hello Nextify, I need help with a booking')}
          target="_blank"
          rel="noreferrer"
          className="whatsapp-float"
          aria-label="Chat with us on WhatsApp for support"
        >
          <i className="bi bi-whatsapp"></i>
        </a>
      )}
    </>
  )
}

export default App
