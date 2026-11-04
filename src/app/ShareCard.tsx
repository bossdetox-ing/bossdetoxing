import { useState } from 'react';
import { Button } from '../components/ui/button';
import { messages as t } from '../content';
import type { tarot } from '../domain/tarot';
import { Icon } from './PixelIcon';
import { shareCard } from './share-card';

export function ShareCard({
  card,
  className,
}: {
  card: (typeof tarot)[number];
  className?: string;
}) {
  const [status, setStatus] = useState('');
  return (
    <>
      <Button
        className={className}
        onClick={() => {
          setStatus('');
          shareCard(card)
            .then((result) => setStatus(result === 'saved' ? t.card.saved : ''))
            .catch(() => setStatus(t.card.shareFailed));
        }}
      >
        <Icon name="share" />
        {t.card.share}
      </Button>
      <p className="share-status" role="status">
        {status}
      </p>
    </>
  );
}
