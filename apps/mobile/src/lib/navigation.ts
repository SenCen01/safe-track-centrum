export type ShiftsStackParamList = {
  ShiftsList: undefined;
  ShiftDetail: { shiftId: string };
  Patrol: { shiftId: string; patrolId: string };
  IncidentReport: { shiftId: string; patrolId: string | null };
};
