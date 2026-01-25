"use client";

import { NotificationProvider } from "@/components/utils/NotificationContext";
import { UserProvider } from "@/context/UserContext";
export function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return( 
        <UserProvider>
            <NotificationProvider>
                {children}
            </NotificationProvider>
        </UserProvider>
  )
}
