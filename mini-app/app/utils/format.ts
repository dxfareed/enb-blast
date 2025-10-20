export function formatPoints(points: number | bigint): string {
  const num = Number(points);
  if (isNaN(num)) {
    return '0';
  }
  if (num < 1000) {
    return num.toLocaleString();
  }
  if (num < 1000000) {
    const value = (num / 1000).toFixed(1);
    return `${parseFloat(value).toLocaleString()}k`;
  }
  if (num < 1000000000) {
    const value = (num / 1000000).toFixed(1);
    return `${parseFloat(value).toLocaleString()}M`;
  }
  const value = (num / 1000000000).toFixed(1);
  return `${parseFloat(value).toLocaleString()}B`;
}
