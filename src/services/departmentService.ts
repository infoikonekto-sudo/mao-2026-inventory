import { supabase } from './supabaseClient';
import { Department } from '../types';

export async function getDepartments(licenseId: string): Promise<Department[]> {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('license_id', licenseId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error in getDepartments:', error);
    return [];
  }
}

export async function createDepartment(department: Omit<Department, 'id' | 'created_at'>): Promise<Department | null> {
  try {
    const { data, error } = await supabase
      .from('departments')
      .insert(department)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in createDepartment:', error);
    return null;
  }
}

export async function updateDepartment(id: string, updates: Partial<Department>): Promise<Department | null> {
  try {
    const { data, error } = await supabase
      .from('departments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in updateDepartment:', error);
    return null;
  }
}

export async function deleteDepartment(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error in deleteDepartment:', error);
    return false;
  }
}
