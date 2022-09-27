import { useRef, useState } from 'react';
import { Button } from '@onekeyhq/ui-components';

export default function UploadFirmware() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileInfo, setFileInfo] = useState<File | undefined>();

  const onClick = () => {
    inputRef.current?.click();
  };

  const onInputChange = () => {
    const selectedFile = inputRef?.current?.files?.[0];
    setFileInfo(selectedFile);
  };

  return (
    <div>
      <input
        id="input"
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".bin"
        onChange={onInputChange}
      />
      {!fileInfo?.name ? (
        <Button className="my-3" onClick={() => onClick()}>
          选择本地文件
        </Button>
      ) : (
        <div className="py-3 space-y-4 sm:flex sm:items-center sm:space-y-0 sm:space-x-10">
          <div className="flex items-center">
            <input
              name="notification-method"
              type="radio"
              defaultChecked
              className="h-4 w-4 border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <label
              htmlFor={fileInfo?.name}
              className="ml-3 block text-sm font-normal text-gray-700"
            >
              {fileInfo?.name}
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
