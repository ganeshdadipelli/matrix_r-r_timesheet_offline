import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hash(password: string) {
  return bcrypt.hash(password, 12);
}

async function upsertUser(data: {
  name: string;
  email: string;
  role: UserRole;
  designation?: string | null;
  domain?: string | null;
  parentId?: string | null;
}) {
  const passwordHash = await hash('DC@2026');

  return prisma.user.upsert({
    where: { email: data.email },
    update: {
      name: data.name,
      role: data.role,
      designation: data.designation || null,
      domain: data.domain || null,
      parentId: data.parentId || null,
      isActive: true,
    },
    create: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      designation: data.designation || null,
      domain: data.domain || null,
      parentId: data.parentId || null,
      isActive: true,
    },
  });
}

async function createRRIfMissing(
  userId: string,
  rows: Array<{
    title: string;
    responsibilities: string;
    kpiTargets: string;
    actionPoints?: string | null;
  }>
) {
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];

    const existing = await prisma.rRCategory.findFirst({
      where: { userId, title: row.title },
    });

    if (!existing) {
      await prisma.rRCategory.create({
        data: {
          userId,
          title: row.title,
          responsibilities: row.responsibilities,
          kpiTargets: row.kpiTargets,
          actionPoints: row.actionPoints || null,
          sortOrder: i,
        },
      });
    }
  }
}

async function main() {
  console.log('Seeding realistic R&R dashboard...');

  await prisma.kPIProgress.deleteMany();
  await prisma.rRCategory.deleteMany();
  await prisma.user.deleteMany();

  const sriAditya = await upsertUser({
    name: 'C. Sri Aditya',
    email: 'sriaditya@dc.com',
    role: UserRole.SUPER_BOSS,
    designation: 'DC Head - Applications',
    domain: 'Applications',
  });

  const rahul = await upsertUser({
    name: 'D. Rahul',
    email: 'rahul@dc.com',
    role: UserRole.SUPER_BOSS,
    designation: 'DC Infra Head',
    domain: 'DC Infra',
  });

  const phaneeswarnadh = await upsertUser({
    name: 'A V Phaneeswarnadh',
    email: 'phaneeswar@dc.com',
    role: UserRole.MANAGER,
    designation: 'Technical Manager - Multi District',
    domain: 'Applications',
    parentId: sriAditya.id,
  });

  const jaganMohan = await upsertUser({
    name: 'DK Jagan Mohan',
    email: 'jaganmohan@dc.com',
    role: UserRole.MANAGER,
    designation: 'Operations Manager - Field Operations',
    domain: 'Applications',
    parentId: sriAditya.id,
  });

  const madhusudanRao = await upsertUser({
    name: 'K. Madhu Bhushana Rao',
    email: 'madhusudan@dc.com',
    role: UserRole.MANAGER,
    designation: 'Technical Lead - Data Center',
    domain: 'Applications',
    parentId: sriAditya.id,
  });

  const gVenkateswarlu = await upsertUser({
    name: 'G Venkateswarlu',
    email: 'venkateswarlu@dc.com',
    role: UserRole.MANAGER,
    designation: 'Infrastructure Manager',
    domain: 'DC Infra',
    parentId: rahul.id,
  });

  const teamMembers = [
    { name: 'G Bhanu Kiran', email: 'bhanu@dc.com', role: 'ITMS', parentId: phaneeswarnadh.id },
    { name: 'Jannu Raja Naveen', email: 'naveen@dc.com', role: 'ITMS', parentId: phaneeswarnadh.id },
    { name: 'UPPADA AKHIL BABU', email: 'akhil@dc.com', role: 'ITMS', parentId: phaneeswarnadh.id },
    { name: 'Chikkam Kavya Asha Swaroopa', email: 'kavya@dc.com', role: 'ITMS', parentId: phaneeswarnadh.id },
    { name: 'Danaboina Mohankrishna', email: 'mohan@dc.com', role: 'ITMS', parentId: phaneeswarnadh.id },

    { name: 'Baji Lokesh', email: 'baji@dc.com', role: 'ITMS', parentId: jaganMohan.id },
    { name: 'Jetti Veeranjaneyulu', email: 'jetti@dc.com', role: 'ITMS', parentId: jaganMohan.id },
    { name: 'KMSS Ananda Varma', email: 'ananda@dc.com', role: 'ITMS', parentId: jaganMohan.id },
    { name: 'Koppolu Thanu Tej', email: 'thanuthej@dc.com', role: 'ITMS', parentId: jaganMohan.id },
    { name: 'N Vijayaratnam', email: 'vijay@dc.com', role: 'ITMS', parentId: jaganMohan.id },
    { name: 'N Venkata Sai Pavan Kumar Reddy', email: 'pavan@dc.com', role: 'EMS', parentId: jaganMohan.id },
    { name: 'Pendyala Dharanidhar', email: 'dharani@dc.com', role: 'ITMS', parentId: jaganMohan.id },

    { name: 'Datla Ramakrishna Raju', email: 'ramakrishna@dc.com', role: 'ITMS', parentId: madhusudanRao.id },
    { name: 'Gangula Rasi', email: 'rasi@dc.com', role: 'ITMS', parentId: madhusudanRao.id },
    { name: 'Kruttiventi Bhagavan', email: 'bhagavan@dc.com', role: 'ITMS', parentId: madhusudanRao.id },
    { name: 'Majji Vamsi Kishore', email: 'vamsi@dc.com', role: 'ITMS', parentId: madhusudanRao.id },
    { name: 'Mamidala Bhavya Naga Sri Sai Krupa Veeramani', email: 'bhavya@dc.com', role: 'FRS', parentId: madhusudanRao.id },
    { name: 'Nadimpalli Soma Sangeetha', email: 'sangeetha@dc.com', role: 'ITMS', parentId: madhusudanRao.id },
    { name: 'Tanneeru Lakshmi Prasanna Kumar', email: 'prasanna@dc.com', role: 'ITMS', parentId: madhusudanRao.id },

    { name: 'D Ganesh', email: 'ganesh@dc.com', role: 'DEVELOPMENT', parentId: rahul.id },
    { name: 'Kakani Gopinath', email: 'gopinath@dc.com', role: 'STORAGE', parentId: rahul.id },
    { name: 'Thunguntla Naga Venkata Surendra', email: 'surendra@dc.com', role: 'NETWORK', parentId: rahul.id },
    { name: 'Guttula Devi Naga Manoj', email: 'manoj@dc.com', role: 'SERVERS', parentId: rahul.id },
    { name: 'D Raju', email: 'raju@dc.com', role: 'DC INFRA', parentId: sriAditya.id },
  ];

  for (const member of teamMembers) {
    await upsertUser({
      name: member.name,
      email: member.email,
      role: UserRole.TEAM_MEMBER,
      designation: member.role,
      domain: member.role,
      parentId: member.parentId,
    });
  }

  await createRRIfMissing(phaneeswarnadh.id, [
    {
      title: 'Technical Manager – Data Center (Multi-District Oversight)',
      responsibilities:
        'End-to-end ownership of ITMS, VMS, FRS ecosystems ensuring SLA compliance, system accuracy, uptime, and coordination across DC, field, analytics, and OEM teams.',
      kpiTargets:
        '• Overall SLA Compliance ≥ 98%\n• Zero SLA penalty incidents\n• Multi-district operational stability index',
      actionPoints:
        'High-end slide that explains district-wise overview and coverage of all parameters.',
    },
    {
      title: 'System Performance & Accuracy',
      responsibilities:
        'Monitor ITMS, VMS, FRS event accuracy and validation. Ensure RLVD/LPR detection efficiency. Reduce false positives and improve analytics precision.',
      kpiTargets:
        '• Composite Accuracy ≥ 94%\n• Detection Accuracy ≥ 95%\n• FRS Accuracy ≥ 92%\n• False Positive Rate ≤ 5%',
    },
    {
      title: 'Infrastructure Reliability',
      responsibilities:
        'Ensure uptime of servers, storage, network, and LPUs. Monitor VMS recording availability. Coordinate with DC executives and central specialists.',
      kpiTargets:
        '• System Availability ≥ 99%\n• Recording Uptime ≥ 99%\n• Storage Utilization ≤ 80%\n• Infra incident reduction QoQ',
      actionPoints: 'Need to reconcile with Rahul & team regularly.',
    },
    {
      title: 'DC Operations Governance',
      responsibilities:
        'Drive preventive maintenance and daily health checks. Validate backup and audit compliance. Ensure daily execution discipline across DC operations.',
      kpiTargets:
        '• Daily DC health check compliance = 100%\n• Backup success rate ≥ 99%\n• DR test success ≥ 95%\n• Audit compliance = 100%',
      actionPoints: 'Need to reconcile with Rahul & team regularly.',
    },
    {
      title: 'Service Delivery & Incident Management',
      responsibilities:
        'Monitor tickets, ensure SLA adherence, coordinate proactive alert response, and drive issue resolution across districts.',
      kpiTargets:
        '• Avg Ticket TAT ≤ 24 hrs\n• Alert Response Time ≤ 10 mins\n• SLA closure ≥ 95%\n• First-level resolution improvement',
      actionPoints:
        'Run EMS for all field and DC infra. Provide EMS training to all team members.',
    },
    {
      title: 'Reporting & Monitoring',
      responsibilities:
        'Daily/weekly/monthly reporting, dashboard monitoring, and application event visibility tracking.',
      kpiTargets:
        '• Report submission compliance = 100%\n• Dashboard accuracy = 100%\n• On-demand report TAT ≤ 24 hrs',
    },
  ]);

  await createRRIfMissing(sriAditya.id, [
    {
      title: 'Leadership Governance',
      responsibilities:
        'Define organisation hierarchy, manager ownership, representation structure, and measurable objective governance.',
      kpiTargets:
        '• Reporting structure definition = 100%\n• Manager allocation completed\n• R&R presentation readiness maintained',
    },
  ]);

  await createRRIfMissing(rahul.id, [
    {
      title: 'Infra Governance',
      responsibilities:
        'Lead infra ownership representation, team structure, maintenance visibility, and technical accountability layers.',
      kpiTargets:
        '• Infra ownership mapping = 100%\n• Reporting structure ready\n• Executive review readiness maintained',
    },
  ]);

  console.log('Seed completed');
  console.log('Login 1: sriaditya@dc.com / DC@2026');
  console.log('Login 2: rahul@dc.com / DC@2026');
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });