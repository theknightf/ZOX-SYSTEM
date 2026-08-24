import { NextRequest, NextResponse } from 'next/server';
import { initialSessions, type LiveSession } from '../../../data/sessions';
import { catalogProducts } from '../../../data/catalog';
import {
  applyQuickAction,
  ALLOWED_DURATIONS,
  QUICK_ACTION_CONFIG,
} from '../../../lib/roomQuickActions';

const store = new Map<string, LiveSession>(initialSessions.map((s) => [s.id, structuredClone(s)]));

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Only ever trust a session identifier — never client-sent session state.
    const requestedId: unknown = body?.id ?? body?.target?.id;
    const productId: unknown = body?.productId;
    const quantity: unknown = body?.quantity;
    const extendMinutes: unknown = body?.extendMinutes;

    if (typeof requestedId !== 'string' || !requestedId) {
      return NextResponse.json({ ok: false, error: 'session is required' }, { status: 400 });
    }

    // Look up the authoritative session server-side — never trust pricing
    // fields (hourlyRate, products, etc.) sent by the client.
    const session = store.get(requestedId);
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unknown session' }, { status: 400 });
    }

    const product = catalogProducts.find((p) => p.id === productId);
    if (!product) {
      return NextResponse.json(
        { ok: false, error: 'Unknown productId; must be one of the catalog ids' },
        { status: 400 }
      );
    }

    const qty = Math.max(1, Math.floor(Number(quantity ?? QUICK_ACTION_CONFIG.quantity)));
    const minutes = ALLOWED_DURATIONS.includes(Number(extendMinutes))
      ? Number(extendMinutes)
      : QUICK_ACTION_CONFIG.extendMinutes;

    const current = structuredClone(session);

    const result = applyQuickAction(current, {
      productId: product.id,
      quantity: qty,
      extendMinutes: minutes,
    });

    store.set(session.id, structuredClone(result.session));

    return NextResponse.json({
      ok: true,
      target: result.session,
      productAdded: result.productAdded,
      timeExtended: result.timeExtended,
      cost: result.cost,
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }
}
