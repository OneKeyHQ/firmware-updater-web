import React from 'react';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import type { KnownDevice } from '@onekeyfe/hd-core';
import LOCALES from '@/locales';
import { store } from '@/store';
import {
  setCurrentTab,
  setDevice,
  setSelectedUploadType,
} from '@/store/reducers/runtime';
import ReleaseInfo from './ReleaseInfo';

jest.mock('@onekeyfe/ui-components', () => ({ Alert: () => null }));
jest.mock('./Table', () => () => null);
jest.mock('./UploadFirmware', () => () => null);

const renderForDevice = (deviceType: 'pro' | 'touch') => {
  store.dispatch(
    setDevice({
      deviceType,
      path: `${deviceType}-path`,
      features: { deviceType },
    } as unknown as KnownDevice)
  );
  return render(
    <Provider store={store}>
      <IntlProvider locale="en-US" messages={LOCALES['en-US']}>
        <ReleaseInfo />
      </IntlProvider>
    </Provider>
  );
};

describe('legacy release tabs', () => {
  beforeEach(() => {
    store.dispatch(setDevice(null));
    store.dispatch(setCurrentTab('firmware'));
    store.dispatch(setSelectedUploadType(null));
  });

  afterEach(() => {
    cleanup();
    store.dispatch(setDevice(null));
  });

  test('puts Bootloader first and selects it by default for legacy Pro', () => {
    store.dispatch(setSelectedUploadType('firmware'));
    renderForDevice('pro');

    const tabs = screen.getByRole('navigation', { name: 'Tabs' });
    expect(Array.from(tabs.children, (tab) => tab.textContent)).toEqual([
      'Bootloader',
      'Firmware',
      'Bluetooth Firmware',
    ]);
    expect(within(tabs).getByText('Bootloader')).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('combobox')).toHaveValue('Bootloader');
    expect(store.getState().runtime.selectedUploadType).toBeNull();

    userEvent.click(within(tabs).getByText('Firmware'));
    act(() => {
      store.dispatch(
        setDevice({
          ...store.getState().runtime.device,
          path: 'pro-path',
        } as KnownDevice)
      );
    });
    expect(store.getState().runtime.currentTab).toBe('firmware');
  });

  test('keeps the existing order and default for Touch', () => {
    renderForDevice('touch');

    const tabs = screen.getByRole('navigation', { name: 'Tabs' });
    expect(Array.from(tabs.children, (tab) => tab.textContent)).toEqual([
      'Firmware',
      'Bluetooth Firmware',
      'Bootloader',
    ]);
    expect(within(tabs).getByText('Firmware')).toHaveAttribute(
      'aria-current',
      'page'
    );
  });
});
