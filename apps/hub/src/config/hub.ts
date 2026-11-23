export function parseHubPort(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65_535)
    throw new Error('HUB_PORT must be an integer from 1 to 65535');
  return Number(value);
}
