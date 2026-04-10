// lib/utils/calculations.ts

export interface DependencyFields {
  // Internal
  cat6Cable:              number;
  threeCorepower:         number;
  gponIssues:             number;
  ofcIssues:              number;
  cameraStoreReplacement: number;
  camerasFluctuating:     number;
  needToCheck:            number;
  fiberRequired:          number;
  hydraLadder:            number;
  mcbIssue:               number;
  switch8portIssue:       number;
  // External
  roadExtensionConstruction: number;
  noOlt:                  number;
  popDown:                number;
  jbAccident:             number;
  renovation:             number;
  powerDisconnection:     number;
  dgpOffice:              number;
  needPeerIp:             number;
}

export function calcInternalSum(f: DependencyFields): number {
  return (
    f.cat6Cable + f.threeCorepower + f.gponIssues + f.ofcIssues +
    f.cameraStoreReplacement + f.camerasFluctuating + f.needToCheck +
    f.fiberRequired + f.hydraLadder + f.mcbIssue + f.switch8portIssue
  );
}

export function calcExternalSum(f: DependencyFields): number {
  return (
    f.roadExtensionConstruction + f.noOlt + f.popDown + f.jbAccident +
    f.renovation + f.powerDisconnection + f.dgpOffice + f.needPeerIp
  );
}

export function calcDependencySum(f: DependencyFields): number {
  return calcInternalSum(f) + calcExternalSum(f);
}

export function pct(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 10000) / 100;
}

export function offlineStatusColor(offlinePct: number): string {
  if (offlinePct < 10)  return 'text-green-700 bg-green-50';
  if (offlinePct < 15)  return 'text-yellow-700 bg-yellow-50';
  if (offlinePct < 20)  return 'text-orange-700 bg-orange-50';
  return 'text-red-700 bg-red-50';
}
