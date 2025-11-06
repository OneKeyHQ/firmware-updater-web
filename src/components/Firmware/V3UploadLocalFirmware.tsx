import React, { useCallback, useRef } from 'react';
import { useIntl } from 'react-intl';
import { Button } from '@onekeyfe/ui-components';
import {
  useV3Components,
  V3ComponentType,
  getAllV3ComponentTypes,
} from '@/utils/v3FirmwareUtils';

const V3UploadLocalFirmware: React.FC = () => {
  const intl = useIntl();
  const {
    v3UpdateSelections,
    selectedV3Components,
    toggleComponentSelection,
    getComponentTypeText,
  } = useV3Components();

  // Create individual refs for input elements
  const fwRef = useRef<HTMLInputElement>(null);
  const bleRef = useRef<HTMLInputElement>(null);
  const bootRef = useRef<HTMLInputElement>(null);
  const resourceRef = useRef<HTMLInputElement>(null);

  // Create a stable reference to the refs object
  const fileInputRefs = React.useMemo(
    () => ({
      fw: fwRef,
      ble: bleRef,
      boot: bootRef,
      resource: resourceRef,
    }),
    []
  );

  // Store file objects in refs to avoid serialization issues in Redux
  const fileObjectsRef = useRef<{
    fw?: File;
    ble?: File;
    boot?: File;
    resource?: File;
  }>({});

  const handleLocalFileSelect = useCallback(
    (componentType: V3ComponentType) => {
      // Use the ref to trigger the file input click
      if (fileInputRefs[componentType]?.current) {
        fileInputRefs[componentType]?.current?.click();
      }
    },
    [fileInputRefs]
  );

  const handleSourceSelect = useCallback(
    (componentType: V3ComponentType, file?: File) => {
      if (file) {
        console.log(`handleSourceSelect for ${componentType} with file:`, {
          name: file.name,
          size: file.size,
          type: file.type,
        });

        // Store file information
        const fileInfo = {
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
          type: file.type,
        };

        // Store actual file object in the ref
        fileObjectsRef.current[componentType] = file;

        // Update Redux state with file info (but not the actual file)
        // Always force update when selecting a new local file
        toggleComponentSelection(
          componentType,
          'local',
          undefined,
          fileInfo,
          true
        );
      }
    },
    [toggleComponentSelection]
  );

  // Expose the file objects for other components to access
  React.useEffect(() => {
    // Add a global reference to access these files from outside the component
    (window as any).v3FileObjects = fileObjectsRef.current;
  }, []);

  // Generate button labels for each component type
  const getButtonLabel = (componentType: V3ComponentType) => {
    switch (componentType) {
      case 'fw':
        return (
          intl.formatMessage({ id: 'TR_SELECT_LOCAL_FIRMWARE' }) ||
          '选择本地固件'
        );
      case 'ble':
        return (
          intl.formatMessage({ id: 'TR_SELECT_LOCAL_BLE_FIRMWARE' }) ||
          '选择本地蓝牙固件'
        );
      case 'boot':
        return (
          intl.formatMessage({ id: 'TR_SELECT_LOCAL_BOOTLOADER' }) ||
          '选择本地boot'
        );
      case 'resource':
        return (
          intl.formatMessage({ id: 'TR_SELECT_LOCAL_RESOURCE' }) ||
          '选择本地资源文件'
        );
      default:
        return (
          intl.formatMessage({ id: 'TR_SELECT_LOCAL_FILE' }) || '选择本地文件'
        );
    }
  };

  // Render Button using React.createElement to avoid JSX type errors
  const renderButton = (onClick: () => void, children: React.ReactNode) =>
    React.createElement(Button, { onClick }, children);

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      <h3 className="text-lg font-medium leading-6 text-gray-900">
        {intl.formatMessage({ id: 'TR_LOCAL_FIRMWARE_UPLOAD' }) ||
          '本地固件上传'}
      </h3>

      <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
        {getAllV3ComponentTypes().map((componentType) => {
          const selection = v3UpdateSelections[componentType] || {};
          const isSelected = selectedV3Components.includes(componentType);

          return (
            <div
              key={`local-file-${componentType}`}
              className="bg-white shadow overflow-hidden rounded-lg"
            >
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  {getComponentTypeText(componentType)}
                </h3>

                <div className="mt-5">
                  {renderButton(
                    () => handleLocalFileSelect(componentType),
                    getButtonLabel(componentType)
                  )}

                  {/* Hidden file input using refs */}
                  <input
                    type="file"
                    ref={fileInputRefs[componentType]}
                    className="hidden"
                    accept=".bin,.zip"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        console.log(`Selected file for ${componentType}:`, {
                          name: file.name,
                          size: file.size,
                          type: file.type,
                        });
                        handleSourceSelect(componentType, file);
                      }
                    }}
                  />
                </div>

                {/* Display selected file name */}
                {selection.fileInfo && (
                  <div className="mt-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`v3-local-component-${componentType}`}
                        className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        checked={isSelected && selection.source === 'local'}
                        onChange={() => {
                          toggleComponentSelection(
                            componentType,
                            'local',
                            undefined,
                            selection.fileInfo
                          );
                        }}
                      />
                      <label
                        htmlFor={`v3-local-component-${componentType}`}
                        className="ml-2 text-sm text-gray-600"
                      >
                        {selection.fileInfo.name}
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default V3UploadLocalFirmware;
