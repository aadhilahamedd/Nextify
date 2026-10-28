import React, { useEffect, useMemo, useState } from 'react'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import serverURL from '../Services/serverURL'
import { submitContactMessageAPI } from '../Services/allAPI'
import { saveLocalContactMessage } from '../utils/contactMessagesStorage'

import { Link } from 'react-router-dom'
import { COMPANY } from '../utils/company'
import { useLanguage } from '../i18n/LanguageContext'
import './booking/Booking.css'

const STALE_EMAILS = ['hello@nextify.sa', 'Support@nextify.com', 'info@nextify.sa']
const STALE_PHONE_DIGITS = ['555876331', '537628099']
const DEFAULT_TITLE = 'NEXTIFY LIMO | Luxury Chauffeur Service in Saudi Arabia'

function phoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '')
}

function isStalePhone(phone) {
  const digits = phoneDigits(phone)
  return STALE_PHONE_DIGITS.some((part) => digits.includes(part))
}

function sanitizeContact(info = {}) {
  const email = STALE_EMAILS.includes(info.email) ? COMPANY.email : (info.email || COMPANY.email)
  const phone = isStalePhone(info.phone) ? COMPANY.phonePrimary : (info.phone || COMPANY.phonePrimary)
  const location = info.location || COMPANY.addressLines.join(', ')
  return { phone, email, location }
}

function telHref(phone) {
  const digits = phoneDigits(phone)
  return digits ? `tel:+${digits}` : undefined
}

function Contact() {
  const { t } = useLanguage()
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
    phone: COMPANY.phonePrimary,
    email: COMPANY.email,
    location: COMPANY.addressLines.join(', ')
  }
  const [contactInfo, setContactInfo] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nextifyContactInfo') || 'null')
      if (!saved) return contactDefaults
      if (STALE_EMAILS.includes(saved.email) || isStalePhone(saved.phone)) {
        localStorage.removeItem('nextifyContactInfo')
        return contactDefaults
      }
      return sanitizeContact(saved)
    } catch {
      return contactDefaults
    }
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
          throw new Error(t('contact.loadFail'))
        }
        const data = await response.json()
        if (data.contact && !hasCachedContact) {
          setContactInfo(sanitizeContact(data.contact))
        }
        setError('')
      } catch (err) {
        console.error(err)
        if (!hasCachedContact) {
          setError(t('contact.loadFail'))
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

  useEffect(() => {
    const previousTitle = document.title
    const previousDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
    document.title = `${t('nav.contact')} | NEXTIFY LIMO`
    const meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute(
        'content',
        `Contact NEXTIFY LIMO, the chauffeur brand of NEXTIFY BUSINESS SERVICE. Email ${COMPANY.email}. Phone ${COMPANY.phonePrimary}. ${COMPANY.addressLines.join(', ')}`
      )
    }
    return () => {
      document.title = previousTitle || DEFAULT_TITLE
      if (meta) meta.setAttribute('content', previousDescription)
    }
  }, [t])

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
        setStatus(t('contact.thanksSent'))
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
        setTimeout(() => setStatus(''), 5000)
      } else {
        saveLocalContactMessage(formData)
        setStatusType('success')
        setStatus(t('contact.thanks'))
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
        setTimeout(() => setStatus(''), 7000)
      }
    } catch (err) {
      setStatusType('danger')
      setStatus(t('contact.sendFail'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ backgroundColor: '#0a0a0a', color: 'white', minHeight: '100vh', paddingTop: '140px', paddingBottom: '80px' }}>
      <Container>
        <div className="text-center mb-5">
          <p className="text-uppercase fw-semibold mb-2" style={{ color: '#eeb012', letterSpacing: '3px', fontSize: '0.8rem' }}>
            {t('contact.pageKicker')}
          </p>
          <h2 className="display-4 fw-normal mb-3" style={{ fontFamily: 'Georgia, serif', color: '#fff' }}>
            {t('contact.pageTitle')}
          </h2>
          <p className="mx-auto" style={{ maxWidth: '680px', color: '#bfbfbf', lineHeight: '1.8' }}>
            {t('contact.lead')}
          </p>
          <p className="mx-auto mt-3" style={{ maxWidth: '680px', color: '#c8a261', lineHeight: '1.8' }}>
            {t('contact.identity')}
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
                    className="form-control p-3 contact-input"
                    placeholder="Phone number"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold text-white mb-2">Email</label>
                  <input
                    type="email"
                    value={contactDraft.email}
                    onChange={(e) => handleContactDraftChange('email', e.target.value)}
                    className="form-control p-3 contact-input"
                    placeholder="Contact email"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold text-white mb-2">Location</label>
                  <input
                    type="text"
                    value={contactDraft.location}
                    onChange={(e) => handleContactDraftChange('location', e.target.value)}
                    className="form-control p-3 contact-input"
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
            <div className="contact-info-card p-4 rounded-4 h-100">
              <div className="contact-info-icon" aria-hidden="true">
                <i className="bi bi-telephone-fill"></i>
              </div>
              <div className="contact-info-copy">
                <h5 className="contact-info-title">{t('contact.call')}</h5>
                {loading ? <p className="contact-info-hint">{t('contact.loading')}</p> : (
                  <p className="contact-info-value ltr-num" dir="ltr">
                    <a href={telHref(contactInfo.phone)}>{contactInfo.phone}</a>
                  </p>
                )}
                <p className="contact-info-hint">{t('contact.available247')}</p>
              </div>
            </div>
          </Col>
          <Col md={4}>
            <div className="contact-info-card p-4 rounded-4 h-100">
              <div className="contact-info-icon" aria-hidden="true">
                <i className="bi bi-envelope-fill"></i>
              </div>
              <div className="contact-info-copy">
                <h5 className="contact-info-title">{t('contact.email')}</h5>
                {loading ? <p className="contact-info-hint">{t('contact.loading')}</p> : (
                  <p className="contact-info-value">
                    <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a>
                  </p>
                )}
                <p className="contact-info-hint">{t('contact.emailHint')}</p>
              </div>
            </div>
          </Col>
          <Col md={4}>
            <div className="contact-info-card p-4 rounded-4 h-100">
              <div className="contact-info-icon" aria-hidden="true">
                <i className="bi bi-geo-alt-fill"></i>
              </div>
              <div className="contact-info-copy">
                <h5 className="contact-info-title">{t('contact.location')}</h5>
                {loading ? <p className="contact-info-hint">{t('contact.loading')}</p> : (
                  <p className="contact-info-value">
                    {String(contactInfo.location || '').includes('4576')
                      ? COMPANY.addressLines.map((line) => (
                        <React.Fragment key={line}>{line}<br /></React.Fragment>
                      ))
                      : contactInfo.location}
                  </p>
                )}
                <p className="contact-info-hint">{t('contact.locationHint')}</p>
              </div>
            </div>
          </Col>
        </Row>

        <div className="p-4 p-md-5 rounded-4 mb-5 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3" style={{ backgroundColor: '#111111', border: '1px solid rgba(238,176,18,0.22)' }}>
          <div>
            <p className="text-uppercase small mb-2" style={{ color: '#eeb012', letterSpacing: 2 }}>{t('contact.qr')}</p>
            <h3 className="h4 mb-2" style={{ fontFamily: 'Georgia, serif' }}>{t('contact.scanOpen')}</h3>
            <p className="mb-0" style={{ color: '#888' }}>
              {t('contact.scanLead', { url: COMPANY.website })}
            </p>
          </div>
          <Link
            to="/qr"
            className="btn rounded-pill px-4 py-3 fw-semibold border-0 text-decoration-none"
            style={{ background: 'linear-gradient(135deg, #a88448 0%, #c8a261 100%)', color: '#000' }}
          >
            {t('contact.openQr')}
          </Link>
        </div>

        {error && <div className="alert alert-warning">{error}</div>}

        <Row className="g-5">
          <Col lg={6}>
            <div className="p-5 rounded-4" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="mb-4" style={{ fontFamily: 'Georgia, serif', color: '#fff' }}>{t('contact.ready')}</h3>
              <p style={{ color: '#bfbfbf', lineHeight: '1.8' }}>
                {t('contact.readyText')}
              </p>
              <ul className="list-unstyled mt-4" style={{ color: '#bfbfbf', lineHeight: '2' }}>
                <li><i className="bi bi-check2-circle me-2" style={{ color: '#eeb012' }}></i>{t('contact.airport')}</li>
                <li><i className="bi bi-check2-circle me-2" style={{ color: '#eeb012' }}></i>{t('contact.hourly')}</li>
                <li><i className="bi bi-check2-circle me-2" style={{ color: '#eeb012' }}></i>{t('contact.events')}</li>
              </ul>
            </div>
          </Col>

          <Col lg={6}>
            <form onSubmit={handleSubmit} className="book-panel contact-form">
              {status && (
                <div className={statusType === 'danger' ? 'book-error' : 'book-hint mb-3'} role="alert">
                  {status}
                </div>
              )}
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="book-label">{t('contact.name')} *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-control book-input" placeholder={t('contact.namePh')} />
                </div>
                <div className="col-md-6">
                  <label className="book-label">{t('contact.email')} *</label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="form-control book-input" placeholder={t('contact.yourEmail')} />
                </div>
                <div className="col-md-6">
                  <label className="book-label">{t('contact.phone')}</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="form-control book-input" placeholder={t('contact.phonePh')} />
                </div>
                <div className="col-md-6">
                  <label className="book-label">{t('contact.subject')} *</label>
                  <input type="text" required value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="form-control book-input" placeholder={t('contact.subjectPh')} />
                </div>
                <div className="col-12">
                  <label className="book-label">{t('contact.message')} *</label>
                  <textarea required value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="form-control book-input" rows="5" placeholder={t('contact.messagePh')}></textarea>
                </div>
              </div>
              <button type="submit" disabled={submitting} className="lux-btn w-100 mt-4" style={{ padding: '14px 24px' }}>
                {submitting ? t('contact.sending') : t('contact.send')}
              </button>
            </form>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default Contact