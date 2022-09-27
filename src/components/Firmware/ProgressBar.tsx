import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Progress } from '@onekeyhq/ui-components';
import { RootState } from '@/store';
import { setProgress } from '@/store/reducers/firmware';

export default function ProgressBar() {
  const dispatch = useDispatch();
  const progress = useSelector((state: RootState) => state.firmware.progress);
  const maxProgress = useSelector(
    (state: RootState) => state.firmware.maxProgress
  );
  const updateTip = useSelector((state: RootState) => state.firmware.updateTip);

  useEffect(() => {
    const timer = setInterval(() => {
      if (progress < maxProgress) {
        dispatch(setProgress(progress + 1));
      }
    }, 300);
    return () => {
      clearInterval(timer);
    };
  }, [maxProgress, progress, dispatch]);

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
