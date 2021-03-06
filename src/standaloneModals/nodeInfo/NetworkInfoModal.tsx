import { observer, useLocalObservable } from 'mobx-react-lite';
import { Dialog } from '~/components';
import { lang } from '~/utils';
import { nodeService } from '~/service';
import { fetchNetworkStats, INetworkStats } from '~/apis';
import React from 'react';

interface IProps {
  open: boolean
  onClose: () => void
}

const NetworkInfo = observer(() => {
  const state = useLocalObservable(() => ({
    hour: 0,
    day: 0,
    mouth: 0,
  }));
  const network = nodeService.state.network;
  const peerMap = nodeService.state.nodeInfo.peers;

  const loadNetworkStats = async () => {
    const [hour, day, mouth] = await Promise.all([
      getNetworkStats(1),
      getNetworkStats(24),
      getNetworkStats(30 * 24),
    ]);
    state.hour = countTraffic(hour);
    state.day = countTraffic(day);
    state.mouth = countTraffic(mouth);
  };

  React.useEffect(() => {
    loadNetworkStats();
  }, []);

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      <div className="bg-white rounded-0 p-8 px-10">
        <div className="w-[455px]">
          <div className="text-18 font-bold text-gray-700 text-center">
            {lang.node.networkStatus}
          </div>
          <div className="mt-6 pb-2">
            <div className="text-gray-500 font-bold">{lang.node.status}</div>
            <div className="mt-2 flex items-center justify-center text-12 text-gray-500 bg-gray-100 rounded-0 p-2 tracking-wider font-bold">
              {network.nat_type === 'Public' && (
                <div className="flex items-center text-emerald-500">
                  <div className="w-2 h-2 bg-emerald-300 rounded-full mr-2" />
                  Public
                </div>
              )}
              {network.nat_type !== 'Public' && (
                <div className="flex items-center text-red-400">
                  <div className="w-2 h-2 bg-red-300 rounded-full mr-2" />
                  {network.nat_type}
                </div>
              )}
            </div>

            <div className="mt-8">
              <div className="flex">
                <div className="text-gray-500 font-bold bg-gray-100 rounded-0 pt-2 pb-3 px-4">
                  {lang.node.traffic}
                </div>
              </div>
              <div className="-mt-3 justify-center text-12 text-gray-99 bg-gray-100 rounded-0 pt-3 px-6 pb-3 leading-7 tracking-wide">
                <div>{lang.node.lastHour}: <span className="text-red-400">{state.hour}M</span></div>
                <div>{lang.node.lastDay}: <span className="text-red-400">{state.day}M</span></div>
                <div>{lang.node.lastMouth}: <span className="text-red-400">{state.mouth}M</span></div>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex">
                <div className="text-gray-500 font-bold bg-gray-100 rounded-0 pt-2 pb-3 px-4">
                  addrs
                </div>
              </div>
              <div className="-mt-3 justify-center text-12 text-gray-99 bg-gray-100 rounded-0 pt-3 px-6 pb-3 leading-7 tracking-wide">
                {network.addrs.map((addr, i) => (
                  <div key={i}>{addr}</div>
                ))}
              </div>
            </div>
            {Object.keys(peerMap).map((type: string) => (
              <div className="mt-8" key={type}>
                <div className="flex">
                  <div className="text-gray-500 font-bold bg-gray-100 rounded-0 pt-2 pb-3 px-4">
                    {type}
                  </div>
                </div>
                <div className="-mt-3 justify-center text-12 text-gray-99 bg-gray-100 rounded-0 pt-3 px-6 pb-3 leading-7 tracking-wide">
                  {peerMap[type].map((peer, i) => (
                    <div key={i}>{peer}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default observer((props: IProps) => (
  <Dialog
    open={props.open}
    onClose={() => props.onClose()}
  >
    <NetworkInfo />
  </Dialog>
));

const getNetworkStats = (period: number) => {
  const end: Date = new Date();
  const start: Date = new Date(Number(end) - period * 60 * 60 * 1000);
  return fetchNetworkStats(start.toISOString(), end.toISOString());
};

const countTraffic = (stats: INetworkStats) => {
  let count = 0;
  const { summary } = stats;
  if (!summary) {
    return count;
  }
  for (const key in summary) {
    if (summary[key]) {
      count += summary[key].in_size || 0;
      count += summary[key].out_size || 0;
    }
  }
  return Math.floor(count / 1024 / 1024);
};
