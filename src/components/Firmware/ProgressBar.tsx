import { useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getDeviceType, getDeviceBootloaderVersion } from '@onekeyfe/hd-core';
import { Progress } from '@onekeyfe/ui-components';
import { RootState } from '@/store';
import { setProgress } from '@/store/reducers/firmware';
import semver from 'semver';
import { EDeviceType } from '@onekeyfe/hd-shared';

export default function ProgressBar() {
  const dispatch = useDispatch();
  const device = useSelector((state: RootState) => state.runtime.device);
  const uploadType = useSelector(
    (state: RootState) => state.runtime.selectedUploadType
  );
  const progress = useSelector((state: RootState) => state.firmware.progress);
  const maxProgress = useSelector(
    (state: RootState) => state.firmware.maxProgress
  );
  const updateTip = useSelector((state: RootState) => state.firmware.updateTip);

  const getIntervalTime = useCallback(() => {
    const bootloaderVersion = getDeviceBootloaderVersion(device?.features).join(
      '.'
    );
    const deviceType = getDeviceType(device?.features);
    const isBle = uploadType === 'ble';
    const isV3Update =
      semver.gte(bootloaderVersion, '2.8.0') && deviceType === EDeviceType.Pro;

    let time = 100;
    if (isV3Update) {
      time = 1500;
    } else if (deviceType === 'classic' || deviceType === 'classic1s') {
      time = isBle ? 100 : 300;
    } else if (deviceType === 'mini') {
      time = 500;
    } else if (deviceType === 'touch' || deviceType === 'pro') {
      time = isBle ? 100 : 1000;
    }
    return time;
  }, [device, uploadType]);

  const shouldUseActualProgress = useCallback(() => {
    if (!device?.features) return false;

    const bootloaderVersion = getDeviceBootloaderVersion(device.features).join(
      '.'
    );
    const deviceType = getDeviceType(device.features);

    return (
      semver.gte(bootloaderVersion, '2.8.0') && deviceType === EDeviceType.Pro
    );
  }, [device]);

  useEffect(() => {
    if (shouldUseActualProgress()) return;

    const intervalTime = getIntervalTime();
    const timer = setInterval(() => {
      if (progress < maxProgress) {
        dispatch(setProgress(progress + 1));
      }
    }, intervalTime);
    return () => {
      clearInterval(timer);
    };
  }, [
    maxProgress,
    progress,
    dispatch,
    getIntervalTime,
    shouldUseActualProgress,
  ]);

  return (
    <div className="flex items-center justify-center p-10">
      <div className="w-1/2">
        <Progress
          max={100}
          value={progress}
          leftText={updateTip}
          rightText={`${progress}%`}
        />
      </div>
    </div>
  );
}
