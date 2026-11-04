import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '../components/ui/dialog';
import { messages as t } from '../content';
import {
  liveStyles,
  newCustomThreatId,
  type CustomThreat,
  type LiveStyle,
} from '../domain/custom-threats';
import { useCompanion } from './companion-store';
import { Field } from './components';
import { LiveWordArt } from './LiveWordArt';
import { Icon } from './PixelIcon';

// Create or edit the user's own threat: a word in a WordArt style, plus lines to say and write.
export function CustomThreatDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
  onRemoved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: CustomThreat;
  onSaved?: (item: CustomThreat) => void;
  onRemoved?: () => void;
}) {
  const { store } = useCompanion();
  const [label, setLabel] = useState(editing?.label ?? '');
  const [style, setStyle] = useState<LiveStyle>(editing?.style ?? 'flame');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [say, setSay] = useState(editing?.say ?? '');
  const [write, setWrite] = useState(editing?.write ?? '');
  const preview = label.trim() || t.own.placeholder;
  const ready = !!label.trim() && !!(say.trim() || write.trim());
  function save() {
    const item: CustomThreat = {
      id: editing?.id ?? newCustomThreatId(),
      label: label.trim(),
      style,
      ...(description.trim() ? { description: description.trim() } : {}),
      say: say.trim(),
      write: write.trim(),
    };
    store.saveCustomThreat(item);
    onSaved?.(item);
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent
          className="history-dialog custom-dialog"
          aria-describedby={undefined}
          onEscapeKeyDown={(event) => event.stopPropagation()}
        >
          <div className="dialog-bar">
            <DialogTitle className="dialog-title">
              {editing ? t.own.editTitle : t.own.title}
            </DialogTitle>
            <DialogClose asChild>
              <Button className="icon-button" aria-label={t.deck.close}>
                <Icon name="close" />
              </Button>
            </DialogClose>
          </div>
          <form
            className="history-panel"
            onSubmit={(event) => {
              event.preventDefault();
              if (ready) save();
            }}
          >
            <Field label={t.own.word} value={label} onChange={setLabel} maxLength={24} required />
            <div className="wa-picker" role="radiogroup" aria-label={t.own.style}>
              {liveStyles.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={style === option}
                  aria-label={t.own.styles[option]}
                  className="wa-option"
                  onClick={() => setStyle(option)}
                >
                  <LiveWordArt text={preview} style={option} />
                </button>
              ))}
            </div>
            <Field
              label={t.own.description}
              value={description}
              onChange={setDescription}
              maxLength={140}
            />
            <Field label={t.own.say} value={say} onChange={setSay} maxLength={300} multiline />
            <Field
              label={t.own.write}
              value={write}
              onChange={setWrite}
              maxLength={600}
              multiline
            />
            <p className="muted small-copy">{store.persisting ? t.note.saved : t.own.session}</p>
            <Button className="primary" type="submit" disabled={!ready}>
              {t.own.save}
            </Button>
            {editing && (
              <Button
                type="button"
                className="text-button"
                onClick={() => {
                  store.removeCustomThreat(editing.id);
                  onOpenChange(false);
                  onRemoved?.();
                }}
              >
                {t.own.remove}
              </Button>
            )}
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}
