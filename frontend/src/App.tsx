import { Route, Routes } from 'react-router';

import { Layout } from './components/Layout';
import {
  AddGamePage,
  CollectionPage,
  DuelPage,
  LoginPage,
  NotFoundPage,
  RankingPage,
  StatsPage,
} from './pages/pages';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Layout />}>
        <Route index element={<CollectionPage />} />
        <Route path="add" element={<AddGamePage />} />
        <Route path="duel" element={<DuelPage />} />
        <Route path="ranking" element={<RankingPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
