import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 text-center font-bold rounded-xl min-h-11 ' +
  'transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-cs-brick focus-visible:ring-offset-2 focus-visible:ring-offset-cs-paper ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

const variants: Record<Variant, string> = {
  primary: 'bg-cs-brick text-white hover:bg-cs-brick-dark',
  secondary: 'bg-cs-card text-cs-ink border border-cs-line hover:border-cs-ink',
  ghost: 'text-cs-ink hover:bg-cs-sand',
};

const sizes: Record<Size, string> = {
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
};

type CommonProps = { variant?: Variant; size?: Size; icon?: ReactNode; children: ReactNode; className?: string };

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className = '') {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`.trim();
}

/** Link-styled button. Internal paths use next/link; `#hash` and external URLs use <a>. */
export function ButtonLink({
  href,
  variant,
  size,
  icon,
  children,
  className,
  ...rest
}: CommonProps & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className'>) {
  const cls = buttonClass(variant, size, className);
  const content = (
    <>
      <span>{children}</span>
      {icon}
    </>
  );
  if (href.startsWith('/') && !href.startsWith('//')) {
    return (
      <Link href={href} className={cls} {...rest}>
        {content}
      </Link>
    );
  }
  return (
    <a href={href} className={cls} {...rest}>
      {content}
    </a>
  );
}

export function Button({
  variant,
  size,
  icon,
  children,
  className,
  type = 'button',
  ...rest
}: CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...rest}>
      <span>{children}</span>
      {icon}
    </button>
  );
}
