import { useState } from 'react';
import { useViewCopy } from '../useViewCopy';
import { Button } from '../../components/ui/button';
import { messages as t } from '../../content';
import type { Navigate } from '../App';
import { PageTitle } from '../components';

export function Closure({ navigate }: { navigate: Navigate }) {
  const voiceTitle = useViewCopy('closure');
  const finishedTitle = useViewCopy('finished');
  const reminder = useViewCopy('closureReminder');
  const [finished, setFinished] = useState(false);
  const [notReady, setNotReady] = useState(false);
  function finish() {
    setFinished(true);
  }
  if (finished)
    return (
      <>
        <PageTitle intro={t.finishedText}>{finishedTitle}</PageTitle>
        <Button className="primary" onClick={() => navigate('home')}>
          {t.done}
        </Button>
      </>
    );
  return (
    <>
      <PageTitle>{voiceTitle}</PageTitle>
      <p className="mantra">{reminder}</p>
      <div className="button-row">
        <Button className="primary" onClick={finish}>
          {t.finish}
        </Button>
      </div>
      <Button className="text-button" onClick={() => setNotReady(true)}>
        {t.notReady}
      </Button>
      {notReady && <p className="notice">{t.notReadyText}</p>}
    </>
  );
}
