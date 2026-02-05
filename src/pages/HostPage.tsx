import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Crown, TrendingUp, Star, UserPlus, Eye, Calendar, User, Building, Users, Trophy, Award, AlertCircle } from 'lucide-react';
import DataTable from '../components/DataTable';
import { hostService, utenteService, abitazioneService, prenotazioneService } from '../lib/api';
import type { Host, Utente, Abitazione, Prenotazione } from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';


interface HostWithUser extends Host {
  utente?: Utente;
  prenotazioniVisibili?: number; //campo per le prenotazioni visibili dal frontend
}


interface HostConStatistiche extends HostWithUser {
  prenotazioniUltimoMese?: number;
}


interface HostDetails {
  abitazioni: Abitazione[];
  prenotazioniTotali: number;
  prenotazioniVisibili: number; 
  prenotazioniAttive: Prenotazione[];
}

const HostPage = () => {
  const [hosts, setHosts] = useState<HostWithUser[]>([]);
  const [superHosts, setSuperHosts] = useState<HostWithUser[]>([]);
  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedHost, setSelectedHost] = useState<HostWithUser | null>(null);
  const [hostDetails, setHostDetails] = useState<HostDetails | null>(null);

  const [hostsTopPrenotazioni, setHostsTopPrenotazioni] = useState<HostConStatistiche[]>([]);
  const [loadingTopHosts, setLoadingTopHosts] = useState(true);

  useEffect(() => {
    loadHosts();
    loadTopHostsUltimoMese(); 
  }, []);

  const loadHosts = async () => {
    try {
      setLoading(true);
      
      
      const hostsRes = await hostService.getAll();
      const allHosts: Host[] = hostsRes.data.data || [];
      
      
      const superHostsRes = await hostService.getSuperHosts();
      const superHostsData: Host[] = superHostsRes.data.data || [];
      
      console.log('Super Host API Response:', superHostsRes.data);
      console.log('Super Host Data:', superHostsData);
      
      
      const utentiRes = await utenteService.getAll();
      const allUtenti: Utente[] = utentiRes.data.data || [];
      
      
      const utentiMap = new Map<number, Utente>();
      allUtenti.forEach(utente => utentiMap.set(utente.idUtente, utente));
      
      // calcoliamo le prenotazioni visibili dal frontend
      const hostsWithUserInfo: HostWithUser[] = await Promise.all(
        allHosts.map(async (host) => {
          let prenotazioniVisibili = 0;
          
          try {
            // ottieni tutte le abitazioni dell'host
            const abitazioniRes = await abitazioneService.getByUtente(host.idUtente);
            const abitazioni: Abitazione[] = abitazioniRes.data.data || [];
            
            // per ogni abitazione, conta le prenotazioni
            for (const abitazione of abitazioni) {
              try {
                const prenotazioniRes = await prenotazioneService.getByAbitazione(abitazione.idAbitazione);
                const prenotazioni: Prenotazione[] = prenotazioniRes.data.data || [];
                prenotazioniVisibili += prenotazioni.length;
              } catch (error) {
                console.error(`Errore prenotazioni abitazione ${abitazione.idAbitazione}:`, error);
              }
            }
          } catch (error) {
            console.error(`Errore abitazioni host ${host.idUtente}:`, error);
          }
          
          return {
            ...host,
            utente: utentiMap.get(host.idUtente),
            prenotazioniVisibili
          };
        })
      );
      
      // aggiungi info utente ai super host
      const superHostsWithUserInfo: HostWithUser[] = superHostsData.map(host => ({
        ...host,
        utente: utentiMap.get(host.idUtente),
        prenotazioniVisibili: hostsWithUserInfo.find(h => h.idUtente === host.idUtente)?.prenotazioniVisibili || 0
      }));
      
      setHosts(hostsWithUserInfo);
      setSuperHosts(superHostsWithUserInfo);
      setUtenti(allUtenti);
      
      console.log('Host caricati:', hostsWithUserInfo.length);
      console.log('Super Host trovati:', superHostsWithUserInfo.length);
      console.log('Dettagli host:', hostsWithUserInfo.map(h => ({
        id: h.idUtente,
        codice: h.codiceHost,
        superHost: h.isSuperHost,
        prenotazioniBackend: h.totPrenotazioni,
        prenotazioniVisibili: h.prenotazioniVisibili
      })));
      
    } catch (error) {
      console.error('Errore caricamento host:', error);
    } finally {
      setLoading(false);
    }
  };

  // carica host con più prenotazioni nell'ultimo mese
  const loadTopHostsUltimoMese = async () => {
    try {
      setLoadingTopHosts(true);
      
      // ottieni tutte le prenotazioni dell'ultimo mese
      const prenotazioniRes = await prenotazioneService.getPrenotazioniUltimoMese();
      const prenotazioniUltimoMese: Prenotazione[] = prenotazioniRes.data.data || [];
      
      //ottieni tutte le abitazioni per mappare host
      const abitazioniRes = await abitazioneService.getAll();
      const abitazioni: Abitazione[] = abitazioniRes.data.data || [];
      
      // ottieni tutti gli host
      const hostsRes = await hostService.getAll();
      const allHosts: Host[] = hostsRes.data.data || [];
      
      // ottieni tutti gli utenti per i nomi
      const utentiRes = await utenteService.getAll();
      const allUtenti: Utente[] = utentiRes.data.data || [];
      
      //crea mappa utenti per ID
      const utentiMap = new Map<number, Utente>();
      allUtenti.forEach(utente => utentiMap.set(utente.idUtente, utente));
      
      // crea mappa abitazioni per ID utente (host)
      const abitazioniPerHost = new Map<number, Abitazione[]>();
      abitazioni.forEach(abitazione => {
        if (!abitazioniPerHost.has(abitazione.idUtente)) {
          abitazioniPerHost.set(abitazione.idUtente, []);
        }
        abitazioniPerHost.get(abitazione.idUtente)!.push(abitazione);
      });
      
      //conta prenotazioni per ogni host nell'ultimo mese
      const prenotazioniPerHost = new Map<number, number>();
      
      prenotazioniUltimoMese.forEach(prenotazione => {
        // trova l'abitazione della prenotazione
        const abitazione = abitazioni.find(a => a.idAbitazione === prenotazione.idAbitazione);
        if (abitazione) {
          const hostId = abitazione.idUtente;
          const currentCount = prenotazioniPerHost.get(hostId) || 0;
          prenotazioniPerHost.set(hostId, currentCount + 1);
        }
      });
      
      // crea array di host con statistiche
      const hostsConStatistiche: HostConStatistiche[] = [];
      
      prenotazioniPerHost.forEach((count, hostId) => {

        const host = allHosts.find(h => h.idUtente === hostId);
        if (host) {
          hostsConStatistiche.push({
            ...host,
            utente: utentiMap.get(host.idUtente),
            prenotazioniUltimoMese: count
          });
        }
      });
      
      // ordina per prenotazioni (decrescente) e prendi top 5
      const sortedHosts = hostsConStatistiche
        .sort((a, b) => (b.prenotazioniUltimoMese || 0) - (a.prenotazioniUltimoMese || 0))
        .slice(0, 5); // solo 5
      
      setHostsTopPrenotazioni(sortedHosts);
      
    } catch (error) {
      console.error('Errore caricamento top host:', error);
      setHostsTopPrenotazioni([]);
    } finally {
      setLoadingTopHosts(false);
    }
  };

  const loadHostDetails = async (host: HostWithUser) => {
    try {
      setSelectedHost(host);
      setDialogOpen(true);
      
      // carica le abitazioni dell'host
      const abitazioniRes = await abitazioneService.getByUtente(host.idUtente);
      const abitazioni: Abitazione[] = abitazioniRes.data.data || [];
      
      // per ogni abitazione, carica le prenotazioni
      let tuttePrenotazioni: Prenotazione[] = [];
      
      for (const abitazione of abitazioni) {
        try {
          const prenotazioniRes = await prenotazioneService.getByAbitazione(abitazione.idAbitazione);
          const prenotazioni: Prenotazione[] = prenotazioniRes.data.data || [];
          tuttePrenotazioni = [...tuttePrenotazioni, ...prenotazioni];
        } catch (error) {
          console.error(`Errore prenotazioni abitazione ${abitazione.idAbitazione}:`, error);
        }
      }
      
      // calcola prenotazioni attive
      const prenotazioniAttive = tuttePrenotazioni.filter(p => 
        p.stato !== 'CANCELLATA' && p.stato !== 'COMPLETATA'
      );
      
      //aggiorna stato host con prenotazioni totali
      setHostDetails({
        abitazioni,
        prenotazioniTotali: host.totPrenotazioni || 0, // usa il conteggio del backend
        prenotazioniVisibili: tuttePrenotazioni.length, 
        prenotazioniAttive
      });
      
    } catch (error) {
      console.error('Errore caricamento dettagli host:', error);
      setHostDetails({
        abitazioni: [],
        prenotazioniTotali: 0,
        prenotazioniVisibili: 0,
        prenotazioniAttive: []
      });
    }
  };

  const handlePromoteToHost = async (idUtente: number) => {
    const utente = utenti.find(u => u.idUtente === idUtente);
    if (!utente || !confirm(`Promuovere ${utente.nome} ${utente.cognome} a host?`)) return;
    
    try {
      await hostService.promoteToHost(idUtente);
      alert('Utente promosso a host!');
      loadHosts();
      loadTopHostsUltimoMese(); 
    } catch (error: any) {
      alert(error.response?.data?.message || 'Errore nella promozione');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('it-IT');
    } catch {
      return dateString;
    }
  };

  const getStatoBadge = (stato: string) => {
    const stati: Record<string, { className: string; label: string }> = {
      'IN_ATTESA': { className: 'bg-yellow-100 text-yellow-800', label: 'In attesa' },
      'CONFERMATA': { className: 'bg-blue-100 text-blue-800', label: 'Confermata' },
      'CANCELLATA': { className: 'bg-red-100 text-red-800', label: 'Cancellata' },
      'COMPLETATA': { className: 'bg-green-100 text-green-800', label: 'Completata' }
    };
    
    const statoInfo = stati[stato] || { className: 'bg-gray-100', label: stato };
    
    return (
      <Badge variant="outline" className={statoInfo.className}>
        {statoInfo.label}
      </Badge>
    );
  };

  // colonne della tabella
  const columns = [
    { 
      key: 'idUtente', 
      header: 'ID',
      render: (value: number) => (
        <div className="font-mono text-gray-700">#{value}</div>
      )
    },
    { 
      key: 'codiceHost', 
      header: 'Codice Host',
      render: (value: string) => (
        <div className="font-semibold text-blue-700">{value}</div>
      )
    },
    { 
      key: 'utente', 
      header: 'Nome Host',
      render: (utente: Utente | undefined) => (
        <div>
          <div className="font-medium">{utente ? `${utente.nome} ${utente.cognome}` : 'N/A'}</div>
          {utente && <div className="text-xs text-gray-500">{utente.email}</div>}
        </div>
      )
    },
    { 
      key: 'isSuperHost', 
      header: 'Super Host',
      render: (value: boolean, host: HostWithUser) => (
        <div className="flex items-center gap-2">
          {value ? (
            <>
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-yellow-700 font-medium">Sì</span>
            </>
          ) : (
            <>
              <div className="h-4 w-4 rounded-full border border-gray-300" />
              <span className="text-gray-500">No</span>
            </>
          )}
          {host.prenotazioniVisibili && host.prenotazioniVisibili > (host.totPrenotazioni || 0) && (
            <span className="text-xs text-gray-400 ml-2" title={`Backend: ${host.totPrenotazioni || 0}, Visibili: ${host.prenotazioniVisibili}`}>
              ({host.totPrenotazioni || 0}/{host.prenotazioniVisibili})
            </span>
          )}
        </div>
      )
    },
    {
      key: 'totPrenotazioni',
      header: 'Pren. Backend',
      render: (value: number, host: HostWithUser) => (
        <div className="text-center">
          <div className="font-semibold">{value || 0}</div>
          {host.prenotazioniVisibili && host.prenotazioniVisibili > (value || 0) && (
            <div className="text-xs text-gray-500" title="Prenotazioni visibili dal frontend">
              Visibili: {host.prenotazioniVisibili}
            </div>
          )}
        </div>
      )
    }
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Host</h1>
          <p className="text-gray-600">Gestione host e super host</p>
        </div>
        <Button onClick={() => {
          loadHosts();
          loadTopHostsUltimoMese();
        }} variant="outline">
          Aggiorna
        </Button>
      </div>

      {/* alert informativo */}
      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <div className="text-sm">
            <span className="font-medium">Nota sul conteggio Super Host:</span> Il backend conta <strong>solo le prenotazioni valide</strong> (escludendo quelle cancellate). 
            Questo spiega la differenza tra il conteggio visibile ({hosts.find(h => h.isSuperHost)?.prenotazioniVisibili || 0}) e quello effettivo ({hosts.find(h => h.isSuperHost)?.totPrenotazioni || 0}).
          </div>
        </AlertDescription>
      </Alert>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Totale Host</p>
              <p className="text-2xl font-bold">{hosts.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Super Host</p>
              <p className="text-2xl font-bold">{superHosts.length}</p>
              {superHosts.length > 0 ? (
                <p className="text-xs text-gray-500 mt-1">
                  {superHosts.map(sh => sh.codiceHost).join(', ')}
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  Nessun host con 100+ prenotazioni valide
                </p>
              )}
            </div>
            <Crown className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Utenti Totali</p>
              <p className="text-2xl font-bold">{utenti.length}</p>
            </div>
            <User className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-orange-500" />
            Host con più prenotazioni (ultimo mese)
          </CardTitle>
          <CardDescription>
            Classifica degli host più attivi nell'ultimo mese
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTopHosts ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : hostsTopPrenotazioni.length > 0 ? (
            <div className="space-y-4">
              {hostsTopPrenotazioni.map((host, index) => (
                <div key={host.idUtente} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full font-bold"
                         style={{
                           backgroundColor: index === 0 ? '#FFD700' :  // Oro per primo
                                          index === 1 ? '#C0C0C0' :  // Argento per secondo
                                          index === 2 ? '#CD7F32' :  // Bronzo per terzo
                                          '#E5E7EB',  // Grigio per gli altri
                           color: index < 3 ? '#000000' : '#6B7280'
                         }}>
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold">{host.codiceHost}</h3>
                      {host.utente && (
                        <p className="text-sm text-gray-600">
                          {host.utente.nome} {host.utente.cognome}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {host.isSuperHost && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Star className="h-3 w-3 mr-1" />
                            Super Host
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xl text-blue-600">
                      {host.prenotazioniUltimoMese || 0}
                    </div>
                    <div className="text-sm text-gray-600">prenotazioni</div>
                    <div className="text-xs text-gray-500 mt-1">Ultimo mese</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Award className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nessuna prenotazione nell'ultimo mese</p>
              <p className="text-sm mt-2">Crea prenotazioni per vedere la classifica</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabella Host */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Tutti gli Host ({hosts.length})</h2>
          <p className="text-sm text-gray-500 mt-1">
            "Pren. Backend" mostra il conteggio usato per il Super Host (solo prenotazioni valide)
          </p>
        </div>
        <DataTable<HostWithUser>
          data={hosts}
          columns={columns}
          onView={loadHostDetails}
        />
      </div>

      {/* Dialog Dettagli Host */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Dettagli Host</DialogTitle>
            <DialogDescription>
              Informazioni complete sull'host e le sue attività
            </DialogDescription>
          </DialogHeader>

          {selectedHost && (
            <div className="space-y-4">
              {/* Info Host */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Codice Host</p>
                    <p className="font-bold text-lg">{selectedHost.codiceHost}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">ID Utente</p>
                    <p className="font-medium">{selectedHost.idUtente}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Super Host</p>
                    <p className={`font-medium ${selectedHost.isSuperHost ? 'text-yellow-600' : 'text-gray-600'}`}>
                      {selectedHost.isSuperHost ? 'Sì' : 'No'}
                      {selectedHost.isSuperHost && (
                        <span className="text-sm text-gray-500 ml-2">
                          (Conteggio backend: {selectedHost.totPrenotazioni || 0})
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Prenotazioni Totali</p>
                    <div>
                      <p className="font-bold text-lg">{selectedHost.totPrenotazioni || 0}</p>
                      {hostDetails && hostDetails.prenotazioniVisibili > (selectedHost.totPrenotazioni || 0) && (
                        <p className="text-xs text-gray-500">
                          Visibili dal frontend: {hostDetails.prenotazioniVisibili}
                          <br />
                          <span className="text-amber-600">(Differenza: {hostDetails.prenotazioniVisibili - (selectedHost.totPrenotazioni || 0)} prenotazioni escluse dal backend)</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {selectedHost.utente && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Nome</p>
                      <p className="font-medium">{selectedHost.utente.nome} {selectedHost.utente.cognome}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{selectedHost.utente.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Indirizzo</p>
                      <p className="font-medium">{selectedHost.utente.indirizzo}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Abitazioni */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Abitazioni ({hostDetails?.abitazioni.length || 0})
                </h3>
                
                {hostDetails?.abitazioni && hostDetails.abitazioni.length > 0 ? (
                  <div className="space-y-2">
                    {hostDetails.abitazioni.map(abitazione => (
                      <div key={abitazione.idAbitazione} className="border rounded p-3">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium">{abitazione.nome}</p>
                            <p className="text-sm text-gray-600">{abitazione.indirizzo}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">€{abitazione.prezzoPerNotte}/notte</p>
                            <p className="text-xs text-gray-500">
                              {abitazione.numeroLocali} locali, {abitazione.numeroPostiLetto} posti
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Disponibile: {formatDate(abitazione.dataInizioDisponibilita)} - {formatDate(abitazione.dataFineDisponibilita)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Nessuna abitazione registrata</p>
                )}
              </div>

              {/* Prenotazioni Attive */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Prenotazioni Attive ({hostDetails?.prenotazioniAttive.length || 0})
                </h3>
                
                {hostDetails?.prenotazioniAttive && hostDetails.prenotazioniAttive.length > 0 ? (
                  <div className="space-y-2">
                    {hostDetails.prenotazioniAttive.map(prenotazione => (
                      <div key={prenotazione.idPrenotazione} className="border rounded p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">Prenotazione #{prenotazione.idPrenotazione}</p>
                            <p className="text-sm text-gray-600">
                              Abitazione: {prenotazione.idAbitazione} | Utente: {prenotazione.idUtente}
                            </p>
                          </div>
                          {getStatoBadge(prenotazione.stato)}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-gray-500">Periodo</p>
                            <p>{formatDate(prenotazione.dataInizioPrenotazione)} → {formatDate(prenotazione.dataFinePrenotazione)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Prezzo totale</p>
                            <p className="font-bold">€{prenotazione.prezzoTotale?.toFixed(2) || '0.00'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Nessuna prenotazione attiva</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setDialogOpen(false)}>Chiudi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sezione Promuovi a Host */}
      {utenti.filter(utente => !hosts.some(h => h.idUtente === utente.idUtente)).length > 0 && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Promuovi Utente a Host
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {utenti
              .filter(utente => !hosts.some(h => h.idUtente === utente.idUtente))
              .slice(0, 6)
              .map(utente => (
                <div key={utente.idUtente} className="border rounded p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{utente.nome} {utente.cognome}</p>
                      <p className="text-sm text-gray-600">{utente.email}</p>
                      <p className="text-xs text-gray-500">ID: {utente.idUtente}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handlePromoteToHost(utente.idUtente)}
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Promuovi
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HostPage;