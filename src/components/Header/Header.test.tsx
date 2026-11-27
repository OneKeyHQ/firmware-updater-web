import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import LOCALES from '@/locales';
import { store } from '@/store';
import { setLocale } from '@/store/reducers/runtime';
import Header from './Header';

const renderHeader = () =>
  render(
    <Provider store={store}>
      <IntlProvider locale="en-US" messages={LOCALES['en-US']}>
        <Header />
      </IntlProvider>
    </Provider>
  );

describe('header language picker', () => {
  beforeEach(() => {
    store.dispatch(setLocale('en-US'));
  });

  test.each([
    ['Enter', '{Enter}'],
    ['Space', ' '],
  ])('selects a language with %s', async (_name, key) => {
    renderHeader();

    const toggle = screen.getByRole('button', { name: 'English' });
    toggle.focus();
    userEvent.keyboard('{Enter}');
    userEvent.tab();

    expect(screen.getByRole('button', { name: '中文（简体）' })).toHaveFocus();
    userEvent.keyboard(key);

    expect(store.getState().runtime.locale).toBe('zh-CN');
    expect(toggle).toHaveTextContent('中文（简体）');
    await waitFor(() =>
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
    );
    expect(toggle).toHaveFocus();
  });

  test('reaches the second language option with Tab', async () => {
    store.dispatch(setLocale('zh-CN'));
    renderHeader();

    const toggle = screen.getByRole('button', { name: '中文（简体）' });
    toggle.focus();
    userEvent.keyboard('{Enter}');
    userEvent.tab();
    userEvent.tab();

    const englishOption = screen.getByRole('button', { name: 'English' });
    expect(englishOption).toHaveFocus();
    userEvent.keyboard('{Enter}');

    expect(store.getState().runtime.locale).toBe('en-US');
    await waitFor(() =>
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
    );
    expect(toggle).toHaveFocus();
  });
});
