import { Navigate } from "react-router-dom";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO:
  // replace with Supabase auth/session check

  const isAuthenticated = true;

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <>{children}</>;
}