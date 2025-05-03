import React, { useState, useEffect, useRef } from 'react'
import '../css/Loading.css'
import { PuffLoader } from 'react-spinners'

const Loading = () => {
  const [size, setSize] = useState({width: window.innerWidth, height: window.innerHeight})
  const setResize = () => {
    setSize({
      width: window.innerWidth,
      height: window.innerHeight
    })
  }

  useEffect(() => {
    window.addEventListener('resize', setResize)

    return () => {
      window.removeEventListener('resize', setResize)
    }
  }, [])

  return (
    <div style={{
      width: size.width,
      height: size.height
    }} className='onload'>
      <div className='loader-wrapper'>
        <PuffLoader color='#0077ff' size={100} speedMultiplier={0.6}/>
        <p>LOADING</p>
      </div>
    </div>
  )
}

export default Loading