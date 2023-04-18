import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { bookService } from '~/service';
import { EpubBookView } from './EpubBookView';
import { EpubGroupView } from './EpubGroupView';
import { EpubHeader } from './EpubHeader';

interface Props {
  className?: string
}

export const EpubView = observer((props: Props) => {
  if (!bookService.state.current.groupId) {
    return null;
  }
  return (
    <div
      className={classNames(
        props.className,
      )}
      key={bookService.state.current.groupId}
    >
      <EpubHeader />

      {!bookService.state.current.bookId && (
        <EpubGroupView
          className="flex-1 h-0"
        />
      )}
      {!!bookService.state.current.bookId && (
        <EpubBookView
          className="flex-1 h-0"
          key={`${bookService.state.current.groupId}-${bookService.state.current.bookId}`}
        />
      )}
    </div>
  );
});
