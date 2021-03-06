'use strict';

const gulp = require('gulp');
const gulpif = require('gulp-if');
const watchify = require('watchify');
const browserify = require('browserify');
const vinylSourceStream = require('vinyl-source-stream');
const vinylBuffer = require('vinyl-buffer');
const gutil = require('gulp-util');
const sourcemaps = require('gulp-sourcemaps');
const babel = require('babelify');
const hogan = require('browserify-hogan');
const rfolderify = require('rfolderify');
const uglify = require('gulp-uglify');
const nodeBrowserSync = require('browser-sync');

module.exports = ({
    src = '',
    dest = '',
    mode = 'dev',
    watch = false,
    minify = null,
    fullPaths = null,
    debug = null,
    bundleName = 'app-bundle.min.js',
    browserSync = false,
    transforms = [babel, hogan, rfolderify]
}) => {
    let shouldMinify = (mode === 'prod' && minify !== false) || minify === true;
    let shouldFullPaths = (mode === 'dev' && fullPaths !== false) || fullPaths === true;
    let shouldDebug = (mode === 'dev' && debug !== false) || debug === true;

    return function(){
        let opts = Object.assign({}, watchify.args, {
            entries: [src],
            minify: shouldMinify,
            fullPaths: shouldFullPaths,
            debug: shouldDebug
        });

        let b;

        if (watch) {
            b = watchify(browserify(opts));
            b.on('update', () => bundle(b, bundleName, browserSync, opts)); // on any dep update, runs the bundler
        } else {
            b = browserify(opts);
        }

        transforms.forEach((transform) => {
            b.transform(transform);
        });

        b.dest = dest;

        b.on('log', gutil.log); // output build logs to terminal

        return bundle(b, bundleName, browserSync, opts);
    };
};

function bundle(b, bundleName, browserSync, opts) {
    return b.bundle()
        // log errors if they happen
        .on('error', gutil.log.bind(gutil, 'Browserify Error'))
        .pipe(vinylSourceStream(bundleName))
        // optional, remove if you don't need to buffer file contents
        .pipe(vinylBuffer())
        // optional, remove if you dont want sourcemaps
        .pipe(sourcemaps.init({
            loadMaps: true
        })) // loads map from browserify file
        .pipe(gulpif(opts.minify, uglify()))
         // Add transformation tasks to the pipeline here.
        .pipe(sourcemaps.write('./')) // writes .map file
        .pipe(gulpif(browserSync, nodeBrowserSync.reload({
            stream: true
        })))
        .pipe(gulp.dest(b.dest));
}
