import { useEffect, useCallback, FC } from 'react';
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';
import type { KnownDevice } from '@onekeyfe/hd-core';
import { Steps, SearchDevice, Firmware } from '@/components';
// eslint-disable-next-line import/no-cycle
import { serviceHardware } from '@/hardware';
import { RootState } from '@/store';
import { setPageStatus, setDevice } from '@/store/reducers/runtime';

const Content: FC = () => {
  const pageStatus = useSelector(
    (state: RootState) => state.runtime.pageStatus
  );

  if (
    [
      'searching',
      'search-timeout',
      'uninstall-bridge',
      'download-bridge',
    ].includes(pageStatus)
  ) {
    return <SearchDevice />;
  }

  return <Firmware />;
};

export default function Dashboard() {
  const intl = useIntl();
  const pageStatus = useSelector(
    (state: RootState) => state.runtime.pageStatus
  );
  const device = useSelector((state: RootState) => state.runtime.device);
  const dispatch = useDispatch();

  const searchDevice = useCallback(async () => {
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
  }, [device, dispatch]);

  // common search device
  useEffect(() => {
    const initProcess = async () => {
      const bridgeStatus = await serviceHardware.checkBridgeStatus();
      if (!bridgeStatus) {
        dispatch(setPageStatus('uninstall-bridge'));
        return;
      }
      await searchDevice();
    };

    initProcess();
    serviceHardware.getReleaseInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // polling check bridge status after download
  useEffect(() => {
    if (pageStatus === 'download-bridge') {
      const timer = setInterval(async () => {
        const bridgeStatus = await serviceHardware.checkBridgeStatus();
        if (bridgeStatus) {
          clearInterval(timer);
          await searchDevice();
        }
      }, 5000);

      return () => {
        if (timer) {
          clearInterval(timer);
        }
      };
    }
  }, [pageStatus, searchDevice]);

  if (pageStatus === 'initialize') {
    return (
      <div className="text-gray-800 text-sm text-center py-2">
        {intl.formatMessage({ id: 'TR_INIT' })}
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
