export function buildArcExplorerUrl(explorerBaseUrl: string | undefined, txHash: string | undefined): string | undefined {
  if (!explorerBaseUrl || !txHash) return undefined;
  return `${explorerBaseUrl.replace(/\/$/, "")}/tx/${txHash}`;
}
