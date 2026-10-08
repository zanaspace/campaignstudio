/**
 * Lets the screens shared with the CRM (written for Next.js) run on React Router unchanged.
 * `import Link from "next/link"` resolves here (see vite.config.js and tsconfig.json).
 */
import * as React from "react";
import { Link as RouterLink } from "react-router-dom";

type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string };

export default function Link({ href, children, ...rest }: Props) {
  return <RouterLink to={href} {...rest}>{children}</RouterLink>;
}
