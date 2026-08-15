import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResponsiveTable, type TableColumn } from './ui/responsive-table';

type Row = { id: string; name: string; status: string };

const columns: TableColumn<Row>[] = [
  { key: 'name', header: 'Name', cell: r => r.name },
  { key: 'status', header: 'Status', cell: r => r.status },
];

const rows: Row[] = [
  { id: '1', name: 'Amina', status: 'Active' },
  { id: '2', name: 'Kofi', status: 'Locked' },
];

describe('ResponsiveTable', () => {
  it('renders a semantic <table> in desktop container', () => {
    render(<ResponsiveTable columns={columns} rows={rows} rowKey={r => r.id} />);
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    expect(within(table).getByText('Amina')).toBeInTheDocument();
    expect(within(table).getByText('Locked')).toBeInTheDocument();
  });

  it('renders all column headers', () => {
    render(<ResponsiveTable columns={columns} rows={rows} rowKey={r => r.id} />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
  });

  it('also renders a mobile card stack that includes every row field', () => {
    render(<ResponsiveTable columns={columns} rows={rows} rowKey={r => r.id} />);
    const cards = screen.getAllByTestId('responsive-table-card');
    expect(cards.length).toBe(rows.length);
    expect(within(cards[0]).getByText('Amina')).toBeInTheDocument();
    expect(within(cards[0]).getByText('Active')).toBeInTheDocument();
    expect(within(cards[1]).getByText('Kofi')).toBeInTheDocument();
    expect(within(cards[1]).getByText('Locked')).toBeInTheDocument();
  });

  it('hides the table on mobile via hidden md:table utility', () => {
    render(<ResponsiveTable columns={columns} rows={rows} rowKey={r => r.id} />);
    const table = screen.getByRole('table');
    const wrapper = table.closest('[data-responsive-table-desktop]') as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.className).toMatch(/hidden/);
    expect(wrapper.className).toMatch(/md:/);
  });

  it('hides mobile cards on desktop via md:hidden utility', () => {
    render(<ResponsiveTable columns={columns} rows={rows} rowKey={r => r.id} />);
    const mobileWrap = screen.getByTestId('responsive-table-mobile');
    expect(mobileWrap.className).toMatch(/md:hidden/);
  });

  it('renders an empty state when rows is empty', () => {
    render(<ResponsiveTable columns={columns} rows={[]} rowKey={r => r.id} emptyLabel="No data" />);
    expect(screen.getAllByText('No data').length).toBeGreaterThan(0);
  });
});
