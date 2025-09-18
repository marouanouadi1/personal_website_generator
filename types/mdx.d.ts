declare module '*.mdx' {
  import type { ComponentPropsWithoutRef } from 'react';

  export const meta: Record<string, unknown> | undefined;
  export const metadata: Record<string, unknown> | undefined;

  const MDXComponent: (props: ComponentPropsWithoutRef<'div'>) => JSX.Element;
  export default MDXComponent;
}
