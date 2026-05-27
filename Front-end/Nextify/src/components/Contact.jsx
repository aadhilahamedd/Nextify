import React, { useEffect, useMemo, useState } from 'react'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import serverURL from '../Services/serverURL'
import { submitContactMessageAPI } from '../Services/allAPI'
import { saveLocalContactMessage } from '../utils/contactMessagesStorage'

function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  })
  const [status, setStatus] = useState('')
  const [statusType, setStatusType] = useState('success')
  const [submitting, setSubmitting] = useState(false)
  const contactDefaults = {
    phone: '+1 234 567 8900',
    email: 'hello@nextify.com',
    location: 'Los Angeles, CA'
  }
  const [contactInfo, setContactInfo] = useState(() => {
    const saved = localStorage.getItem('nextifyContactInfo')
    return saved ? JSON.parse(saved) : contactDefaults
  })
  const [hasCachedContact] = useState(() => Boolean(localStorage.getItem('nextifyContactInfo')))
  const [editingContact, setEditingContact] = useState(false)
  const [contactDraft, setContactDraft] = useState(contactInfo)
  const [saveMessage, setSaveMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  }, [])
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    const fetchContact = async () => {
      try {
        const response = await fetch(`${serverURL}/api/contact`)
        if (!response.ok) {
          throw new Error('Failed to fetch contact details')
        }
        const data = await response.json()
        if (data.contact && !hasCachedContact) {
          setContactInfo({
            phone: data.contact.phone,
            email: data.contact.email,
            location: data.contact.location
          })
        }
        setError('')
      } catch (err) {
        console.error(err)
        if (!hasCachedContact) {
          setError('Unable to load contact details right now.')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchContact()
  }, [hasCachedContact])

  useEffect(() => {
    setContactDraft(contactInfo)
  }, [contactInfo])

  const startEditContact = () => {
    setContactDraft(contactInfo)
    setEditingContact(true)
    setSaveMessage('')
  }

  const cancelContactEdit = () => {
    setContactDraft(contactInfo)
    setEditingContact(false)
  }

  const handleContactDraftChange = (field, value) => {
    setContactDraft((prev) => ({ ...prev, [field]: value }))
  }

  const saveContactInfo = () => {
    setContactInfo(contactDraft)
    localStorage.setItem('nextifyContactInfo', JSON.stringify(contactDraft))
    setEditingContact(false)
    setSaveMessage('Contact details updated successfully.')
    setTimeout(() => setSaveMessage(''), 4000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('')
    setSubmitting(true)

    try {
      const response = await submitContactMessageAPI(formData)

      if (response?.status === 201 || response?.status === 200) {
        setStatusType('success')
        setStatus('Thank you! Your message has been sent.')
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
        setTimeout(() => setStatus(''), 5000)
      } else {
        saveLocalContactMessage(formData)
        setStatusType('success')
        setStatus(
          response?.status === 404
            ? 'Thank you! Your message was saved. The server is being updated — it will sync once the latest backend is deployed.'
            : 'Thank you! Your message was saved and will be reviewed shortly.'
        )
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
        setTimeout(() => setStatus(''), 7000)
      }
    } catch (err) {
      setStatusType('danger')
      setStatus('Failed to send message. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ backgroundColor: '#0a0a0a', color: 'white', minHeight: '100vh', paddingTop: '140px', paddingBottom: '80px' }}>
      <Container>
        <div className="text-center mb-5">
          <p className="text-uppercase fw-semibold mb-2" style={{ color: '#eeb012', letterSpacing: '3px', fontSize: '0.8rem' }}>
            Contact Us
          </p>
          <h2 className="display-4 fw-normal mb-3" style={{ fontFamily: 'Georgia, serif', color: '#fff' }}>
            Get in touch with Nextify
          </h2>
          <p className="mx-auto" style={{ maxWidth: '680px', color: '#bfbfbf', lineHeight: '1.8' }}>
            Have a question about our fleet, booking process, or corporate services? Send us a message and our team will respond quickly to help you plan your next luxury ride.
          </p>
          {isAdmin && !editingContact && (
            <button
              type="button"
              onClick={startEditContact}
              className="btn btn-outline-warning rounded-pill mt-4"
              style={{ borderColor: 'rgba(238, 176, 18, 0.85)', color: '#f6d26e', padding: '12px 28px' }}
            >
              <i className="bi bi-pencil-fill me-2"></i>
              Edit Contact Details
            </button>
          )}
          {isAdmin && editingContact && (
            <div className="mt-4 p-4 rounded-4 mx-auto" style={{ maxWidth: '780px', backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label fw-semibold text-white mb-2">Mobile Number</label>
                  <input
                    type="text"
                    value={contactDraft.phone}
                    onChange={(e) => handleContactDraftChange('phone', e.target.value)}
                    className="form-control p-3 bg-dark border-0 text-white"
                    placeholder="Phone number"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold text-white mb-2">Email</label>
                  <input
                    type="email"
                    value={contactDraft.email}
                    onChange={(e) => handleContactDraftChange('email', e.target.value)}
                    className="form-control p-3 bg-dark border-0 text-white"
                    placeholder="Contact email"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold text-white mb-2">Location</label>
                  <input
                    type="text"
                    value={contactDraft.location}
                    onChange={(e) => handleContactDraftChange('location', e.target.value)}
                    className="form-control p-3 bg-dark border-0 text-white"
                    placeholder="Location"
                  />
                </div>
              </div>
              <div className="d-flex flex-wrap justify-content-center gap-3 mt-4">
                <button type="button" onClick={cancelContactEdit} className="btn btn-outline-secondary rounded-pill px-4 py-3">
                  Cancel
                </button>
                <button type="button" onClick={saveContactInfo} className="btn btn-warning rounded-pill px-4 py-3">
                  Save Contact Info
                </button>
              </div>
              {saveMessage && <p className="text-success text-center mt-3 mb-0">{saveMessage}</p>}
            </div>
          )}
        </div>

        <Row className="g-4 mb-5">
          <Col md={4}>
            <div className="p-4 rounded-4 h-100" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h5 className="mb-3" style={{ color: '#eeb012', fontFamily: 'Georgia, serif' }}>Call Us</h5>
              {loading ? <p className="text-white-50">Loading...</p> : <p className="mb-2 text-white-50">{contactInfo.phone}</p>}
              <p className="small text-white-50">Available 24/7 for urgent bookings and support.</p>
            </div>
          </Col>
          <Col md={4}>
            <div className="p-4 rounded-4 h-100" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h5 className="mb-3" style={{ color: '#eeb012', fontFamily: 'Georgia, serif' }}>Email</h5>
              {loading ? <p className="text-white-50">Loading...</p> : <p className="mb-2 text-white-50">{contactInfo.email}</p>}
              <p className="small text-white-50">For reservations, partnerships, and general inquiries.</p>
            </div>
          </Col>
          <Col md={4}>
            <div className="p-4 rounded-4 h-100" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h5 className="mb-3" style={{ color: '#eeb012', fontFamily: 'Georgia, serif' }}>Location</h5>
              {loading ? <p className="text-white-50">Loading...</p> : <p className="mb-2 text-white-50">{contactInfo.location}</p>}
              <p className="small text-white-50">Current pickup and service area details.</p>
            </div>
          </Col>
        </Row>

        {error && <div className="alert alert-warning">{error}</div>}

        <Row className="g-5">
          <Col lg={6}>
            <div className="p-5 rounded-4" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="mb-4" style={{ fontFamily: 'Georgia, serif', color: '#fff' }}>Ready to book?</h3>
              <p style={{ color: '#bfbfbf', lineHeight: '1.8' }}>
                Send us a message and our support team will help you finalize your reservation, answer questions, or provide a custom transport solution for your event.
              </p>
              <ul className="list-unstyled mt-4" style={{ color: '#bfbfbf', lineHeight: '2' }}>
                <li><i className="bi bi-check2-circle me-2" style={{ color: '#eeb012' }}></i>Airport transfers</li>
                <li><i className="bi bi-check2-circle me-2" style={{ color: '#eeb012' }}></i>Hourly chauffeur service</li>
                <li><i className="bi bi-check2-circle me-2" style={{ color: '#eeb012' }}></i>Event fleet rentals</li>
              </ul>
            </div>
          </Col>

          <Col lg={6}>
            <div className="p-4 p-md-5 rounded-4" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
              {status && (
                <div className={`alert alert-${statusType}`} role="alert">
                  {status}
                </div>
              )}
              <form onSubmit={handleSubmit} className="row g-4">
                <div className="col-md-6">
                  <label className="form-label fw-semibold text-white mb-2">Name</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-control p-3 bg-dark border-0 text-white" placeholder="Your name" />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold text-white mb-2">Email</label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="form-control p-3 bg-dark border-0 text-white" placeholder="Your email" />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold text-white mb-2">Phone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="form-control p-3 bg-dark border-0 text-white" placeholder="Phone number" />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold text-white mb-2">Subject</label>
                  <input type="text" required value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="form-control p-3 bg-dark border-0 text-white" placeholder="Message subject" />
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold text-white mb-2">Message</label>
                  <textarea required value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="form-control p-3 bg-dark border-0 text-white" rows="5" placeholder="Tell us how we can help"></textarea>
                </div>
                <div className="col-12 text-end">
                  <button type="submit" disabled={submitting} className="btn px-5 py-3 rounded-pill text-uppercase fw-bold" style={{ backgroundColor: submitting ? '#9a7a0c' : '#eeb012', color: '#000' }}>
                    {submitting ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default Contact