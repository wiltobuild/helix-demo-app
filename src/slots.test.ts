import { describe, expect, it } from 'vitest';
import { availableSlots, type Interval, type SlotRequest } from './slots.js';

const window: Interval = { start: '2026-11-01T09:00:00Z', end: '2026-11-01T10:30:00Z' };
const first: Interval = {
  start: '2026-11-01T09:00:00.000Z',
  end: '2026-11-01T09:30:00.000Z',
};
const second: Interval = {
  start: '2026-11-01T09:30:00.000Z',
  end: '2026-11-01T10:00:00.000Z',
};
const third: Interval = {
  start: '2026-11-01T10:00:00.000Z',
  end: '2026-11-01T10:30:00.000Z',
};

describe('availableSlots', () => {
  it('returns chronological, fixed-duration slots including one ending at the window end', () => {
    expect(availableSlots({ window, slotMinutes: 30 })).toEqual([first, second, third]);
  });

  it('keeps a slot touching adjacent bookings on both boundaries', () => {
    expect(availableSlots({ window, slotMinutes: 30, booked: [third, first] })).toEqual([second]);
  });

  it('removes exactly the slot overlapped by a booking', () => {
    expect(
      availableSlots({
        window,
        slotMinutes: 30,
        booked: [{ start: '2026-11-01T09:40:00Z', end: '2026-11-01T09:50:00Z' }],
      }),
    ).toEqual([first, third]);
  });

  it('excludes every slot covered by a booking spanning the window', () => {
    expect(
      availableSlots({
        window,
        slotMinutes: 30,
        booked: [{ start: '2026-11-01T08:00:00Z', end: '2026-11-01T11:00:00Z' }],
      }),
    ).toEqual([]);
  });

  it('returns no slots when the window is too short', () => {
    expect(availableSlots({ window: first, slotMinutes: 31 })).toEqual([]);
  });

  it('omits a partial final slot and normalizes explicit offsets to UTC', () => {
    expect(
      availableSlots({
        window: { start: '2026-11-01T04:00:00-05:00', end: '2026-11-01T05:20:00-05:00' },
        slotMinutes: 30,
        booked: [],
      }),
    ).toEqual([first, second]);
  });

  it('produces identical results without mutating the input', () => {
    const request: SlotRequest = { window, slotMinutes: 30, booked: [third, first] };
    const original = structuredClone(request);
    expect(availableSlots(request)).toEqual(availableSlots(request));
    expect(request).toEqual(original);
  });

  it.each([0, -1, 0.5, NaN, Infinity, -Infinity])('rejects invalid duration %s', (slotMinutes) => {
    expect(() => availableSlots({ window, slotMinutes })).toThrow(
      'slotMinutes must be a positive integer',
    );
  });

  it('returns no slots for an extremely large positive integer duration', () => {
    expect(availableSlots({ window, slotMinutes: Number.MAX_VALUE })).toEqual([]);
  });

  it.each([
    { start: 'invalid', end: window.end },
    { start: window.start, end: 'invalid' },
  ])('rejects unparseable window dates %j', (invalidWindow) => {
    expect(() => availableSlots({ window: invalidWindow, slotMinutes: 30 })).toThrow(
      'Window must contain parseable date strings',
    );
  });

  it.each([
    { start: window.start, end: window.start },
    { start: window.end, end: window.start },
  ])('rejects non-positive window intervals %j', (invalidWindow) => {
    expect(() => availableSlots({ window: invalidWindow, slotMinutes: 30 })).toThrow(
      'Window end must be strictly after start',
    );
  });

  it.each([
    { start: 'invalid', end: window.end },
    { start: window.start, end: 'invalid' },
  ])('rejects unparseable booked dates even when no slot fits %j', (booking) => {
    expect(() => availableSlots({ window, slotMinutes: 120, booked: [booking] })).toThrow(
      'Booked interval must contain parseable date strings',
    );
  });

  it.each([
    { start: window.start, end: window.start },
    { start: window.end, end: window.start },
  ])('rejects non-positive booked intervals %j', (booking) => {
    expect(() => availableSlots({ window, slotMinutes: 30, booked: [booking] })).toThrow(
      'Booked interval end must be strictly after start',
    );
  });
});
