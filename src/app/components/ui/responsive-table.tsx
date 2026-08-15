import { clsx } from 'clsx';
import type { ReactNode } from 'react';

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  hideOnMobile?: boolean;
}

interface ResponsiveTableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyLabel?: ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
  mobileTitle?: (row: T) => ReactNode;
  mobileSubtitle?: (row: T) => ReactNode;
}

export function ResponsiveTable<T>({
  columns,
  rows,
  rowKey,
  emptyLabel = 'No records',
  onRowClick,
  className,
  mobileTitle,
  mobileSubtitle,
}: ResponsiveTableProps<T>) {
  const visibleMobileColumns = columns.filter(c => !c.hideOnMobile);

  return (
    <div className={clsx('w-full', className)}>
      <div
        data-responsive-table-desktop=""
        className="hidden md:block overflow-x-auto rounded-2xl border border-[#E5D6BB] bg-white shadow-sm"
      >
        <table className="w-full text-[13px] text-[#1F1B18]">
          <thead className="bg-[#F7F1E6] text-left text-[11px] uppercase tracking-[0.08em] text-[#5B5149]">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  scope="col"
                  className={clsx('px-4 py-3 font-medium', col.headerClassName)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EFE4D1]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-[#5B5149]">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={clsx(
                    'transition-colors hover:bg-[#F9F5ED]',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map(col => (
                    <td key={col.key} className={clsx('px-4 py-3 align-top', col.cellClassName)}>
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div data-testid="responsive-table-mobile" className="md:hidden space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D9C8AE] bg-[#F9F5ED] px-4 py-8 text-center text-sm text-[#5B5149]">
            {emptyLabel}
          </div>
        ) : (
          rows.map(row => (
            <div
              key={rowKey(row)}
              data-testid="responsive-table-card"
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={clsx(
                'rounded-2xl border border-[#E5D6BB] bg-white p-4 shadow-sm',
                onRowClick && 'af-tap af-press cursor-pointer'
              )}
            >
              {mobileTitle && (
                <div className="text-[15px] font-medium text-[#1F1B18]">{mobileTitle(row)}</div>
              )}
              {mobileSubtitle && (
                <div className="text-[12px] text-[#5B5149] mt-0.5">{mobileSubtitle(row)}</div>
              )}
              <dl
                className={clsx(
                  'grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-[13px]',
                  (mobileTitle || mobileSubtitle) && 'mt-3 pt-3 border-t border-[#EFE4D1]'
                )}
              >
                {visibleMobileColumns.map(col => (
                  <div key={col.key} className="contents">
                    <dt className="text-[11px] uppercase tracking-[0.08em] text-[#5B5149] self-center">
                      {col.header}
                    </dt>
                    <dd className="text-[#1F1B18] break-words">{col.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
