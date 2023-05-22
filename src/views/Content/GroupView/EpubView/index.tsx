import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { bookService } from '~/service';
import { EpubBookView } from './EpubBookView';
import { EpubGroupView } from './EpubGroupView';
import { EpubLinkGroupView } from './EpubLinkGroupView';
import { EpubHeader } from './EpubHeader';

interface Props {
  className?: string
}

export const EpubView = observer((props: Props) => {
  const current = bookService.state.current;
  return (
    <div
      className={classNames(
        props.className,
      )}
      key={current.groupId}
    >
      <EpubHeader />
      {!!current.groupId && !current.bookId && !current.linkGroupId && (
        <EpubGroupView className="flex-1 h-0" />
      )}
      {!!current.groupId && !!current.bookId && (
        <EpubBookView className="flex-1 h-0" key={current.bookId} />
      )}
      {!!current.linkGroupId && (
        <EpubLinkGroupView className="flex-1 h-0" key={current.linkGroupId} />
      )}
    </div>
  );
});
