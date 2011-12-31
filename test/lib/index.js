var assert = require('assert'),
    fs = require('fs'),
    glob = require('glob'),
    lumbar = require('../../lib/lumbar'),
    path = require('path'),
    wrench = require('wrench');

var counter = 0;
try { fs.mkdirSync('/tmp/lumbar-test', 0755); } catch (err) {}

exports.testDir = function(testName, configFile) {
  var outdir = '/tmp/lumbar-test/' + testName + '-' + path.basename(configFile) + '-' + Date.now() + '-' + (counter++);
  fs.mkdirSync(outdir, 0755);
  return outdir;
};
exports.assertExpected = function(outdir, expectedDir, configFile) {
  var expectedFiles = glob.globSync(expectedDir + '/**/*.*').map(function(fileName) {
        return fileName.substring(expectedDir.length);
      }).sort(),
      generatedFiles = glob.globSync(outdir + '/**/*.*').map(function(fileName) {
        return fileName.substring(outdir.length);
      }).sort();
  assert.deepEqual(generatedFiles, expectedFiles, configFile + ': file list matches' + JSON.stringify(expectedFiles) + JSON.stringify(generatedFiles));

  generatedFiles.forEach(function(fileName) {
    var generatedContent = fs.readFileSync(outdir + fileName, 'utf8'),
        expectedContent = fs.readFileSync(expectedDir + fileName, 'utf8');
    assert.equal(generatedContent, expectedContent, configFile + ':' + fileName + ': content matches');
  });
};

exports.runTest = function(configFile, expectedDir, options) {
  return function(done) {
    var outdir = exports.testDir('lumbar', configFile);
    this.title += ' ' + outdir;

    options = options || {};
    options.outdir = outdir;

    var expectedFiles = glob.globSync(expectedDir + '/**/*.{css,js}').map(function(fileName) {
          return fileName.substring(expectedDir.length);
        }).sort(),
        seenFiles = [];

    var arise = lumbar.init(configFile, options || {outdir: outdir});
    arise.build(undefined, function(err, status) {
      if (err) {
        throw err;
      }

      var statusFile = status.fileName.substring(outdir.length);
      if (!expectedFiles.some(function(fileName) { return statusFile === fileName; })) {
        assert.fail(undefined, status.fileName, configFile + ':' + statusFile + ': missing from expected list');
      } else {
        seenFiles.push(statusFile);
      }
      if (seenFiles.length < expectedFiles.length) {
        return;
      }

      exports.assertExpected(outdir, expectedDir, configFile);

      seenFiles = seenFiles.sort();
      assert.deepEqual(seenFiles, expectedFiles, 'seen file list matches');

      // Cleanup (Do cleanup here so the files remain for the failure case)
      wrench.rmdirSyncRecursive(outdir);

      done();
    });
  };
}
