import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AuthUser } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  userProfile: any | null;
  userRole: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth initial check timeout')), 15000)
      );

      try {
        const {
          data: { session },
        } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]) as any;

        if (session?.user) {
          setUser(session.user as AuthUser);
          
          // Fetch user profile from users table
          const { data, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (profileError) {
            console.warn('Profile fetch error (possibly missing profile):', profileError);
          }
          
          if (data) {
            setUserProfile(data);
          }
        }
      } catch (error: any) {
        console.error('Error checking auth status (or timeout):', error);
        setAuthError(error.message || 'Authentication check timed out');
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserProfile(null);
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        setUser(session.user as AuthUser);
        // Fetch user profile
        try {
          const { data, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (profileError) throw profileError;

          if (data) {
            setUserProfile(data);
          } else {
            setUserProfile(null);
          }
        } catch (error) {
          console.error('Error fetching profile on auth change:', error);
          setUserProfile(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Login attempt timed out. Please try refreshing or checking your connection.')), 20000)
    );

    try {
      const { error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeoutPromise
      ]) as any;

      if (error) throw new Error(error.message);
    } catch (err: any) {
      console.error('Login error:', err);
      throw err;
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    setUser(null);
    setUserProfile(null);
    window.location.href = '/login';
  };

  const userRole = userProfile?.role || null;
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        userRole,
        isLoading,
        login,
        logout,
        isAuthenticated,
        error: authError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
