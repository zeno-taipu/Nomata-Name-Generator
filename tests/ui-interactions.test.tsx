// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntityNodeCard } from '../src/components/studio/EntityNodeCard';
import { PinnedItemCard } from '../src/components/shelf/PinnedItemCard';
import { ExportModal } from '../src/components/shelf/ExportModal';
import { SettingsModal } from '../src/components/settings/SettingsModal';
import { CustomVocabularyModal } from '../src/components/sidebar/CustomVocabularyModal';
import { BatchGridView } from '../src/components/studio/BatchGridView';
import { DataImportTab } from '../src/components/settings/DataImportTab';
import { Dialog } from '../src/components/Dialog';
import { GeneratorDrawer } from '../src/components/sidebar/GeneratorDrawer';
import { CategoryNav } from '../src/components/sidebar/CategoryNav';
import { LineageTreeView } from '../src/components/studio/LineageTreeView';
import { getCategorySubtypes } from '../src/config/entitySubtypes';
import { useNominaStore } from '../src/store/useNominaStore';
import { usePersistenceStatus } from '../src/store/persistenceStatus';
import { App } from '../src/App';
import type { LoreEntity } from '../src/types/domain';

const nativeBoundary = vi.hoisted(() => ({
  save: vi.fn(),
  open: vi.fn(),
  writeTextFile: vi.fn(),
  readTextFile: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: nativeBoundary.save,
  open: nativeBoundary.open,
}));
vi.mock('@tauri-apps/plugin-fs', () => ({
  writeTextFile: nativeBoundary.writeTextFile,
  readTextFile: nativeBoundary.readTextFile,
}));

const entity: LoreEntity = {
  id: 'interaction-entity',
  name: 'Radomir',
  originalName: 'Radomir',
  originalRoot: 'Rad',
  category: 'character',
  cultureId: 'danubian_slavic',
  subtype: 'Noble',
  children: [],
  pinned: true,
};
const initialState = useNominaStore.getState();
const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

beforeEach(() => {
  for (const mock of Object.values(nativeBoundary)) mock.mockReset();
  useNominaStore.setState({ ...initialState, pinnedEntities: [entity], generatedBatch: [entity] });
  usePersistenceStatus.setState({ error: null });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, '__TAURI_INTERNALS__');
  if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
  else Reflect.deleteProperty(navigator, 'clipboard');
  useNominaStore.setState(initialState);
  usePersistenceStatus.setState({ error: null });
});

function mockClipboard(writeText?: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
}

describe('real clipboard feedback', () => {
  const surfaces = [
    { name: 'entity card', render: () => <EntityNodeCard entity={entity} />, button: 'copy-button' },
    { name: 'pinned card', render: () => <PinnedItemCard entity={entity} />, button: 'pinned-copy-btn' },
    { name: 'export', render: () => <ExportModal isOpen onClose={() => {}} />, button: 'export-copy-btn' },
  ];
  for (const surface of surfaces) {
    it(`${surface.name} announces success only once the write resolves`, async () => {
      const user = userEvent.setup();
      let finish!: () => void;
      const write = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
      mockClipboard(write);
      render(surface.render());
      await user.click(screen.getByTestId(surface.button));
      expect(write).toHaveBeenCalledOnce();
      expect(write.mock.calls[0]).toEqual([expect.stringContaining('Radomir')]);
      expect(screen.queryByRole('status')).toBeNull();
      finish();
      expect((await screen.findByRole('status')).textContent).toContain('Copied to clipboard');
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it.each(['rejected', 'unavailable'])(`${surface.name} reports %s clipboard without copied feedback`, async (kind) => {
      const user = userEvent.setup();
      mockClipboard(kind === 'rejected' ? vi.fn().mockRejectedValue(new Error('permission denied')) : undefined);
      render(surface.render());
      await user.click(screen.getByTestId(surface.button));
      expect((await screen.findByRole('alert')).textContent).toMatch(/clipboard/i);
      expect(screen.queryByRole('status')).toBeNull();
      expect(screen.getByTestId(surface.button).textContent).not.toContain('Copied');
    });

    it(`${surface.name} clears stale success on a subsequent failed write`, async () => {
      const user = userEvent.setup();
      const write = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('denied'));
      mockClipboard(write);
      render(surface.render());
      await user.click(screen.getByTestId(surface.button));
      await screen.findByRole('status');
      await user.click(screen.getByTestId(surface.button));
      await screen.findByRole('alert');
      expect(screen.queryByRole('status')).toBeNull();
    });
  }
});

describe('card keyboard controls', () => {
  it.each(['{Enter}', ' '])('selects a focused card with %s', async (key) => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<EntityNodeCard entity={entity} onSelect={onSelect} />);
    screen.getByTestId(`entity-card-${entity.id}`).focus();
    await user.keyboard(key);
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(entity);
  });

  it.each(['{Enter}', ' '])('allows nested button default activation with %s, without selecting the card', async (key) => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const write = vi.fn().mockResolvedValue(undefined);
    mockClipboard(write);
    render(<EntityNodeCard entity={entity} onSelect={onSelect} />);
    screen.getByTestId('copy-button').focus();
    await user.keyboard(key);
    expect(write).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledWith(entity.name);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('accessible modal lifecycle', () => {
  const modals = [
    { name: 'Settings', component: SettingsModal, closeName: 'Close settings modal' },
    { name: 'Export', component: ExportModal, closeName: 'Close export dialog' },
    { name: 'Vocabulary', component: CustomVocabularyModal, closeName: 'Close modal' },
  ];
  for (const modal of modals) {
    it(`${modal.name} initializes/traps/restores focus, blocks background clicks, and closes with Escape`, async () => {
      const user = userEvent.setup();
      const backgroundClick = vi.fn();
      const Modal = modal.component;
      function Harness() {
        const [open, setOpen] = useState(false);
        return <>
          <button onClick={() => setOpen(true)}>Open modal</button>
          <button onClick={backgroundClick}>Background action</button>
          <Modal isOpen={open} onClose={() => setOpen(false)} />
        </>;
      }
      render(<Harness />);
      const trigger = screen.getByRole('button', { name: 'Open modal' });
      const background = screen.getByRole('button', { name: 'Background action' });
      await user.click(trigger);
      const dialog = screen.getByRole('dialog');
      const close = within(dialog).getByRole('button', { name: modal.closeName });
      expect(document.activeElement).toBe(close);
      expect(background.closest('[inert]')).not.toBeNull();
      fireEvent.click(background);
      expect(backgroundClick).not.toHaveBeenCalled();
      background.focus();
      expect(document.activeElement).toBe(close);
      await user.tab({ shift: true });
      const last = document.activeElement;
      expect(last).not.toBe(close);
      expect(dialog.contains(last)).toBe(true);
      await user.tab();
      expect(document.activeElement).toBe(close);
      await user.tab();
      expect(document.activeElement).not.toBe(close);
      expect(dialog.contains(document.activeElement)).toBe(true);
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(trigger);
      expect(background.closest('[inert]')).toBeNull();
      await user.click(background);
      expect(backgroundClick).toHaveBeenCalledOnce();
    });

    it(`${modal.name} preserves backdrop dismissal and ignores content clicks`, async () => {
      const user = userEvent.setup();
      const close = vi.fn();
      const Modal = modal.component;
      render(<Modal isOpen onClose={close} />);
      const dialog = screen.getByRole('dialog');
      const heading = within(dialog).getAllByRole('heading')[0];
      await user.click(heading);
      expect(close).not.toHaveBeenCalled();
      await user.click(dialog);
      expect(close).toHaveBeenCalledOnce();
    });
  }

  it('focuses a dialog without controls and retains focus for both tab directions', async () => {
    const user = userEvent.setup();
    render(<Dialog onClose={() => {}} aria-label="Empty dialog"><p>Read only</p></Dialog>);
    const dialog = screen.getByRole('dialog');
    expect(document.activeElement).toBe(dialog);
    await user.tab();
    expect(document.activeElement).toBe(dialog);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(dialog);
  });

  it('blocks generation shortcuts while modal controls have focus', async () => {
    const user = userEvent.setup();
    const generate = vi.fn();
    useNominaStore.setState({ generateBatch: generate });
    render(<><GeneratorDrawer /><SettingsModal isOpen onClose={() => {}} /></>);
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(generate).not.toHaveBeenCalled();
  });

  it('anglicization options use the same keyboard lifecycle and outside dismissal', async () => {
    const user = userEvent.setup();
    render(<BatchGridView />);
    const trigger = screen.getByRole('button', { name: 'Anglicization Options' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Anglicization Options' });
    const close = within(dialog).getByRole('button', { name: 'Close Anglicization options' });
    expect(document.activeElement).toBe(close);
    await user.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.tab();
    expect(document.activeElement).toBe(close);
    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(trigger);
    await user.click(trigger);
    fireEvent.click(document.body);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

describe('honest staging preview', () => {
  it('labels sample and dropped filenames as preview only, without changing generation state', async () => {
    const user = userEvent.setup();
    const before = useNominaStore.getState();
    render(<DataImportTab />);
    expect(screen.getByText(/Corpus ingestion is not implemented/)).toBeTruthy();
    expect(screen.queryByText(/Pipeline Ready|click to browse/i)).toBeNull();
    await user.click(screen.getByRole('button', { name: /Preview Sample JSON Filename/ }));
    expect(screen.getByRole('status').textContent).toContain('not read, parsed, saved, or used');
    const file = new File(['not parsed'], 'corpus.csv', { type: 'text/csv' });
    const read = vi.spyOn(File.prototype, 'slice');
    fireEvent.drop(screen.getByTestId('seed-dropzone'), { dataTransfer: { files: [file] } });
    expect(screen.getByTestId('staged-file-indicator').textContent).toContain('corpus.csv (not imported)');
    await user.selectOptions(screen.getByLabelText('Preview Target Domain Category'), 'settlement');
    expect(read).not.toHaveBeenCalled();
    expect(useNominaStore.getState()).toBe(before);
  });
});

describe('shared subtype options', () => {
  it.each([
    ['character', 'people', ['auto', 'Noble', 'Warrior', 'Scholar', 'Wanderer', 'Artisan']],
    ['settlement', 'settlements', ['auto', 'Metropolis', 'Fortress', 'Town', 'Haven', 'Village']],
    ['geography', 'geography', ['auto', 'Mountain Range', 'River Basin', 'Primeval Woods']],
    ['faction', 'factions', ['auto', 'Order', 'Legion', 'Covenant', 'Guild', 'Syndicate']],
    ['artifact', 'artifacts', ['auto', 'Relic', 'Blade', 'Crown', 'Tome', 'Scepter']],
  ] as const)('preserves %s options and its %s alias', (category, alias, options) => {
    expect(getCategorySubtypes(category)).toEqual(options);
    expect(getCategorySubtypes(alias)).toBe(getCategorySubtypes(category));
  });

  it('switches category through navigation and resets the DOM subtype selection to auto', async () => {
    const user = userEvent.setup();
    useNominaStore.setState({ activeCategory: 'character', targetSubtype: 'auto' });
    render(<><CategoryNav /><BatchGridView /></>);
    const select = screen.getByTestId('target-subtype-select') as HTMLSelectElement;
    await user.selectOptions(select, 'Warrior');
    expect(useNominaStore.getState().targetSubtype).toBe('Warrior');
    await user.click(screen.getByRole('tab', { name: 'Settlements' }));
    expect(useNominaStore.getState().activeCategory).toBe('settlement');
    expect(useNominaStore.getState().targetSubtype).toBe('auto');
    expect(select.value).toBe('auto');
    expect(Array.from(select.options, (option) => option.value)).toEqual(getCategorySubtypes('settlement'));
    expect(within(select).queryByRole('option', { name: 'Warrior' })).toBeNull();
    await user.selectOptions(select, 'Fortress');
    expect(useNominaStore.getState().targetSubtype).toBe('Fortress');
    await user.click(screen.getByRole('tab', { name: 'Geography' }));
    expect(select.value).toBe('auto');
    expect(Array.from(select.options, (option) => option.value)).toEqual(getCategorySubtypes('geography'));
  });
});

it('uses canonical pin IDs for stale card props and keeps same-name entities distinct', async () => {
  const user = userEvent.setup();
  const first = { ...entity, id: 'same-name-first', pinned: false, meaning: 'Current canonical detail' };
  const second = { ...entity, id: 'same-name-second', pinned: true };
  useNominaStore.setState({ generatedBatch: [first, second], pinnedEntities: [second] });
  render(<>
    <EntityNodeCard entity={{ ...first, pinned: true, meaning: 'Stale detail' }} />
    <EntityNodeCard entity={{ ...second, pinned: false }} />
  </>);
  const firstCard = screen.getByTestId(`entity-card-${first.id}`);
  const secondCard = screen.getByTestId(`entity-card-${second.id}`);
  expect(within(firstCard).getByRole('button', { name: 'Pin to World Bible' })).toBeTruthy();
  expect(within(secondCard).getByRole('button', { name: 'Unpin from World Bible' })).toBeTruthy();
  await user.click(within(firstCard).getByRole('button', { name: 'Pin to World Bible' }));
  expect(within(firstCard).getByRole('button', { name: 'Unpin from World Bible' })).toBeTruthy();
  expect(useNominaStore.getState().pinnedEntities.find((item) => item.id === first.id)?.meaning)
    .toBe('Current canonical detail');
  await user.click(within(secondCard).getByRole('button', { name: 'Unpin from World Bible' }));
  expect(useNominaStore.getState().pinnedEntities.map((item) => item.id)).toEqual([first.id]);
  expect(within(firstCard).getByRole('button', { name: 'Unpin from World Bible' })).toBeTruthy();
  expect(within(secondCard).getByRole('button', { name: 'Pin to World Bible' })).toBeTruthy();
});

it('keeps parent and nested child pin controls synchronized across tree and collection snapshots', async () => {
  const user = userEvent.setup();
  const child: LoreEntity = { ...entity, id: 'nested-child', name: 'Child', parentId: entity.id, pinned: false };
  const parent: LoreEntity = { ...entity, pinned: false, children: [child] };
  useNominaStore.setState({ generatedBatch: [parent], pinnedEntities: [], activeEntityId: null });
  render(<LineageTreeView />);
  const parentCard = screen.getByTestId(`entity-card-${parent.id}`);
  const childCard = screen.getByTestId(`entity-card-${child.id}`);
  // Keyboard activation must pin the child, not select its enclosing card.
  within(childCard).getByRole('button', { name: 'Pin to World Bible' }).focus();
  await user.keyboard(' ');
  expect(useNominaStore.getState().activeEntityId).toBeNull();
  expect(useNominaStore.getState().pinnedEntities.map((item) => item.id)).toEqual([child.id]);
  expect(within(childCard).getByRole('button', { name: 'Unpin from World Bible' })).toBeTruthy();
  await user.click(within(parentCard).getByRole('button', { name: 'Pin to World Bible' }));
  let state = useNominaStore.getState();
  expect(state.pinnedEntities.find((item) => item.id === parent.id)?.children?.[0]?.pinned).toBe(true);
  expect(state.generatedBatch[0].pinned).toBe(true);
  expect(state.generatedBatch[0].children?.[0]?.pinned).toBe(true);
  await user.click(within(childCard).getByRole('button', { name: 'Unpin from World Bible' }));
  state = useNominaStore.getState();
  expect(state.pinnedEntities.map((item) => item.id)).toEqual([parent.id]);
  expect(state.pinnedEntities[0].children?.[0]?.pinned).toBe(false);
  expect(state.generatedBatch[0].children?.[0]?.pinned).toBe(false);
  expect(within(childCard).getByRole('button', { name: 'Pin to World Bible' })).toBeTruthy();
  expect(within(parentCard).getByRole('button', { name: 'Unpin from World Bible' })).toBeTruthy();
  await user.click(within(parentCard).getByRole('button', { name: 'Unpin from World Bible' }));
  expect(useNominaStore.getState().pinnedEntities).toEqual([]);
  expect(useNominaStore.getState().generatedBatch[0].pinned).toBe(false);
});

describe('native export/import boundary smoke', () => {
  beforeEach(() => {
    Object.defineProperty(window, '__TAURI_INTERNALS__', { configurable: true, value: {} });
  });

  it('saves a project using the native dialog path and filesystem payload', async () => {
    const user = userEvent.setup();
    nativeBoundary.save.mockResolvedValue('C:\\world.nomata.json');
    nativeBoundary.writeTextFile.mockResolvedValue(undefined);
    render(<ExportModal isOpen initialFormat="nomina" onClose={() => {}} />);
    await user.click(screen.getByTestId('export-save-btn'));
    await screen.findByText('Successfully saved to C:\\world.nomata.json');
    expect(nativeBoundary.save).toHaveBeenCalledWith(expect.objectContaining({
      defaultPath: expect.stringMatching(/\.nomata\.json$/),
    }));
    expect(nativeBoundary.writeTextFile).toHaveBeenCalledOnce();
    const [path, payload] = nativeBoundary.writeTextFile.mock.calls[0];
    expect(path).toBe('C:\\world.nomata.json');
    const bible = JSON.parse(payload as string);
    expect(bible.version).toBe('1.0.0');
    expect(bible.entities[0].id).toBe(entity.id);
    expect(bible.pinnedEntityIds).toEqual([entity.id]);
  });

  it('loads a native project file into the real store', async () => {
    const user = userEvent.setup();
    const bible = useNominaStore.getState().saveProjectBible('Native round trip');
    bible.entities = [{ ...entity, name: 'Imported Native Name' }];
    nativeBoundary.open.mockResolvedValue('C:\\import.nomata.json');
    nativeBoundary.readTextFile.mockResolvedValue(JSON.stringify(bible));
    render(<ExportModal isOpen onClose={() => {}} />);
    await user.click(screen.getByTestId('import-bible-btn'));
    await screen.findByText('Loaded "Native round trip" from C:\\import.nomata.json');
    expect(nativeBoundary.open).toHaveBeenCalledWith(expect.objectContaining({ multiple: false }));
    expect(nativeBoundary.readTextFile).toHaveBeenCalledWith('C:\\import.nomata.json');
    expect(useNominaStore.getState().pinnedEntities[0].name).toBe('Imported Native Name');
    expect(screen.getByTestId('export-preview-pane').textContent).toContain('Imported Native Name');
  });

  it('treats native save/open cancellation as no operation, not browser fallback or success', async () => {
    const user = userEvent.setup();
    nativeBoundary.save.mockResolvedValue(null);
    nativeBoundary.open.mockResolvedValue(null);
    const before = useNominaStore.getState();
    render(<ExportModal isOpen onClose={() => {}} />);
    const inputClick = vi.spyOn(screen.getByTestId('import-file-input'), 'click');
    await user.click(screen.getByTestId('export-save-btn'));
    await waitFor(() => expect(nativeBoundary.save).toHaveBeenCalledOnce());
    await user.click(screen.getByTestId('import-bible-btn'));
    await waitFor(() => expect(nativeBoundary.open).toHaveBeenCalledOnce());
    expect(nativeBoundary.writeTextFile).not.toHaveBeenCalled();
    expect(nativeBoundary.readTextFile).not.toHaveBeenCalled();
    expect(inputClick).not.toHaveBeenCalled();
    expect(screen.queryByTestId('export-status-banner')).toBeNull();
    expect(useNominaStore.getState()).toBe(before);
  });
});

it('keeps browser downloads within the modal so background prevention does not cancel them', () => {
  vi.useFakeTimers();
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = vi.fn(() => 'blob:export-smoke');
    static revokeObjectURL = vi.fn();
  });
  let downloadWasPrevented: boolean | undefined;
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    // Prevent jsdom navigation only after observing all application event handlers.
    const observe = (received: Event) => {
      downloadWasPrevented = received.defaultPrevented;
      received.preventDefault();
    };
    window.addEventListener('click', observe, { once: true });
    this.dispatchEvent(event);
  });
  render(<ExportModal isOpen onClose={() => {}} />);
  fireEvent.click(screen.getByTestId('export-save-btn'));
  expect(downloadWasPrevented).toBe(false);
  expect(screen.getByTestId('export-status-banner').textContent).toContain('Downloaded');
  act(() => vi.advanceTimersByTime(1000));
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:export-smoke');
});

it('shows unsaved state and opens export backup from the application warning', async () => {
  const user = userEvent.setup();
  usePersistenceStatus.setState({ error: 'Storage quota exceeded.' });
  render(<App />);
  expect(screen.getByRole('alert').textContent).toContain('Changes may be unsaved');
  expect(screen.getByRole('alert').textContent).toContain('Storage quota exceeded.');
  const recovery = within(screen.getByRole('alert')).getByRole('button', { name: 'Open Export Hub' });
  await user.click(recovery);
  expect(screen.getByRole('dialog', { name: 'Export Hub & Lore Bible' })).toBeTruthy();
  await user.keyboard('{Escape}');
  expect(document.activeElement).toBe(recovery);
  // Simulate a recovered storage operation.
  act(() => usePersistenceStatus.setState({ error: null }));
  expect(screen.queryByRole('alert')).toBeNull();
});
