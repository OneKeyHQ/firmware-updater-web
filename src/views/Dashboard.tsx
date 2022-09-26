import { useEffect, FC } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { KnownDevice } from '@onekeyfe/hd-core';
import { Steps, SearchDevice, Firmware } from '@/components';
import { serviceHardware } from '@/hardware';
import { RootState } from '@/store';
import { setPageStatus, setDevice } from '@/store/reducers/runtime';

const Content: FC = () => {
  const pageStatus = useSelector(
    (state: RootState) => state.runtime.pageStatus
  );

  if (pageStatus === 'searching' || pageStatus === 'search-timeout') {
    return <SearchDevice />;
  }

  return <Firmware />;
};

export default function Dashboard() {
  const pageStatus = useSelector(
    (state: RootState) => state.runtime.pageStatus
  );
  const device = useSelector((state: RootState) => state.runtime.device);
  const dispatch = useDispatch();

  useEffect(() => {
    const initProcess = async () => {
      const bridgeStatus = await serviceHardware.checkBridgeStatus();
      if (!bridgeStatus) {
        // TODO: show bridge failed content
        return;
      }
      await serviceHardware.getSDKInstance();
      dispatch(setPageStatus('searching'));
      serviceHardware.startDeviceScan(
        (response) => {
          if (!response.success) {
            return;
          }
          if (response.payload.length > 0) {
            if (!device) {
              dispatch(setDevice(response.payload?.[0] as KnownDevice));
            } else {
              const existDevice = response.payload.find(
                (d) => (d as any).path === device.path
              );
              if (existDevice) {
                dispatch(setDevice(existDevice as KnownDevice));
              } else {
                dispatch(setDevice(response.payload?.[0] as KnownDevice));
              }
            }
            serviceHardware.stopScan();
          }
        },
        () => {}
      );
      setTimeout(() => {
        if (serviceHardware.isSearch) {
          dispatch(setPageStatus('search-timeout'));
        }
      }, 30000);
    };

    initProcess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (pageStatus === 'initialize') {
    return (
      <div className="text-gray-800 text-sm text-center py-2">
        初始化中，请稍后（请确保设备已经退出休眠模式）...
      </div>
    );
  }

  return (
    <>
      <div className="py-4">
        <Steps />
      </div>
      <Content />
    </>
  );
}
