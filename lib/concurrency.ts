// Sınırlı eşzamanlılıkla bir liste üzerinde async işlem çalıştırır; sonuçları sırayla döndürür.
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(Math.max(1, limit), items.length || 1) }, worker),
  );
  return results;
}
