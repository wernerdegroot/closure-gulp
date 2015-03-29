/*
 * Requires: 
 *  - through
 *  - temp-write
 *  - gulp-util
 */

var child_process = require('child_process');
var through = require('through');
var gutil = require('gulp-util');
var path = require('path');
var tempWrite = require('temp-write');
var fs = require('fs');

var PLUGIN_NAME = 'closure-compiler';

module.exports = function(opt, execFile_opt) {
    opt = opt || {};
    opt.maxBuffer = opt.maxBuffer || 1000;
    var files = [];
    var execFile = execFile_opt || child_process.execFile;

    if (opt.compilerPath === undefined)
        throw new gutil.PluginError(PLUGIN_NAME, 'Missing option "compilerPath" (should point to the compiler .jar).');
    if (opt.fileName === undefined)
        throw new gutil.PluginError(PLUGIN_NAME, 'Missing option "fileName" (should be the desired file name for the compiled file).');
    if (opt.debug === undefined)
        throw new gutil.PluginError(PLUGIN_NAME, 'Missing option "debug" (should be true or false).');
    if (opt.debug && opt.baseUrl === undefined)
        throw new gutil.PluginError(PLUGIN_NAME, 'Missing option "baseUrl" (should be the base URL of the node server, for instance http://localhost:8080).');

    var files = [];
    var firstFile = null;

    // Create a file with the --js-flags (each on a new line) and return its path.
    var getFlagFilePath = function(files) {
        var jsFlag = '--js=';
        var src = files.map(function(file) {
            var relativePath = path.relative(file.cwd, file.path);
            return jsFlag + relativePath;
        }).join('\n') + '\n' + jsFlag + 'bower_components/closure-library/closure/goog/base.js';
        return tempWrite.sync(src);
    };
    
    // Generates a statement to 'include' a JavaScript file from the <body> of a page.
    var documentWriteStatement = function(fileName) {
        return 'document.write("<script type=\\"text/javascript\\" src=\\"'
                + opt.baseUrl + '/'
                + fileName.replace(/\\/g, "\\\\")
                + '\\"></script>");\n';
    };

    // Transform the object with compiler flags to an array of arguments for the Closure Compiler.
    var flagsToArgs = function(flags) {
        var args = [];
        flags = flags || {};
        for (var flag in flags) {
            var values = flags[flag];

            // Ensure that values is an array.
            if (!Array.isArray(values))
                values = [values];

            values.forEach(function(value) {
                args.push('--' + flag + (value === null ? '' : '=' + value));
            });
        }
        return args;
    };

    // Called for each chunk in the stream (which should be a file).
    var bufferContents = function(file) {
        if (file.isNull()) {
            return;
        }

        if (file.isStream()) {
            return this.emit('error',
                    new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported by this plugin'));
        }

        // Determine the first file.
        if (firstFile === null) {
            firstFile = file;
        }

        files.push(file);
    };

    // Called at the end of the stream.
    var endStream = function() {
        var self = this;
        
        var manifestFileName = opt.fileName + '.MF';

        if (!files.length) {
            this.emit('end');
            return;
        }

        // Determine the arguments with which to call the Closure Compiler.
        var args = [
            '-jar',
            // For faster compilation. It's supported everywhere from Java 1.7+.
            '-XX:+TieredCompilation',
            opt.compilerPath,
            // To prevent maximum length of command line string exceeded error.
            '--flagfile=' + getFlagFilePath(files)
        ].concat(flagsToArgs(opt.compilerFlags));
        
        if (opt.debug) {
            args.push('--output_manifest=' + manifestFileName);
        }
        
        // Force --js_output_file to prevent [Error: stdout maxBuffer exceeded.]
        args.push('--js_output_file=' + opt.fileName);

        // Enable custom max buffer to fix "stderr maxBuffer exceeded" error. Default is 200 * 1024.
        execFile('java', args, {maxBuffer: opt.maxBuffer * 1024}, function(error, stdout, stderr) {
            if (error || stderr) {
                self.emit('error', new gutil.PluginError(PLUGIN_NAME, error || stderr));
                return;
            }
            
            var fileContents;
            if (opt.debug) {
                // Convert the manifest file (a file with all .js-files on a new line)
                // to a file that 'includes' these .js-files.
                var sourceFiles = fs.readFileSync(manifestFileName).toString().split("\n");
                fileContents = documentWriteStatement('bower_components/closure-library/closure/goog/base.js');
                sourceFiles.forEach(function(sourceFile) {
                    if (sourceFile !== '') {
                        fileContents += documentWriteStatement(sourceFile);
                    }
                });
            } else {
                // Use the compiled file.
                fileContents = fs.readFileSync(opt.fileName);
            }

            var file = new gutil.File({
                base: firstFile.base,
                contents: new Buffer(fileContents),
                cwd: firstFile.cwd,
                path: path.join(firstFile.base, opt.fileName)
            });
            
            // Add the file to the stream.
            self.emit('data', file);
            
            // Delete the temporary files.
            fs.unlinkSync(opt.fileName);
            if (opt.debug) {
                fs.unlinkSync(manifestFileName);
            }

            // End of the stream.
            self.emit('end');
        });
    };

    return through(bufferContents, endStream);
};