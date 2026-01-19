const fs = require('fs');
const path = require('path');

const coverageDir = path.join(__dirname, '..', 'reports');
const unitCoverageFile = path.join(coverageDir, 'coverage-unit', 'coverage-final.json');
const e2eCoverageFile = path.join(coverageDir, 'coverage-e2e', 'coverage-final.json');
const mergedCoverageDir = path.join(coverageDir, 'coverage');
const mergedCoverageFile = path.join(mergedCoverageDir, 'coverage-final.json');

console.log('Merging coverage reports...');

// Check if coverage files exist
if (!fs.existsSync(unitCoverageFile)) {
  console.warn('Warning: Unit test coverage file not found:', unitCoverageFile);
}

if (!fs.existsSync(e2eCoverageFile)) {
  console.warn('Warning: E2E test coverage file not found:', e2eCoverageFile);
}

// Create merged directory
if (!fs.existsSync(mergedCoverageDir)) {
  fs.mkdirSync(mergedCoverageDir, { recursive: true });
}

const mergedCoverage = {};

// Load and merge unit test coverage
if (fs.existsSync(unitCoverageFile)) {
  const unitCoverage = JSON.parse(fs.readFileSync(unitCoverageFile, 'utf8'));
  Object.assign(mergedCoverage, unitCoverage);
  console.log('✓ Loaded unit test coverage');
}

// Load and merge e2e test coverage
if (fs.existsSync(e2eCoverageFile)) {
  const e2eCoverage = JSON.parse(fs.readFileSync(e2eCoverageFile, 'utf8'));

  // Merge e2e coverage with unit coverage
  Object.keys(e2eCoverage).forEach((file) => {
    if (mergedCoverage[file]) {
      // File covered by both - merge coverage data
      const unitData = mergedCoverage[file];
      const e2eData = e2eCoverage[file];

      // Merge statement coverage
      Object.keys(e2eData.s).forEach((key) => {
        unitData.s[key] = (unitData.s[key] || 0) + e2eData.s[key];
      });

      // Merge function coverage
      Object.keys(e2eData.f).forEach((key) => {
        unitData.f[key] = (unitData.f[key] || 0) + e2eData.f[key];
      });

      // Merge branch coverage
      Object.keys(e2eData.b).forEach((key) => {
        if (!unitData.b[key]) {
          unitData.b[key] = e2eData.b[key];
        } else {
          e2eData.b[key].forEach((count, idx) => {
            unitData.b[key][idx] = (unitData.b[key][idx] || 0) + count;
          });
        }
      });
    } else {
      // File only covered by e2e tests
      mergedCoverage[file] = e2eData;
    }
  });

  console.log('✓ Loaded and merged e2e test coverage');
}

// Write merged coverage
fs.writeFileSync(mergedCoverageFile, JSON.stringify(mergedCoverage, null, 2));
console.log('✓ Merged coverage written to:', mergedCoverageFile);

// Generate reports from merged coverage using Jest
const { execSync } = require('child_process');

try {
  console.log('\nGenerating HTML and Cobertura reports from merged coverage...');

  // Use Istanbul/nyc to generate reports from the merged coverage
  execSync(
    `npx nyc report --reporter=html --reporter=cobertura --reporter=lcov --reporter=text --temp-dir=${mergedCoverageDir} --report-dir=${mergedCoverageDir}`,
    { stdio: 'inherit' },
  );

  console.log('\n✓ Coverage reports generated successfully!');
  console.log(`  HTML report: ${path.join(mergedCoverageDir, 'index.html')}`);
  console.log(`  Cobertura report: ${path.join(mergedCoverageDir, 'cobertura-coverage.xml')}`);
} catch (error) {
  console.error('Error generating coverage reports:', error.message);
  process.exit(1);
}
