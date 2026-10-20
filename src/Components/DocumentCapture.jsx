import WebcamCapture from './WebcamCapture.jsx'

const DocumentCapture = ({ onCapture, imageData = null, label = "Scatta Foto Documento", type = "front" }) => {
  return (
    <div>
      <WebcamCapture
        onCapture={onCapture}
        label={label}
        type={type}
        initialImage={imageData}
      />
    </div>
  )
}

export default DocumentCapture