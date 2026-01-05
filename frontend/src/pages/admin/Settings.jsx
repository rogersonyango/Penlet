import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Bell, Shield, Database, Mail, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    toast.success('Settings saved');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-dark-400">Configure platform settings</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'general', label: 'General', icon: Settings },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'security', label: 'Security', icon: Shield },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab flex items-center gap-2 ${activeTab === tab.id ? 'active' : ''}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-card">
          <h2 className="text-lg font-semibold text-white mb-6">General Settings</h2>
          <div className="space-y-6">
            <div className="form-group">
              <label className="form-label">Platform Name</label>
              <input type="text" className="input-field" defaultValue="Penlet" />
            </div>

            <div className="form-group">
              <label className="form-label">Support Email</label>
              <input type="email" className="input-field" defaultValue="support@penlet.ug" />
            </div>

            <div className="form-group">
              <label className="form-label">Default Language</label>
              <select className="input-field">
                <option value="en">English</option>
                <option value="sw">Swahili</option>
                <option value="lg">Luganda</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Timezone</label>
              <select className="input-field">
                <option value="Africa/Kampala">Africa/Kampala (UTC+3)</option>
                <option value="Africa/Nairobi">Africa/Nairobi (UTC+3)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-4 bg-dark-700/30 rounded-xl">
              <div>
                <p className="text-white font-medium">Maintenance Mode</p>
                <p className="text-sm text-dark-400">Disable access for non-admin users</p>
              </div>
              <button className="switch">
                <span className="switch-toggle" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'notifications' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-card">
          <h2 className="text-lg font-semibold text-white mb-6">Notification Settings</h2>
          <div className="space-y-4">
            {[
              { label: 'Email notifications for new registrations', defaultChecked: true },
              { label: 'Email notifications for content uploads', defaultChecked: true },
              { label: 'Daily activity digest', defaultChecked: false },
              { label: 'Weekly analytics report', defaultChecked: true },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-dark-700/30 rounded-xl">
                <p className="text-dark-300">{item.label}</p>
                <input type="checkbox" className="checkbox" defaultChecked={item.defaultChecked} />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {activeTab === 'security' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-card">
          <h2 className="text-lg font-semibold text-white mb-6">Security Settings</h2>
          <div className="space-y-6">
            <div className="form-group">
              <label className="form-label">Maximum Login Attempts</label>
              <input type="number" className="input-field" defaultValue={5} min={1} max={10} />
              <p className="text-xs text-dark-500 mt-1">Account locks after this many failed attempts</p>
            </div>

            <div className="form-group">
              <label className="form-label">Lockout Duration (minutes)</label>
              <input type="number" className="input-field" defaultValue={30} min={5} max={1440} />
            </div>

            <div className="form-group">
              <label className="form-label">Minimum Password Length</label>
              <input type="number" className="input-field" defaultValue={8} min={6} max={32} />
            </div>

            <div className="flex items-center justify-between p-4 bg-dark-700/30 rounded-xl">
              <div>
                <p className="text-white font-medium">Require Strong Passwords</p>
                <p className="text-sm text-dark-400">Must include uppercase, lowercase, numbers</p>
              </div>
              <input type="checkbox" className="checkbox" defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 bg-dark-700/30 rounded-xl">
              <div>
                <p className="text-white font-medium">Enable Rate Limiting</p>
                <p className="text-sm text-dark-400">Limit API requests per user</p>
              </div>
              <input type="checkbox" className="checkbox" defaultChecked />
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-gradient flex items-center gap-2">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}