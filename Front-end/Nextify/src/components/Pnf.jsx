import React from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
function Pnf() {
  const { t } = useLanguage()
  return (
    <>
      <div className='text-center p-5 bg-secondary' style={{fontFamily:"Josefin Sans"}}>
        <img src="https://webartdevelopers.com/blog/wp-content/uploads/2018/10/SVG-Animation-404-Page.gif" alt="" />
        <p>{t('pnf.oh')}</p>
        <h1 className='fw-bold'>{t('pnf.lost')}</h1>
        <p>{t('pnf.missing')}</p>
        <Link to={'/'}><button className='btn btn-success rounded'>{t('pnf.back')}</button></Link>
      </div>
    </>
  )
}

export default Pnf
