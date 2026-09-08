# Temporary Databases

These JSON files contain the deterministic seed data for the local development environment.

## Data Reset
To safely reset your development data to this known state:

1. Open your browser console.
2. Run `localStorage.removeItem('iec_temporary_db')` OR use the application's debug clear data function (`db.reset()`).
3. Reload the application.

This will clear all runtime changes and restore the application state from these seed files.
