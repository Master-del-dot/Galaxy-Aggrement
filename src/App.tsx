/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import Dashboard from '@/pages/Dashboard';
import EditPdf from '@/pages/EditPdf';
import FillForm from '@/pages/FillForm';
import Library from '@/pages/Library';
import Setup from '@/pages/Setup';

export default function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/fill-form" element={<FillForm />} />
          <Route path="/library" element={<Library />} />
          <Route path="/edit-pdf" element={<EditPdf />} />
          <Route path="/edit-pdf/:docId" element={<FillForm />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}
