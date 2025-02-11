import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components';
// import './App.css';
import '@onekeyfe/ui-components/index.css';
import { useIntl } from 'react-intl';
import { useEffect } from 'react';
import Dashboard from './views/Dashboard';

export default function App() {
  const intl = useIntl();

  useEffect(() => {
    const title = intl.formatMessage({ id: 'META_TITLE' });
    const description = intl.formatMessage({ id: 'META_DESCRIPTION' });

    process.env.REACT_APP_META_TITLE = title;
    process.env.REACT_APP_META_DESCRIPTION = description;

    document.title = title;

    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', description);
    document
      .querySelector('meta[name="og:title"]')
      ?.setAttribute('content', title);
    document
      .querySelector('meta[property="og:description"]')
      ?.setAttribute('content', description);
    document
      .querySelector('meta[name="twitter:title"]')
      ?.setAttribute('content', title);
    document
      .querySelector('meta[property="twitter:description"]')
      ?.setAttribute('content', description);
  }, [intl]);
  return (
    <Layout>
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </Router>
    </Layout>
  );
}
