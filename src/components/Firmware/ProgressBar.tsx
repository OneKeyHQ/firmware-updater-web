import { Progress } from '@onekeyhq/ui-components';

export default function ProgressBar() {
  return (
    <div className="flex items-center justify-center p-10">
      <div className="w-1/2">
        <Progress
          max={100}
          value={49}
          leftText="Download firmware"
          rightText="49%"
        />
      </div>
    </div>
  );
}
