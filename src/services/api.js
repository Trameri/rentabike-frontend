import axios from 'axios';

// URL base API centralizzato: usa SEMPRE base URL assoluta verso Render
// L'endpoint corretto è https://rentabike-backend-1.onrender.com e tutte le rotte devono includere /api
const ABSOLUTE_BACKEND = import.meta.env.VITE_API_BASE_URL || 'https://rentabike-backend-1.onrender.com';

// Normalizza la base: rimuove eventuale trailing slash
const normalizeBase = (url) => url.endsWith('/') ? url.slice(0, -1) : url;
const BASE = normalizeBase(ABSOLUTE_BACKEND);
console.log('🌐 Backend URL configurato:', BASE);

export const api = axios.create({ baseURL: BASE });

export function setToken(t){
  localStorage.setItem('token', t);
  api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
}

export function getToken(){
  const t = localStorage.getItem('token');
  if(t) api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
  return t;
}

export function clearToken(){
  localStorage.removeItem('token');
  delete api.defaults.headers.common['Authorization'];
}

// Inizializza il token all'avvio se presente
getToken();

// Interceptor per debug delle richieste
api.interceptors.request.use(
  (config) => {
    // Modifica solo percorsi locali
    const path = config.url || '';
    if (!/^https?:\/\//i.test(path)) {
      // Normalizza aggiungendo /api solo se manca completamente
      const shouldAddApi = !path.startsWith('/api') && !path.startsWith('api/');
      config.url = shouldAddApi ? `/api${path.startsWith('/') ? '' : '/'}${path}` : path;
    }
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Interceptor per debug delle risposte
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);
