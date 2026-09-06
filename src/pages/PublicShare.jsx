import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API from '../services/api';
import { Download, FileText, Lock, AlertCircle, HardDrive } from 'lucide-react';

const PublicShare = () => {
  const { token } = useParams();
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchSharedFile = async (pwd = '') => {
    setLoading(true);
    setError('');
    try {
      const endpoint = `/shares/public/${token}${pwd ? `?password=${encodeURIComponent(pwd)}` : ''}`;
      const res = await API.get(endpoint);
      setFileData(res.data);
      setRequiresPassword(false);
    } catch (err) {
      console.error('Public fetch error:', err);
      if (err.response?.status === 401 && (err.response?.data?.requiresPassword || err.response?.data?.error?.includes('Password'))) {
        setRequiresPassword(true);
      } else {
        setError(err.response?.data?.error || 'Link expired, invalid, or file not found');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSharedFile();
    }
  }, [token]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    fetchSharedFile(password);
  };

  const handleDownload = async () => {
    if (!fileData?.downloadUrl) {
      alert('Download URL not available.');
      return;
    }

    setDownloading(true);
    try {
      // 1. Signed URL se direct fetch karke browser blob banayein
      const response = await fetch(fileData.downloadUrl);
      if (!response.ok) throw new Error('Network response not ok');
      const blob = await response.blob();

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fileData?.file?.name || 'downloaded-file');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('Direct blob fetch failed, falling back to window open:', err);
      // Fallback: Agar CORS blob block kare toh direct URL trigger karein
      window.location.href = fileData.downloadUrl;
    } finally {
      setDownloading(false);
    }
  };

  const formatSize = (bytes = 0) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-[#131314] text-[#e3e3e3] flex flex-col items-center justify-center p-4 select-none">
      <div className="flex items-center gap-2 mb-8">
        <HardDrive className="w-8 h-8 text-[#4285F4]" />
        <span className="text-2xl font-normal">Drive Share</span>
      </div>

      <div className="bg-[#282a2c] border border-[#444746] rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
        {loading ? (
          <p className="text-sm text-[#8ab4f8] animate-pulse">Loading file details...</p>
        ) : error ? (
          <div className="space-y-3">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-base font-semibold text-white">Access Denied</h3>
            <p className="text-xs text-[#8e918f]">{error}</p>
          </div>
        ) : requiresPassword ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Lock className="w-10 h-10 text-[#8ab4f8] mx-auto mb-2" />
            <h3 className="text-base font-semibold text-white">Password Protected</h3>
            <p className="text-xs text-[#8e918f]">This file requires a password to view and download.</p>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#1e1f20] border border-[#444746] rounded-xl text-sm text-[#e3e3e3] outline-none focus:border-[#8ab4f8]"
              autoFocus
            />
            <button
              type="submit"
              className="w-full py-2.5 bg-[#8ab4f8] text-[#041e49] rounded-xl text-sm font-semibold hover:bg-[#a8c7fa] cursor-pointer transition-all"
            >
              Unlock File
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-[#1e1f20] border border-[#3c4043] rounded-2xl flex items-center justify-center mx-auto">
              <FileText className="w-10 h-10 text-[#8ab4f8]" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white truncate px-2">{fileData?.file?.name}</h2>
              <p className="text-xs text-[#8e918f] mt-1">
                {formatSize(fileData?.file?.size_bytes || fileData?.file?.size)}
              </p>
            </div>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className={`w-full py-3 bg-[#8ab4f8] text-[#041e49] rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#a8c7fa] transition-all cursor-pointer ${
                downloading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              <Download className="w-4 h-4" /> {downloading ? 'Downloading...' : 'Download File'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicShare;