export type Shift = {
  id: string;
  site_id: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
  status: "scheduled" | "in_progress" | "completed";
  sites: { name: string; address: string } | null;
};

export type Checkpoint = {
  id: string;
  route_id: string;
  sequence_number: number;
  name: string;
  qr_code: string;
};

export type CheckpointScan = {
  id: string;
  checkpoint_id: string;
  sequence_number: number;
  photo_storage_path: string | null;
};

export type Patrol = {
  id: string;
  shift_id: string;
  route_id: string;
  status: "in_progress" | "complete" | "incomplete";
};
