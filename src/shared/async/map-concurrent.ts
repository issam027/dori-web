/** Preserve input order and stop starting work after cancellation. */
export async function mapConcurrent<T, R>(
  items: readonly T[],
  concurrency: number,
  work: (item: T, index: number) => Promise<R>,
  signal?: AbortSignal,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1)
    throw new RangeError('Invalid concurrency');
  const result = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (cursor < items.length) {
        signal?.throwIfAborted();
        const index = cursor++;
        result[index] = await work(items[index] as T, index);
      }
    }),
  );
  return result;
}
