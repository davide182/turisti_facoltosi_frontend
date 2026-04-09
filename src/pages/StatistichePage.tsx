import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Building, 
  Users, 
  Star, 
  TrendingUp, 
  Calendar, 
  Bed,
  Trophy,
  BarChart3,
  AlertCircle,
  Search,
  User,
  Clock
} from 'lucide-react';
import {
  abitazioneService,
  hostService,
  prenotazioneService,
  feedbackService,
  utenteService,
} from '@/lib/api';
import type { Abitazione, Prenotazione, Utente, Host } from '@/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// interfaccia per le statistiche degli utenti
interface UtenteStatistiche {
  idUtente: number;
  nome?: string;
  cognome?: string;
  email?: string;
  giorniTotali: number;
  numPrenotazioni: number;
}

// interfaccia per host con prenotazioni mensili
interface HostConMensili extends Host {
  prenotazioniUltimoMese?: number;
}

const StatistichePage = () => {
  const [stats, setStats] = useState({
    abitazionePiuGettonata: null as Abitazione | null,
    mediaPostiLetto: 0,
    superHosts: [] as Host[],
    hostsConPiuPrenotazioni: [] as HostConMensili[],
    top5Utenti: [] as UtenteStatistiche[],
    prenotazioniUltimoMese: 0,
    feedbackAltoPunteggio: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [idUtenteRicerca, setIdUtenteRicerca] = useState<string>('');
  const [ultimaPrenotazione, setUltimaPrenotazione] = useState<Prenotazione | null>(null);
  const [utenteRicerca, setUtenteRicerca] = useState<Utente | null>(null);
  const [ricercaLoading, setRicercaLoading] = useState(false);
  const [ricercaError, setRicercaError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  // cerca ultima prenotazione per ID utente
  const cercaUltimaPrenotazione = async () => {
    if (!idUtenteRicerca.trim()) {
      setRicercaError('Inserisci un ID utente valido');
      return;
    }

    const idUtente = parseInt(idUtenteRicerca);
    if (isNaN(idUtente) || idUtente <= 0) {
      setRicercaError('ID utente non valido');
      return;
    }

    try {
      setRicercaLoading(true);
      setRicercaError(null);
      setUltimaPrenotazione(null);
      setUtenteRicerca(null);

      // ottieni l'utente per avere i dettagli
      try {
        const utenteRes = await utenteService.getById(idUtente);
        setUtenteRicerca(utenteRes.data.data || null);
      } catch (error) {
        console.warn('Utente non trovato, continuo comunque');
      }

      // ottieni l'ultima prenotazione dell'utente
      const prenotazioneRes = await prenotazioneService.getUltimaByUtente(idUtente);
      const prenotazioneData = prenotazioneRes.data.data;

      if (prenotazioneData) {
        setUltimaPrenotazione(prenotazioneData);
      } else {
        setRicercaError('Nessuna prenotazione trovata per questo utente');
      }
    } catch (error: any) {
      console.error('Errore nella ricerca ultima prenotazione:', error);
      setRicercaError(error.message || 'Errore nella ricerca');
    } finally {
      setRicercaLoading(false);
    }
  };

  // formatta data per visualizzazione
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // ottiene colore per stato prenotazione
  const getStatoColor = (stato: string) => {
    switch (stato) {
      case 'IN_ATTESA': return 'bg-yellow-100 text-yellow-800';
      case 'CONFERMATA': return 'bg-blue-100 text-blue-800';
      case 'COMPLETATA': return 'bg-green-100 text-green-800';
      case 'CANCELLATA': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // funzione helper per estrarre i dati dalle risposte API
  const extractData = (response: any): any => {
    if (!response || !response.data) return null;
    // Se la risposta ha la struttura { status, data }
    if (response.data.data !== undefined) return response.data.data;
    // Se la risposta è diretta
    return response.data;
  };

  const loadStats = async () => {
    try {
      setError(null);
      setLoading(true);
      
      console.log('Caricamento statistiche...');
      
      const [
        abitazionePiuGettonataRes,
        mediaPostiLettoRes,
        superHostsRes,
        hostsPrenotazioniRes,
        top5UtentiRes,
        prenotazioniUltimoMeseRes,
        feedbackAltoRes,
      ] = await Promise.all([
        abitazioneService.getAbitazionePiuGettonata().catch((err) => {
          console.warn('Errore abitazione più gettonata:', err.message);
          return { data: { data: null } };
        }),
        abitazioneService.getMediaPostiLetto().catch((err) => {
          console.warn('Errore media posti letto:', err.message);
          return { data: { mediaPostiLetto: 0 } };
        }),
        hostService.getSuperHosts().catch((err) => {
          console.warn('Errore super hosts:', err.message);
          return { data: { data: [] } };
        }),
        // CORREZIONE: usa getTopHostsUltimoMese invece di getHostsConPiuPrenotazioni
        hostService.getTopHostsUltimoMese().catch((err) => {
          console.warn('Errore hosts con più prenotazioni:', err.message);
          return { data: { data: [] } };
        }),
        prenotazioneService.getTop5UtentiGiorniPrenotati().catch((err) => {
          console.warn('Errore top 5 utenti:', err.message);
          return { data: { data: [] } };
        }),
        prenotazioneService.getPrenotazioniUltimoMese().catch((err) => {
          console.warn('Errore prenotazioni ultimo mese:', err.message);
          return { data: { count: 0 } };
        }),
        feedbackService.getConAltoPunteggio(4).catch((err) => {
          console.warn('Errore feedback alto punteggio:', err.message);
          return { data: { count: 0 } };
        }),
      ]);

      console.log('Risposte API:', {
        abitazionePiuGettonata: abitazionePiuGettonataRes.data,
        mediaPostiLetto: mediaPostiLettoRes.data,
        superHosts: superHostsRes.data,
        hostsConPiuPrenotazioni: hostsPrenotazioniRes.data,
        top5Utenti: top5UtentiRes.data,
        prenotazioniUltimoMese: prenotazioniUltimoMeseRes.data,
        feedbackAltoPunteggio: feedbackAltoRes.data,
      });

      // Estrai i dati
      const abitazionePiuGettonata = extractData(abitazionePiuGettonataRes);
      const superHosts = extractData(superHostsRes) || [];
      const hostsConPiuPrenotazioni = extractData(hostsPrenotazioniRes) || [];
      let top5Utenti = extractData(top5UtentiRes) || [];
      
      // Estrai media posti letto
      let mediaPostiLetto = 0;
      const mediaData = mediaPostiLettoRes.data;
      if (mediaData?.mediaPostiLetto !== undefined) {
        mediaPostiLetto = typeof mediaData.mediaPostiLetto === 'number' 
          ? mediaData.mediaPostiLetto 
          : parseFloat(mediaData.mediaPostiLetto) || 0;
      } else if (mediaData?.data?.mediaPostiLetto !== undefined) {
        mediaPostiLetto = typeof mediaData.data.mediaPostiLetto === 'number'
          ? mediaData.data.mediaPostiLetto
          : parseFloat(mediaData.data.mediaPostiLetto) || 0;
      }

      // Estrai numero prenotazioni ultimo mese
      let prenotazioniUltimoMese = 0;
      const prenotazioniData = prenotazioniUltimoMeseRes.data;
      if (prenotazioniData?.count !== undefined) {
        prenotazioniUltimoMese = typeof prenotazioniData.count === 'number' 
          ? prenotazioniData.count 
          : prenotazioniData.count;
      } else if (Array.isArray(prenotazioniData?.data)) {
        prenotazioniUltimoMese = prenotazioniData.data.length;
      } else if (Array.isArray(prenotazioniData)) {
        prenotazioniUltimoMese = prenotazioniData.length;
      }

      // Estrai numero feedback alto punteggio
      let feedbackAltoPunteggio = 0;
      const feedbackData = feedbackAltoRes.data;
      if (feedbackData?.count !== undefined) {
        feedbackAltoPunteggio = typeof feedbackData.count === 'number' 
          ? feedbackData.count 
          : feedbackData.count;
      } else if (Array.isArray(feedbackData?.data)) {
        feedbackAltoPunteggio = feedbackData.data.length;
      } else if (Array.isArray(feedbackData)) {
        feedbackAltoPunteggio = feedbackData.length;
      }

      // Se top5Utenti è vuoto, prova a calcolare manualmente
      if (!top5Utenti || top5Utenti.length === 0) {
        console.log('API top 5 utenti ha restituito array vuoto, calcolo manuale...');
        try {
          const prenotazioniRes = await prenotazioneService.getPrenotazioniUltimoMese();
          const prenotazioniUltimoMese = extractData(prenotazioniRes) || [];
          
          if (prenotazioniUltimoMese.length > 0) {
            const utentiRes = await utenteService.getAll();
            const utenti = extractData(utentiRes) || [];
            
            const utentiMap = new Map<number, UtenteStatistiche>();
            
            prenotazioniUltimoMese.forEach((prenotazione: Prenotazione) => {
              if (prenotazione.idUtente) {
                const giorni = Math.ceil(
                  (new Date(prenotazione.dataFinePrenotazione).getTime() - 
                   new Date(prenotazione.dataInizioPrenotazione).getTime()) / 
                  (1000 * 60 * 60 * 24)
                );
                
                if (!utentiMap.has(prenotazione.idUtente)) {
                  utentiMap.set(prenotazione.idUtente, {
                    idUtente: prenotazione.idUtente,
                    giorniTotali: 0,
                    numPrenotazioni: 0
                  });
                }
                
                const utenteStat = utentiMap.get(prenotazione.idUtente)!;
                utenteStat.giorniTotali += giorni;
                utenteStat.numPrenotazioni += 1;
              }
            });
            
            top5Utenti = Array.from(utentiMap.values())
              .sort((a, b) => b.giorniTotali - a.giorniTotali)
              .slice(0, 5);
            
            if (utenti.length > 0) {
              top5Utenti = top5Utenti.map((stat: UtenteStatistiche) => {
                const utente = utenti.find((u: Utente) => u.idUtente === stat.idUtente);
                return {
                  ...stat,
                  nome: utente?.nome || 'Utente',
                  cognome: utente?.cognome || stat.idUtente.toString(),
                  email: utente?.email || 'N/A'
                };
              });
            }
          }
        } catch (err) {
          console.error('Errore nel calcolo manuale top 5 utenti:', err);
        }
      }

      setStats({
        abitazionePiuGettonata,
        mediaPostiLetto,
        superHosts,
        hostsConPiuPrenotazioni,
        top5Utenti: top5Utenti || [],
        prenotazioniUltimoMese,
        feedbackAltoPunteggio,
      });
      
      console.log('Statistiche finali:', {
        abitazionePiuGettonata,
        mediaPostiLetto,
        superHosts: superHosts.length,
        hostsConPiuPrenotazioni: hostsConPiuPrenotazioni.length,
        top5Utenti: top5Utenti?.length,
        prenotazioniUltimoMese,
        feedbackAltoPunteggio,
      });
      
    } catch (error) {
      console.error('Errore nel caricamento statistiche:', error);
      setError('Impossibile caricare le statistiche. Assicurati che il backend sia in esecuzione e che ci siano dati nel database.');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Abitazione più gettonata',
      value: stats.abitazionePiuGettonata?.nome || 'Nessuna',
      icon: <Trophy className="h-6 w-6" />,
      color: 'bg-yellow-500',
      description: 'Ultimo mese',
    },
    {
      title: 'Media posti letto',
      value: typeof stats.mediaPostiLetto === 'number' ? stats.mediaPostiLetto.toFixed(1) : '0.0',
      icon: <Bed className="h-6 w-6" />,
      color: 'bg-blue-500',
      description: 'Tutte le abitazioni',
    },
    {
      title: 'Super Host',
      value: stats.superHosts.length,
      icon: <Star className="h-6 w-6" />,
      color: 'bg-purple-500',
      description: 'Host con 100+ prenotazioni',
    },
    {
      title: 'Prenotazioni ultimo mese',
      value: stats.prenotazioniUltimoMese,
      icon: <Calendar className="h-6 w-6" />,
      color: 'bg-green-500',
      description: 'Periodo: ultimo mese',
    },
    {
      title: 'Feedback alto punteggio',
      value: stats.feedbackAltoPunteggio,
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'bg-orange-500',
      description: 'Punteggio ≥ 4',
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Statistiche</h1>
          <p className="text-gray-600 mt-1">
            Panoramica completa delle statistiche del sistema
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Sezione Ricerca ultima prenotazione per ID utente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            Ricerca ultima prenotazione per utente
          </CardTitle>
          <CardDescription>
            Inserisci l'ID di un utente per vedere la sua ultima prenotazione
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Form di ricerca */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Inserisci ID utente (es: 1, 2, 3...)"
                  value={idUtenteRicerca}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      setIdUtenteRicerca(value);
                    }
                  }}
                  className="w-full"
                />
              </div>
              <Button 
                onClick={cercaUltimaPrenotazione}
                disabled={ricercaLoading || !idUtenteRicerca.trim()}
                className="flex items-center gap-2"
              >
                {ricercaLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Ricerca...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span>Cerca</span>
                  </>
                )}
              </Button>
            </div>

            {/* Messaggio errore */}
            {ricercaError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{ricercaError}</AlertDescription>
              </Alert>
            )}

            {/* Risultato della ricerca */}
            {ultimaPrenotazione && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">Ultima prenotazione trovata</h3>
                    {utenteRicerca && (
                      <p className="text-gray-600">
                        Utente: {utenteRicerca.nome} {utenteRicerca.cognome} (ID: {utenteRicerca.idUtente})
                      </p>
                    )}
                  </div>
                  <Badge className={getStatoColor(ultimaPrenotazione.stato)}>
                    {ultimaPrenotazione.stato}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">ID Prenotazione:</span>
                        <span className="font-medium">#{ultimaPrenotazione.idPrenotazione}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">ID Abitazione:</span>
                        <span className="font-medium">{ultimaPrenotazione.idAbitazione}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">ID Utente:</span>
                        <span className="font-medium">{ultimaPrenotazione.idUtente}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Data inizio:</span>
                        <span className="font-medium">{formatDate(ultimaPrenotazione.dataInizioPrenotazione)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Data fine:</span>
                        <span className="font-medium">{formatDate(ultimaPrenotazione.dataFinePrenotazione)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Prezzo totale:</span>
                        <span className="font-bold text-green-700">
                          €{ultimaPrenotazione.prezzoTotale?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>
                      Questa è l'ultima prenotazione registrata per l'utente 
                      {utenteRicerca ? ` ${utenteRicerca.nome} ${utenteRicerca.cognome}` : ` ID ${ultimaPrenotazione.idUtente}`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Messaggio se nessuna prenotazione trovata ma ricerca completata */}
            {!ricercaLoading && !ultimaPrenotazione && !ricercaError && idUtenteRicerca && (
              <div className="text-center py-6 text-gray-500 border rounded-lg">
                <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Inserisci un ID utente e clicca "Cerca" per trovare l'ultima prenotazione</p>
                <p className="text-sm mt-2">L'ID utente è un numero intero positivo (es: 1, 2, 3...)</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistiche principali */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <CardDescription>{stat.description}</CardDescription>
              </div>
              <div className={`p-2 rounded-full ${stat.color} text-white`}>
                {stat.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top 5 Utenti */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Top 5 Utenti per giorni prenotati (ultimo mese)
          </CardTitle>
          <CardDescription>
            Utenti con più giorni prenotati nell'ultimo mese
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.top5Utenti.length > 0 ? (
            <div className="space-y-4">
              {stats.top5Utenti.map((utente, index) => (
                <div key={utente.idUtente} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold">{utente.nome || 'Utente'} {utente.cognome || utente.idUtente}</h3>
                      {utente.email && utente.email !== 'N/A' && (
                        <p className="text-sm text-gray-600">{utente.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{utente.giorniTotali || 0} giorni</div>
                    <div className="text-sm text-gray-600">{utente.numPrenotazioni || 0} prenotazioni</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nessun dato disponibile per il top 5 utenti</p>
              <p className="text-sm mt-2">Crea prenotazioni nell'ultimo mese per vedere le statistiche</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Host con più prenotazioni */}
      {stats.hostsConPiuPrenotazioni.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Host con più prenotazioni (ultimo mese)
            </CardTitle>
            <CardDescription>
              Host più attivi nell'ultimo mese (solo prenotazioni COMPLETATE)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.hostsConPiuPrenotazioni.slice(0, 4).map((host, index) => (
                <div key={host.idUtente} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{host.codiceHost || `Host #${host.idUtente}`}</h3>
                      <p className="text-sm text-gray-600">
                        {host.isSuperHost ? '⭐ Super Host' : 'Host'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-blue-600">
                        {host.prenotazioniUltimoMese || host.totPrenotazioni || 0}
                      </div>
                      <div className="text-sm text-gray-600">prenotazioni (mese)</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Abitazione più gettonata dettaglio */}
      {stats.abitazionePiuGettonata ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              Dettaglio abitazione più gettonata
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-xl mb-2">{stats.abitazionePiuGettonata.nome}</h3>
                <p className="text-gray-600 mb-4">{stats.abitazionePiuGettonata.indirizzo}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Locali:</span>
                    <span className="font-medium">{stats.abitazionePiuGettonata.numeroLocali}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Posti letto:</span>
                    <span className="font-medium">{stats.abitazionePiuGettonata.numeroPostiLetto}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Piano:</span>
                    <span className="font-medium">{stats.abitazionePiuGettonata.piano || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Prezzo per notte:</span>
                    <span className="font-medium">€{stats.abitazionePiuGettonata.prezzoPerNotte}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Disponibilità</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Da:</span>
                    <span className="font-medium">
                      {new Date(stats.abitazionePiuGettonata.dataInizioDisponibilita).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">A:</span>
                    <span className="font-medium">
                      {new Date(stats.abitazionePiuGettonata.dataFineDisponibilita).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                </div>
                
                <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Questa è l'abitazione con il maggior numero di prenotazioni nell'ultimo mese
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              Abitazione più gettonata
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Building className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nessuna abitazione prenotata nell'ultimo mese</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StatistichePage;