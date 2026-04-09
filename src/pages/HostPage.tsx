import React, { useState, useEffect } from 'react';
import { hostService } from '../lib/api';
import { Host } from '../types';

interface HostConPrenotazioniMensili extends Host {
  prenotazioniUltimoMese?: number;
}

const HostPage: React.FC = () => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [superHosts, setSuperHosts] = useState<Host[]>([]);
  const [topHosts, setTopHosts] = useState<HostConPrenotazioniMensili[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoteUserId, setPromoteUserId] = useState<string>('');
  const [promoting, setPromoting] = useState(false);
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [allHostsRes, superHostsRes, topHostsRes] = await Promise.all([
        hostService.getAll(),
        hostService.getSuperHosts(),
        hostService.getTopHostsUltimoMese()
      ]);

      const allHostsData = extractHostsData(allHostsRes);
      const superHostsData = extractHostsData(superHostsRes);
      const topHostsData = extractTopHostsData(topHostsRes);

      setHosts(allHostsData);
      setSuperHosts(superHostsData);
      setTopHosts(topHostsData);
    } catch (error) {
      console.error('Errore nel caricamento dati host:', error);
      setMessage({ type: 'error', text: 'Errore nel caricamento dei dati' });
    } finally {
      setLoading(false);
    }
  };

  const extractHostsData = (response: any): Host[] => {
    const data = response?.data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.data && Array.isArray(data.data)) return data.data;
    if (data.items && Array.isArray(data.items)) return data.items;
    if (data.content && Array.isArray(data.content)) return data.content;
    return [];
  };

  const extractTopHostsData = (response: any): HostConPrenotazioniMensili[] => {
    const data = response?.data;
    if (!data) return [];
    
    let rawData: any[] = [];
    if (Array.isArray(data)) rawData = data;
    else if (data.data && Array.isArray(data.data)) rawData = data.data;
    else if (data.items && Array.isArray(data.items)) rawData = data.items;
    
    return rawData.map(item => ({
      idUtente: item.idUtente,
      codiceHost: item.codiceHost,
      isSuperHost: item.isSuperHost,
      dataDiventatoSuper: item.dataDiventatoSuper,
      totPrenotazioni: item.totPrenotazioni,
      prenotazioniUltimoMese: item.prenotazioniUltimoMese || item.prenotazioni_ultimo_mese || 0
    }));
  };

  const handlePromoteToHost = async () => {
    const userId = parseInt(promoteUserId);
    if (isNaN(userId) || userId <= 0) {
      setMessage({ type: 'error', text: 'Inserisci un ID utente valido' });
      return;
    }

    setPromoting(true);
    setMessage(null);
    
    try {
      const response = await hostService.promoteToHost(userId);
      const responseData = response.data;
      const codice = responseData?.codiceHost || responseData?.data?.codiceHost;
      setMessage({ type: 'success', text: `✅ Utente ID ${userId} promosso a Host con codice: ${codice || 'N/A'}` });
      setPromoteUserId('');
      loadAllData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Errore nella promozione';
      setMessage({ type: 'error', text: `❌ ${errorMessage}` });
    } finally {
      setPromoting(false);
    }
  };

  const checkSuperHost = async (userId: number) => {
    setCheckingId(userId);
    setMessage(null);
    
    try {
      const response = await hostService.checkAndPromoteToSuperHost(userId);
      const responseData = response.data;
      const isPromoted = responseData?.promossoASuperHost || responseData?.data?.promossoASuperHost;
      
      if (isPromoted) {
        setMessage({ type: 'success', text: `⭐ Host ID ${userId} è diventato SUPER HOST!` });
        loadAllData();
      } else {
        setMessage({ type: 'success', text: `ℹ️ Host ID ${userId} non ha ancora 100 prenotazioni completate` });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Errore nella verifica';
      setMessage({ type: 'error', text: `❌ ${errorMessage}` });
    } finally {
      setCheckingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Caricamento host in corso...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestione Host</h1>
        <p className="text-gray-500 text-sm mt-1">Gestisci gli host, promuovi utenti e verifica i Super Host</p>
      </div>

      {/* Messaggio di feedback */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg flex justify-between items-center ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-lg font-bold opacity-70 hover:opacity-100">×</button>
        </div>
      )}

      {/* Card Promozione a Host */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6 overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-700">👤 Promuovi Utente a Host</h2>
        </div>
        <div className="p-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm font-medium text-gray-600 mb-1">ID Utente</label>
              <input
                type="text"
                value={promoteUserId}
                onChange={(e) => {
                  // Permetti solo numeri
                  const value = e.target.value;
                  if (value === '' || /^\d+$/.test(value)) {
                    setPromoteUserId(value);
                  }
                }}
                placeholder="Inserisci ID utente"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                inputMode="numeric"
                pattern="\d*"
              />
            </div>
            <button
              onClick={handlePromoteToHost}
              disabled={promoting || !promoteUserId}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {promoting ? 'Promozione in corso...' : 'Promuovi a Host'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            L'utente verrà automaticamente registrato come host se non lo è già
          </p>
        </div>
      </div>

      {/* Card Tutti gli Host */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6 overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-700">📋 Tutti gli Host ({hosts.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Codice Host</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prenotazioni</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Super</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {hosts.map((host) => (
                <tr key={host.idUtente} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-sm text-gray-900">{host.idUtente}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{host.codiceHost}</td>
                  <td className="px-4 py-3">
                    {host.isSuperHost ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        ⭐ Super Host
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Normale
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-700">{host.totPrenotazioni}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{host.dataDiventatoSuper || '-'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => checkSuperHost(host.idUtente)}
                      disabled={checkingId === host.idUtente || host.isSuperHost}
                      className={`text-sm px-3 py-1 rounded-md transition ${
                        host.isSuperHost
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                      title={host.isSuperHost ? 'Già Super Host' : 'Verifica se ha 100+ prenotazioni completate'}
                    >
                      {checkingId === host.idUtente ? 'Verifica...' : 'Verifica Super Host'}
                    </button>
                  </td>
                </tr>
              ))}
              {hosts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Nessun host presente
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card Super Host */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6 overflow-hidden">
        <div className="bg-yellow-50 px-4 py-3 border-b border-yellow-100">
          <h2 className="text-lg font-semibold text-yellow-800">⭐ Super Host ({superHosts.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Codice Host</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prenotazioni</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Super</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {superHosts.map((host) => (
                <tr key={host.idUtente} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{host.idUtente}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{host.codiceHost}</td>
                  <td className="px-4 py-3 text-sm font-bold text-green-600">{host.totPrenotazioni}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{host.dataDiventatoSuper || '-'}</td>
                </tr>
              ))}
              {superHosts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    Nessun Super Host al momento
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card Top Host Ultimo Mese */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
          <h2 className="text-lg font-semibold text-blue-800">🏆 Host con più prenotazioni (ultimo mese)</h2>
          <p className="text-xs text-blue-600 mt-0.5">Solo prenotazioni con stato COMPLETATA</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Codice Host</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mensili</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Totali</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topHosts.map((host, index) => (
                <tr key={host.idUtente} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-sm font-bold text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{host.idUtente}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{host.codiceHost}</td>
                  <td className="px-4 py-3">
                    {host.isSuperHost ? (
                      <span className="text-xs text-yellow-700">⭐ Super</span>
                    ) : (
                      <span className="text-xs text-gray-500">Normale</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-blue-600">{host.prenotazioniUltimoMese ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{host.totPrenotazioni}</td>
                </tr>
              ))}
              {topHosts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Nessuna prenotazione completata nell'ultimo mese
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legenda informativa */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">📌 Regole per diventare Super Host:</h3>
        <ul className="text-xs text-gray-500 space-y-1 list-disc pl-5">
          <li>Soglia: <span className="font-semibold text-gray-700">100 prenotazioni</span> con stato <code className="bg-gray-200 px-1 rounded">COMPLETATA</code></li>
          <li>Le prenotazioni <code className="bg-gray-200 px-1 rounded">CANCELLATA</code> <span className="font-semibold">NON</span> vengono conteggiate</li>
          <li>L'aggiornamento avviene automaticamente quando modifichi una prenotazione portandola allo stato <code className="bg-gray-200 px-1 rounded">COMPLETATA</code> dalla pagina Prenotazioni
</li>
          <li>Usa il pulsante <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">Verifica Super Host</span> per forzare l'aggiornamento</li>
        </ul>
      </div>
    </div>
  );
};

export default HostPage;