export const mockData = {
  metrics: {
    activeProjects: 8,
    revenueThisMonth: 12400,
    revenueGrowth: 18,
    pendingInvoices: 3,
    pendingAmount: 4200,
    tasksDueToday: 5
  },
  agenda: [
    { id: 1, time: '10:00 AM', title: 'Send revised mockups', client: 'Acme Design Co', priority: 'warning', done: false },
    { id: 2, time: '2:00 PM', title: 'Discovery call with Sarah', client: 'New Lead', priority: 'danger', done: false },
    { id: 3, time: '4:00 PM', title: 'Follow up on invoice', client: 'StartupXYZ', priority: 'success', done: false }
  ],
  activities: [
    { id: 1, type: 'email', description: 'Email opened by John', company: 'TechCorp', time: '2 hours ago' },
    { id: 2, type: 'call', description: 'Call logged with Lisa (12 min)', company: 'BrandCo', time: 'yesterday' },
    { id: 3, type: 'note', description: 'Note added to Website Redesign', company: 'Acme', time: 'yesterday' }
  ],
  pipelineSummary: [
    { stage: 'Lead', count: 3, value: 9000, color: 'purple' },
    { stage: 'Proposal', count: 2, value: 6500, color: 'amber' },
    { stage: 'Active', count: 8, value: 24000, color: 'green' },
    { stage: 'Complete', count: 12, value: 36000, color: 'gray' }
  ],
  clients: [
    { id: 'c1', name: 'Alara Vane', company: 'Nova Labs', email: 'alara@nova.io', projects: 2, revenue: 24500, lastActivity: '2 hours ago', status: 'Active', color: 'green' },
    { id: 'c2', name: 'Julian Thorne', company: 'Eclipse Media', email: 'julian@eclipse.com', projects: 1, revenue: 12000, lastActivity: '1 day ago', status: 'Active', color: 'green' },
    { id: 'c3', name: 'Sana Kothari', company: 'Lumina Arch', email: 'sana@lumina.design', projects: 0, revenue: 0, lastActivity: '3 days ago', status: 'Lead', color: 'amber' },
    { id: 'c4', name: 'Marcus Flint', company: 'Ironstone', email: 'marcus@ironstone.co', projects: 3, revenue: 42000, lastActivity: '1 month ago', status: 'Past', color: 'gray' }
  ],
  projects: [
    { id: 'p1', name: 'Neural Interface UI', client: 'Nova Labs', value: 15000, dateAdded: 'Apr 10', status: 'Active', stage: 'Active', category: 'Product Design' },
    { id: 'p2', name: 'Brand Rebirth 2026', client: 'Eclipse Media', value: 12000, dateAdded: 'Apr 15', status: 'Active', stage: 'Active', category: 'Branding' },
    { id: 'p3', name: 'SaaS Dashboard v3', client: 'Lumina Arch', value: 8500, dateAdded: 'Apr 20', status: 'Active', stage: 'Proposal', category: 'Web App' }
  ],
  tasks: [
    { id: 't1', title: 'Refine high-fidelity components', project: 'Neural Interface UI', priority: 'high', status: 'todo' },
    { id: 't2', title: 'Draft brand audit report', project: 'Brand Rebirth 2026', priority: 'medium', status: 'todo' },
    { id: 't3', title: 'Schedule stakeholder interview', project: 'SaaS Dashboard v3', priority: 'low', status: 'done' }
  ],
  invoices: [
    { id: 'INV-2026-001', client: 'Nova Labs', project: 'Neural Interface UI', amount: 7500, issued: 'Apr 12, 2026', due: 'Apr 27, 2026', status: 'Paid', statusColor: 'green' },
    { id: 'INV-2026-002', client: 'Eclipse Media', project: 'Brand Rebirth 2026', amount: 6000, issued: 'Apr 20, 2026', due: 'May 05, 2026', status: 'Pending', statusColor: 'amber' },
    { id: 'INV-2026-003', client: 'Nova Labs', project: 'Neural Interface UI', amount: 7500, issued: 'May 01, 2026', due: 'May 15, 2026', status: 'Pending', statusColor: 'amber' }
  ]
};
