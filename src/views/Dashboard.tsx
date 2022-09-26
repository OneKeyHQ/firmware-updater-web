import { useEffect, FC } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { KnownDevice } from '@onekeyfe/hd-core';
import {
  Steps,
  Description,
  ReleaseInfo,
  UploadFirmware,
  ConfirmUpdate,
  BootloaderContent,
  SearchDevice,
} from '@/components';
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
  return null;
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
      }, 5000);
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
      {/* <div className="content">
        <h1 className="text-3xl text-center font-light py-4">安装固件</h1>
        <div className="flex flex-row-reverse">
          <div className="w-1/2">
            <Description text="状态" value="未连接" />
            <Description text="固件版本" value="3.1.0" />
            <Description text="蓝牙固件版本" value="2.0.4" />
            <Description text="设备类型" value="OneKey Touch" />
            <Description
              text="设备序列号"
              value="TC01WBD202207290806060000020"
            />
          </div>
        </div>
        <ReleaseInfo />
        <UploadFirmware />
        <ConfirmUpdate />
        <BootloaderContent />
        <SearchTimeout /> */}
      {/* </div> */}
    </>
  );
}
