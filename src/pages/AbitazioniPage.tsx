import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, Calendar, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import DataTable from '../components/DataTable';
import FormDialog from '../components/FormDialog';
import { abitazioneService, utenteService, prenotazioneService } from '@/lib/api';
import type { Abitazione, Utente, Prenotazione } from '@/types';
import type { Column } from '../components/DataTable';
import { Alert, AlertDescription } from '@/components/ui/alert';

const AbitazioniPage = () => {
  const [abitazioni, setAbitazioni] = useState<Abitazione[]>([]);
  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [prenotazioniPerAbitazione, setPrenotazioniPerAbitazione] = useState<Record<number, Prenotazione[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [selectedAbitazione, setSelectedAbitazione] = useState<Abitazione | null>(null);
  const [searchType, setSearchType] = useState<'codiceHost' | 'idUtente'>('idUtente');
  const [searchValue, setSearchValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadAbitazioni();
    loadUtenti();
  }, []);

  // funzione per formattare la data in formato italiano
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return dateString; // se c'è un errore, ritorna la stringa originale
    }
  };

  const loadAbitazioni = async () => {
    try {
      setError(null);
      setSuccess(null);
      
      const response = await abitazioneService.getAll();
      const abitazioniData = response.data.data || [];
      setAbitazioni(abitazioniData);

      // carica prenotazioni per ogni abitazione
      const prenotazioniMap: Record<number, Prenotazione[]> = {};

      await Promise.all(
        abitazioniData.map(async (abitazione: Abitazione) => {
          try {
            const prenotazioniRes = await prenotazioneService.getByAbitazione(abitazione.idAbitazione);
            prenotazioniMap[abitazione.idAbitazione] = prenotazioniRes.data.data || [];
          } catch (error) {
            console.error(`Errore nel caricamento prenotazioni per abitazione ${abitazione.idAbitazione}:`, error);
            prenotazioniMap[abitazione.idAbitazione] = [];
          }
        })
      );

      setPrenotazioniPerAbitazione(prenotazioniMap);
    } catch (error) {
      console.error('Errore nel caricamento abitazioni:', error);
      setError('Impossibile caricare le abitazioni. Verifica la connessione al backend.');
    } finally {
      setLoading(false);
    }
  };

  const loadUtenti = async () => {
    try {
      const response = await utenteService.getAll();
      setUtenti(response.data.data || []);
    } catch (error) {
      console.error('Errore nel caricamento utenti:', error);
    }
  };

  // funzione per calcolare se un'abitazione è disponibile
  const calcolaDisponibilita = (abitazione: Abitazione): { disponibile: boolean; motivo?: string } => {
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    
    const dataInizio = new Date(abitazione.dataInizioDisponibilita);
    dataInizio.setHours(0, 0, 0, 0);
    
    const dataFine = new Date(abitazione.dataFineDisponibilita);
    dataFine.setHours(0, 0, 0, 0);

    //controlla se l'abitazione è disabilitata manualmente
    if (!abitazione.disponibile) {
      return { disponibile: false, motivo: 'Disabilitata manualmente' };
    }

    //controlla se siamo nel periodo di disponibilità
    if (oggi < dataInizio) {
      return { 
        disponibile: false, 
        motivo: `Disponibile dal ${formatDate(abitazione.dataInizioDisponibilita)}` 
      };
    }

    if (oggi > dataFine) {
      return { disponibile: false, motivo: 'Periodo di disponibilità terminato' };
    }

    //controlla se ci sono prenotazioni attive per oggi
    const prenotazioni = prenotazioniPerAbitazione[abitazione.idAbitazione] || [];
    const prenotazioniAttive = prenotazioni.filter(p => {
      if (p.stato === 'CANCELLATA') return false;
      
      const dataInizioPren = new Date(p.dataInizioPrenotazione);
      dataInizioPren.setHours(0, 0, 0, 0);
      
      const dataFinePren = new Date(p.dataFinePrenotazione);
      dataFinePren.setHours(0, 0, 0, 0);
      
      return oggi >= dataInizioPren && oggi <= dataFinePren;
    });

    if (prenotazioniAttive.length > 0) {
      const prenotazione = prenotazioniAttive[0];
      return { 
        disponibile: false, 
        motivo: `Prenotata fino al ${formatDate(prenotazione.dataFinePrenotazione)} (ID: ${prenotazione.idPrenotazione})` 
      };
    }

    return { disponibile: true, motivo: 'Disponibile' };
  };

  //funzione per calcolare giorni rimanenti di disponibilità
  const calcolaGiorniRimanenti = (abitazione: Abitazione): number => {
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    
    const dataFine = new Date(abitazione.dataFineDisponibilita);
    dataFine.setHours(0, 0, 0, 0);
    
    if (oggi > dataFine) return 0;
    
    const diffTime = dataFine.getTime() - oggi.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleCreate = async (data: any) => {
    try {
      setError(null);
      const formattedData = {
        ...data,
        idUtente: parseInt(data.idUtente),
        numeroLocali: parseInt(data.numeroLocali),
        numeroPostiLetto: parseInt(data.numeroPostiLetto),
        piano: data.piano ? parseInt(data.piano) : null,
        prezzoPerNotte: parseFloat(data.prezzoPerNotte),
        disponibile: true, // nuove abitazioni sono sempre disponibili
      };
      
      await abitazioneService.create(formattedData);
      await loadAbitazioni();
      setDialogOpen(false);
      setSuccess('Abitazione creata con successo!');
    } catch (error: any) {
      console.error('Errore nella creazione abitazione:', error);
      setError('Errore nella creazione abitazione: ' + (error.message || 'Controlla i dati inseriti'));
    }
  };

  const handleUpdate = async (data: any) => {
    if (!selectedAbitazione) return;
    
    try {
      setError(null);
      const formattedData = {
        ...data,
        idUtente: parseInt(data.idUtente),
        numeroLocali: parseInt(data.numeroLocali),
        numeroPostiLetto: parseInt(data.numeroPostiLetto),
        piano: data.piano ? parseInt(data.piano) : null,
        prezzoPerNotte: parseFloat(data.prezzoPerNotte),
        disponibile: selectedAbitazione.disponibile, // mantieni lo stato attuale
      };
      
      await abitazioneService.update(selectedAbitazione.idAbitazione, formattedData);
      await loadAbitazioni();
      setDialogOpen(false);
      setSelectedAbitazione(null);
      setSuccess('Abitazione aggiornata con successo!');
    } catch (error: any) {
      console.error('Errore nell\'aggiornamento abitazione:', error);
      setError('Errore nell\'aggiornamento abitazione: ' + (error.message || 'Controlla i dati inseriti'));
    }
  };

  const handleToggleDisponibilita = async (abitazione: Abitazione) => {
    try {
      setError(null);
      const nuovaDisponibilita = !abitazione.disponibile;
      const updated = {
        ...abitazione,
        disponibile: nuovaDisponibilita
      };
      
      await abitazioneService.update(abitazione.idAbitazione, updated);
      await loadAbitazioni();
      setSuccess(`Abitazione ${nuovaDisponibilita ? 'abilitata' : 'disabilitata'} con successo!`);
    } catch (error: any) {
      console.error('Errore nel toggle disponibilità:', error);
      setError('Errore nella modifica dello stato: ' + (error.message || 'Riprova più tardi'));
    }
  };

  const handleSearch = async () => {
    try {
      setError(null);
      let response;
      if (searchType === 'codiceHost') {
        response = await abitazioneService.getByCodiceHost(searchValue);
      } else {
        response = await abitazioneService.getByUtente(parseInt(searchValue));
      }
      setAbitazioni(response.data.data || []);
      setSearchDialogOpen(false);
      setSearchValue('');
    } catch (error: any) {
      console.error('Errore nella ricerca:', error);
      setError('Errore nella ricerca: ' + (error.message || 'Controlla i criteri di ricerca'));
    }
  };

  //controlla se un'abitazione può essere disabilitata 
  const checkIfAbitazioneCanBeDisabled = (abitazione: Abitazione): { canDisable: boolean; reason?: string } => {
    if (!abitazione.disponibile) {
      return {
        canDisable: false,
        reason: 'L\'abitazione è già disabilitata.'
      };
    }

    const prenotazioni = prenotazioniPerAbitazione[abitazione.idAbitazione] || [];
    
    // controlla se ci sono prenotazioni future
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    
    const prenotazioniFuture = prenotazioni.filter(p => {
      if (p.stato === 'CANCELLATA') return false;
      
      const dataInizio = new Date(p.dataInizioPrenotazione);
      dataInizio.setHours(0, 0, 0, 0);
      
      return dataInizio >= oggi;
    });
    
    if (prenotazioniFuture.length > 0) {
      return {
        canDisable: false,
        reason: `Impossibile disabilitare: l'abitazione ha ${prenotazioniFuture.length} prenotazione/i future.`
      };
    }
    
    //controlla se ci sono prenotazioni attive (in corso)
    const prenotazioniAttive = prenotazioni.filter(p => {
      if (p.stato === 'CANCELLATA') return false;
      
      const dataInizio = new Date(p.dataInizioPrenotazione);
      dataInizio.setHours(0, 0, 0, 0);
      
      const dataFine = new Date(p.dataFinePrenotazione);
      dataFine.setHours(0, 0, 0, 0);
      
      return oggi >= dataInizio && oggi <= dataFine;
    });
    
    if (prenotazioniAttive.length > 0) {
      return {
        canDisable: false,
        reason: `Impossibile disabilitare: l'abitazione ha ${prenotazioniAttive.length} prenotazione/i attiva/e.`
      };
    }
    
    return { canDisable: true };
  };

  // disabilita abitazione con controlli 
  const handleDisableAbitazione = async (abitazione: Abitazione) => {
    try {
      setError(null);
      setSuccess(null);
      
      // controlla se può essere disabilitata (lato frontend)
      const check = checkIfAbitazioneCanBeDisabled(abitazione);
      
      if (!check.canDisable) {
        setError(check.reason || 'Impossibile disabilitare l\'abitazione.');
        return;
      }
      
      // chiedi conferma all'utente
      const conferma = confirm(
        `Sei sicuro di voler DISABILITARE l'abitazione?\n\n` +
        `Nome: ${abitazione.nome}\n` +
        `ID: ${abitazione.idAbitazione}\n` +
        `Indirizzo: ${abitazione.indirizzo}\n\n` +
        `Questa azione renderà l'abitazione non disponibile per nuove prenotazioni.\n` +
        `Le prenotazioni esistenti non saranno modificate.\n\n` +
        `(Nel sistema, "Disabilita" equivale a "Elimina" - l'abitazione rimane nel database ma non è più visibile/attiva)`
      );
      
      if (!conferma) {
        return;
      }
      
      // chiama l'API per disabilitare (che è il metodo "delete" del backend)
      // Usa l'endpoint disable che già esiste nell'api.ts
      await abitazioneService.disable(abitazione.idAbitazione);
      
      setAbitazioni(prev => prev.map(a => 
        a.idAbitazione === abitazione.idAbitazione 
          ? { ...a, disponibile: false } 
          : a
      ));
      
      setSuccess('Abitazione disabilitata (eliminata) con successo!');
      
    } catch (error: any) {
      console.error('Errore nella disabilitazione abitazione:', error);
      
      // gestione errori specifici
      if (error.response?.status === 404) {
        setError('Abitazione non trovata sul server.');
      } else if (error.response?.status === 400 || error.response?.status === 409) {
        setError('Impossibile disabilitare: ' + (error.response?.data?.message || 'Controlla le prenotazioni attive.'));
      } else if (error.response?.status === 500) {
        setError('Errore interno del server. Riprova più tardi.');
      } else {
        setError('Errore durante la disabilitazione: ' + (error.message || 'Riprova più tardi.'));
      }
    }
  };

  // definizione delle colonne con tipi corretti
  const columns: Column<Abitazione>[] = [
    { key: 'idAbitazione', header: 'ID' },
    { key: 'nome', header: 'Nome' },
    { key: 'indirizzo', header: 'Indirizzo' },
    { key: 'numeroLocali', header: 'Locali' },
    { key: 'numeroPostiLetto', header: 'Posti Letto' },
    { 
      key: 'prezzoPerNotte', 
      header: 'Prezzo/Notte', 
      render: (value: number) => `€${value.toFixed(2)}` 
    },
    {
      key: 'periodoDisponibilita', //questa è una chiave virtuale, non presente nell'interfaccia
      header: 'Periodo',
      render: (value: any, abitazione: Abitazione) => (
        <div className="text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-gray-500" />
            <span>{formatDate(abitazione.dataInizioDisponibilita)}</span>
            <span className="text-gray-400">→</span>
            <span>{formatDate(abitazione.dataFineDisponibilita)}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {calcolaGiorniRimanenti(abitazione)} giorni rimanenti
          </div>
        </div>
      )
    },
    { 
      key: 'statoReale', // questa è una chiave virtuale come sopra, non presente nell'interfaccia
      header: 'Stato Reale',
      render: (value: any, abitazione: Abitazione) => {
        const disponibilita = calcolaDisponibilita(abitazione);
        
        if (disponibilita.disponibile) {
          return (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <span className="text-green-700 font-medium">Disponibile</span>
                <div className="text-xs text-gray-500">{disponibilita.motivo}</div>
              </div>
            </div>
          );
        } else {
          return (
            <div className="flex items-center gap-2">
              {abitazione.disponibile ? (
                <Clock className="h-4 w-4 text-amber-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <div>
                <span className={`font-medium ${abitazione.disponibile ? 'text-amber-700' : 'text-red-700'}`}>
                  Non disponibile
                </span>
                <div className="text-xs text-gray-500">{disponibilita.motivo}</div>
              </div>
            </div>
          );
        }
      }
    },
    { 
      key: 'disponibile', 
      header: 'Attivata',
      render: (value: boolean) => value ? (
        <div className="flex items-center">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="ml-1 text-sm text-green-700">Sì</span>
        </div>
      ) : (
        <div className="flex items-center">
          <XCircle className="h-5 w-5 text-red-500" />
          <span className="ml-1 text-sm text-red-700">No</span>
        </div>
      )
    },
  ];

  const formFields = [
    { 
      name: 'idUtente', 
      label: 'ID Utente', 
      type: 'select' as const, 
      required: true, 
      options: utenti.map(u => ({ value: u.idUtente.toString(), label: `${u.nome} ${u.cognome}` })) 
    },
    { name: 'nome', label: 'Nome', type: 'text' as const, required: true },
    { name: 'indirizzo', label: 'Indirizzo', type: 'text' as const, required: true },
    { name: 'numeroLocali', label: 'Numero Locali', type: 'number' as const, required: true },
    { name: 'numeroPostiLetto', label: 'Posti Letto', type: 'number' as const, required: true },
    { name: 'piano', label: 'Piano', type: 'number' as const },
    { name: 'prezzoPerNotte', label: 'Prezzo per Notte', type: 'number' as const, required: true },
    { name: 'dataInizioDisponibilita', label: 'Data Inizio Disponibilità', type: 'date' as const, required: true },
    { name: 'dataFineDisponibilita', label: 'Data Fine Disponibilità', type: 'date' as const, required: true },
  ];

  const searchFields = [
    {
      name: 'searchType',
      label: 'Tipo Ricerca',
      type: 'select' as const,
      required: true,
      options: [
        { value: 'idUtente', label: 'Per ID Utente' },
        { value: 'codiceHost', label: 'Per Codice Host' },
      ],
    },
    {
      name: 'searchValue',
      label: 'Valore',
      type: 'text' as const,
      required: true,
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Abitazioni</h1>
          <p className="text-gray-600 mt-2">
            Gestione delle abitazioni disponibili
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSearchDialogOpen(true)}>
            <Search className="h-4 w-4 mr-2" />
            Cerca
          </Button>
          <Button onClick={() => {
            setSelectedAbitazione(null);
            setDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Nuova Abitazione
          </Button>
        </div>
      </div>

      {/* Messaggi di stato */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 mr-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-gray-700">Disponibile oggi</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-amber-500 mr-1" />
                <span className="text-sm text-gray-700">Periodo o prenotazione</span>
              </div>
              <div className="flex items-center">
                <XCircle className="h-4 w-4 text-red-500 mr-1" />
                <span className="text-sm text-gray-700">Disabilitata manualmente</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* info box eliminazione/disabilitazione */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Note sull'eliminazione (disabilitazione) abitazioni:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Nel sistema, "Elimina" = "Disabilita"</strong> - l'abitazione rimane nel database ma non è più attiva</li>
              <li>Non è possibile disabilitare abitazioni con prenotazioni future</li>
              <li>Non è possibile disabilitare abitazioni con prenotazioni in corso</li>
              <li>Le prenotazioni già completate non bloccano la disabilitazione</li>
              <li>Le abitazioni disabilitate possono essere riabilitate in qualsiasi momento</li>
            </ul>
          </div>
        </div>
      </div>

      <DataTable<Abitazione>
        data={abitazioni}
        columns={columns}
        onEdit={(abitazione) => {
          setSelectedAbitazione(abitazione);
          setDialogOpen(true);
        }}
        onEnable={(abitazione) => handleToggleDisponibilita(abitazione)}
        onDelete={handleDisableAbitazione} 
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={selectedAbitazione ? 'Modifica Abitazione' : 'Nuova Abitazione'}
        description={selectedAbitazione ? 'Modifica i dati dell\'abitazione' : 'Inserisci i dati della nuova abitazione'}
        fields={formFields}
        initialData={selectedAbitazione || {}}
        onSubmit={selectedAbitazione ? handleUpdate : handleCreate}
        submitLabel={selectedAbitazione ? 'Aggiorna' : 'Crea'}
      />

      <FormDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        title="Cerca Abitazioni"
        description="Cerca abitazioni per codice host o ID utente"
        fields={searchFields}
        initialData={{ searchType: 'idUtente', searchValue: '' }}
        onSubmit={(data) => {
          setSearchType(data.searchType);
          setSearchValue(data.searchValue);
          handleSearch();
        }}
        submitLabel="Cerca"
      />
    </div>
  );
};

export default AbitazioniPage;