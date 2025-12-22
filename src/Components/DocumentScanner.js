import React, { useRef, useState } from "react";

const DocumentScanner = ({ onCapture }) => {
  const videoRef = useRef(null);
  const [image, setImage] = useState(null);

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
  };

  const capturePhoto = () => {
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    setImage(dataUrl);
    onCapture(dataUrl);
  };

  return (
    <div>
      {!image && (
        <div>
          <video ref={videoRef} autoPlay playsInline width="400" height="300" />
          <button onClick={startCamera}>Avvia Fotocamera</button>
          <button onClick={capturePhoto}>Scatta Foto</button>
        </div>
      )}
      {image && <img src={image} alt="Documento" width="400" />}
    </div>
  );
};

export default DocumentScanner;
