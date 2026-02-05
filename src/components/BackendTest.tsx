import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Server, Database } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { testBackendConnection } from '@/lib/api';

const BackendTest = () => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{success: boolean; error?: string; data?: any} | null>(null);

  const testConnection = async () => {
    setTesting(true);
    try {
      const testResult = await testBackendConnection();
      setResult(testResult);
    } catch (error) {
      setResult({ 
        success: false, 
        error: 'Errore nel test di connessione' 
      });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    // test automatico al caricamento
    testConnection();
  }, []);

  if (!result) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2">Test connessione backend...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          <h3 className="font-medium">Stato connessione backend</h3>
        </div>
        <Button 
          onClick={testConnection} 
          variant="outline" 
          size="sm"
          disabled={testing}
        >
          {testing ? 'Test in corso...' : 'Riprova'}
        </Button>
      </div>

      {result.success ? (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="font-medium">Backend connesso con successo!</div>
            <div className="text-sm mt-1">
              Il backend risponde correttamente da http://localhost:8080
            </div>
            {result.data && (
              <div className="mt-2 p-2 bg-green-100 rounded text-xs">
                <pre className="overflow-auto max-h-32">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">Backend non raggiungibile</div>
            <div className="text-sm mt-1">{result.error}</div>
            <div className="mt-2 text-sm">
              <p className="font-medium">Per risolvere:</p>
              <ol className="list-decimal pl-5 mt-1 space-y-1">
                <li>Assicurati che il backend Java sia in esecuzione</li>
                <li>Controlla che il backend sia su http://localhost:8080</li>
                <li>Verifica che non ci siano errori nella console Java</li>
                <li>Prova ad aprire http://localhost:8080/api/utenti nel browser</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default BackendTest;