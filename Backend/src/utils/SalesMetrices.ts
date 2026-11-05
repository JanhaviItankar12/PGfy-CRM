import {CallOutcome} from "../generated/prisma/client";

/**
 * Call outcomes that count as "connected", meaning we actually spoke to the customer.
 * Used by BOTH the dashboard and the reports, so the two always agree.
 *
 * NOT connected: BUSY, NOT_ANSWERED, SWITCHED_OFF.
 *
 * CALL_BACK_REQUESTED is counted as connected because the customer picked up and
 * asked to be called later. Remove it from this list if you want a stricter rule.
 */
export const CONNECTED_OUTCOMES: CallOutcome[] = [
  "CONNECTED",
  "INTERESTED",
  "NOT_INTERESTED",
  "CALL_BACK_REQUESTED",
  "VISIT_SCHEDULED",
  "CONVERTED",
];

/**
 * part / whole x 100, rounded to 1 decimal place (66.666 becomes 66.7).
 * If whole is 0 it returns 0 instead of dividing by zero.
 */
export const percentage = (part: number, whole: number): number =>
  whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;