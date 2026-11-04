import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '../components/ui/dialog';
import type { Settings } from '../browser/settings';
import { messages as t } from '../content';
import type { Vault } from '../vault/service';
import { useCompanion } from './companion-store';
import { Toggle } from './components';
import { Icon } from './PixelIcon';
import { VaultGate } from './views/VaultGate';

// Turn on encrypted history from wherever the user is: create or unlock the vault, then
// give the explicit consent for automatic encrypted entries. Same rules as the calendar.
export function HistoryDialog({
  vault,
  settings,
  update,
  open,
  onOpenChange,
}: {
  vault: Vault;
  settings: Settings;
  update: (next: Settings) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { store } = useCompanion();
  const [unlocked, setUnlocked] = useState(vault.unlocked);
  async function consent(enabled: boolean) {
    await update({ ...settings, privateLogging: enabled });
    if (enabled) await store.enablePersistence();
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent
          className="history-dialog"
          aria-describedby={undefined}
          onEscapeKeyDown={(event) => event.stopPropagation()}
        >
          <div className="dialog-bar">
            <DialogTitle className="dialog-title">{t.redesign.enableHistory}</DialogTitle>
            <DialogClose asChild>
              <Button className="icon-button" aria-label={t.deck.close}>
                <Icon name="close" />
              </Button>
            </DialogClose>
          </div>
          <div className="history-panel">
            {!unlocked ? (
              <VaultGate
                vault={vault}
                opened={() => {
                  setUnlocked(true);
                  void store.hydrate();
                }}
              />
            ) : (
              <>
                <p className="muted">{t.redesign.historyNotice}</p>
                <Toggle
                  label={t.redesign.historyConsent}
                  checked={settings.privateLogging}
                  onChange={(value) => void consent(value)}
                />
                <DialogClose asChild>
                  <Button className="primary">{t.note.done}</Button>
                </DialogClose>
              </>
            )}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
