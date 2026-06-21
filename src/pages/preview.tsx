/*
 * DEV-ONLY route wrapper exposing the design-system preview at /preview.
 * The substantive preview lives in src/pages/_preview.tsx. Remove both files
 * before shipping; they are not part of the product.
 */
export { default } from './_preview'
