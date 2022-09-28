import { Provider, useSelector } from 'react-redux';
import { IntlProvider } from 'react-intl';
import { UIProvider } from '@onekeyfe/ui-components';
import LOCALES, { intlRef } from '@/locales';
import { RootState, store } from '@/store';
import App from './App';

const InternalProvider = () => {
  const locale = useSelector((state: RootState) => state.runtime.locale);
  return (
    <IntlProvider
      ref={(e) => {
        try {
          // @ts-expect-error
          intlRef.current = e?.state?.intl;
        } catch (error) {
          console.error('IntlProvider get ref error:', error);
        }
      }}
      locale={locale}
      messages={LOCALES[locale]}
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
