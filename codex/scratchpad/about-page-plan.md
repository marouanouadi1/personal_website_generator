## Plan for About Page with Navigable CV

1. Review existing translations and component patterns to model the About page content and layout structure.
2. Update `messages/en.json` and `messages/it.json` with localized copy for the About page, including CV section metadata and entries.
3. Implement `app/[locale]/about/page.tsx` to render the About page using the localized data, with an in-page navigation component and section markup for the CV.
4. Add any supporting UI helpers if needed (e.g., simple components for entries) while keeping the structure consistent with existing styling utilities.
5. Run lint, type-check, and tests to ensure the new page integrates cleanly.
