import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from '@/components/business/Navbar';
import { HomePage } from '@/pages/HomePage';
import { ViewerPage } from '@/pages/ViewerPage';
import { JudgmentPage } from '@/pages/JudgmentPage';
import { DraftPage } from '@/pages/DraftPage';
import { PrintPreviewPage } from '@/pages/PrintPreviewPage';
import { useDraftStore } from '@/store/useDraftStore';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function LoadDrafts() {
  const { loadDrafts } = useDraftStore();
  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);
  return null;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <LoadDrafts />
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/viewer/:draftId?" element={<ViewerPage />} />
            <Route path="/judgment/:draftId" element={<JudgmentPage />} />
            <Route path="/drafts" element={<DraftPage />} />
            <Route path="/print/:draftId" element={<PrintPreviewPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </main>
        <footer className="no-print bg-white border-t border-gray-200 py-4 mt-8">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
            胶片数字件质量核查系统 · 适用于夜班值班医生、轮转技师和质控老师
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
