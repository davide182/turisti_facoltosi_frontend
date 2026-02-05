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
  piano?: number;
  prezzoPerNotte: number;
  dataInizioDisponibilita: string;
  dataFineDisponibilita: string;
  disponibile: boolean;
}

export interface Host {
  idUtente: number;
  codiceHost: string;
  isSuperHost: boolean;
  dataDiventatoSuper?: string;
  totPrenotazioni: number;
}

export type StatoPrenotazione = //type per essere più leggero e manipolarlo in sviluppo con API REST 
  | 'IN_ATTESA' 
  | 'CONFERMATA' 
  | 'CANCELLATA' 
  | 'COMPLETATA';

export interface Prenotazione {
  idPrenotazione: number;
  idAbitazione: number;
  idUtente: number;
  dataInizioPrenotazione: string;
  dataFinePrenotazione: string;
  stato: StatoPrenotazione;
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

export interface TopUtente {
  idUtente: number;
  nome: string;
  cognome: string;
  email: string;
  giorniTotali: number;
  numPrenotazioni: number;
}

export interface Statistiche {
  abitazionePiuGettonata?: Abitazione;
  mediaPostiLetto: number;
  superHosts: Host[];
  hostsConPiuPrenotazioni: Host[];
  top5Utenti: TopUtente[];
}

export interface ApiResponse<T> {
  status: string;
  message?: string;
  data: T;
  count?: number;
  [key: string]: any;
}