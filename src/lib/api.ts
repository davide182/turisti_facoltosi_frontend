import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor per gestire strutture di risposta diverse
api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object') {
      // cerca vari campi comuni che potrebbero contenere i dati
      if ('data' in response.data) {
        return {
          ...response,
          data: response.data
        };
      } else if ('content' in response.data) {
        return {
          ...response,
          data: { data: response.data.content }
        };
      } else if ('items' in response.data) {
        return {
          ...response,
          data: { data: response.data.items }
        };
      } else if ('prenotazioni' in response.data) {
        return {
          ...response,
          data: { data: response.data.prenotazioni }
        };
      } else if ('utenti' in response.data) {
        return {
          ...response,
          data: { data: response.data.utenti }
        };
      }
      return {//assumiamo che l'intera risposta sia i dati
        ...response,
        data: { data: response.data }
      };
    }
    
    return response;
  },
  (error) => {
    if (error.response) {
      if (error.response.status === 404) {
        error.message = 'Endpoint non trovato: ' + error.config?.url;
      } else if (error.response.status === 500) {
        error.message = 'Errore interno del server: ' + (error.response.data?.message || 'Controlla i log del backend');
      } else if (error.response.data?.message) {
        error.message = error.response.data.message;
      }
    } else if (error.request) {
      error.message = 'Nessuna risposta dal server. Il backend è in esecuzione?';
    }
    
    return Promise.reject(error);
  }
);

// servizi per Utente
export const utenteService = {
  getAll: () => api.get('/utenti'),
  getById: (id: number) => api.get(`/utenti/${id}`),
  create: (data: any) => api.post('/utenti', data),
  update: (id: number, data: any) => api.put(`/utenti/${id}`, data),
  disable: (id: number) => api.put(`/utenti/${id}/disable`),
  enable: (id: number) => api.put(`/utenti/${id}/enable`),
};

// servizi per Abitazione
export const abitazioneService = {
  getAll: () => api.get('/abitazioni'),
  getById: (id: number) => api.get(`/abitazioni/${id}`),
  create: (data: any) => api.post('/abitazioni', data),
  update: (id: number, data: any) => api.put(`/abitazioni/${id}`, data),
  disable: (id: number) => api.put(`/abitazioni/${id}/disable`),
  enable: (id: number) => api.put(`/abitazioni/${id}/enable`),
  getByUtente: (idUtente: number) => api.get(`/abitazioni/utente/${idUtente}`),
  getByCodiceHost: (codiceHost: string) => api.get(`/abitazioni/host/${codiceHost}`),
  getAbitazionePiuGettonata: () => api.get('/abitazioni/statistiche/piu-gettonata'),
  getMediaPostiLetto: () => api.get('/abitazioni/statistiche/media-posti-letto'),
};

// servizi per Host
export const hostService = {
  getAll: () => api.get('/host'),
  getById: (id: number) => api.get(`/host/${id}`),
  getByCodice: (codice: string) => api.get(`/host/codice/${codice}`),
  promoteToHost: (idUtente: number) => api.post(`/host/promuovi/${idUtente}`),
  isHost: (idUtente: number) => api.get(`/host/verifica/${idUtente}`),
  getSuperHosts: () => api.get('/host/statistiche/super'),
  getHostsConPiuPrenotazioni: () => api.get('/host/statistiche/prenotazioni-ultimo-mese'),
  checkAndPromoteToSuperHost: (idUtente: number) => api.post(`/host/verifica-super/${idUtente}`),
};

// servizi per Prenotazione
export const prenotazioneService = {
  getAll: () => api.get('/prenotazioni'),
  getById: (id: number) => api.get(`/prenotazioni/${id}`),
  create: (data: any) => api.post('/prenotazioni', data),
  update: (id: number, data: any) => api.put(`/prenotazioni/${id}`, data),
  updateStato: (id: number, stato: string) => api.put(`/prenotazioni/${id}/stato`, { stato }),
  cancel: (id: number) => api.put(`/prenotazioni/${id}/cancella`),
  getByUtente: (idUtente: number) => api.get(`/prenotazioni/utente/${idUtente}`),
  getByAbitazione: (idAbitazione: number) => api.get(`/prenotazioni/abitazione/${idAbitazione}`),
  getUltimaByUtente: (idUtente: number) => api.get(`/prenotazioni/utente/${idUtente}/ultima`),
  getPrenotazioniUltimoMese: () => api.get('/prenotazioni/statistiche/ultimo-mese'),
  getGiorniPrenotati: (idUtente: number) => api.get(`/prenotazioni/statistiche/utente/${idUtente}/giorni-ultimo-mese`),
  getTop5UtentiGiorniPrenotati: () => api.get('/prenotazioni/statistiche/utenti-top-5'),
};

// servizi per Feedback
export const feedbackService = {
  getAll: () => api.get('/feedback'),
  getById: (id: number) => api.get(`/feedback/${id}`),
  create: (data: any) => api.post('/feedback', data),
  update: (id: number, data: any) => api.put(`/feedback/${id}`, data),
  delete: (id: number) => api.delete(`/feedback/${id}`),
  getByPrenotazione: (idPrenotazione: number) => api.get(`/feedback/prenotazione/${idPrenotazione}`),
  getByAbitazione: (idAbitazione: number) => api.get(`/feedback/abitazione/${idAbitazione}`),
  getByHost: (idUtente: number) => api.get(`/feedback/host/${idUtente}`),
  getConAltoPunteggio: (minPunteggio: number = 4) => api.get(`/feedback/statistiche/alto-punteggio?minPunteggio=${minPunteggio}`),
  getMediaPunteggioHost: (idUtente: number) => api.get(`/feedback/statistiche/host/${idUtente}/media-punteggio`),
};

// funzione di test per verificare la connessione
export const testBackendConnection = async () => {
  try {
    const response = await api.get('/utenti');
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Backend non raggiungibile:', error.message);
    return { 
      success: false, 
      error: error.message,
    };
  }
};

export default api;