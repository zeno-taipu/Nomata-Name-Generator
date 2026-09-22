/** Resolve only after the browser confirms the write; unsupported is a real failure. */
export async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    throw new Error('Clipboard is unavailable in this environment. Select and copy the text manually.');
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    throw new Error('Could not copy to the clipboard. Check clipboard permissions or copy the text manually.');
  }
}
