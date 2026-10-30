import type { Address } from 'viem';
import { type AirnodeV2Request, deriveRequestHash, fetchSignedResponse } from './airnode-v2.ts';

export const AERODATABOX_AIRNODE_V2_URL = 'https://airnode-aerodatabox.fly.dev/';

// The address that the AeroDataBox Airnode v2 signs with, from the x-airnode extension of the document at its URL.
export const AERODATABOX_AIRNODE_V2_ADDRESS: Address = '0x83FE2E8F24E66520B1902C3507De4F471248f2Ec';

// AeroDataBox answers with a list, since one flight number can be flown by more than one aircraft on a date. The
// projection takes the first leg and cuts it down to the three fields that FlightDelayCover reads. Both times are UTC,
// written like "2026-10-29 17:24Z".
const ARRIVAL_PROJECTION = {
  status: '/0/status',
  scheduledArrival: '/0/arrival/scheduledTime/utc',
  actualArrival: '/0/arrival/revisedTime/utc',
};

// `dateLocal` is the departure date, local to the departure airport, such as "2026-10-29".
export const buildFlightRequest = (flightNumber: string, dateLocal: string, projected = true): AirnodeV2Request => ({
  operation: 'flightStatusOnDate',
  parameters: { searchBy: 'number', searchParam: flightNumber, dateLocal, dateLocalRole: 'Departure' },
  ...(projected ? { responseProjection: ARRIVAL_PROJECTION } : {}),
});

export const deriveFlightRequestHash = (flightNumber: string, dateLocal: string) =>
  deriveRequestHash(buildFlightRequest(flightNumber, dateLocal));

export const fetchSignedFlightStatus = (
  flightNumber: string,
  dateLocal: string,
  fetchFunction: typeof fetch,
  projected = true
) => fetchSignedResponse(AERODATABOX_AIRNODE_V2_URL, buildFlightRequest(flightNumber, dateLocal, projected), fetchFunction);
