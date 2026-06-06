````markdown
# TanksFlashMobile Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches the core development patterns and conventions used in the TanksFlashMobile TypeScript codebase. It covers file organization, code style, commit message conventions, and testing practices to ensure consistency and maintainability across the project. While no external framework is detected, the repository uses vitest for testing and follows conventional commit patterns.

## Coding Conventions

### File Naming

- Use **camelCase** for all file names.
  - Example: `gameLogic.ts`, `playerManager.ts`

### Import Style

- Use **relative imports** for referencing local modules.
  - Example:
    ```typescript
    import player from "./playerManager";
    ```

### Export Style

- Use **default exports** for modules.
  - Example:
    ```typescript
    const GameLogic = {
      /* ... */
    };
    export default GameLogic;
    ```

### Commit Messages

- Follow **conventional commit** format.
- Common prefixes: `fix`, `test`
- Example:
````

fix: correct player movement calculation
test: add unit tests for collision detection

````

## Workflows

### Running Tests
**Trigger:** When you want to run the test suite to verify code correctness.
**Command:** `/run-tests`

1. Ensure vitest is installed (`npm install` if not).
2. Run the test suite:
  ```bash
  npx vitest
  ```
3. Review the output for passing and failing tests.

### Writing Tests
**Trigger:** When adding new features or fixing bugs.
**Command:** `/write-test`

1. Create a new test file using camelCase, ending with `.test.ts`.
  - Example: `playerManager.test.ts`
2. Import the module to test using a relative path.
  ```typescript
  import playerManager from './playerManager'
  ```
3. Write test cases using vitest syntax.
  ```typescript
  import { describe, it, expect } from 'vitest'

  describe('playerManager', () => {
    it('should initialize with zero players', () => {
      expect(playerManager.count()).toBe(0)
    })
  })
  ```
4. Run `/run-tests` to verify your tests.

### Making Commits
**Trigger:** When committing code changes.
**Command:** `/commit`

1. Write a commit message using the conventional commit format:
  ```
  <type>: <short description>
  ```
  - Example: `fix: resolve tank movement bug`
2. Use relevant prefixes (`fix`, `test`, etc.).
3. Keep the message concise (average 64 characters).

## Testing Patterns

- All test files use the `.test.ts` suffix and are written in TypeScript.
- Tests are organized using vitest's `describe`, `it`, and `expect` functions.
- Example test file:
  ```typescript
  // tankController.test.ts
  import tankController from './tankController'
  import { describe, it, expect } from 'vitest'

  describe('tankController', () => {
    it('should fire when shoot is called', () => {
      expect(tankController.shoot()).toBe(true)
    })
  })
  ```

## Commands
| Command       | Purpose                                 |
|---------------|-----------------------------------------|
| /run-tests    | Run the vitest test suite               |
| /write-test   | Guide for writing a new test file       |
| /commit       | Instructions for making a proper commit |
````
