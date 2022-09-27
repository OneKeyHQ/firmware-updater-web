import { Provider, useSelector } from 'react-redux';
import { IntlProvider } from 'react-intl';
import { UIProvider } from '@onekeyhq/ui-components';
import LOCALES from '@/locales';
import { RootState, store } from './store';
import App from './App';

const InternalProvider = () => {
  const locale = useSelector((state: RootState) => state.runtime.locale);
  return (
    <IntlProvider
      locale={locale}
      messages={LOCALES['zh-CN']}
      defaultLocale="en-US"
    >
      {/* @ts-expect-error */}
      <UIProvider defaultTheme="light">
        <App />
      </UIProvider>
    </IntlProvider>
  );
};

export default function AppProvider() {
  return (
    <Provider store={store}>
      <InternalProvider />
    </Provider>
  );
}
