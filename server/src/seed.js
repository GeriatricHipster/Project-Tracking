const bcrypt = require('bcryptjs');
const { pool, tx } = require('./db');

const demoTasks = [
  {
    name: 'Mobilization and site setup',
    description: 'Temporary fencing, trailer setup, safety signage, utilities, and logistics plan.',
    trade: 'General Conditions',
    status: 'complete',
    priority: 'high',
    start_date: '2026-06-01',
    end_date: '2026-06-05',
    percent_complete: 100,
    color: '#0f766e'
  },
  {
    name: 'Demolition and selective removals',
    description: 'Interior removals, floor prep, and debris haul-off.',
    trade: 'Demolition',
    status: 'complete',
    priority: 'high',
    start_date: '2026-06-08',
    end_date: '2026-06-19',
    percent_complete: 85,
    color: '#b45309'
  },
  {
    name: 'Underground plumbing rough-in',
    description: 'Sawcut, trench, underground waste and water lines, backfill.',
    trade: 'Plumbing',
    status: 'in_progress',
    priority: 'critical',
    start_date: '2026-06-22',
    end_date: '2026-07-02',
    percent_complete: 35,
    color: '#0284c7'
  },
  {
    name: 'Electrical rough-in',
    description: 'Branch conduit, panels, homeruns, and above-ceiling rough-in.',
    trade: 'Electrical',
    status: 'not_started',
    priority: 'normal',
    start_date: '2026-07-06',
    end_date: '2026-07-24',
    percent_complete: 0,
    color: '#ca8a04'
  },
  {
    name: 'HVAC ductwork and equipment rough-in',
    description: 'Duct mains, VAV boxes, refrigerant lines, equipment pads.',
    trade: 'Mechanical',
    status: 'not_started',
    priority: 'normal',
    start_date: '2026-07-06',
    end_date: '2026-07-27',
    percent_complete: 0,
    color: '#7c3aed'
  },
  {
    name: 'Framing and drywall hang',
    description: 'Metal stud framing, backing, drywall hanging, and inspections.',
    trade: 'Drywall',
    status: 'not_started',
    priority: 'normal',
    start_date: '2026-07-20',
    end_date: '2026-08-07',
    percent_complete: 0,
    color: '#4b5563'
  },
  {
    name: 'Drywall finish and paint primer',
    description: 'Tape, texture, sand, prime walls and ceilings.',
    trade: 'Finishes',
    status: 'not_started',
    priority: 'normal',
    start_date: '2026-08-10',
    end_date: '2026-08-21',
    percent_complete: 0,
    color: '#db2777'
  },
  {
    name: 'Ceilings, flooring, and casework',
    description: 'ACT grid, flooring install, millwork and casework.',
    trade: 'Finishes',
    status: 'not_started',
    priority: 'normal',
    start_date: '2026-08-24',
    end_date: '2026-09-11',
    percent_complete: 0,
    color: '#16a34a'
  },
  {
    name: 'MEP trim and startup',
    description: 'Device trim, plumbing fixtures, HVAC controls, testing and balancing.',
    trade: 'MEP',
    status: 'not_started',
    priority: 'high',
    start_date: '2026-09-08',
    end_date: '2026-09-22',
    percent_complete: 0,
    color: '#2563eb'
  },
  {
    name: 'Punch list, inspections, and turnover',
    description: 'Final inspections, owner punch, closeout documents, training, and turnover.',
    trade: 'Closeout',
    status: 'not_started',
    priority: 'critical',
    start_date: '2026-09-23',
    end_date: '2026-09-30',
    percent_complete: 0,
    color: '#dc2626'
  }
];

async function seed() {
  await tx(async (client) => {
    const email = 'admin@demo.com';
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    let userId;

    if (existingUser.rowCount) {
      userId = existingUser.rows[0].id;
    } else {
      const passwordHash = await bcrypt.hash('Construction123!', 12);
      const insertedUser = await client.query(
        'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
        ['Demo Project Manager', email, passwordHash]
      );
      userId = insertedUser.rows[0].id;
    }

    const existingProject = await client.query('SELECT id FROM projects WHERE name = $1 AND created_by = $2', [
      'Demo Commercial Buildout',
      userId
    ]);

    let projectId;
    if (existingProject.rowCount) {
      projectId = existingProject.rows[0].id;
    } else {
      const insertedProject = await client.query(
        `INSERT INTO projects (name, location, description, start_date, end_date, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          'Demo Commercial Buildout',
          'Denver, CO',
          'Tenant improvement demo schedule showing multi-trade coordination and closeout.',
          '2026-06-01',
          '2026-09-30',
          userId
        ]
      );
      projectId = insertedProject.rows[0].id;
    }

    await client.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, 'owner')
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [projectId, userId]
    );

    const taskCount = await client.query('SELECT count(*)::int AS count FROM tasks WHERE project_id = $1', [projectId]);
    if (taskCount.rows[0].count === 0) {
      const taskIds = [];
      for (let index = 0; index < demoTasks.length; index += 1) {
        const task = demoTasks[index];
        const insertedTask = await client.query(
          `INSERT INTO tasks
            (project_id, name, description, trade, assigned_to, status, priority, start_date, end_date, percent_complete, color, sort_order, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           RETURNING id`,
          [
            projectId,
            task.name,
            task.description,
            task.trade,
            userId,
            task.status,
            task.priority,
            task.start_date,
            task.end_date,
            task.percent_complete,
            task.color,
            index + 1,
            userId
          ]
        );
        taskIds.push(insertedTask.rows[0].id);
      }

      const dependencies = [
        [0, 1],
        [1, 2],
        [2, 3],
        [2, 4],
        [3, 5],
        [4, 5],
        [5, 6],
        [6, 7],
        [7, 8],
        [8, 9]
      ];

      for (const [predecessorIndex, successorIndex] of dependencies) {
        await client.query(
          `INSERT INTO task_dependencies (project_id, predecessor_task_id, successor_task_id, type, lag_days)
           VALUES ($1, $2, $3, 'FS', 0)
           ON CONFLICT DO NOTHING`,
          [projectId, taskIds[predecessorIndex], taskIds[successorIndex]]
        );
      }

      await client.query(
        `INSERT INTO audit_log (project_id, user_id, action, entity_type, entity_id, after_data)
         VALUES ($1, $2, 'seeded', 'project', $1, $3::jsonb)`,
        [projectId, userId, JSON.stringify({ message: 'Seeded demo project with schedule tasks.' })]
      );
    }
  });

  console.log('Seed completed. Demo login: admin@demo.com / Construction123!');
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
