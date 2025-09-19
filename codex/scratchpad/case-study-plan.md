# Case Study Template Plan
1. Add MDX support to Next.js (dependency, config, type declarations) so `.mdx` files compile and are typed.
2. Create case study data loader utilities and dynamic `[slug]` route under `/[locale]/work/` that can render MDX modules with metadata.
3. Implement the reusable case study layout components (SFDRR sections) and author the inaugural `atlas-commerce` example MDX using the new template.
4. Wire metadata (generateStaticParams/Metadata) and ensure lint/type/tests pass before committing.
