import { NextRequest, NextResponse } from 'next/server';
import { ZONES, type ZoneSession } from '../../../../data/zones';
import { catalogProducts } from '../../../../data/catalog';
import { ALLOWED_DURATIONS, QUICK_ACTION_CONFIG } from '../../../../lib/roomQuickActions';
import { applyZoneQuickAction } from '../../../../lib/zoneQuickActions';

const store = new Map<string, ZoneSession>(ZONES.map((z) => [z.id, structuredClone(z)]));

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Only ever trust a zone identifier — never a client-sent target object.
    const requestedId: unknown = body?.id ?? body?.target?.id;
    const productId: unknown = body?.productId;
    const quantity: unknown = body?.quantity;
    const extendMinutes: unknown = body?.extendMinutes;

    if (typeof requestedId !== 'string' || !requestedId || !store.has(requestedId)) {
      return NextResponse.json({ ok: false, error: 'Unknown zone' }, { status: 400 });
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

    // Authoritative zone state comes from the server store — pricing included.
    const current = store.get(requestedId)!;

    const result = applyZoneQuickAction(current, {
      productId: product.id,
      quantity: qty,
      extendMinutes: minutes,
    });

    store.set(requestedId, structuredClone(result.zone));

    return NextResponse.json({
      ok: true,
      target: result.zone,
      productAdded: result.productAdded,
      timeExtended: result.timeExtended,
      cost: result.cost,
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }
}
