export interface DatabaseState {
  info: DatabaseInfo | null;
  listSupported: boolean;
}

export interface DatabaseInfo {
  namespaces: string[];
  backups: string[];
}
