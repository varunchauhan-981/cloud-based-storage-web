import React, { useState, useEffect, useRef } from 'react';
import API from '../services/api';
import { 
  Folder, FolderPlus, ChevronRight, ChevronDown, Edit2, Trash2, 
  CornerDownRight, HardDrive, Home, LogOut, Search, Plus, Grid, List, 
  UserPlus, Laptop, Users, Clock, Star, Cloud, Upload, Download, 
  FileText, Image as ImageIcon, Video, Music, File, Share2, Link, Lock,
  Shield, Check, X, ArrowUpDown, RotateCcw
} from 'lucide-react';

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState('my-drive');
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [allFolders, setAllFolders] = useState([]);
  const [starredIds, setStarredIds] = useState([]);
  const [trashedFolders, setTrashedFolders] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'My Drive' }]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [isTreeExpanded, setIsTreeExpanded] = useState(true);

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'created_at' | 'size'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  // Drag & Drop / Uploading
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  // Modals & Action States
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [renamingItem, setRenamingItem] = useState(null); // { type: 'file' | 'folder', item }
  const [movingItem, setMovingItem] = useState(null);     // { type: 'file' | 'folder', item }
  const [targetParentId, setTargetParentId] = useState('null');

  // Sharing Modal State
  const [sharingFile, setSharingFile] = useState(null);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState('viewer');
  const [publicLinkData, setPublicLinkData] = useState(null);
  const [linkPassword, setLinkPassword] = useState('');
  const [linkExpiryHours, setLinkExpiryHours] = useState('24');
  const [copiedLink, setCopiedLink] = useState(false);

  // Profile Switcher State
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [savedAccounts, setSavedAccounts] = useState([]);
  const profileRef = useRef(null);

  // Load User & Local Storage
  useEffect(() => {
    const rawUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (rawUser && token) {
      const parsed = JSON.parse(rawUser);
      setCurrentUser(parsed);
      let accounts = JSON.parse(localStorage.getItem('cloudbox_accounts') || '[]');
      const idx = accounts.findIndex(a => a.user.id === parsed.id);
      if (idx !== -1) accounts[idx] = { user: parsed, token };
      else accounts.push({ user: parsed, token });
      localStorage.setItem('cloudbox_accounts', JSON.stringify(accounts));
      setSavedAccounts(accounts);
    }
    setStarredIds(JSON.parse(localStorage.getItem('drive_starred') || '[]'));
    setTrashedFolders(JSON.parse(localStorage.getItem('drive_trash') || '[]'));

    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Folders & Files
  const loadData = async () => {
    try {
      const parentId = currentFolder?.id ? currentFolder.id : 'null';
      const [fldRes, treeRes, fileRes] = await Promise.all([
        API.get(`/folders?parentId=${parentId}`),
        API.get('/folders/tree'),
        API.get(`/files?folderId=${parentId}&search=${searchQuery}&type=${typeFilter}&sortBy=${sortBy}&order=${sortOrder}`)
      ]);
      setFolders(fldRes.data);
      setAllFolders(treeRes.data);
      setFiles(fileRes.data);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  useEffect(() => {
    if (activeSection === 'my-drive') {
      loadData();
    }
  }, [currentFolder, activeSection, typeFilter, sortBy, sortOrder, searchQuery]);

  // Section Switcher
  const handleSwitchSection = (sectionKey, sectionTitle) => {
    setActiveSection(sectionKey);
    setCurrentFolder(null);
    setBreadcrumbs([{ id: null, name: sectionTitle }]);
  };

  // Folder Open
  const handleOpenFolder = (folder) => {
    if (!folder || !folder.id) return;
    setActiveSection('my-drive');
    setCurrentFolder(folder);
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index) => {
    const selected = breadcrumbs[index];
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    setCurrentFolder(selected.id ? { id: selected.id, name: selected.name } : null);
  };

  // Upload Logic
  const handleFileUpload = async (uploadedFiles) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(uploadedFiles)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folderId', currentFolder?.id ? currentFolder.id : 'null');
        await API.post('/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'File upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Drag & Drop Handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // File Download
  const handleDownloadFile = async (fileId) => {
    try {
      const res = await API.get(`/files/${fileId}/download`);
      window.open(res.data.downloadUrl, '_blank');
    } catch (err) {
      alert(err.response?.data?.error || 'Download failed');
    }
  };

  // File Delete
  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Delete this file permanently?')) return;
    try {
      await API.delete(`/files/${fileId}`);
      loadData();
    } catch (err) {
      alert('Delete failed');
    }
  };

  // Star Toggle
  const toggleStar = (folder, e) => {
    e.stopPropagation();
    let updated;
    if (starredIds.includes(folder.id)) {
      updated = starredIds.filter(id => id !== folder.id);
    } else {
      updated = [...starredIds, folder.id];
    }
    setStarredIds(updated);
    localStorage.setItem('drive_starred', JSON.stringify(updated));
  };

  // Trash & Restore
  const handleMoveFolderToTrash = (folder, e) => {
    e.stopPropagation();
    if (!window.confirm(`Move "${folder.name}" to Trash?`)) return;
    const newTrash = [...trashedFolders, { ...folder, trashedAt: new Date().toISOString() }];
    setTrashedFolders(newTrash);
    localStorage.setItem('drive_trash', JSON.stringify(newTrash));
    setFolders(folders.filter(f => f.id !== folder.id));
    setAllFolders(allFolders.filter(f => f.id !== folder.id));
  };

  const handleRestoreFolder = (folder, e) => {
    e.stopPropagation();
    const updated = trashedFolders.filter(f => f.id !== folder.id);
    setTrashedFolders(updated);
    localStorage.setItem('drive_trash', JSON.stringify(updated));
    loadData();
  };

  const handlePermanentDeleteFolder = async (folderId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete permanently? This cannot be undone.')) return;
    try {
      await API.delete(`/folders/${folderId}`);
      const updated = trashedFolders.filter(f => f.id !== folderId);
      setTrashedFolders(updated);
      localStorage.setItem('drive_trash', JSON.stringify(updated));
    } catch (err) {
      alert('Failed to delete');
    }
  };

  // Rename
  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!folderNameInput.trim()) return;
    try {
      if (renamingItem.type === 'folder') {
        await API.patch(`/folders/${renamingItem.item.id}/rename`, { name: folderNameInput.trim() });
      } else {
        await API.patch(`/files/${renamingItem.item.id}/rename`, { name: folderNameInput.trim() });
      }
      setRenamingItem(null);
      setFolderNameInput('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Rename failed');
    }
  };

  // Move
  const handleMoveSubmit = async (e) => {
    e.preventDefault();
    try {
      if (movingItem.type === 'folder') {
        await API.patch(`/folders/${movingItem.item.id}/move`, {
          targetParentId: targetParentId === 'null' ? null : targetParentId
        });
      } else {
        await API.patch(`/files/${movingItem.item.id}/move`, {
          targetFolderId: targetParentId === 'null' ? null : targetParentId
        });
      }
      setMovingItem(null);
      setTargetParentId('null');
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Move failed');
    }
  };

  // Sharing Functions
  const openShareModal = async (file) => {
    setSharingFile(file);
    setPublicLinkData(null);
    setCopiedLink(false);
    try {
      const res = await API.get(`/files/${file.id}/shares`);
      setSharedUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddUserShare = async (e) => {
    e.preventDefault();
    if (!shareEmail.trim()) return;
    try {
      await API.post(`/files/${sharingFile.id}/share`, { email: shareEmail, role: shareRole });
      setShareEmail('');
      const res = await API.get(`/files/${sharingFile.id}/shares`);
      setSharedUsers(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Share failed');
    }
  };

  const handleRevokeShare = async (shareId) => {
    try {
      await API.delete(`/files/shares/${shareId}`);
      setSharedUsers(sharedUsers.filter(s => s.id !== shareId));
    } catch (err) {
      alert('Revoke failed');
    }
  };

  const handleCreatePublicLink = async () => {
    try {
      const res = await API.post(`/files/${sharingFile.id}/public-link`, {
        expiresInHours: Number(linkExpiryHours),
        password: linkPassword || null
      });
      const generatedUrl = `${window.location.origin}/share/${res.data.token}`;
      setPublicLinkData({ ...res.data, url: generatedUrl });
    } catch (err) {
      alert('Public link creation failed');
    }
  };

  // Format Helpers
  const getFileIcon = (mimeType = '') => {
    if (mimeType.includes('image')) return <ImageIcon className="w-5 h-5 text-emerald-400 shrink-0" />;
    if (mimeType.includes('pdf') || mimeType.includes('text')) return <FileText className="w-5 h-5 text-rose-400 shrink-0" />;
    if (mimeType.includes('video')) return <Video className="w-5 h-5 text-indigo-400 shrink-0" />;
    if (mimeType.includes('audio')) return <Music className="w-5 h-5 text-amber-400 shrink-0" />;
    return <File className="w-5 h-5 text-blue-400 shrink-0" />;
  };

  const formatSize = (bytes = 0) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getInitial = (name, email) => {
    if (name) return name.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return 'U';
  };

  const trashedIds = trashedFolders.map(t => t.id);
  const activeFolders = folders.filter(f => !trashedIds.includes(f.id));

  return (
    <div 
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex h-screen bg-[#131314] text-[#e3e3e3] font-sans antialiased select-none relative"
    >
      {/* Hidden File Picker */}
      <input 
        type="file" 
        multiple 
        ref={fileInputRef} 
        onChange={(e) => handleFileUpload(e.target.files)} 
        className="hidden" 
      />

      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-[#004a77]/85 backdrop-blur-sm z-50 flex flex-col items-center justify-center border-4 border-dashed border-[#8ab4f8] pointer-events-none">
          <Upload className="w-16 h-16 text-[#c2e7ff] animate-bounce mb-3" />
          <h2 className="text-xl font-semibold text-white">Drop files to instantly upload to Drive</h2>
        </div>
      )}

      {/* 1. Left Sidebar */}
      <aside className="w-64 flex flex-col justify-between py-3 px-3 bg-[#131314] shrink-0 border-r border-[#282a2c]/60">
        <div className="space-y-4">
          
          {/* Logo */}
          <div 
            onClick={() => handleSwitchSection('my-drive', 'My Drive')} 
            className="flex items-center gap-3 px-3 py-1 cursor-pointer group"
          >
            <div className="p-1 rounded-xl group-hover:bg-[#282a2c] transition-colors">
              <HardDrive className="w-7 h-7 text-[#4285F4]" />
            </div>
            <span className="text-[22px] font-normal tracking-wide">Drive</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 px-1">
            <button
              onClick={() => { setFolderNameInput(''); setShowCreateFolderModal(true); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#282a2c] hover:bg-[#333537] active:scale-[0.98] text-[#e3e3e3] rounded-2xl border border-[#3c4043]/40 text-xs font-semibold cursor-pointer shadow transition-all"
            >
              <FolderPlus className="w-4 h-4 text-[#8ab4f8]" />
              <span>Folder</span>
            </button>
            <button
              onClick={() => fileInputRef.current.click()}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#004a77] hover:bg-[#003859] active:scale-[0.98] text-[#c2e7ff] rounded-2xl text-xs font-semibold cursor-pointer shadow transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 text-sm font-medium">
            <div>
              <div 
                onClick={() => handleSwitchSection('my-drive', 'My Drive')}
                className={`flex items-center justify-between px-4 py-2 rounded-full cursor-pointer transition-all ${
                  activeSection === 'my-drive' ? 'bg-[#004a77] text-[#c2e7ff] font-semibold' : 'hover:bg-[#1e1f20] text-[#c4c7c5]'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Home className="w-4 h-4" />
                  <span>My Drive</span>
                </div>
                {allFolders.length > 0 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsTreeExpanded(!isTreeExpanded); }}
                    className="p-1 hover:bg-[#003859] rounded-full text-[#c2e7ff]"
                  >
                    {isTreeExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* Sub-tree */}
              {isTreeExpanded && allFolders.length > 0 && (
                <div className="ml-6 pl-2 border-l border-[#282a2c] space-y-0.5 my-1 max-h-40 overflow-y-auto">
                  {allFolders
                    .filter(f => !trashedIds.includes(f.id))
                    .map((f) => (
                      <div
                        key={`sidebar-tree-${f.id}`}
                        onClick={() => handleOpenFolder(f)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs cursor-pointer transition-colors ${
                          currentFolder?.id === f.id ? 'bg-[#004a77]/60 text-[#c2e7ff] font-medium' : 'hover:bg-[#1e1f20] text-[#9aa0a6] hover:text-white'
                        }`}
                      >
                        <Folder className="w-3.5 h-3.5 text-[#8ab4f8] shrink-0" />
                        <span className="truncate">{f.name}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div onClick={() => handleSwitchSection('computers', 'Computers')} className={`flex items-center gap-3.5 px-4 py-2 rounded-full cursor-pointer transition-all ${activeSection === 'computers' ? 'bg-[#004a77] text-[#c2e7ff]' : 'hover:bg-[#1e1f20] text-[#c4c7c5]'}`}>
              <Laptop className="w-4 h-4" /><span>Computers</span>
            </div>
            <div onClick={() => handleSwitchSection('shared', 'Shared with me')} className={`flex items-center gap-3.5 px-4 py-2 rounded-full cursor-pointer transition-all ${activeSection === 'shared' ? 'bg-[#004a77] text-[#c2e7ff]' : 'hover:bg-[#1e1f20] text-[#c4c7c5]'}`}>
              <Users className="w-4 h-4" /><span>Shared with me</span>
            </div>
            <div onClick={() => handleSwitchSection('recent', 'Recent')} className={`flex items-center gap-3.5 px-4 py-2 rounded-full cursor-pointer transition-all ${activeSection === 'recent' ? 'bg-[#004a77] text-[#c2e7ff]' : 'hover:bg-[#1e1f20] text-[#c4c7c5]'}`}>
              <Clock className="w-4 h-4" /><span>Recent</span>
            </div>
            <div onClick={() => handleSwitchSection('starred', 'Starred')} className={`flex items-center justify-between px-4 py-2 rounded-full cursor-pointer transition-all ${activeSection === 'starred' ? 'bg-[#004a77] text-[#c2e7ff]' : 'hover:bg-[#1e1f20] text-[#c4c7c5]'}`}>
              <div className="flex items-center gap-3.5"><Star className="w-4 h-4" /><span>Starred</span></div>
              {starredIds.length > 0 && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#282a2c] text-[#8e918f]">{starredIds.length}</span>}
            </div>
            <div onClick={() => handleSwitchSection('trash', 'Trash')} className={`flex items-center justify-between px-4 py-2 rounded-full cursor-pointer transition-all ${activeSection === 'trash' ? 'bg-[#004a77] text-[#c2e7ff]' : 'hover:bg-[#1e1f20] text-[#c4c7c5]'}`}>
              <div className="flex items-center gap-3.5"><Trash2 className="w-4 h-4" /><span>Trash</span></div>
              {trashedFolders.length > 0 && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#282a2c] text-[#8e918f]">{trashedFolders.length}</span>}
            </div>
          </nav>
        </div>

        {/* Storage status */}
        <div className="px-3 py-3 border-t border-[#282a2c]/60 space-y-2">
          <div className="flex justify-between text-xs text-[#c4c7c5]">
            <div className="flex items-center gap-2"><Cloud className="w-4 h-4 text-[#8ab4f8]" /><span>Storage</span></div>
            <span className="text-[11px] text-[#8e918f]">8% used</span>
          </div>
          <div className="w-full h-1.5 bg-[#282a2c] rounded-full overflow-hidden">
            <div className="bg-[#8ab4f8] h-full w-[8%]"></div>
          </div>
          <p className="text-[11px] text-[#8e918f]">1.2 GB of 15 GB used</p>
        </div>
      </aside>

      {/* 2. Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#1e1f20] m-2 rounded-2xl border border-[#282a2c] overflow-hidden shadow-2xl">
        
        {/* Top Header Bar */}
        <header className="h-16 px-6 flex items-center justify-between gap-4 border-b border-[#282a2c]">
          
          {/* Search */}
          <div className="flex-1 max-w-xl relative">
            <Search className="w-5 h-5 text-[#8e918f] absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search in Drive..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2 bg-[#282a2c] text-sm rounded-full placeholder-[#8e918f] focus:outline-none focus:ring-1 focus:ring-[#8ab4f8] transition-all"
            />
          </div>

          {/* Sort, View & Profile Switcher */}
          <div className="flex items-center gap-2">
            
            {/* Sort Dropdown (Name, Modified Time, Size) */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#282a2c] text-xs px-3 py-2 rounded-xl text-[#c4c7c5] focus:outline-none cursor-pointer border border-[#3c4043]/30"
            >
              <option value="name">Sort by: Name</option>
              <option value="created_at">Sort by: Modified Time</option>
              <option value="size">Sort by: File Size</option>
            </select>

            {/* Sort Order Toggle */}
            <button 
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} 
              className="p-2 hover:bg-[#282a2c] rounded-xl text-[#c4c7c5] cursor-pointer"
              title={`Order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>

            {/* Type Filter */}
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#282a2c] text-xs px-3 py-2 rounded-xl text-[#c4c7c5] focus:outline-none cursor-pointer border border-[#3c4043]/30"
            >
              <option value="all">All Types</option>
              <option value="image">Images</option>
              <option value="pdf">PDFs & Docs</option>
              <option value="video">Videos</option>
            </select>

            {/* View Mode Toggle */}
            <button 
              onClick={() => setViewMode(prev => prev === 'grid' ? 'list' : 'grid')} 
              className="p-2 hover:bg-[#282a2c] rounded-xl text-[#c4c7c5] cursor-pointer"
              title={`Current: ${viewMode === 'grid' ? 'Grid' : 'List'} View`}
            >
              {viewMode === 'grid' ? <List className="w-5 h-5 text-[#8ab4f8]" /> : <Grid className="w-5 h-5 text-[#8ab4f8]" />}
            </button>

            {/* Profile Avatar & Switcher */}
            <div className="relative ml-2" ref={profileRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-medium flex items-center justify-center text-sm shadow cursor-pointer border border-[#444746] hover:ring-2 hover:ring-[#8ab4f8]"
              >
                {getInitial(currentUser?.user_metadata?.full_name, currentUser?.email)}
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-12 w-80 bg-[#282a2c] border border-[#444746] rounded-3xl shadow-2xl z-50 p-4 space-y-4">
                  <div className="flex flex-col items-center text-center pb-3 border-b border-[#3c4043]">
                    <div className="w-14 h-14 rounded-full bg-blue-600 text-white text-xl font-medium flex items-center justify-center mb-2">
                      {getInitial(currentUser?.user_metadata?.full_name, currentUser?.email)}
                    </div>
                    <span className="font-semibold text-sm text-[#e3e3e3]">{currentUser?.user_metadata?.full_name || 'Drive User'}</span>
                    <span className="text-xs text-[#9aa0a6] mt-0.5">{currentUser?.email}</span>
                  </div>

                  <div className="space-y-1 max-h-44 overflow-y-auto">
                    <span className="text-[11px] font-semibold text-[#9aa0a6] uppercase tracking-wider px-2">Other Accounts</span>
                    {savedAccounts
                      .filter(acc => acc.user.id !== currentUser?.id)
                      .map((acc) => (
                        <div
                          key={acc.user.id}
                          onClick={() => {
                            localStorage.setItem('token', acc.token);
                            localStorage.setItem('user', JSON.stringify(acc.user));
                            window.location.reload();
                          }}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-[#333537] cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3 truncate">
                            <div className="w-7 h-7 rounded-full bg-slate-700 text-xs font-semibold flex items-center justify-center shrink-0">
                              {getInitial(acc.user.user_metadata?.full_name, acc.user.email)}
                            </div>
                            <div className="text-left truncate">
                              <p className="text-xs font-medium text-[#e3e3e3] truncate">{acc.user.user_metadata?.full_name || acc.user.email}</p>
                              <p className="text-[10px] text-[#9aa0a6] truncate">{acc.user.email}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  <div className="pt-2 border-t border-[#3c4043] space-y-1">
                    <button
                      onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = '/login'; }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-[#333537] text-[#c4c7c5] hover:text-white cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" /><span>Add another account</span>
                    </button>
                    <button
                      onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-[#333537] text-red-400 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" /><span>Sign out of all accounts</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Breadcrumbs Path Bar */}
        <div className="h-12 px-6 flex items-center justify-between border-b border-[#282a2c]/60">
          <nav className="flex items-center gap-1 text-sm font-medium">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id || 'root'}>
                {idx > 0 && <ChevronRight className="w-4 h-4 text-[#8e918f]" />}
                <button
                  onClick={() => handleBreadcrumbClick(idx)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    idx === breadcrumbs.length - 1 ? 'text-[#e3e3e3] font-semibold bg-[#282a2c]' : 'text-[#8e918f] hover:text-[#e3e3e3]'
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </nav>
          {uploading && <span className="text-xs text-[#8ab4f8] animate-pulse">Uploading file...</span>}
        </div>

        {/* Workspace Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Section: Computers */}
          {activeSection === 'computers' && (
            <div className="h-80 flex flex-col items-center justify-center text-center text-[#8e918f]">
              <Laptop className="w-12 h-12 text-[#8ab4f8] mb-3" />
              <h4 className="text-base font-medium text-white">No computers syncing</h4>
              <p className="text-xs max-w-sm mt-1">Folders on your computer synced with Drive will appear here.</p>
            </div>
          )}

          {/* Section: Shared with me */}
          {activeSection === 'shared' && (
            <div className="h-80 flex flex-col items-center justify-center text-center text-[#8e918f]">
              <Users className="w-12 h-12 text-[#8ab4f8] mb-3" />
              <h4 className="text-base font-medium text-white">No items shared with you</h4>
              <p className="text-xs max-w-sm mt-1">Files shared by other users will be listed here.</p>
            </div>
          )}

          {/* Section: Trash */}
          {activeSection === 'trash' && (
            <div>
              <span className="text-xs font-semibold text-[#8e918f] uppercase tracking-wider">Trash Items</span>
              {trashedFolders.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-[#8e918f] border border-dashed border-[#282a2c] rounded-2xl mt-2">
                  <Trash2 className="w-10 h-10 text-[#444746] mb-2" />
                  <p className="text-xs">Trash is empty</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
                  {trashedFolders.map((f) => (
                    <div key={f.id} className="bg-[#282a2c] p-3.5 rounded-xl flex items-center justify-between border border-[#444746]/40">
                      <div className="flex items-center gap-3 truncate">
                        <Folder className="w-5 h-5 text-[#8ab4f8] shrink-0" />
                        <span className="text-sm font-medium truncate">{f.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => handleRestoreFolder(f, e)} title="Restore" className="p-1 hover:text-blue-400 cursor-pointer"><RotateCcw className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => handlePermanentDeleteFolder(f.id, e)} title="Delete Forever" className="p-1 hover:text-red-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section: My Drive / Recent / Starred */}
          {['my-drive', 'recent', 'starred'].includes(activeSection) && (
            <>
              {/* Folders Section */}
              {activeFolders.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-[#8e918f] uppercase tracking-wider">Folders</span>

                  {viewMode === 'grid' ? (
                    /* Folder Grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
                      {activeFolders.map((f) => {
                        const isStarred = starredIds.includes(f.id);
                        return (
                          <div
                            key={f.id}
                            onClick={() => handleOpenFolder(f)}
                            className="group bg-[#282a2c] hover:bg-[#333537] border border-transparent hover:border-[#444746] rounded-xl p-3.5 transition-all flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1 pointer-events-none">
                              <Folder className="w-6 h-6 text-[#8ab4f8] fill-[#8ab4f8]/20 shrink-0" />
                              <span className="text-sm font-medium text-[#e3e3e3] truncate">{f.name}</span>
                            </div>

                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => toggleStar(f, e)}
                                className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                                  isStarred ? 'text-yellow-400' : 'text-[#8e918f] opacity-0 group-hover:opacity-100 hover:text-white'
                                }`}
                              >
                                <Star className="w-3.5 h-3.5" fill={isStarred ? "currentColor" : "none"} />
                              </button>

                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setRenamingItem({ type: 'folder', item: f }); setFolderNameInput(f.name); }} className="p-1 hover:text-white text-[#c4c7c5]"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => { setMovingItem({ type: 'folder', item: f }); setTargetParentId('null'); }} className="p-1 hover:text-white text-[#c4c7c5]"><CornerDownRight className="w-3.5 h-3.5" /></button>
                                <button onClick={(e) => handleMoveFolderToTrash(f, e)} className="p-1 hover:text-red-400 text-[#c4c7c5]"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Folder List */
                    <div className="border border-[#282a2c] rounded-xl overflow-hidden mt-2">
                      <table className="w-full text-left text-xs text-[#c4c7c5]">
                        <thead className="bg-[#282a2c] text-[#8e918f]">
                          <tr>
                            <th className="px-4 py-2.5">Folder Name</th>
                            <th className="px-4 py-2.5">Type</th>
                            <th className="px-4 py-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#282a2c]">
                          {activeFolders.map(f => (
                            <tr key={f.id} onClick={() => handleOpenFolder(f)} className="hover:bg-[#282a2c]/60 cursor-pointer">
                              <td className="px-4 py-2.5 flex items-center gap-2 font-medium text-[#e3e3e3]">
                                <Folder className="w-4 h-4 text-[#8ab4f8] fill-[#8ab4f8]/20 shrink-0" />
                                <span>{f.name}</span>
                              </td>
                              <td className="px-4 py-2.5 text-[#8e918f]">Folder</td>
                              <td className="px-4 py-2.5 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => { setRenamingItem({ type: 'folder', item: f }); setFolderNameInput(f.name); }} className="hover:text-white"><Edit2 className="w-3.5 h-3.5 inline" /></button>
                                <button onClick={() => { setMovingItem({ type: 'folder', item: f }); setTargetParentId('null'); }} className="hover:text-white"><CornerDownRight className="w-3.5 h-3.5 inline" /></button>
                                <button onClick={(e) => handleMoveFolderToTrash(f, e)} className="hover:text-red-400"><Trash2 className="w-3.5 h-3.5 inline" /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Files Section */}
              <div>
                <span className="text-xs font-semibold text-[#8e918f] uppercase tracking-wider">Files</span>
                {files.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-[#8e918f] border border-dashed border-[#282a2c] rounded-2xl mt-2">
                    <Upload className="w-8 h-8 text-[#444746] mb-2" />
                    <p className="text-xs">Drag and drop files here, or click Upload</p>
                  </div>
                ) : viewMode === 'grid' ? (
                  /* Files Grid */
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
                    {files.map(file => (
                      <div key={file.id} className="group bg-[#282a2c] hover:bg-[#333537] p-3.5 rounded-xl flex flex-col justify-between border border-transparent hover:border-[#444746] transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          {getFileIcon(file.mime_type)}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <span className="text-[11px] text-[#8e918f]">{formatSize(file.size)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-1 mt-4 pt-2 border-t border-[#3c4043]/40">
                          <button title="Share" onClick={() => openShareModal(file)} className="p-1.5 hover:text-white text-[#8ab4f8] cursor-pointer"><Share2 className="w-3.5 h-3.5" /></button>
                          <button title="Download" onClick={() => handleDownloadFile(file.id)} className="p-1.5 hover:text-white text-[#c4c7c5] cursor-pointer"><Download className="w-3.5 h-3.5" /></button>
                          <button title="Rename" onClick={() => { setRenamingItem({ type: 'file', item: file }); setFolderNameInput(file.name); }} className="p-1.5 hover:text-white text-[#c4c7c5] cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button title="Move" onClick={() => { setMovingItem({ type: 'file', item: file }); setTargetParentId('null'); }} className="p-1.5 hover:text-white text-[#c4c7c5] cursor-pointer"><CornerDownRight className="w-3.5 h-3.5" /></button>
                          <button title="Delete" onClick={() => handleDeleteFile(file.id)} className="p-1.5 hover:text-red-400 text-[#c4c7c5] cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Files List */
                  <div className="border border-[#282a2c] rounded-xl overflow-hidden mt-2">
                    <table className="w-full text-left text-xs text-[#c4c7c5]">
                      <thead className="bg-[#282a2c] text-[#8e918f]">
                        <tr>
                          <th className="px-4 py-2.5">Name</th>
                          <th className="px-4 py-2.5">Size</th>
                          <th className="px-4 py-2.5">Modified Time</th>
                          <th className="px-4 py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#282a2c]">
                        {files.map(file => (
                          <tr key={file.id} className="hover:bg-[#282a2c]/60">
                            <td className="px-4 py-2.5 flex items-center gap-2 font-medium text-[#e3e3e3]">
                              {getFileIcon(file.mime_type)}
                              <span className="truncate">{file.name}</span>
                            </td>
                            <td className="px-4 py-2.5">{formatSize(file.size)}</td>
                            <td className="px-4 py-2.5 text-[#8e918f]">{new Date(file.created_at).toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right space-x-2">
                              <button onClick={() => openShareModal(file)} className="hover:text-white text-[#8ab4f8]" title="Share"><Share2 className="w-3.5 h-3.5 inline" /></button>
                              <button onClick={() => handleDownloadFile(file.id)} className="hover:text-white" title="Download"><Download className="w-3.5 h-3.5 inline" /></button>
                              <button onClick={() => { setRenamingItem({ type: 'file', item: file }); setFolderNameInput(file.name); }} className="hover:text-white" title="Rename"><Edit2 className="w-3.5 h-3.5 inline" /></button>
                              <button onClick={() => { setMovingItem({ type: 'file', item: file }); setTargetParentId('null'); }} className="hover:text-white" title="Move"><CornerDownRight className="w-3.5 h-3.5 inline" /></button>
                              <button onClick={() => handleDeleteFile(file.id)} className="hover:text-red-400" title="Delete"><Trash2 className="w-3.5 h-3.5 inline" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>

      {/* Share Modal */}
      {sharingFile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#282a2c] border border-[#444746] p-6 rounded-3xl w-full max-w-md space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold truncate">Share "{sharingFile.name}"</h3>
              <button onClick={() => setSharingFile(null)} className="text-[#8e918f] hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {/* Email Share */}
            <form onSubmit={handleAddUserShare} className="flex gap-2">
              <input 
                type="email" 
                placeholder="User email..." 
                value={shareEmail} 
                onChange={(e) => setShareEmail(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-[#1e1f20] border border-[#444746] rounded-xl text-xs outline-none focus:border-[#8ab4f8]"
              />
              <select 
                value={shareRole} 
                onChange={(e) => setShareRole(e.target.value)}
                className="bg-[#1e1f20] border border-[#444746] px-2 py-1.5 rounded-xl text-xs outline-none"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <button type="submit" className="px-3 py-1.5 bg-[#8ab4f8] text-[#041e49] font-semibold rounded-xl text-xs cursor-pointer">Share</button>
            </form>

            {/* Access List */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase text-[#8e918f]">People with access</span>
              <div className="max-h-28 overflow-y-auto space-y-1">
                {sharedUsers.length === 0 ? <p className="text-xs text-[#8e918f]">Only you have access</p> : 
                  sharedUsers.map(user => (
                    <div key={user.id} className="flex justify-between items-center bg-[#1e1f20] p-2 rounded-lg text-xs">
                      <span>{user.shared_with_email} ({user.role})</span>
                      <button onClick={() => handleRevokeShare(user.id)} className="text-red-400 hover:underline cursor-pointer">Revoke</button>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Public Link Generator */}
            <div className="pt-3 border-t border-[#3c4043] space-y-3">
              <span className="text-xs font-semibold">General Public Link</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input 
                  type="password" 
                  placeholder="Password (Optional)" 
                  value={linkPassword}
                  onChange={(e) => setLinkPassword(e.target.value)}
                  className="px-2 py-1.5 bg-[#1e1f20] border border-[#444746] rounded-lg outline-none"
                />
                <select 
                  value={linkExpiryHours}
                  onChange={(e) => setLinkExpiryHours(e.target.value)}
                  className="px-2 py-1.5 bg-[#1e1f20] border border-[#444746] rounded-lg outline-none"
                >
                  <option value="24">Expires in 24 Hours</option>
                  <option value="72">Expires in 3 Days</option>
                  <option value="168">Expires in 7 Days</option>
                </select>
              </div>

              {!publicLinkData ? (
                <button onClick={handleCreatePublicLink} className="w-full py-2 bg-[#333537] hover:bg-[#434547] text-[#8ab4f8] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer">
                  <Link className="w-3.5 h-3.5" /> Create Public Link
                </button>
              ) : (
                <div className="p-2.5 bg-[#1e1f20] border border-blue-500/30 rounded-xl space-y-1.5">
                  <span className="text-[11px] text-blue-400 font-semibold block">Public Link Active</span>
                  <div className="flex items-center gap-2">
                    <input readOnly value={publicLinkData.url} className="flex-1 bg-transparent text-[11px] text-[#e3e3e3] outline-none truncate" />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(publicLinkData.url);
                        setCopiedLink(true);
                      }} 
                      className="text-xs text-[#8ab4f8] hover:underline shrink-0 cursor-pointer"
                    >
                      {copiedLink ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Modal: New Folder */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#282a2c] border border-[#444746] p-6 rounded-3xl w-full max-w-sm space-y-4">
            <h3 className="text-sm font-semibold">New Folder</h3>
            <input 
              type="text" 
              placeholder="Untitled folder" 
              value={folderNameInput} 
              onChange={(e) => setFolderNameInput(e.target.value)} 
              className="w-full px-3 py-2 bg-[#1e1f20] border border-[#444746] rounded-xl text-sm outline-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreateFolderModal(false)} className="text-xs text-[#8ab4f8] px-3 py-1.5 cursor-pointer">Cancel</button>
              <button 
                onClick={async () => {
                  if (!folderNameInput.trim()) return;
                  await API.post('/folders', { name: folderNameInput.trim(), parent_id: currentFolder?.id || null });
                  setShowCreateFolderModal(false);
                  loadData();
                }} 
                className="bg-[#8ab4f8] text-[#041e49] px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rename */}
      {renamingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleRenameSubmit} className="bg-[#282a2c] border border-[#444746] p-6 rounded-3xl w-full max-w-sm space-y-4">
            <h3 className="text-sm font-semibold">Rename {renamingItem.type}</h3>
            <input 
              type="text" 
              autoFocus
              value={folderNameInput} 
              onChange={(e) => setFolderNameInput(e.target.value)} 
              className="w-full px-3 py-2 bg-[#1e1f20] border border-[#444746] rounded-xl text-sm outline-none"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRenamingItem(null)} className="text-xs text-[#8ab4f8] px-3 py-1.5 cursor-pointer">Cancel</button>
              <button type="submit" className="bg-[#8ab4f8] text-[#041e49] px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer">Save</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Move */}
      {movingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleMoveSubmit} className="bg-[#282a2c] border border-[#444746] p-6 rounded-3xl w-full max-w-sm space-y-4">
            <h3 className="text-sm font-semibold">Move {movingItem.type}</h3>
            <select 
              value={targetParentId}
              onChange={(e) => setTargetParentId(e.target.value)}
              className="w-full px-3 py-2 bg-[#1e1f20] border border-[#444746] rounded-xl text-sm outline-none"
            >
              <option value="null">My Drive (Root)</option>
              {allFolders
                .filter(f => movingItem.type !== 'folder' || f.id !== movingItem.item.id)
                .map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
            </select>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setMovingItem(null)} className="text-xs text-[#8ab4f8] px-3 py-1.5 cursor-pointer">Cancel</button>
              <button type="submit" className="bg-[#8ab4f8] text-[#041e49] px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer">Move</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default Dashboard;