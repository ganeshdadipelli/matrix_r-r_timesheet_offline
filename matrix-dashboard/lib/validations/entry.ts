// lib/validations/entry.ts
import { z } from 'zod';

const nonNegInt = z.number().int().min(0);

export const createEntrySchema = z.object({
  districtId: z.string().uuid(),
  date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),

  totalCount:  nonNegInt,
  onlineCount: nonNegInt,
  offlineCount:nonNegInt,

  // Internal
  cat6Cable:              nonNegInt.default(0),
  threeCorepower:         nonNegInt.default(0),
  gponIssues:             nonNegInt.default(0),
  ofcIssues:              nonNegInt.default(0),
  cameraStoreReplacement: nonNegInt.default(0),
  camerasFluctuating:     nonNegInt.default(0),
  needToCheck:            nonNegInt.default(0),
  fiberRequired:          nonNegInt.default(0),
  hydraLadder:            nonNegInt.default(0),
  mcbIssue:               nonNegInt.default(0),
  switch8portIssue:       nonNegInt.default(0),

  // External
  roadExtensionConstruction: nonNegInt.default(0),
  noOlt:             nonNegInt.default(0),
  popDown:           nonNegInt.default(0),
  jbAccident:        nonNegInt.default(0),
  renovation:        nonNegInt.default(0),
  powerDisconnection:nonNegInt.default(0),
  dgpOffice:         nonNegInt.default(0),
  needPeerIp:        nonNegInt.default(0),
})
.refine(
  d => d.onlineCount + d.offlineCount === d.totalCount,
  { message: 'Online + Offline must equal Total Count' }
)
.refine(
  d => {
    const internal =
      d.cat6Cable + d.threeCorepower + d.gponIssues + d.ofcIssues +
      d.cameraStoreReplacement + d.camerasFluctuating + d.needToCheck +
      d.fiberRequired + d.hydraLadder + d.mcbIssue + d.switch8portIssue;
    const external =
      d.roadExtensionConstruction + d.noOlt + d.popDown + d.jbAccident +
      d.renovation + d.powerDisconnection + d.dgpOffice + d.needPeerIp;
    return internal + external === d.offlineCount;
  },
  { message: 'Sum of all dependency counts must equal Offline Count' }
);

// Build updateEntrySchema from the raw object shape (before .refine()) so .partial() works.
const baseEntryObject = z.object({
  districtId: z.string().uuid().optional(),
  date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  totalCount:  nonNegInt.optional(),
  onlineCount: nonNegInt.optional(),
  offlineCount:nonNegInt.optional(),
  cat6Cable:              nonNegInt.default(0),
  threeCorepower:         nonNegInt.default(0),
  gponIssues:             nonNegInt.default(0),
  ofcIssues:              nonNegInt.default(0),
  cameraStoreReplacement: nonNegInt.default(0),
  camerasFluctuating:     nonNegInt.default(0),
  needToCheck:            nonNegInt.default(0),
  fiberRequired:          nonNegInt.default(0),
  hydraLadder:            nonNegInt.default(0),
  mcbIssue:               nonNegInt.default(0),
  switch8portIssue:       nonNegInt.default(0),
  roadExtensionConstruction: nonNegInt.default(0),
  noOlt:             nonNegInt.default(0),
  popDown:           nonNegInt.default(0),
  jbAccident:        nonNegInt.default(0),
  renovation:        nonNegInt.default(0),
  powerDisconnection:nonNegInt.default(0),
  dgpOffice:         nonNegInt.default(0),
  needPeerIp:        nonNegInt.default(0),
});
export const updateEntrySchema = baseEntryObject.omit({ districtId: true, date: true });
