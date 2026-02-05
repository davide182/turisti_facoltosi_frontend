import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import{ Building, Users, Calendar, Star, TrendingUp, Bed } from 'lucide-react';
import { 
  abitazioneService, 
  hostService, 
  prenotazioneService,
  utenteService 
} from '@/lib/api';
import type { Abitazione, Host, Prenotazione, Utente } from '@/types';

const Dashboard = () => {
  const [stats, setStats] = useState({
    utenti: 0,
    abitazioni: 0,
    host: 0,
    prenotazioni: 0,
    superHosts: 0,
    abitazionePiuGettonata: null as Abitazione | null,
    mediaPostiLetto: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  // funzione helper per estrarre dati normalizzati dalle risposte API
  const getNormalizedData = (response: any, dataKey: string = 'data') => {
    if (!response || !response.data) return null;
    
    // se c'è un campo 'data' con i dati
    if (response.data[dataKey] !== undefined) {
      return response.data[dataKey];
    }
    
    // se i dati sono direttamente nella risposta
    return response.data;
  };

  // funzione per calcolare la media posti letto manualmente
  const calcolaMediaPostiLettoManualmente = async (): Promise<number> => {
    try {
      console.log('Calcolo manuale media posti letto...');
      const abitazioniRes = await abitazioneService.getAll();
      const abitazioni = getNormalizedData(abitazioniRes) || [];
      console.log('Abitazioni trovate per calcolo manuale:', abitazioni.length);
      
      if (abitazioni.length > 0) {
        //filtra solo le abitazioni valide con numeroPostiLetto
        const abitazioniValide = abitazioni.filter((abitazione: Abitazione) => 
          abitazione && typeof abitazione.numeroPostiLetto === 'number'
        );
        
        if (abitazioniValide.length > 0) {
          const sommaPostiLetto = abitazioniValide.reduce((sum: number, abitazione: Abitazione) => 
            sum + (abitazione.numeroPostiLetto || 0), 0);
          const media = sommaPostiLetto / abitazioniValide.length;
          console.log('Media calcolata manualmente:', media, 'da', abitazioniValide.length, 'abitazioni valide');
          return media;
        } else {
          console.log('Nessuna abitazione valida trovata per calcolare la media');
          return 0;
        }
      } else {
        console.log('Nessuna abitazione trovata nel database');
        return 0;
      }
    } catch (err) {
      console.error('Errore nel calcolo manuale media posti letto:', err);
      return 0;
    }
  };

  const loadStats = async () => {
    try {
      setError(null);
      setLoading(true);
      
      console.log('Caricamento statistiche dashboard...');
      
      const [
        utentiRes,
        abitazioniRes,
        hostRes,
        prenotazioniRes,
        superHostsRes,
        abitazionePiuGettonataRes,
      ] = await Promise.all([
        utenteService.getAll().catch((err) => {
          console.warn('Errore utenti:', err.message);
          return { data: { data: [] } };
        }),
        abitazioneService.getAll().catch((err) => {
          console.warn('Errore abitazioni:', err.message);
          return { data: { data: [] } };
        }),
        hostService.getAll().catch((err) => {
          console.warn('Errore host:', err.message);
          return { data: { data: [] } };
        }),
        prenotazioneService.getAll().catch((err) => {
          console.warn('Errore prenotazioni:', err.message);
          return { data: { data: [] } };
        }),
        hostService.getSuperHosts().catch((err) => {
          console.warn('Errore super hosts:', err.message);
          return { data: { data: [] } };
        }),
        abitazioneService.getAbitazionePiuGettonata().catch((err) => {
          console.warn('Errore abitazione più gettonata:', err.message);
          return { data: { data: null } };
        }),
      ]);

      console.log('Risposte API dashboard:', {
        utenti: getNormalizedData(utentiRes),
        abitazioni: getNormalizedData(abitazioniRes),
        host: getNormalizedData(hostRes),
        prenotazioni: getNormalizedData(prenotazioniRes),
        superHosts: getNormalizedData(superHostsRes),
        abitazionePiuGettonata: getNormalizedData(abitazionePiuGettonataRes),
      });

      // conta gli elementi
      const utentiData = getNormalizedData(utentiRes) || [];
      const abitazioniData = getNormalizedData(abitazioniRes) || [];
      const hostData = getNormalizedData(hostRes) || [];
      const prenotazioniData = getNormalizedData(prenotazioniRes) || [];
      const superHostsData = getNormalizedData(superHostsRes) || [];
      
      let mediaPostiLetto = 0;
      try {
        // usa l'API dedicata
        const mediaPostiLettoRes = await abitazioneService.getMediaPostiLetto().catch(err => {
          console.warn('API media posti letto non disponibile, calcolo manuale:', err.message);
          return { data: { mediaPostiLetto: 0 } };
        });
        
        const mediaApi = getNormalizedData(mediaPostiLettoRes, 'mediaPostiLetto');
        console.log('Media posti letto API:', mediaApi);
        
        // funzione helper per estrarre numero da vari formati
        const extractNumber = (data: any): number => {
          if (typeof data === 'number') return data;
          if (typeof data === 'string') return parseFloat(data) || 0;
          if (data && typeof data === 'object') {
            //vari campi possibili
            if ('mediaPostiLetto' in data) return extractNumber(data.mediaPostiLetto);
            if ('value' in data) return extractNumber(data.value);
            if ('data' in data) return extractNumber(data.data);
            if ('average' in data) return extractNumber(data.average);
            if ('media' in data) return extractNumber(data.media);
            if ('avg' in data) return extractNumber(data.avg);
            // se è un array, calcola la media
            if (Array.isArray(data)) {
              const numbers = data.filter(item => typeof item === 'number');
              if (numbers.length > 0) {
                return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
              }
              return 0;
            }
          }
          return 0;
        };
        
        mediaPostiLetto = extractNumber(mediaApi);
        console.log('Media posti letto estratta:', mediaPostiLetto);
        
        if (mediaPostiLetto === 0 && abitazioniData.length > 0) {
          mediaPostiLetto = await calcolaMediaPostiLettoManualmente();
        }
      } catch (err) {
        console.error('Errore nel calcolo media posti letto:', err);
        
        if (abitazioniData.length > 0) {
          mediaPostiLetto = await calcolaMediaPostiLettoManualmente();
        }
      }

      setStats({
        utenti: Array.isArray(utentiData) ? utentiData.length : 0,
        abitazioni: Array.isArray(abitazioniData) ? abitazioniData.length : 0,
        host: Array.isArray(hostData) ? hostData.length : 0,
        prenotazioni: Array.isArray(prenotazioniData) ? prenotazioniData.length : 0,
        superHosts: Array.isArray(superHostsData) ? superHostsData.length : 0,
        abitazionePiuGettonata: getNormalizedData(abitazionePiuGettonataRes) as Abitazione | null,
        mediaPostiLetto,
      });
      
      console.log('Statistiche dashboard finali:', stats);
      
    } catch (error) {
      console.error('Errore nel caricamento statistiche dashboard:', error);
      setError('Impossibile caricare le statistiche. Assicurati che il backend sia in esecuzione.');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Utenti',
      value: stats.utenti,
      icon: <Users className="h-6 w-6" />,
      color: 'bg-blue-500',
    },
    {
      title: 'Abitazioni',
      value: stats.abitazioni,
      icon: <Building className="h-6 w-6" />,
      color: 'bg-green-500',
    },
    {
      title: 'Host',
      value: stats.host,
      icon: <Users className="h-6 w-6" />,
      color: 'bg-purple-500',
    },
    {
      title: 'Prenotazioni',
      value: stats.prenotazioni,
      icon: <Calendar className="h-6 w-6" />,
      color: 'bg-orange-500',
    },
    {
      title: 'Super Host',
      value: stats.superHosts,
      icon: <Star className="h-6 w-6" />,
      color: 'bg-yellow-500',
    },
    {
      title: 'Media Posti Letto',
      value: typeof stats.mediaPostiLetto === 'number' ? stats.mediaPostiLetto.toFixed(1) : '0.0',
      icon: <Bed className="h-6 w-6" />,
      color: 'bg-red-500',
      description: stats.mediaPostiLetto > 0 ? `Calcolata su ${stats.abitazioni} abitazioni` : '',
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">TURISTA FACOLTOSO</h1>
        <p className="text-gray-600 mt-2">
          Panoramica del sistema Turista Facoltoso
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">Attenzione</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-full ${stat.color} text-white`}>
                {stat.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.description && (
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.abitazionePiuGettonata && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Abitazione più gettonata (ultimo mese)
            </CardTitle>
            <CardDescription>
              L'abitazione con più prenotazioni nell'ultimo mese
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{stats.abitazionePiuGettonata.nome}</h3>
              <p className="text-gray-600">{stats.abitazionePiuGettonata.indirizzo}</p>
              <div className="flex gap-4 text-sm">
                <span className="text-gray-500">
                  {stats.abitazionePiuGettonata.numeroLocali} locali
                </span>
                <span className="text-gray-500">
                  {stats.abitazionePiuGettonata.numeroPostiLetto} posti letto
                </span>
                <span className="text-gray-500">
                  €{stats.abitazionePiuGettonata.prezzoPerNotte}/notte
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;