import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Clock, X, Volume2, VolumeX } from 'lucide-react';
import { alarmsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function AlarmPopup() {
  const [triggeredAlarms, setTriggeredAlarms] = useState([]);
  const [dismissedAlarms, setDismissedAlarms] = useState([]); // Track alarms user has closed
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch active alarms
  const { data: alarms = [] } = useQuery({
    queryKey: ['alarms-active'],
    queryFn: () => alarmsAPI.list({ active_only: true }).then(res => res.data),
    refetchInterval: 30000,
  });

  // Snooze mutation
  const snoozeMutation = useMutation({
    mutationFn: ({ id, minutes }) => alarmsAPI.snooze(id, minutes),
    onSuccess: (_, variables) => {
      // Remove from triggered alarms after successful snooze
      setTriggeredAlarms(prev => prev.filter(a => a.id !== variables.id));
      // Remove from dismissed so it can trigger again after snooze
      setDismissedAlarms(prev => prev.filter(id => id !== variables.id));
      queryClient.invalidateQueries({ queryKey: ['alarms-active'] });
      queryClient.invalidateQueries({ queryKey: ['alarms'] });
      toast.success(`Alarm snoozed for ${variables.minutes} minutes`);
      
      // Stop sound
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    },
    onError: (err) => {
      console.error('Snooze error:', err);
      toast.error('Failed to snooze alarm');
    },
  });

  // Dismiss mutation
  const dismissMutation = useMutation({
    mutationFn: (id) => alarmsAPI.dismiss(id),
    onSuccess: (_, alarmId) => {
      // Remove from triggered alarms after successful dismiss
      setTriggeredAlarms(prev => prev.filter(a => a.id !== alarmId));
      queryClient.invalidateQueries({ queryKey: ['alarms-active'] });
      queryClient.invalidateQueries({ queryKey: ['alarms'] });
      toast.success('Alarm dismissed');
      
      // Stop sound
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    },
    onError: (err) => {
      console.error('Dismiss error:', err);
      toast.error('Failed to dismiss alarm');
    },
  });

  // Handle mute toggle
  const handleMuteToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    if (audioRef.current) {
      if (newMuted) {
        audioRef.current.pause();
      } else if (triggeredAlarms.length > 0) {
        audioRef.current.play().catch(() => {});
      }
    }
    
    toast.success(newMuted ? 'Alarm muted' : 'Alarm unmuted');
  };

  // Handle close (just hide popup, don't dismiss alarm)
  const handleClose = (e, alarmId) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Stop sound first
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Add to dismissed list so it won't re-trigger
    setDismissedAlarms(prev => [...prev, alarmId]);
    
    // Remove from triggered alarms
    setTriggeredAlarms(prev => prev.filter(a => a.id !== alarmId));
    
    toast.success('Alarm popup closed');
  };

  // Handle snooze
  const handleSnooze = (e, alarm, minutes) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Just trigger the mutation - onSuccess will handle the rest
    snoozeMutation.mutate({ id: alarm.id, minutes });
  };

  // Handle dismiss
  const handleDismiss = (e, alarm) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Just trigger the mutation - onSuccess will handle the rest
    dismissMutation.mutate(alarm.id);
  };

  // Check for triggered alarms
  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      
      alarms.forEach(alarm => {
        if (!alarm.is_active) return;
        
        // Skip if user already dismissed/closed this alarm
        if (dismissedAlarms.includes(alarm.id)) return;
        
        // Skip if snoozed
        if (alarm.is_snoozed && alarm.snooze_until) {
          const snoozeUntil = new Date(alarm.snooze_until);
          if (snoozeUntil > now) return;
        }
        
        const alarmTime = new Date(alarm.alarm_time);
        const timeDiff = Math.abs(now - alarmTime);
        
        // Trigger if within 1 minute of alarm time
        if (timeDiff < 60000) {
          // Check if already triggered
          if (!triggeredAlarms.find(a => a.id === alarm.id)) {
            setTriggeredAlarms(prev => [...prev, alarm]);
            
            // Play sound
            if (!isMuted && audioRef.current) {
              audioRef.current.play().catch(() => {});
            }
            
            // Show browser notification
            showBrowserNotification(alarm);
          }
        }
      });
    };

    checkAlarms();
    const interval = setInterval(checkAlarms, 10000);
    
    return () => clearInterval(interval);
  }, [alarms, triggeredAlarms, dismissedAlarms, isMuted]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const showBrowserNotification = (alarm) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('⏰ ' + alarm.title, {
        body: alarm.description || 'Your alarm is ringing!',
        icon: '/favicon.ico',
        tag: alarm.id,
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  return (
    <>
      {/* Alarm Sound */}
      <audio ref={audioRef} loop>
        <source src="/alarm-sound.mp3" type="audio/mpeg" />
      </audio>

      {/* Triggered Alarms Popup */}
      <AnimatePresence>
        {triggeredAlarms.map((alarm) => (
          <motion.div
            key={alarm.id}
            initial={{ opacity: 0, scale: 0.9, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -50 }}
            className="fixed top-4 right-4 z-[100] w-80 sm:w-96"
          >
            <div className="bg-dark-800 border-2 border-primary-500 rounded-2xl shadow-2xl overflow-hidden animate-pulse-border">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary-600 to-accent-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
                      <Bell className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{alarm.title}</h3>
                      <div className="flex items-center gap-1 text-white/80 text-sm">
                        <Clock className="w-4 h-4" />
                        {new Date(alarm.alarm_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Mute Button */}
                    <button
                      type="button"
                      onClick={handleMuteToggle}
                      className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    {/* Close Button */}
                    {/* <button
                      type="button"
                      onClick={(e) => handleClose(e, alarm.id)}
                      className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      title="Close popup (alarm will still ring)"
                    >
                      <X className="w-5 h-5" />
                    </button> */}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-4">
                {alarm.description && (
                  <p className="text-dark-300 mb-4">{alarm.description}</p>
                )}

                {/* Snooze Options */}
                <div className="mb-4">
                  <p className="text-sm text-dark-400 mb-2">Snooze for:</p>
                  <div className="flex gap-2">
                    {[5, 10, 15, 30].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={(e) => handleSnooze(e, alarm, mins)}
                        className="flex-1 py-2 px-3 bg-dark-700 hover:bg-dark-600 text-dark-300 hover:text-white rounded-lg text-sm transition-colors"
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={(e) => handleClose(e, alarm.id)}
                  className="w-full py-3 bg-dark-600 hover:bg-dark-500 text-white font-medium rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse-border {
          0%, 100% { border-color: rgb(16, 185, 129); }
          50% { border-color: rgb(20, 184, 166); }
        }
        .animate-pulse-border {
          animation: pulse-border 1s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}