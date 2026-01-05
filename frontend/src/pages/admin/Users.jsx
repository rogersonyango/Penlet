import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, X, Loader2, UserPlus, Shield, GraduationCap, UserCheck, UserX, Edit2 } from 'lucide-react';
import { usersAPI, adminAPI, subjectsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const CLASS_LEVELS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

export default function AdminUsers() {
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', roleFilter],
    queryFn: () => usersAPI.list({ 
      role: roleFilter === 'all' ? undefined : roleFilter,
      include_inactive: true
    }).then(res => res.data),
  });

  const { data: subjects } = useQuery({
    queryKey: ['all-subjects'],
    queryFn: () => subjectsAPI.list().then(res => res.data),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (userId) => adminAPI.toggleUserActive(userId),
    onSuccess: (res) => {
      toast.success(res.data.message);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to update user status'),
  });

  const filteredUsers = users?.filter(u => {
    const matchesSearch = `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && u.is_active) || 
      (statusFilter === 'inactive' && !u.is_active);
    return matchesSearch && matchesStatus;
  });

  const getRoleIcon = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return <Shield className="w-4 h-4 text-red-400" />;
      case 'teacher': return <Users className="w-4 h-4 text-accent-400" />;
      default: return <GraduationCap className="w-4 h-4 text-primary-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-dark-400">Manage platform users</p>
        </div>
        <button onClick={() => setShowAddTeacher(true)} className="btn-gradient flex items-center gap-2">
          <UserPlus className="w-5 h-5" /> Add Teacher
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 w-full"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'student', 'teacher', 'admin'].map((f) => (
            <button key={f} onClick={() => setRoleFilter(f)} className={`tab ${roleFilter === f ? 'active' : ''} capitalize`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <span className="text-dark-400 text-sm self-center mr-2">Status:</span>
        {['all', 'active', 'inactive'].map((s) => (
          <button 
            key={s} 
            onClick={() => setStatusFilter(s)} 
            className={`text-sm px-3 py-1 rounded-lg transition-colors ${
              statusFilter === s 
                ? 'bg-primary-500/20 text-primary-300' 
                : 'text-dark-400 hover:text-white hover:bg-dark-700'
            } capitalize`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : filteredUsers?.length > 0 ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Class</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className={!user.is_active ? 'opacity-60' : ''}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                        user.is_active 
                          ? 'bg-gradient-to-br from-primary-500 to-accent-500' 
                          : 'bg-dark-600'
                      }`}>
                        {user.first_name?.[0]}{user.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-white">{user.first_name} {user.last_name}</p>
                        <p className="text-sm text-dark-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="flex items-center gap-1 capitalize">
                      {getRoleIcon(user.role)}
                      {user.role?.toLowerCase()}
                    </span>
                  </td>
                  <td>
                    <span className="text-dark-300">{user.student_class || '-'}</span>
                  </td>
                  <td>
                    <span className={`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm font-medium bg-dark-700 text-dark-300 hover:text-white hover:bg-dark-600 transition-colors"
                        title="Edit user"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => toggleActiveMutation.mutate(user.id)}
                        disabled={toggleActiveMutation.isPending}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          user.is_active 
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                            : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                        }`}
                        title={user.is_active ? 'Deactivate user' : 'Activate user'}
                      >
                        {user.is_active ? (
                          <>
                            <UserX className="w-4 h-4" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4" />
                            Activate
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400">No users found</p>
        </div>
      )}

      {/* Add Teacher Modal */}
      <AnimatePresence>
        {showAddTeacher && (
          <AddTeacherModal
            subjects={subjects}
            onClose={() => setShowAddTeacher(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['users'] });
              setShowAddTeacher(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <EditUserModal
            user={editingUser}
            subjects={subjects}
            onClose={() => setEditingUser(null)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['users'] });
              setEditingUser(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Add Teacher Modal Component
function AddTeacherModal({ subjects, onClose, onSuccess }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const createTeacherMutation = useMutation({
    mutationFn: (data) => adminAPI.createTeacher(data),
    onSuccess: () => {
      toast.success('Teacher added successfully');
      reset();
      onSuccess();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to add teacher'),
  });

  const onSubmit = (data) => {
    data.assigned_subjects = data.assigned_subjects?.filter(Boolean) || [];
    data.assigned_classes = data.assigned_classes?.filter(Boolean) || [];
    createTeacherMutation.mutate(data);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="modal-content p-6 max-w-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Add New Teacher</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input {...register('first_name', { required: 'Required' })} className="input-field" />
              {errors.first_name && <p className="form-error">{errors.first_name.message}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input {...register('last_name', { required: 'Required' })} className="input-field" />
              {errors.last_name && <p className="form-error">{errors.last_name.message}</p>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Username *</label>
            <input {...register('username', { required: 'Required' })} className="input-field" />
            {errors.username && <p className="form-error">{errors.username.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Email *</label>
            <input type="email" {...register('email', { required: 'Required' })} className="input-field" />
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input type="password" {...register('password', { required: 'Required', minLength: 8 })} className="input-field" />
            {errors.password && <p className="form-error">{errors.password.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Phone</label>
            <input {...register('phone')} className="input-field" placeholder="+256..." />
          </div>

          <div className="form-group">
            <label className="form-label">Assign Subjects</label>
            <div className="max-h-32 overflow-y-auto space-y-2 p-3 bg-dark-700/30 rounded-lg">
              {subjects?.length > 0 ? subjects.map(subject => (
                <label key={subject.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" value={subject.id} {...register('assigned_subjects')} className="checkbox" />
                  <span className="text-sm text-dark-300">{subject.name}</span>
                </label>
              )) : (
                <p className="text-sm text-dark-500">No subjects available.</p>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Assign Classes</label>
            <div className="flex flex-wrap gap-2">
              {CLASS_LEVELS.map(level => (
                <label key={level} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" value={level} {...register('assigned_classes')} className="checkbox" />
                  <span className="text-sm text-dark-300">{level}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={createTeacherMutation.isPending} className="btn-gradient flex-1 flex items-center justify-center gap-2">
              {createTeacherMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
              Add Teacher
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// Edit User Modal Component
function EditUserModal({ user, subjects, onClose, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // Fetch user details including assigned subjects/classes
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        console.log('Fetching details for user:', user.id);
        const res = await adminAPI.getUserDetails(user.id);
        console.log('User details response:', res.data);
        setUserDetails(res.data);
        // Reset form with fetched data
        reset({
          first_name: res.data.first_name,
          last_name: res.data.last_name,
          email: res.data.email,
          phone: res.data.phone || '',
          student_class: res.data.student_class || '',
          assigned_subjects: res.data.assigned_subjects?.map(s => s.id) || [],
          assigned_classes: res.data.assigned_classes || [],
        });
      } catch (err) {
        console.error('Error fetching user details:', err);
        console.error('Error response:', err.response);
        toast.error(err.response?.data?.detail || 'Failed to load user details');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [user.id, reset, onClose]);

  const updateUserMutation = useMutation({
    mutationFn: (data) => adminAPI.updateUser(user.id, data),
    onSuccess: () => {
      toast.success('User updated successfully');
      onSuccess();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to update user'),
  });

  const onSubmit = (data) => {
    // Filter out empty values
    const cleanData = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone || null,
    };

    if (user.role?.toLowerCase() === 'student' && data.student_class) {
      cleanData.student_class = data.student_class;
    }

    if (user.role?.toLowerCase() === 'teacher') {
      cleanData.assigned_subjects = data.assigned_subjects?.filter(Boolean) || [];
      cleanData.assigned_classes = data.assigned_classes?.filter(Boolean) || [];
    }

    updateUserMutation.mutate(cleanData);
  };

  const isTeacher = user.role?.toLowerCase() === 'teacher';
  const isStudent = user.role?.toLowerCase() === 'student';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="modal-content p-6 max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Edit User</h2>
            <p className="text-sm text-dark-400 capitalize">{user.role?.toLowerCase()}</p>
          </div>
          <button onClick={onClose} className="text-dark-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input {...register('first_name', { required: 'Required' })} className="input-field" />
                {errors.first_name && <p className="form-error">{errors.first_name.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input {...register('last_name', { required: 'Required' })} className="input-field" />
                {errors.last_name && <p className="form-error">{errors.last_name.message}</p>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email *</label>
              <input type="email" {...register('email', { required: 'Required' })} className="input-field" />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Phone</label>
              <input {...register('phone')} className="input-field" placeholder="+256..." />
            </div>

            {isStudent && (
              <div className="form-group">
                <label className="form-label">Class Level</label>
                <select {...register('student_class')} className="input-field">
                  <option value="">Select class</option>
                  {CLASS_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
            )}

            {isTeacher && (
              <>
                <div className="form-group">
                  <label className="form-label">Assigned Subjects</label>
                  <div className="max-h-40 overflow-y-auto space-y-2 p-3 bg-dark-700/30 rounded-lg">
                    {subjects?.length > 0 ? subjects.map(subject => (
                      <label key={subject.id} className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          value={subject.id} 
                          {...register('assigned_subjects')} 
                          defaultChecked={userDetails?.assigned_subjects?.some(s => s.id === subject.id)}
                          className="checkbox" 
                        />
                        <span className="text-sm text-dark-300">{subject.name}</span>
                      </label>
                    )) : (
                      <p className="text-sm text-dark-500">No subjects available.</p>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned Classes</label>
                  <div className="flex flex-wrap gap-3">
                    {CLASS_LEVELS.map(level => (
                      <label key={level} className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          value={level} 
                          {...register('assigned_classes')} 
                          defaultChecked={userDetails?.assigned_classes?.includes(level)}
                          className="checkbox" 
                        />
                        <span className="text-sm text-dark-300">{level}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" disabled={updateUserMutation.isPending} className="btn-gradient flex-1 flex items-center justify-center gap-2">
                {updateUserMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                Save Changes
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}