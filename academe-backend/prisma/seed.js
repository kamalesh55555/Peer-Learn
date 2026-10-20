const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding universities and curriculum data...');

  // 1. Create Universities
  const srmKtr = await prisma.university.upsert({
    where: { code: 'SRM KTR' },
    update: {},
    create: { name: 'SRM Institute of Science and Technology (KTR)', code: 'SRM KTR' },
  });

  const annaUniv = await prisma.university.upsert({
    where: { code: 'ANNA UNIV' },
    update: {},
    create: { name: 'Anna University (Affiliated Colleges)', code: 'ANNA UNIV' },
  });

  // 2. Sample syllabus entries from your PDF
  const subjects = [
    // SRM KTR Core & Electives
    { uniId: srmKtr.id, programme: 'B.Tech', dept: 'CSE', reg: 'R2021', sem: 1, code: '21MAB101T', name: 'Calculus and Linear Algebra', cat: 'Basic Science', credits: 4 },
    { uniId: srmKtr.id, programme: 'B.Tech', dept: 'CSE', reg: 'R2021', sem: 1, code: '21CSS101J', name: 'Programming for Problem Solving', cat: 'Engineering Science', credits: 4 },
    { uniId: srmKtr.id, programme: 'B.Tech', dept: 'CSE', reg: 'R2021', sem: 2, code: '21CSC101T', name: 'Object Oriented Programming', cat: 'Professional Core', credits: 3 },
    { uniId: srmKtr.id, programme: 'B.Tech', dept: 'CSE', reg: 'R2021', sem: 3, code: '21CSC201J', name: 'Data Structures', cat: 'Professional Core', credits: 4 },
    { uniId: srmKtr.id, programme: 'B.Tech', dept: 'CSE', reg: 'R2021', sem: 4, code: '21CSC205P', name: 'Database Management Systems', cat: 'Professional Core', credits: 4 },
    { uniId: srmKtr.id, programme: 'B.Tech', dept: 'CSE', reg: 'R2021', sem: 5, code: '21CSE354T', name: 'Full Stack Web Development', cat: 'Professional Elective', credits: 3 },
    // Anna University Core
    { uniId: annaUniv.id, programme: 'B.E', dept: 'CSE', reg: 'R2021', sem: 1, code: 'GE3151', name: 'Problem Solving and Python Programming', cat: 'Engineering Science', credits: 3 },
    { uniId: annaUniv.id, programme: 'B.E', dept: 'CSE', reg: 'R2021', sem: 2, code: 'CS3251', name: 'Programming in C', cat: 'Professional Core', credits: 3 },
    { uniId: annaUniv.id, programme: 'B.E', dept: 'CSE', reg: 'R2021', sem: 3, code: 'CS3301', name: 'Data Structures', cat: 'Professional Core', credits: 3 },
    { uniId: annaUniv.id, programme: 'B.E', dept: 'CSE', reg: 'R2021', sem: 5, code: 'CS3591', name: 'Computer Networks', cat: 'Professional Core', credits: 4 },
  ];

  for (const s of subjects) {
    await prisma.subject.upsert({
      where: {
        universityId_code_regulation: {
          universityId: s.uniId,
          code: s.code,
          regulation: s.reg,
        },
      },
      update: {},
      create: {
        universityId: s.uniId,
        programme: s.programme,
        department: s.dept,
        regulation: s.reg,
        semester: s.sem,
        code: s.code,
        name: s.name,
        category: s.cat,
        credits: s.credits,
      },
    });
  }

  console.log(`Successfully seeded ${subjects.length} subjects!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });