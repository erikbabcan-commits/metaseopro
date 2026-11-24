export type Slot = "a" | "b";

export type SlotPut<T> =
  { complete: true; a: T; b: T } | { complete: false; slots: Partial<Record<Slot, T>> };

/**
 * Holds the period A / B uploads outside React state, so two files that finish
 * parsing at nearly the same time both land (no stale closure over `slots`).
 * When both are present `put` hands them back and empties itself, so no copy
 * of the parsed data stays around after the join.
 */
export function createSlotStore<T>() {
  let state: Partial<Record<Slot, T>> = {};
  return {
    get: (): Partial<Record<Slot, T>> => state,
    put(slot: Slot, value: T): SlotPut<T> {
      state = { ...state, [slot]: value };
      const { a, b } = state;
      if (a !== undefined && b !== undefined) {
        state = {};
        return { complete: true, a, b };
      }
      return { complete: false, slots: state };
    },
    clear(): void {
      state = {};
    },
  };
}
