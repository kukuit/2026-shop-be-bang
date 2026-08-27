import { promises as fs } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const args = process.argv.slice(2)
const outputIndex = args.indexOf('--output')
const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : null

const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.prisma', '.md'])
const ignoredDirectories = new Set(['.git', '.next', 'node_modules', 'dist', 'build', 'coverage'])
const ignoredFiles = /(^|\/)(\.env(?:\..*)?|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|auth-ai-context\.md)$/i
const authSignal = /auth|login|logout|sign[ -]?in|sign[ -]?out|register|session|cookie|token|bearer|password|currentUser|userId|admin|firebase/i
const secretLine = /(private[_ -]?key|client[_ -]?secret|api[_ -]?key|password|authorization)\s*[:=]/i

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(absolute))
    else files.push(absolute)
  }
  return files
}

function relative(file) {
  return path.relative(root, file).replaceAll('\\', '/')
}

function redact(content) {
  return content.split(/\r?\n/).map(line => secretLine.test(line) && !line.includes('process.env')
    ? `${line.match(/^\s*/)?.[0] ?? ''}[REDACTED SECRET-LIKE LINE]`
    : line).join('\n')
}

const allFiles = await walk(root)
const candidates = []
for (const file of allFiles) {
  const name = relative(file)
  if (ignoredFiles.test(name) || !extensions.has(path.extname(file))) continue
  const content = await fs.readFile(file, 'utf8')
  if (authSignal.test(name) || authSignal.test(content)) candidates.push({ name, content })
}

const important = candidates.filter(({ name, content }) =>
  /(^|\/)(middleware|package)\.(ts|json)$/.test(name) ||
  /src\/(app\/api|app\/admin|app\/game\/admin|lib\/users|lib\/firebaseAdmin|components\/games\/general\/tracking)/.test(name) ||
  /login|logout|sign[ -]?in|sign[ -]?out|register|auth/i.test(content)
)

const routeFiles = allFiles.map(relative).filter(name => /^src\/app\/api\/.+\/route\.ts$/.test(name)).sort()
const report = [
  '# Authentication context for AI review',
  '',
  '## Review request',
  '',
  'Audit the authentication and authorization implementation in this Next.js repository. Separate what is implemented from placeholders, identify exposed pages/API routes and trust-boundary issues, then propose a prioritized implementation plan. Cite file paths and relevant code in every finding. Do not assume Firebase Firestore usage means Firebase Authentication is enabled.',
  '',
  'Answer these questions:',
  '',
  '1. Which login, logout, registration, session, identity verification, and role checks actually exist?',
  '2. Which admin pages and mutation/read APIs are reachable without authentication or authorization?',
  '3. Can a client choose or spoof `userId`? Where?',
  '4. Which dependencies, environment variables, database fields, and UI placeholders are present but unused for auth?',
  '5. What is the smallest secure architecture for customer/student and admin access?',
  '6. Give an implementation checklist and security tests, ordered P0/P1/P2.',
  '',
  '## API route inventory',
  '',
  ...routeFiles.map(name => `- \`${name}\``),
  '',
  '## Authentication-related source',
  '',
  ...important.sort((a, b) => a.name.localeCompare(b.name)).flatMap(({ name, content }) => [
    `### ${name}`,
    '',
    `\`\`\`${path.extname(name).slice(1) || 'text'}`,
    redact(content),
    '\`\`\`',
    '',
  ]),
].join('\n')

if (outputPath) {
  const absoluteOutput = path.resolve(root, outputPath)
  const relativeOutput = path.relative(root, absoluteOutput)
  if (relativeOutput.startsWith('..') || path.isAbsolute(relativeOutput)) throw new Error('Output must stay inside the repository')
  await fs.mkdir(path.dirname(absoluteOutput), { recursive: true })
  await fs.writeFile(absoluteOutput, report, 'utf8')
  process.stdout.write(`Wrote ${relative(absoluteOutput)} (${important.length} source files, ${routeFiles.length} API routes)\n`)
} else {
  process.stdout.write(report)
}
