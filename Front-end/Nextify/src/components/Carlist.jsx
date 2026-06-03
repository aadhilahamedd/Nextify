import React, { useEffect, useMemo, useState } from 'react'
import Container from 'react-bootstrap/Container'
import { useNavigate } from 'react-router-dom'
import { getCarImageUrl } from '../utils/carsStorage'
import { getCarsAPI, addCarAPI, updateCarAPI, deleteCarAPI } from '../Services/allAPI'

function Carlist() {
  const navigate = useNavigate();
  const [cars, setCars] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingCar, setEditingCar] = useState(null)
  const [editData, setEditData] = useState({ name: '', price: '', type: '', seats: '', luggage: '', img: '' })
  const [preview, setPreview] = useState(null)
  const [activeFilter, setActiveFilter] = useState('All')

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  }, [])
  const isAdmin = user?.role === 'admin'

  const handleCardClick = (car) => {
    navigate('/cardetails', { state: { car } })
  }

  const openEditModal = (car) => {
    setEditingCar(car)
    setEditData({
      name: car.name,
      price: car.price,
      type: car.type,
      seats: car.seats,
      luggage: car.luggage,
      img: car.img
    })
    setPreview(getCarImageUrl(car.img))
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingCar(null)
    setPreview(null)
  }

  const openAddModal = () => {
    setEditingCar(null)
    setEditData({ name: '', price: '', type: '', seats: '', luggage: '', img: '' })
    setPreview(null)
    setShowModal(true)
  }

  const handleEditChange = (field, value) => {
    setEditData((prev) => ({ ...prev, [field]: value }))
  }

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setPreview(reader.result)
      setEditData((prev) => ({ ...prev, img: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  const fetchCars = async () => {
    const response = await getCarsAPI()
    if (response && response.data && Array.isArray(response.data)) {
      setCars(response.data)
    }
  }

  useEffect(() => {
    fetchCars()
  }, [])

  const saveAdd = async () => {
    const trimmedName = editData.name.trim()
    if (!trimmedName) return
    
    const newCar = {
      name: trimmedName,
      price: editData.price || '$0/day',
      type: editData.type || 'Unknown',
      seats: editData.seats || 'N/A',
      luggage: editData.luggage || 'N/A',
      img: editData.img
    }

    const response = await addCarAPI(newCar)
    if (response.status === 201 || response.status === 200) {
      fetchCars()
      closeModal()
    } else {
      alert(response.error || 'Failed to add car')
    }
  }

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }

    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [showModal]);

  const saveEdit = async () => {
    if (!editingCar) return
    const response = await updateCarAPI(editingCar.id, editData)
    if (response.status === 200) {
      fetchCars()
      closeModal()
    } else {
      alert(response.error || 'Failed to update car')
    }
  }

  const deleteCar = async (carId) => {
    if (!window.confirm('Delete this car from the list?')) return
    const response = await deleteCarAPI(carId)
    if (response.status === 200) {
      fetchCars()
    } else {
      alert(response.error || 'Failed to delete car')
    }
  }

  const getCarCategory = (car) => {
    const type = String(car.type || '').toLowerCase()
    const name = String(car.name || '').toLowerCase()

    if (type.includes('suv') || name.includes('yukon')) return 'SUV'
    if (type.includes('coach') || type.includes('bus') || type.includes('mini bus') || name.includes('coaster')) return 'Coaches'
    if (type.includes('van') || type.includes('minivan') || type.includes('passenger van') || name.includes('hiace') || name.includes('sprinter') || name.includes('v-class')) return 'Van'
    if (type.includes('sedan')) return 'Sedan'

    // Premium tiers (simple mapping by model keywords)
    if (name.includes('s-class') || name.includes('7 series')) return 'First class'
    return 'Bussiness class'
  }

  const filterOptions = ['All', 'First class', 'Business class', 'SUV', 'Sedan', 'Van', 'Coaches']

  const filteredCars = cars.filter((car) => {
    if (activeFilter === 'All') return true
    return getCarCategory(car) === activeFilter
  })

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: 'white', paddingTop: '140px', paddingBottom: '80px' }}>
      <Container>
        <div className="text-center mb-5">
          <p className="text-uppercase fw-semibold mb-2" style={{ color: '#a0a0a0', letterSpacing: '3px', fontSize: '0.8rem' }}>
            SELECT YOUR DRIVE
          </p>
          <h2 className="display-4 fw-normal mb-4" style={{ fontFamily: 'Georgia, serif' }}>
            Our Extensive Fleet
          </h2>
          <div style={{ width: '60px', height: '2px', backgroundColor: '#fff', margin: '0 auto' }}></div>
            {isAdmin ? (
              <div style={{ marginTop: '20px', color: '#f6d26e', fontSize: '1rem' }}>
                Hii, {user.username}. You can add, edit or delete cards directly from the fleet.
              </div>
            ) : null}
            {isAdmin && (
              <button
                type="button"
                onClick={openAddModal}
                className="btn btn-outline-light rounded-pill mt-4"
                style={{ borderColor: 'rgba(246, 210, 110, 0.8)', color: '#f6d26e', padding: '12px 28px' }}
              >
                <i className="bi bi-plus-lg me-2"></i>
                Add New Car
              </button>
            )}
          </div>

          <div className="d-flex flex-wrap justify-content-center gap-2 gap-md-3 mb-4">
            {filterOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setActiveFilter(option)}
                className="btn btn-sm text-uppercase fw-semibold"
                style={{
                  borderRadius: '999px',
                  padding: '10px 16px',
                  letterSpacing: '1px',
                  border: activeFilter === option ? '1px solid rgba(238, 176, 18, 0.9)' : '1px solid rgba(255,255,255,0.16)',
                  background: activeFilter === option ? 'rgba(238, 176, 18, 0.18)' : 'rgba(255,255,255,0.04)',
                  color: activeFilter === option ? '#f6d26e' : 'rgba(255,255,255,0.85)',
                }}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="row g-4">
            {filteredCars.map((car) => (
              <div key={car.id} className="col-lg-4 col-md-6 mb-4">
                <div
                  className="h-100 p-4 d-flex flex-column"
                  style={{
                    backgroundColor: '#141414',
                    border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'transform 0.3s ease, border-color 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleCardClick(car)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-10px)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                  }}
                >
                  <div className="position-relative mb-4" style={{ height: '220px', backgroundColor: '#1a1a1a', borderRadius: '8px', overflow: 'hidden' }}>
                  {car.img && (
                    <img
                      src={getCarImageUrl(car.img)}
                      alt={car.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: 'contrast(1.1) saturate(1.1)',
                        transition: 'transform 0.5s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  )}
                  {isAdmin && (
                    <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: '10px' }}>
                      <button type="button" onClick={(e) => { e.stopPropagation(); openEditModal(car) }} style={actionIconStyle} title="Edit car">
                        <i className="bi bi-pencil-square"></i>
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); deleteCar(car.id) }} style={deleteIconStyle} title="Delete car">
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  )}
                </div>
                <p className="mb-1 text-uppercase" style={{ fontSize: '0.7rem', color: '#a0a0a0', letterSpacing: '1px' }}>{car.type}</p>
                <h3 className="h4 mb-3" style={{ fontFamily: 'Georgia, serif' }}>{car.name}</h3>

                <div className="mb-3">
                  <span
                    className="badge bg-dark border border-secondary text-light fw-normal py-2 px-3 rounded-pill"
                    style={{ fontSize: '0.72rem' }}
                  >
                    {getCarCategory(car)}
                  </span>
                </div>

                <div className="d-flex flex-wrap gap-2 mb-4 mt-auto">
                  <span className="badge bg-dark border border-secondary text-light fw-normal py-2 px-3 rounded-pill" style={{ fontSize: '0.75rem' }}>
                    <i className="bi bi-people-fill me-2" style={{ color: '#eeb012' }}></i>
                    {car.seats}
                  </span>
                  <span className="badge bg-dark border border-secondary text-light fw-normal py-2 px-3 rounded-pill" style={{ fontSize: '0.75rem' }}>
                    <i className="bi bi-briefcase-fill me-2" style={{ color: '#eeb012' }}></i>
                    {car.luggage}
                  </span>
                </div>

                <div className="d-flex justify-content-between align-items-center pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="fw-bold fs-5">{car.price}</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleCardClick(car); }} 
                    className="btn btn-sm px-3 rounded-0 text-uppercase"
                    style={{ fontSize: '0.7rem', letterSpacing: '1px', background: 'linear-gradient(135deg, #231b12, #a98231, #d4b56d)', color: '#000', boxShadow: '0 8px 16px rgba(212, 181, 109, 0.18)' }}
                  >
                    Rent Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>

      {showModal && (
        <div style={modalOverlayStyle} onClick={closeModal}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h4 style={{ margin: 0 }}>{editingCar ? 'Edit Car' : 'Add New Car'}</h4>
                <p style={{ margin: '6px 0 0', color: '#c4c4c4', fontSize: '0.9rem' }}>
                  {editingCar ? 'Update image, name, price and details.' : 'Provide all details to add a new car to the fleet.'}
                </p>
              </div>
              <button onClick={closeModal} style={closeButtonStyle} title="Close modal">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div style={{ display: 'grid', gap: '14px' }}>
              <div style={{ display: 'grid', gap: '10px' }}>
                <label style={{ color: '#f3f3f3', fontSize: '0.9rem' }}>Cover Image</label>
                <div style={{ width: '100%', minHeight: '180px', borderRadius: '16px', overflow: 'hidden', background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {(preview || editData.img) ? (
                    <img src={preview || getCarImageUrl(editData.img)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : null}
                </div>
                <input type="file" accept="image/*" onChange={handleImageSelect} style={{ color: '#fff' }} />
              </div>
              <div style={{ display: 'grid', gap: '10px' }}>
                <label style={{ color: '#f3f3f3', fontSize: '0.9rem' }}>Name</label>
                <input value={editData.name} onChange={(e) => handleEditChange('name', e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gap: '10px' }}>
                <label style={{ color: '#f3f3f3', fontSize: '0.9rem' }}>Price</label>
                <input value={editData.price} onChange={(e) => handleEditChange('price', e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gap: '10px' }}>
                <label style={{ color: '#f3f3f3', fontSize: '0.9rem' }}>Type</label>
                <input value={editData.type} onChange={(e) => handleEditChange('type', e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gap: '10px' }}>
                <label style={{ color: '#f3f3f3', fontSize: '0.9rem' }}>Seats</label>
                <input value={editData.seats} onChange={(e) => handleEditChange('seats', e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gap: '10px' }}>
                <label style={{ color: '#f3f3f3', fontSize: '0.9rem' }}>Luggage</label>
                <input value={editData.luggage} onChange={(e) => handleEditChange('luggage', e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '6px' }}>
                <button onClick={closeModal} style={secondaryModalButtonStyle}>Cancel</button>
                <button onClick={editingCar ? saveEdit : saveAdd} style={primaryModalButtonStyle}>
                  {editingCar ? 'Save Changes' : 'Add Car'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const actionIconStyle = {
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'rgba(0,0,0,0.45)',
  color: '#fff',
  width: '38px',
  height: '38px',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer'
};

const deleteIconStyle = {
  ...actionIconStyle,
  border: '1px solid rgba(255,100,100,0.4)',
  color: '#ffb3b3'
};

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.82)',
  zIndex: 1100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  pointerEvents: 'auto'
};

const modalStyle = {
  width: '100%',
  maxWidth: '520px',
  background: '#12121b',
  borderRadius: '22px',
  padding: '24px',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 20px 70px rgba(0,0,0,0.5)',
  maxHeight: 'calc(100vh - 120px)',
  overflowY: 'auto',
  pointerEvents: 'auto'
};

const closeButtonStyle = {
  border: 'none',
  background: 'transparent',
  color: '#fff',
  fontSize: '1.1rem',
  cursor: 'pointer'
};

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: '14px',
  border: '1px solid rgba(255,255,255,0.12)',
  background: '#18181f',
  color: '#fff',
  fontSize: '0.95rem'
};

const primaryModalButtonStyle = {
  border: 'none',
  background: 'linear-gradient(135deg, #231b12, #a98231, #d4b56d)',
  color: '#000',
  borderRadius: '14px',
  padding: '12px 24px',
  cursor: 'pointer',
  fontWeight: 700
};

const secondaryModalButtonStyle = {
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'transparent',
  color: '#fff',
  borderRadius: '14px',
  padding: '12px 24px',
  cursor: 'pointer'
};

export default Carlist
