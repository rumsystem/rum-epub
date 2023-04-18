import { Fragment } from 'react';
import { observer } from 'mobx-react-lite';
import { modalService } from './modal';
import { UploadBook } from './uploadBook/UploadBook';
import { GroupInfo } from './groupInfo/GroupInfo';
import { MyLibrary } from './myLibrary/MyLibrary';
import { EditEpubCover } from './editEpupCover/EditEpupCover';
import { EditEpubMetadata } from './editEpubMetadata/EditEpubMetadata';
import { CreateGroup } from './createGroup/CreateGroup';
import { JoinGroup } from './joinGroup/JoinGroup';
import { ShareGroup } from './shareGroup/ShareGroup';

export const ModalView = observer(() => (<>
  {modalService.state.components.map((v) => (
    <Fragment key={v.id}>
      {v.name === 'uploadBook' && (<UploadBook {...v.props} />)}
      {v.name === 'groupInfo' && (<GroupInfo {...v.props} />)}
      {v.name === 'myLibrary' && (<MyLibrary {...v.props} />)}
      {v.name === 'editEpubCover' && (<EditEpubCover {...v.props} />)}
      {v.name === 'editEpubMetadata' && (<EditEpubMetadata {...v.props} />)}
      {v.name === 'createGroup' && (<CreateGroup {...v.props} />)}
      {v.name === 'joinGroup' && (<JoinGroup {...v.props} />)}
      {v.name === 'shareGroup' && (<ShareGroup {...v.props} />)}
    </Fragment>
  ))}
</>));
