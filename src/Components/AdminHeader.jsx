import React from "react";

const logoMap = {
    'cancano': '/logos/Cancano.svg',
    'arnoga': '/logos/arnoga.svg',
    'campo': '/logos/campo-sportivo-new.jpg',
    'campo-sportivo': '/logos/campo-sportivo-new.jpg',
    'valdidentro': '/logos/valdidentro.png',
};

export default function AdminHeader({ username }) {
    const uname = username?.trim().toLowerCase();
    if (uname === 'superadmin') {
        return (
            <div style={{display:'flex',gap:'16px',alignItems:'center',marginBottom:'24px',justifyContent:'center'}}>
                {Object.values(logoMap).map((src, i) => (
                    <img key={i} src={src} alt="Logo" style={{width:48,height:48,borderRadius:8,background:'#fff',boxShadow:'0 2px 8px rgba(0,0,0,0.12)'}} />
                ))}
                <span style={{fontWeight:700,fontSize:'1.2rem',color:'#2d3a4a'}}>Superadmin</span>
            </div>
        );
    }
    const logoSrc = logoMap[uname];
    return (
        <div style={{display:'flex',alignItems:'center',gap:'16px',marginBottom:'24px',justifyContent:'center'}}>
            {logoSrc ? (
                <img src={logoSrc} alt={uname} style={{width:56,height:56,borderRadius:12,background:'#fff',boxShadow:'0 2px 8px rgba(0,0,0,0.12)'}} />
            ) : (
                <span style={{fontSize:'2.5rem'}}>🚲</span>
            )}
            <span style={{fontWeight:700,fontSize:'1.2rem',color:'#2d3a4a'}}>{uname?.charAt(0).toUpperCase() + uname?.slice(1)}</span>
        </div>
    );
}
