import { UIProvider } from '@onekeyhq/ui-components';
import { Provider } from 'react-redux';
import App from './App';
import { store } from './store';

export default function AppProvider() {
  return (
    // @ts-expect-error
    <UIProvider defaultTheme="light">
      <Provider store={store}>
        <App />
      </Provider>
    </UIProvider>
  );
}
