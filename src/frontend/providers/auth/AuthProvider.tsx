"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";


interface User {

  id: string;

  name: string;

  role: string;

}



interface AuthContextType {

  user?: User;

  loading: boolean;

  authenticated: boolean;

  refreshUser: () => Promise<void>;

}



const AuthContext =
  createContext<AuthContextType>({
    loading: true,
    authenticated: false,
    refreshUser: async () => {},
  });



export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {


  const [user,setUser] =
    useState<User>();


  const [loading,setLoading] =
    useState(true);



  async function refreshUser() {

    try {

      const response =
        await fetch(
          "/api/auth/me"
        );


      if (!response.ok) {

        setUser(undefined);

        return;

      }


      const data =
        await response.json();


      setUser(
        data.user
      );


    } finally {

      setLoading(false);

    }

  }



  useEffect(() => {

    refreshUser();

  }, []);



  return (

    <AuthContext.Provider

      value={{
        user,
        loading,
        authenticated:
          Boolean(user),
        refreshUser,
      }}

    >

      {children}

    </AuthContext.Provider>

  );

}



export function useAuth() {

  return useContext(
    AuthContext
  );

}
