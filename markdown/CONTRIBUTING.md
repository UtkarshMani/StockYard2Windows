# Contributing to Inventory Management System

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes
6. Commit with clear messages
7. Push to your fork
8. Create a Pull Request

## Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Docker (optional)

### Setup Steps
```bash
# Run the setup script
./setup.sh  # Linux/Mac
setup.bat   # Windows

# Or manually
cd backend && npm install && npm run prisma:generate
cd frontend && npm install
```

## Code Style

### TypeScript
- Use TypeScript for all new code
- Follow existing patterns
- Add type annotations
- Avoid `any` type when possible

### Naming Conventions
- **Files**: kebab-case (e.g., `auth.controller.ts`)
- **Components**: PascalCase (e.g., `BarcodeScanner.tsx`)
- **Functions**: camelCase (e.g., `getUserById`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_VERSION`)

### Code Formatting
- Use ESLint and Prettier
- Run `npm run lint` before committing
- 2 spaces for indentation
- Single quotes for strings

## Commit Messages

Follow the conventional commits format:

```
type(scope): subject

body (optional)

footer (optional)
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Build process or tooling changes

**Examples**:
```
feat(auth): add password reset functionality
fix(stock): correct quantity calculation in stock out
docs(readme): update installation instructions
```

## Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Manual Testing
- Test all user roles
- Test barcode scanning on mobile
- Test real-time updates
- Test error scenarios

## Pull Request Process

1. **Update Documentation**: Update README.md if needed
2. **Add Tests**: Add tests for new features
3. **Check Linting**: Run `npm run lint`
4. **Test Thoroughly**: Test your changes
5. **Update ASSIGNMENTS.md**: Document implementation details
6. **Write Clear Description**: Explain what and why

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested locally
- [ ] Added unit tests
- [ ] Tested on mobile
- [ ] Tested real-time features

## Screenshots
(if applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] No new warnings
- [ ] Added tests
- [ ] All tests pass
```

## Feature Requests

Create an issue with:
- Clear description
- Use case
- Expected behavior
- Mockups (if applicable)

## Bug Reports

Create an issue with:
- Clear title
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots
- Environment (OS, browser, versions)

## Code Review Guidelines

When reviewing PRs:
- Be constructive and respectful
- Focus on the code, not the person
- Suggest improvements
- Explain reasoning
- Approve when ready

## Project Structure

### Backend
```
backend/src/
├── controllers/  # Business logic
├── routes/       # API routes
├── middleware/   # Express middleware
├── config/       # Configuration
└── utils/        # Utilities
```

### Frontend
```
frontend/src/
├── app/         # Next.js pages
├── components/  # React components
├── lib/         # Utilities
└── store/       # State management
```

## Key Technologies

- **Backend**: Node.js, Express, Prisma, PostgreSQL
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Real-time**: Socket.IO
- **Auth**: JWT
- **Barcode**: @zxing/library

## Questions?

- Open an issue for questions
- Check existing issues first
- Be patient and respectful

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉
