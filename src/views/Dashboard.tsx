import { useEffect, useCallback, FC, useState } from 'react';
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';
import type { KnownDevice } from '@onekeyfe/hd-core';
import { Steps, SearchDevice, Firmware } from '@/components';
import { serviceHardware } from '@/hardware';
import { RootState } from '@/store';
import { setPageStatus, setDevice } from '@/store/reducers/runtime';

const Content: FC<{
  onConnectDevice?: () => void;
  isConnecting?: boolean;
}> = ({ onConnectDevice, isConnecting }) => {
  const pageStatus = useSelector(
    (state: RootState) => state.runtime.pageStatus
  );

  if (['searching', 'search-timeout'].includes(pageStatus)) {
    return (
      <SearchDevice
        onConnectDevice={onConnectDevice}
        isConnecting={isConnecting}
      />
    );
  }

  return <Firmware />;
};

export default function Dashboard() {
  const intl = useIntl();
  const pageStatus = useSelector(
    (state: RootState) => state.runtime.pageStatus
  );
  const device = useSelector((state: RootState) => state.runtime.device);
  const dispatch = useDispatch();
  const [needUserAction, setNeedUserAction] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const searchDevice = useCallback(async () => {
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
        } else if (device) {
          // No devices found - device was disconnected
          // Reset to allow user to connect a new device
          console.log('Device disconnected, resetting state');
          dispatch(setDevice(null));
          dispatch(setPageStatus('searching'));
          setNeedUserAction(true);
          serviceHardware.stopScan();
        }
      },
      () => {}
    );
    setTimeout(() => {
      if (serviceHardware.isSearch) {
        dispatch(setPageStatus('search-timeout'));
      }
    }, 30000);
  }, [device, dispatch]);

  // Prompt user to connect device (WebUSB requires user gesture)
  const handleConnectDevice = useCallback(async () => {
    // Prevent multiple concurrent connection attempts
    if (isConnecting) {
      console.log('Connection already in progress, ignoring duplicate request');
      return;
    }

    setIsConnecting(true);
    try {
      const hardwareSDK = await serviceHardware.getSDKInstance();
      // This call requires user gesture and will prompt device selection dialog
      const result = await hardwareSDK.promptWebDeviceAccess();

      if (result.success && result.payload?.device) {
        // After user authorizes device, start searching
        console.log('Device authorized successfully:', result.payload.device);
        setNeedUserAction(false);
        await searchDevice();
      } else if (!result.success) {
        // User cancelled or error occurred
        console.log('Device access denied or cancelled:', result.payload);
        // Keep needUserAction true so user can retry
      }
    } catch (error: any) {
      console.error('Failed to prompt device access:', error);

      // Handle specific error cases
      if (error?.message?.includes('interrupted')) {
        console.log('User cancelled the device selection dialog');
      } else if (error?.message?.includes('No device selected')) {
        console.log('No device was selected by user');
      } else {
        console.error('Unexpected error during device connection:', error);
      }

      // Keep needUserAction true so user can retry
    } finally {
      setIsConnecting(false);
    }
  }, [searchDevice, isConnecting]);

  // Initialize and check if we need user action
  useEffect(() => {
    const initProcess = async () => {
      // Try to search for already authorized devices first
      await serviceHardware.getSDKInstance();
      const response = await serviceHardware.searchDevices();

      if (response.success && response.payload.length > 0) {
        // Found authorized devices, start normal search
        setNeedUserAction(false);
        await searchDevice();
      } else {
        // No authorized devices, need user to click connect button
        setNeedUserAction(true);
        dispatch(setPageStatus('searching'));
      }
    };

    initProcess();
    serviceHardware.getReleaseInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Monitor USB device connect events (for auto-search on connection)
  useEffect(() => {
    // Check if WebUSB is supported
    const usb = (navigator as any).usb;
    if (!usb) {
      console.warn('WebUSB not supported in this browser');
      return;
    }

    const handleDeviceConnect = (event: any) => {
      console.log('USB device connected:', event.device);

      // When a device connects, trigger search if we're on the search page
      if (pageStatus === 'searching') {
        searchDevice().catch((err) =>
          console.error('Failed to search device:', err)
        );
      }
    };

    // Only listen to connect events, not disconnect
    // User can manually reconnect using the button in firmware page
    usb.addEventListener('connect', handleDeviceConnect);

    // Cleanup
    return () => {
      usb.removeEventListener('connect', handleDeviceConnect);
    };
  }, [pageStatus, searchDevice]);

  if (pageStatus === 'initialize') {
    return (
      <div className="flex items-center justify-center text-gray-800 text-sm text-center py-2">
        {intl.formatMessage({ id: 'TR_INIT' })}
      </div>
    );
  }

  return (
    <>
      <div className="py-4">
        <Steps />
      </div>
      <Content
        onConnectDevice={needUserAction ? handleConnectDevice : undefined}
        isConnecting={isConnecting}
      />
    </>
  );
}
