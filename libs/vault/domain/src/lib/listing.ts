export interface VaultListing {
  dirsIn(dir: string): string[];
  mdIn(dir: string): string[];
}
