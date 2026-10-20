const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const prisma = new PrismaClient();

function parseCSVLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

async function main() {
  console.log('Starting high-speed database seeding process...');

  const filePath = path.join(__dirname, 'data.csv');
  if (!fs.existsSync(filePath)) {
    console.error('data.csv not found in the prisma directory!');
    return;
  }

  // 1. Preload existing universities and courses into memory
  console.log('Loading existing universities and courses from Neon DB...');
  const existingUniversities = await prisma.university.findMany({
    include: { courses: true }
  });

  const univMap = new Map(); // universityName -> { id, name, courses: Map(courseName -> courseId) }
  for (const u of existingUniversities) {
    const cMap = new Map();
    for (const c of u.courses) {
      cMap.set(c.name.toLowerCase().trim(), c.id);
    }
    univMap.set(u.name.toLowerCase().trim(), { id: u.id, name: u.name, courses: cMap });
  }

  // 2. Preload existing subject keys (courseId + code) to avoid duplicates
  console.log('Loading existing subject index...');
  const existingSubjects = await prisma.subject.findMany({
    select: { code: true, courseId: true }
  });
  const subjectSet = new Set(existingSubjects.map(s => `${s.courseId}_${s.code.toLowerCase().trim()}`));

  console.log(`Preloaded: ${univMap.size} universities, ${existingSubjects.length} existing subjects.`);

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let isFirstLine = true;
  const newSubjects = [];
  let processedLines = 0;

  for await (const line of rl) {
    if (isFirstLine) {
      isFirstLine = false;
      continue;
    }

    if (!line.trim()) continue;
    processedLines++;

    const [universityName, programme, branch, semesterStr, subjectCode, rawSubjectName] = parseCSVLine(line);
    if (!universityName || !subjectCode) continue;

    const subjectName = (rawSubjectName || '').replace(/^"|"$/g, '').trim();
    const courseName = `${programme} ${branch}`.trim();
    const semester = `Semester ${semesterStr.trim()}`;

    // University
    const uKey = universityName.toLowerCase().trim();
    let uEntry = univMap.get(uKey);
    if (!uEntry) {
      const createdU = await prisma.university.create({
        data: { name: universityName.trim() }
      });
      uEntry = { id: createdU.id, name: createdU.name, courses: new Map() };
      univMap.set(uKey, uEntry);
      console.log(`Created University: ${createdU.name}`);
    }

    // Course
    const cKey = courseName.toLowerCase().trim();
    let courseId = uEntry.courses.get(cKey);
    if (!courseId) {
      const createdC = await prisma.course.create({
        data: {
          name: courseName,
          universityId: uEntry.id
        }
      });
      courseId = createdC.id;
      uEntry.courses.set(cKey, courseId);
      console.log(`Created Course: ${createdC.name} under ${uEntry.name}`);
    }

    // Subject Check
    const sKey = `${courseId}_${subjectCode.toLowerCase().trim()}`;
    if (!subjectSet.has(sKey)) {
      subjectSet.add(sKey);
      newSubjects.push({
        name: subjectName,
        code: subjectCode.trim(),
        semester,
        courseId
      });
    }
  }

  console.log(`Parsed ${processedLines} lines from CSV.`);
  console.log(`Found ${newSubjects.length} new subjects to insert.`);

  // Batch insert new subjects in chunks of 500 for optimal performance
  const CHUNK_SIZE = 500;
  for (let i = 0; i < newSubjects.length; i += CHUNK_SIZE) {
    const chunk = newSubjects.slice(i, i + CHUNK_SIZE);
    await prisma.subject.createMany({
      data: chunk,
      skipDuplicates: true
    });
    console.log(`Inserted batch: ${i + chunk.length} / ${newSubjects.length} subjects.`);
  }

  console.log('\n✅ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
