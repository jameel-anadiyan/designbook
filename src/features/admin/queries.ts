import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useOutlets() {
  return useQuery({
    queryKey: ['outlets'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outlets')
        .select('*')
        .order('is_head_office', { ascending: false })
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('sort_order').order('name');
      if (error) throw error;
      return data;
    },
  });
}
