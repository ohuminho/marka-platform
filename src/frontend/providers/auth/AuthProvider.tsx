"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface AuthUserProfile {
  displayName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  countryCode: string | null;
  locale: string | null;
  timezone: string | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  emailVerifiedAt: string | null;
  profile: AuthUserProfile | null;
}

export interface AuthOrganization {
  id: string;
  name: string;
  slug: string;
}

export interface AuthorizationState {
  organizationId?: string;
  roles: string[];
  permissions: string[];
}

interface AuthContextType {
  user?: AuthUser;
  organizations: AuthOrganization[];
  activeOrganization?: AuthOrganization;
  authorization: AuthorizationState;
  loading: boolean;
  authenticated: boolean;

  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;

  setActiveOrganization: (
    organizationId: string
  ) => Promise<void>;

  refreshUser: (
    organizationId?: string
  ) => Promise<void>;
}

const ACTIVE_ORGANIZATION_STORAGE_KEY =
  "marka.activeOrganizationId";

const emptyAuthorization: AuthorizationState = {
  organizationId: undefined,
  roles: [],
  permissions: [],
};

const AuthContext =
  createContext<AuthContextType>({
    organizations: [],
    authorization: emptyAuthorization,
    loading: true,
    authenticated: false,

    hasPermission: () => false,
    hasAnyPermission: () => false,
    hasAllPermissions: () => false,

    setActiveOrganization: async () => {},
    refreshUser: async () => {},
  });

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<AuthUser>();

  const [organizations, setOrganizations] =
    useState<AuthOrganization[]>([]);

  const [authorization, setAuthorization] =
    useState<AuthorizationState>(
      emptyAuthorization
    );

  const [loading, setLoading] =
    useState(true);

  const refreshUser = async (
    organizationId?: string
  ) => {
    try {
      const query = organizationId
        ? `?organizationId=${encodeURIComponent(
            organizationId
          )}`
        : "";

      const response = await fetch(
        `/api/auth/me${query}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        setUser(undefined);
        setOrganizations([]);
        setAuthorization(
          emptyAuthorization
        );
        return;
      }

      const data =
        await response.json();

      setUser(data.user);
      setOrganizations(
        Array.isArray(data.organizations)
          ? data.organizations
          : []
      );

      setAuthorization({
        organizationId:
          data.authorization
            ?.organizationId,
        roles:
          Array.isArray(
            data.authorization?.roles
          )
            ? data.authorization.roles
            : [],
        permissions:
          Array.isArray(
            data.authorization?.permissions
          )
            ? data.authorization.permissions
            : [],
      });
    } catch (error) {
      console.error(
        "[AUTH_PROVIDER_REFRESH_ERROR]",
        error
      );

      setUser(undefined);
      setOrganizations([]);
      setAuthorization(
        emptyAuthorization
      );
    } finally {
      setLoading(false);
    }
  };

  const setActiveOrganization =
    async (
      organizationId: string
    ) => {
      const organization =
        organizations.find(
          (item) =>
            item.id === organizationId
        );

      if (!organization) {
        throw new Error(
          "Organization is not available to the current user."
        );
      }

      window.localStorage.setItem(
        ACTIVE_ORGANIZATION_STORAGE_KEY,
        organizationId
      );

      setLoading(true);

      await refreshUser(
        organizationId
      );
    };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const response =
          await fetch(
            "/api/auth/me",
            {
              method: "GET",
              credentials: "include",
              cache: "no-store",
            }
          );

        if (!response.ok) {
          if (mounted) {
            setUser(undefined);
            setOrganizations([]);
            setAuthorization(
              emptyAuthorization
            );
            setLoading(false);
          }

          return;
        }

        const data =
          await response.json();

        if (!mounted) {
          return;
        }

        const nextOrganizations =
          Array.isArray(
            data.organizations
          )
            ? data.organizations
            : [];

        setUser(data.user);
        setOrganizations(
          nextOrganizations
        );

        const serverOrganizationId =
          data.authorization
            ?.organizationId;

        const storedOrganizationId =
          window.localStorage.getItem(
            ACTIVE_ORGANIZATION_STORAGE_KEY
          );

        const storedOrganizationExists =
          Boolean(
            storedOrganizationId &&
              nextOrganizations.some(
                (organization: AuthOrganization) =>
                  organization.id ===
                  storedOrganizationId
              )
          );

        const preferredOrganizationId =
          storedOrganizationExists
            ? storedOrganizationId!
            : serverOrganizationId ??
              nextOrganizations[0]?.id;

        if (
          preferredOrganizationId &&
          preferredOrganizationId !==
            serverOrganizationId
        ) {
          window.localStorage.setItem(
            ACTIVE_ORGANIZATION_STORAGE_KEY,
            preferredOrganizationId
          );

          const organizationResponse =
            await fetch(
              `/api/auth/me?organizationId=${encodeURIComponent(
                preferredOrganizationId
              )}`,
              {
                method: "GET",
                credentials: "include",
                cache: "no-store",
              }
            );

          if (
            organizationResponse.ok
          ) {
            const organizationData =
              await organizationResponse.json();

            if (mounted) {
              setUser(
                organizationData.user
              );

              setOrganizations(
                Array.isArray(
                  organizationData.organizations
                )
                  ? organizationData.organizations
                  : nextOrganizations
              );

              setAuthorization({
                organizationId:
                  organizationData
                    .authorization
                    ?.organizationId,
                roles:
                  Array.isArray(
                    organizationData
                      .authorization?.roles
                  )
                    ? organizationData
                        .authorization
                        .roles
                    : [],
                permissions:
                  Array.isArray(
                    organizationData
                      .authorization?.permissions
                  )
                    ? organizationData
                        .authorization
                        .permissions
                    : [],
              });
            }
          }
        } else {
          if (
            preferredOrganizationId
          ) {
            window.localStorage.setItem(
              ACTIVE_ORGANIZATION_STORAGE_KEY,
              preferredOrganizationId
            );
          }

          setAuthorization({
            organizationId:
              data.authorization
                ?.organizationId,
            roles:
              Array.isArray(
                data.authorization?.roles
              )
                ? data.authorization.roles
                : [],
            permissions:
              Array.isArray(
                data.authorization?.permissions
              )
                ? data.authorization.permissions
                : [],
          });
        }
      } catch (error) {
        console.error(
          "[AUTH_PROVIDER_INIT_ERROR]",
          error
        );

        if (mounted) {
          setUser(undefined);
          setOrganizations([]);
          setAuthorization(
            emptyAuthorization
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  const activeOrganization =
    useMemo(
      () =>
        organizations.find(
          (organization) =>
            organization.id ===
            authorization.organizationId
        ),
      [
        organizations,
        authorization.organizationId,
      ]
    );

  const permissionSet =
    useMemo(
      () =>
        new Set(
          authorization.permissions
        ),
      [authorization.permissions]
    );

  const hasPermission = (
    permission: string
  ) =>
    permissionSet.has(permission);

  const hasAnyPermission = (
    permissions: string[]
  ) =>
    permissions.some((permission) =>
      permissionSet.has(permission)
    );

  const hasAllPermissions = (
    permissions: string[]
  ) =>
    permissions.every((permission) =>
      permissionSet.has(permission)
    );

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        activeOrganization,
        authorization,
        loading,
        authenticated:
          Boolean(user),

        hasPermission,
        hasAnyPermission,
        hasAllPermissions,

        setActiveOrganization,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
