/**
 * Vitest global setup — runs once before every test file.
 * Adds custom matchers from @testing-library/jest-dom (toBeInTheDocument,
 * toHaveClass, etc.) so tests read naturally.
 */
import "@testing-library/jest-dom/vitest";
