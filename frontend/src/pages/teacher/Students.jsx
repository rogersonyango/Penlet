import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Search, GraduationCap, Mail, TrendingUp } from 'lucide-react';
import { usersAPI } from '../../services/api';

const CLASS_LEVELS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

export default function TeacherStudents() {
  const [selectedClass, setSelectedClass] = useState('');
  const [search, setSearch] = useState('');

  const { data: students, isLoading } = useQuery({
    queryKey: ['students', selectedClass],
    queryFn: () => selectedClass 
      ? usersAPI.getStudentsByClass(selectedClass).then(res => res.data)
      : usersAPI.list({ role: 'student' }).then(res => res.data),
  });

  const filteredStudents = students?.filter(s => 
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Students</h1>
        <p className="text-dark-400">View and manage your students</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 w-full"
          />
        </div>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="input-field w-full sm:w-40"
        >
          <option value="">Select class</option>
          {CLASS_LEVELS.map(level => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : filteredStudents?.length > 0 ? (
        <div className="space-y-3">
          {filteredStudents.map((student, i) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="dashboard-card flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-semibold">
                {student.first_name?.[0]}{student.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white">{student.first_name} {student.last_name}</h3>
                <div className="flex items-center gap-4 text-sm text-dark-400">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {student.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" />
                    {student.student_class}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className={`badge ${student.is_active ? 'badge-success' : 'badge-danger'}`}>
                  {student.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400">No students found</p>
        </div>
      )}

      {filteredStudents?.length > 0 && (
        <div className="text-sm text-dark-500 text-center">
          Showing {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}