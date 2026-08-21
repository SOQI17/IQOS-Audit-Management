export interface AuditItemConfig {
  id: string;
  text: string;
  defaultPenalty: number;
}

export interface AuditSectionConfig {
  id: string;
  title: string;
  items: AuditItemConfig[];
}

export interface AuditItemState {
  id: string;
  isCompliant: boolean | null;
  observation: string;
  photoBase64: string | null;
  photoUrl?: string | null;
  penalty: number;
}

export interface AuditState {
  hotelName: string;
  roomNumber: string;
  auditorName: string;
  roomAttendant: string;
  supervisor: string;
  date: string;
  maxScore: number;
  itemStates: Record<string, AuditItemState>;
}

export interface SavedAudit extends AuditState {
  id: string;
  finalScore: number;
  timestamp: number;
}

export interface AppState {
  view: 'dashboard' | 'rooms' | 'setup' | 'audit' | 'config' | 'report';
  audit: AuditState;
  config: AuditSectionConfig[];
  savedAudits: SavedAudit[];
  user: any | null;
}
