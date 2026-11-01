/** A half-open UTC interval [start, end), represented by ISO-8601 strings. */
export interface Interval {
  start: string;
  end: string;
}

export interface SlotRequest {
  window: Interval;
  slotMinutes: number;
  booked?: Interval[];
}

function parseInterval(interval: Interval, label: string): { start: number; end: number } {
  const start = Date.parse(interval.start);
  const end = Date.parse(interval.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error(`${label} must contain parseable date strings`);
  }
  if (end <= start) {
    throw new Error(`${label} end must be strictly after start`);
  }
  return { start, end };
}

/** Returns complete, unbooked slots on the grid anchored at window.start. */
export function availableSlots(request: SlotRequest): Interval[] {
  if (!Number.isInteger(request.slotMinutes) || request.slotMinutes <= 0) {
    throw new Error('slotMinutes must be a positive integer');
  }

  const window = parseInterval(request.window, 'Window');
  const booked = (request.booked ?? []).map((interval) =>
    parseInterval(interval, 'Booked interval'),
  );
  const duration = request.slotMinutes * 60_000;
  const slots: Interval[] = [];

  for (let start = window.start; start + duration <= window.end; start += duration) {
    const end = start + duration;
    if (!booked.some((interval) => start < interval.end && interval.start < end)) {
      slots.push({ start: new Date(start).toISOString(), end: new Date(end).toISOString() });
    }
  }
  return slots;
}
