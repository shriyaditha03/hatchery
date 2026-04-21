import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface ActivityRecord {
  id: string;
  farm_id?: string;
  section_id?: string;
  tank_id?: string;
  user_id: string;
  activity_type: string;
  data: Record<string, any>;
  created_at: string;
  // Joined fields
  tanks?: {
    name: string,
    sections?: { name: string }
  };
  sections?: { name: string };
  farms?: { name: string };
  profiles?: { username: string; full_name: string };
  // UI helpers for legacy compat
  date?: string;
  time?: string;
  ampm?: string;
  tank_name?: string;
  comments?: string;
}

export function useActivities() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActivities = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get today's activities for this hatchery (via user's role/access)
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          profiles(username, full_name),
          tanks(
            name,
            sections(name)
          ),
          sections(name),
          farms(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error('Fetch activities error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addActivity = useCallback(async (record: {
    tank_id?: string;
    section_id?: string;
    farm_id?: string;
    activity_type: string;
    data: any;
  }) => {
    if (!user) throw new Error("Unauthenticated");

    const { data, error } = await supabase
      .from('activity_logs')
      .insert([{
        ...record,
        user_id: user.id, // This is the profile.id from AuthContext
      }])
      .select()
      .single();

    if (error) throw error;
    setActivities(prev => [data, ...prev]);
    return data.id;
  }, [user]);

  const updateActivity = useCallback(async (id: string, record: {
    tank_id?: string;
    section_id?: string;
    farm_id?: string;
    stocking_id?: string;
    activity_type: string;
    data: any;
  }) => {
    if (!user) throw new Error("Unauthenticated");

    const { data, error } = await supabase
      .from('activity_logs')
      .update(record)
      .eq('id', id)
      .select(`
        *,
        profiles(username, full_name),
        tanks(
          name,
          sections(name)
        ),
        sections(name),
        farms(name)
      `);

    if (error) {
      console.error('Update activity error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error("Update failed: You might not have permission to edit this record or it doesn't exist.");
    }

    const updatedRecord = data[0];
    setActivities(prev => prev.map(a => a.id === id ? updatedRecord : a));
    return updatedRecord.id;
  }, [user]);

  const deleteActivity = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('activity_logs')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setActivities(prev => prev.filter(a => a.id !== id));
  }, []);

  return { activities, loading, fetchActivities, addActivity, updateActivity, deleteActivity };
}
