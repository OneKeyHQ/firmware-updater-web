import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components';
import './App.css';
import '@onekeyhq/ui-components/index.css';
import Dashboard from './views/Dashboard';

export default function App() {
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
