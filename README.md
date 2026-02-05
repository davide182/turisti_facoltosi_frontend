TURISTA FACOLTOSO -- SISTEMA PRENOTAZIONE

Un'applicazione completa per la gestione di prenotazioni di abitazioni turistiche, sviluppata con architettura backend-frontend separata.


BACKEND (Java + Javalin + PostgreSQL)

Tecnologie Utilizzate:
Java 21+ - Linguaggio principale

Javalin - Framework web lightweight

PostgreSQL - Database relazionale

JDBC - Connessione al database

SLF4J + Logback - Logging


DATABASE SCHEMA

Il sistema gestisce 5 tabelle principali:

utente - Informazioni degli utenti

host - Utenti che offrono alloggi

abitazione - Alloggi disponibili

prenotazione - Prenotazioni effettuate

feedback - Recensioni degli ospiti

API Endpoints Principali

GET http://localhost:8080/ - Verifica che il server sia attivo

GET http://localhost:8080/api/db-test - Test connessione database

GET http://localhost:8080/api/utenti - Tutti gli utenti

GET http://localhost:8080/api/utenti/{id} - Utente specifico

GET http://localhost:8080/api/host/{id} - Host per ID utente

GET http://localhost:8080/api/host - Tutti gli host

GET http://localhost:8080/api/host/statistiche/super - Tutti i Super Host

GET http://localhost:8080/api/host/statistiche/prenotazioni-ultimo-mese - Host con più prenotazioni

GET http://localhost:8080/api/abitazioni - Tutte le abitazioni

GET http://localhost:8080/api/abitazioni/{id} - Abitazione specifica

GET http://localhost:8080/api/abitazioni/statistiche/media-posti-letto - Media posti letto

GET http://localhost:8080/api/prenotazioni - Tutte le prenotazioni

GET http://localhost:8080/api/prenotazioni/{id} - Prenotazione specifica

GET http://localhost:8080/api/prenotazioni/utente/{idUtente}/ultima - Ultima prenotazione utente

GET http://localhost:8080/api/feedback - Tutti i feedback

GET http://localhost:8080/api/feedback/statistiche/alto-punteggio - Feedback con punteggio alto 


POST http://localhost:8080/api/create-tables -  Crea tutte le tabelle nel database se non esistono

POST http://localhost:8080/api/utenti - Crea un nuovo utente

POST http://localhost:8080/api/host/promuovi/{idUtente} - Promuovi un utente a host 

POST http://localhost:8080/api/abitazioni - Crea una nuova abitazione

POST http://localhost:8080/api/prenotazioni - Crea una nuova prenotazione

POST http://localhost:8080/api/feedback - Crea un nuovo feedback


PUT http://localhost:8080/api/utenti/{id} - Aggiorna i dati di un utente

PUT http://localhost:8080/api/utenti/{id}/disable - Disabilita un utente 

PUT http://localhost:8080/api/utenti/{id}/enable - Riabilita un utente

PUT http://localhost:8080/api/abitazioni/{id} - Aggiorna i dati di un'abitazione

PUT http://localhost:8080/api/abitazioni/{id}/disable - Disabilita un'abitazione

PUT http://localhost:8080/api/abitazioni/{id}/enable - Riabilita un'abitazione

PUT http://localhost:8080/api/prenotazioni/{id} - Aggiorna i dati di una prenotazione 

PUT http://localhost:8080/api/feedback/{id}


DELETE http://localhost:8080/api/feedback/{id} - Elimina definitivamente un feedback


Server disponibile su: http://localhost:8080


FRONTEND(React + TypeScript)
Tecnologie utilizzate:

React 18

TypeScript

Tailwind CSS

Shadcn/ui components

Axios per le API calls

React Router per la navigazione

Pagine principali:

TURISTA FACOLTOSO: Panoramica generale del sistema

Utenti: Gestione utenti (CRUD)

Abitazioni: Gestione proprietà

Host: Gestione host e super host

Prenotazioni: Gestione prenotazioni

Feedback: Gestione recensioni

Statistiche: Report e analisi


FUNZIONI PRINCIPALI

GESTIONE UTENTI
Registrazione nuovi utenti

Modifica/Disabilitazione utenti

Controlli di integrità per la disabilitazione

GESTIONE ABITAZIONI
Aggiunta nuove proprietà

Calcolo automatico disponibilità

Controlli per eliminazione/disabilitazione

Sistema Host
Promozione utenti a host

Riconoscimento Super Host (100+ prenotazioni)

Classifica host più attivi


PRENOTAZIONI
Sistema stati (In attesa/Confermata/Completata/Cancellata)

Calcolo automatico prezzi

Controlli di validità


FEEDBACK
Sistema a stelle (1-5)

Ricerca feedback alto punteggio

Statistiche valutazioni

Statistiche
Abitazione più prenotata

Media posti letto

Top 5 utenti per giorni prenotati

Ricerca ultima prenotazione per utente

Il frontend sarà disponibile su http://localhost:5173


LOGICA BUSINESS

Super Host
Un utente diventa Super Host automaticamente quando raggiunge 100+ prenotazioni valide (completate).

Disponibilità Abitazioni
Il sistema calcola la disponibilità considerando:

Periodo di disponibilità configurato

Prenotazioni esistenti

Stato manuale (attivo/disattivo)

Validazione Operazioni
Eliminazione Utenti: Bloccata se hanno abitazioni o prenotazioni attive

Eliminazione Abitazioni: Bloccata se hanno prenotazioni future/attive

Cancellazione Prenotazioni: Possibile solo per stati "In attesa" e "Confermata"


INTERFACCIA UTENTE

Componenti Principali
DataTable: Tabella riutilizzabile con azioni CRUD

FormDialog: Modale per creazione/modifica dati

Alert System: Feedback visivo per le operazioni

Stat Cards: Visualizzazione dati aggregati

Design System
Tailwind CSS per styling

Componenti Shadcn/ui per consistenza