import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { epubService } from '~/service';
import { EpubBookView } from './EpubBookView';
import { EpubGroupView } from './EpubGroupView';
import { EpubHeader } from './EpubHeader';

interface Props {
  className?: string
}

export const EpubView = observer((props: Props) => {
  if (!epubService.state.current.groupId) {
    return null;
  }
  return (
    <div
      className={classNames(
        props.className,
      )}
      key={epubService.state.current.groupId}
    >
      <EpubHeader />

      {!epubService.state.current.bookTrx && (
        <EpubGroupView
          className="flex-1 h-0"
        />
      )}
      {!!epubService.state.current.bookTrx && (
        <EpubBookView
          className="flex-1 h-0"
          key={`${epubService.state.current.groupId}-${epubService.state.current.bookTrx}`}
        />
      )}
    </div>
  );
});
