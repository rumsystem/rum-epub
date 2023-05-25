import { Fragment } from 'react';
import { observer } from 'mobx-react-lite';
import { modalService } from './modal';
import { CreateGroup } from './createGroup/CreateGroup';
import { CreatePost } from './createPost/CreatePost';
import { EditEpubCover } from './editEpupCover/EditEpupCover';
import { EditEpubMetadata } from './editEpubMetadata/EditEpubMetadata';
import { EditProfile } from './editProfile/EditProfile';
import { GroupInfo } from './groupInfo/GroupInfo';
import { GroupLink } from './groupLink/GroupLink';
import { JoinGroup } from './joinGroup/JoinGroup';
import { ManageGroup } from './manageGroup/ManageGroup';
import { MyLibrary } from './myLibrary/MyLibrary';
import { NotificationModal } from './notificationModal/NotificationModal';
import { PostDetail } from './postDetail/PostDetail';
import { QuoteDetail } from './quoteDetail/QuoteDetail';
import { ReplyComment } from './replyComment/ReplyComment';
import { ShareGroup } from './shareGroup/ShareGroup';
import { TrxInfo } from './trxInfo/TrxInfo';
import { UploadBook } from './uploadBook/UploadBook';

export const ModalView = observer(() => (<>
  {modalService.state.components.map((v) => (
    <Fragment key={v.id}>
      {v.name === 'createGroup' && (<CreateGroup {...v.props} />)}
      {v.name === 'createPost' && (<CreatePost {...v.props} />)}
      {v.name === 'editEpubCover' && (<EditEpubCover {...v.props} />)}
      {v.name === 'editEpubMetadata' && (<EditEpubMetadata {...v.props} />)}
      {v.name === 'editProfile' && (<EditProfile {...v.props} />)}
      {v.name === 'groupInfo' && (<GroupInfo {...v.props} />)}
      {v.name === 'groupLink' && (<GroupLink {...v.props} />)}
      {v.name === 'joinGroup' && (<JoinGroup {...v.props} />)}
      {v.name === 'manageGroup' && (<ManageGroup {...v.props} />)}
      {v.name === 'myLibrary' && (<MyLibrary {...v.props} />)}
      {v.name === 'notificationModal' && (<NotificationModal {...v.props} />)}
      {v.name === 'postDetail' && (<PostDetail {...v.props} />)}
      {v.name === 'quoteDetail' && (<QuoteDetail {...v.props} />)}
      {v.name === 'replyComment' && (<ReplyComment {...v.props} />)}
      {v.name === 'shareGroup' && (<ShareGroup {...v.props} />)}
      {v.name === 'trxInfo' && (<TrxInfo {...v.props} />)}
      {v.name === 'uploadBook' && (<UploadBook {...v.props} />)}
    </Fragment>
  ))}
</>));
