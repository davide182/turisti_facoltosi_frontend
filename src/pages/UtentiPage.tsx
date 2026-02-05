import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, AlertTriangle, X } from 'lucide-react';
import DataTable  from '../components/DataTable';
import type{ Column } from '../components/DataTable';
import FormDialog from '../components/FormDialog';
import { 
  utenteService, 
  abitazioneService, 
  prenotazioneService 
} from '@/lib/api';
import type{ Utente, Abitazione, Prenotazione } from '../types';

const UtentiPage = () => {
  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [abitazioniPerUtente, setAbitazioniPerUtente] = useState<Record<number, Abitazione[]>>({});
  const [prenotazioniPerUtente, setPrenotazioniPerUtente] = useState<Record<number, Prenotazione[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [selectedUtente, setSelectedUtente] = useState<Utente | null>(null);
  const [utenteToDisable, setUtenteToDisable] = useState<Utente | null>(null);
  const [dialogMessage, setDialogMessage] = useState('');

  useEffect(() => {
    loadUtenti();
  }, []);

  const loadUtenti = async () => {
    try {
      const response = await utenteService.getAll();
      const utentiData = response.data.data || [];
      setUtenti(utentiData);

      const abitazioniMap: Record<number, Abitazione[]> = {};
      const prenotazioniMap: Record<number, Prenotazione[]> = {};

      await Promise.all(
        utentiData.map(async (utente: Utente) => {
          try {
            const abitazioniRes = await abitazioneService.getByUtente(utente.idUtente);
            abitazioniMap[utente.idUtente] = abitazioniRes.data.data || [];

            const prenotazioniRes = await prenotazioneService.getByUtente(utente.idUtente);
            prenotazioniMap[utente.idUtente] = prenotazioniRes.data.data || [];
          } catch (error) {
            console.error(`Errore nel caricamento dati per utente ${utente.idUtente}:`, error);
            abitazioniMap[utente.idUtente] = [];
            prenotazioniMap[utente.idUtente] = [];
          }
        })
      );

      setAbitazioniPerUtente(abitazioniMap);
      setPrenotazioniPerUtente(prenotazioniMap);
    } catch (error) {
      console.error('Errore nel caricamento utenti:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: any) => {
    try {
      await utenteService.create(data);
      await loadUtenti();
      setDialogOpen(false);
    } catch (error) {
      console.error('Errore nella creazione utente:', error);
    }
  };

  const handleUpdate = async (data: any) => {
    if (!selectedUtente) return;
    
    try {
      await utenteService.update(selectedUtente.idUtente, data);
      await loadUtenti();
      setDialogOpen(false);
      setSelectedUtente(null);
    } catch (error) {
      console.error('Errore nell\'aggiornamento utente:', error);
    }
  };

  const checkIfCanDisable = (utente: Utente): { canDisable: boolean; reason?: string } => {
    const abitazioni = abitazioniPerUtente[utente.idUtente] || [];
    const prenotazioniAttive = (prenotazioniPerUtente[utente.idUtente] || []).filter(
      p => p.stato !== 'CANCELLATA' && p.stato !== 'COMPLETATA'
    );

    if (abitazioni.length > 0) {
      return {
        canDisable: false,
        reason: `L'utente ha ${abitazioni.length} abitazione/i registrata/e. Rimuovi prima le abitazioni.`
      };
    }

    if (prenotazioniAttive.length > 0) {
      return {
        canDisable: false,
        reason: `L'utente ha ${prenotazioniAttive.length} prenotazione/i attiva/e. Cancella o completa prima le prenotazioni.`
      };
    }

    return { canDisable: true };
  };

  const handleDisableClick = (utente: Utente) => {
    const check = checkIfCanDisable(utente);
    
    if (!check.canDisable) {
      setDialogMessage(check.reason || 'Non è possibile disabilitare questo utente.');
      setWarningDialogOpen(true);
      return;
    }

    setUtenteToDisable(utente);
    setDialogMessage(`Sei sicuro di voler disabilitare l'utente ${utente.nome} ${utente.cognome}?`);
    setConfirmDialogOpen(true);
  };

  const handleDisableConfirm = async () => {
    if (!utenteToDisable) return;
    
    try {
      await utenteService.disable(utenteToDisable.idUtente);
      await loadUtenti();
      setConfirmDialogOpen(false);
      setUtenteToDisable(null);
    } catch (error) {
      console.error('Errore nella disabilitazione utente:', error);
      setDialogMessage('Errore nella disabilitazione dell\'utente.');
      setWarningDialogOpen(true);
    }
  };

  const handleEnable = async (utente: Utente) => {
    try {
      await utenteService.enable(utente.idUtente);
      await loadUtenti();
    } catch (error) {
      console.error('Errore nell\'abilitazione utente:', error);
    }
  };

  const columns: Column<Utente>[] = [
    { key: 'idUtente', header: 'ID' },
    { key: 'nome', header: 'Nome' },
    { key: 'cognome', header: 'Cognome' },
    { key: 'email', header: 'Email' },
    { key: 'indirizzo', header: 'Indirizzo' },
    { 
      key: 'attivo', 
      header: 'Attivo',
      render: (value: boolean) => value ? (
        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
          Sì
        </span>
      ) : (
        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
          No
        </span>
      )
    },
    {
      key: 'idUtente' as keyof Utente, // usiamo una chiave esistente
      header: 'Dettagli',
      render: (value: number, utente: Utente) => {
        const abitazioni = abitazioniPerUtente[utente.idUtente] || [];
        const prenotazioni = prenotazioniPerUtente[utente.idUtente] || [];
        const prenotazioniAttive = prenotazioni.filter(
          p => p.stato !== 'CANCELLATA' && p.stato !== 'COMPLETATA'
        );

        return (
          <div className="text-xs space-y-1">
            {abitazioni.length > 0 && (
              <div className="flex items-center text-amber-600">
                <span className="font-medium">Abitazioni:</span> 
                <span className="ml-1 px-1.5 py-0.5 bg-amber-100 rounded text-amber-800">
                  {abitazioni.length}
                </span>
              </div>
            )}
            {prenotazioniAttive.length > 0 && (
              <div className="flex items-center text-blue-600">
                <span className="font-medium">Prenotazioni attive:</span> 
                <span className="ml-1 px-1.5 py-0.5 bg-blue-100 rounded text-blue-800">
                  {prenotazioniAttive.length}
                </span>
              </div>
            )}
            {prenotazioni.length > 0 && prenotazioniAttive.length === 0 && (
              <div className="flex items-center text-gray-500">
                <span className="font-medium">Prenotazioni totali:</span> 
                <span className="ml-1 px-1.5 py-0.5 bg-gray-100 rounded">
                  {prenotazioni.length}
                </span>
              </div>
            )}
            {abitazioni.length === 0 && prenotazioni.length === 0 && (
              <div className="text-gray-400 italic">Nessun dato associato</div>
            )}
          </div>
        );
      }
    },
  ];

  const formFields = [
    { name: 'nome', label: 'Nome', type: 'text' as const, required: true },
    { name: 'cognome', label: 'Cognome', type: 'text' as const, required: true },
    { name: 'email', label: 'Email', type: 'email' as const, required: true },
    { name: 'indirizzo', label: 'Indirizzo', type: 'text' as const, required: true },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // componente personalizzato con conferma
  const CustomDialog = ({ open, onClose, title, message, type, onConfirm }: {
    open: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type: 'warning' | 'confirm';
    onConfirm?: () => void;
  }) => {
    if (!open) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600">{message}</p>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
              >
                {type === 'warning' ? 'OK' : 'Annulla'}
              </Button>
              
              {type === 'confirm' && onConfirm && (
                <Button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Conferma
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Utenti</h1>
          <p className="text-gray-600 mt-2">
            Gestione degli utenti del sistema
          </p>
        </div>
        <Button onClick={() => {
          setSelectedUtente(null);
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Utente
        </Button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Note sulla disabilitazione utenti:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Un utente può essere disabilitato solo se non ha abitazioni registrate</li>
              <li>Un utente può essere disabilitato solo se non ha prenotazioni attive</li>
              <li>Le prenotazioni completate o cancellate non bloccano la disabilitazione</li>
            </ul>
          </div>
        </div>
      </div>

      <DataTable<Utente>
        data={utenti}
        columns={columns}
        onEdit={(utente) => {
          setSelectedUtente(utente);
          setDialogOpen(true);
        }}
        onEnable={handleEnable}
        onDisable={handleDisableClick}
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={selectedUtente ? 'Modifica Utente' : 'Nuovo Utente'}
        description={selectedUtente ? 'Modifica i dati dell\'utente' : 'Inserisci i dati del nuovo utente'}
        fields={formFields}
        initialData={selectedUtente || {}}
        onSubmit={selectedUtente ? handleUpdate : handleCreate}
        submitLabel={selectedUtente ? 'Aggiorna' : 'Crea'}
      />

      {/* Dialog per warning */}
      <CustomDialog
        open={warningDialogOpen}
        onClose={() => setWarningDialogOpen(false)}
        title="Impossibile disabilitare"
        message={dialogMessage}
        type="warning"
      />

      {/* Dialog per conferma */}
      <CustomDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        title="Conferma disabilitazione"
        message={dialogMessage}
        type="confirm"
        onConfirm={handleDisableConfirm}
      />
    </div>
  );
};

export default UtentiPage;