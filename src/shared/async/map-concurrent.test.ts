import { mapConcurrent } from './map-concurrent';

it('downloads all pages with at most four requests and preserves order', async () => {
  let active = 0;
  let peak = 0;
  const pages = Array.from({ length: 23 }, (_, i) => i);
  const result = await mapConcurrent(pages, 4, async (page) => {
    active++;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, page % 3));
    active--;
    return page;
  });
  expect(result).toEqual(pages);
  expect(peak).toBe(4);
});

it('does not start another page after cancellation', async () => {
  const controller = new AbortController();
  const visited: number[] = [];
  await expect(
    mapConcurrent(
      [1, 2, 3],
      1,
      (page) => {
        visited.push(page);
        controller.abort();
        return Promise.resolve(page);
      },
      controller.signal,
    ),
  ).rejects.toThrow();
  expect(visited).toEqual([1]);
});
