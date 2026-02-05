import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface Column<T extends Record<string, any>> {
  key: string | keyof T;
  header: string;
  render?: (value: any, item: T) => React.ReactNode;
}

export interface DataTableProps<T extends Record<string, any>> {
  data: T[];
  columns: Column<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onView?: (item: T) => void;
  onEnable?: (item: T) => void;
  onDisable?: (item: T) => void;
  showActionsColumn?: boolean; // nuovo prop per controllare se mostrare la colonna azioni
}

const DataTable = <T extends Record<string, any>>({
  data,
  columns,
  onEdit,
  onDelete,
  onView,
  onEnable,
  onDisable,
  showActionsColumn = true, // default true per retrocompatibilità
}: DataTableProps<T>) => {
  const renderCell = (item: T, column: Column<T>) => {
    const value = column.key in item ? item[column.key as keyof T] : undefined;
    
    if (column.render) {
      return column.render(value, item);
    }
    
    return value?.toString() || '-';
  };

  // controlla se una delle colonne esistenti è già una colonna "azioni"
  const hasCustomActionsColumn = columns.some(col => 
    col.key === 'azioni' || col.header.toLowerCase().includes('azioni')
  );

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={String(column.key)}>{column.header}</TableHead>
            ))}
            {/* mostra la colonna azioni solo se non esiste già e se showActionsColumn è true */}
            {!hasCustomActionsColumn && showActionsColumn && (
              <TableHead className="w-[150px]">Azioni</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={columns.length + (!hasCustomActionsColumn && showActionsColumn ? 1 : 0)} 
                className="text-center py-8 text-gray-500"
              >
                Nessun dato disponibile
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={String(column.key)}>
                    {renderCell(item, column)}
                  </TableCell>
                ))}
                {/* mostra le azioni standard solo se non esiste una colonna azioni personalizzata */}
                {!hasCustomActionsColumn && showActionsColumn && (
                  <TableCell>
                    <div className="flex space-x-2">
                      {onView && (
                        <button
                          onClick={() => onView(item)}
                          title="Visualizza"
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        >
                          <span role="img" aria-label="Visualizza">👁️</span>
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          title="Modifica"
                          className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                        >
                          <span role="img" aria-label="Modifica">✏️</span>
                        </button>
                      )}
                      {onEnable && 'attivo' in item && item.attivo === false && (
                        <button
                          onClick={() => onEnable(item)}
                          title="Abilita"
                          className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                        >
                          <span role="img" aria-label="Abilita">✓</span>
                        </button>
                      )}
                      {onDisable && 'attivo' in item && item.attivo !== false && (
                        <button
                          onClick={() => onDisable(item)}
                          title="Disabilita"
                          className="p-1 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded transition-colors"
                        >
                          <span role="img" aria-label="Disabilita">✗</span>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(item)}
                          title="Elimina"
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                        >
                          <span role="img" aria-label="Elimina">🗑️</span>
                        </button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default DataTable;