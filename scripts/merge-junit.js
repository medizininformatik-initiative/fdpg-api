const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const reportsDir = path.join(__dirname, '..', 'reports');
const unitJunitFile = path.join(reportsDir, 'junit-unit.xml');
const e2eJunitFile = path.join(reportsDir, 'junit-e2e.xml');
const mergedJunitFile = path.join(reportsDir, 'junit.xml');

console.log('Merging JUnit reports...');

// Check if JUnit files exist
if (!fs.existsSync(unitJunitFile)) {
  console.warn('Warning: Unit test JUnit file not found:', unitJunitFile);
}

if (!fs.existsSync(e2eJunitFile)) {
  console.warn('Warning: E2E test JUnit file not found:', e2eJunitFile);
}

const parser = new xml2js.Parser();
const builder = new xml2js.Builder();

async function mergeJunitReports() {
  const testsuites = [];
  let totalTests = 0;
  let totalFailures = 0;
  let totalErrors = 0;
  let totalSkipped = 0;
  let totalTime = 0;

  // Load unit test report
  if (fs.existsSync(unitJunitFile)) {
    const unitXml = fs.readFileSync(unitJunitFile, 'utf8');
    const unitResult = await parser.parseStringPromise(unitXml);

    if (unitResult.testsuites && unitResult.testsuites.testsuite) {
      const suites = Array.isArray(unitResult.testsuites.testsuite)
        ? unitResult.testsuites.testsuite
        : [unitResult.testsuites.testsuite];

      testsuites.push(...suites);

      suites.forEach((suite) => {
        totalTests += parseInt(suite.$.tests || 0);
        totalFailures += parseInt(suite.$.failures || 0);
        totalErrors += parseInt(suite.$.errors || 0);
        totalSkipped += parseInt(suite.$.skipped || 0);
        totalTime += parseFloat(suite.$.time || 0);
      });

      console.log('✓ Loaded unit test JUnit report');
    }
  }

  // Load e2e test report
  if (fs.existsSync(e2eJunitFile)) {
    const e2eXml = fs.readFileSync(e2eJunitFile, 'utf8');
    const e2eResult = await parser.parseStringPromise(e2eXml);

    if (e2eResult.testsuites && e2eResult.testsuites.testsuite) {
      const suites = Array.isArray(e2eResult.testsuites.testsuite)
        ? e2eResult.testsuites.testsuite
        : [e2eResult.testsuites.testsuite];

      testsuites.push(...suites);

      suites.forEach((suite) => {
        totalTests += parseInt(suite.$.tests || 0);
        totalFailures += parseInt(suite.$.failures || 0);
        totalErrors += parseInt(suite.$.errors || 0);
        totalSkipped += parseInt(suite.$.skipped || 0);
        totalTime += parseFloat(suite.$.time || 0);
      });

      console.log('✓ Loaded e2e test JUnit report');
    }
  }

  // Create merged report
  const mergedReport = {
    testsuites: {
      $: {
        name: 'jest tests',
        tests: totalTests,
        failures: totalFailures,
        errors: totalErrors,
        skipped: totalSkipped,
        time: totalTime.toFixed(3),
      },
      testsuite: testsuites,
    },
  };

  // Write merged report
  const xml = builder.buildObject(mergedReport);
  fs.writeFileSync(mergedJunitFile, xml);

  console.log('✓ Merged JUnit report written to:', mergedJunitFile);
  console.log(
    `\n📊 Total: ${totalTests} tests, ${totalTests - totalFailures - totalErrors - totalSkipped} passed, ${totalSkipped} skipped, ${totalFailures + totalErrors} failed`,
  );
}

mergeJunitReports().catch((error) => {
  console.error('Error merging JUnit reports:', error);
  process.exit(1);
});
