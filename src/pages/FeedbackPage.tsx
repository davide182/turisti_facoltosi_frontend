import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Star } from 'lucide-react';
import DataTable from '../components/DataTable';
import FormDialog from '../components/FormDialog';
import { feedbackService, prenotazioneService } from '../lib/api';
import type { Feedback } from '../types';

const FeedbackPage = () => {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [feedbackAltoPunteggio, setFeedbackAltoPunteggio] = useState<Feedback[]>([]);
  const [prenotazioni, setPrenotazioni] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'highRating'>('all');

  useEffect(() => {
    loadData();
  }, []);

  //formatta data
  const formatDate = (dateInput: any): string => {
    if (!dateInput) return 'N/A';
    
    console.log('Data ricevuta per formattazione:', dateInput, 'Tipo:', typeof dateInput); 
    
    try {
      let date: Date;
      
      if (Array.isArray(dateInput)) {
        console.log('Ricevuto array:', dateInput);
        
        if (dateInput.length >= 6) {
          const [year, month, day, hour, minute, second] = dateInput;
          // sottrai 1 per i mesi di js che sono based 0
          date = new Date(year, month - 1, day, hour, minute, second || 0);
          console.log(`Data da array: ${year}-${month}-${day} ${hour}:${minute}:${second}`);
        } else {
          console.warn('Array di data troppo corto:', dateInput);
          return `[${dateInput.join(', ')}]`;
        }
      }
      else if (typeof dateInput === 'string' && /^\d{20,}$/.test(dateInput)) {
        // estrai le parti manualmente per non avere un unica stringa
        const year = parseInt(dateInput.substring(0, 4));
        const month = parseInt(dateInput.substring(4, 6));
        const day = parseInt(dateInput.substring(6, 8));
        const hour = parseInt(dateInput.substring(8, 10));
        const minute = parseInt(dateInput.substring(10, 12));
        const second = parseInt(dateInput.substring(12, 14));
        
        console.log(`Data estratta da stringa: ${year}-${month}-${day} ${hour}:${minute}:${second}`);
        //sottrai 1
        date = new Date(year, month - 1, day, hour, minute, second);
      }

      else if (typeof dateInput === 'string' && dateInput.includes(',')) {
        const parts = dateInput.split(',').map(Number);
        if (parts.length >= 6) {
          const [year, month, day, hour, minute, second] = parts;
          date = new Date(year, month - 1, day, hour, minute, second);
        } else {
          return dateInput; // ritorna la stringa originale se non possiamo parsarla
        }
      } 

      else if (typeof dateInput === 'string') {
        date = new Date(dateInput);
      } else {
        console.warn('Tipo di dato non riconosciuto per data:', typeof dateInput, dateInput);
        return String(dateInput);
      }
      
      // controlla se la data è valida
      if (isNaN(date.getTime())) {
        console.warn('Data non valida dopo parsing:', dateInput);
        return String(dateInput); 
      }
      
      return date.toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Errore nella formattazione della data:', error, dateInput);
      if (typeof dateInput === 'string' && dateInput.length > 20) {
        const datePart = dateInput.substring(0, 14); 
        return `${datePart.substring(6, 8)}/${datePart.substring(4, 6)}/${datePart.substring(0, 4)} ${datePart.substring(8, 10)}:${datePart.substring(10, 12)}`;
      }
      return String(dateInput); // in caso di errore, mostra la stringa originale
    }
  };

  const loadData = async () => {
    try {
      const [feedbackRes, feedbackAltoRes, prenotazioniRes] = await Promise.all([
        feedbackService.getAll(),
        feedbackService.getConAltoPunteggio(4),
        prenotazioneService.getAll(),
      ]);

      console.log('Feedback ricevuti:', feedbackRes.data.data); 
      console.log('Feedback alto punteggio:', feedbackAltoRes.data.data);
      
      setFeedbackList(feedbackRes.data.data || []);
      setFeedbackAltoPunteggio(feedbackAltoRes.data.data || []);
      setPrenotazioni(prenotazioniRes.data.data || []);
    } catch (error) {
      console.error('Errore nel caricamento dati:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: any) => {
    try {
      const formattedData = {
        ...data,
        idPrenotazione: parseInt(data.idPrenotazione),
        punteggio: parseInt(data.punteggio),
      };
      
      await feedbackService.create(formattedData);
      loadData();
      setDialogOpen(false);
    } catch (error) {
      console.error('Errore nella creazione feedback:', error);
    }
  };

  const handleUpdate = async (data: any) => {
    if (!selectedFeedback) return;
    
    try {
      const formattedData = {
        ...data,
        idPrenotazione: parseInt(data.idPrenotazione),
        punteggio: parseInt(data.punteggio),
      };
      
      await feedbackService.update(selectedFeedback.idFeedback, formattedData);
      loadData();
      setDialogOpen(false);
      setSelectedFeedback(null);
    } catch (error) {
      console.error('Errore nell\'aggiornamento feedback:', error);
    }
  };

  const handleDelete = async (feedback: Feedback) => {
    try {
      await feedbackService.delete(feedback.idFeedback);
      loadData();
    } catch (error) {
      console.error('Errore nell\'eliminazione feedback:', error);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const columns = [
    { key: 'idFeedback', header: 'ID' },
    { key: 'idPrenotazione', header: 'ID Prenotazione' },
    { key: 'titolo', header: 'Titolo' },
    { 
      key: 'punteggio', 
      header: 'Punteggio',
      render: (value: number) => renderStars(value)
    },
    { 
      key: 'testo', 
      header: 'Testo',
      render: (value: string) => (
        <div className="max-w-xs truncate" title={value}>
          {value}
        </div>
      )
    },
    { 
      key: 'dataCreazione', 
      header: 'Data Creazione',
      render: (value: any) => (
        <div className="whitespace-nowrap">
          {formatDate(value)}
        </div>
      )
    },
  ];

  //specifica i tipi 
  const formFields = [
    { 
      name: 'idPrenotazione', 
      label: 'Prenotazione', 
      type: 'select' as const,  
      required: true,
      options: prenotazioni.map(p => ({ 
        value: p.idPrenotazione.toString(), 
        label: `Prenotazione #${p.idPrenotazione} (Utente: ${p.idUtente})` 
      }))
    },
    { 
      name: 'titolo', 
      label: 'Titolo', 
      type: 'text' as const, 
      required: true 
    },
    { 
      name: 'testo', 
      label: 'Testo', 
      type: 'textarea' as const,  
      required: true 
    },
    { 
      name: 'punteggio', 
      label: 'Punteggio', 
      type: 'select' as const, 
      required: true,
      options: [
        { value: '1', label: '✨ 1' },
        { value: '2', label: '✨✨ 2' },
        { value: '3', label: '✨✨✨ 3' },
        { value: '4', label: '✨✨✨✨ 4' },
        { value: '5', label: '✨✨✨✨✨ 5' },
      ]
    },
  ];

  const getDataForTab = () => {
    switch (activeTab) {
      case 'highRating':
        return feedbackAltoPunteggio;
      default:
        return feedbackList;
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Feedback</h1>
          <p className="text-gray-600 mt-2">
            Gestione dei feedback degli utenti
          </p>
        </div>
        <Button onClick={() => {
          setSelectedFeedback(null);
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Feedback
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Tutti i Feedback ({feedbackList.length})
          </button>
          <button
            onClick={() => setActiveTab('highRating')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'highRating'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              Alto Punteggio ({feedbackAltoPunteggio.length})
            </div>
          </button>
        </nav>
      </div>

      <DataTable
        data={getDataForTab()}
        columns={columns}
        onEdit={(feedback) => {
          setSelectedFeedback(feedback);
          setDialogOpen(true);
        }}
        onDelete={handleDelete}
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={selectedFeedback ? 'Modifica Feedback' : 'Nuovo Feedback'}
        description={selectedFeedback ? 'Modifica il feedback' : 'Aggiungi un nuovo feedback'}
        fields={formFields}
        initialData={selectedFeedback || {}}
        onSubmit={selectedFeedback ? handleUpdate : handleCreate}
        submitLabel={selectedFeedback ? 'Aggiorna' : 'Crea'}
      />
    </div>
  );
};

export default FeedbackPage;