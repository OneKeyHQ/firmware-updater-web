import { Button } from '@onekeyhq/ui-components';

export default function ConfirmUpdate() {
  return (
    <div className="flex justify-center items-center flex-col">
      <div className="relative flex items-start">
        <div className="flex h-5 items-center">
          <input
            id="comments"
            aria-describedby="comments-description"
            name="comments"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor="comments" className="font-normal text-gray-700">
            我确认设备是空的或我已经有了恢复种子
          </label>
        </div>
      </div>
      <div className="py-4">
        <Button type="primary" size="xl" disabled>
          确定
        </Button>
      </div>
    </div>
  );
}
