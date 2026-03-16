
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

// Extended User interface to match our Profile + Hatchery data
export interface UserProfile {
  id: string;
  username: string;
  name: string;
  role: 'owner' | 'technician' | 'worker' | 'supervisor';
  hatchery_id: string | null;
  hatchery_name?: string;
  location?: string;
  email: string;
  phone: string;
  assigned_farms?: string[];
  access?: Array<{
    farm_id: string;
    farm_name: string;
    section_id: string | null;
    section_name: string | null;
    tank_id: string | null;
  }>;
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
  activeSectionId: string | null;
  setActiveSectionId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFarmId, setActiveFarmId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

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
        setActiveSectionId(null);
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
        .maybeSingle(); // Use maybeSingle to avoid throw on empty

      if (profileError) throw profileError;
      if (!profile) throw new Error("Profile row not found for this user.");

      let hatcheryName = '';
      let location = '';

      // 2. Get Hatchery Details if linked
      if (profile.hatchery_id) {
        const { data: hatchery, error: hatcheryError } = await supabase
          .from('hatcheries')
          .select('name, location')
          .eq('id', profile.hatchery_id)
          .maybeSingle();

        if (hatchery) {
          hatcheryName = hatchery.name;
          location = hatchery.location;
        }
      }

      // 3. Get Assigned Farms if Worker/Supervisor OR All Farms if Owner
      let assignedFarms: string[] = [];
      let fullAccess: any[] = [];
      
      if (profile.role === 'owner') {
        // Owners get access to all farms in their hatchery
        const { data: farms, error: farmsError } = await supabase
          .from('farms')
          .select('id, name')
          .eq('hatchery_id', profile.hatchery_id);
        
        if (farms) {
          assignedFarms = farms.map(f => f.name);
          fullAccess = farms.map(f => ({
            farm_id: f.id,
            farm_name: f.name,
            section_id: null,
            section_name: null,
            tank_id: null
          }));
        }
      } else if (profile.role === 'worker' || profile.role === 'supervisor') {
        const { data: access, error: accessError } = await supabase
          .from('farm_access')
          .select(`
            farm_id,
            section_id,
            tank_id,
            farms (
              name,
              sections (id, name)
            ),
            sections (name)
          `)
          .eq('user_id', profile.id);
        
        if (access) {
          const farmNames = new Set(access.map((a: any) => a.farms?.name).filter(Boolean));
          assignedFarms = Array.from(farmNames) as string[];
          
          access.forEach((a: any) => {
            if (a.section_id) {
              // Specific section access
              fullAccess.push({
                farm_id: a.farm_id,
                farm_name: a.farms?.name || 'Unknown Farm',
                section_id: a.section_id,
                section_name: a.sections?.name,
                tank_id: a.tank_id
              });
            } else if (a.farms?.sections) {
              // Whole farm access - include all sections of this farm
              a.farms.sections.forEach((s: any) => {
                fullAccess.push({
                  farm_id: a.farm_id,
                  farm_name: a.farms.name,
                  section_id: s.id,
                  section_name: s.name,
                  tank_id: null
                });
              });
            }
          });
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
        assigned_farms: assignedFarms,
        access: fullAccess
      };

      setUser(userData);

      // Load last active farm from localStorage if exists, or keep null
      const savedFarmId = localStorage.getItem(`activeFarm_${userData.id}`);
      if (savedFarmId) {
        setActiveFarmId(savedFarmId);
      }

      const savedSectionId = localStorage.getItem(`activeSection_${userData.id}`);
      if (savedSectionId) {
        setActiveSectionId(savedSectionId);
      }

      return { data: userData };
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      return { error: error.message || 'Unknown profile error' };
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
        const { data, error } = await fetchProfile(authData.user.id, authData.user.email);
        if (error) {
          return { error: { message: `Profile Error: ${error}` } };
        }
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
    setActiveSectionId(null);
  };

  const handleSetActiveFarmId = (id: string | null) => {
    setActiveFarmId(id);
    if (user) {
      if (id) {
        localStorage.setItem(`activeFarm_${user.id}`, id);
      } else {
        localStorage.removeItem(`activeFarm_${user.id}`);
      }
      // Reset section when farm changes unless it's null
      if (activeSectionId) {
        setActiveSectionId(null);
        localStorage.removeItem(`activeSection_${user.id}`);
      }
    }
  };

  const handleSetActiveSectionId = (id: string | null) => {
    setActiveSectionId(id);
    if (user) {
      if (id) {
        localStorage.setItem(`activeSection_${user.id}`, id);
      } else {
        localStorage.removeItem(`activeSection_${user.id}`);
      }
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
      setActiveFarmId: handleSetActiveFarmId,
      activeSectionId,
      setActiveSectionId: handleSetActiveSectionId
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

