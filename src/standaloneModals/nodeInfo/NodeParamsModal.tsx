import { observer } from 'mobx-react-lite';
import { Button } from '@mui/material';

import { Dialog } from '~/components';
import { lang, setClipboard } from '~/utils';
import { quorumService, tooltipService } from '~/service';

interface IProps {
  open: boolean
  onClose: () => void
}

export const NodeParams = observer(() => {
  const handleCopyCert = () => {
    setClipboard(quorumService.state.cert);
    tooltipService.show({
      content: lang.copied,
    });
  };
  const handleCopyPort = () => {
    setClipboard(String(quorumService.state.port));
    tooltipService.show({
      content: lang.copied,
    });
  };

  return (
    <div className="bg-white rounded-0 p-6">
      <div className="w-72 relative">
        <div className="text-18 font-bold text-gray-700 text-center">
          {lang.node.nodeParams}
        </div>
        <div className="mt-6">
          <div className="text-gray-500 font-bold opacity-90">{lang.node.port}</div>
          <div className="flex mt-2">
            <div className="p-2 pl-3 border border-gray-200 text-gray-500 bg-gray-100 text-12 truncate flex-1 rounded-l-0 border-r-0">
              {quorumService.state.port}
            </div>
            <Button
              className="rounded-none"
              size="small"
              onClick={handleCopyPort}
            >
              {lang.copy}
            </Button>
          </div>
          {!!quorumService.state.cert && (
            <div className="mt-6">
              <div className="text-gray-500 font-bold opacity-90">{lang.node.tslCert}</div>
              <div className="relative">
                <div className="mt-2 text-12 text-gray-500 bg-gray-100 border border-gray-200 py-4 px-4 break-words h-50 overflow-y-auto">
                  {quorumService.state.cert}
                </div>
                <div
                  className="absolute top-0 right-0 bg-black text-white p-1 px-[18px] text-12 cursor-pointer"
                  onClick={handleCopyCert}
                >
                  {lang.copy}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default observer((props: IProps) => (
  <Dialog
    className="node-params-modal"
    open={props.open}
    onClose={() => props.onClose()}
  >
    <NodeParams />
  </Dialog>
));
