"use client";

import {
  createContext,
  useContext,
  ReactNode,
} from "react";


interface User {
  id: string;
  name: string;
  role: string;
}


interface AuthContextType {
  user?: User;
}


const AuthContext =
  createContext<AuthContextType>({});


export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {

  const value = {
    user: undefined,
  };


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );

}


export function useAuth() {
  return useContext(AuthContext);
}
