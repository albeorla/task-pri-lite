# ADR 001: Clean Architecture Implementation

## Context
Needed to isolate business logic from framework dependencies

## Options Considered
1. Monolithic MVC ❌ Hard to test
2. Clean Architecture ✅ Enables substitution of components

## Consequences
- + Independent component testing
- - Initial setup complexity 