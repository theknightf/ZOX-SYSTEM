// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type React from 'react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/api', () => ({
  toastApiError: vi.fn(),
}));

vi.mock('@/lib/api/sessions', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/api/sessions')>();
  return {
    ...mod,
    fetchLiveSessions: vi.fn(),
    pauseSession: vi.fn(),
    resumeSession: vi.fn(),
    startSession: vi.fn(),
    endSession: vi.fn(),
    addSessionProduct: vi.fn(),
  };
});

vi.mock('@/lib/api/floorOps', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/api/floorOps')>();
  return {
    ...mod,
    reservationsApi: {
      list: vi.fn(async () => []),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
  };
});

// Heavy reused modals are irrelevant to these interaction tests.
vi.mock('@/app/live-sessions/components/PaymentModal', () => ({
  default: (): React.ReactElement => <div data-testid="payment-modal" />,
}));
vi.mock('@/app/live-sessions/components/EvaluationPopup', () => ({
  default: (): React.ReactElement => <div data-testid="evaluation-popup" />,
}));
vi.mock('@/app/live-sessions/components/AddProductModal', () => ({
  default: (): React.ReactElement => <div data-testid="add-product-modal" />,
}));
vi.mock('@/app/reservations/components/QuickBookModal', () => ({
  default: (): React.ReactElement => <div data-testid="quick-book-modal" />,
}));

import RoomQuickActions from '../RoomQuickActions';
import { fetchLiveSessions } from '@/lib/api/sessions';

const roomBase = {
  id: 'room-001',
  name: 'Room 1',
  type: 'Standard' as const,
};

function renderInCard(ui: React.ReactElement) {
  const cardClick = vi.fn();
  const utils = render(
    <div onClick={cardClick} onKeyDown={cardClick}>
      {ui}
    </div>
  );
  return { ...utils, cardClick };
}

describe('RoomQuickActions', () => {
  beforeEach(() => {
    vi.mocked(fetchLiveSessions).mockReset();
  });

  it.each([
    ['available'],
    ['occupied'],
    ['reserved'],
    ['maintenance'],
  ] as const)('renders a Quick Actions trigger for %s rooms', (status) => {
    render(<RoomQuickActions room={{ ...roomBase, status }} />);
    expect(
      screen.getByRole('button', { name: /quick actions/i })
    ).toBeInTheDocument();
  });

  it('opens the modal on click without triggering the parent card click', () => {
    const { cardClick } = renderInCard(
      <RoomQuickActions room={{ ...roomBase, status: 'available' }} />
    );

    fireEvent.click(screen.getByRole('button', { name: /quick actions/i }));

    expect(screen.getByRole('dialog', { name: /quick actions for room 1/i })).toBeInTheDocument();
    expect(cardClick).not.toHaveBeenCalled();
  });

  it('shows status-appropriate actions for available rooms', () => {
    render(<RoomQuickActions room={{ ...roomBase, status: 'available' }} />);
    fireEvent.click(screen.getByRole('button', { name: /quick actions/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Start Session')).toBeInTheDocument();
    expect(within(dialog).getByText('Reserve Room')).toBeInTheDocument();
    expect(within(dialog).getByText('Mark as Cleaning')).toBeInTheDocument();
    expect(within(dialog).getByText('Put Under Maintenance')).toBeInTheDocument();
    expect(within(dialog).queryByText('End Session')).not.toBeInTheDocument();
  });

  it('shows status-appropriate actions for occupied rooms', () => {
    render(<RoomQuickActions room={{ ...roomBase, status: 'occupied' }} />);
    fireEvent.click(screen.getByRole('button', { name: /quick actions/i }));

    const dialog = screen.getByRole('dialog');
    ['End Session', 'Add Drinks', 'Pause Session', 'Print Receipt'].forEach((label) => {
      expect(within(dialog).getByText(label)).toBeInTheDocument();
    });
    expect(within(dialog).queryByText('Start Session')).not.toBeInTheDocument();
  });

  it('shows status-appropriate actions for reserved rooms', () => {
    render(<RoomQuickActions room={{ ...roomBase, status: 'reserved' }} />);
    fireEvent.click(screen.getByRole('button', { name: /quick actions/i }));

    const dialog = screen.getByRole('dialog');
    ['Start Session', 'Edit Reservation', 'Cancel Reservation'].forEach((label) => {
      expect(within(dialog).getByText(label)).toBeInTheDocument();
    });
    expect(within(dialog).queryByText('End Session')).not.toBeInTheDocument();
  });

  it('shows status-appropriate actions for maintenance rooms', () => {
    render(<RoomQuickActions room={{ ...roomBase, status: 'maintenance' }} />);
    fireEvent.click(screen.getByRole('button', { name: /quick actions/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Mark as Available')).toBeInTheDocument();
    expect(within(dialog).getByText('Add Maintenance Note')).toBeInTheDocument();
    expect(within(dialog).queryByText('Cancel Reservation')).not.toBeInTheDocument();
  });

  it('closes the modal when Escape is pressed', () => {
    render(<RoomQuickActions room={{ ...roomBase, status: 'available' }} />);
    fireEvent.click(screen.getByRole('button', { name: /quick actions/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('disables action buttons while an async lookup is processing', async () => {
    vi.mocked(fetchLiveSessions).mockReturnValue(new Promise(() => undefined)); // never settles

    render(<RoomQuickActions room={{ ...roomBase, status: 'occupied' }} />);
    fireEvent.click(screen.getByRole('button', { name: /quick actions/i }));

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByText('End Session'));

    await waitFor(() => {
      expect(within(dialog).getByText('Print Receipt').closest('button')).toBeDisabled();
    });

    expect(fetchLiveSessions).toHaveBeenCalledTimes(1);
  });

  it('does not open the modal via Enter key bubbling when focus is inside the wrapper', () => {
    render(
      <div
        data-testid="fake-card"
        onClick={vi.fn()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.dataset.entered = 'true';
        }}
      >
        <div onKeyDown={(e) => e.stopPropagation()}>
          <RoomQuickActions room={{ ...roomBase, status: 'reserved' }} />
        </div>
      </div>
    );

    const trigger = screen.getByRole('button', { name: /quick actions/i });
    fireEvent.keyDown(trigger, { key: 'Enter' });

    const fakeCard = screen.getByTestId('fake-card');
    expect(fakeCard.dataset.entered).toBeUndefined();
  });
});
