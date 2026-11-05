import { Button } from '../components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from '../components/ui/drawer';
import { messages as t } from '../content';
import { content } from '../domain/content';
import { Icon } from './PixelIcon';

// The threat's Bestiary entry in a bottom sheet: what to observe, verify and keep credible.
export function BestiaryPanel({ threatId }: { threatId: string }) {
  const behavior = content.behaviors.find((b) => b.id === `behavior_${threatId}`);
  if (!behavior) return null;
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button className="bestiary-row">
          <span className="bestiary-mark" aria-hidden="true">
            <Icon name="bestiary" />
          </span>
          <span className="bestiary-text">
            <strong>{t.bestiary}</strong>
            <small>{t.bestiarySub}</small>
          </span>
          <span className="bestiary-go" aria-hidden="true">
            <Icon name="next" />
          </span>
        </Button>
      </DrawerTrigger>
      <DrawerContent
        className="bestiary-sheet"
        // Escape closes the sheet here instead of hiding and locking the whole app.
        onEscapeKeyDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-bar">
          <DrawerTitle className="drawer-title">{t.bestiary}</DrawerTitle>
          <DrawerClose asChild>
            <Button className="icon-button" aria-label={t.deck.close}>
              <Icon name="close" />
            </Button>
          </DrawerClose>
        </div>
        <DrawerDescription className="drawer-threat">{behavior.title}</DrawerDescription>
        <div className="drawer-body">
          {[
            { title: t.observed, items: behavior.observedIndicators },
            { title: t.alternatives, items: behavior.alternativeExplanations },
            { title: t.doNotInfer, items: behavior.doNotInfer },
            { title: t.factualFollowUp, items: [behavior.factualFollowUp] },
          ].map((section) => (
            <section key={section.title}>
              <h3>{section.title}</h3>
              {section.items.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </section>
          ))}
          {/* Serious support lives on the site, outside the app. */}
          <a
            className="text-link support-link"
            href="https://bossdetox.ing/support/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.bestiarySupport}
            <Icon name="external" />
            <span className="visually-hidden"> {t.newTab}</span>
          </a>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
