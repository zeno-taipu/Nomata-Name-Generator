import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSafeStorage } from '../src/store/safeStorage';
import { usePersistenceStatus } from '../src/store/persistenceStatus';

function storageFixture(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  usePersistenceStatus.setState({ error: null });
});

describe('Durable storage failure reporting', () => {
  it('keeps unsaved writes authoritative and clears the warning after recovery', () => {
    const disk = storageFixture();
    disk.setItem('project', 'old');
    const report = vi.fn();
    const storage = createSafeStorage(() => disk, report);
    const write = vi.spyOn(disk, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    storage.setItem('project', 'new');
    expect(report).toHaveBeenLastCalledWith(expect.stringContaining('not saved'));
    expect(storage.getItem('project')).toBe('new');
    expect(disk.getItem('project')).toBe('old');

    write.mockRestore();
    storage.setItem('project', 'new');
    expect(disk.getItem('project')).toBe('new');
    expect(report).toHaveBeenLastCalledWith(null);
  });

  it('catches a restricted localStorage getter without losing in-session edits', () => {
    vi.stubGlobal('window', {
      get localStorage() { throw new Error('Access denied'); },
    });
    const storage = createSafeStorage();
    expect(storage.getItem('project')).toBeNull();
    expect(usePersistenceStatus.getState().error).toContain('Access denied');
    expect(() => storage.setItem('project', 'latest')).not.toThrow();
    expect(storage.getItem('project')).toBe('latest');
  });

  it('does not resurrect deleted data when a removal fails', () => {
    const disk = storageFixture();
    disk.setItem('project', 'old');
    vi.spyOn(disk, 'removeItem').mockImplementation(() => { throw new Error('Denied'); });
    const report = vi.fn();
    const storage = createSafeStorage(() => disk, report);

    storage.removeItem('project');
    expect(storage.getItem('project')).toBeNull();
    expect(report).toHaveBeenCalledWith(expect.stringContaining('Denied'));
  });

  it('retains warnings until all failed keys have been saved', () => {
    const disk = storageFixture();
    const write = vi.spyOn(disk, 'setItem').mockImplementation(() => { throw new Error('Full'); });
    const report = vi.fn();
    const storage = createSafeStorage(() => disk, report);
    storage.setItem('a', '1');
    storage.setItem('b', '2');
    write.mockRestore();
    report.mockClear();
    storage.setItem('a', '1');
    expect(report).not.toHaveBeenCalledWith(null);
    storage.setItem('b', '2');
    expect(report).toHaveBeenLastCalledWith(null);
  });

  it('supports SSR memory storage without a false disk-failure warning', () => {
    const report = vi.fn();
    const storage = createSafeStorage(() => undefined, report);
    storage.setItem('project', 'value');
    expect(storage.getItem('project')).toBe('value');
    storage.removeItem('project');
    expect(storage.getItem('project')).toBeNull();
    expect(report).not.toHaveBeenCalled();
  });

});
