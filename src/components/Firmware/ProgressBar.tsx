import { useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getDeviceType } from '@onekeyfe/hd-core';
import { Progress } from '@onekeyhq/ui-components';
import { RootState } from '@/store';
import { setProgress } from '@/store/reducers/firmware';

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
    const deviceType = getDeviceType(device?.features);
    const isBle = uploadType === 'ble';
    let time = 100;
    if (deviceType === 'classic') {
      time = isBle ? 100 : 300;
    } else if (deviceType === 'mini') {
      time = 500;
    } else if (deviceType === 'touch') {
      time = isBle ? 100 : 1000;
    }
    return time;
  }, [device, uploadType]);

  useEffect(() => {
    const intervalTime = getIntervalTime();
    const timer = setInterval(() => {
      if (progress < maxProgress) {
        dispatch(setProgress(progress + 1));
      }
    }, intervalTime);
    return () => {
      clearInterval(timer);
    };
  }, [maxProgress, progress, dispatch, getIntervalTime]);

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
