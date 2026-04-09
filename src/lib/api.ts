import axios from 'axios';
import type { ApiResponse } from '../types';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor per normalizzare le risposte del backend
api.interceptors.response.use(
  (response) => {
    // Se la risposta ha già la struttura { status, data }, la lascio invariata
    if (response.data && typeof response.data === 'object') {
      if ('data' in response.data) {
        return response;
      }
      if (Array.isArray(response.data)) {
        return {
          ...response,
          data: { status: 'success', data: response.data, count: response.data.length }
        };
      }
      if ('content' in response.data && Array.isArray(response.data.content)) {
        return {
          ...response,
          data: { status: 'success', data: response.data.content, totalElements: response.data.totalElements }
        };
      }
      if ('items' in response.data && Array.isArray(response.data.items)) {
        return {
          ...response,
          data: { status: 'success', data: response.data.items, count: response.data.items.length }
        };
      }
      if ('mediaPostiLetto' in response.data) {
        return {
          ...response,
          data: { status: 'success', data: response.data }
        };
      }
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
      } else if (error.response.data?.error) {
        error.message = error.response.data.error + ': ' + (error.response.data.message || '');
      }
    } else if (error.request) {
      error.message = 'Nessuna risposta dal server. Il backend è in esecuzione su http://localhost:8080?';
    }
    
    return Promise.reject(error);
  }
);

export const utenteService = {
  getAll: () => api.get('/utenti'),
  getById: (id: number) => api.get(`/utenti/${id}`),
  create: (data: any) => api.post('/utenti', data),
  update: (id: number, data: any) => api.put(`/utenti/${id}`, data),
  disable: (id: number) => api.put(`/utenti/${id}/disable`),
  enable: (id: number) => api.put(`/utenti/${id}/enable`),
};

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

export const hostService = {
  getAll: () => api.get('/host'),
  getById: (id: number) => api.get(`/host/${id}`),
  getByCodice: (codice: string) => api.get(`/host/codice/${codice}`),
  promoteToHost: (idUtente: number) => api.post(`/host/promuovi/${idUtente}`),
  isHost: (idUtente: number) => api.get(`/host/verifica/${idUtente}`),
  getSuperHosts: () => api.get('/host/statistiche/super'),
  getTopHostsUltimoMese: () => api.get('/host/statistiche/prenotazioni-ultimo-mese'),
  checkAndPromoteToSuperHost: (idUtente: number) => api.post(`/host/verifica-super/${idUtente}`),
};

export const prenotazioneService = {
  getAll: () => api.get('/prenotazioni'),
  getById: (id: number) => api.get(`/prenotazioni/${id}`),
  create: (data: any) => api.post('/prenotazioni', data),
  update: (id: number, data: any) => api.put(`/prenotazioni/${id}`, data),
  updateStato: (id: number, stato: string) => api.put(`/prenotazioni/${id}/stato`, stato),
  cancel: (id: number) => api.put(`/prenotazioni/${id}/cancella`),
  getByUtente: (idUtente: number) => api.get(`/prenotazioni/utente/${idUtente}`),
  getByAbitazione: (idAbitazione: number) => api.get(`/prenotazioni/abitazione/${idAbitazione}`),
  getUltimaByUtente: (idUtente: number) => api.get(`/prenotazioni/utente/${idUtente}/ultima`),
  getPrenotazioniUltimoMese: () => api.get('/prenotazioni/statistiche/ultimo-mese'),
  getGiorniPrenotati: (idUtente: number) => api.get(`/prenotazioni/statistiche/utente/${idUtente}/giorni-ultimo-mese`),
  getTop5UtentiGiorniPrenotati: () => api.get('/prenotazioni/statistiche/utenti-top-5'),
};

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