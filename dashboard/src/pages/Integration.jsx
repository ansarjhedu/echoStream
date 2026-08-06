import { Navigate } from 'react-router-dom';

/** Legacy Widget Studio — Design Lab is the canonical publish surface. */
export default function Integration() {
  return <Navigate to="/workspace/design-lab" replace />;
}
