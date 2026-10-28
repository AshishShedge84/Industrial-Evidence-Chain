import { RouterProvider } from 'react-router-dom';
import { Providers } from './providers';
import { router } from './routes';
import { ErrorBoundary } from '../components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </ErrorBoundary>
  );
}

export default App;