import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Clock, Search, X } from 'lucide-react';
import { contentAPI } from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function StudentVideos() {
  const [search, setSearch] = useState('');
  const [playingVideo, setPlayingVideo] = useState(null);
  
  const { data: videos, isLoading } = useQuery({
    queryKey: ['videos'],
    queryFn: () => contentAPI.list({ content_type: 'video' }).then(res => res.data),
  });

  const filteredVideos = videos?.filter(v => v.title.toLowerCase().includes(search.toLowerCase()));

  const getFileUrl = (fileUrl) => {
    if (!fileUrl) return null;
    if (fileUrl.startsWith('http')) return fileUrl;
    return `${API_URL}${fileUrl}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Video Lessons</h1>
          <p className="text-dark-400">Watch educational video content</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input 
            type="text" 
            placeholder="Search videos..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="input-field pl-10 w-full sm:w-64" 
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}
        </div>
      ) : filteredVideos?.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map((video, i) => (
            <motion.div 
              key={video.id} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.05 }} 
              className="dashboard-card group cursor-pointer"
              onClick={() => setPlayingVideo(video)}
            >
              <div className="aspect-video bg-dark-700 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
              </div>
              <h3 className="font-medium text-white group-hover:text-primary-400 transition-colors">{video.title}</h3>
              <div className="flex items-center gap-4 mt-2 text-sm text-dark-400">
                <span>{video.subject?.name}</span>
                {video.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />{Math.floor(video.duration / 60)}m
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Play className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400">No videos available yet</p>
        </div>
      )}

      {/* Video Player Modal */}
      <AnimatePresence>
        {playingVideo && (
          <div 
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setPlayingVideo(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-5xl bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-dark-700">
                <div>
                  <h2 className="text-lg font-semibold text-white">{playingVideo.title}</h2>
                  <p className="text-sm text-dark-400">{playingVideo.subject?.name}</p>
                </div>
                <button onClick={() => setPlayingVideo(null)} className="p-2 text-dark-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4">
                <video 
                  controls 
                  autoPlay
                  className="w-full rounded-lg bg-black"
                  src={getFileUrl(playingVideo.file_url)}
                >
                  Your browser does not support the video tag.
                </video>
                {playingVideo.description && (
                  <div className="mt-4 p-4 bg-dark-700/30 rounded-lg">
                    <h3 className="text-sm font-medium text-white mb-2">Description</h3>
                    <p className="text-dark-400 text-sm">{playingVideo.description}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}