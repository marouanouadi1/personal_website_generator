# Iteration Plan

1. Update project dependencies and scripts to add Next.js, Tailwind CSS, shadcn/ui prerequisites, and next-intl.
2. Scaffold Next.js app structure with Tailwind setup (app directory, global styles, tailwind/postcss configs, next config).
3. Integrate next-intl for it/en locales (locale routing, middleware, message files) and provide base layout/page wiring.
4. Bootstrap shadcn/ui configuration (components.json, utility helpers) ready for future component imports.
5. Adjust TypeScript and ESLint configurations so scripts + Next code coexist, ensuring existing tests remain runnable.
6. Run lint, typecheck, tests, and Next build to validate setup.
