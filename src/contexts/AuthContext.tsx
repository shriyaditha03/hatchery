
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

// Extended User interface to match our Profile + Hatchery data
export interface UserProfile {
  id: string;
  username: string;
  name: string;
  role: 'owner' | 'technician' | 'worker';
  hatchery_id: string | null;
  hatchery_name?: string;
  location?: string;
  email: string;
  phone: string;
}

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  loginWithUsername: (username: string, password: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  activeFarmId: string | null;
  setActiveFarmId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFarmId, setActiveFarmId] = useState<string | null>(null);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
      } else {
        setUser(null);
        setActiveFarmId(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, email?: string) => {
    try {
      // 1. Get Profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw profileError;
      }

      let hatcheryName = '';
      let location = '';

      // 2. Get Hatchery Details if linked
      if (profile.hatchery_id) {
        const { data: hatchery } = await supabase
          .from('hatcheries')
          .select('name, location')
          .eq('id', profile.hatchery_id)
          .single();

        if (hatchery) {
          hatcheryName = hatchery.name;
          location = hatchery.location;
        }
      }

      const userData: UserProfile = {
        id: profile.id,
        username: profile.username,
        name: profile.full_name,
        role: profile.role,
        hatchery_id: profile.hatchery_id,
        hatchery_name: hatcheryName,
        location: location,
        email: email || profile.email || '',
        phone: profile.phone || '',
      };

      setUser(userData);

      // Load last active farm from localStorage if exists, or keep null
      const savedFarmId = localStorage.getItem(`activeFarm_${userData.id}`);
      if (savedFarmId) {
        setActiveFarmId(savedFarmId);
      }

      return userData;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Legacy Admin User
  const DUMMY_USER: UserProfile = {
    id: 'legacy-admin-id',
    username: 'admin',
    name: 'Rajesh Kumar',
    role: 'technician',
    hatchery_id: 'legacy-hatchery',
    hatchery_name: 'Sunrise Aqua Farm',
    location: 'Nellore, Andhra Pradesh',
    email: 'rajesh@sunriseaqua.com',
    phone: '+91 98765 43210',
  };

  const loginWithUsername = async (username: string, password: string) => {
    try {
      setLoading(true);

      // 1. Check Legacy Admin (admin/admin123)
      if (username === 'admin' && password === 'admin123') {
        setUser(DUMMY_USER);
        return { error: null };
      }

      // 2. Resolve username to email (Supabase)
      const { data: email, error: rpcError } = await supabase
        .rpc('get_email_by_username', { username_input: username });

      if (rpcError || !email) {
        return { error: { message: "Account doesn't exist" } };
      }

      // 3. Sign in with email/password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email as string,
        password,
      });

      if (authError) {
        return { error: { message: 'Invalid credentials' } };
      }

      if (authData.user) {
        await fetchProfile(authData.user.id, authData.user.email);
      }

      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setActiveFarmId(null);
  };

  const handleSetActiveFarmId = (id: string | null) => {
    setActiveFarmId(id);
    if (user && id) {
      localStorage.setItem(`activeFarm_${user.id}`, id);
    } else if (user && !id) {
      localStorage.removeItem(`activeFarm_${user.id}`);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      loginWithUsername, 
      logout, 
      isAuthenticated: !!user,
      activeFarmId,
      setActiveFarmId: handleSetActiveFarmId
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

