/*
 * Requires:
 *  - gulp
 *  - gulp-bower
 *  - gulp-clean
 *  - merge-stream
 *  - closure-compiler
 *  - yargs
 *  - gulp-connect
 */

var gulp = require('gulp');
var bower = require('gulp-bower');
var clean = require('gulp-clean');
var merge = require('merge-stream');
var path = require('path');
var closure = require('./closure-compiler.js');
var argv = require('yargs').argv;
var connect = require('gulp-connect');

// Constants:
var srcDir = 'src';
var testDir = 'test';
var distDir = 'dist';
var distSrcDir = 'dist/src';
var distTestDir = 'dist/test';
var bowerComponentsDir = 'bower_components';

gulp.task('webserver', function() {
    connect.server({
        livereload: true
    });
});

// Alias for webserver
gulp.task('serve', ['webserver']);

var build = function(filesToProcess, entryPoints, destination, debug) {
    var streams = merge();

    for (var main in entryPoints) {

        var filePath = entryPoints[main];
        var fileName = path.basename(filePath);

        var compilerFlags = {
            compilation_level: 'SIMPLE_OPTIMIZATIONS',
            jscomp_warning: ['checkTypes', 'accessControls', 'unknownDefines', 'const'],
            process_closure_primitives: null,
            externs: [
            ]
        };

        compilerFlags.manage_closure_dependencies = null;
        compilerFlags.closure_entry_point = main;

        var stream = gulp
                .src(filesToProcess)

                // Run the code through the Google Closure Compiler.
                .pipe(closure({
                    compilerPath: 'node_modules/closure-compiler/lib/vendor/compiler.jar',
                    fileName: fileName,
                    debug: debug,
                    baseUrl: 'http://localhost:8080',
                    compilerFlags: compilerFlags
                }))

                .pipe(gulp.dest(destination));

        streams.add(stream);
    }

    return streams;
};

// Builds the source files.
gulp.task('closure', ['clean-dist-src'], function() {
    var filesToProcess = [srcDir + '/**/**.js'];

    // Mapping from entry point (global id) to target file name.
    var allEntryPoints = {

    };

    var entryPoints = null;
    if (argv.target) {
        entryPoints = {};
        entryPoints[argv.target] = allEntryPoints[argv.target];
    } else {
        entryPoints = allEntryPoints;
    }

    var debug = argv.debug !== "false";
    return build(filesToProcess, entryPoints, distSrcDir, debug);
});

// Runs the test files with jasmine.
gulp.task('test', ['build-tests'], function() { // 'build-tests'
    return gulp
            .src(distTestDir + '/**/*.js')
            .pipe(jasmine());
});

// Builds the tests.
gulp.task('build-tests', ['clean-dist-test'], function() {
    var filesToProcess = [srcDir + '/**/**.js', testDir + '/**/**.js'];
    var entryPoints = {
        'test.main': 'test.js'
    };
    return build(filesToProcess, entryPoints, distTestDir, false);
});

gulp.task('bower', function() {
    return bower();
});

gulp.task('copy-src', ['closure']);

// Alias for copy-src
gulp.task('build', ['copy-src']);

gulp.task('dist', ['build', 'copy-libs']);

gulp.task('clean-libs', function() {
    return gulp.src(webAppSourceDir + '/resources/lib', {read: false})
            .pipe(clean({force: true}));
});

gulp.task('clean-src', function() {
    return gulp.src(webAppSourceDir + '/resources/ng', {read: false})
            .pipe(clean({force: true}));
});

gulp.task('clean-dist-test', function() {
    return gulp.src('dist/test', {read: false})
            .pipe(clean());
});

gulp.task('clean-dist-src', function() {
    return gulp.src('dist/src', {read: false})
            .pipe(clean());
});