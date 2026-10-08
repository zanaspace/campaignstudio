/**
 * React Router versions of the Next.js navigation hooks used by the shared screens.
 * `import { useRouter, usePathname, useSearchParams } from "next/navigation"` resolves here.
 */
import { useLocation, useNavigate, useSearchParams as useRouterSearchParams } from "react-router-dom";

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (to: string) => navigate(to),
    replace: (to: string, _opts?: { scroll?: boolean }) => navigate(to, { replace: true }),
    back: () => navigate(-1),
  };
}

export function usePathname() {
  return useLocation().pathname;
}

export function useSearchParams() {
  return useRouterSearchParams()[0];
}
