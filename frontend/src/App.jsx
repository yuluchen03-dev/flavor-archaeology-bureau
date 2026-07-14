import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import Input from './pages/Input';
import Result from './pages/Result';
import Teaching from './pages/Teaching';
import StarMap from './pages/StarMap';
import Evolution from './pages/Evolution';
import LightMode from './pages/LightMode';
import BusinessValue from './pages/BusinessValue';
import NotFound from './pages/NotFound';

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="input" element={<Input />} />
          <Route path="result" element={<Result />} />
          <Route path="teaching" element={<Teaching />} />
          <Route path="starmap" element={<StarMap />} />
          <Route path="evolution" element={<Evolution />} />
          <Route path="light" element={<LightMode />} />
          <Route path="business-value" element={<BusinessValue />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
