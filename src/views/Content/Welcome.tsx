import { observer } from 'mobx-react-lite';
import { Button } from '~/components';
import { joinGroup } from '~/standaloneModals/joinGroup';
import { createGroup } from '~/standaloneModals/createGroup';
import { lang } from '~/utils';

export default observer(() => (
  <div className="-mt-12 text-18 text-gray-9b" data-test-id="welcome-page">
    <div className="pb-3 text-center">{lang.welcome.welcomeToUseRum}</div>
    <div className="pb-6 text-center">{lang.welcome.youCanTry}</div>
    <div className="flex items-center" data-testid="custom-element">
      <Button
        onClick={() => createGroup()}
        data-test-id="welcome-page-create-group-button"
      >
        {lang.welcome.createGroup}
      </Button>
      <div className="w-6" />
      <Button
        onClick={() => joinGroup()}
        outline
      >
        {lang.welcome.joinGroup}
      </Button>
    </div>
  </div>
));
