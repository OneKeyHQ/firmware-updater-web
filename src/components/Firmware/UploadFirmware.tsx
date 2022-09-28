import { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { Button, Alert } from '@onekeyfe/ui-components';
import { serviceHardware } from '@/hardware';
import { setSelectedUploadType } from '@/store/reducers/runtime';
import { RootState } from '@/store';

export default function UploadFirmware() {
  const intl = useIntl();
  const dispatch = useDispatch();
  const selectedUploadType = useSelector(
    (state: RootState) => state.runtime.selectedUploadType
  );
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileInfo, setFileInfo] = useState<File | undefined>();

  const onClick = () => {
    inputRef.current?.click();
  };

  const onInputChange = () => {
    dispatch(setSelectedUploadType('binary'));
    const selectedFile = inputRef?.current?.files?.[0];
    setFileInfo(selectedFile);
    serviceHardware.setFile(selectedFile as File);
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
          {intl.formatMessage({ id: 'TR_FIRMWARE_FROM_LOCALE_FILE' })}
        </Button>
      ) : (
        <>
          <div className="py-3 space-y-4 sm:flex sm:items-center sm:space-y-0 sm:space-x-10">
            <div className="flex items-center">
              <input
                name="notification-method"
                type="radio"
                checked={selectedUploadType === 'binary'}
                onChange={() => {
                  dispatch(setSelectedUploadType('binary'));
                }}
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
          {selectedUploadType === 'binary' && (
            <div className="py-3">
              <Alert
                type="error"
                title={intl.formatMessage({ id: 'TR_ERROR_BEFORE_INSTALL' })}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
