import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Meeting from './pages/Meeting';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/meeting" element={<Meeting />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
