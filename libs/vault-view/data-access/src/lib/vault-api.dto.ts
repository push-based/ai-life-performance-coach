export interface ApiErrorDto {
  error: string;
}

export interface VaultNoteBodyDto {
  note: string;
  title: string;
  text: string;
}

export interface VaultMetaDto {
  vaultName: string;
  generatedAt?: string;
}
