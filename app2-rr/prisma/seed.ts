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

  const user = await prisma.user.upsert({
    where: { email: data.email },
    update: {
      name: data.name,
      // role: data.role, // Move to raw below
      designation: data.designation || null,
      domain: data.domain || null,
      parentId: data.parentId || null,
      isActive: true,
    },
    create: {
      name: data.name,
      email: data.email,
      passwordHash,
      // role: data.role, // Move to raw below
      designation: data.designation || null,
      domain: data.domain || null,
      parentId: data.parentId || null,
      isActive: true,
    },
  });

  // Robust raw update for role
  await prisma.$executeRaw`UPDATE users SET role = ${data.role}::"UserRole" WHERE id = ${user.id}`;
  return user;
}

async function setRR(
  userId: string,
  rows: Array<{
    title: string;
    responsibilities: string;
    kpiTargets: string;
    actionPoints?: string | null;
  }>
) {
  await prisma.rRCategory.deleteMany({ where: { userId } });
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
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

async function main() {
  console.log('Seeding MASTER ORGANIZATIONAL STRUCTURE (32 Employees)...');

  await prisma.kPIProgress.deleteMany();
  await prisma.rRCategory.deleteMany();
  await prisma.user.deleteMany();

  // LEVEL 1 & 2: DC HEADS
  const sriAditya = await upsertUser({
    name: 'C. Sri Aditya',
    email: 'sriaditya@dc.com',
    role: UserRole.SUPER_BOSS,
    designation: 'DC Head - Applications',
    domain: 'Management',
  });

  const rahul = await upsertUser({
    name: 'D. Rahul',
    email: 'rahul@dc.com',
    role: UserRole.SUPER_BOSS,
    designation: 'DC Head - Infrastructure',
    domain: 'Management',
    parentId: sriAditya.id, // Reports to Sri Aditya as per grouping
  });

  // LEVEL 3: REPORTING MANAGERS
  const phaneeswarnadh = await upsertUser({
    name: 'A V Phaneeswarnadh',
    email: 'phaneeswar@dc.com',
    role: UserRole.MANAGER,
    designation: 'Master Control - Team Excellence',
    domain: 'Applications',
    parentId: sriAditya.id,
  });

  const jaganMohan = await upsertUser({
    name: 'DK Jagan Mohan',
    email: 'jaganmohan@dc.com',
    role: UserRole.MANAGER,
    designation: 'Manager - Field Operations',
    domain: 'Applications',
    parentId: sriAditya.id,
  });

  const madhusudanRao = await upsertUser({
    name: 'K. Madhu Bhushana Rao',
    email: 'madhusudan@dc.com',
    role: UserRole.MANAGER,
    designation: 'Manager - DC Operations',
    domain: 'Applications',
    parentId: sriAditya.id,
  });

  // LEVEL 4: TEAM MEMBERS DISTRIBUTION

  // 👨💼 Rahul Team (Infra focused)
  const rahulTeam = [
    { name: 'D Ganesh', email: 'ganesh@dc.com', role: 'DEVELOPMENT' },
    { name: 'G Venkateswarlu', email: 'venkateswarlu@dc.com', role: 'NETWORK' },
    { name: 'Gundu Appalasuryanarayana', email: 'gundu@dc.com', role: 'EMS' },
    { name: 'Guttula Devi Naga Manoj', email: 'manoj@dc.com', role: 'SERVERS' },
    { name: 'Madhu Bhushan Rao (Specialist)', email: 'mbrao@dc.com', role: 'DC INFRA' },
    { name: 'Kakani Gopinath', email: 'gopinath@dc.com', role: 'STORAGE' },
    { name: 'Mettaparthi Rajesh', email: 'rajesh@dc.com', role: 'SERVERS' },
    { name: 'Thunguntla Naga Venkata Surendra', email: 'surendra@dc.com', role: 'NETWORK' },
  ];

  // 👨💼 Phaneeswarnadh Team
  const phanisTeam = [
    { name: 'Chikkam Kavya Asha Swaroopa', email: 'kavya@dc.com', role: 'ITMS' },
    { name: 'Danaboina Mohankrishna', email: 'mohan@dc.com', role: 'ITMS' },
    { name: 'G Bhanu Kiran', email: 'bhanu@dc.com', role: 'ITMS' },
    { name: 'Jannu Raja Naveen', email: 'naveen@dc.com', role: 'ITMS' },
    { name: 'UPPADA AKHIL BABU', email: 'akhil@dc.com', role: 'ITMS' },
  ];

  // 👨💼 Jagan Mohan Team
  const jaganTeam = [
    { name: 'Baji Lokesh', email: 'baji@dc.com', role: 'ITMS' },
    { name: 'Jetti Veeranjaneyulu', email: 'jetti@dc.com', role: 'ITMS' },
    { name: 'KMSS Ananda Varma', email: 'ananda@dc.com', role: 'ITMS' },
    { name: 'Koppolu Thanru Tej', email: 'thanuthej@dc.com', role: 'FRS' },
    { name: 'N Vijayaratnam', email: 'vijay@dc.com', role: 'ITMS' },
    { name: 'N Venkata Sai Pavan Kumar Reddy', email: 'pavan@dc.com', role: 'EMS' },
    { name: 'Pendyala Dharanidhar', email: 'dharani@dc.com', role: 'ITMS' },
  ];

  // 👨💼 Madhusudan Rao Team
  const madhuTeam = [
    { name: 'Datla Ramakrishna Raju', email: 'ramakrishna@dc.com', role: 'ITMS' },
    { name: 'Gangula Rasi', email: 'rasi@dc.com', role: 'ITMS' },
    { name: 'Kruttiventi Bhagavan', email: 'bhagavan@dc.com', role: 'IVMS' },
    { name: 'Majji Vamsi Kishore', email: 'vamsi@dc.com', role: 'ITMS' },
    { name: 'Mamidala Bhavya Naga Sri Sai Krupa Veeramani', email: 'bhavya@dc.com', role: 'FRS' },
    { name: 'Nadimpalli Soma Sangeetha', email: 'sangeetha@dc.com', role: 'ITMS' },
    { name: 'Tanneeru Lakshmi Prasanna Kumar', email: 'prasanna@dc.com', role: 'ITMS' },
  ];

  const teams = [
    { list: rahulTeam, parent: rahul },
    { list: phanisTeam, parent: phaneeswarnadh },
    { list: jaganTeam, parent: jaganMohan },
    { list: madhuTeam, parent: madhusudanRao },
  ];

  for (const team of teams) {
    for (const member of team.list) {
      await upsertUser({
        name: member.name,
        email: member.email,
        role: UserRole.TEAM_MEMBER,
        designation: member.role,
        domain: member.role,
        parentId: team.parent.id,
      });
    }
  }

  // Assign KPIs for MASTER CONTROL (Phaneeswarnadh)
  await setRR(phaneeswarnadh.id, [
    {
      title: 'Master Control Operations',
      responsibilities: 'Overall monitoring of ITMS, VMS, FRS, EMS, and Infrastructure layers. Managing all team execution patterns.',
      kpiTargets: '• SLA Compliance ≥ 98%\n• Composite System Uptime ≥ 99%\n• Zero major downtime incidents',
    },
    {
      title: 'System Accuracy & Quality Assurance',
      responsibilities: 'Ensure detection logic accuracy across all modules and minimize false alerts.',
      kpiTargets: '• Detection Accuracy ≥ 75–80%\n• False Positive Rate ≤ 5%',
    },
    {
       title: 'Incident Governance',
       responsibilities: 'Review ticket closures and system health logs daily.',
       kpiTargets: '• Ticket Closure Rate ≥ 95%\n• Audit accuracy 100%',
    }
  ]);

  // Roles Template for R&R Mapping (Section 5 & 6)
  const roleTemplates = {
    ITMS: {
      title: 'ITMS Role',
      responsibilities: 'Work: Traffic monitoring system governance and reliability.',
      kpiTargets: '• SLA compliance ≥ 95%\n• Issue resolution within SLA TAT',
    },
    EMS: {
      title: 'EMS Role',
      responsibilities: 'Work: Alerts and infrastructure monitoring.',
      kpiTargets: '• Alert response < 5 min\n• Tool uptime ≥ 99%',
    },
    IVMS: {
       title: 'IVMS/VMS Role',
       responsibilities: 'Work: Video system health and recording storage management.',
       kpiTargets: '• Recording availability ≥ 99%\n• Zero data loss incidents',
    },
    NETWORK: {
       title: 'NETWORK Role',
       responsibilities: 'Work: Infrastructure connectivity and core routing.',
       kpiTargets: '• Incident response < 15 min\n• Uptime ≥ 99%',
    },
    DEVELOPMENT: {
       title: 'DEVELOPMENT Role (MATRIX PLATFORM)',
       responsibilities: 'Work: Dashboard development, Automation scripts, and BI reports.',
       kpiTargets: '• Feature delivery SLA compliance\n• Bug resolution TAT\n• Automation success %',
    }
  };

  // Map Ganesh (DEVELOPMENT) R&R
  const ganesh = await prisma.user.findUnique({ where: { email: 'ganesh@dc.com' } });
  if (ganesh) {
    await setRR(ganesh.id, [roleTemplates.DEVELOPMENT]);
  }

  console.log('Master organization structure seeded successfully (32 Employees).');
  console.log('Login as C. Sri Aditya: sriaditya@dc.com / DC@2026');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());