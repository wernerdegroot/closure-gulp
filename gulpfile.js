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
var karma = require('gulp-karma');
var bower = require('gulp-bower');
var rename = require('gulp-rename');
var karma = require('gulp-karma');
var clean = require('gulp-clean');
var concat = require('gulp-concat');
var merge = require('merge-stream');
var path = require('path');
var less = require('gulp-less');
var sourcemaps = require('gulp-sourcemaps');
var minifyCSS = require('gulp-minify-css');
var changed = require('gulp-changed');
var jasmine = require('gulp-jasmine');
var closure = require('./closure-compiler.js');
var refaster = require('./refaster-js.js');
var argv = require('yargs').argv;
var connect = require('gulp-connect');

// Constants:
var srcDir = 'src';
var testDir = 'test';
var distDir = 'dist';
var distSrcDir = 'dist/src';
var distTestDir = 'dist/test';
var bowerComponentsDir = 'bower_components';
var webAppSourceDir = '../jsf/src/main/webapp';
var webAppTargetDir = '../jsf/target/rem-platform-frontend-jsf';

gulp.task('webserver', function() {
    connect.server({
        livereload: true
    });
});

//Alias for webserver
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
                'externs/angular-1.3.js',
                'externs/angular-1.3-http-promise_templated.js',
                'externs/angular-1.3-q_templated.js',
				'externs/jquery-1.9.js',
                'externs/jquery-extensions.js',
                'externs/google_maps_api_v3_17.js',
                'externs/angular-google-maps.js',
                'externs/jasmine.js',
                'externs/underscore-1.5.2.js',
                'externs/lodash.js',
                'externs/accounting.js'
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
        'realEstatePortfolio.realEstatePortfolioApp': 'realEstatePortfolio.js',
        'policySummary.main': 'policySummary.js',
        'analysis.main': 'analysis.js',
        'sessionbuilder.main': 'sessionBuilder.js',
        'regimeconfiguration.main': 'regimeConfiguration.js',
        'complexconfiguration.main': 'complexConfiguration.js',
        'myprofile.main': 'myprofile.js',
        'subportfolioconfiguration.main': 'subPortfolioConfiguration.js',
        'configuration.users.module': 'usersConfiguration.js',
        'propertytypeconfiguration.main': 'propertyTypeConfiguration.js'
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

gulp.task('refaster', function() {
    if (argv.template) {
        var filesToProcess = [srcDir + '/**/**.js'];

        return gulp
                .src(filesToProcess)

                // Run the code through Refaster.
                .pipe(refaster({
                    jarPath: 'bower_components/refasterjs-latest/refasterjs.jar',
                    templatePath: argv.template
                }));
    }
});

// Runs the test files with karma.
gulp.task('karma', ['build-tests'], function() {
    return gulp.src([distTestDir + '/**/**.js'])
            .pipe(karma({
                configFile: 'karma.conf.js',
                action: 'run',
                dieOnError: false
            }))
            .on('error', function(err) {
                // Make sure failed tests cause gulp to exit non-zero
                throw err;
            });
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

gulp.task('less', function() {
    return gulp.src(
            [
                webAppSourceDir + '/resources/less/main.less',
                webAppSourceDir + '/resources/less/login.less',
                webAppSourceDir + '/resources/less/bootstrap-rem/bootstrap.less'
            ])
//            .pipe(changed(webAppSourceDir + '/resources/css', {extension: '.css'}))
//            .pipe(sourcemaps.init())
            .pipe(less())
            .pipe(minifyCSS({keepBreaks: true}).on('error', function (err) {
                console.log(err);
            }))
//            .pipe(sourcemaps.write())
            .pipe(gulp.dest(webAppSourceDir + '/resources/css'));
});

gulp.task('watch', function() {
    gulp.watch(webAppSourceDir + '/resources/less/**/*.less', ['less']);
});

gulp.task('copy-libs', ['bower', 'clean-libs'], function() {

    var jsFilesToCopy = [
        bowerComponentsDir + '/angular/angular.min.js',
        bowerComponentsDir + '/angular-resource/angular-resource.min.js',
        bowerComponentsDir + '/angular-animate/angular-animate.min.js',
        bowerComponentsDir + '/bluebird/js/browser/bluebird.js',
        bowerComponentsDir + '/lodash/lodash.min.js',
        bowerComponentsDir + '/angular-google-maps/dist/angular-google-maps.min.js',
        bowerComponentsDir + '/highcharts-release/highcharts.js',
        bowerComponentsDir + '/highcharts-release/highcharts-more.js',
        bowerComponentsDir + '/angular-bootstrap/ui-bootstrap-tpls.min.js',
        bowerComponentsDir + '/bootstrap/dist/js/bootstrap.min.js', //?
        bowerComponentsDir + '/bootstrap-select/dist/js/bootstrap-select.min.js',
        bowerComponentsDir + '/bootstrap-select/dist/js/i18n/defaults-nl_NL.min.js',
        bowerComponentsDir + '/bootstrap-table/dist/bootstrap-table.min.js',
        'custom/bootstrap-table-nl-NL.js',
        bowerComponentsDir + '/accounting/accounting.min.js',
        bowerComponentsDir + '/jquery-minicolors/jquery.minicolors.min.js',
        bowerComponentsDir + '/angular-minicolors/angular-minicolors.js',
        bowerComponentsDir + '/svg4everybody/svg4everybody.ie8.min.js' /** Must be last file because it misses a semi-colon */
    ];

    var jsMapFilesToCopy = [
        bowerComponentsDir + '/bootstrap-select/dist/js/bootstrap-select.js.map'
    ];

    var cssFilesToCopy = [
        bowerComponentsDir + '/bootstrap-table/dist/bootstrap-table.min.css',
        bowerComponentsDir + '/animate.css/animate.min.css',
        bowerComponentsDir + '/bootstrap-select/dist/css/bootstrap-select.min.css',
        bowerComponentsDir + '/jquery-minicolors/jquery.minicolors.css'
    ];
    
    var imagesToCopy = [
        bowerComponentsDir + '/jquery-minicolors/jquery.minicolors.png'
    ];
    
    var fontsToCopy = [
        bowerComponentsDir + '/bootstrap/dist/fonts/**'
    ];

    var targetDir = webAppSourceDir + '/resources/lib';
    var streams = merge();

    streams.add(gulp.src(jsFilesToCopy)
            .pipe(concat('lib.js'))
            .pipe(gulp.dest(targetDir + '/js')));

    streams.add(gulp.src(jsMapFilesToCopy)
            .pipe(gulp.dest(targetDir + '/js')));

    streams.add(gulp.src(cssFilesToCopy)
            .pipe(concat('lib.css'))
            .pipe(gulp.dest(targetDir + '/css')));
    
    streams.add(gulp.src(imagesToCopy)
            .pipe(gulp.dest(targetDir + '/css')));

    streams.add(gulp.src(fontsToCopy)
            .pipe(gulp.dest(targetDir + '/fonts')));

    streams.add(gulp.src(bowerComponentsDir + '/lesshat/**')
            .pipe(gulp.dest(targetDir + '/lesshat')));

    streams.add(gulp.src(bowerComponentsDir + '/bootstrap/**')
            .pipe(gulp.dest(targetDir + '/bootstrap')));

    return streams;
});

gulp.task('copy-src', ['closure'], function() {
    var streams = merge();

    streams.add(gulp.src('./dist/src/**/*')
            .pipe(gulp.dest(webAppSourceDir + '/resources/ng')));

    streams.add(gulp.src('./partials/**')
            .pipe(gulp.dest(webAppSourceDir + '/partials')));

    return streams;
});

gulp.task('build', ['copy-src'], function() {

});

gulp.task('dist', ['build', 'copy-libs'], function() {
});

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
