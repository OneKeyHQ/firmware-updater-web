import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { classNames } from '@/utils';

export default function Step() {
  const pageStatus = useSelector(
    (state: RootState) => state.runtime.pageStatus
  );

  const [stepState, setStepState] = useState<'connect' | 'firmware'>('connect');

  useEffect(() => {
    setStepState(pageStatus !== 'connected' ? 'connect' : 'firmware');
  }, [pageStatus]);

  return (
    <div className="w-1/2 mx-auto">
      <h2 className="sr-only">Steps</h2>

      <div className="relative after:inset-x-0 after:h-0.5 after:absolute after:top-1/2 after:-translate-y-1/2 after:block after:rounded-lg after:bg-gray-100">
        <ol className="relative z-10 flex justify-between text-sm font-medium text-gray-500">
          <li className="flex items-center p-2 bg-white">
            <span
              className={classNames(
                'w-6 h-6 text-[10px] font-bold leading-6 text-center rounded-full',
                stepState === 'connect'
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100'
              )}
            >
              1
            </span>

            <span className="hidden sm:block sm:ml-2">Connect</span>
          </li>

          <li className="flex items-center p-2 bg-white">
            <span
              className={classNames(
                'w-6 h-6 text-[10px] font-bold leading-6 text-center rounded-full',
                stepState === 'firmware'
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100'
              )}
            >
              2
            </span>

            <span className="hidden sm:block sm:ml-2">Firmware</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
