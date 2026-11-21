export type StoreEntryKind = 'file' | 'dir' | 'other';

export interface StoreEntry {
  name: string;
  kind: StoreEntryKind;
}

export interface WriteOptions {
  create?: boolean;
}

export interface NoteStore {
  readonly root: string;
  readonly separator: string;
  list(dir: string): Promise<StoreEntry[]>;
  exists(path: string): Promise<boolean>;
  isDir(path: string): Promise<boolean>;
  readText(path: string): Promise<string>;
  readBytes(path: string): Promise<Uint8Array>;
  writeText(path: string, text: string, opts?: WriteOptions): Promise<void>;
  writeBytes(
    path: string,
    bytes: Uint8Array,
    opts?: WriteOptions,
  ): Promise<void>;
  replaceText(path: string, text: string): Promise<void>;
  makeDir(path: string): Promise<void>;
  moveFile(from: string, to: string): Promise<void>;
  moveDir(from: string, to: string): Promise<void>;
  copyFile(from: string, to: string): Promise<void>;
  removeEmptyDirs(path: string): Promise<void>;
}
