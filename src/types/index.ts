export interface Host {
  idUtente: number;
  codiceHost: string;
  isSuperHost: boolean;
  dataDiventatoSuper: string | null;
  totPrenotazioni: number;
  prenotazioniUltimoMese?: number;
}

export interface Utente {
  idUtente: number;
  nome: string;
  cognome: string;
  email: string;
  indirizzo: string;
  attivo: boolean;
}

export interface Abitazione {
  idAbitazione: number;
  idUtente: number;
  nome: string;
  indirizzo: string;
  numeroLocali: number;
  numeroPostiLetto: number;
  piano: number | null;
  prezzoPerNotte: number;
  dataInizioDisponibilita: string;
  dataFineDisponibilita: string;
  disponibile: boolean;
}

export interface Prenotazione {
  idPrenotazione: number;
  idAbitazione: number;
  idUtente: number;
  dataInizioPrenotazione: string;
  dataFinePrenotazione: string;
  stato: 'IN_ATTESA' | 'CONFERMATA' | 'CANCELLATA' | 'COMPLETATA';
  prezzoTotale: number;
  cancellataDalUtente: boolean;
  dataPrenotazione?: string;
}

export interface Feedback {
  idFeedback: number;
  idPrenotazione: number;
  titolo: string;
  testo: string;
  punteggio: number;
  dataCreazione?: string;
}

export interface ApiResponse<T> {
  status: string;
  message?: string;
  data?: T;
  count?: number;
  id?: number;
}

export interface HostConPrenotazioniMensili extends Host {
  prenotazioniUltimoMese: number;
}