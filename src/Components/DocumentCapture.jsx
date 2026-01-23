import React, { useState } from 'react'
import WebcamCapture from './WebcamCapture.jsx'

const DocumentCapture = ({ onCapture, label = "Scatta Foto Documento", type = "front" }) => {
  const [capturedImage, setCapturedImage] = useState(null)

  const handleImageCapture = (imageData) => {
    setCapturedImage(imageData)
    onCapture(imageData)
  }

  return (
    <div>
      <WebcamCapture
        onCapture={handleImageCapture}
        label={label}
        type={type}
      />
    </div>
  )
}

export default DocumentCapture