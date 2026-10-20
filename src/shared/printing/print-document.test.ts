import { printDocument } from './print-document';

describe('printDocument', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    delete document.body.dataset.printTest;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('marks the document and cleans it after printing', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const onAfterPrint = vi.fn();
    printDocument({ datasetKey: 'printTest', onAfterPrint });

    expect(document.body.dataset.printTest).toBe('true');
    expect(printSpy).toHaveBeenCalledOnce();

    window.dispatchEvent(new Event('afterprint'));

    expect(document.body.dataset.printTest).toBeUndefined();
    expect(onAfterPrint).toHaveBeenCalledOnce();
  });

  it('supports delayed printing and cancellation', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const cancel = printDocument({
      datasetKey: 'printTest',
      datasetValue: '42',
      delayMs: 50,
    });

    expect(document.body.dataset.printTest).toBe('42');
    cancel();
    vi.advanceTimersByTime(50);

    expect(printSpy).not.toHaveBeenCalled();
    expect(document.body.dataset.printTest).toBeUndefined();
  });
});
