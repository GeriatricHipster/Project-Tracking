# Changes in this version

- Fixed project screen blanking caused by unhandled UI errors.
- Restored the Light/Dark mode button by fixing the theme/background control layout.
- Hardened date parsing for project/task dates.
- Dates now display as `MM-DD-YYYY` while database/API storage remains ISO `YYYY-MM-DD`.
- Task and project forms now show `start_date must be a MM-DD-YYYY date.` for bad date input.
- The backend accepts `MM-DD-YYYY`, `M-D-YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD`, and ISO timestamp date values.
- Added an **Add** button next to the Building dropdown on the Create Project panel.
- Added UI error boundaries so the dashboard/project/Gantt areas show a recoverable error panel instead of a blank app.
