import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BookOpen, Users } from 'lucide-react';
import { subjectsAPI } from '../../services/api';

export default function StudentSubjects() {
  const { data: subjects, isLoading } = useQuery({
    queryKey: ['my-subjects'],
    queryFn: () => subjectsAPI.mySubjects().then(res => res.data),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Subjects</h1>
        <p className="text-dark-400">View and access your enrolled subjects</p>
      </div>
      
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-40 rounded-2xl" />
          ))}
        </div>
      ) : subjects?.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject, i) => (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="dashboard-card cursor-pointer group"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center text-2xl">
                  {subject.icon || '📚'}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white group-hover:text-primary-400 transition-colors">
                    {subject.name}
                  </h3>
                  <p className="text-sm text-dark-400">{subject.code}</p>
                </div>
              </div>
              <p className="text-sm text-dark-400 mt-4 line-clamp-2">
                {subject.description || 'No description available'}
              </p>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400">You haven't enrolled in any subjects yet</p>
        </div>
      )}
    </div>
  );
}
