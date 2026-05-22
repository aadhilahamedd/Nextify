import React from 'react'
import { Link } from 'react-router-dom'
function Pnf() {
  return (
    <>
      <div className='text-center p-5 bg-secondary' style={{fontFamily:"Josefin Sans"}}>
        <img src="https://webartdevelopers.com/blog/wp-content/uploads/2018/10/SVG-Animation-404-Page.gif" alt="" />
        <p>Oh No!</p>
        <h1 className='fw-bold'>Look Like You're Lost</h1>
        <p>The Page Your Looking for is not Available</p>
        <Link to={'/'}><button className='btn btn-success rounded'>Back Home</button></Link>
      </div>
    </>
  )
}

export default Pnf
