import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, AlertCircle, RefreshCw, Edit, Trash2 } from 'lucide-react';
import DataTable from '../components/DataTable';
import { prenotazioneService, abitazioneService, utenteService } from '@/lib/api';
import type { Prenotazione, Abitazione, Utente } from '@/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// costanti per gli stati della prenotazione - IN MAIUSCOLO come richiesto dal backend
const STATO_PRENOTAZIONE = {
  IN_ATTESA: 'IN_ATTESA',
  CONFERMATA: 'CONFERMATA',
  CANCELLATA: 'CANCELLATA',
  COMPLETATA: 'COMPLETATA'
} as const;

type StatoPrenotazione = typeof STATO_PRENOTAZIONE[keyof typeof STATO_PRENOTAZIONE];

const PrenotazioniPage = () => {
  const [prenotazioni, setPrenotazioni] = useState<Prenotazione[]>([]);
  const [prenotazioniUltimoMese, setPrenotazioniUltimoMese] = useState<Prenotazione[]>([]);
  const [abitazioni, setAbitazioni] = useState<Abitazione[]>([]);
  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPrenotazione, setSelectedPrenotazione] = useState<Prenotazione | null>(null);
  const [activeTab, setActiveTab] = useState('tutte');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const calcolaGiorni = (dataInizio: string, dataFine: string): number => {
    try {
      const start = new Date(dataInizio);
      const end = new Date(dataFine);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  const loadData = async () => {
    try {
      setError(null);
      setLoading(true);

      const [
        prenotazioniRes,
        prenotazioniUltimoMeseRes,
        abitazioniRes,
        utentiRes,
      ] = await Promise.all([
        prenotazioneService.getAll().catch((err) => {
          console.error('Errore caricamento prenotazioni:', err);
          return { data: { data: [] } };
        }),
        prenotazioneService.getPrenotazioniUltimoMese().catch((err) => {
          console.error('Errore caricamento prenotazioni ultimo mese:', err);
          return { data: { data: [] } };
        }),
        abitazioneService.getAll().catch((err) => {
          console.error('Errore caricamento abitazioni:', err);
          return { data: { data: [] } };
        }),
        utenteService.getAll().catch((err) => {
          console.error('Errore caricamento utenti:', err);
          return { data: { data: [] } };
        }),
      ]);

      // estrai i dati dalle risposte normalizzate
      const getDataFromResponse = (response: any) => {
        if (!response || !response.data) return [];
        
        if (Array.isArray(response.data.data)) {
          return response.data.data;
        } else if (Array.isArray(response.data)) {
          return response.data;
        }
        
        return [];
      };

      setPrenotazioni(getDataFromResponse(prenotazioniRes));
      setPrenotazioniUltimoMese(getDataFromResponse(prenotazioniUltimoMeseRes));
      setAbitazioni(getDataFromResponse(abitazioniRes));
      setUtenti(getDataFromResponse(utentiRes));
      
    } catch (error: any) {
      console.error('Errore nel caricamento dati:', error);
      setError('Impossibile caricare le prenotazioni. Controlla la console per i dettagli.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: any) => {
    try {
      const abitazione = abitazioni.find(a => a.idAbitazione === parseInt(data.idAbitazione));
      const giorni = calcolaGiorni(data.dataInizioPrenotazione, data.dataFinePrenotazione);
      const prezzoTotale = abitazione ? giorni * abitazione.prezzoPerNotte : 0;
      
      const formattedData = {
        ...data,
        idAbitazione: parseInt(data.idAbitazione),
        idUtente: parseInt(data.idUtente),
        prezzoTotale: prezzoTotale,
        stato: data.stato || STATO_PRENOTAZIONE.IN_ATTESA,
      };
      
      await prenotazioneService.create(formattedData);
      await loadData();
      setDialogOpen(false);
      setError(null);
    } catch (error: any) {
      console.error('Errore nella creazione prenotazione:', error);
      setError('Errore nella creazione della prenotazione: ' + (error.message || 'Controlla i dati inseriti'));
    }
  };

  const handleUpdate = async (data: any) => {
    if (!selectedPrenotazione) return;
    
    try {
      const abitazione = abitazioni.find(a => a.idAbitazione === parseInt(data.idAbitazione));
      const giorni = calcolaGiorni(data.dataInizioPrenotazione, data.dataFinePrenotazione);
      const prezzoTotale = abitazione ? giorni * abitazione.prezzoPerNotte : selectedPrenotazione.prezzoTotale;
      
      const formattedData = {
        ...data,
        idAbitazione: parseInt(data.idAbitazione),
        idUtente: parseInt(data.idUtente),
        prezzoTotale: prezzoTotale,
        stato: data.stato,
      };
      
      await prenotazioneService.update(selectedPrenotazione.idPrenotazione, formattedData);
      await loadData();
      setDialogOpen(false);
      setSelectedPrenotazione(null);
      setError(null);
    } catch (error: any) {
      console.error('Errore nell\'aggiornamento prenotazione:', error);
      setError('Errore nell\'aggiornamento della prenotazione: ' + (error.message || 'Controlla i dati inseriti'));
    }
  };

  const handleCancelPrenotazione = async (prenotazione: Prenotazione) => {
    try {
      setActionLoading(prenotazione.idPrenotazione);
      
      if (!confirm(`Cancellare la prenotazione #${prenotazione.idPrenotazione}?`)) {
        setActionLoading(null);
        return;
      }
      
      // Usa l'API per cancellare (aggiorna lo stato a CANCELLATA)
      const response = await fetch(`http://localhost:8080/api/prenotazioni/${prenotazione.idPrenotazione}/cancella`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const responseText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: responseText || 'Errore sconosciuto' };
        }
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      
      await loadData();
      setError(null);
      
    } catch (error: any) {
      console.error('Errore nella cancellazione prenotazione:', error);
      setError('Errore nella cancellazione della prenotazione: ' + (error.message || 'Controlla la console per i dettagli'));
    } finally {
      setActionLoading(null);
    }
  };

  const getStatoColor = (stato: string) => {
    switch (stato) {
      case STATO_PRENOTAZIONE.IN_ATTESA:
        return 'bg-yellow-100 text-yellow-800';
      case STATO_PRENOTAZIONE.CONFERMATA:
        return 'bg-blue-100 text-blue-800';
      case STATO_PRENOTAZIONE.COMPLETATA:
        return 'bg-green-100 text-green-800';
      case STATO_PRENOTAZIONE.CANCELLATA:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateForInput = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return dateString;
    }
  };

  const columns = [
    { 
      key: 'idPrenotazione', 
      header: 'ID',
      render: (value: number) => (
        <div className="font-medium">#{value}</div>
      )
    },
    { 
      key: 'idAbitazione', 
      header: 'Abitazione',
      render: (value: number) => {
        const abitazione = abitazioni.find(a => a.idAbitazione === value);
        return (
          <div>
            <div className="font-medium">ID: {value}</div>
            {abitazione && (
              <div className="text-xs text-gray-500">
                {abitazione.nome}
              </div>
            )}
          </div>
        );
      }
    },
    { 
      key: 'idUtente', 
      header: 'Utente',
      render: (value: number) => {
        const utente = utenti.find(u => u.idUtente === value);
        return (
          <div>
            <div className="font-medium">ID: {value}</div>
            {utente && (
              <div className="text-xs text-gray-500">
                {utente.nome} {utente.cognome}
              </div>
            )}
          </div>
        );
      }
    },
    { 
      key: 'dataInizioPrenotazione', 
      header: 'Data Inizio',
      render: (value: string) => (
        <div className="whitespace-nowrap">
          {new Date(value).toLocaleDateString('it-IT')}
        </div>
      )
    },
    { 
      key: 'dataFinePrenotazione', 
      header: 'Data Fine',
      render: (value: string) => (
        <div className="whitespace-nowrap">
          {new Date(value).toLocaleDateString('it-IT')}
        </div>
      )
    },
    { 
      key: 'durata', 
      header: 'Giorni',
      render: (value: any, prenotazione: Prenotazione) => {
        const giorni = calcolaGiorni(
          prenotazione.dataInizioPrenotazione,
          prenotazione.dataFinePrenotazione
        );
        return (
          <div className="text-center font-semibold">
            {giorni}
          </div>
        );
      }
    },
    { 
      key: 'stato', 
      header: 'Stato',
      render: (value: string) => (
        <Badge className={getStatoColor(value)}>
          {value}
        </Badge>
      )
    },
    { 
      key: 'prezzoTotale', 
      header: 'Prezzo Totale',
      render: (value: number) => (
        <div className="font-bold text-green-700 whitespace-nowrap">
          €{value?.toFixed(2) || '0.00'}
        </div>
      )
    },
    {
      key: 'azioni',
      header: 'Azioni',
      render: (value: any, prenotazione: Prenotazione) => {
        // LOGICA SEMPLIFICATA: Mostra "Modifica" e "Cancella" solo per stati attivi
        // stati attivi: IN_ATTESA e CONFERMATA
        // stati finali: COMPLETATA e CANCELLATA (nessuna azione)
        
        const isStatoAttivo = 
          prenotazione.stato === STATO_PRENOTAZIONE.IN_ATTESA || 
          prenotazione.stato === STATO_PRENOTAZIONE.CONFERMATA;
        
        const isLoading = actionLoading === prenotazione.idPrenotazione;

        if (!isStatoAttivo) {
          return (
            <div className="text-center text-gray-400 italic text-sm">
              Nessuna azione
            </div>
          );
        }

        return (
          <div className="flex gap-2">
            {/* Pulsante Modifica - per tutti gli stati attivi */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedPrenotazione(prenotazione);
                setDialogOpen(true);
              }}
              className="flex items-center gap-1"
              disabled={isLoading}
              title="Modifica prenotazione"
            >
              <Edit className="h-3 w-3" />
              <span>Modifica</span>
            </Button>
            
            {/* Pulsante Cancella - per tutti gli stati attivi */}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleCancelPrenotazione(prenotazione)}
              className="flex items-center gap-1"
              disabled={isLoading}
              title="Cancella prenotazione"
            >
              <Trash2 className="h-3 w-3" />
              <span>Cancella</span>
            </Button>
          </div>
        );
      }
    }
  ];

  const getInitialData = () => {
    if (selectedPrenotazione) {
      return {
        ...selectedPrenotazione,
        idAbitazione: selectedPrenotazione.idAbitazione.toString(),
        idUtente: selectedPrenotazione.idUtente.toString(),
        dataInizioPrenotazione: formatDateForInput(selectedPrenotazione.dataInizioPrenotazione),
        dataFinePrenotazione: formatDateForInput(selectedPrenotazione.dataFinePrenotazione),
      };
    }
    return {};
  };

  const formFields = [
    { 
      name: 'idAbitazione', 
      label: 'Abitazione', 
      type: 'select' as const, 
      required: true,
      options: abitazioni.map(a => ({ 
        value: a.idAbitazione.toString(), 
        label: `${a.nome} (€${a.prezzoPerNotte}/notte)` 
      }))
    },
    { 
      name: 'idUtente', 
      label: 'Utente', 
      type: 'select' as const, 
      required: true,
      options: utenti.map(u => ({ 
        value: u.idUtente.toString(), 
        label: `${u.nome} ${u.cognome}` 
      }))
    },
    { 
      name: 'dataInizioPrenotazione', 
      label: 'Data Inizio', 
      type: 'date' as const, 
      required: true
    },
    { 
      name: 'dataFinePrenotazione', 
      label: 'Data Fine', 
      type: 'date' as const, 
      required: true
    },
    { 
      name: 'stato', 
      label: 'Stato', 
      type: 'select' as const, 
      required: true,
      options: Object.values(STATO_PRENOTAZIONE).map(s => ({ 
        value: s, 
        label: s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace('_', ' ') 
      }))
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="ml-4 text-gray-600 mt-4">Caricamento prenotazioni...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Prenotazioni</h1>
          <p className="text-gray-600 mt-2">
            Gestione delle prenotazioni
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={loadData} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Aggiorna
          </Button>
          <Button onClick={() => {
            setSelectedPrenotazione(null);
            setDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Nuova Prenotazione
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">{error}</div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-500">Totale Prenotazioni</p>
          <p className="text-2xl font-bold">{prenotazioni.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-500">Ultimo Mese</p>
          <p className="text-2xl font-bold">{prenotazioniUltimoMese.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-500">In Attesa</p>
          <p className="text-2xl font-bold">
            {prenotazioni.filter(p => p.stato === STATO_PRENOTAZIONE.IN_ATTESA).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-500">Confermate</p>
          <p className="text-2xl font-bold">
            {prenotazioni.filter(p => p.stato === STATO_PRENOTAZIONE.CONFERMATA).length}
          </p>
        </div>
      </div>

      {/* LEGENDA STATI */}
      <div className="bg-gray-50 p-3 rounded-lg border">
        <p className="text-sm font-medium text-gray-700 mb-2">Legenda stati:</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-100"></div>
            <span className="text-xs text-gray-600">IN_ATTESA - Modificabile/Cancellabile</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-100"></div>
            <span className="text-xs text-gray-600">CONFERMATA - Modificabile/Cancellabile</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-100"></div>
            <span className="text-xs text-gray-600">COMPLETATA - Nessuna azione</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-100"></div>
            <span className="text-xs text-gray-600">CANCELLATA - Nessuna azione</span>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tutte">
            Tutte ({prenotazioni.length})
          </TabsTrigger>
          <TabsTrigger value="ultimo-mese">
            <Calendar className="h-4 w-4 mr-2" />
            Ultimo Mese ({prenotazioniUltimoMese.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tutte">
          <DataTable<Prenotazione>
            data={prenotazioni}
            columns={columns}
            showActionsColumn={false}
          />
        </TabsContent>

        <TabsContent value="ultimo-mese">
          <DataTable<Prenotazione>
            data={prenotazioniUltimoMese}
            columns={columns}
            showActionsColumn={false}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedPrenotazione ? 'Modifica Prenotazione' : 'Nuova Prenotazione'}
            </DialogTitle>
            <DialogDescription>
              {selectedPrenotazione 
                ? 'Modifica i dati della prenotazione' 
                : 'Crea una nuova prenotazione'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data = Object.fromEntries(formData.entries());
            
            if (selectedPrenotazione) {
              handleUpdate(data);
            } else {
              handleCreate(data);
            }
          }}>
            <div className="grid gap-4 py-4">
              {formFields.map((field) => (
                <div key={field.name} className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor={field.name} className="text-right text-sm font-medium">
                    {field.label}
                  </label>
                  <div className="col-span-3">
                    {field.type === 'select' ? (
                      <select
                        id={field.name}
                        name={field.name}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required={field.required}
                        defaultValue={getInitialData()[field.name as keyof typeof getInitialData] || ''}
                      >
                        <option value="">Seleziona...</option>
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={field.name}
                        name={field.name}
                        type={field.type}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required={field.required}
                        defaultValue={getInitialData()[field.name as keyof typeof getInitialData] || ''}
                      />
                    )}
                  </div>
                </div>
              ))}
              
              {!selectedPrenotazione && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 text-center">
                    Il prezzo totale verrà calcolato automaticamente:<br/>
                    (Prezzo per notte) × (Numero di giorni)
                  </p>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annulla
              </Button>
              <Button type="submit">
                {selectedPrenotazione ? 'Aggiorna' : 'Crea'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrenotazioniPage;