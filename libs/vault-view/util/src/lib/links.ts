export function obsidianUri(vaultName: string, file: string): string {
  return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(file)}`;
}

export function graphNoteHref(file: string): string {
  return `/#open=${encodeURIComponent(file)}`;
}

export function stripWikilinks(text: string): string {
  return text.replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2');
}

export function goalDisplayText(text: string): string {
  return (
    text
      .replace(/\[\[[^\]]*\]\]:?/g, '')
      .replace(/\s+/g, ' ')
      .trim() || stripWikilinks(text)
  );
}

export function pluralize(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
