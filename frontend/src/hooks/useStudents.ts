import { useState, useEffect } from 'react';
import { StudentListItem } from '@/types';
import { studentService } from '@/services/studentService';

interface UseStudentsOptions {
  department?: string;
  class?: string;
  status?: string;
}

export const useStudents = (options?: UseStudentsOptions) => {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        setError(null);
        // Note: studentService.getAllStudents now optionally accepts options
        const data = await studentService.getAllStudents(); 
        setStudents(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch students'));
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [options?.department, options?.class, options?.status]);

  const search = async (query: string) => {
    try {
      setLoading(true);
      const data = await studentService.searchStudents(query);
      setStudents(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Search failed'));
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    try {
      setLoading(true);
      const data = await studentService.getAllStudents();
      setStudents(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch students'));
    } finally {
      setLoading(false);
    }
  };

  return {
    students,
    loading,
    error,
    search,
    refetch,
  };
};
