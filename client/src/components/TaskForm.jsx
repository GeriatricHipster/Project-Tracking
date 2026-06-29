import { useEffect, useMemo, useState } from 'react';
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Priority
              <select
                disabled={!canEdit}
                value={form.priority}
                onChange={(event) => updateField('priority', event.target.value)}
              >
                {priorityOptions.map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Percent complete
              <input
                disabled={!canEdit}
                type="number"
                min="0"
                max="100"
                value={form.percent_complete}
                onChange={(event) => updateField('percent_complete', event.target.value)}
              />
            </label>
          </div>

          <div className="two-col">
            <label>
              Color
              <input
                disabled={!canEdit}
                type="color"
                value={form.color}
                onChange={(event) => updateField('color', event.target.value)}
              />
            </label>

            <label>
              Sort order
              <input
                disabled={!canEdit}
                type="number"
                value={form.sort_order}
                onChange={(event) => updateField('sort_order', event.target.value)}
                placeholder="Auto"
              />
            </label>
          </div>
        </section>

        <section className="panel task-section">
          <div className="panel-heading">
            <div>
              <h3>Notes</h3>
              <p>Add the scope, details, and anything else the team should know.</p>
            </div>
          </div>

          <label>
            Description
            <textarea
              disabled={!canEdit}
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              placeholder="Scope, constraints, notes, inspection needs"
            />
          </label>
        </section>

        {error && <p className="error-box">{error}</p>}

        <div className="task-form-actions">
          <button className="primary-button" disabled={!canEdit || saving}>
            {saving ? 'Saving...' : editingTask ? 'Update task' : 'Create task'}
          </button>
        </div>
      </form>
    </section>
  );
}
