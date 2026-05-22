import { Route, Routes } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Login from './pages/Login'
import Admin from './pages/Admin'
import Pnf from './components/Pnf'
import Header from './components/Header'
import Footer from './components/Footer'
import About from './components/About'
import Carlist from './components/Carlist'
import Contact from './components/Contact'
import Cardetails from './components/Cardetails'
import Booking from './components/Booking'

function App() {
  

  return (
    <>
    <Header/>
      <Routes>
        <Route path='/' element={<Home/>}></Route>
        <Route path='/login' element={<Login/>}></Route>
        <Route path='/admin' element={<Admin/>}></Route>
        <Route path='/about' element={<About/>}></Route>
        <Route path='/carlist' element={<Carlist/>}></Route>
        <Route path='/contact' element={<Contact/>}></Route>
        <Route path='/cardetails' element={<Cardetails/>}></Route>
        <Route path='/booking' element={<Booking/>}></Route>
        <Route path='*' element={<Pnf/>}></Route>
        <Route path='/carlist/:id' element={<Booking/>}></Route>
        
      </Routes>
      <Footer/>
      <a
        href="https://wa.me/1234567890?text=Hello%20Nextify,%20I%20need%20help%20with%20a%20booking"
        target="_blank"
        rel="noreferrer"
        className="whatsapp-float"
        aria-label="Chat with us on WhatsApp"
      >
        <i className="bi bi-whatsapp"></i>
      </a>
    </>
  )
}

export default App

