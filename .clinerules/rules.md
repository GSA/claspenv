# TypeScript Conventions

## Code Style
- Use 2-space indentation
- Prefer `const` over `let`, do not use `var`
- Always use explicit return types for functions
- Always import instead of require for modules
- Prefer arrow functions over function expressions
- Prefer arrow functions for callbacks and event handlers
- Use `//` for single-line and multi-line comments
- Prefer `===` over `==` and `!==` over `!=`
- Use prettier to format code automatically
- Use eslint to look for code quality issues

## Naming Conventions
- Use PascalCase for class names
- Use camelCase for variables and functions
- Use UPPER_CASE for constants
- Prefix boolean variables with `is`, `has`, or `should`
- Use descriptive names; avoid abbreviations
- Avoid generic names like `data`, `value`, `item` unless contextually clear

## Testing
- Use Jest as the testing framework
- Write unit tests for all possible pure and utility functions
- Mock external dependencies in tests
- Use `describe` and `it` blocks for test organization
- Use `beforeEach` and `afterEach` for test setup and teardown
- Use `expect` for assertions
- Use `toEqual` for object comparison
- Use `toHaveBeenCalledTimes` for testing function calls
- Use `toHaveBeenCalledWith` or `toBeCalledWith` for testing function arguments
- Use `toBe` for primitive comparisons
- Use `toBeTruthy` and `toBeFalsy` for boolean checks
- Use `jest.mock` for mocking modules
- Use `jest.fn` for mocking functions
- Use `mockImplementation` for mocking function behavior
- Use `mockRestore` to restore original function
- Use `toThrow` for testing for errors
- Use `toThrowError` for testing for errors with specific messages
- Use `spyOn` for testing function calls
- Use mock of `process.exit` to test when `process.exit` is explicitly called and with what code
- Do not directly evaluate `expect(true)` in tests
- Do not create placeholder tests
- Aim for 80%+ code coverage

## Dependencies
- Prefer native TypeScript features over external libraries
- Use `npm` for package management
