# Changes included

## Date format

- Replaces the front-end date helper with validation and formatting for `MM-DD-YYYY`.
- Keeps ISO `YYYY-MM-DD` internally for storage, sorting, database compatibility, and Gantt calculations.
- Updates task creation/editing to report `start_date must be a MM-DD-YYYY date.` when a bad date is entered.
- Updates project creation to use the same date validation.
- Updates server-side `normalizeDate()` so API requests accept `MM-DD-YYYY`, `M-D-YYYY`, `MM/DD/YYYY`, and `YYYY-MM-DD`, then store as `YYYY-MM-DD`.

## Create Project building picker

- Adds `addCustomBuilding()` helper in `Dashboard.jsx`.
- Replaces the Building dropdown block with a dropdown plus an `Add` button.
- Adds `.select-with-button` styles and mobile stacking.
