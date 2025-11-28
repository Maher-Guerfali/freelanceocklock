import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Play, Square, Clock, Euro, Trash2, Settings, Plus, Minus, Mail, Download, ChevronDown, User, TrendingUp, LogIn, LogOut, Pencil } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { TodoList } from "@/components/TodoList";
import { StatsChart } from "@/components/StatsChart";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface WorkSession {
  id: string;
  startTime: number;
  endTime: number;
  duration: number; // in milliseconds
  earnings: number;
  isManual?: boolean;
  description?: string;
  taskName?: string;
}

const Index = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [hourlyRate, setHourlyRate] = useState(25);
  const [showSettings, setShowSettings] = useState(false);
  const [manualAmount, setManualAmount] = useState("");
  const [subtractAmount, setSubtractAmount] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState("");
  const [userEmail, setUserEmail] = useState("boudmaker@gmail.com");
  const [userName, setUserName] = useState("User");
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [isCountdownMode, setIsCountdownMode] = useState(false);
  const [countdownDuration, setCountdownDuration] = useState(30 * 60 * 1000); // 30 minutes default
  const [customMinutes, setCustomMinutes] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const carouselApiRef = useRef<any>(null);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAuthConfigured, setIsAuthConfigured] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // Check if Supabase is configured
  useEffect(() => {
    setIsAuthConfigured(isSupabaseConfigured());
    
    if (isSupabaseConfigured()) {
      // Check current session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
      });

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  // Sign in with Google
  const handleGoogleSignIn = async () => {
    // Quick sanity check: ensure provider likely enabled
    if (!isAuthConfigured) {
      toast.error('Auth not configured. Add Supabase keys to .env');
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      const msg = (error?.message || '').toLowerCase();
      if (msg.includes('unsupported provider') || msg.includes('provider is not enabled')) {
        toast.error('Google provider not enabled in Supabase. Enable it under Auth > Providers.');
      } else if (msg.includes('invalid grant')) {
        toast.error('OAuth credentials error. Re-check Google client id/secret.');
      } else {
        toast.error('Failed to sign in: ' + error.message);
      }
    }
  };

  // Sign out
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Signed out successfully');
    } catch (error: any) {
      toast.error('Failed to sign out: ' + error.message);
    }
  };

  // Email sign up
  const handleEmailSignUp = async () => {
    if (!authEmail || !authPassword) {
      toast.error('Please enter email and password');
      return;
    }
    if (authPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      });
      if (error) throw error;
      toast.success('Account created! Check your email for verification.');
      setShowAuthForm(false);
      setAuthEmail('');
      setAuthPassword('');
    } catch (error: any) {
      toast.error('Sign up failed: ' + error.message);
    }
  };

  // Email sign in
  const handleEmailSignIn = async () => {
    if (!authEmail || !authPassword) {
      toast.error('Please enter email and password');
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) throw error;
      toast.success('Signed in successfully!');
      setShowAuthForm(false);
      setAuthEmail('');
      setAuthPassword('');
    } catch (error: any) {
      toast.error('Sign in failed: ' + error.message);
    }
  };

  // Sync sessions to Supabase
  const syncSessionsToSupabase = async (sessionsToSync: WorkSession[]) => {
    if (!user) return;
    
    try {
      // Delete existing sessions for this user
      await supabase
        .from('work_sessions')
        .delete()
        .eq('user_id', user.id);
      
      // Insert all sessions
      if (sessionsToSync.length > 0) {
        const { error } = await supabase
          .from('work_sessions')
          .insert(
            sessionsToSync.map(session => ({
              id: session.id,
              user_id: user.id,
              start_time: new Date(session.startTime).toISOString(),
              end_time: new Date(session.endTime).toISOString(),
              duration: session.duration,
              earnings: session.earnings,
              hourly_rate: hourlyRate,
            }))
          );
        
        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Failed to sync sessions:', error);
    }
  };

  // Load sessions from Supabase
  const loadSessionsFromSupabase = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('work_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const loadedSessions: WorkSession[] = data.map(session => ({
          id: session.id,
          startTime: new Date(session.start_time).getTime(),
          endTime: new Date(session.end_time).getTime(),
          duration: session.duration,
          earnings: session.earnings,
        }));
        setSessions(loadedSessions);
        toast.success(`Loaded ${loadedSessions.length} sessions from cloud`);
      }
    } catch (error: any) {
      console.error('Failed to load sessions:', error);
    }
  };

  // Sync settings to Supabase
  const syncSettingsToSupabase = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          hourly_rate: hourlyRate,
          user_name: userName,
          user_email: userEmail,
          updated_at: new Date().toISOString(),
        });
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Failed to sync settings:', error);
    }
  };

  // Load settings from Supabase
  const loadSettingsFromSupabase = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      
      if (data) {
        setHourlyRate(data.hourly_rate);
        setUserName(data.user_name || userName);
        setUserEmail(data.user_email || userEmail);
      }
    } catch (error: any) {
      console.error('Failed to load settings:', error);
    }
  };

  // Load from Supabase when user logs in
  useEffect(() => {
    if (user) {
      loadSessionsFromSupabase();
      loadSettingsFromSupabase();
    }
  }, [user]);

  // Sync to Supabase when sessions change (if logged in)
  useEffect(() => {
    if (user && sessions.length > 0) {
      syncSessionsToSupabase(sessions);
    }
  }, [sessions, user]);

  // Sync settings to Supabase when they change (if logged in)
  useEffect(() => {
    if (user) {
      syncSettingsToSupabase();
    }
  }, [hourlyRate, userName, userEmail, user]);

  // Load sessions and hourly rate from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("workSessions");
    if (saved) {
      setSessions(JSON.parse(saved));
    }
    const savedRate = localStorage.getItem("hourlyRate");
    if (savedRate) {
      setHourlyRate(parseFloat(savedRate));
    }
    const savedEmail = localStorage.getItem("userEmail");
    if (savedEmail) {
      setUserEmail(savedEmail);
    }
    const savedName = localStorage.getItem("userName");
    if (savedName) {
      setUserName(savedName);
    }
  }, []);

  // Save sessions and hourly rate to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("workSessions", JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem("hourlyRate", hourlyRate.toString());
  }, [hourlyRate]);

  useEffect(() => {
    localStorage.setItem("userEmail", userEmail);
  }, [userEmail]);

  useEffect(() => {
    localStorage.setItem("userName", userName);
  }, [userName]);

  // Track carousel slide changes
  useEffect(() => {
    if (!carouselApiRef.current) return;
    
    const onSelect = () => {
      setCurrentSlide(carouselApiRef.current.selectedScrollSnap());
    };
    
    carouselApiRef.current.on('select', onSelect);
    return () => {
      carouselApiRef.current?.off('select', onSelect);
    };
  }, [carouselApiRef.current]);

  // Timer logic
  useEffect(() => {
    if (isRunning && startTime) {
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        if (isCountdownMode) {
          const remaining = countdownDuration - elapsed;
          if (remaining <= 0) {
            setElapsedTime(0);
            handleStop();
            toast.success("Time's up!");
          } else {
            setElapsedTime(remaining);
          }
        } else {
          setElapsedTime(elapsed);
        }
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, startTime, isCountdownMode, countdownDuration]);

  const handleStart = () => {
    const now = Date.now();
    setStartTime(now);
    setIsRunning(true);
    
    // Create session immediately with start time
    const sessionId = now.toString();
    const newSession: WorkSession = {
      id: sessionId,
      startTime: now,
      endTime: now, // Will be updated on stop
      duration: 0, // Will be calculated on stop
      earnings: 0, // Will be calculated on stop
      taskName: "In Progress...",
    };
    
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(sessionId);
    
    if (isCountdownMode) {
      setElapsedTime(countdownDuration);
      toast.success("Countdown started! Session created.");
    } else {
      setElapsedTime(0);
      toast.success("Timer started! Session created.");
    }
  };

  const handleStop = () => {
    if (!startTime || !activeSessionId) return;

    const endTime = Date.now();
    const duration = endTime - startTime;
    const hours = duration / (1000 * 60 * 60);
    const earnings = hours * hourlyRate;

    // Update the existing session with end time and earnings
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              endTime,
              duration,
              earnings,
              taskName: "Untitled Task",
            }
          : s
      )
    );
    
    setIsRunning(false);
    setStartTime(null);
    setElapsedTime(0);
    setActiveSessionId(null);
    
    toast.success(`Session saved! You earned €${earnings.toFixed(2)}`);
  };

  const startEditingTask = (session: WorkSession) => {
    setEditingSessionId(session.id);
    setEditingTaskName(session.taskName || "Untitled Task");
  };

  const saveTaskName = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, taskName: editingTaskName.trim() || "Untitled Task" }
          : s
      )
    );
    setEditingSessionId(null);
    setEditingTaskName("");
  };

  const addManualEntry = () => {
    const amount = parseFloat(manualAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const newSession: WorkSession = {
      id: Date.now().toString(),
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0,
      earnings: amount,
      isManual: true,
      description: "Manual entry",
    };

    setSessions((prev) => [newSession, ...prev]);
    setManualAmount("");
    toast.success(`Added €${amount.toFixed(2)} to earnings`);
  };

  const subtractManualEntry = () => {
    const amount = parseFloat(subtractAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const newSession: WorkSession = {
      id: Date.now().toString(),
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0,
      earnings: -amount,
      isManual: true,
      description: "Deduction",
    };

    setSessions((prev) => [newSession, ...prev]);
    setSubtractAmount("");
    toast.success(`Subtracted €${amount.toFixed(2)} from earnings`);
  };

  // Auto-stop timer when page is closed
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isRunning && startTime && activeSessionId) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const hours = duration / (1000 * 60 * 60);
        const earnings = hours * hourlyRate;

        const saved = localStorage.getItem("workSessions");
        const existingSessions = saved ? JSON.parse(saved) : [];
        
        // Update the active session
        const updatedSessions = existingSessions.map((s: WorkSession) =>
          s.id === activeSessionId
            ? {
                ...s,
                endTime,
                duration,
                earnings,
                taskName: s.taskName === "In Progress..." ? "Untitled Task" : s.taskName,
              }
            : s
        );
        
        localStorage.setItem("workSessions", JSON.stringify(updatedSessions));
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isRunning, startTime, hourlyRate, activeSessionId]);

  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    toast.success("Session deleted");
  };

  const clearAllSessions = () => {
    setSessions([]);
    localStorage.removeItem("workSessions");
    toast.success("All sessions cleared");
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalEarnings = sessions.reduce((sum, session) => sum + session.earnings, 0);

  const getTotalTime = () => {
    return sessions.reduce((sum, session) => sum + session.duration, 0);
  };

  const sendEmailReport = () => {
    const totalTime = getTotalTime();
    const totalHours = (totalTime / (1000 * 60 * 60)).toFixed(2);
    
    const subject = encodeURIComponent("Time Tracker Report");
    const body = encodeURIComponent(
      `Time Tracker Report\n\n` +
      `Total Working Time: ${formatTime(totalTime)} (${totalHours} hours)\n` +
      `Total Earnings: €${totalEarnings.toFixed(2)}\n` +
      `Hourly Rate: €${hourlyRate}/hour\n\n` +
      `Sessions:\n` +
      sessions.map((s, i) => 
        `${i + 1}. ${s.taskName || "Untitled Task"} - ${s.isManual ? "Manual Entry" : formatTime(s.duration)} - €${s.earnings.toFixed(2)}`
      ).join("\n")
    );
    
    window.open(`mailto:${userEmail}?subject=${subject}&body=${body}`, '_blank');
    toast.success("Email client opened!");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const totalTime = getTotalTime();
    const totalHours = (totalTime / (1000 * 60 * 60)).toFixed(2);
    
    // Title
    doc.setFontSize(20);
    doc.text("Time Tracker Report", 20, 20);
    
    // Summary
    doc.setFontSize(12);
    doc.text(`Total Working Time: ${formatTime(totalTime)} (${totalHours} hours)`, 20, 35);
    doc.text(`Total Earnings: €${totalEarnings.toFixed(2)}`, 20, 45);
    doc.text(`Hourly Rate: €${hourlyRate}/hour`, 20, 55);
    
    // Sessions
    doc.setFontSize(14);
    doc.text("Work Sessions:", 20, 70);
    
    doc.setFontSize(10);
    let yPos = 80;
    sessions.forEach((session, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      const taskName = session.taskName || "Untitled Task";
      const duration = session.isManual ? "Manual Entry" : formatTime(session.duration);
      const earnings = `€${session.earnings.toFixed(2)}`;
      const date = session.isManual ? "" : ` - ${formatDate(session.startTime)}`;
      
      doc.text(`${index + 1}. ${taskName}`, 20, yPos);
      doc.text(`${duration} - ${earnings}${date}`, 30, yPos + 5);
      yPos += 15;
    });
    
    doc.save(`time-tracker-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF exported successfully!");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-primary/15 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-accent/15 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-secondary/15 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-4000"></div>
      </div>

      {/* Logo Banner */}
      <div className="relative bg-primary p-8 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/clock.png"
              alt="Freelance O'Clock"
              className="h-24 w-auto object-contain"
            />
          </div>
          <div className="flex items-center gap-3 relative">
            {isAuthConfigured && (
              <div className="relative flex items-center gap-2">
                {user ? (
                  <Button
                    onClick={handleSignOut}
                    size="sm"
                    className="flex items-center gap-1.5 px-4 py-2 font-bold rounded-xl shadow-sm hover:scale-105 transition-transform bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Logout</span>
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => setShowAuthForm(!showAuthForm)}
                      size="sm"
                      className="flex items-center gap-1.5 px-4 py-2 font-bold rounded-xl shadow-sm hover:scale-105 transition-transform bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
                    >
                      <LogIn className="w-4 h-4" />
                      <span className="text-sm">Sign In</span>
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setAuthMode('signup');
                        setShowAuthForm(!showAuthForm);
                      }}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1.5 px-4 py-2 font-bold rounded-xl shadow-sm hover:scale-105 transition-transform border-2 border-primary/30 bg-white hover:bg-primary/5 text-primary"
                    >
                      <span className="text-sm">Sign Up</span>
                    </Button>
                    
                    {showAuthForm && (
                      <Card className="absolute top-full right-0 mt-2 w-80 p-5 space-y-3 border-2 border-primary/20 bg-white shadow-2xl animate-scale-in rounded-2xl z-50">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-black text-primary">
                            {authMode === 'signup' ? '🔐 Sign Up' : '🔑 Sign In'}
                          </h3>
                          <button
                            onClick={() => setShowAuthForm(false)}
                            className="text-muted-foreground hover:text-foreground text-xl leading-none"
                          >
                            ✕
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase">Email</label>
                            <Input
                              type="email"
                              value={authEmail}
                              onChange={(e) => setAuthEmail(e.target.value)}
                              placeholder="your@email.com"
                              className="mt-1 h-9"
                            />
                          </div>
                          
                          <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase">Password</label>
                            <Input
                              type="password"
                              value={authPassword}
                              onChange={(e) => setAuthPassword(e.target.value)}
                              placeholder="••••••••"
                              className="mt-1 h-9"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  authMode === 'signup' ? handleEmailSignUp() : handleEmailSignIn();
                                }
                              }}
                            />
                          </div>
                          
                          <Button
                            onClick={authMode === 'signup' ? handleEmailSignUp : handleEmailSignIn}
                            className="w-full font-bold h-9"
                          >
                            {authMode === 'signup' ? 'Create Account' : 'Sign In'}
                          </Button>
                          
                          <div className="text-center text-xs">
                            <button
                              onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
                              className="text-primary hover:underline font-semibold"
                            >
                              {authMode === 'signup' 
                                ? 'Have an account? Sign in' 
                                : 'Need account? Sign up'}
                            </button>
                          </div>
                        </div>
                      </Card>
                    )}
                  </>
                )}
              </div>
            )}
            <div 
              className="relative"
              onMouseEnter={() => setShowUserInfo(true)}
              onMouseLeave={() => setShowUserInfo(false)}
            >
              <Button
                onClick={() => setShowUserInfo(!showUserInfo)}
                className="flex items-center gap-2 text-lg px-8 py-7 font-bold rounded-2xl shadow-md hover:scale-105 transition-transform bg-white hover:bg-white/90 text-primary"
              >
                <User className="w-6 h-6" />
                <span className="hidden sm:inline">User Info</span>
              </Button>
              
              {showUserInfo && (
                <Card className="absolute top-full right-0 mt-2 w-80 p-6 space-y-4 border-2 border-primary/20 bg-white shadow-2xl animate-scale-in rounded-2xl z-50">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>USER INFO</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-semibold">Hourly Rate</p>
                        <p className="text-2xl font-black text-primary">€{hourlyRate}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-semibold">Total Earnings</p>
                        <p className="text-2xl font-black text-accent">€{totalEarnings.toFixed(0)}</p>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-muted-foreground">Username</span>
                        <span className="text-sm font-bold text-foreground">{userName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-muted-foreground">Email</span>
                        <span className="text-sm font-bold text-foreground truncate max-w-[150px]">{userEmail}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Avg. Daily Hours
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          {sessions.length > 0 ? ((getTotalTime() / (1000 * 60 * 60)) / Math.max(1, new Set(sessions.map(s => new Date(s.startTime).toDateString())).size)).toFixed(1) : '0.0'}h
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-muted-foreground">Total Sessions</span>
                        <span className="text-sm font-bold text-foreground">{sessions.length}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
            <div 
              className="relative"
              onMouseEnter={() => setShowSettings(true)}
              onMouseLeave={() => setShowSettings(false)}
            >
              <Button
                variant="secondary"
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 text-lg px-8 py-7 font-bold rounded-2xl shadow-md hover:scale-105 transition-transform bg-white hover:bg-white/90 text-primary"
              >
                <Settings className="w-6 h-6" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
              
              {showSettings && (
                <Card className="absolute top-full right-0 mt-2 w-96 max-h-[80vh] overflow-y-auto p-8 space-y-6 border-2 border-primary/20 bg-white shadow-2xl animate-scale-in rounded-2xl z-50">
                  <h3 className="text-2xl font-black text-primary">⚙️ Settings</h3>
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Hourly Rate (€)</label>
                    <Input
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.5"
                      className="text-2xl font-bold h-14 bg-input border-2 border-primary/20 focus:border-primary rounded-2xl"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Username</label>
                    <Input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Your name"
                      className="text-lg h-14 bg-input border-2 border-primary/20 focus:border-primary rounded-2xl"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Email Address</label>
                    <Input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="text-lg h-14 bg-input border-2 border-primary/20 focus:border-primary rounded-2xl"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Add Manual Entry (€)</label>
                    <div className="flex gap-3">
                      <Input
                        type="number"
                        value={manualAmount}
                        onChange={(e) => setManualAmount(e.target.value)}
                        placeholder="Enter amount"
                        min="0"
                        step="0.01"
                        className="flex-1 text-lg h-14 bg-input border-2 border-accent/20 focus:border-accent rounded-2xl"
                      />
                      <Button onClick={addManualEntry} size="lg" className="shrink-0 h-14 w-14 rounded-2xl bg-accent hover:bg-accent/90 shadow-md">
                        <Plus className="w-6 h-6" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Subtract Amount (€)</label>
                    <div className="flex gap-3">
                      <Input
                        type="number"
                        value={subtractAmount}
                        onChange={(e) => setSubtractAmount(e.target.value)}
                        placeholder="Enter amount"
                        min="0"
                        step="0.01"
                        className="flex-1 text-lg h-14 bg-input border-2 border-destructive/20 focus:border-destructive rounded-2xl"
                      />
                      <Button onClick={subtractManualEntry} size="lg" variant="destructive" className="shrink-0 h-14 w-14 rounded-2xl shadow-md">
                        <Minus className="w-6 h-6" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative space-y-8 pt-8">

        {/* Carousel with Timer, Stats, and Todo */}
        <Carousel 
          className="w-full" 
          opts={{ align: "center", loop: false, startIndex: 1, dragFree: true, watchDrag: true, containScroll: false }}
          setApi={(api) => { carouselApiRef.current = api; }}
        >
          <CarouselContent className="-ml-2 md:-ml-4 cursor-grab active:cursor-grabbing">
            {/* Todo List */}
            <CarouselItem className="pl-2 md:pl-4 basis-full md:basis-[68%]">
              <Card 
                className={`p-8 md:p-10 h-[550px] flex flex-col animate-fade-in bg-white/95 backdrop-blur-sm border-2 border-primary/30 shadow-lg rounded-2xl relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-2xl hover:border-primary/50 ${
                  currentSlide !== 0 ? 'opacity-40 hover:opacity-60' : ''
                }`}
                onClick={() => carouselApiRef.current?.scrollTo(0)}
              >
                <div 
                  className="absolute right-0 top-1/2 -translate-y-1/2 bg-primary text-white px-3 py-10 rounded-l-2xl shadow-lg z-30 cursor-pointer hover:px-5 transition-all !opacity-100 h-[140px] flex items-center justify-center"
                  onClick={(e) => { e.stopPropagation(); carouselApiRef.current?.scrollTo(0); }}
                >
                  <p className="text-lg font-black tracking-wider" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    TODO LIST
                  </p>
                </div>
                <div className="absolute left-8 bottom-8 pointer-events-none opacity-[0.06] select-none">
                  <p className="text-7xl font-black text-primary whitespace-nowrap tracking-wider">
                    TODO LIST
                  </p>
                </div>
                <div className="flex-1 overflow-auto relative z-10 pr-16">
                  <TodoList />
                </div>
              </Card>
            </CarouselItem>

            {/* Timer Display */}
            <CarouselItem className="pl-2 md:pl-4 basis-full md:basis-[68%]">
              <Card className={`p-6 md:p-8 text-center space-y-6 shadow-xl h-[550px] relative animate-scale-in bg-white/95 backdrop-blur-sm border-2 border-primary/30 rounded-2xl overflow-hidden flex flex-col transition-all ${
                currentSlide !== 1 ? 'opacity-40 hover:opacity-60' : ''
              }`}>
                {/* Left TIMER Sticker */}
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 bg-primary text-white px-3 py-10 rounded-r-2xl shadow-lg z-30 cursor-pointer hover:px-5 transition-all !opacity-100 h-[140px] flex items-center justify-center"
                  onClick={(e) => { e.stopPropagation(); carouselApiRef.current?.scrollTo(1); }}
                >
                  <p className="text-lg font-black tracking-wider" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    TIMER
                  </p>
                </div>
                
                {/* Right TIMER Sticker */}
                <div 
                  className="absolute right-0 top-1/2 -translate-y-1/2 bg-primary text-white px-3 py-10 rounded-l-2xl shadow-lg z-30 cursor-pointer hover:px-5 transition-all !opacity-100 h-[140px] flex items-center justify-center"
                  onClick={(e) => { e.stopPropagation(); carouselApiRef.current?.scrollTo(1); }}
                >
                  <p className="text-lg font-black tracking-wider" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    TIMER
                  </p>
                </div>
                
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none"></div>
                
                {/* Timer Mode Toggle and Countdown Controls */}
                <div className="absolute top-4 left-6 right-6 z-10 flex items-center gap-3 bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-md">
                  <span className={`text-sm font-bold transition-colors ${!isCountdownMode ? 'text-primary' : 'text-muted-foreground'}`}>Count Up</span>
                  <button
                    onClick={() => setIsCountdownMode(!isCountdownMode)}
                    disabled={isRunning}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isCountdownMode ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                        isCountdownMode ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`text-sm font-bold transition-colors ${isCountdownMode ? 'text-primary' : 'text-muted-foreground'}`}>Countdown</span>
                  
                  {/* Countdown Duration Controls Inline */}
                  {isCountdownMode && !isRunning && (
                    <>
                      <div className="h-6 w-px bg-border mx-2"></div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">15m</span>
                        <button
                          onClick={() => {
                            setCountdownDuration(prev => Math.max(0, prev - 15 * 60 * 1000));
                            toast.success('-15 minutes');
                          }}
                          className="w-6 h-6 text-xs font-bold rounded-lg transition-all bg-destructive/80 text-white hover:bg-destructive hover:scale-110 shadow-sm flex items-center justify-center"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={() => {
                            setCountdownDuration(prev => prev + 15 * 60 * 1000);
                            toast.success('+15 minutes');
                          }}
                          className="w-6 h-6 text-xs font-bold rounded-lg transition-all bg-primary text-white hover:bg-primary/90 hover:scale-110 shadow-sm flex items-center justify-center"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">30m</span>
                        <button
                          onClick={() => {
                            setCountdownDuration(prev => Math.max(0, prev - 30 * 60 * 1000));
                            toast.success('-30 minutes');
                          }}
                          className="w-6 h-6 text-xs font-bold rounded-lg transition-all bg-destructive/80 text-white hover:bg-destructive hover:scale-110 shadow-sm flex items-center justify-center"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={() => {
                            setCountdownDuration(prev => prev + 30 * 60 * 1000);
                            toast.success('+30 minutes');
                          }}
                          className="w-6 h-6 text-xs font-bold rounded-lg transition-all bg-primary text-white hover:bg-primary/90 hover:scale-110 shadow-sm flex items-center justify-center"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">1h</span>
                        <button
                          onClick={() => {
                            setCountdownDuration(prev => Math.max(0, prev - 60 * 60 * 1000));
                            toast.success('-1 hour');
                          }}
                          className="w-6 h-6 text-xs font-bold rounded-lg transition-all bg-destructive/80 text-white hover:bg-destructive hover:scale-110 shadow-sm flex items-center justify-center"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={() => {
                            setCountdownDuration(prev => prev + 60 * 60 * 1000);
                            toast.success('+1 hour');
                          }}
                          className="w-6 h-6 text-xs font-bold rounded-lg transition-all bg-primary text-white hover:bg-primary/90 hover:scale-110 shadow-sm flex items-center justify-center"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="relative flex-1 flex flex-col items-center justify-center gap-2 animate-fade-in -mt-8">
                  <Clock className={`w-10 h-10 text-primary ${isRunning ? 'animate-pulse' : ''}`} />
                  <div className="text-8xl md:text-9xl font-black font-mono tabular-nums tracking-tighter text-primary leading-none">
                    {formatTime(isCountdownMode && !isRunning ? countdownDuration : elapsedTime)}
                  </div>
                  {isCountdownMode && (
                    <p className="text-base font-semibold text-muted-foreground mt-2">{isRunning ? 'Time Remaining' : 'Set Duration'}</p>
                  )}
                </div>

                {/* Start/Stop Button */}
                <Button
                  onClick={isRunning ? handleStop : handleStart}
                  size="lg"
                  className={`relative w-full h-20 text-2xl font-black transition-all transform hover:scale-105 rounded-2xl shadow-lg ${
                    isRunning
                      ? "bg-destructive hover:bg-destructive/90"
                      : "bg-primary hover:bg-primary/90"
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Square className="w-8 h-8 mr-3 animate-pulse" />
                      STOP
                    </>
                  ) : (
                    <>
                      <Play className="w-8 h-8 mr-3" />
                      START
                    </>
                  )}
                </Button>

                {isRunning && (
                  <div className="relative text-muted-foreground animate-pulse text-lg font-bold">
                    Current earnings: <span className="text-accent text-xl font-black">€{(((isCountdownMode ? countdownDuration - elapsedTime : elapsedTime) / (1000 * 60 * 60)) * hourlyRate).toFixed(2)}</span>
                  </div>
                )}
              </Card>
            </CarouselItem>

            {/* Stats Chart */}
            <CarouselItem className="pl-2 md:pl-4 basis-full md:basis-[68%]">
              <Card 
                className={`p-8 md:p-10 h-[550px] flex flex-col animate-fade-in bg-white/95 backdrop-blur-sm border-2 border-primary/30 shadow-lg rounded-2xl relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-2xl hover:border-primary/50 ${
                  currentSlide !== 2 ? 'opacity-40 hover:opacity-60' : ''
                }`}
                onClick={() => carouselApiRef.current?.scrollTo(2)}
              >
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 bg-primary text-white px-3 py-10 rounded-r-2xl shadow-lg z-30 cursor-pointer hover:px-5 transition-all !opacity-100 h-[140px] flex items-center justify-center"
                  onClick={(e) => { e.stopPropagation(); carouselApiRef.current?.scrollTo(2); }}
                >
                  <p className="text-lg font-black tracking-wider" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    STATISTICS
                  </p>
                </div>
                <div className="absolute right-8 bottom-8 pointer-events-none opacity-[0.06] select-none">
                  <p className="text-7xl font-black text-primary whitespace-nowrap tracking-wider">
                    STATISTICS
                  </p>
                </div>
                <div className="flex-1 overflow-auto relative z-10 pl-16">
                  <StatsChart sessions={sessions} />
                </div>
              </Card>
            </CarouselItem>
          </CarouselContent>
          <CarouselPrevious className="left-4 bg-white hover:scale-110 text-primary border-2 border-primary/30 shadow-lg h-14 w-14 rounded-full transition-transform" />
          <CarouselNext className="right-4 bg-white hover:scale-110 text-primary border-2 border-primary/30 shadow-lg h-14 w-14 rounded-full transition-transform" />
        </Carousel>

        <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-8">
          {/* Total Earnings */}
          <Card className="p-8 bg-accent/10 border-2 border-accent/20 shadow-lg rounded-2xl">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-accent rounded-2xl shadow-md">
                <Euro className="w-10 h-10 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Earnings</p>
                <p className="text-5xl font-black text-accent">
                  €{totalEarnings.toFixed(2)}
                </p>
              </div>
            </div>
            {sessions.length > 0 && (
              <div className="flex gap-3 flex-wrap">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={sendEmailReport}
                  className="hover:bg-primary/10 border-2 border-primary/20 font-bold rounded-2xl h-12 bg-white"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Email Report
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={exportToPDF}
                  className="hover:bg-primary/10 border-2 border-primary/20 font-bold rounded-2xl h-12 bg-white"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Export PDF
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={clearAllSessions}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 font-bold rounded-2xl h-12"
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Sessions List */}
        {sessions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-3xl font-black px-2 text-primary">📋 Work Sessions</h2>
            {sessions.map((session) => (
              <Card
                key={session.id}
                className="p-6 hover:shadow-xl transition-all hover:scale-[1.02] border-2 border-primary/15 bg-white rounded-2xl"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    {editingSessionId === session.id ? (
                      <Input
                        type="text"
                        value={editingTaskName}
                        onChange={(e) => setEditingTaskName(e.target.value)}
                        onBlur={() => saveTaskName(session.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            saveTaskName(session.id);
                          }
                        }}
                        className="text-xl font-bold h-12 bg-input border-2 border-primary rounded-2xl"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <div 
                          className="text-xl font-bold text-foreground cursor-pointer group-hover:text-primary transition-colors"
                          onClick={() => startEditingTask(session)}
                        >
                          {session.taskName || "Untitled Task"}
                        </div>
                        <Pencil 
                          className="w-4 h-4 text-muted-foreground group-hover:text-primary cursor-pointer transition-colors"
                          onClick={() => startEditingTask(session)}
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-semibold">
                      {session.isManual ? (
                        <span className="text-xs font-bold bg-accent/20 text-accent px-3 py-1.5 rounded-2xl">MANUAL ENTRY</span>
                      ) : (
                        <>
                          <Clock className="w-4 h-4" />
                          {formatDate(session.startTime)}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {!session.isManual && (
                        <span className="text-xl font-bold font-mono">
                          {formatTime(session.duration)}
                        </span>
                      )}
                      <span className={`text-3xl font-black ${session.earnings < 0 ? 'text-destructive' : 'text-accent'}`}>
                        €{session.earnings.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteSession(session.id)}
                    className="text-muted-foreground hover:text-destructive shrink-0 h-12 w-12 rounded-2xl hover:bg-destructive/10"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {sessions.length === 0 && !isRunning && (
          <Card className="p-16 text-center text-muted-foreground border-2 border-dashed border-primary/20 bg-white rounded-2xl">
            <Clock className="w-20 h-20 mx-auto mb-6 opacity-30 text-primary" />
            <p className="text-2xl font-bold">No work sessions yet</p>
            <p className="text-lg mt-2">Start the timer to track your work!</p>
          </Card>
        )}
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default Index;
